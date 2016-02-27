_ = require("underscore")
QueryRunner = require('./query_runner')

module.exports = class CLIQueryRunner extends QueryRunner

  constructor: (@replyContext, @textQuery, @visualization) ->
    super @replyContext

  showShareUrl: -> true

  work: ->

    [txt, limit, path, ignore, fields] = @textQuery.match(/([0-9]+ )?(([\w]+\/){0,2})(.+)/)

    limit = +(limit.trim()) if limit

    pathParts = path.split("/").filter((p) -> p)

    if pathParts.length != 2
      @reply("You've got to specify the model and explore!")
      return

    fullyQualified = fields.split(",").map((f) -> f.trim()).map((f) ->
      if f.indexOf(".") == -1
        "#{pathParts[1]}.#{f}"
      else
        f
    )

    fields = []
    filters = {}
    sorts = []

    for field in fullyQualified
      matches = field.match(/([A-Za-z._ ]+)(\[(.+)\])?(-)? ?(asc|desc)?/i)
      [__, field, __, filter, minus, sort] = matches
      field = field.toLowerCase().trim().split(" ").join("_")
      if filter
        filters[field] = _.unescape filter
      if sort
        sorts.push "#{field} #{sort.toLowerCase()}"
      unless minus
        fields.push field

    queryDef =
      model: pathParts[0].toLowerCase()
      view: pathParts[1].toLowerCase()
      fields: fields
      filters: filters
      sorts: sorts
      limit: limit

    unless @visualization == "data"
      queryDef.vis_config =
        type: "looker_#{@visualization}"

    @replyContext.looker.client.post("queries", queryDef, (query) =>
      if @visualization == "data"
        @replyContext.looker.client.get("queries/#{query.id}/run/unified", (result) =>
          @postResult(query, result)
        (r) => @replyError(r))
      else
        @replyContext.looker.client.get("queries/#{query.id}/run/png", (result) =>
          @postImage(query, result)
        (r) => @replyError(r)
        {encoding: null})
    , (r) => @replyError(r))
