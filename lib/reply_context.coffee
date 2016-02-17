_ = require('underscore')

module.exports = class ReplyContext

  constructor: (@defaultBot, @messageBot, @sourceMessage) ->

  isSlashCommand: ->
    !!@messageBot.res

  replyPrivate: (message, cb) ->
    if @isSlashCommand()
      if @hasRepliedPrivately
        @messageBot.replyPrivateDelayed(@sourceMessage, message, cb)
      else
        @hasRepliedPrivately = true
        @messageBot.replyPrivate(@sourceMessage, message, cb)
    else
      @defaultBot.reply(@sourceMessage, message, cb)

  replyPublic: (message, cb) ->
    if @isSlashCommand()
      @messageBot.replyPublicDelayed(@sourceMessage, message, cb)
    else
      @defaultBot.reply(@sourceMessage, message, cb)

  startTyping: ->
    if @isSlashCommand()
      @messageBot.replyPublicDelayed(@sourceMessage, { type: 'typing' })
    else
      @defaultBot.startTyping(@sourceMessage)

