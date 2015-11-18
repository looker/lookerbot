Bot = require('slackbots')
getUrls = require('get-urls')

lookers = []

# Provide an environment variable with alternating domains and api keys seperated by semicolons
# export LOOKERS=https://me.looker.com;abcdefxxxx;https://me-staging.looker.com;bc329xxxx
entries = process.env.LOOKERS.split(";")
for entry, i in entries by 2
  lookers.push({url: entry, api_key: entries[i + 1]})

bot = new Bot(
  token: process.env.SLACK_API_KEY
  name: 'Looker'
)

bot.on 'message', (data) ->
  checkMessage(data)

checkMessage = (message) ->
  return if !message.text || message.subtype == "bot_message"

  for url in getUrls(message.text)

    for looker in lookers

      # Starts with Looker base URL?
      if url.lastIndexOf(looker.url, 0) == 0
        annotateLookerURL(url, message, looker)

annotateLookerURL = (url, message, looker) ->
  bot.postMessage message.channel, "What a great hostname #{looker.url}! USA #1!"
