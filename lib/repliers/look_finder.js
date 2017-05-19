let LookFinder;
import FuzzySearch from 'fuzzysearch-js';
import levenshteinFS from 'fuzzysearch-js/js/modules/LevenshteinFS';
import QueryRunner from './query_runner';

export default (LookFinder = class LookFinder extends QueryRunner {

  constructor(replyContext, type, query) {
    super(replyContext);
    this.type = type;
    this.query = query;
  }

  matchLooks(query, cb) {
    return this.replyContext.looker.client.get(
      "looks?fields=id,title,short_url,space(name,id)",
      looks => {
        let fuzzySearch = new FuzzySearch(looks, {termPath: "title"});
        fuzzySearch.addModule(levenshteinFS({maxDistanceTolerance: 3, factor: 3}));
        let results = fuzzySearch.search(query);
        return cb(results);
      },
      r => this.replyError(r),
      {},
      this.replyContext
    );
  }

  work() {
    return this.matchLooks(this.query, results => {
      if (results) {
        let shortResults = results.slice(0, 5);
        return this.reply({
          text: "Matching Looks:",
          attachments: shortResults.map(v => {
            let look = v.value;
            return {
              title: look.title,
              title_link: `${this.replyContext.looker.url}${look.short_url}`,
              text: `in ${look.space.name}`
            };
          })
        });
      } else {
        return this.reply(`No Looks match \"${this.query}\".`);
      }
    });
  }
});
