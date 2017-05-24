import QueryRunner from "./query_runner";

export default class DashboardQueryRunner extends QueryRunner {

  private dashboard: any;
  private filters: any;

  constructor(replyContext, dashboard, filters) {
    if (filters == null) { filters = {}; }
    super(replyContext);
    this.dashboard = dashboard;
    this.filters = filters;
  }

  protected showShareUrl() { return true; }

  protected work() {

    const elements = this.dashboard.dashboard_elements || this.dashboard.elements;

    if (elements.length > 1) {
      this.reply("Dashboards with more than one element aren't currently supported for Slack commands.");
      return;
    }

    elements.map((element) =>
      this.replyContext.looker.client.get(
        `looks/${element.look_id}`,
        (look) => {
          const queryDef = look.query;

          for (const dashFilterName of Object.keys(element.listen)) {
            const fieldName = element.listen[dashFilterName];
            if (this.filters[dashFilterName]) {
              if (!queryDef.filters) { queryDef.filters = {}; }
              queryDef.filters[fieldName] = this.filters[dashFilterName];
            }
          }

          queryDef.filter_config = null;
          queryDef.client_id = null;

          this.replyContext.looker.client.post(
            "queries",
            queryDef,
            (query) => this.runQuery(query),
            (r) => this.replyError(r),
            this.replyContext,
          );
        },
        (r) => this.replyError(r),
        {},
        this.replyContext,
      ));
  }

}
