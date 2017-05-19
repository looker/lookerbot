request = require("request")
_ = require("underscore")
npmPackage = require('./../package.json')
crypto = require("crypto")

module.exports = class LookerAPIClient

  constructor: (@options) ->
    @fetchAccessToken()

  reachable: ->
    @token?

  request: (requestConfig, successCallback, errorCallback, replyContext) ->

    unless @reachable()
      errorCallback({error: "Looker #{@options.baseUrl} not reachable.\n#{@tokenError || ""}"})
      return

    msg = replyContext?.sourceMessage
    metadata = ""
    if msg?.user
      metadata += " user=#{@_sha(msg.user)}"
    if msg?.team
      metadata += " team=#{@_sha(msg.team)}"
    if msg?.channel
      metadata += " channel=#{@_sha(msg.channel)}"
      metadata += " channel_type=#{msg.channel[0]}"
    if replyContext
      metadata += " slash=#{replyContext.isSlashCommand()}"

    requestConfig.url = "#{@options.baseUrl}/#{requestConfig.path}"
    headers =
      Authorization: "token #{@token}"
      "User-Agent": "looker-slackbot/#{npmPackage.version}#{metadata}"
    requestConfig.headers = _.extend(headers, requestConfig.headers || {})
    request(requestConfig, (error, response, body) =>
      if error
        errorCallback?(error)
      else if response.statusCode == 200
        if response.headers['content-type'].indexOf("application/json") != -1
          successCallback?(JSON.parse(body))
        else
          successCallback?(body)
      else
        try
          if Buffer.isBuffer(body) && body.length == 0
            errorCallback?({error: "Received empty response from Looker."})
          else
            errorCallback?(JSON.parse(body))
        catch
          console.error("JSON parse failed:")
          console.error(body)
          errorCallback({error: "Couldn't parse Looker response. The server may be offline."})
    )

  get: (path, successCallback, errorCallback, options, replyContext) ->
    @request(_.extend({method: "GET", path: path}, options || {}), successCallback, errorCallback, replyContext)

  post: (path, body, successCallback, errorCallback, replyContext) ->
    @request(
      {
        method: "POST"
        path: path
        body: JSON.stringify(body)
        headers:
          "content-type": "application/json"
      },
      successCallback,
      errorCallback,
      replyContext
    )

  fetchAccessToken: ->

    options =
      method: "POST"
      url: "#{@options.baseUrl}/login"
      form:
        client_id: @options.clientId
        client_secret: @options.clientSecret

    request(options, (error, response, body) =>
      @tokenError = null
      if error
        console.warn("Couldn't fetchAccessToken for Looker #{@options.baseUrl}: #{error}")
        @tokenError = error
        @token = null
      else if response.statusCode == 200
        json = JSON.parse(body)
        @token = json.access_token
        console.log("Updated API token for #{@options.baseUrl}")
      else
        @token = null
        console.warn("Failed fetchAccessToken for Looker #{@options.baseUrl}: #{body}")
      @options.afterConnect?()
    )

  _sha: (text) ->
    shasum = crypto.createHash("sha1")
    shasum.update(text)
    shasum.digest("hex")
