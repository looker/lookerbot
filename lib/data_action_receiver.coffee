ReplyContext = require('./reply_context')
LookQueryRunner = require('./repliers/look_query_runner')
_ = require('underscore')

reply = (res, json) ->
  res.setHeader 'Content-Type', 'application/json'
  res.send JSON.stringify(json)
  console.log("Replied to data action webhook.", json)

validateToken = (res, req, lookers) ->
  if lookers.map((l) -> l.webhookToken).indexOf(req.headers['x-looker-webhook-token']) == -1
    reply(res, {looker: {success: false}, reason: "Invalid webhook token."})
    return false
  return true

module.exports =

  listen: (server, bot, lookers) ->

    server.post("/data_actions/form", (req, res) =>

      return unless validateToken(res, req, lookers)

      bot.api.channels.list {exclude_archived: 1}, (err, response) ->
        if err
          console.error(err)
        if response?.ok

          channels = response.channels.filter((c) -> c.is_member && !c.is_archived)
          channels = _.sortBy(channels, "name")

          response = [{
            name: "channel"
            label: "Slack Channel"
            description: "The bot user must be a member of the channel."
            required: true
            type: "select"
            options: channels.map((channel) ->
              {name: channel.id, label: "##{channel.name}"}
            )
          }]

          reply(res, response)
          return

        else
          throw new Error("Could not connect to the Slack API.")

    )

    server.post("/data_actions", (req, res) =>

      getParam = (name) ->
        req.body.form_params?[name] || req.body.data?[name]

      return unless validateToken(res, req, lookers)

      msg = getParam("message")
      channel = getParam("channel")

      unless typeof(channel) == "string"
        reply res, {looker: {success: false, message: "Channel must be a string."}}

      context = new ReplyContext(bot, bot, {
        channel: channel
      })
      context.dataAction = true

      if typeof(msg) == "string"
        context.replyPublic(msg)
        reply res, {looker: {success: true}}
      else
        reply res, {looker: {success: false, message: "Message must be a string."}}

    )

