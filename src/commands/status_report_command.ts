import { ReplyContext } from "../reply_context"
import { AlertsState } from "../saved_alerts"
import { Command } from "./command"
import { getOptions } from "./set_alert_command"

const options = ["display all alerts", " all alerts", "show all"]
const noResults = "There are currently no alerts set"

const generateAlertListText = (alertList :{}[]) => {}
export class StatusReportCommand extends Command {
    public attempt(context: ReplyContext) {

        const msg = context.sourceMessage.text.toLowerCase()
        const match = msg.match(new RegExp(`${getOptions(options)}`))
        if(match) {
            console.log("MESSAGE === ", msg, " \n\nALERT STATE === ", AlertsState.savedAlerts, "\n\n\n")
            const replyText = (AlertsState.savedAlerts.length > 0) ? `There are \`\`\`${(AlertsState.savedAlerts)}\`\`\`` : noResults;
            context.replyPublic({ text: replyText})
            return true
        } else {
            return false
        }
    }
}