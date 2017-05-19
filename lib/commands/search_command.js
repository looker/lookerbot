let SearchCommand;
import LookFinder from '../repliers/look_finder';
import Command from "./command";
import config from "../config";
import Looker from "../looker";

let FIND_REGEX = new RegExp('find (dashboard|look )? ?(.+)');

export default (SearchCommand = class SearchCommand extends Command {

  attempt(context) {
    let match;
    if (match = context.sourceMessage.text.match(FIND_REGEX)) {

      let [__, type, query] = Array.from(match);

      let firstWord = query.split(" ")[0];
      let foundLooker = Looker.all.filter(l => l.url.indexOf(firstWord) !== -1)[0];
      if (foundLooker) {
        let words = query.split(" ");
        words.shift();
        query = words.join(" ");
      }
      context.looker = foundLooker || Looker.all[0];

      let runner = new LookFinder(context, type, query);
      runner.start();

      return true;
    } else {
      return false;
    }
  }
});
