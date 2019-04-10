import { ILook } from "../looker_api_types"
import { ReplyContext } from "../reply_context"
import { QueryRunner } from "./query_runner"
import { AlertsState } from "../saved_alerts";

const fuzzySearch = require("fuzzysearch-js")
const levenshteinFS = require("fuzzysearch-js/js/modules/LevenshteinFS")

export class LookFinder extends QueryRunner {

  constructor(replyContext: ReplyContext, private type: string, private query: string, private setAlert: string = "", private alert?: any) {
    super(replyContext)
    this.type = type
    this.query = query
    this.setAlert = setAlert
    this.alert = alert
  }

  protected async work() {
    const results = await this.matchLooks()
    if (this.setAlert === "add") {
      let selected: any
      results.forEach((item: any) => {
        if (this.query.toLowerCase() === item.value.title.toLowerCase()) {
          selected = item.value
        }
      })
      const text = `Okay! When ${this.alert.baseField} ${this.alert.conditional} ${this.alert.compareField}, I will notify you!`
      AlertsState.addAlert({
        lookTitle: selected.title,
        lookId: selected.id,
        lookLink: `${this.replyContext.looker.url}${selected.short_url}`,
        setBy: {
          id: 1,
          name: "Thomas",
        },
        setAt: new Date(),
        alert: {
          baseField: this.alert.baseField,
          conditional: this.alert.conditional,
          compareField: this.alert.compareField,
        },
      })
      console.log(AlertsState.savedAlerts)
      this.reply({
        text,
      })
    } else if (results) {
      const text = this.setAlert === "set"
        ? "Sure thing. Choose a Look from below to set an alert for!"
        : "Matching Looks:"
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
       text,
      })
    } else {
      this.reply(`No Looks match \"${this.query}\".`)
    }
  }

  private async matchLooks() {
    const looks = await this.replyContext.looker.client.getAsync(
      "looks?fields=id,title,short_url,space(name,id)",
      this.replyContext,
    )

    const searcher = new fuzzySearch(looks, {termPath: "title"})
    searcher.addModule(levenshteinFS({maxDistanceTolerance: 3, factor: 3}))
    const results = searcher.search(this.query)

    return results
  }

}
