ReplyContext = require('../reply_context')
LookQueryRunner = require('../repliers/look_query_runner')
_ = require('underscore')
Listener = require("./listener")

class DataActionListener extends Listener

  type: ->
    "data action listener"

  listen: ->

    @server.post("/", (req, res) =>

      return unless @validateToken(req, res)

      label = if process.env.DEV == "true"
        sass = "[DEVELOPMENT] Lookerbot"
      else
        "Lookerbot"

      baseUrl = req.protocol + '://' + req.get('host')

      out = {
        label: label
        destinations: [{
          name: "lookerbot"
          label: "Slack"
          description: "Send data to Slack as the bot user configured for Lookerbot."
          url: "#{baseUrl}/slack/post_from_query_action"
          form_url: "#{baseUrl}/data_actions/form"
          supported_action_types: ["query"]
        }]
      }

      res.json out

    )

    @server.post("/data_actions/form", (req, res) =>

      return unless @validateToken(req, res)

      @bot.api.channels.list {exclude_archived: 1}, (err, response) =>
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

          @reply(res, response)
          return

        else
          throw new Error("Could not connect to the Slack API.")

    )

    @server.post("/data_actions", (req, res) =>

      getParam = (name) ->
        req.body.form_params?[name] || req.body.data?[name]

      return unless @validateToken(req, res)

      msg = getParam("message")
      channel = getParam("channel")

      unless typeof(channel) == "string"
        @reply res, {looker: {success: false, message: "Channel must be a string."}}
        return

      context = new ReplyContext(bot, bot, {
        channel: channel
      })
      context.dataAction = true

      if typeof(msg) == "string"
        context.replyPublic(msg)
        @reply res, {looker: {success: true}}
      else
        @reply res, {looker: {success: false, message: "Message must be a string."}}
        return

    )

module.exports = DataActionListener
