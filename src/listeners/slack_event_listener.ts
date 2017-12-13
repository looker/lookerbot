import { SlackUtils } from "../slack_utils"
import { Listener } from "./listener"

export class SlackEventListener extends Listener {

  public listen() {

    return this.server.post("/slack/event", (req, res) => {

      const fail = () => {
        res.status(400)
        return res.send("")
      }

      const payload = req.body

      if (SlackUtils.checkToken(null, payload)) {
        if (payload.challenge) {
          res.send(payload.challenge)
          return console.log(`Replied to challenge ${payload.challenge}`)
        } else {
          console.log(`Unknown event type ${JSON.stringify(payload)}`)
          return fail()
        }
      } else {
        console.log(`Payload had invalid format ${JSON.stringify(payload)}`)
        return fail()
      }

    })
  }

}
