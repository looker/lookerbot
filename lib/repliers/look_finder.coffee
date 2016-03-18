FuzzySearch = require('fuzzysearch-js')
levenshteinFS = require('fuzzysearch-js/js/modules/LevenshteinFS')
QueryRunner = require('./query_runner')

module.exports = class LookFinder extends QueryRunner

  constructor: (@replyContext, @type, @query) ->
    super @replyContext

  matchLooks: (query, cb) ->
    @replyContext.looker.client.get(
      "looks?fields=id,title,short_url,space(name,id)"
      (looks) =>
        fuzzySearch = new FuzzySearch(looks, {termPath: "title"})
        fuzzySearch.addModule(levenshteinFS({maxDistanceTolerance: 3, factor: 3}))
        results = fuzzySearch.search(query)
        cb(results)
      (r) => @replyError(r)
      {}
      @replyContext
    )

  work: ->
    @matchLooks(@query, (results) =>
      if results
        shortResults = results.slice(0, 5)
        @reply({
          text: "Matching Looks:"
          attachments: shortResults.map((v) =>
            look = v.value
            {
              title: look.title
              title_link: "#{@replyContext.looker.url}#{look.short_url}"
              text: "in #{look.space.name}"
            }
          )
        })
      else
        @reply("No Looks match \"#{@query}\".")
    )
