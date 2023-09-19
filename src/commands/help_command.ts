import * as _ from "underscore"
import config from "../config"
import { Looker } from "../looker"
import { DashboardQueryRunner } from "../repliers/dashboard_query_runner"
import { ReplyContext } from "../reply_context"
import { VersionChecker } from "../version_checker"
import { Command } from "./command"

export class HelpCommand extends Command {

  public attempt(context: ReplyContext) {
    const helpAttachments: any = []

    const groups = _.groupBy(Looker.customCommandList(), "category")

    for (const groupName of Object.keys(groups)) {
      const groupCommmands = groups[groupName]
      let groupText = ""
      for (const command of _.sortBy(_.values(groupCommmands), "name")) {
        if (!command.hidden) {
          const url = `${command.looker.url}/dashboards/${command.dashboard.id}`
          groupText += `• *<${url}|${command.name}>* ${command.helptext}`
          if (command.description) {
            groupText += ` — _${command.description}_`
          }
          groupText += "\n"
        }
      }

      if (groupText) {
        helpAttachments.push({
          color: "#64518A",
          mrkdwn_in: ["text"],
          text: groupText,
          title: groupName,
        })
      }
    }

    const defaultText = `\
• *find* <look search term> — _Shows the top five Looks matching the search._\
`

    helpAttachments.push({
      color: "#64518A",
      mrkdwn_in: ["text"],
      text: defaultText,
      title: "Built-in Commands",
    })

    const folders = Looker.all.filter((l) => l.customCommandFolderId).map((l) => {
      return `<${l.url}/folders/${l.customCommandFolderId}|this folder>`
    }).join(" or ")

    if (folders) {
      helpAttachments.push({
        mrkdwn_in: ["text"],
        text: `\n_To add your own commands, add a dashboard to ${folders}._`,
      })
    }

    if (VersionChecker.newVersion) {
      helpAttachments.push({
        color: "warning",
        mrkdwn_in: ["text"],
        text: `\n\n:scream: *<${VersionChecker.newVersion.url}|Lookerbot is out of date! Version ${VersionChecker.newVersion.number} is now available.>* :scream:`,
      })
    }

    if (context.isDM && (context.sourceMessage.text.toLowerCase() !== "help")) {
      context.replyPrivate(":crying_cat_face: I couldn't understand that command. You can use `help` to see the list of possible commands.")
    } else {
      context.replyPrivate({attachments: helpAttachments})
    }

    for (const looker of Array.from(Looker.all)) {
      looker.refreshCommands()
    }

    return true
  }

}
