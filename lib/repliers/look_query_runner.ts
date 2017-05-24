import QueryRunner from "./query_runner";

export default class LookQueryRunner extends QueryRunner {

  private lookId: number;
  private filterInfo?: any;
  private loadedLook: any;

  constructor(replyContext, lookId, filterInfo?: any) {
    super(replyContext);
    this.lookId = lookId;
    this.filterInfo = filterInfo;
  }

  protected showShareUrl() { return true; }

  protected linkText(shareUrl) {
    if (this.loadedLook) {
      return this.loadedLook.title;
    } else {
      return super.linkText(shareUrl);
    }
  }

  protected linkUrl(shareUrl) {
    if (this.loadedLook) {
      if (this.isFilteredLook()) {
        return this.filterInfo.url;
      } else {
        return `${this.replyContext.looker.url}${this.loadedLook.short_url}`;
      }
    } else {
      return super.linkUrl(shareUrl);
    }
  }

  protected work() {
    return this.replyContext.looker.client.get(`looks/${this.lookId}`, (look) => {

      this.loadedLook = look;

      if (this.isFilteredLook()) {
        this.queryId = this.filterInfo.queryId;
      } else {
        this.querySlug = look.query.slug;
      }

      super.work();

    },
    (r) => this.replyError(r));
  }

  private isFilteredLook() {
    return (this.filterInfo != null) && (this.loadedLook.query.id !== this.filterInfo.queryId);
  }

}
