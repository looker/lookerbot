Fuse = require('./fuse.min')

Botkit = require('botkit')
getUrls = require('get-urls')
AWS = require('aws-sdk')
AzureStorage = require('azure-storage')
crypto = require('crypto')
_ = require('underscore')
SlackUtils = require('./slack_utils')

LookerClient = require('./looker_client')
ReplyContext = require('./reply_context')

CLIQueryRunner = require('./repliers/cli_query_runner')
LookFinder = require('./repliers/look_finder')
DashboardQueryRunner = require('./repliers/dashboard_query_runner')
QueryRunner = require('./repliers/query_runner')
LookQueryRunner = require('./repliers/look_query_runner')

versionChecker = require('./version_checker')

LOOKER_BOT_CHANNEL_ID = 'C14KGPH38' # hard coded to #looker-bot

if process.env.DEV == "true"
  # Allow communicating with Lookers running on localhost with self-signed certificates
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0

enableQueryCli = process.env.LOOKER_EXPERIMENTAL_QUERY_CLI == "true"

customCommands = {}

lookerConfig = if process.env.LOOKERS
  console.log("Using Looker information specified in LOOKERS environment variable.")
  JSON.parse(process.env.LOOKERS)
else
  console.log("Using Looker information specified in individual environment variables.")
  [{
    url: process.env.LOOKER_URL
    apiBaseUrl: process.env.LOOKER_API_BASE_URL
    clientId: process.env.LOOKER_API_3_CLIENT_ID
    clientSecret: process.env.LOOKER_API_3_CLIENT_SECRET
    customCommandSpaceId: process.env.LOOKER_CUSTOM_COMMAND_SPACE_ID
  }]

lookers = lookerConfig.map((looker) ->

  # Amazon S3
  if process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    looker.storeBlob = (blob, success, error) ->
      path = crypto.randomBytes(256).toString('hex').match(/.{1,128}/g)
      key = "looker-bot-pictures/#{path.join("/")}.png"

      unless blob.length
        error("No image data returned.", "S3 Error")
        return

      region = process.env.SLACKBOT_S3_BUCKET_REGION
      domain = if region && region != "us-east-1"
        "s3-#{process.env.SLACKBOT_S3_BUCKET_REGION}.amazonaws.com"
      else
        "s3.amazonaws.com"

      params =
        Bucket: process.env.SLACKBOT_S3_BUCKET
        Key: key
        Body: blob
        ACL: 'public-read'
        ContentType: "image/png"

      s3 = new AWS.S3(
        endpoint: new AWS.Endpoint(domain)
      )
      s3.putObject params, (err, data) ->
        if err
          error(err, "S3 Error")
        else
          success("https://#{domain}/#{params.Bucket}/#{key}")

  # Azure
  if process.env.AZURE_STORAGE_ACCOUNT && process.env.AZURE_STORAGE_ACCESS_KEY
    looker.storeBlob = (blob, success, error) ->
      path = crypto.randomBytes(256).toString('hex').match(/.{1,128}/g)
      key = "#{path.join("/")}.png"
      unless blob.length
        error("No image data returned.", "Azure Error")
        return
      container = process.env.SLACKBOT_AZURE_CONTAINER
      options =
          ContentType: "image/png"
      wasb = new AzureStorage.createBlobService()
      wasb.createBlockBlobFromText container, key, blob, options, (err, result, response) ->
        if err
          error(err, "Azure Error")
        else
          storageAccount = process.env.AZURE_STORAGE_ACCOUNT
          success("https://#{storageAccount}.blob.core.windows.net/#{container}/#{key}")

  looker.refreshCommands = ->
    return unless looker.customCommandSpaceId
    console.log "Refreshing custom commands for #{looker.url}..."

    addCommandsForSpace = (space, category) ->
      for partialDashboard in space.dashboards
        looker.client.get("dashboards/#{partialDashboard.id}", (dashboard) ->

          command =
            name: dashboard.title.toLowerCase().trim()
            description: dashboard.description
            dashboard: dashboard
            looker: looker
            category: category

          command.hidden = category.toLowerCase().indexOf("[hidden]") != -1 || command.name.indexOf("[hidden]") != -1

          command.helptext = ""

          if dashboard.filters?.length > 0
            command.helptext = "<#{dashboard.filters[0].title.toLowerCase()}>"

          customCommands[command.name] = command

        console.log)

    looker.client.get("spaces/#{looker.customCommandSpaceId}", (space) ->
      addCommandsForSpace(space, "Shortcuts")
      looker.client.get("spaces/#{looker.customCommandSpaceId}/children", (children) ->
        for child in children
          addCommandsForSpace(child, child.name)
      console.log)
    console.log)

  looker.client = new LookerClient(
    baseUrl: looker.apiBaseUrl
    clientId: looker.clientId
    clientSecret: looker.clientSecret
    afterConnect: looker.refreshCommands
  )
  looker
)

