// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
let DashboardQueryRunner;
import QueryRunner from './query_runner';

export default (DashboardQueryRunner = class DashboardQueryRunner extends QueryRunner {

  constructor(replyContext, dashboard, filters) {
    if (filters == null) { filters = {}; }
    super(replyContext, null);
    this.dashboard = dashboard;
    this.filters = filters;
  }

  showShareUrl() { return true; }

  work() {

    let elements = this.dashboard.dashboard_elements || this.dashboard.elements;

    if (elements.length > 1) {
      this.reply("Dashboards with more than one element aren't currently supported for Slack commands.");
      return;
    }

    return Array.from(elements).map((element) =>
      this.replyContext.looker.client.get(
        `looks/${element.look_id}`,
        look => {
          let queryDef = look.query;

          for (let dashFilterName in element.listen) {
            let fieldName = element.listen[dashFilterName];
            if (this.filters[dashFilterName]) {
              if (!queryDef.filters) { queryDef.filters = {}; }
              queryDef.filters[fieldName] = this.filters[dashFilterName];
            }
          }

          queryDef.filter_config = null;
          queryDef.client_id = null;

          return this.replyContext.looker.client.post(
            "queries",
            queryDef,
            query => this.runQuery(query),
            r => this.replyError(r),
            this.replyContext
          );
        },
        r => this.replyError(r),
        {},
        this.replyContext
      ));
  }
});

