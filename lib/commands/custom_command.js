DashboardQueryRunner = require('../repliers/dashboard_query_runner')
Command = require("./command")
config = require("../config")
Looker = require("../looker")
_ = require('underscore')

module.exports = class CustomCommand extends Command

  attempt: (context) ->
    normalizedText = context.sourceMessage.text.toLowerCase()
    shortCommands = _.sortBy(_.values(Looker.customCommands), (c) -> -c.name.length)
    matchedCommand = shortCommands.filter((c) -> normalizedText.indexOf(c.name) == 0)?[0]
    if matchedCommand

      dashboard = matchedCommand.dashboard
      query = context.sourceMessage.text[matchedCommand.name.length..].trim()
      normalizedText.indexOf(matchedCommand.name)

      context.looker = matchedCommand.looker

      filters = {}
      dashboard_filters = dashboard.dashboard_filters || dashboard.filters
      for filter in dashboard_filters
        filters[filter.name] = query
      runner = new DashboardQueryRunner(context, matchedCommand.dashboard, filters)
      runner.start()

      return true
    else
      return false
