import config from "../config";
import Looker from "../looker";
import CLIQueryRunner from "../repliers/cli_query_runner";
import Command from "./command";

let QUERY_REGEX = new RegExp("(query|q|column|bar|line|pie|scatter|map)( )?(\\w+)? (.+)");

export default class CLICommand extends Command {

  attempt(context) {
    let match;
    if (config.enableQueryCli && (match = context.sourceMessage.text.match(QUERY_REGEX))) {

      let [txt, type, ignore, lookerName, query] = match;

      if (lookerName) {
        context.looker = Looker.all.filter((l) => {
          l.url.indexOf(lookerName) !== -1;
        })[0] || Looker.all[0];
      }
      else {
        context.looker = Looker.all[0];
      }

      if ((type === "q") || (type === "query")) { type = "data"; }

      let runner = new CLIQueryRunner(context, query, type);
      runner.start();

      return true;
    } else {
      return false;
    }
  }

}
