_ = require("underscore")
FuzzySearch = require('fuzzysearch-js')
levenshteinFS = require('fuzzysearch-js/js/modules/LevenshteinFS')

module.exports = {}

sassyMessages = [

  # English
  ["us", "Just a second"]
  ["us", "Thinking"]
  ["ca", "On it"]
  ["us", "Working on it"]
  ["gb", "Queueing"]
  ["gb", "Having a think"]
  ["ca", "One moment please"]
  ["in", "Give me a minute"]
  ["pk", "Hold on"]
  ["ng", "Looking into it"]
  ["ph", "One sec"]
  ["ph", "Working it out"]
  ["us", "Hold please"]
  ["eg", "Wait a moment"]
  ["eg", "Hmm"]

  # Cooler Languages
  ["es", "Un momento, por favor"]
  ["mx", "Por favor espera"]
  ["de", "Bitte warten Sie einen Augenblick"]
  ["jp", "お待ちください"]
  ["ca", "Un moment s'il vous plait"]
  ["cn", "稍等一會兒"]
  ["nl", "Even geduld aub"]
  ["so", "Ka shaqeeya waxaa ku"]
  ["th", "กรุณารอสักครู่"]
  ["ru", "один момент, пожалуйста"]
  ["fi", "Hetkinen"]
  ["ro", "De lucru pe ea"]
  ["is", "Eitt andartak"]
  ["az", "Bir dəqiqə zəhmət olmasa"]
  ["ie", "Fán le do thoil"]
  ["ne", "कृपया पर्खनुहोस्"]
  ["in", "कृपया एक क्षण के लिए"]

].map(([country, message] = pair) ->
  translate = "http://translate.google.com/#auto/auto/#{encodeURIComponent(message)}"
  "<#{translate}|:flag-#{country}:> _#{message}..._"
)

module.exports.FancyReplier = class FancyReplier

  constructor: (@replyContext) ->

  reply: (obj, cb) ->
    if @loadingMessage

      # Hacky stealth update of message to preserve chat order

      if typeof(obj) == 'string'
        obj = {text: obj, channel: @replyContext.sourceMessage.channel}

      params = {ts: @loadingMessage.ts, channel: @replyContext.sourceMessage.channel}

      update = _.extend(params, obj)
      update.attachments = if update.attachments then JSON.stringify(update.attachments) else null
      update.text = update.text || " "

      @replyContext.defaultBot.api.chat.update(update)

    else
      @replyContext.replyPublic(obj, cb)

  startLoading: (cb) ->

    sass = sassyMessages[Math.floor(Math.random() * sassyMessages.length)]

    if process.env.DEV
      sass = "[DEVELOPMENT] #{sass}"

    params =
      text: sass
      as_user: true
      attachments: [] # Override some Botkit stuff
      unfurl_links: false
      unfurl_media: false

    @replyContext.replyPublic(params, (error, response) =>
      @loadingMessage = response
      cb()
    )

  start: ->
    @replyContext.startTyping()
    if process.env.LOOKER_SLACKBOT_STEALTH_EDIT == "true"
      @startLoading(=>
        @replyContext.startTyping()
        @work()
      )
    else
      @work()

  replyError: (response) ->
    console.error(response)
    if response?.error
      @reply(":warning: #{response.error}")
    else if response?.message
      @reply(":warning: #{response.message}")
    else
      @reply(":warning: Something unexpected went wrong: #{JSON.stringify(response)}")

  work: ->

    # implement in subclass

