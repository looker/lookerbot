import { ILook } from "../looker_api_types"
import {LookerAPIClient} from "../looker_client"
import { ReplyContext } from "../reply_context"
import { QueryRunner } from "./query_runner"
import config from "../config"

const fuzzySearch = require("fuzzysearch-js")
const levenshteinFS = require("fuzzysearch-js/js/modules/LevenshteinFS")

export class LookFinder extends QueryRunner {

  constructor(replyContext: ReplyContext, private type: string, private query: string) {
    super(replyContext)
    this.type = type
    this.query = query
  }

  protected async work() {
    let client = this.replyContext.looker.client
    if (this.replyContext.sourceMessage.user === config.slackUserId) {
      client = this.replyContext.looker.client2
    }
    const results = await this.matchLooks(client)
    if (results) {
      const shortResults = results.slice(0, 5)
      this.reply({
        attachments: shortResults.map((v: any) => {
          const look = v.value
          return {
            text: `in ${look.space.name}`,
            title: look.title,
            title_link: `${this.replyContext.looker.url}${look.short_url}`,
          }
        }),
        text: "Matching Looks:",
      })
    } else {
      this.reply(`No Looks match \"${this.query}\".`)
    }
  }

  private async matchLooks(client: LookerAPIClient) {
    const looks = await client.getAsync(
      "looks?fields=id,title,short_url,space(name,id)",
      this.replyContext,
    )

    const searcher = new fuzzySearch(looks, {termPath: "title"})
    searcher.addModule(levenshteinFS({maxDistanceTolerance: 3, factor: 3}))
    const results = searcher.search(this.query)

    return results
  }

}
