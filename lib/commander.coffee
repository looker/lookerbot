SlackService = require('./services/slack_service')
Looker = require("./looker")
QueryRunner = require('./repliers/query_runner')
LookQueryRunner = require('./repliers/look_query_runner')

module.exports = class Commander

  constructor: (opts) ->
    @service = new SlackService({
      listeners: opts.listeners
      messageHandler: (context) =>
        @handleMessage(context)
      urlHandler: (context) =>
        @handleUrlExpansion(context, url)
    })
    @service.begin()

    @commands = opts.commands.map((c) -> new c())

  handleMessage: (context) ->

    message = context.sourceMessage

    message.text = message.text.split('“').join('"')
    message.text = message.text.split('”').join('"')

    for command in @commands
      if command.attempt(context)
        break

    if context.isSlashCommand() && !context.hasRepliedPrivately
      # Return 200 immediately for slash commands
      context.messageBot.res.setHeader 'Content-Type', 'application/json'
      context.messageBot.res.send JSON.stringify({response_type: "in_channel"})

    return

  handleUrlExpansion: (context, url) ->
    for looker in Looker.all
      # Starts with Looker base URL?
      if url.lastIndexOf(looker.url, 0) == 0
        context.looker = looker
        @annotateLook(context, url)
        @annotateShareUrl(context, url)

    return

  annotateLook: (context, url) ->
    if matches = url.match(/\/looks\/([0-9]+)$/)
      console.log "Expanding Look URL #{url}"
      runner = new LookQueryRunner(context, matches[1])
      runner.start()

    return

  annotateShareUrl: (context, url) ->
    if matches = url.match(/\/x\/([A-Za-z0-9]+)$/)
      console.log "Expanding Share URL #{url}"
      runner = new QueryRunner(context, {slug: matches[1]})
      runner.start()

    return
