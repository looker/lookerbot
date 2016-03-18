QueryRunner = require('./query_runner')

module.exports = class DashboardQueryRunner extends QueryRunner

  constructor: (@replyContext, @dashboard, @filters = {}) ->
    super @replyContext, null

  showShareUrl: -> true

  work: ->

    if @dashboard.elements.length > 1
      @reply("Dashboards with more than one element aren't currently supported for Slack commands.")
      return

    for element in @dashboard.elements
      @replyContext.looker.client.get(
        "looks/#{element.look_id}"
        (look) =>
          queryDef = look.query

          for dashFilterName, fieldName of element.listen
            if @filters[dashFilterName]
              queryDef.filters ||= {}
              queryDef.filters[fieldName] = @filters[dashFilterName]

          queryDef.filter_config = null

          @replyContext.looker.client.post(
            "queries"
            queryDef
            (query) => @runQuery(query)
            (r) => @replyError(r)
            @replyContext
          )
        (r) => @replyError(r)
        {}
        @replyContext
      )

