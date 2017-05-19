DashboardQueryRunner = require('../repliers/dashboard_query_runner')
Command = require("./command")
config = require("../config")
Looker = require("../looker")
VersionChecker = require('../version_checker')
_ = require('underscore')

module.exports = class HelpCommand extends Command

  attempt: (context) ->
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

    spaces = Looker.all.filter((l) -> l.customCommandSpaceId).map((l) ->
      "<#{l.url}/spaces/#{l.customCommandSpaceId}|this space>"
    ).join(" or ")
    if spaces
      helpAttachments.push(
        text: "\n_To add your own commands, add a dashboard to #{spaces}._"
        mrkdwn_in: ["text"]
      )

    if VersionChecker.newVersion
      helpAttachments.push(
        text: "\n\n:scream: *<#{VersionChecker.newVersion.url}|Lookerbot is out of date! Version #{VersionChecker.newVersion.number} is now available.>* :scream:"
        color: "warning"
        mrkdwn_in: ["text"]
      )

    if context.isDM && context.sourceMessage.text.toLowerCase() != "help"
      context.replyPrivate(":crying_cat_face: I couldn't understand that command. You can use `help` to see the list of possible commands.")
    else
      context.replyPrivate({attachments: helpAttachments})

    for looker in Looker.all
      looker.refreshCommands()

    return true
