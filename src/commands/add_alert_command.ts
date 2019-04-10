import config from "../config"
import { Looker } from "../looker"
import { LookFinder } from "../repliers/look_finder"
import { ReplyContext } from "../reply_context"
import { Command } from "./command"
import { an, getOptions, set } from "./set_alert_command"

export class AddAlertCommand extends Command {

  public attempt(context: ReplyContext) {

    const msg = context.sourceMessage.text.toLowerCase()

    const regexp = new RegExp(
      `(${getOptions(set)}) (${getOptions(an)})*(alert|notification) for (.*) when (.*) (is equal to|is greater than|is less than) (.*)`)

    const match = msg.match(regexp)
    const query = match && match[4]
    const alert = {
      baseField: match && match[5],
      conditional: match && match[6],
      compareField: match && match[7],
    }

    if (query) {
      context.looker =  Looker.all[0]
      new LookFinder(context, "", query, "add", alert).start()

      return true
    } else {
      return false
    }
  }

}
