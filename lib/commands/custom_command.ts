import * as _ from "underscore";
import config from "../config";
import Looker from "../looker";
import DashboardQueryRunner from "../repliers/dashboard_query_runner";
import Command from "./command";

export default class CustomCommand extends Command {

  attempt(context) {
    let normalizedText = context.sourceMessage.text.toLowerCase();
    let shortCommands = _.sortBy(_.values(Looker.customCommands), (c) => -c.name.length);
    let matchedCommand = __guard__(shortCommands.filter((c) => normalizedText.indexOf(c.name) === 0), (x) => x[0]);
    if (matchedCommand) {

      let { dashboard } = matchedCommand;
      let query = context.sourceMessage.text.slice(matchedCommand.name.length).trim();
      normalizedText.indexOf(matchedCommand.name);

      context.looker = matchedCommand.looker;

      let filters = {};
      let dashboard_filters = dashboard.dashboard_filters || dashboard.filters;
      for (let filter of dashboard_filters) {
        filters[filter.name] = query;
      }
      let runner = new DashboardQueryRunner(context, matchedCommand.dashboard, filters);
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
