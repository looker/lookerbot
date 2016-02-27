QueryRunner = require('./query_runner')

module.exports = class LookQueryRunner extends QueryRunner

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
          color: "#64518A"
          title_link: "#{@replyContext.looker.url}#{look.short_url}"
          image_url: if look.public then "#{look.image_embed_url}?width=606" else null
        ]

      @reply(message)

      if !look.public
        @runQuery(look.query, message.attachments[0])

    (r) => @replyError(r))