refreshCommands = ->
  for looker in lookers
    looker.refreshCommands()

newVersion = null
checkVersion = ->
  versionChecker((version) ->
    newVersion = version
  )

checkVersion()

# Update access tokens every half hour
setInterval(->
  for looker in lookers
    looker.client.fetchAccessToken()
, 30 * 60 * 1000)

# Check for new versions every day
setInterval(->
  checkVersion()
, 24 * 60 * 60 * 1000)

controller = Botkit.slackbot(
  debug: process.env.DEBUG_MODE == "true"
)

controller.setupWebserver process.env.PORT || 3333, (err, expressWebserver) ->
  controller.createWebhookEndpoints(expressWebserver)

defaultBot = controller.spawn({
  token: process.env.SLACK_API_KEY,
  retry: 10,
}).startRTM()

defaultBot.api.team.info {}, (err, response) ->
  if err
    console.error(err)
  if response
    controller.saveTeam(response.team, ->
      console.log "Saved the team information..."
    )
  else
    throw new Error("Could not connect to the Slack API.")

controller.on 'rtm_reconnect_failed', ->
  throw new Error("Failed to reconnect to the Slack RTM API.")

controller.on 'ambient', (bot, message) ->
  checkMessage(bot, message)

QUERY_REGEX = '(query|q|column|bar|line|pie|scatter|map)( )?(\\w+)? (.+)'
FIND_REGEX = 'find (dashboard|look|command)? ?(.+)'

controller.on "slash_command", (bot, message) ->
  if process.env.SLACK_SLASH_COMMAND_TOKEN && message.token && process.env.SLACK_SLASH_COMMAND_TOKEN == message.token
    processCommand(bot, message)
  else
    bot.replyPrivate(message, "This bot cannot accept slash commands until `SLACK_SLASH_COMMAND_TOKEN` is configured.")

controller.on "direct_mention", (bot, message) ->
  message.text = SlackUtils.stripMessageText(message.text)
  processCommand(bot, message)

controller.on "direct_message", (bot, message) ->
  if message.text.indexOf("/") != 0
    message.text = SlackUtils.stripMessageText(message.text)
    processCommand(bot, message, true)

logMessage = (message) ->
  sendLog = (username, commandType, question) =>
    text = "[Lookerbot Log][#{commandType}] Asked by: #{username} for question: #{question}"
    console.log(text)
    defaultBot.send({
      text: text
      channel: LOOKER_BOT_CHANNEL_ID
    })
  console.log('message: ' + JSON.stringify(message, null, 2))
  if message.type == 'slash_command'
    sendLog(message.user_name, 'Slash Command', message.text)
  else if message.type == 'message'
    bot.api.users.info({user: "U047EMSKV"}, (err, resp) ->
      console.log("resp: #{JSON.stringify(resp, null, 2)}")
      if message.event = 'direct_mention'
        sendLog(resp.user.name, 'Direct Mention', message.text)
      else # this is a direct message
        sendLog(resp.user.name, 'Direct Message', message.text)
    )

