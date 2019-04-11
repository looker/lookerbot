import { GenericReplier } from "../repliers/generic_replier"
import { ReplyContext } from "../reply_context"
import { AlertsState } from "../saved_alerts"
import { Command } from "./command"
import { an, getOptions, set } from "./set_alert_command"

export class DeleteAlertCommand extends Command {

  public attempt(context: ReplyContext) {

    const msg = context.sourceMessage.text.toLowerCase()

    const remove = [
      "delete",
      "remove",
      "get rid of",
      "banish",
      "exile",
      "kill",
      "smite",
      "destroy",
      "purge",
    ]

    const regexp = new RegExp(`(${getOptions(remove)}) (${getOptions(an)})*(alert|notification) ([0-9]+)`)

    const match = msg.match(regexp)

    if (match) {
      AlertsState.deleteAlert(Number(match[4]))
      new GenericReplier(context, "Deleted!").start()

      return true
    } else {
      return false
    }
  }

}
