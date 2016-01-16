Botkit = require('Botkit')
getUrls = require('get-urls')
LookerClient = require('./looker_client')
QueryRunner = require('./query_runner')

# Local dev only
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0

lookers = JSON.parse(process.env.LOOKERS).map((looker) ->
  looker.client = new LookerClient(
    baseUrl: looker.apiBaseUrl
    clientId: looker.clientId
    clientSecret: looker.clientSecret
  )
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

controller.hears ['(?:query|q)( )?(\\w+)? (.+)'], ['direct_mention'], (bot, message) ->
  [txt, ignore, lookerName, query] = message.match

  looker = if lookerName
    lookers.filter((l) -> l.url.indexOf(lookerName) != -1)[0] || lookers[0]
  else
    lookers[0]

  runner = new QueryRunner(looker, query, bot, message)
  runner.run()

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

