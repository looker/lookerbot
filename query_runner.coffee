_ = require("underscore")

module.exports = class QueryRunner

  constructor: (@looker, @query, @bot, @message) ->

  reply: (obj) ->
    @bot.reply(@message, obj)

  run: ->

    [txt, path, ignore, fields] = @query.match(/(([\w]+\/){0,2})(.+)/)

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
      matches = field.match(/([A-Za-z.]+)(\[(.+)\])? ?(asc|desc)?/i)
      [__, field, __, filter, sort] = matches
      if filter
        filters[field] = _.unescape filter
      if sort
        sorts.push "#{field} #{sort}"
      fields.push field

    queryDef =
      model: pathParts[0]
      view: pathParts[1]
      fields: fields
      filters: filters
      sorts: sorts

    error = (response) =>
      if response.error
        @reply(response.error)
      else
        @reply("Something unexpected went wrong: #{JSON.stringify(response)}")
    @looker.client.post("queries", queryDef, (query) =>
      @looker.client.get("queries/#{query.id}/run/unified", (result) =>
        @postResult(query, result)
      , error)
    , error)

  postResult: (query, result) ->
    if result.data.length == 0
      @reply("#{query.share_url}\nNo results.")
    else if result.fields.dimensions.length == 0
      @reply(
        attachments: [
          fields: result.fields.measures.map((m) ->
            {title: m.label, value: result.data[0][m.name].rendered, short: true}
          )
          text: query.share_url
        ]
      )
    else if result.fields.dimensions.length == 1 && result.fields.measures.length == 0
      @reply(
        attachments: [
          fields: [
            title: result.fields.dimensions[0].label
            value: result.data.map((d) ->
              d[result.fields.dimensions[0].name].rendered
            ).join("\n")
          ]
          text: query.share_url
        ]
      )
    else if result.fields.dimensions.length == 1 && result.fields.measures.length == 1
      dim = result.fields.dimensions[0]
      mes = result.fields.measures[0]
      @reply(
        attachments: [
          fields: [
            title: "#{dim.label} – #{mes.label}"
            value: result.data.map((d) ->
              "#{d[dim.name].rendered} – #{d[mes.name].rendered}"
            ).join("\n")
          ]
          text: query.share_url
        ]
      )
    else
      @reply(query.share_url)

