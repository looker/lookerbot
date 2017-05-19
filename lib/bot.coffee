Botkit = require('botkit')
getUrls = require('get-urls')

_ = require('underscore')
SlackUtils = require('./slack_utils')

Looker = require('./looker')
ReplyContext = require('./reply_context')

CLIQueryRunner = require('./repliers/cli_query_runner')
LookFinder = require('./repliers/look_finder')
DashboardQueryRunner = require('./repliers/dashboard_query_runner')
QueryRunner = require('./repliers/query_runner')
LookQueryRunner = require('./repliers/look_query_runner')

VersionChecker = require('./version_checker')

config = require('./config')

listeners = [
  require('./listeners/data_action_listener')
  require('./listeners/health_check_listener')
  require('./listeners/schedule_listener')
  require('./listeners/slack_action_listener')
  require('./listeners/slack_event_listener')
]

blobStores = require('./stores/index')

Looker.loadAll()

currentVersionChecker = new VersionChecker()

refreshCommands = ->
  for looker in Looker.all
    looker.refreshCommands()

# Update access tokens every half hour
setInterval(->
  for looker in Looker.all
    looker.client.fetchAccessToken()
, 30 * 60 * 1000)

controller = Botkit.slackbot(
  debug: process.env.DEBUG_MODE == "true"
)

defaultBot = controller.spawn({
  token: process.env.SLACK_API_KEY,
  retry: 10,
}).startRTM()

defaultBot.api.team.info {}, (err, response) ->
  if response?.ok
    controller.saveTeam(response.team, ->
      console.log "Saved the team information..."
    )
  else
    throw new Error("Could not connect to the Slack API. Ensure your Slack API key is correct. (#{err})")

runningListeners = []

controller.setupWebserver process.env.PORT || 3333, (err, expressWebserver) ->
  controller.createWebhookEndpoints(expressWebserver)

  for listener in listeners
    instance = new listener(expressWebserver, defaultBot, Looker.all)
    instance.listen()

    runningListeners.push(instance)

controller.on 'rtm_reconnect_failed', ->
  throw new Error("Failed to reconnect to the Slack RTM API.")

controller.on 'ambient', (bot, message) ->
  attemptExpandUrl(bot, message)

QUERY_REGEX = '(query|q|column|bar|line|pie|scatter|map)( )?(\\w+)? (.+)'
FIND_REGEX = 'find (dashboard|look )? ?(.+)'

controller.on "slash_command", (bot, message) ->
  return unless SlackUtils.checkToken(bot, message)
  processCommand(bot, message)

controller.on "direct_mention", (bot, message) ->
  message.text = SlackUtils.stripMessageText(message.text)
  processCommand(bot, message)

controller.on "direct_message", (bot, message) ->
  if message.text.indexOf("/") != 0
    message.text = SlackUtils.stripMessageText(message.text)
    processCommand(bot, message, true)

