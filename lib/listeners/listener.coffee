class Listener

  constructor: (@server, @bot, @lookers) ->

  validateToken: (req, res) ->
    unless req.headers['x-looker-webhook-token']
      @reply(res, {looker: {success: false}, reason: "No x-looker-webhook-token token provided."})
      return false
    if @lookers.map((l) -> l.webhookToken).indexOf(req.headers['x-looker-webhook-token']) == -1
      @reply(res, {looker: {success: false}, reason: "Invalid x-looker-webhook-token."})
      return false
    return true

  validateTokenForLooker: (req, looker) ->
    unless req.headers['x-looker-webhook-token']
      @reply(res, {looker: {success: false}, reason: "No x-looker-webhook-token token provided."})
      return false
    value = req.headers['x-looker-webhook-token'] == looker.webhookToken
    unless value
      @reply(res, {looker: {success: false}, reason: "Invalid x-looker-webhook-token."})
    return value

  reply: (res, json) ->
    res.json json
    console.log("Replied to #{@type()}.", json)

  type: ->
    "url listener"

module.exports = Listener
