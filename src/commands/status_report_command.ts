import config from "../config"
import { Looker } from "../looker"
import { ReplyContext } from "../reply_context"
import { Command } from "./command"
import { AlertsState } from "../saved_alerts"
import { FancyReplier } from "../repliers/fancy_replier"

export class StatusReportCommand extends Command {
    public attempt(context: ReplyContext) {

        const msg = context.sourceMessage.text.toLowerCase()
        const match = msg.indexOf('status') > -1
        console.log('\n\nCONTEXT data ', Object.keys(context))
        console.log('\n\nCONTEXT data ', Object.keys(context.defaultBot))
        if(match) {
            console.log('MESSAGE === ', msg, ' \n\nALERT STATE === ', AlertsState.savedAlerts, '\n\n\n')
            context.replyPublic({ text: 'made it', title: 'some title'})
            return true
        } else {
            return false
        }
    }
}