ensureUserAuthorized = (bot, message, callback, options = {}) ->

  unless options.silent
    context = new ReplyContext(defaultBot, bot, message)

  defaultBot.api.users.info({user: message.user}, (error, response) ->
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

processCommand = (bot, message, isDM = false) ->
  ensureUserAuthorized(bot, message, ->
    processCommandInternal(bot, message, isDM)
  )

processCommandInternal = (bot, message, isDM) ->

  message.text = message.text.split('“').join('"')
  message.text = message.text.split('”').join('"')

  context = new ReplyContext(defaultBot, bot, message)

  if match = message.text.match(new RegExp(QUERY_REGEX)) && config.enableQueryCli
    message.match = match
    runCLI(context, message)
  else if match = message.text.match(new RegExp(FIND_REGEX))
    message.match = match
    find(context, message)
  else
    shortCommands = _.sortBy(_.values(Looker.customCommands), (c) -> -c.name.length)
    matchedCommand = shortCommands.filter((c) -> message.text.toLowerCase().indexOf(c.name) == 0)?[0]
    if matchedCommand

      dashboard = matchedCommand.dashboard
      query = message.text[matchedCommand.name.length..].trim()
      message.text.toLowerCase().indexOf(matchedCommand.name)

      context.looker = matchedCommand.looker

      filters = {}
      dashboard_filters = dashboard.dashboard_filters || dashboard.filters
      for filter in dashboard_filters
        filters[filter.name] = query
      runner = new DashboardQueryRunner(context, matchedCommand.dashboard, filters)
      runner.start()

    else
      helpAttachments = []

      groups = _.groupBy(Looker.customCommands, 'category')

      for groupName, groupCommmands of groups
        groupText = ""
        for command in _.sortBy(_.values(groupCommmands), "name")
          unless command.hidden
            groupText += "• *<#{command.looker.url}/dashboards/#{command.dashboard.id}|#{command.name}>* #{command.helptext}"
            if command.description
              groupText += " — _#{command.description}_"
            groupText += "\n"

        if groupText
          helpAttachments.push(
            title: groupName
            text: groupText
            color: "#64518A"
            mrkdwn_in: ["text"]
          )

      defaultText = """
      • *find* <look search term> — _Shows the top five Looks matching the search._
      """

      if config.enableQueryCli
        defaultText += "• *q* <model_name>/<view_name>/<field>[<filter>] — _Runs a custom query._\n"

      helpAttachments.push(
        title: "Built-in Commands"
        text: defaultText
        color: "#64518A"
        mrkdwn_in: ["text"]
      )


      spaces = Looker.all.filter((l) -> l.customCommandSpaceId ).map((l) ->
        "<#{l.url}/spaces/#{l.customCommandSpaceId}|this space>"
      ).join(" or ")
      if spaces
        helpAttachments.push(
          text: "\n_To add your own commands, add a dashboard to #{spaces}._"
          mrkdwn_in: ["text"]
        )

      if currentVersionChecker.newVersion
        helpAttachments.push(
          text: "\n\n:scream: *<#{currentVersionChecker.newVersion.url}|Lookerbot is out of date! Version #{currentVersionChecker.newVersion.number} is now available.>* :scream:"
          color: "warning"
          mrkdwn_in: ["text"]
        )

      if isDM && message.text.toLowerCase() != "help"
        context.replyPrivate(":crying_cat_face: I couldn't understand that command. You can use `help` to see the list of possible commands.")
      else
        context.replyPrivate({attachments: helpAttachments})

    refreshCommands()

  if context.isSlashCommand() && !context.hasRepliedPrivately
    # Return 200 immediately for slash commands
    bot.res.setHeader 'Content-Type', 'application/json'
    bot.res.send JSON.stringify({response_type: "in_channel"})

runCLI = (context, message) ->
  [txt, type, ignore, lookerName, query] = message.match

  context.looker = if lookerName
    Looker.all.filter((l) -> l.url.indexOf(lookerName) != -1)[0] || Looker.all[0]
  else
    Looker.all[0]

  type = "data" if type == "q" || type == "query"

  runner = new CLIQueryRunner(context, query, type)
  runner.start()

find = (context, message) ->
  [__, type, query] = message.match

  firstWord = query.split(" ")[0]
  foundLooker = Looker.all.filter((l) -> l.url.indexOf(firstWord) != -1)[0]
  if foundLooker
    words = query.split(" ")
    words.shift()
    query = words.join(" ")
  context.looker = foundLooker || Looker.all[0]

  runner = new LookFinder(context, type, query)
  runner.start()

attemptExpandUrl = (bot, message) ->

  return if !message.text || message.subtype == "bot_message"

  return unless process.env.LOOKER_SLACKBOT_EXPAND_URLS == "true"

  ensureUserAuthorized(bot, message, ->

    # URL Expansion
    for url in getUrls(message.text).map((url) -> url.replace("%3E", ""))

      for looker in Looker.all

        # Starts with Looker base URL?
        if url.lastIndexOf(looker.url, 0) == 0
          context = new ReplyContext(defaultBot, bot, message)
          context.looker = looker
          annotateLook(context, url, message, looker)
          annotateShareUrl(context, url, message, looker)

  , {silent: true})

annotateLook = (context, url, sourceMessage, looker) ->
  if matches = url.match(/\/looks\/([0-9]+)$/)
    console.log "Expanding Look URL #{url}"
    runner = new LookQueryRunner(context, matches[1])
    runner.start()

annotateShareUrl = (context, url, sourceMessage, looker) ->
  if matches = url.match(/\/x\/([A-Za-z0-9]+)$/)
    console.log "Expanding Share URL #{url}"
    runner = new QueryRunner(context, {slug: matches[1]})
    runner.start()
