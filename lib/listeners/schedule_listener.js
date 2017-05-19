// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
import ReplyContext from '../reply_context';
import LookQueryRunner from '../repliers/look_query_runner';
import Listener from "./listener";

class ScheduleListener extends Listener {

  type() {
    return "schedule listener";
  }

  listen() {
    this.server.post("/slack/post/:post_type/:channel_name", this.handleRequest);
    return this.server.post("/slack/post_from_query_action", this.handleRequest);
  }

  handleRequest(req, res) {

    let channelName = req.params.channel_name || (req.form_params != null ? req.form_params.channel : undefined);
    let channelType = req.params.post_type;

    if (!channelName) {
      this.reply({success: false, reason: "Channel not specified."});
      return;
    }

    if (req.body.scheduled_plan) {
      if (req.body.scheduled_plan.type === "Look") {

        let qid = req.body.scheduled_plan.query_id;
        let lookId = __guard__(req.body.scheduled_plan.url.match(/\/looks\/([0-9]+)/), x => x[1]);

        if (qid || lookId) {

          if (channelType === "dm") {
            channelName = `@${channelName}`;
          } else if (channelType === "channel") {
            channelName = `#${channelName}`;
          }

          return (() => {
            let result = [];
            for (let looker of Array.from(this.lookers)) {
              let item;
              if (req.body.scheduled_plan.url.lastIndexOf(looker.url, 0) === 0) {
                if (this.validateTokenForLooker(req, looker)) {
                  var runner;
                  let context = new ReplyContext(bot, bot, {
                    channel: channelName
                  });
                  context.looker = looker;
                  context.scheduled = true;

                  if (lookId) {
                    runner = new LookQueryRunner(context, lookId, {queryId: qid, url: req.body.scheduled_plan.url});
                    runner.start();
                    item = this.reply({success: true, reason: `Sending Look ${lookId} with query ${qid} to channel ${channelName}.`});
                  } else {
                    runner = new QueryRunner(context, {id: qid});
                    runner.start();
                    item = this.reply({success: true, reason: `Sending Query ${qid} to channel ${channelName}.`});
                  }

                } else {
                  item = this.reply({success: false, reason: "Invalid webhook token."});
                }
              }
              result.push(item);
            }
            return result;
          })();

        } else {
          return this.reply({success: false, reason: "Scheduled plan does not have a query_id or a parsable Look URL."});
        }
      } else {
        return this.reply({success: false, reason: `Scheduled plan type ${req.body.scheduled_plan.type} not supported.`});
      }
    } else {
      return this.reply({success: false, reason: "No scheduled plan in payload."});
    }
  }
}

export default ScheduleListener;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}