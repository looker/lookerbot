config = require('./config')
SlackService = require('./services/slack_service')

Looker = require("./looker")

CLIQueryRunner = require('./repliers/cli_query_runner')
LookFinder = require('./repliers/look_finder')
DashboardQueryRunner = require('./repliers/dashboard_query_runner')
QueryRunner = require('./repliers/query_runner')
LookQueryRunner = require('./repliers/look_query_runner')

QUERY_REGEX = '(query|q|column|bar|line|pie|scatter|map)( )?(\\w+)? (.+)'
FIND_REGEX = 'find (dashboard|look )? ?(.+)'

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

  handleMessage: (context) ->

    console.log "handling message"

    message.text = message.text.split('“').join('"')
    message.text = message.text.split('”').join('"')

    if match = message.text.match(new RegExp(QUERY_REGEX)) && config.enableQueryCli
      message.match = match
      @runCLI(context, message)
    else if match = message.text.match(new RegExp(FIND_REGEX))
      message.match = match
      @find(context, message)
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
      context.messageBot.res.setHeader 'Content-Type', 'application/json'
      context.messageBot.res.send JSON.stringify({response_type: "in_channel"})

  handleUrlExpansion: (context, url) ->
    console.log "handling url expansion"

    for looker in Looker.all
      # Starts with Looker base URL?
      if url.lastIndexOf(looker.url, 0) == 0
        context.looker = looker
        @annotateLook(context, url)
        @annotateShareUrl(context, url)

  annotateLook: (context, url) ->
    if matches = url.match(/\/looks\/([0-9]+)$/)
      console.log "Expanding Look URL #{url}"
      runner = new LookQueryRunner(context, matches[1])
      runner.start()

  annotateShareUrl: (context, url) ->
    if matches = url.match(/\/x\/([A-Za-z0-9]+)$/)
      console.log "Expanding Share URL #{url}"
      runner = new QueryRunner(context, {slug: matches[1]})
      runner.start()

  runCLI: (context, message) ->
    [txt, type, ignore, lookerName, query] = message.match

    context.looker = if lookerName
      Looker.all.filter((l) -> l.url.indexOf(lookerName) != -1)[0] || Looker.all[0]
    else
      Looker.all[0]

    type = "data" if type == "q" || type == "query"

    runner = new CLIQueryRunner(context, query, type)
    runner.start()

  find: (context, message) ->
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
