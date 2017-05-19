// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
import SlackUtils from "../slack_utils";
import Listener from "./listener";

class SlackEventListener extends Listener {

  type() {
    return "slack event listener";
  }

  listen() {

    return this.server.post("/slack/event", (req, res) => {

      let payload = req.body;

      if (SlackUtils.checkToken(null, payload)) {
        if (payload.challenge) {
          res.send(payload.challenge);
          return console.log(`Replied to challenge ${payload.challenge}`);
        } else {
          console.log(`Unknown event type ${JSON.stringify(payload)}`);
          return this.fail(res);
        }
      } else {
        console.log(`Payload had invalid format ${JSON.stringify(payload)}`);
        return this.fail(res);
      }

    });
  }

  fail(res) {
    res.status(400);
    return res.send("");
  }
}

export default SlackEventListener;
