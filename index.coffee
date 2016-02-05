Botkit = require('botkit')
getUrls = require('get-urls')
LookerClient = require('./looker_client')
{CLIQueryRunner, LookFinder, LookParameterizer, DashboardQueryRunner, QueryRunner, LookQueryRunner, FancyReplier} = require('./query_runner')
ReplyContext = require('./reply_context')
AWS = require('aws-sdk')
crypto = require('crypto')
_ = require('underscore')

# Local dev only
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0

customCommands = {}

lookers = JSON.parse(process.env.LOOKERS).map((looker) ->
  looker.client = new LookerClient(
    baseUrl: looker.apiBaseUrl
    clientId: looker.clientId
    clientSecret: looker.clientSecret
  )
  looker.storeBlob = (blob, success, error) ->
    path = crypto.randomBytes(256).toString('hex').match(/.{1,128}/g)
    key = "#{path.join("/")}.png"
    unless blob.length
      error("No image data returned.")
      return
    params =
      Bucket: process.env.SLACKBOT_S3_BUCKET
      Key: key
      Body: blob
      ACL: 'public-read'
      ContentType: "image/png"
    s3 = new AWS.S3()
    s3.putObject params, (err, data) ->
      if err
        error(err)
      else
        success("https://#{params.Bucket}.s3.amazonaws.com/#{key}")
  looker.refreshCommands = ->
    return unless looker.customCommandSpaceId
    looker.client.get("spaces/#{looker.customCommandSpaceId}", (space) ->
      for partialDashboard in space.dashboards
        looker.client.get("dashboards/#{partialDashboard.id}", (dashboard) ->

          command =
            name: dashboard.title.toLowerCase().trim()
            description: dashboard.description
            dashboard: dashboard
            looker: looker

          command.helptext = (dashboard.filters || "").map((f) ->
            "<#{f.title.toLowerCase()}>"
          ).join(", ")

          customCommands[command.name] = command

        console.log)
    console.log)
  looker
)

refreshCommands = ->
  for looker in lookers
    looker.refreshCommands()

# Update access tokens every half hour
setInterval(->
  for looker in lookers
    looker.client.fetchAccessToken(->
      looker.refreshCommands()
    )
, 30 * 60 * 1000)

controller = Botkit.slackbot(
  debug: false
)

controller.setupWebserver process.env.PORT || 3333, (err, expressWebserver) ->
  controller.createWebhookEndpoints(expressWebserver)

spawnedBot = controller.spawn({
  token: process.env.SLACK_API_KEY,
}).startRTM()

spawnedBot.api.team.info {}, (err, response) ->
  controller.saveTeam(response.team, ->
    console.log "Saved the team information..."
  )

controller.on 'ambient', (bot, message) ->
  checkMessage(bot, message)

QUERY_REGEX = '(query|q|column|bar|line|pie|scatter|map)( )?(\\w+)? (.+)'
FIND_REGEX = 'find (dashboard|look )? ?(.+)'
GET_REGEX = 'get (.+)=(.+)'

CLI_HELP = "pie model/view/field,another_field[filter_value],more_field desc"

controller.on "slash_command", (bot, message) ->
  processCommand(bot, message)

controller.on "direct_mention", (bot, message) ->
  processCommand(bot, message)

