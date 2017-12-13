import { ReplyContext } from "../reply_context"

export class Command {

  public attempt(context: ReplyContext): boolean {
    throw new Error("implement")
  }

}
