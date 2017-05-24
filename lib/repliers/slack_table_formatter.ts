import { Message, IAttachment, IAttachmentAction } from "../message";
import uuid from "uuid/v4";
import SlackUtils from "../slack_utils";
import * as _ from "underscore";

export default class SlackTableFormatter {

  private dimensionLike: Array<any>;
  private measureLike: Array<any>;
  private fields: Array<any>;
  private query: any;
  private result: any;

  constructor(
    private options: {query: any, result: any, baseUrl: string, shareUrl: string}
  ) {

    this.query = options.query;
    this.result = options.result;

    // Handle hidden fields
    const hiddenFields = this.query.vis_config.hidden_fields || [];
    if (hiddenFields.length > 0) {
      for (const k of Object.keys(this.result.fields)) {
        const v = this.result.fields[k];
        this.result.fields[k] = v.filter((field) => hiddenFields.indexOf(field.name) === -1);
      }
    }

    const calcs = this.result.fields.table_calculations || [];
    const dimensions = this.result.fields.dimensions || [];
    const measures = this.result.fields.measures || [];
    this.measureLike = measures.concat(calcs.filter((c) => c.is_measure));
    this.dimensionLike = dimensions.concat(calcs.filter((c) => !c.is_measure));
    this.fields = this.measureLike.concat(this.dimensionLike);

  }

  public format(): Message {

    const result = this.result;
    const shareUrl = this.options.shareUrl;
    const visType = this.query.vis_config ? this.query.vis_config.type : undefined;

    if (result.pivots) {
      return `${shareUrl}\n _Can't currently display tables with pivots in Slack._`;
    } else if (result.data.length === 0) {
      if (result.errors && result.errors.length) {
        const txt = result.errors.map((e) => `${e.message}\`\`\`${e.message_details}\`\`\``).join("\n");
        return(`:warning: ${shareUrl}\n${txt}`);
      } else {
        return(`${shareUrl}\nNo results.`);
      }
    } else if (visType === "single_value") {
      const field = this.measureLike[0] || this.dimensionLike[0];
      const share = shareUrl ? `\n${shareUrl}` : "";
      const datum = result.data[0];
      const rendered = this.renderField(field, datum);
      const text = `*${rendered}*${share}`;
      const attachment = {text, fallback: rendered, color: "#64518A", mrkdwn_in: ["text"]};
      this.addSlackButtons(field, datum, attachment);

      return {attachments: [attachment]};

    } else if (result.data.length === 1 || visType === "looker_single_record") {
      const attachment: IAttachment = {
        color: "#64518A",
        fallback: shareUrl,
        fields: this.fields.map((m) => {
          const rendered = this.renderField(m, result.data[0]);
          return {title: this.renderFieldLabel(m), value: rendered, fallback: rendered, short: true};
        }),
      };
      attachment.text = shareUrl ? shareUrl : "";
      return({attachments: [attachment]});

    } else {
      const attachment: IAttachment = {
        title: this.fields.map((f) => this.renderFieldLabel(f)).join(" – "),
        text: result.data.map((d) => this.fields.map((f) => this.renderField(f, d)).join(" – ")).join("\n"),
        fallback: shareUrl,
      };
      attachment.color = "#64518A";
      return({attachments: [attachment], text: shareUrl ? shareUrl : ""});
    }

  }

  private addSlackButtons (f, row, attachment: IAttachment) {

    if (!SlackUtils.slackButtonsEnabled) { return; }

    const d = row[f.name];
    if (!d.links) { return; }

    const usableActions = d.links.filter((l) => (l.type === "action") && !l.form && !l.form_url);
    if (!(usableActions.length > 0)) { return; }

    attachment.actions = usableActions.map((link) => {
      return {
        name: "data_action",
        text: link.label,
        type: "button",
        value: JSON.stringify({lookerUrl: this.options.baseUrl, action: link}),
      };
    });
    attachment.callback_id = uuid();

  };

  private renderFieldLabel(field): string {
    if (this.query.vis_config == null ? true : this.query.vis_config.show_view_names) {
      return field.label_short || field.label;
    } else {
      return field.label;
    }
  };

  private renderString (d): string {
     return d.rendered || d.value;
  }

  private renderField (f, row): string {
    let d = row[f.name];
    const drill = d.links != null ? d.links[0] : undefined;
    if (drill && (drill.type === "measure_default")) {
      return `<${this.options.baseUrl}${drill.url}|${this.renderString(d)}>`;
    } else if ((d != null) && (d.value !== null)) {
      return this.renderString(d);
    } else {
      return "∅";
    }
  };

}
