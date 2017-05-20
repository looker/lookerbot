import config from "../config";
import Looker from "../looker";
import LookFinder from "../repliers/look_finder";
import Command from "./command";

const FIND_REGEX = new RegExp("find (dashboard|look )? ?(.+)");

export default class SearchCommand extends Command {

  attempt(context) {

    let match;
    if (match = context.sourceMessage.text.match(FIND_REGEX)) {

      let [__, type, query] = match;

      const firstWord = query.split(" ")[0];
      const foundLooker = Looker.all.filter((l) => l.url.indexOf(firstWord) !== -1)[0];
      if (foundLooker) {
        const words = query.split(" ");
        words.shift();
        query = words.join(" ");
      }
      context.looker = foundLooker || Looker.all[0];

      const runner = new LookFinder(context, type, query);
      runner.start();

      return true;
    } else {
      return false;
    }
  }

}
