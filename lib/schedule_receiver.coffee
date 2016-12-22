ReplyContext = require('./reply_context')
LookQueryRunner = require('./repliers/look_query_runner')

module.exports =

  listen: (server, bot, lookers) ->
    server.post("/slack/post_to_channel/:channel_name", (req, res) =>

      reply = (json) ->
        res.setHeader 'Content-Type', 'application/json'
        res.send JSON.stringify(json)
        console.log("Replied to scheduled plan webhook.", json)

      if req.body.scheduled_plan
        if req.body.scheduled_plan.type == "Look"
          if matches = req.body.scheduled_plan.url.match(/\/looks\/([0-9]+)$/)
            lookId = matches[1]
            @getChannel(bot, req.params.channel_name, (channel) =>
              for looker in lookers
                console.log looker.url
                if req.body.scheduled_plan.url.lastIndexOf(looker.url, 0) == 0
                  context = new ReplyContext(bot, bot, {
                    channel: channel.id
                  })
                  context.looker = looker
                  context.scheduled = true
                  runner = new LookQueryRunner(context, lookId)
                  runner.start()
                  reply {success: true, reason: "Sending Look #{lookId} to channel #{channel.id}."}
            )
          else
            reply {success: false, reason: "Unknown scheduled plan URL."}
        else
          reply {success: false, reason: "Scheduled plan type #{req.body.scheduled_plan.type} not supported."}
      else
        reply {success: false, reason: "No scheduled plan in payload."}
    )

  getChannel: (bot, channelName, callback) ->
    bot.api.channels.list {}, (err, response) ->
      if err
        console.error(err)
      if response?.ok
        channel = response.channels.filter((c) -> c.name == channelName)[0]
        callback(channel)
      else
        throw new Error("Could not connect to the Slack API.")

  runLook: (bot, channelId, lookId) ->
    context = new ReplyContext(bot, bot, {
      channel: channelId
    })
    runner = new LookQueryRunner(context, lookId)
    runner.start()
