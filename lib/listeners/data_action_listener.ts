import * as path from "path"
import * as _ from "underscore"
import config from "../config"
import { LookQueryRunner } from "../repliers/look_query_runner"
import { ReplyContext } from "../reply_context"
import { Listener } from "./listener"

const datauri = require("datauri")
const slackIcon = new datauri(path.resolve(__dirname, "..", "..", "images", "slack.svg")).content

export class DataActionListener extends Listener {

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
          supported_formats: ["txt"],
          supported_visualization_formattings: ["noapply"],
          supported_formattings: ["unformatted"],
          url: `${baseUrl}/slack/post_from_query_action`,
        }],
        label,
      }

      return res.json(out)

    })

    this.server.post("/data_actions/form", async (req, res) => {

      if (!this.validateToken(req, res)) { return }

      const channels = await this.service.usableChannels()
      const response = [{
        description: "The Lookerbot user must be a member of the channel.",
        label: "Channel",
        name: "channel",
        options: channels.map((channel) => ({name: channel.id, label: channel.label})),
        required: true,
        type: "select",
      }]

      this.reply(res, response)

    })

    this.server.post("/data_actions", (req, res) => {

      const getParam = (name: string): string | undefined => {
        const val = (req.body.form_params != null ? req.body.form_params[name] : undefined) || (req.body.data != null ? req.body.data[name] : undefined)
        if (typeof(val) !== "string") {
          this.reply(res, {looker: {success: false, message: `${name} must be a string.`}})
          return undefined
        }
        return val
      }

      if (!this.validateToken(req, res)) { return }

      const msg = getParam("message")
      const channel = getParam("channel")

      if (!msg || !channel) {
        return
      }

      const context = this.service.replyContextForChannelId(channel)
      context.dataAction = true
      context.replyPublic(msg)

      this.reply(res, {looker: {success: true, message: `Sent message to ${channel}!`}})

    })
  }
}
