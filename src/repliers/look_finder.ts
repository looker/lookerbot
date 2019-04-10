import { ILook } from "../looker_api_types"
import { ReplyContext } from "../reply_context"
import { QueryRunner } from "./query_runner"

const fuzzySearch = require("fuzzysearch-js")
const levenshteinFS = require("fuzzysearch-js/js/modules/LevenshteinFS")

export class LookFinder extends QueryRunner {

  constructor(replyContext: ReplyContext, private type: string, private query: string, private setAlert: boolean = false) {
    super(replyContext)
    this.type = type
    this.query = query
    this.setAlert = setAlert
  }

  protected async work() {
    const results = await this.matchLooks()
    if (results) {
      const text = this.setAlert
        ? "Cool. Choose a Look from below to set an alert for!"
        : "Matching Looks:"
      const shortResults = results.slice(0, 5)
      this.reply({
        attachments: shortResults.map((v: any) => {
          const look = v.value
          return {
            text: `in ${look.space.name}`,
            title: look.title,
            title_link: `${this.replyContext.looker.url}${look.short_url}`,
          }
        }),
       text,
      })
    } else {
      this.reply(`No Looks match \"${this.query}\".`)
    }
  }

  private async matchLooks() {
    const looks = await this.replyContext.looker.client.getAsync(
      "looks?fields=id,title,short_url,space(name,id)",
      this.replyContext,
    )

    const searcher = new fuzzySearch(looks, {termPath: "title"})
    searcher.addModule(levenshteinFS({maxDistanceTolerance: 3, factor: 3}))
    const results = searcher.search(this.query)

    return results
  }

}

// interface RequestScheduledPlan {
//   /** Name */
//   name?: string | null
//   /** User Id which owns this ScheduledPlan */
//   user_id?: number | null
//   /** Whether schedule is ran as recipient (only applicable for email recipients) */
//   run_as_recipient?: boolean
//   /** Whether the ScheduledPlan is enabled */
//   enabled?: boolean
//   /** Id of a look */
//   look_id?: number | null
//   /** Id of a dashboard */
//   dashboard_id?: number | null
//   /** Id of a LookML dashboard */
//   lookml_dashboard_id?: string | null
//   /** Query string to run look or dashboard with */
//   filters_string?: string | null
//   /** Delivery should occur if running the dashboard or look returns results */
//   require_results?: boolean
//   /** Delivery should occur if the dashboard look does not return results */
//   require_no_results?: boolean
//   /** Delivery should occur if data have changed since the last run */
//   require_change?: boolean
//   /** Will run an unlimited query and send all results. */
//   send_all_results?: boolean
//   /** Vixie-Style crontab specification when to run */
//   crontab?: string | null
//   /** Name of a datagroup; if specified will run when datagroup triggered (can't be used with cron string) */
//   datagroup?: string | null
//   /** Timezone for interpreting the specified crontab (default is Looker instance timezone) */
//   timezone?: string | null
//   /** Query id */
//   query_id?: string | null
//   /** Scheduled plan destinations */
//   scheduled_plan_destination?: RequestScheduledPlanDestination[] | null
//   /** Whether the plan in question should only be run once (usually for testing) */
//   run_once?: boolean
//   /** Whether links back to Looker should be included in this ScheduledPlan */
//   include_links?: boolean
//   /** The size of paper a PDF should be rendered for */
//   pdf_paper_size?: string | null
//   /** Whether the paper should be landscape */
//   pdf_landscape?: boolean
//   /** Whether this schedule is in an embed context or not */
//   embed?: boolean
//   /** Color scheme of the dashboard if applicable */
//   color_theme?: string | null
//   /** Whether or not to expand table vis to full length */
//   long_tables?: boolean
// }

// interface RequestScheduledPlanDestination {
//   /** Id of a scheduled plan you own */
//   scheduled_plan_id?: number | null
//   /** The data format to send to the given destination. Supported formats vary by destination, but include: "txt", "csv", "inline_json", "json", "json_detail", "xlsx", "html", "wysiwyg_pdf", "assembled_pdf", "wysiwyg_png" */
//   format?: string | null
//   /** Are values formatted? (containing currency symbols, digit separators, etc. */
//   apply_formatting?: boolean
//   /** Whether visualization options are applied to the results. */
//   apply_vis?: boolean
//   /** Address for recipient. For email e.g. 'user@example.com'. For webhooks e.g. 'https://domain/path'. For Amazon S3 e.g. 's3://bucket-name/path/'. For SFTP e.g. 'sftp://host-name/path/'.  */
//   address?: string | null
//   /** Type of the address ('email', 'webhook', 's3', or 'sftp') */
//   type?: string | null
//   /** JSON object containing parameters for external scheduling. For Amazon S3, this requires keys and values for access_key_id and region. For SFTP, this requires a key and value for username. */
//   parameters?: string | null
//   /** (Write-Only) JSON object containing secret parameters for external scheduling. For Amazon S3, this requires a key and value for secret_access_key. For SFTP, this requires a key and value for password. */
//   secret_parameters?: string | null
//   /** Optional message to be included in scheduled emails */
//   message?: string | null
// }