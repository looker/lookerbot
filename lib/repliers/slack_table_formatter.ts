import * as _ from "underscore"
import * as uuid from "uuid"
import { IDatum, IQuery, IQueryResponse, IQueryResponseField, IQueryResponseRow} from "../looker_api_types"
import { IAttachment, IAttachmentAction, Message } from "../message"
import { SlackUtils } from "../slack_utils"

export class SlackTableFormatter {

  private dimensionLike: any[]
  private measureLike: any[]
  private fields: any[]
  private query: IQuery
  private result: IQueryResponse

  constructor(
    private options: {query: IQuery, result: IQueryResponse, baseUrl: string, shareUrl: string},
  ) {

    this.query = options.query
    this.result = options.result

    // Handle hidden fields
    const hiddenFields = this.query.vis_config.hidden_fields || []
    if (hiddenFields.length > 0) {
      for (const k of Object.keys(this.result.fields)) {
        const v = this.result.fields[k]
        this.result.fields[k] = v.filter((field) => hiddenFields.indexOf(field.name) === -1)
      }
    }

    const calcs = this.result.fields.table_calculations || []
    const dimensions = this.result.fields.dimensions || []
    const measures = this.result.fields.measures || []
    this.measureLike = measures.concat(calcs.filter((c) => typeof c.measure === "undefined" ? c.is_measure : c.measure))
    this.dimensionLike = dimensions.concat(calcs.filter((c) => typeof c.measure === "undefined" ? !c.is_measure : !c.measure))
    this.fields = this.measureLike.concat(this.dimensionLike)

  }

  public format(): Message {

    const result = this.result
    const shareUrl = this.options.shareUrl
    const visType = this.query.vis_config ? this.query.vis_config.type : undefined

    if (result.pivots) {
      return `${shareUrl}\n _Can't currently display tables with pivots in Slack._`
    } else if (result.data.length === 0) {
      if (result.errors && result.errors.length) {
        const txt = result.errors.map((e) => `${e.message}\`\`\`${e.message_details}\`\`\``).join("\n")
        return(`:warning: ${shareUrl}\n${txt}`)
      } else {
        return(`${shareUrl}\nNo results.`)
      }
    } else if (visType === "single_value") {
      const field = this.measureLike[0] || this.dimensionLike[0]
      const share = shareUrl ? `\n${shareUrl}` : ""
      const datum = result.data[0]
      const rendered = this.renderField(field, datum)
      const text = `*${rendered}*${share}`
      const attachment = {text, fallback: rendered, color: "#64518A", mrkdwn_in: ["text"]}
      this.addSlackButtons(field, datum, attachment)

      return {attachments: [attachment]}

    } else if (result.data.length === 1 || visType === "looker_single_record") {
      const attachment: IAttachment = {
        color: "#64518A",
        fallback: shareUrl,
        fields: this.fields.map((m) => {
          const rendered = this.renderField(m, result.data[0])
          return {title: this.renderFieldLabel(m), value: rendered, fallback: rendered, short: true}
        }),
      }
      attachment.text = shareUrl ? shareUrl : ""
      return({attachments: [attachment]})

    } else {
      const attachment: IAttachment = {
        fallback: shareUrl,
        text: result.data.map((d) => this.fields.map((f) => this.renderField(f, d)).join(" – ")).join("\n"),
        title: this.fields.map((f) => this.renderFieldLabel(f)).join(" – "),
      }
      attachment.color = "#64518A"
      return({attachments: [attachment], text: shareUrl ? shareUrl : ""})
    }

  }

  private addSlackButtons(f: IQueryResponseField, row: IQueryResponseRow, attachment: IAttachment) {

    if (!SlackUtils.slackButtonsEnabled) { return }

    const d = row[f.name]
    if (!d.links) { return }

    const usableActions = d.links.filter((l) => (l.type === "action") && !l.form && !l.form_url)
    if (!(usableActions.length > 0)) { return }

    attachment.actions = usableActions.map((link) => {
      return {
        name: "data_action",
        text: link.label,
        type: "button",
        value: JSON.stringify({lookerUrl: this.options.baseUrl, action: link}),
      }
    })
    attachment.callback_id = uuid()

  }

  private renderFieldLabel(field: IQueryResponseField): string {
    let showViewNames: boolean
    if (!this.query.vis_config || typeof this.query.vis_config.show_view_names === "undefined") {
      showViewNames = true
    } else {
      showViewNames = this.query.vis_config.show_view_names
    }
    if (showViewNames) {
      return field.label
    } else {
      return field.label_short || field.label
    }
  }

  private renderString(d: IDatum): string {
     return d.rendered || d.value
  }

  private renderField(f: IQueryResponseField, row: IQueryResponseRow): string {
    const d = row[f.name]
    const drill = d.links != null ? d.links[0] : undefined
    if (drill && (drill.type === "measure_default")) {
      return `<${this.options.baseUrl}${drill.url}|${this.renderString(d)}>`
    } else if ((d != null) && (d.value !== null)) {
      return this.renderString(d)
    } else {
      return "∅"
    }
  }

}
