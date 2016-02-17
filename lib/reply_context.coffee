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
      @replyPublic(message, cb)

  replyPublic: (message, cb) ->
    if @isSlashCommand()
      @messageBot.replyPublicDelayed(@sourceMessage, message, cb)
    else
      @defaultBot.reply(@sourceMessage, message, cb)

  canEditReply: ->
    !@isSlashCommand()

  say: (message, cb) ->
    params = _.extend({}, {channel: @sourceMessage.channel}, message)
    if @isSlashCommand()
      @replyPublic(params, (err, res) =>
        cb(res)
      )
    else
      @defaultBot.say(params, (err, res) =>
        cb(res)
      )
