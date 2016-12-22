QueryRunner = require('./query_runner')

module.exports = class LookQueryRunner extends QueryRunner

  constructor: (@replyContext, @lookId) ->
    super @replyContext, null

  showShareUrl: -> true

  linkText: (shareUrl) ->
    @loadedLook?.title || super(shareUrl)

  linkUrl: (shareUrl) ->
    if @loadedLook
      "#{@replyContext.looker.url}#{@loadedLook.short_url}"
    else
      super(shareUrl)

  work: ->
    @replyContext.looker.client.get("looks/#{@lookId}", (look) =>
      @querySlug = look.query.slug
      @loadedLook = look
      super
    (r) => @replyError(r))