module.exports.QueryRunner = class QueryRunner extends FancyReplier

  constructor: (@replyContext, @querySlug) ->
    super @replyContext

  showShareUrl: -> false

  postImage: (query, imageData, options = {}) ->
    success = (url) =>
      share = if @showShareUrl() then query.share_url else ""
      @reply(
        attachments: [
          _.extend({}, options, {image_url: url, title: share, title_link: share})
        ]
        text: ""
      )
    error = (error) =>
      @reply(":warning: #{error}")
    @replyContext.looker.storeBlob(imageData, success, error)

  postResult: (query, result, options = {}) ->

    # Handle hidden fields
    hiddenFields = query.vis_config?.hidden_fields || []
    if hiddenFields?.length > 0
      for k, v of result.fields
        result.fields[k] = v.filter((field) -> hiddenFields.indexOf(field.name) == -1)

    calcs = result.fields.table_calculations || []
    dimensions = result.fields.dimensions || []
    measures = result.fields.measures || []
    measure_like = measures.concat(calcs.filter((c) -> c.is_measure))
    dimension_like = dimensions.concat(calcs.filter((c) -> !c.is_measure))

    renderableFields = dimension_like.concat(measure_like)

    renderField = (f, row) =>
      d = row[f.name]
      if d.drilldown_uri && (f.is_measure || f.measure)
        "<#{@replyContext.looker.url}#{d.drilldown_uri}|#{d.rendered}>"
      else if d? && d.value != null
        d.rendered
      else
        "∅"

    if result.pivots
      @reply("#{query.share_url}\n _Can't currently display tables with pivots in Slack._")

    else if result.data.length == 0
      if result.errors?.length
        txt = result.errors.map((e) -> "#{e.message}```#{e.message_details}```").join("\n")
        @reply(":warning: #{query.share_url}\n#{txt}")
      else
        @reply("#{query.share_url}\nNo results.")

    else if query.vis_config?.type == "single_value"
      field = measure_like[0] || dimension_like[0]
      share = if @showShareUrl() then "\n#{query.share_url}" else ""
      text = "*#{renderField(field, result.data[0])}*#{share}"
      @reply(text)

    else if result.data.length == 1
      attachment = _.extend({}, options, {
        fields: renderableFields.map((m) ->
          {title: m.label, value: renderField(m, result.data[0]), short: true}
        )
      })
      @reply(
        attachments: [attachment]
        text: if @showShareUrl() then query.share_url else ""
      )

    else
      attachment = _.extend({}, options, {
        fields: [
          title: renderableFields.map((f) -> f.label).join(" – ")
          value: result.data.map((d) ->
            renderableFields.map((f) -> renderField(f, d)).join(" – ")
          ).join("\n")
        ]
      })
      @reply(
        attachments: [attachment]
        text: if @showShareUrl() then query.share_url else ""
      )

  work: ->
    @replyContext.looker.client.get("queries/slug/#{@querySlug}", (query) =>
      @runQuery(query)
    (r) => @replyError(r))

  runQuery: (query, options = {}) ->
    type = query.vis_config?.type || "table"
    if type == "table" || type == "looker_single_record" || type == "single_value"
      @replyContext.looker.client.get("queries/#{query.id}/run/unified", (result) =>
        @postResult(query, result, options)
      (r) => @replyError(r))
    else
      @replyContext.looker.client.get("queries/#{query.id}/run/png", (result) =>
        @postImage(query, result, options)
      (r) => @replyError(r)
      {encoding: null})

module.exports.LookQueryRunner = class LookQueryRunner extends QueryRunner

  constructor: (@replyContext, @lookId) ->
    super @replyContext, null

  showShareUrl: -> false

  work: ->
    @replyContext.looker.client.get("looks/#{@lookId}", (look) =>
      message =
        attachments: [
          fallback: look.title
          title: look.title
          text: look.description
          title_link: "#{@replyContext.looker.url}#{look.short_url}"
          image_url: if look.public then "#{look.image_embed_url}?width=606" else null
        ]

      @reply(message)

      if !look.public
        @runQuery(look.query, message.attachments[0])

    (r) => @replyError(r))


module.exports.DashboardQueryRunner = class DashboardQueryRunner extends QueryRunner

  constructor: (@replyContext, @dashboard, @filters = {}) ->
    super @replyContext, null

  showShareUrl: -> true

  work: ->

    if @dashboard.elements.length > 1
      @reply("Dashboards with more than one element aren't currently supported for Slack commands.")
      return

    for element in @dashboard.elements
      @replyContext.looker.client.get("looks/#{element.look_id}", (look) =>
        queryDef = look.query

        for dashFilterName, fieldName of element.listen
          if @filters[dashFilterName]
            queryDef.filters[fieldName] = @filters[dashFilterName]

        queryDef.filter_config = null

        @replyContext.looker.client.post("queries", queryDef, (query) =>
          @runQuery(query)
        , (r) => @replyError(r))

      (r) => @replyError(r))

module.exports.CLIQueryRunner = class CLIQueryRunner extends QueryRunner

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

module.exports.LookFinder = class LookFinder extends QueryRunner

  constructor: (@replyContext, @type, @query) ->
    super @replyContext

  matchLooks: (query, cb) ->
    @replyContext.looker.client.get("looks?fields=id,title,short_url,space(name,id)", (looks) =>
      fuzzySearch = new FuzzySearch(looks, {termPath: "title"})
      fuzzySearch.addModule(levenshteinFS({maxDistanceTolerance: 3, factor: 3}))
      results = fuzzySearch.search(query)
      cb(results)
    (r) => @replyError(r))

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

module.exports.LookParameterizer = class LookParameterizer extends LookFinder

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
