// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
let CLICommand;
import CLIQueryRunner from '../repliers/cli_query_runner';
import Command from "./command";
import config from "../config";
import Looker from "../looker";

let QUERY_REGEX = new RegExp('(query|q|column|bar|line|pie|scatter|map)( )?(\\w+)? (.+)');

export default (CLICommand = class CLICommand extends Command {

  attempt(context) {
    let match;
    if (config.enableQueryCli && (match = context.sourceMessage.text.match(QUERY_REGEX))) {

      let [txt, type, ignore, lookerName, query] = Array.from(match);

      context.looker = lookerName ?
        Looker.all.filter(l => l.url.indexOf(lookerName) !== -1)[0] || Looker.all[0]
      :
        Looker.all[0];

      if ((type === "q") || (type === "query")) { type = "data"; }

      let runner = new CLIQueryRunner(context, query, type);
      runner.start();

      return true;
    } else {
      return false;
    }
  }
});
