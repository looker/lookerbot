import SlackUtils from "../slack_utils";
import Listener from "./listener";

export default class SlackEventListener extends Listener {

  public type() {
    return "slack event listener";
  }

  public listen() {

    return this.server.post("/slack/event", (req, res) => {

      const payload = req.body;

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

  private fail(res) {
    res.status(400);
    return res.send("");
  }

}
