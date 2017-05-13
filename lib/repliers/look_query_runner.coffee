QueryRunner = require('./query_runner')

module.exports = class LookQueryRunner extends QueryRunner

  constructor: (@replyContext, @lookId, @filterInfo = null) ->
    super @replyContext, null

  showShareUrl: -> true

  linkText: (shareUrl) ->
    if @loadedLook
      @loadedLook.title
    else
      super(shareUrl)

  linkUrl: (shareUrl) ->
    if @loadedLook
      if @isFilteredLook()
        @filterInfo.url
      else
        "#{@replyContext.looker.url}#{@loadedLook.short_url}"
    else
      super(shareUrl)

  isFilteredLook: ->
    @filterInfo? && @loadedLook.query.id != @filterInfo.queryId

  work: ->
    @replyContext.looker.client.get("looks/#{@lookId}", (look) =>

      @loadedLook = look

      if @isFilteredLook()
        @queryId = @filterInfo.queryId
      else
        @querySlug = look.query.slug

      super
    (r) => @replyError(r))
