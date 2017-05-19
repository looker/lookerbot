Listener = require("./listener")
SlackUtils = require('../slack_utils')

class SlackEventListener extends Listener

  type: ->
    "slack event listener"

  listen: ->

    @server.post("/slack/event", (req, res) =>

      payload = req.body

      if SlackUtils.checkToken(null, payload)
        if payload.challenge
          res.send payload.challenge
          console.log "Replied to challenge #{payload.challenge}"
        else
          console.log "Unknown event type #{JSON.stringify(payload)}"
          @fail res
      else
        console.log "Payload had invalid format #{JSON.stringify(payload)}"
        @fail res

    )

  fail: (res) ->
    res.status 400
    res.send ""

module.exports = SlackEventListener
