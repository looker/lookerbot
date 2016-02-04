Botkit = require('botkit')
getUrls = require('get-urls')
LookerClient = require('./looker_client')
{QueryRunner, FancyReplier} = require('./query_runner')
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

controller.spawn({
  token: process.env.SLACK_API_KEY,
}).startRTM()

controller.on 'ambient', (bot, message) ->
  checkMessage(bot, message)

controller.hears ['(query|q|column|bar|line|pie|scatter|map)( )?(\\w+)? (.+)'], ['direct_mention'], (bot, message) ->
  [txt, type, ignore, lookerName, query] = message.match

  looker = if lookerName
    lookers.filter((l) -> l.url.indexOf(lookerName) != -1)[0] || lookers[0]
  else
    lookers[0]

  type = "data" if type == "q" || type == "query"

  context = new ReplyContext(looker, bot, message)
  runner = new QueryRunner(context, query, type)
  runner.start()

checkMessage = (bot, message) ->
  return if !message.text || message.subtype == "bot_message"

  # URL Expansion
  for url in getUrls(message.text).map((url) -> url.replace("%3E", ""))

    for looker in lookers

      # Starts with Looker base URL?
      if url.lastIndexOf(looker.url, 0) == 0
        annotatePublicLook(bot, url, message, looker)

annotatePublicLook = (bot, url, sourceMessage, looker) ->
  if matches = url.match(/\/looks\/([0-9]+)$/)
    console.log "Expanding URL #{url}"

    looker.client.get "looks/#{matches[1]}", (look) ->

      message =
        attachments: [
          fallback: look.title
          title: look.title
          text: look.description
          title_link: "#{looker.url}#{look.short_url}"
          image_url: if look.public then "#{look.image_embed_url}?width=606" else null
        ]
        icon_url: "https://s3-us-west-2.amazonaws.com/slack-files2/avatars/2015-10-13/12436816609_c9dab244c5db8f0d218a_88.jpg"

      bot.reply(sourceMessage, message)

