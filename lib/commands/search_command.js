LookFinder = require('../repliers/look_finder')
Command = require("./command")
config = require("../config")
Looker = require("../looker")

FIND_REGEX = new RegExp('find (dashboard|look )? ?(.+)')

module.exports = class SearchCommand extends Command

  attempt: (context) ->
    if match = context.sourceMessage.text.match(FIND_REGEX)

      [__, type, query] = match

      firstWord = query.split(" ")[0]
      foundLooker = Looker.all.filter((l) -> l.url.indexOf(firstWord) != -1)[0]
      if foundLooker
        words = query.split(" ")
        words.shift()
        query = words.join(" ")
      context.looker = foundLooker || Looker.all[0]

      runner = new LookFinder(context, type, query)
      runner.start()

      return true
    else
      return false
