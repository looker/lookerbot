Bot = require('slackbots')
getUrls = require('get-urls')
LookerClient = require('./looker_client')

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

bot = new Bot(
  token: process.env.SLACK_API_KEY
  name: 'Looker'
)

bot.on 'message', (data) ->
  checkMessage(data)

checkMessage = (message) ->
  return if !message.text || message.subtype == "bot_message"

  for url in getUrls(message.text).map((url) -> url.replace("%3E", ""))

    for looker in lookers

      # Starts with Looker base URL?
      if url.lastIndexOf(looker.url, 0) == 0
        annotatePublicLook(url, message, looker)

annotatePublicLook = (url, message, looker) ->
  if matches = url.match(/\/looks\/([0-9]+)$/)
    looker.client.request {path: "looks/#{matches[1]}"}, (look) ->
      params =
        attachments: JSON.stringify([
          fallback: look.title
          title: look.title
          text: look.description
          title_link: "#{looker.url}#{look.short_url}"
          author_name: "#{look.user.first_name} #{look.user.last_name}"
          author_icon: look.user.avatar_url
          image_url: look.image_embed_url
        ])
      bot.postMessage message.channel, null, params
