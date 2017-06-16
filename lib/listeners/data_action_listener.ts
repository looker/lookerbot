import * as path from "path"
import * as _ from "underscore"
import config from "../config"
import { LookQueryRunner } from "../repliers/look_query_runner"
import { ReplyContext } from "../reply_context"
import { Listener } from "./listener"

const datauri = require("datauri")
const slackIcon = new datauri(path.resolve(__dirname, "..", "..", "images", "slack.svg")).content

export class DataActionListener extends Listener {

  public type() {
    return "data action listener"
  }

  public listen() {

    this.server.post("/", (req, res) => {

      if (!this.validateToken(req, res)) { return }

      const label = config.unsafeLocalDev ? "[DEVELOPMENT] Lookerbot" : "Lookerbot"
      const baseUrl = `https://${req.get("host")}`

      const out = {
        integrations: [{
          description: "Send data to Slack. The data will be posted as the Lookerbot user.",
          form_url: `${baseUrl}/data_actions/form`,
          icon_data_uri: slackIcon,
          label: "Slack",
          name: "post",
          supported_action_types: ["query"],
          url: `${baseUrl}/slack/post_from_query_action`,
        }],
        label,
      }

      return res.json(out)

    })

    this.server.post("/data_actions/form", (req, res) => {

      if (!this.validateToken(req, res)) { return }

      return this.bot.api.channels.list({
        exclude_archived: 1,
        exclude_members: 1,
      }, (err: any, response: any) => {
        if (err) {
          console.error(err)
        }
        if (response != null ? response.ok : undefined) {

          let channels = response.channels.filter((c: any) => c.is_member && !c.is_archived)
          channels = _.sortBy(channels, "name")

          response = [{
            description: "The Lookerbot user must be a member of the channel.",
            label: "Channel",
            name: "channel",
            options: channels.map((channel: any) => ({name: channel.id, label: `#${channel.name}`})),
            required: true,
            type: "select",
          }]

          this.reply(res, response)
          return

        } else {
          throw new Error("Could not connect to the Slack API.")
        }
    })

    })

    return this.server.post("/data_actions", (req, res) => {

      const getParam = (name: string) => (req.body.form_params != null ? req.body.form_params[name] : undefined) || (req.body.data != null ? req.body.data[name] : undefined)

      if (!this.validateToken(req, res)) { return }

      const msg = getParam("message")
      const channel = getParam("channel")

      if (typeof(channel) !== "string") {
        this.reply(res, {looker: {success: false, message: "Channel must be a string."}})
        return
      }

      const context = ReplyContext.forChannel(this.bot, channel)
      context.dataAction = true

      if (typeof(msg) === "string") {
        context.replyPublic(msg)
        return this.reply(res, {looker: {success: true, message: `Sent message to ${channel}!`}})
      } else {
        this.reply(res, {looker: {success: false, message: "Message must be a string."}})
        return
      }

    })
  }
}
