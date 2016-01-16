request = require("request")

module.exports = class LookerAPIClient

  constructor: (@options) ->
    @fetchAccessToken()

  request: (requestConfig, successCallback, errorCallback) ->
    throw new Error("Access token not ready") unless @token

    requestConfig.url = "#{@options.baseUrl}/#{requestConfig.path}"
    requestConfig.headers =
      Authorization: "token #{@token}"
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
    @request({method: "POST", path: path, body: JSON.stringify(body)}, successCallback, errorCallback)

  fetchAccessToken: ->

    options =
      method: "POST"
      url: "#{@options.baseUrl}/login"
      form:
        client_id: @options.clientId
        client_secret: @options.clientSecret

    request(options, (error, response, body) =>
      if error
        throw new Error(error)
      else if response.statusCode == 200
        json = JSON.parse(body)
        @token = json.access_token
        console.log("Updated API token for #{@options.baseUrl}")
      else
        throw new Error("Failed to login to the Looker: #{body}")
    )
