CLIQueryRunner = require('../repliers/cli_query_runner')
Command = require("./command")
config = require("../config")
Looker = require("../looker")

QUERY_REGEX = new RegExp('(query|q|column|bar|line|pie|scatter|map)( )?(\\w+)? (.+)')

module.exports = class CLICommand extends Command

  attempt: (context) ->
    if config.enableQueryCli && match = context.sourceMessage.text.match(QUERY_REGEX)

      [txt, type, ignore, lookerName, query] = match

      context.looker = if lookerName
        Looker.all.filter((l) -> l.url.indexOf(lookerName) != -1)[0] || Looker.all[0]
      else
        Looker.all[0]

      type = "data" if type == "q" || type == "query"

      runner = new CLIQueryRunner(context, query, type)
      runner.start()

      return true
    else
      return false
