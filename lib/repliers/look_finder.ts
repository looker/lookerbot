import FuzzySearch from "fuzzysearch-js";
import levenshteinFS from "fuzzysearch-js/js/modules/LevenshteinFS";
import QueryRunner from "./query_runner";

export default class LookFinder extends QueryRunner {

  private type: string;
  private query: string;

  constructor(replyContext, type, query) {
    super(replyContext);
    this.type = type;
    this.query = query;
  }

  protected async work() {
    const results = await this.matchLooks(this.query);
    if (results) {
      const shortResults = results.slice(0, 5);
      this.reply({
        attachments: shortResults.map((v) => {
          const look = v.value;
          return {
            text: `in ${look.space.name}`,
            title: look.title,
            title_link: `${this.replyContext.looker.url}${look.short_url}`,
          };
        }),
        text: "Matching Looks:",
      });
    } else {
      this.reply(`No Looks match \"${this.query}\".`);
    }
  }

  private async matchLooks(query) {
    const looks = await this.replyContext.looker.client.getAsync(
      "looks?fields=id,title,short_url,space(name,id)",
      {},
      this.replyContext,
    );

    const fuzzySearch = new FuzzySearch(looks, {termPath: "title"});
    fuzzySearch.addModule(levenshteinFS({maxDistanceTolerance: 3, factor: 3}));
    const results = fuzzySearch.search(query);

    return results;
  }

}
