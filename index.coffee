Botkit = require('botkit')
getUrls = require('get-urls')
LookerClient = require('./looker_client')
{CLIQueryRunner, QueryRunner, LookQueryRunner, FancyReplier} = require('./query_runner')
ReplyContext = require('./reply_context')
AWS = require('aws-sdk')
crypto = require('crypto')

# Local dev only
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0

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
  looker
)

# Update access tokens every half hour
setInterval(->
  for looker in lookers
    looker.client.fetchAccessToken()
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
CLI_HELP = "pie model/view/field,another_field[filter_value],more_field desc"

controller.on 'slash_command', (bot, message) ->

  # Return 200 immediately
  bot.res.setHeader 'Content-Type', 'application/json'
  bot.res.send JSON.stringify({response_type: "in_channel"})

  regex = new RegExp(QUERY_REGEX)
  if match = message.text.match(regex)
    message.match = match
    runCLI(spawnedBot, message)
  else
    spawnedBot.reply(message, "Usage: `#{CLI_HELP}`")

controller.hears [QUERY_REGEX], ['direct_mention'], (bot, message) ->
  runCLI(bot, message)

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