processCommand = (bot, message) ->

  sent = false
  replyPrivateIfPossible = (newMessage) ->
    sent = true
    if bot.res
      bot.replyPrivate(message, newMessage)
    else
      spawnedBot.reply(message, newMessage)

  if match = message.text.match(new RegExp(QUERY_REGEX))
    message.match = match
    runCLI(spawnedBot, message)
  else if match = message.text.match(new RegExp(FIND_REGEX))
    message.match = match
    find(spawnedBot, message)
  else if match = message.text.match(new RegExp(GET_REGEX))
    message.match = match
    get(spawnedBot, message)
  else
    shortCommands = _.sortBy(_.values(customCommands), (c) -> c.name.length)
    matchedCommand = shortCommands.filter((c) -> message.text.toLowerCase().indexOf("#{c.name} ") == 0)?[0]
    if matchedCommand

      query = message.text[matchedCommand.name.length..].trim()
      message.text.toLowerCase().indexOf(matchedCommand.name)

      context = new ReplyContext(matchedCommand.looker, spawnedBot, message)
      filters = {}
      for filter in matchedCommand.dashboard.filters
        filters[filter.name] = query
      runner = new DashboardQueryRunner(context, matchedCommand.dashboard, filters)
      runner.start()

    else
      help = """
      _I've got some built-in commands:_\n
      • *find* <look search term> — _Shows the top five Looks matching the search._
      • *q* <model_name>/<view_name>/<field>[<filter>] — _Runs a custom query._\n\n
      """

      if _.values(customCommands).length > 0
        help += "_And there are some fancy quick shortcuts people have set up:_\n\n"

      for command in _.sortBy(_.values(customCommands), "name")
        help += "• *#{command.name}* #{command.helptext}"
        if command.description
          help += " — _#{command.description}_"
        help += "\n"

      replyPrivateIfPossible(help)

      refreshCommands()


  if bot.res && !sent
    # Return 200 immediately for slash commands
    bot.res.setHeader 'Content-Type', 'application/json'
    bot.res.send JSON.stringify({response_type: "in_channel"})

runCLI = (bot, message) ->
  [txt, type, ignore, lookerName, query] = message.match

  looker = if lookerName
    lookers.filter((l) -> l.url.indexOf(lookerName) != -1)[0] || lookers[0]
  else
    lookers[0]

  type = "data" if type == "q" || type == "query"

  context = new ReplyContext(looker, bot, message)
  runner = new CLIQueryRunner(context, query, type)
  runner.start()

find = (bot, message) ->
  [__, type, query] = message.match

  firstWord = query.split(" ")[0]
  foundLooker = lookers.filter((l) -> l.url.indexOf(firstWord) != -1)[0]
  if foundLooker
    words = query.split(" ")
    words.shift()
    query = words.join(" ")
  looker = foundLooker || lookers[0]

  context = new ReplyContext(looker, bot, message)
  runner = new LookFinder(context, type, query)
  runner.start()

get = (bot, message) ->
  [__, query, filterValue] = message.match

  firstWord = query.split(" ")[0]
  foundLooker = lookers.filter((l) -> l.url.indexOf(firstWord) != -1)[0]
  if foundLooker
    words = query.split(" ")
    words.shift()
    query = words.join(" ")
  looker = foundLooker || lookers[0]

  context = new ReplyContext(looker, bot, message)
  runner = new LookParameterizer(context, query.trim(), filterValue.trim())
  runner.start()

checkMessage = (bot, message) ->
  return if !message.text || message.subtype == "bot_message"

  # URL Expansion
  for url in getUrls(message.text).map((url) -> url.replace("%3E", ""))

    for looker in lookers

      # Starts with Looker base URL?
      if url.lastIndexOf(looker.url, 0) == 0
        annotateLook(bot, url, message, looker)
        annotateShareUrl(bot, url, message, looker)

annotateLook = (bot, url, sourceMessage, looker) ->
  if matches = url.match(/\/looks\/([0-9]+)$/)
    console.log "Expanding Look URL #{url}"
    context = new ReplyContext(looker, bot, sourceMessage)
    runner = new LookQueryRunner(context, matches[1])
    runner.start()

annotateShareUrl = (bot, url, sourceMessage, looker) ->
  if matches = url.match(/\/x\/([A-Za-z0-9]+)$/)
    console.log "Expanding Share URL #{url}"
    context = new ReplyContext(looker, bot, sourceMessage)
    runner = new QueryRunner(context, matches[1])
    runner.start()
