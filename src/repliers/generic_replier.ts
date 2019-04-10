import { ReplyContext } from "../reply_context"
import { FancyReplier } from "./fancy_replier"

const fuzzySearch = require("fuzzysearch-js")
const levenshteinFS = require("fuzzysearch-js/js/modules/LevenshteinFS")

export class GenericReplier extends FancyReplier {

  constructor(replyContext: ReplyContext, private message: string) {
    super(replyContext)
    this.message = message
  }

  protected async work() {
    this.reply({
      text: this.message,
    })
  }
}
