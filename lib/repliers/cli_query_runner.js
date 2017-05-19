let CLIQueryRunner;
import _ from "underscore";
import QueryRunner from './query_runner';

export default (CLIQueryRunner = class CLIQueryRunner extends QueryRunner {

  constructor(replyContext, textQuery, visualization) {
    super(replyContext);
    this.textQuery = textQuery;
    this.visualization = visualization;
  }

  showShareUrl() { return true; }

  work() {

    let [txt, limit, path, ignore, fields] = Array.from(this.textQuery.match(/([0-9]+ )?(([\w]+\/){0,2})(.+)/));

    if (limit) { limit = +(limit.trim()); }

    let pathParts = path.split("/").filter(p => p);

    if (pathParts.length !== 2) {
      this.reply("You've got to specify the model and explore!");
      return;
    }

    let fullyQualified = fields.split(",").map(f => f.trim()).map(function(f) {
      if (f.indexOf(".") === -1) {
        return `${pathParts[1]}.${f}`;
      } else {
        return f;
      }
    });

    fields = [];
    let filters = {};
    let sorts = [];

    for (let field of Array.from(fullyQualified)) {
      let __, filter, minus, sort;
      let matches = field.match(/([A-Za-z._ ]+)(\[(.+)\])?(-)? ?(asc|desc)?/i);
      [__, field, __, filter, minus, sort] = Array.from(matches);
      field = field.toLowerCase().trim().split(" ").join("_");
      if (filter) {
        filters[field] = _.unescape(filter);
      }
      if (sort) {
        sorts.push(`${field} ${sort.toLowerCase()}`);
      }
      if (!minus) {
        fields.push(field);
      }
    }

    let queryDef = {
      model: pathParts[0].toLowerCase(),
      view: pathParts[1].toLowerCase(),
      fields,
      filters,
      sorts,
      limit
    };

    if (this.visualization !== "data") {
      queryDef.vis_config =
        {type: `looker_${this.visualization}`};
    }

    return this.replyContext.looker.client.post("queries", queryDef, query => {
      if (this.visualization === "data") {
        return this.replyContext.looker.client.get(`queries/${query.id}/run/unified`, result => {
          return this.postResult(query, result);
        },
        r => this.replyError(r));
      } else {
        return this.replyContext.looker.client.get(`queries/${query.id}/run/png`, result => {
          return this.postImage(query, result);
        },
        r => this.replyError(r),
        {encoding: null});
      }
    }
    , r => this.replyError(r));
  }
});
