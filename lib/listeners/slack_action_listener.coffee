ReplyContext = require('../reply_context')
LookQueryRunner = require('../repliers/look_query_runner')
_ = require('underscore')
Listener = require("./listener")
SlackUtils = require('../slack_utils')

class SlackActionListener extends Listener

  type: ->
    "slack action listener"

  listen: ->

    @server.post("/slack/action", (req, res) =>

      console.log("Received slack action: #{JSON.stringify(req.body)}")

      # Make this look like a botkit message
      message = {}
      for key in req.body
        message[key] = req.body[key]
      message.user = message.user_id
      message.channel = message.channel_id
      message.type = "action"

      if SlackUtils.checkToken(@bot, message)

        for action in message.actions

          try
            payload = JSON.parse(action.value)
          catch
            res.status 400
            @reply res, {error: "Malformed action value"}
            return

          looker = @lookers.filter((l) -> l.url == payload.lookerUrl)
          unless looker
            res.status 400
            @reply res, {error: "Unknown looker"}
            return

          success = (actionResult) =>
            reply =
              response_type: "ephemeral"
              replace_original: false
              text: "Action succeeded! `#{actionResult}`"
            @bot.replyPrivateDelayed(message, reply)

          error = (error) =>
            reply =
              response_type: "ephemeral"
              replace_original: false
              text: "Data action couldn't be sent. `#{error}`"
            @bot.replyPrivateDelayed(message, reply)

          looker.client.post(
            "data_actions"
            {action: payload.action}
            success
            error
          )

          @reply res, {message: "Sending data action..."}

      else
        res.status 401
        @reply res, {error: "Slack token incorrect."}

    )

module.exports = SlackActionListener
