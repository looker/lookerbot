_ = require("underscore")

sassyMessages = [

  # English
  ["ca", "Um minutinho"]
  ["ca", "Já ta chegando..."]
  ["ca", "Coletando os dados"]
  ["ca", "Deixa eu ver..."]
  ["ca", "Um instante"]
  ["ca", "Espere um minuto"]
  ["ca", "Um pouco de paciência"]
  ["ca", "Give me a minute"]
  ["ca", "Vou ver aqui para você"]
  ["ca", "Pesquisando..."]
  ["ca", "Por favor espere, caro Logger"]
  ["ca", "Vamos ver os dados #DataDrivenLoggi"]
  ["ca", "Un moment s'il vous plait"]
  ["ca", "Wait a moment"]
  ["ca", "Hmm"]

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
  ["ro", "Lucrez la asta"]
  ["is", "Eitt andartak"]
  ["az", "Bir dəqiqə zəhmət olmasa"]
  ["ie", "Fán le do thoil"]
  ["ne", "कृपया पर्खनुहोस्"]
  ["in", "कृपया एक क्षण के लिए"]

].map(([country, message] = pair) ->
  translate = "https://translate.google.com/#auto/auto/#{encodeURIComponent(message)}"
  "<#{translate}|:flag-#{country}:> _#{message}..._"
)

module.exports = class FancyReplier

  constructor: (replyContext) ->
    @replyContext = replyContext

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

    # Scheduled messages don't have a loading indicator, why distract everything?
    if @replyContext.scheduled
      cb()
      return

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
    if process.env.LOOKER_SLACKBOT_LOADING_MESSAGES != "false"
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
      @reply(":Deu ruim: Algo deu errado... Melhor falar com o BI :): #{JSON.stringify(response)}")

  work: ->

    # implement in subclass
