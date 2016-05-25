_ = require("underscore")
FancyReplier = require('./fancy_replier')

module.exports = class QueryRunner extends FancyReplier

  constructor: (@replyContext, @querySlug) ->
    super @replyContext

  showShareUrl: -> false

  postImage: (query, imageData, options = {}) ->
    if @replyContext.looker.storeBlob
      success = (url) =>
        @reply(
          attachments: [
            _.extend({}, options, {
              image_url: url
              title: share
              title_link: share
              color: "#64518A"
            })
          ]
          text: ""
        )
      error = (error, context) =>
        @reply(":warning: *#{context}* #{error}")

      # Heuristic: check if PNG has more than 80% '0's. If so, we pretend it has no result.
      zeroes = 0
      for i in [0..imageData.length-1]
        if imageData[i] == 0
          zeroes += 1
      zeroPercent = 100.0 * zeroes / imageData.length
      console.log("percent of PNG are zeroes? #{zeroPercent}")
      share = if @showShareUrl() then query.share_url else ""
      if (zeroPercent > 80 || imageData.length == 0)
        @reply("#{share}\nNo results.")
      else
        @replyContext.looker.storeBlob(imageData, success, error)
    else
      @reply(":warning: No storage is configured for visualization images in the bot configuration.")

  postResult: (query, result, options = {}) ->

    # Handle hidden fields
    # console.log('result: ' + JSON.stringify(result, null, 2));
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

    shareUrl = "<#{query.share_url}>"

    renderString = (d) ->
      d.rendered || d.value

    renderField = (f, row) =>
      d = row[f.name]
      if d.drilldown_uri && (f.is_measure || f.measure)
        "<#{@replyContext.looker.url}#{d.drilldown_uri}|#{renderString(d)}>"
      else if d? && d.value != null
        renderString(d)
      else
        "∅"

    renderFieldLabel = (field) ->
      if query.vis_config?.show_view_names? && !query.vis_config.show_view_names
        field.label_short || field.label
      else
        field.label

    if result.pivots
      @reply("#{shareUrl}\n _Can't currently display tables with pivots in Slack._")

    else if result.data.length == 0
      if result.errors?.length
        txt = result.errors.map((e) -> "#{e.message}```#{e.message_details}```").join("\n")
        @reply(":warning: #{shareUrl}\n#{txt}")
      else
        @reply("#{shareUrl}\nNo results.")

    else if query.vis_config?.type == "single_value"
      field = measure_like[0] || dimension_like[0]
      share = if @showShareUrl() then "\n#{shareUrl}" else ""
      rendered = renderField(field, result.data[0])
      text = "*#{rendered}*#{share}"
      @reply({attachments: [{text: text, fallback: rendered, color: "#64518A", mrkdwn_in: ["text"]}],})

    else if result.data.length == 1 || query.vis_config?.type == "looker_single_record"
      attachment = _.extend({}, options, {
        color: "#64518A"
        fallback: shareUrl
        fields: renderableFields.map((m) ->
          rendered = renderField(m, result.data[0])
          {title: renderFieldLabel(m), value: rendered, fallback: rendered, short: true}
        )
      })
      attachment.text = if @showShareUrl() then shareUrl else ""
      @reply(attachments: [attachment])

    else
      attachment = _.extend({color: "#64518A"}, options, {
        title: renderableFields.map((f) -> renderFieldLabel(f)).join(" – ")
        text: result.data.map((d) ->
          renderableFields.map((f) -> renderField(f, d)).join(" – ")
        ).join("\n")
        fallback: shareUrl
      })
      @reply(attachments: [attachment], text: if @showShareUrl() then shareUrl else "")

  work: ->
    @replyContext.looker.client.get(
      "queries/slug/#{@querySlug}"
      (query) => @runQuery(query)
      (r) => @replyError(r)
      {}
      @replyContext
    )

  runQuery: (query, options = {}) ->
    type = query.vis_config?.type || "table"
    console.log("type: #{type}")
    console.log("query: #{JSON.stringify(query, null, )}")
    if type == "looker_single_record" || type == "single_value"
      @replyContext.looker.client.get(
        "queries/#{query.id}/run/unified"
        (result) => @postResult(query, result, options)
        (r) => @replyError(r)
        {}
        @replyContext
      )
    else
      @replyContext.looker.client.get(
        "queries/#{query.id}/run/png?image_width=900&image_height=560"
        (result) => @postImage(query, result, options)
        (r) =>
          if r?.error == "Received empty response from Looker."
            @replyError({error: "Did not receive an image from Looker.\nThe \"PDF Download & Scheduling and Scheduled Visualizations\" Labs feature must be enabled to render images."})
          else
            @replyError(r)
        {encoding: null}
        @replyContext
      )
