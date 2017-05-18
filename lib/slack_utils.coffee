module.exports = class SlackUtils

  @stripMessageText: (text) ->
    text.split("&gt;").join(">").split("&lt;").join("<")

  @checkToken: (bot, message) ->
    if process.env.SLACK_SLASH_COMMAND_TOKEN && message.token && process.env.SLACK_SLASH_COMMAND_TOKEN == message.token
      return true
    else
      bot?.replyPrivate(message, "This bot cannot accept slash commands until `SLACK_SLASH_COMMAND_TOKEN` is configured.")
      return false

  @slackButtonsEnabled: process.env.LOOKERBOT_DATA_ACTIONS_IN_MESSAGES != "false"
