request = require("request")

module.exports = class LookerAPIClient

  constructor: (@options) ->
    @_fetchAccessToken((token) =>
      @token = token
    )

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
        errorCallback?(JSON.parse(body))
    )

  _fetchAccessToken: (callback) ->

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
        callback(json.access_token)
      else
        throw new Error("Failed to login to the Looker: #{body}")
    )
