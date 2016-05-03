_ = require("underscore")

sassyMessages = [
  "Thinking..."
  "Twiddling thumbs..."
  "Crunching the numbers..."
  "Querying oracle..."
  "Spinning up the hamster..."
  "Shovelling coal into the server..."
  "Warming up Large Hadron Collider..."
]

module.exports = class FancyReplier

  constructor: (@replyContext) ->

  reply: (obj, cb) ->
    if @loadingMessage

      # Hacky stealth update of message to preserve chat order

      if typeof(obj) == 'string'
        obj = {text: obj, channel: @replyContext.sourceMessage.channel}

      params = {ts: @loadingMessage.ts, channel: @replyContext.sourceMessage.channel}

      update = _.extend(params, obj)
      update.attachments = if update.attachments then JSON.stringify(update.attachments) else null
      update.text = update.text || " "
      update.parse = "none"

      @replyContext.defaultBot.api.chat.update(update)

    else
      @replyContext.replyPublic(obj, cb)

  startLoading: (cb) ->

    sass = sassyMessages[Math.floor(Math.random() * sassyMessages.length)]

    if process.env.DEV == "true"
      sass = "[DEVELOPMENT] #{sass}"

    params =
      text: sass
      as_user: true
      attachments: [] # Override some Botkit stuff
      unfurl_links: false
      unfurl_media: false

    @replyContext.replyPublic(params, (error, response) =>
      @loadingMessage = response
      cb()
    )

  start: ->
    if process.env.LOOKER_SLACKBOT_STEALTH_EDIT == "true"
      @startLoading(=>
        @work()
      )
    else
      @work()

  replyError: (response) ->
    console.error(response)
    if response?.error
      @reply(":warning: #{response.error}")
    else if response?.message
      @reply(":warning: #{response.message}")
    else
      @reply(":warning: Something unexpected went wrong: #{JSON.stringify(response)}")

  work: ->

    # implement in subclass
