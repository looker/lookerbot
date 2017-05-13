FuzzySearch = require('fuzzysearch-js')
levenshteinFS = require('fuzzysearch-js/js/modules/LevenshteinFS')
QueryRunner = require('./query_runner')

module.exports = class LookFinder extends QueryRunner

  constructor: (@replyContext, @type, @query) ->
    super @replyContext

  matchLooksOrDashboards: (type, query, cb) ->
    lookOrDashboard = if type == 'look' then 'looks' else 'dashboards'
    @replyContext.looker.client.get(
      "#{lookOrDashboard}?fields=id,title,short_url,space(name,id)"
      (looks) =>
        fuzzySearch = new FuzzySearch(looks, {termPath: "title", minimumScore: 40, returnEmptyArray: true})
        fuzzySearch.addModule(levenshteinFS({maxDistanceTolerance: 3, factor: 1}))
        results = fuzzySearch.search(query)
        cb(results)
      (r) => @replyError(r)
      {}
      @replyContext
    )

  work: ->
    @matchLooksOrDashboards(@type, @query, (results) =>
      matchingString = if @type == 'look' then 'Looks' else if @type == 'dashboard' then 'Dashboards' else 'Commands'
      type = @type
      if results
        # HACK(cliu): Currently hard code for the space with lookerbot commands
        COMMAND_SPACE_IDS = [296, 298, 300, 301, 302]
        results = results.filter((r) ->
          if type == 'command'
            r.value.space and r.value.space.id in COMMAND_SPACE_IDS
          else if type == 'dashboard'
            r.value.space and r.value.space.id not in COMMAND_SPACE_IDS
          else
            true
        )
        shortResults = results.slice(0, 5)
        text = if shortResults.length == 0 then "No match found =(" else "Matching #{matchingString}:"
        @reply({
          text: text
          attachments: shortResults.map((v) =>
            lookOrDashboard = v.value
            # console.log("lookOrDashboard: #{JSON.stringify(lookOrDashboard, null, 2)}")
            id = if type == 'look' then lookOrDashboard.short_url else "/dashboards/#{lookOrDashboard.id}"
            {
              title: lookOrDashboard.title
              title_link: "#{@replyContext.looker.url}#{id}"
              text: "in space \"#{lookOrDashboard.space.name}\""
            }
          )
        })
      else
        @reply("No #{matchingString} match \"#{@query}\".")
    )
