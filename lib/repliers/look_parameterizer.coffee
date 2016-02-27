LookFinder = require('./look_finder')

module.exports = class LookParameterizer extends LookFinder

  constructor: (@replyContext, @paramQuery, @filterValue) ->
    super @replyContext

  showShareUrl: -> true

  work: ->
    @matchLooks(@paramQuery, (results) =>
      if results
        lookId = results[0].value.id
        @replyContext.looker.client.get("looks/#{lookId}", (look) =>

          queryDef = look.query
          if _.values(queryDef.filters).length > 0

            filterKey = _.keys(queryDef.filters)[0]
            queryDef.filters[filterKey] = @filterValue
            queryDef.filter_config = null

            @replyContext.looker.client.post("queries", queryDef, (query) =>
              @runQuery(query)
            , (r) => @replyError(r))

          else
            @reply("Look #{look.title} has no filters.")

        (r) => @replyError(r))
      else
        @reply("No Looks match \"#{@paramQuery}\".")
    )
