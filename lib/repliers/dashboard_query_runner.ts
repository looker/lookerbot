import { IDashboard, ILook, IQuery } from "../looker_api_types"
import { ReplyContext } from "../reply_context"
import { QueryRunner } from "./query_runner"

export class DashboardQueryRunner extends QueryRunner {

  constructor(
    replyContext: ReplyContext,
    private dashboard: IDashboard,
    private filters: {[key: string]: string} = {},
  ) {
    super(replyContext)
    this.dashboard = dashboard
    this.filters = filters
  }

  protected showShareUrl() { return true }

  protected async work() {

    const elements = this.dashboard.dashboard_elements || this.dashboard.elements

    if (!elements || elements.length === 0) {
      this.reply("Dashboard has no elements.")
      return
    }

    if (elements.length > 1) {
      this.reply("Dashboards with more than one element aren't currently supported for Slack commands.")
      return
    }

    elements.map((element) =>
      this.replyContext.looker.client.get(
        `looks/${element.look_id}`,
        (look: ILook) => {
          const queryDef = look.query

          for (const dashFilterName of Object.keys(element.listen)) {
            const fieldName = element.listen[dashFilterName]
            if (this.filters[dashFilterName]) {
              if (!queryDef.filters) { queryDef.filters = {} }
              queryDef.filters[fieldName] = this.filters[dashFilterName]
            }
          }

          queryDef.filter_config = null
          queryDef.client_id = null

          this.replyContext.looker.client.post(
            "queries",
            queryDef,
            (query: IQuery) => this.runQuery(query),
            (r: any) => this.replyError(r),
            this.replyContext,
          )
        },
        (r: any) => this.replyError(r),
        {},
        this.replyContext,
      ))
  }

}
