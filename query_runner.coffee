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

    queryDef =
      model: pathParts[0]
      view: pathParts[1]
      fields: fields.split(",").map((f) -> f.trim()).map((f) ->
        if f.indexOf(".") == -1
          "#{pathParts[1]}.#{f}"
        else
          f
      )
    @looker.client.post "queries", queryDef, (query) =>
      @looker.client.get "queries/#{query.id}/run/unified", (result) =>
        @postResult(query, result)

  postResult: (query, result) ->
    if result.fields.dimensions.length == 0
      @reply(
        attachments: [
          fields: result.fields.measures.map((m) ->
            {title: m.label, value: result.data[0][m.name].rendered, short: true}
          )
          text: query.share_url
        ]
      )
    else
      @reply(query.share_url)

