let QueryRunner;
import _ from "underscore";
import FancyReplier from './fancy_replier';
import uuid from "uuid/v4";
import SlackUtils from '../slack_utils';

export default (QueryRunner = class QueryRunner extends FancyReplier {

  constructor(replyContext, queryParam) {
    super(replyContext);
    this.querySlug = queryParam != null ? queryParam.slug : undefined;
    this.queryId = queryParam != null ? queryParam.id : undefined;
  }

  showShareUrl() { return false; }

  linkText(shareUrl) {
    return shareUrl;
  }

  linkUrl(shareUrl) {
    return shareUrl;
  }

  shareUrlContent(shareUrl) {
    if (this.linkText(shareUrl) === this.linkUrl(shareUrl)) {
      return `<${this.linkUrl(shareUrl)}>`;
    } else {
      return `<${this.linkUrl(shareUrl)}|${this.linkText(shareUrl)}>`;
    }
  }

  postImage(query, imageData, options) {
    if (options == null) { options = {}; }
    if (this.replyContext.looker.storeBlob) {

      let success = url => {
        return this.reply({
          attachments: [
            _.extend({}, options, {
              image_url: url,
              title: this.showShareUrl() ? this.linkText(query.share_url) : "",
              title_link: this.showShareUrl() ? this.linkUrl(query.share_url) : "",
              color: "#64518A"
            })
          ],
          text: ""
        });
      };

      let error = (error, context) => {
        return this.reply(`:warning: *${context}* ${error}`);
      };


      if (imageData.length) {
        return this.replyContext.looker.storeBlob(imageData, success, error);
      } else {
        return error("No image data returned for query.", "Looker Render Error");
      }

    } else {
      return this.reply(":warning: No storage is configured for visualization images in the bot configuration.");
    }
  }

  postResult(query, result, options) {

    // Handle hidden fields
    let attachment, d, rendered, text;
    if (options == null) { options = {}; }
    let hiddenFields = (query.vis_config != null ? query.vis_config.hidden_fields : undefined) || [];
    if ((hiddenFields != null ? hiddenFields.length : undefined) > 0) {
      for (let k in result.fields) {
        let v = result.fields[k];
        result.fields[k] = v.filter(field => hiddenFields.indexOf(field.name) === -1);
      }
    }

    let calcs = result.fields.table_calculations || [];
    let dimensions = result.fields.dimensions || [];
    let measures = result.fields.measures || [];
    let measure_like = measures.concat(calcs.filter(c => c.is_measure));
    let dimension_like = dimensions.concat(calcs.filter(c => !c.is_measure));

    let renderableFields = dimension_like.concat(measure_like);

    let shareUrl = this.shareUrlContent(query.share_url);

    let addSlackButtons = (f, row, attachment) => {
      if (!SlackUtils.slackButtonsEnabled) { return; }
      d = row[f.name];
      if (!d.links) { return; }
      let usableActions = d.links.filter(l => (l.type === "action") && !l.form && !l.form_url);
      if (!(usableActions.length > 0)) { return; }
      attachment.actions = usableActions.map(link => {
        return {
          name: "data_action",
          text: link.label,
          type: "button",
          value: JSON.stringify({lookerUrl: this.replyContext.looker.url, action: link})
        };
      });
      return attachment.callback_id = uuid();
    };

    let renderString = d => d.rendered || d.value;

    let renderField = (f, row) => {
      d = row[f.name];
      let drill = d.links != null ? d.links[0] : undefined;
      if (drill && (drill.type === "measure_default")) {
        return `<${this.replyContext.looker.url}${drill.url}|${renderString(d)}>`;
      } else if ((d != null) && (d.value !== null)) {
        return renderString(d);
      } else {
        return "∅";
      }
    };

    let renderFieldLabel = function(field) {
      if (((query.vis_config != null ? query.vis_config.show_view_names : undefined) != null) && !query.vis_config.show_view_names) {
        return field.label_short || field.label;
      } else {
        return field.label;
      }
    };

    if (result.pivots) {
      return this.reply(`${shareUrl}\n _Can't currently display tables with pivots in Slack._`);

    } else if (result.data.length === 0) {
      if ((result.errors != null ? result.errors.length : undefined)) {
        let txt = result.errors.map(e => `${e.message}\`\`\`${e.message_details}\`\`\``).join("\n");
        return this.reply(`:warning: ${shareUrl}\n${txt}`);
      } else {
        return this.reply(`${shareUrl}\nNo results.`);
      }

    } else if ((query.vis_config != null ? query.vis_config.type : undefined) === "single_value") {
      let field = measure_like[0] || dimension_like[0];
      let share = this.showShareUrl() ? `\n${shareUrl}` : "";
      let datum = result.data[0];
      rendered = renderField(field, datum);
      text = `*${rendered}*${share}`;
      attachment = {text, fallback: rendered, color: "#64518A", mrkdwn_in: ["text"]};
      addSlackButtons(field, datum, attachment);
      return this.reply({attachments: [attachment]});

    } else if ((result.data.length === 1) || ((query.vis_config != null ? query.vis_config.type : undefined) === "looker_single_record")) {
      attachment = _.extend({}, options, {
        color: "#64518A",
        fallback: shareUrl,
        fields: renderableFields.map(function(m) {
          rendered = renderField(m, result.data[0]);
          return {title: renderFieldLabel(m), value: rendered, fallback: rendered, short: true};
        })
      });
      attachment.text = this.showShareUrl() ? shareUrl : "";
      return this.reply({attachments: [attachment]});

    } else {
      attachment = _.extend({color: "#64518A"}, options, {
        title: renderableFields.map(f => renderFieldLabel(f)).join(" – "),
        text: result.data.map(d => renderableFields.map(f => renderField(f, d)).join(" – ")).join("\n"),
        fallback: shareUrl
      });
      return this.reply({attachments: [attachment], text: this.showShareUrl() ? shareUrl : ""});
    }
  }

  work() {
    if (this.querySlug) {
      return this.replyContext.looker.client.get(
        `queries/slug/${this.querySlug}`,
        query => this.runQuery(query),
        r => this.replyError(r),
        {},
        this.replyContext
      );
    } else if (this.queryId) {
      return this.replyContext.looker.client.get(
        `queries/${this.queryId}`,
        query => this.runQuery(query),
        r => this.replyError(r),
        {},
        this.replyContext
      );
    } else {
      throw "Must set slug or id when creating QueryRunner, or override work";
    }
  }

  runQuery(query, options) {
    if (options == null) { options = {}; }
    let type = (query.vis_config != null ? query.vis_config.type : undefined) || "table";
    if ((type === "table") || (type === "looker_single_record") || (type === "single_value")) {
      return this.replyContext.looker.client.get(
        `queries/${query.id}/run/unified`,
        result => this.postResult(query, result, options),
        r => this.replyError(r),
        {},
        this.replyContext
      );
    } else {
      return this.replyContext.looker.client.get(
        `queries/${query.id}/run/png`,
        result => this.postImage(query, result, options),
        r => {
          if ((r != null ? r.error : undefined) === "Received empty response from Looker.") {
            return this.replyError({error: "Did not receive an image from Looker.\nThe \"PDF Download & Scheduling and Scheduled Visualizations\" Labs feature must be enabled to render images."});
          } else {
            return this.replyError(r);
          }
        },
        {encoding: null},
        this.replyContext
      );
    }
  }
});
