_ = require("underscore")

module.exports = class QueryRunner

  constructor: (@looker, @query, @bot, @message, @visualization) ->

  reply: (obj, cb) ->

    if @loadingMessage
      # Hacky stealth update of message to preserve chat order

      if typeof(obj) == 'string'
        obj = {text: obj, channel: @message.channel}

      params = {ts: @loadingMessage.ts, channel: @message.channel}

      update = _.extend(params, obj)
      update.attachments = if update.attachments then JSON.stringify(update.attachments) else null
      update.text = update.text || " "

      @bot.api.chat.update(update)
    else
      @bot.reply(@message, obj, cb)

  startLoading: (cb) ->

    sassyMessages = [
      "Just a second..."
      "Working on it..."
      "One moment please..."
      "Give me a minute..."
      "Hold on..."
      "Looking into it..."
      "One sec..."
      "Hold please..."
      "Wait a moment..."
      "Un momento, por favor..."
    ]

    sass = sassyMessages[Math.floor(Math.random() * sassyMessages.length)]

    params =
      text: sass
      channel: @message.channel
      as_user: true
      attachments: [] # Override some Botkit stuff

    @bot.say(params, (err, res) =>
      @loadingMessage = res
      cb()
    )

  run:  ->
    if process.env.LOOKER_SLACKBOT_STEALTH_EDIT == "true"
      @startLoading(=>
        @_runInternal()
      )
    else
      @_runInternal()

  _runInternal: ->

    [txt, limit, path, ignore, fields] = @query.match(/([0-9]+ )?(([\w]+\/){0,2})(.+)/)

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
      matches = field.match(/([A-Za-z._]+)(\[(.+)\])? ?(asc|desc)?/i)
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
      limit: limit

    unless @visualization == "data"
      queryDef.vis_config =
        type: "looker_#{@visualization}"

    error = (response) =>
      if response.error
        @reply(":warning: #{response.error}")
      else if response.message
        @reply(":warning: #{response.message}")
      else
        @reply("Something unexpected went wrong: #{JSON.stringify(response)}")
    @looker.client.post("queries", queryDef, (query) =>
      if @visualization == "data"
        @looker.client.get("queries/#{query.id}/run/unified", (result) =>
          @postResult(query, result)
        , error)
      else
        @looker.client.get("queries/#{query.id}/run/png", (result) =>
          @postImage(query, result)
        , error, {encoding: null})
    , error)

  postImage: (query, imageData) ->
    success = (url) =>
      @reply(
        attachments: [
          image_url: url
          text: query.share_url
        ]
      )
    error = (error) =>
      @reply(":warning: #{error}")
    @looker.storeBlob(imageData, success, error)

  postResult: (query, result) ->
    if result.data.length == 0
      @reply("#{query.share_url}\nNo results.")
    else if result.fields.dimensions.length == 0
      @reply(
        attachments: [
          fields: result.fields.measures.map((m) ->
            {title: m.label, value: result.data[0][m.name].rendered, short: true}
          )
        ]
        text: query.share_url
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
        ]
        text: query.share_url
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
        ]
        text: query.share_url
      )
    else
      @reply(query.share_url)

