import * as _ from "underscore";
import SlackUtils from "../slack_utils";
import { FancyReplier } from "./fancy_replier";
import SlackTableFormatter from "./slack_table_formatter"

export default class QueryRunner extends FancyReplier {

  protected querySlug?: string;
  protected queryId?: number;

  constructor(replyContext, queryParam: {slug?: string, id?: number} = {}) {
    super(replyContext);
    this.querySlug = queryParam.slug;
    this.queryId = queryParam.id;
  }

  protected showShareUrl() { return false; }

  protected linkText(shareUrl) {
    return shareUrl;
  }

  protected linkUrl(shareUrl) {
    return shareUrl;
  }

  protected shareUrlContent(shareUrl) {
    if (this.linkText(shareUrl) === this.linkUrl(shareUrl)) {
      return `<${this.linkUrl(shareUrl)}>`;
    } else {
      return `<${this.linkUrl(shareUrl)}|${this.linkText(shareUrl)}>`;
    }
  }

  protected postImage(query, imageData, options = {}) {
    if (this.replyContext.looker.storeBlob) {

      const success = (url) => {
        this.reply({
          attachments: [
            _.extend({}, options, {
              image_url: url,
              title: this.showShareUrl() ? this.linkText(query.share_url) : "",
              title_link: this.showShareUrl() ? this.linkUrl(query.share_url) : "",
              color: "#64518A",
            }),
          ],
          text: "",
        });
      };

      const error = (msg, context) => {
        this.reply(`:warning: *${context}* ${msg}`);
      };

      if (imageData.length) {
        this.replyContext.looker.storeBlob(imageData, success, error);
      } else {
        error("No image data returned for query.", "Looker Render Error");
      }

    } else {
      this.reply(":warning: No storage is configured for visualization images in the bot configuration.");
    }
  }

  protected postResult(query, result) {
    const formatter = new SlackTableFormatter({
      query,
      result,
      baseUrl: this.replyContext.looker.url,
      shareUrl: this.shareUrlContent(query.share_url),
    });
    this.reply(formatter.format());
  }

  protected work() {
    if (this.querySlug) {
      this.replyContext.looker.client.get(
        `queries/slug/${this.querySlug}`,
        (query) => this.runQuery(query),
        (r) => this.replyError(r),
        {},
        this.replyContext,
      );
    } else if (this.queryId) {
      this.replyContext.looker.client.get(
        `queries/${this.queryId}`,
        (query) => this.runQuery(query),
        (r) => this.replyError(r),
        {},
        this.replyContext,
      );
    } else {
      throw "Must set slug or id when creating QueryRunner, or override work";
    }
  }

  protected runQuery(query) {
    const type = (query.vis_config != null ? query.vis_config.type : undefined) || "table";
    if ((type === "table") || (type === "looker_single_record") || (type === "single_value")) {
      return this.replyContext.looker.client.get(
        `queries/${query.id}/run/unified`,
        (result) => this.postResult(query, result),
        (r) => this.replyError(r),
        {},
        this.replyContext,
      );
    } else {
      return this.replyContext.looker.client.get(
        `queries/${query.id}/run/png`,
        (result) => this.postImage(query, result),
        (r) => {
          if ((r != null ? r.error : undefined) === "Received empty response from Looker.") {
            return this.replyError({error: "Did not receive an image from Looker.\nThe \"PDF Download & Scheduling and Scheduled Visualizations\" Labs feature must be enabled to render images."});
          } else {
            return this.replyError(r);
          }
        },
        {encoding: null},
        this.replyContext,
      );
    }
  }

}
