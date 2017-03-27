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
      console.log(req.body)

      # message = {}

      # for key in req.body
      #   message[key] = req.body[key]
      # message.user = message.user_id
      # message.channel = message.channel_id
      # message.type = 'action';


      # actionBot = slack_botkit.spawn(team);

      # bot.team_info = team;
      # bot.res = res;

      # slack_botkit.receiveMessage(bot, message);

      # slack_botkit.findTeamById(message.team_id, function(err, team) {
      #     // FIX THIS
      #     // this won't work for single team bots because the team info
      #     // might not be in a db
      #     if (err || !team) {
      #         slack_botkit.log.error('Received slash command, but could not load team');
      #     } else {

      #     }
      # });

      # return unless SlackUtils.checkToken(@bot, message)

    )

module.exports = SlackActionListener
