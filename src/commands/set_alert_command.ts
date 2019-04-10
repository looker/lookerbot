import config from "../config"
import { Looker } from "../looker"
import { LookFinder } from "../repliers/look_finder"
import { ReplyContext } from "../reply_context"
import { Command } from "./command"

export class SetAlertCommand extends Command {

  public attempt(context: ReplyContext) {

    const msg = context.sourceMessage.text

    const match = msg.match(/(set|create|make) (an |the |a |some |one  )*(alert|notification|)/)

    if (match) {
      context.looker =  Looker.all[0]
      new LookFinder(context, "", "", true).start()

      return true
    } else {
      return false
    }
  }

}
