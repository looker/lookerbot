import ReplyContext from '../reply_context';
import LookQueryRunner from '../repliers/look_query_runner';
import * as _ from 'underscore';
import Listener from "./listener";

export default class DataActionListener extends Listener {

  type() {
    return "data action listener";
  }

  listen() {

    let label;
    this.server.post("/", (req, res) => {

      let sass;
      if (!this.validateToken(req, res)) { return; }

      label = process.env.DEV === "true" ?
        (sass = "[DEVELOPMENT] Lookerbot")
      :
        "Lookerbot";

      let baseUrl = req.protocol + '://' + req.get('host');

      let out = {
        label,
        destinations: [{
          name: "lookerbot",
          label: "Slack",
          description: "Send data to Slack as the bot user configured for Lookerbot.",
          url: `${baseUrl}/slack/post_from_query_action`,
          form_url: `${baseUrl}/data_actions/form`,
          supported_action_types: ["query"]
        }]
      };

      return res.json(out);

    });

    this.server.post("/data_actions/form", (req, res) => {

      if (!this.validateToken(req, res)) { return; }

      return this.bot.api.channels.list({exclude_archived: 1}, (err, response) => {
        if (err) {
          console.error(err);
        }
        if (response != null ? response.ok : undefined) {

          let channels = response.channels.filter(c => c.is_member && !c.is_archived);
          channels = _.sortBy(channels, "name");

          response = [{
            name: "channel",
            label: "Slack Channel",
            description: "The bot user must be a member of the channel.",
            required: true,
            type: "select",
            options: channels.map(channel => ({name: channel.id, label: `#${channel.name}`}))
          }];

          this.reply(res, response);
          return;

        } else {
          throw new Error("Could not connect to the Slack API.");
        }
    });

    });

    return this.server.post("/data_actions", (req, res) => {

      let getParam = name => (req.body.form_params != null ? req.body.form_params[name] : undefined) || (req.body.data != null ? req.body.data[name] : undefined);

      if (!this.validateToken(req, res)) { return; }

      let msg = getParam("message");
      let channel = getParam("channel");

      if (typeof(channel) !== "string") {
        this.reply(res, {looker: {success: false, message: "Channel must be a string."}});
        return;
      }

      let context = new ReplyContext(this.bot, this.bot, {
        channel
      });
      context.dataAction = true;

      if (typeof(msg) === "string") {
        context.replyPublic(msg);
        return this.reply(res, {looker: {success: true, message: `Sent message to ${channel}!`}});
      } else {
        this.reply(res, {looker: {success: false, message: "Message must be a string."}});
        return;
      }

    });
  }
}
