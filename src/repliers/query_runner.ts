import * as _ from "underscore"
import { IQuery, IQueryResponse } from "../looker_api_types"
import { ReplyContext } from "../reply_context"
import { SlackUtils } from "../slack_utils"
import blobStores from "../stores/index"
import { FancyReplier } from "./fancy_replier"
import { SlackTableFormatter } from "./slack_table_formatter"
import { IQueryConfig } from "../looker";

export class QueryRunner extends FancyReplier {

  protected querySlug?: string
  protected queryId?: number
  protected queryConfig: IQueryConfig

  constructor(replyContext: ReplyContext, queryConfig:IQueryConfig, queryParam: {slug?: string, id?: number} = {}) {
    super(replyContext)
    this.querySlug = queryParam.slug
    this.queryId = queryParam.id
    this.queryConfig = queryConfig
  }

  protected showShareUrl() { return false }

  protected linkText(shareUrl: string) {
    return shareUrl
  }

  protected linkUrl(shareUrl: string) {
    return shareUrl
  }

  protected shareUrlContent(shareUrl: string) {
    if (this.linkText(shareUrl) === this.linkUrl(shareUrl)) {
      return `<${this.linkUrl(shareUrl)}>`
    } else {
      return `<${this.linkUrl(shareUrl)}|${this.linkText(shareUrl)}>`
    }
  }

  protected async postImage(query: IQuery, imageData: Buffer) {
    if (!blobStores.current) {
      this.reply(":warning: No storage is configured for visualization images in the bot configuration.")
      return
    }

    if (!imageData.length) {
      this.reply(`:warning: Looker Render Error: No image data returned for query.`)
      return
    }

    try {
      const url = await blobStores.current.storeImage(imageData)
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
      })
    } catch (e) {
      this.reply(`:warning: ${e}`)
    }

  }

  protected postResult(query: IQuery, result: IQueryResponse) {
    const formatter = new SlackTableFormatter({
      baseUrl: this.replyContext.looker.url,
      query,
      result,
      shareUrl: this.shareUrlContent(query.share_url),
    })
    this.reply(formatter.format())
  }

  protected async work() {
    if (this.querySlug) {
      this.replyContext.looker.client.get(
        `queries/slug/${this.querySlug}`,
        (query: IQuery) => this.runQuery(query),
        (r: any) => this.replyError(r),
        {},
        this.replyContext,
      )
    } else if (this.queryId) {
      this.replyContext.looker.client.get(
        `queries/${this.queryId}`,
        (query: IQuery) => this.runQuery(query),
        (r: any) => this.replyError(r),
        {},
        this.replyContext,
      )
    } else {
      throw new Error("Must set slug or id when creating QueryRunner, or override work")
    }
  }

  protected async runQuery(query: IQuery) {
    const visType: string = query.vis_config && query.vis_config.type ? query.vis_config.type : "table"

    if ((visType === "table" && !this.queryConfig.tableAsImage) || visType === "looker_single_record" || visType === "single_value") {
      try {
        const result = await this.replyContext.looker.client.getAsync(
          `queries/${query.id}/run/unified`,
          this.replyContext,
        )
        this.postResult(query, result)
      } catch (e) {
        this.replyError(e)
      }
    } else {
      try {
        const imageData = await this.replyContext.looker.client.getBinaryAsync(
          `queries/${query.id}/run/png`,
          this.replyContext,
          { encoding: null, params: this.queryConfig }
        )
        this.postImage(query, imageData)
      } catch (e) {
        if (e.error && e.error === "Received empty response from Looker.") {
          this.replyError("Did not receive an image from Looker.\nThe \"PDF Download & Scheduling and Scheduled Visualizations\" Labs feature must be enabled to render images.")
        } else {
          this.replyError(e)
        }
      }
    }
  }

}
