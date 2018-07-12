import { IDashboard, IQuery } from "../looker_api_types"
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
      throw new Error("Dashboard has no elements.")
    }

    if (elements.length > 1) {
      throw new Error("Dashboards with more than one element aren't currently supported for Slack commands.")
    }

    const copy = (obj: any) => JSON.parse(JSON.stringify(obj))

    for (const element of elements) {
      let queryDef: IQuery

      if (element.query || (element.look && element.look.query)) {
        queryDef = copy(element.query || element.look!.query)
        queryDef.filter_config = null
        queryDef.client_id = null

        if (element.listen) {
          for (const dashFilterName of Object.keys(element.listen)) {
            const fieldName = element.listen[dashFilterName]
            if (this.filters[dashFilterName]) {
              if (!queryDef.filters) { queryDef.filters = {} }
              queryDef.filters[fieldName] = this.filters[dashFilterName]
            }
          }
        } else if (element.result_maker &&
                   element.result_maker.filterables &&
                   element.result_maker.filterables.length &&
                   element.result_maker.filterables[0].listen) {
          element.result_maker!.filterables![0].listen.forEach((listen) => {
            if (this.filters[listen.dashboard_filter_name]) {
              if (!queryDef.filters) { queryDef.filters = {} }
              queryDef.filters[listen.field] = this.filters[listen.dashboard_filter_name]
            }
          })
        }
      } else {
        throw new Error("Dashboard Element has no Look, Query.")
      }

      const query: IQuery = await this.replyContext.looker.client.postAsync(
        "queries",
        queryDef,
        {},
        this.replyContext,
      )
      this.runQuery(query)
    }
  }
}
