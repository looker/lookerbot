Botkit = require('botkit')

controller = Botkit.slackbot(
  debug: false
)

defaultBot = controller.spawn({
  token: process.env.SLACK_API_KEY,
}).startRTM()

controller.on "direct_message", (bot, message) ->

  if message.text == "1"
    # RTM
    reply = {"text":"[1] echo #{message.text}","parse":"none"}
    bot.reply(message, reply, (err, res) ->
      console.log(err, res)
    )
  else if message.text == "2"
    reply = {"text":"[2] echo #{message.text}","parse":"none", "attachments":[{text: message.text}]}
    bot.reply(message, reply, (err, res) ->
      console.log(err, res)
    )
  else if message.text == "3"
    reply = {"text":"[2] echo #{message.text}","parse":"none", "attachments":[{text: message.text}]}
    bot.reply(message, reply, (err, res) ->
      console.log(err, res)
    )
