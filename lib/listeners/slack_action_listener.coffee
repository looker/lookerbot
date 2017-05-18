Listener = require("./listener")
SlackUtils = require('../slack_utils')

class SlackActionListener extends Listener

  type: ->
    "slack action listener"

  listen: ->

    return unless SlackUtils.slackButtonsEnabled

    @server.post("/slack/action", (req, res) =>

      try
        payload = JSON.parse(req.body.payload)
      catch e
        res.status 400
        @reply res, {error: "Malformed action payload"}
        return

      # Make this look like a botkit message
      message = {}
      for key of payload
        message[key] = payload[key]
      message.user = message.user_id
      message.channel = message.channel_id
      message.type = "action"

      console.log("Received slack action: #{JSON.stringify(message)}")

      if SlackUtils.checkToken(@bot, message)

        for action in message.actions

          try
            payload = JSON.parse(action.value)
          catch e
            res.status 400
            @reply res, {error: "Malformed action value"}
            return

          looker = @lookers.filter((l) -> l.url == payload.lookerUrl)[0]
          unless looker
            res.status 400
            @reply res, {error: "Unknown looker"}
            return

          success = (actionResult) =>
            if actionResult.success
              text = ":white_check_mark: #{actionResult.message || "Done"}!"
            else if actionResult.validation_errors
              text = actionResult.validation_errors.errors.map((e) ->
                ":x: #{e.message}"
              ).join("\n")
            else
              text = ":x: #{actionResult.message || "Something went wrong performing the action."}."

            reply =
              response_type: "ephemeral"
              replace_original: false
              text: text
            @bot.replyPrivateDelayed(message, reply)

          error = (error) =>
            reply =
              response_type: "ephemeral"
              replace_original: false
              text: ":warning: Couldn't perform action due to an error: `#{JSON.stringify(error)}`"
            @bot.replyPrivateDelayed(message, reply)

          looker.client.post(
            "data_actions"
            {action: payload.action}
            success
            error
          )

          # Return OK immediately
          res.send ""

      else
        res.status 401
        @reply res, {error: "Slack token incorrect."}

    )

module.exports = SlackActionListener
