import * as _ from "underscore";
import SlackUtils from "../slack_utils";
import blobStores from "../stores/index";
import { FancyReplier } from "./fancy_replier";
import SlackTableFormatter from "./slack_table_formatter";

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

  protected async postImage(query, imageData) {
    if (!blobStores.current) {
      this.reply(":warning: No storage is configured for visualization images in the bot configuration.");
      return;
    }

    if (!imageData.length) {
      this.reply(`:warning: Looker Render Error: No image data returned for query.`);
      return;
    }

    try {
      const url = await blobStores.current.storeBlob(imageData);
      console.log("Got that hot url: " + url);
      this.reply({
        attachments: [
          {
            color: "#64518A",
            image_url: url,
            title: this.showShareUrl() ? this.linkText(query.share_url) : "",
            title_link: this.showShareUrl() ? this.linkUrl(query.share_url) : "",
          },
        ],
        text: "",
      });
    } catch (e) {
      this.reply(`:warning: ${e}`);
    }

  }

  protected postResult(query, result) {
    const formatter = new SlackTableFormatter({
      baseUrl: this.replyContext.looker.url,
      query,
      result,
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
      throw new Error("Must set slug or id when creating QueryRunner, or override work");
    }
  }

  protected runQuery(query) {
    const type = (query.vis_config != null ? query.vis_config.type : undefined) || "table";
    if ((type === "table") || (type === "looker_single_record") || (type === "single_value")) {
      this.replyContext.looker.client.get(
        `queries/${query.id}/run/unified`,
        (result) => this.postResult(query, result),
        (r) => this.replyError(r),
        {},
        this.replyContext,
      );
    } else {
      this.replyContext.looker.client.get(
        `queries/${query.id}/run/png`,
        (result) => this.postImage(query, result),
        (r) => {
          if ((r != null ? r.error : undefined) === "Received empty response from Looker.") {
            this.replyError({error: "Did not receive an image from Looker.\nThe \"PDF Download & Scheduling and Scheduled Visualizations\" Labs feature must be enabled to render images."});
          } else {
            this.replyError(r);
          }
        },
        {encoding: null},
        this.replyContext,
      );
    }
  }

}
