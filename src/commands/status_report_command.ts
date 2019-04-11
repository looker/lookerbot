import { ReplyContext } from "../reply_context"
import { AlertsState, IAlert } from "../saved_alerts"
import { Command } from "./command"
import { getOptions } from "./set_alert_command"

interface IAccumulatorItem {
    count: number,
    details: string,
    titles: string,
}

interface IAlertItem {
    baseField: string,
    compareField: string,
    conditional: string,
    msg: string,
}

const options = ["display all alerts", " all alerts", "show all", "status"]
const noResults = "\n*¯\\_(ツ)_/¯* There are currently no alerts set. Here is a pretty picture instead.\n https://picsum.photos/200"

const codeBlock = (content: string) => `\`\`\`${content}\`\`\``
const countMessage = (count: number) => {
    let msg = "";
    switch (count) {
        case 1:
            msg = `There is ${count} alert`
            break

        default:
            msg = `There are ${count} alerts`
            break
    }

    return msg;
}
const italics = (str: string) => `_${str}_`
const bold = (str: string) => `*${str}*`
const formatAlertTitle = (stateItem: IAlert) => {
    let itemMsg = stateItem.alert.message;
    itemMsg = itemMsg.replace(stateItem.alert.compareField, bold(stateItem.alert.compareField))
    itemMsg = itemMsg.replace(stateItem.lookTitle, italics(stateItem.lookTitle.toUpperCase()))
    itemMsg = itemMsg.replace(stateItem.alert.baseField, italics(stateItem.alert.baseField.toUpperCase()))


    return itemMsg;
}

const generateAlertListText = () => {
    const {count, titles, details} = AlertsState.savedAlerts.reduce((accumulator: IAccumulatorItem, currentValue: IAlert) => {
        accumulator.count = accumulator.count + 1
        accumulator.titles = `${accumulator.titles}\n - ${formatAlertTitle(currentValue)}`
        accumulator.details = `${accumulator.details}\n\ndetail for ${bold(currentValue.lookTitle)}\n${codeBlock(JSON.stringify(currentValue))}`
        return accumulator
    }, {
        count: 0,
        details: "",
        titles: "",
    })

    return `${countMessage(count)} available.\n\n${bold("Available alert(s)")}\n${titles}\n\n${bold("Alert(s) details")}\n${details}`
}
export class StatusReportCommand extends Command {
    public attempt(context: ReplyContext) {

        const msg = context.sourceMessage.text.toLowerCase()
        const match = msg.match(new RegExp(`${getOptions(options)}`))
        if(match) {
            generateAlertListText()
            const replyText = (AlertsState.savedAlerts.length > 0) ? `${generateAlertListText()}` : noResults;
            context.replyPublic({ text: replyText})
            return true
        } else {
            return false
        }
    }
}