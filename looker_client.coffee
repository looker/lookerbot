request = require("request")
_ = require("underscore")

module.exports = class LookerAPIClient

  constructor: (@options) ->
    @fetchAccessToken()

  reachable: ->
    @token?

  request: (requestConfig, successCallback, errorCallback) ->
    unless @reachable()
      errorCallback({error: "Looker #{@options.baseUrl} not reachable"})
      return

    requestConfig.url = "#{@options.baseUrl}/#{requestConfig.path}"
    headers =
      Authorization: "token #{@token}"
    requestConfig.headers = _.extend(headers, requestConfig.headers || {})
    request(requestConfig, (error, response, body) =>
      if error
        errorCallback?(error)
      else if response.statusCode == 200
        successCallback?(JSON.parse(body))
      else
        try
          errorCallback?(JSON.parse(body))
        catch
          errorCallback({error: body})
    )

  get: (path, successCallback, errorCallback) ->
    @request({method: "GET", path: path}, successCallback, errorCallback)

  post: (path, body, successCallback, errorCallback) ->
    @request(
      {
        method: "POST"
        path: path
        body: JSON.stringify(body)
        headers:
          "content-type": "application/json"
      },
      successCallback,
      errorCallback
    )

  fetchAccessToken: ->

    options =
      method: "POST"
      url: "#{@options.baseUrl}/login"
      form:
        client_id: @options.clientId
        client_secret: @options.clientSecret

    request(options, (error, response, body) =>
      if error
        console.warn("Couldn't fetchAccessToken for Looker #{@options.baseUrl}: #{error}")
        @token = null
      else if response.statusCode == 200
        json = JSON.parse(body)
        @token = json.access_token
        console.log("Updated API token for #{@options.baseUrl}")
      else
        @token = null
        console.warn("Failed fetchAccessToken for Looker #{@options.baseUrl}: #{body}")
    )
