Listener = require("./listener")
SlackUtils = require('../slack_utils')

class SlackEventListener extends Listener

  type: ->
    "slack event listener"

  listen: ->

    @server.post("/slack/event", (req, res) =>

      payload = req.body

      console.log JSON.stringify(payload)

      if SlackUtils.checkToken(null, payload)
        if payload.challenge
          res.send payload.challenge
      else
        @fail res

    )

  fail: (res) ->
    res.status 400
    res.send ""

module.exports = SlackEventListener
