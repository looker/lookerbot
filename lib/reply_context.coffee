_ = require('underscore')

module.exports = class ReplyContext

  constructor: (@defaultBot, @messageBot, @sourceMessage) ->

  isSlashCommand: ->
    !!@messageBot.res

  replyPrivate: (message, cb) ->
    message = @_rtmOptOut(message)
    if @isSlashCommand()
      if @hasRepliedPrivately
        @messageBot.replyPrivateDelayed(@sourceMessage, message, cb)
      else
        @hasRepliedPrivately = true
        @messageBot.replyPrivate(@sourceMessage, message, cb)
    else
      @defaultBot.reply(@sourceMessage, message, cb)

  replyPublic: (message, cb) ->
    message = @_rtmOptOut(message)
    if @isSlashCommand()
      @messageBot.replyPublicDelayed(@sourceMessage, message, cb)
    else
      @defaultBot.reply(@sourceMessage, message, cb)

  startTyping: ->
    if @isSlashCommand()
      @messageBot.replyPublicDelayed(@sourceMessage, { type: 'typing' })
    else
      @defaultBot.startTyping(@sourceMessage)

  # The Slack RTM API seems to be unreliable at delivering messages, or has formatting differences.
  # Setting the attachments to [] hints to botkit to skip the RTM API and use the REST one.
  _rtmOptOut: (message) ->
    if typeof(message) == "string"
      {text: message, attachments: []}
    else
      message.attachments ?= []
      message

