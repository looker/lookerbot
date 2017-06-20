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
      throw "Dashboard has no elements."
    }

    if (elements.length > 1) {
      throw "Dashboards with more than one element aren't currently supported for Slack commands."
    }

    for (const element of elements) {
      if (!element.look) {
        throw "Dashboard Element has no Look."
      }

      const look = element.look
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

      const query : IQuery = await this.replyContext.looker.client.postAsync(
        "queries",
        this.replyContext,
        queryDef
      )
      this.runQuery(query);
    }
  }
}
