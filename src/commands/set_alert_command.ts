import config from "../config"
import { Looker } from "../looker"
import { LookFinder } from "../repliers/look_finder"
import { ReplyContext } from "../reply_context"
import { Command } from "./command"

export const getOptions = (list: string[]) => {
  return list.reduce((acc, value) => {
    return acc + "|" + value
  })
}

export const set = [
  "set",
  "create",
  "make",
  "add",
]

export const an = [
  "an ",
  "the ",
  "a ",
  "some ",
  "one ",
]

export class SetAlertCommand extends Command {

  public attempt(context: ReplyContext) {

    const msg = context.sourceMessage.text.toLowerCase()

    const regexp = new RegExp(`(${getOptions(set)}) (${getOptions(an)})*(alert|notification)`)

    const match = msg.match(regexp)

    if (match) {
      context.looker =  Looker.all[0]
      new LookFinder(context, "", "order top age", "set").start()

      return true
    } else {
      return false
    }
  }

}
