import Command from "./command";

import config from "../config";
import Looker from "../looker";
import LookFinder from "../repliers/look_finder";
import ReplyContext from "../reply_context";

const FIND_REGEX = new RegExp("find (dashboard|look )? ?(.+)");

export default class SearchCommand extends Command {

  public attempt(context: ReplyContext) {

    const match context.sourceMessage.text.match(FIND_REGEX);
    if (match) {

      let [, type, query] = match;

      const firstWord = query.split(" ")[0];
      const foundLooker = Looker.all.filter((l) => l.url.indexOf(firstWord) !== -1)[0];
      if (foundLooker) {
        const words = query.split(" ");
        words.shift();
        query = words.join(" ");
      }
      context.looker = foundLooker || Looker.all[0];

      new LookFinder(context, type, query).start();

      return true;
    } else {
      return false;
    }
  }

}
