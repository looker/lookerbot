config = require("../config")
Looker = require("../looker")
Botkit = require("botkit")
SlackUtils = require("../slack_utils")
getUrls = require('get-urls')
ReplyContext = require('../reply_context')

module.exports = class SlackService

  constructor: (opts) ->
    @listeners = opts.listeners
    @messageHandler = opts.messageHandler
    @urlHandler = opts.urlHandler

  begin: ->

    @controller = Botkit.slackbot(
      debug: config.debugMode
    )

    @defaultBot = @controller.spawn({
      token: config.slackApiKey,
      retry: 10,
    }).startRTM()

    # This is a workaround to how Botkit handles teams, but this server manages only a single team.

    @defaultBot.api.team.info {}, (err, response) =>
      if response?.ok
        @controller.saveTeam(response.team, ->
          console.log "Saved the team information..."
        )
      else
        throw new Error("Could not connect to the Slack API. Ensure your Slack API key is correct. (#{err})")

    # Attach listeners. This should move elsewhere.
    # Botkit builds its own webserver to handle slash commands, but this is an annoyance.
    # Probably excising botkit is best.

    @runningListeners = []

    @controller.setupWebserver process.env.PORT || 3333, (err, expressWebserver) =>
      @controller.createWebhookEndpoints(expressWebserver)

      for listener in @listeners
        instance = new listener(expressWebserver, @defaultBot, Looker.all)
        instance.listen()

        @runningListeners.push(instance)

    # Listen to the various events

    processCommand = (bot, message, isDM = false) =>
      context = new ReplyContext(@defaultBot, bot, message)
      context.isDM = isDM
      @ensureUserAuthorized(context, =>
        @messageHandler(context)
      )

    @controller.on "rtm_reconnect_failed", =>
      throw new Error("Failed to reconnect to the Slack RTM API.")

    @controller.on "slash_command", (bot, message) =>
      return unless SlackUtils.checkToken(bot, message)
      processCommand(bot, message)

    @controller.on "direct_mention", (bot, message) =>
      message.text = SlackUtils.stripMessageText(message.text)
      processCommand(bot, message)

    @controller.on "direct_message", (bot, message) =>
      if message.text.indexOf("/") != 0
        message.text = SlackUtils.stripMessageText(message.text)
        processCommand(bot, message, true)

    @controller.on 'ambient', (bot, message) =>

      return if !message.text || message.subtype == "bot_message"

      return unless process.env.LOOKER_SLACKBOT_EXPAND_URLS == "true"

      context = new ReplyContext(@defaultBot, bot, message)
      context.isDM = isDM

      @ensureUserAuthorized(context, =>
        # URL Expansion
        for url in getUrls(message.text).map((url) -> url.replace("%3E", ""))
          @urlHandler(context, url)
      , {silent: true})

  ensureUserAuthorized: (context, callback, options = {}) ->

    if options.silent
      context = null

    @defaultBot.api.users.info({user: context.sourceMessage.user}, (error, response) ->
      user = response?.user
      if error || !user
        context?.replyPrivate(
          text: "Could not fetch your user info from Slack. #{error || ""}"
        )
      else
        if !config.enableGuestUsers && (user.is_restricted || user.is_ultra_restricted)
          context?.replyPrivate(
            text: "Sorry @#{user.name}, as a guest user you're not able to use this command."
          )
        else if user.is_bot
          context?.replyPrivate(
            text: "Sorry @#{user.name}, as a bot you're not able to use this command."
          )
        else
          callback()
    )
