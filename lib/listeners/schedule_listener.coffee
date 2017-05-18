ReplyContext = require('../reply_context')
LookQueryRunner = require('../repliers/look_query_runner')
Listener = require("./listener")

class ScheduleListener extends Listener

  type: ->
    "schedule listener"

  listen: ->
    @server.post("/slack/post/:post_type/:channel_name", @handleRequest)
    @server.post("/slack/post_from_query_action", @handleRequest)

  handleRequest: (req, res) =>

    channelName = req.params.channel_name || req.form_params?.channel
    channelType = req.params.post_type

    unless channelName
      @reply {success: false, reason: "Channel not specified."}
      return

    if req.body.scheduled_plan
      if req.body.scheduled_plan.type == "Look"

        qid = req.body.scheduled_plan.query_id
        lookId = req.body.scheduled_plan.url.match(/\/looks\/([0-9]+)/)?[1]

        if qid || lookId

          if channelType == "dm"
            channelName = "@#{channelName}"
          else if channelType == "channel"
            channelName = "##{channelName}"

          for looker in @lookers
            if req.body.scheduled_plan.url.lastIndexOf(looker.url, 0) == 0
              if @validateTokenForLooker(req, looker)
                context = new ReplyContext(bot, bot, {
                  channel: channelName
                })
                context.looker = looker
                context.scheduled = true

                if lookId
                  runner = new LookQueryRunner(context, lookId, {queryId: qid, url: req.body.scheduled_plan.url})
                  runner.start()
                  @reply {success: true, reason: "Sending Look #{lookId} with query #{qid} to channel #{channelName}."}
                else
                  runner = new QueryRunner(context, {id: qid})
                  runner.start()
                  @reply {success: true, reason: "Sending Query #{qid} to channel #{channelName}."}

              else
                @reply {success: false, reason: "Invalid webhook token."}

        else
          @reply {success: false, reason: "Scheduled plan does not have a query_id or a parsable Look URL."}
      else
        @reply {success: false, reason: "Scheduled plan type #{req.body.scheduled_plan.type} not supported."}
    else
      @reply {success: false, reason: "No scheduled plan in payload."}

module.exports = ScheduleListener
