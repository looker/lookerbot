class Listener

  constructor: (@server, @bot, @lookers) ->

  validateToken: (req, res) ->
    if @lookers.map((l) -> l.webhookToken).indexOf(req.headers['x-looker-webhook-token']) == -1
      @reply(res, {looker: {success: false}, reason: "Invalid webhook token."})
      return false
    return true

  validateTokenForLooker: (req, looker) ->
    value = req.headers['x-looker-webhook-token'] == looker.webhookToken
    unless value
      @reply(res, {looker: {success: false}, reason: "Invalid webhook token."})
    return value

  reply: (res, json) ->
    res.setHeader 'Content-Type', 'application/json'
    res.send JSON.stringify(json)
    console.log("Replied to #{@type()}.", json)

  type: ->
    "url listener"

module.exports = Listener
