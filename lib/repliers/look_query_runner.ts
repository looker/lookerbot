import { ILook } from "../looker_api_types";
import ReplyContext from "../reply_context";
import { QueryRunner } from "./query_runner";

export default class LookQueryRunner extends QueryRunner {

  private loadedLook: any;

  constructor(
    replyContext: ReplyContext,
    private lookId: number | string,
    private filterInfo?: {queryId: number, url: string},
   ) {
    super(replyContext);
    this.lookId = lookId;
    this.filterInfo = filterInfo;
  }

  protected showShareUrl() { return true; }

  protected linkText(shareUrl: string) {
    if (this.loadedLook) {
      return this.loadedLook.title;
    } else {
      return super.linkText(shareUrl);
    }
  }

  protected linkUrl(shareUrl: string) {
    if (this.loadedLook) {
      if (this.filterInfo && this.isFilteredLook()) {
        return this.filterInfo.url;
      } else {
        return `${this.replyContext.looker.url}${this.loadedLook.short_url}`;
      }
    } else {
      return super.linkUrl(shareUrl);
    }
  }

  protected async work() {
    this.replyContext.looker.client.get(`looks/${this.lookId}`, (look: ILook) => {

      this.loadedLook = look;

      if (this.filterInfo && this.isFilteredLook()) {
        this.queryId = this.filterInfo.queryId;
      } else {
        this.querySlug = look.query.slug;
      }

      super.work();

    },
    (r: any) => this.replyError(r));
  }

  private isFilteredLook()  {
    return this.filterInfo && this.loadedLook.query.id !== this.filterInfo.queryId;
  }

}