processCommand = (bot, message, isDM = false) ->

  message.text = message.text.split('“').join('"')
  message.text = message.text.split('”').join('"')
  logMessage(message)

  context = new ReplyContext(defaultBot, bot, message)

  if match = message.text.match(new RegExp(QUERY_REGEX)) && enableQueryCli
    message.match = match
    runCLI(context, message)
  else if match = message.text.match(new RegExp(FIND_REGEX))
    message.match = match
    find(context, message)
  else
    shortCommands = _.sortBy(_.values(customCommands), (c) -> -c.name.length)
    matchedCommand = shortCommands.filter((c) -> message.text.toLowerCase().indexOf(c.name) == 0)?[0]
    if matchedCommand

      query = message.text[matchedCommand.name.length..].trim().split('|').map((t) -> t.trim())
      message.text.toLowerCase().indexOf(matchedCommand.name)

      context.looker = matchedCommand.looker

      filters = {}
      for filter, index in matchedCommand.dashboard.filters
        filters[filter.name] = query[index]
      runner = new DashboardQueryRunner(context, matchedCommand.dashboard, filters)
      runner.start()

    else

      helpAttachments = []

      groups = _.groupBy(customCommands, 'category')
      commandNames = []
      commandNameToHelpText = {}

      for groupName, groupCommmands of groups
        groupText = ""
        for command in _.sortBy(_.values(groupCommmands), "name")
          commandNames.push(command.name)
          commandNameToHelpText[command.name] = command.helptext
          unless command.hidden
            # console.log('command: ' + JSON.stringify(command, null, 2))
            groupText += "• *<#{command.looker.url}/dashboards/#{command.dashboard.id}|#{command.name}>* #{command.helptext}"
            if command.description
              groupText += " — _#{command.description}_"
            groupText += "\n"

        if groupText
          helpAttachments.push(
            title: groupName
            text: groupText
            color: "#64518A"
            mrkdwn_in: ["text"]
          )

      defaultText = """
      • *find* <(command|look|dashboard) search term|> — _Shows the top five commands/looks/dashboards matching the search._
      • *help*  — _Shows this help screen._
      """

      if enableQueryCli
        defaultText += "• *q* <model_name>/<view_name>/<field>[<filter>] — _Runs a custom query._\n"

      helpAttachments.push(
        title: "Built-in Commands"
        text: defaultText
        color: "#64518A"
        mrkdwn_in: ["text"]
      )


      spaces = lookers.filter((l) -> l.customCommandSpaceId ).map((l) ->
        "<#{l.url}/spaces/#{l.customCommandSpaceId}|this space>"
      ).join(" or ")
      if spaces
        helpAttachments.push(
          text: "\n_To add your own commands, add a dashboard to #{spaces}._"
          mrkdwn_in: ["text"]
        )

      if newVersion
        helpAttachments.push(
          text: "\n\n:scream: *<#{newVersion.html_url}|The Looker Slack integration is out of date! Version #{newVersion.tag_name} is now available.>* :scream:"
          color: "warning"
          mrkdwn_in: ["text"]
        )

      if message.text.toLowerCase() != "help"
        helpAttachments.push(
          text: "*Sorry, we could not understand your command. The list of commands we understand are listed above. If you have feedback for additional commands, please let us know in #lookerbot-support.*"
          mrkdwn_in: ["text"]
        )
        closestCommand = findClosestCommand(message.text, commandNames)
        helpText = commandNameToHelpText[closestCommand]
        triedText = "The command you tried is: *#{message.text}*."
        if closestCommand
          triedText += " Did you mean *#{closestCommand}* #{helpText}?"
        helpAttachments.push(
          text: triedText
          mrkdwn_in: ["text"]
        )

      context.replyPrivate({attachments: helpAttachments})

    refreshCommands()

  if context.isSlashCommand() && !context.hasRepliedPrivately
    # Return 200 immediately for slash commands
    bot.res.setHeader 'Content-Type', 'application/json'
    bot.res.send JSON.stringify({response_type: "in_channel"})

runCLI = (context, message) ->
  [txt, type, ignore, lookerName, query] = message.match

  context.looker = if lookerName
    lookers.filter((l) -> l.url.indexOf(lookerName) != -1)[0] || lookers[0]
  else
    lookers[0]

  type = "data" if type == "q" || type == "query"

  runner = new CLIQueryRunner(context, query, type)
  runner.start()

find = (context, message) ->
  [__, type, query] = message.match
  if not type
    type = 'command'

  firstWord = query.split(" ")[0]
  foundLooker = lookers.filter((l) -> l.url.indexOf(firstWord) != -1)[0]
  if foundLooker
    words = query.split(" ")
    words.shift()
    query = words.join(" ")
  context.looker = foundLooker || lookers[0]

  runner = new LookFinder(context, type, query)
  runner.start()

checkMessage = (bot, message) ->
  return if !message.text || message.subtype == "bot_message"

  # URL Expansion
  for url in getUrls(message.text).map((url) -> url.replace("%3E", ""))

    for looker in lookers

      # Starts with Looker base URL?
        context = new ReplyContext(defaultBot, bot, message)
      if url.lastIndexOf(looker.url, 0) == 0
        context.looker = looker
        annotateLook(context, url, message, looker)
        annotateShareUrl(context, url, message, looker)

annotateLook = (context, url, sourceMessage, looker) ->
  if matches = url.match(/\/looks\/([0-9]+)$/)
    console.log "Expanding Look URL #{url}"
    runner = new LookQueryRunner(context, matches[1])
    runner.start()

annotateShareUrl = (context, url, sourceMessage, looker) ->
  if matches = url.match(/\/x\/([A-Za-z0-9]+)$/)
    console.log "Expanding Share URL #{url}"
    runner = new QueryRunner(context, matches[1])
    runner.start()

findClosestCommand = (userAttempt, commandNames) ->
  # Convert [a,b] to [{id: a}, {id: b}]
  commandNameMaps = []
  for commandName in commandNames
    commandNameMaps.push({id: commandName})
  # See https://github.com/krisk/Fuse
  options = {
    keys: ['id'],
    id: 'id',
    include: ['score']
  }
  fuse = new Fuse(commandNameMaps, options)
  # Also uses heuristic: try user's search without everything after last whitespace
  # For example, if she searches find my id 12345, then trying find my id has a better
  # chance of finding a good match.
  userAttemptWithoutId = userAttempt.split(' ').slice(0, -1).join(' ')
  results = fuse.search(userAttempt).concat(fuse.search(userAttemptWithoutId)).sort((a,b) -> a.score - b.score)
  console.log("Results for \"#{userAttempt}\" and \"#{userAttemptWithoutId}: #{JSON.stringify(results)}")
  if results.length > 0
    return results[0].item
