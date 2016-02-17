_ = require('underscore')

module.exports = class ReplyContext

  constructor: (@defaultBot, @messageBot, @sourceMessage) ->

  isSlashCommand: ->
    !!@messageBot.res

  replyPrivate: (message, cb) ->
    @hasRepliedToSlashCommand = true
    if @isSlashCommand()
      @messageBot.replyPrivateDelayed(@sourceMessage, message, cb)
    else
      @defaultBot.reply(@sourceMessage, message, cb)

  replyPublic: (message, cb) ->
    @hasRepliedToSlashCommand = true
    if @isSlashCommand()
      @messageBot.replyPublicDelayed(@sourceMessage, message, cb)
    else
      @defaultBot.reply(@sourceMessage, message, cb)

  startTyping: ->
    @hasRepliedToSlashCommand = true
    if @isSlashCommand()
      @messageBot.replyPublicDelayed(@sourceMessage, { type: 'typing' })
    else
      @defaultBot.startTyping(@sourceMessage)

