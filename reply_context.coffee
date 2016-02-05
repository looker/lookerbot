_ = require('underscore')

module.exports = class ReplyContext

  constructor: (@defaultBot, @messageBot, @sourceMessage) ->

  isSlashCommand: ->
    !!@messageBot.res

  replyPrivate: (message, cb) ->
    @hasRepliedToSlashCommand = true
    if @isSlashCommand()
      @messageBot.replyPrivate(@sourceMessage, message, cb)
    else
      @replyPublic(message, cb)

  replyPublic: (message, cb) ->
    @defaultBot.reply(@sourceMessage, message, cb)

  canEditReply: ->
    !@isSlashCommand()

  say: (message, cb) ->
    params = _.extend({}, {channel: @sourceMessage.channel}, message)
    @messageBot.say(params, (err, res) =>
      cb(res)
    )
