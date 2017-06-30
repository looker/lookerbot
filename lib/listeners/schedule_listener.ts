import * as express from "express"
import { LookQueryRunner } from "../repliers/look_query_runner"
import { QueryRunner } from "../repliers/query_runner"
import { ReplyContext } from "../reply_context"
import { Listener } from "./listener"

export class ScheduleListener extends Listener {

  public listen() {
    this.server.post("/slack/post/:post_type/:channel_name", (req, res) => this.handleRequest(req, res))
    return this.server.post("/slack/post_from_query_action", (req, res) => this.handleRequest(req, res))
  }

  private handleRequest(req: express.Request, res: express.Response) {

    let channelName = req.params.channel_name || (req.body.form_params != null ? req.body.form_params.channel : undefined)
    const channelType = req.params.post_type

    if (!channelName) {
      this.reply(res, {success: false, reason: "Channel not specified."})
      return
    }

    if (req.body.scheduled_plan) {
      if (req.body.scheduled_plan.type === "Look") {

        const qid = req.body.scheduled_plan.query_id
        const lookMatches = req.body.scheduled_plan.url.match(/\/looks\/([0-9]+)/)
        const lookId = lookMatches ? lookMatches[1] : undefined

        if (qid || lookId) {

          if (channelType === "dm") {
            channelName = `@${channelName}`
          } else if (channelType === "channel") {
            channelName = `#${channelName}`
          }

          const planUrl = req.body.scheduled_plan.url
          const looker = this.lookers.filter((l) => planUrl.lastIndexOf(l.url, 0) === 0)[0]

          if (looker && this.validateTokenForLooker(req, res, looker)) {

            const context = this.service.replyContextForChannelId(channelName)
            context.looker = looker
            context.scheduled = true

            if (lookId) {
              const runner = new LookQueryRunner(context, lookId, {queryId: qid, url: req.body.scheduled_plan.url})
              runner.start()
              this.reply(res, {success: true, reason: `Sending Look ${lookId} with query ${qid} to channel ${channelName}.`})
            } else {
              const runner = new QueryRunner(context, {id: qid})
              runner.start()
              this.reply(res, {success: true, reason: `Sending Query ${qid} to channel ${channelName}.`})
            }

          } else {
            this.reply(res, {success: false, reason: "Requested data is from an unknown Looker."})
          }

        } else {
          this.reply(res, {success: false, reason: "Scheduled plan does not have a query_id or a parsable Look URL."})
        }
      } else {
        this.reply(res, {success: false, reason: `Scheduled plan type ${req.body.scheduled_plan.type} not supported.`})
      }
    } else {
      this.reply(res, {success: false, reason: "No scheduled plan in payload."})
    }
  }
}
