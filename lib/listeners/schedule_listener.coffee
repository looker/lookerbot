ReplyContext = require('../reply_context')
LookQueryRunner = require('../repliers/look_query_runner')
Listener = require("./listener")

class ScheduleListener extends Listener

  type: ->
    "schedule listener"

  listen: ->
    @server.post("/slack/post/:post_type/:channel_name", (req, res) =>

      return unless @validateToken(req, res)

      if req.body.scheduled_plan
        if req.body.scheduled_plan.type == "Look"
          if matches = req.body.scheduled_plan.url.match(/\/looks\/([0-9]+)$/)
            lookId = matches[1]

            channelName = req.params.channel_name
            channelType = req.params.post_type
            if channelType == "dm"
              channelName = "@#{channelName}"
            else if channelType == "channel"
              channelName = "##{channelName}"

            for looker in @lookers
              if req.body.scheduled_plan.url.lastIndexOf(looker.url, 0) == 0
                if @validateTokenForLooker(req, res, looker)
                  context = new ReplyContext(@bot, @bot, {
                    channel: channelName
                  })
                  context.looker = looker
                  context.scheduled = true
                  runner = new LookQueryRunner(context, lookId)
                  runner.start()
                  @reply res, {success: true, reason: "Sending Look #{lookId} to channel #{channelName}."}

          else
            @reply res, {success: false, reason: "Unknown scheduled plan URL."}
        else
          @reply res, {success: false, reason: "Scheduled plan type #{req.body.scheduled_plan.type} not supported."}
      else
        @reply res, {success: false, reason: "No scheduled plan in payload."}
    )

module.exports = ScheduleListener
