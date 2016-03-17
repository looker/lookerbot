_ = require("underscore")

sassyMessages = [

  # English
  ["us", "Just a second"]
  ["us", "Thinking"]
  ["ca", "On it"]
  ["us", "Working on it"]
  ["gb", "Queueing"]
  ["gb", "Having a think"]
  ["ca", "One moment please"]
  ["in", "Give me a minute"]
  ["pk", "Hold on"]
  ["ng", "Looking into it"]
  ["ph", "One sec"]
  ["ph", "Working it out"]
  ["us", "Hold please"]
  ["eg", "Wait a moment"]
  ["eg", "Hmm"]

  # Cooler Languages
  ["es", "Un momento, por favor"]
  ["mx", "Por favor espera"]
  ["de", "Bitte warten Sie einen Augenblick"]
  ["jp", "お待ちください"]
  ["ca", "Un moment s'il vous plait"]
  ["cn", "稍等一會兒"]
  ["nl", "Even geduld aub"]
  ["so", "Ka shaqeeya waxaa ku"]
  ["th", "กรุณารอสักครู่"]
  ["ru", "один момент, пожалуйста"]
  ["fi", "Hetkinen"]
  ["ro", "De lucru pe ea"]
  ["is", "Eitt andartak"]
  ["az", "Bir dəqiqə zəhmət olmasa"]
  ["ie", "Fán le do thoil"]
  ["ne", "कृपया पर्खनुहोस्"]
  ["in", "कृपया एक क्षण के लिए"]

].map(([country, message] = pair) ->
  translate = "http://translate.google.com/#auto/auto/#{encodeURIComponent(message)}"
  "<#{translate}|:flag-#{country}:> _#{message}..._"
)

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

    sass = if @replyContext.isSlashCommand()
      "…"
    else
      sassyMessages[Math.floor(Math.random() * sassyMessages.length)]

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
