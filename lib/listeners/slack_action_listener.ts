import SlackUtils from "../slack_utils";
import Listener from "./listener";

export default class SlackActionListener extends Listener {

  public type() {
    return "slack action listener";
  }

  public listen() {

    if (!SlackUtils.slackButtonsEnabled) { return; }

    this.server.post("/slack/action", async (req, res) => {

      let payload;
      try {
        payload = JSON.parse(req.body.payload);
      } catch (e) {
        res.status(400);
        this.reply(res, {error: "Malformed action payload"});
        return;
      }

      // Make this look like a botkit message
      const message: any = {};
      for (const key in payload) {
        message[key] = payload[key];
      }
      message.user = message.user_id;
      message.channel = message.channel_id;
      message.type = "action";

      console.log(`Received slack action: ${JSON.stringify(message)}`);

      if (!SlackUtils.checkToken(this.bot, message)) {
        res.status(401);
        this.reply(res, {error: "Slack token incorrect."});
        return;
      }

      const action = message.actions[0];

      try {
        payload = JSON.parse(action.value);
      } catch (e) {
        res.status(400);
        this.reply(res, {error: "Malformed action value"});
        return;
      }

      const looker = this.lookers.filter((l) => l.url === payload.lookerUrl)[0];
      if (!looker) {
        res.status(400);
        this.reply(res, {error: "Unknown looker"});
        return;
      }

      // Return OK immediately
      res.send("");

      try {

        const actionResult = await looker.client.postAsync(
          "data_actions",
          {action: payload.action},
        );

        let text: string;
        if (actionResult.success) {
          text = `:white_check_mark: ${actionResult.message || "Done"}!`;
        } else if (actionResult.validation_errors) {
          text = actionResult.validation_errors.errors.map((e) => `:x: ${e.message}`).join("\n");
        } else {
          text = `:x: ${actionResult.message || "Something went wrong performing the action."}.`;
        }

        this.bot.replyPrivateDelayed(message, {
          response_type: "ephemeral",
          replace_original: false,
          text,
        });

      } catch (error) {
        this.bot.replyPrivateDelayed(message, {
          response_type: "ephemeral",
          replace_original: false,
          text: `:warning: Couldn't perform action due to an error: \`${JSON.stringify(error)}\``,
        });
      }

    });
  }
}
