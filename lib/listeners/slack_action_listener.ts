import Listener from "./listener";
import SlackUtils from '../slack_utils';

export default class SlackActionListener extends Listener {

  type() {
    return "slack action listener";
  }

  listen() {

    if (!SlackUtils.slackButtonsEnabled) { return; }

    return this.server.post("/slack/action", (req, res) => {

      let e, error, payload, reply;
      try {
        payload = JSON.parse(req.body.payload);
      } catch (error1) {
        e = error1;
        res.status(400);
        this.reply(res, {error: "Malformed action payload"});
        return;
      }

      // Make this look like a botkit message
      let message: any = {};
      for (let key in payload) {
        message[key] = payload[key];
      }
      message.user = message.user_id;
      message.channel = message.channel_id;
      message.type = "action";

      console.log(`Received slack action: ${JSON.stringify(message)}`);

      if (SlackUtils.checkToken(this.bot, message)) {

        for (let action of message.actions) {

          var text;
          try {
            payload = JSON.parse(action.value);
          } catch (error2) {
            e = error2;
            res.status(400);
            this.reply(res, {error: "Malformed action value"});
            return;
          }

          let looker = this.lookers.filter(l => l.url === payload.lookerUrl)[0];
          if (!looker) {
            res.status(400);
            this.reply(res, {error: "Unknown looker"});
            return;
          }

          let success = actionResult => {
            if (actionResult.success) {
              text = `:white_check_mark: ${actionResult.message || "Done"}!`;
            } else if (actionResult.validation_errors) {
              text = actionResult.validation_errors.errors.map(e => `:x: ${e.message}`).join("\n");
            } else {
              text = `:x: ${actionResult.message || "Something went wrong performing the action."}.`;
            }

            reply = {
              response_type: "ephemeral",
              replace_original: false,
              text
            };
            return this.bot.replyPrivateDelayed(message, reply);
          };

          error = error => {
            reply = {
              response_type: "ephemeral",
              replace_original: false,
              text: `:warning: Couldn't perform action due to an error: \`${JSON.stringify(error)}\``
            };
            return this.bot.replyPrivateDelayed(message, reply);
          };

          looker.client.post(
            "data_actions",
            {action: payload.action},
            success,
            error
          );

          // Return OK immediately
          res.send("");
        }

      } else {
        res.status(401);
        return this.reply(res, {error: "Slack token incorrect."});
      }

    });
  }
}
