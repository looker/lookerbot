import * as _ from "underscore";
import config from "../config";
import Looker from "../looker";
import DashboardQueryRunner from "../repliers/dashboard_query_runner";
import ReplyContext from "../reply_context";
import Command from "./command";

export default class CustomCommand extends Command {

  public attempt(context: ReplyContext) {
    const normalizedText = context.sourceMessage.text.toLowerCase();
    const shortCommands = _.sortBy(_.values(Looker.customCommands), (c) => -c.name.length);
    const matchedCommand = __guard__(shortCommands.filter((c) => normalizedText.indexOf(c.name) === 0), (x) => x[0]);
    if (matchedCommand) {

      const { dashboard } = matchedCommand;
      const query = context.sourceMessage.text.slice(matchedCommand.name.length).trim();
      normalizedText.indexOf(matchedCommand.name);

      context.looker = matchedCommand.looker;

      const filters = {};
      const dashboardFilters = dashboard.dashboard_filters || dashboard.filters;
      for (const filter of dashboardFilters) {
        filters[filter.name] = query;
      }
      const runner = new DashboardQueryRunner(context, matchedCommand.dashboard, filters);
      runner.start();

      return true;
    } else {
      return false;
    }
  }

}

function __guard__(value, transform) {
  return (typeof value !== "undefined" && value !== null) ? transform(value) : undefined;
}
