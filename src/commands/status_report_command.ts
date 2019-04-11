import { ReplyContext } from "../reply_context"
import { AlertsState, IAlert } from "../saved_alerts"
import { Command } from "./command"
import { getOptions } from "./set_alert_command"

interface IAccumulatorItem {
    count: number,
    details?: string,
    titles: string,
}

const options = ["display all alerts", "all alerts", "show all", "status"]
const optionsWithDetail = ["count only", "no detail", "no details", "without details", "without details"]
const noResults = "\n*¯\\_(ツ)_/¯* There are currently no alerts set. Here is a pretty picture instead.\n https://picsum.photos/200"

const countMessage = (count: number) => {
    let msg = ""
    switch (count) {
        case 1:
            msg = `There is ${count} alert`
            break

        default:
            msg = `There are ${count} alerts`
            break
    }

    return msg
}
const italics = (str: string) => `_${str}_`
const bold = (str: string) => `*${str}*`
const formatAlertTitle = (stateItem: IAlert) => {
    let itemMsg = stateItem.alert.message
    itemMsg = itemMsg.replace(stateItem.alert.compareField, bold(stateItem.alert.compareField))
    itemMsg = itemMsg.replace(stateItem.lookTitle, italics(stateItem.lookTitle.toUpperCase()))
    itemMsg = itemMsg.replace(stateItem.alert.baseField, italics(stateItem.alert.baseField.toUpperCase()))

    return itemMsg
}

const formatTimeDispaly = (date: Date) => {
    let hours = date.getHours()
    const minutes = date.getMinutes()
    hours = hours % 12
    hours = hours ? hours : 12
    const minutesDisplay = minutes < 10 ? `0 ${minutes}` : minutes

    return `${hours}:${minutesDisplay}${date.getHours() >= 12 ? "pm" : "am"}`
}

const generateAlertListText = (skipDetail: boolean = true) => {
    const returnObject: IAccumulatorItem = {
        count: 0,
        details: "",
        titles: "",
    }

    const {count, details} = AlertsState.savedAlerts.reduce((accumulator: IAccumulatorItem, cV: IAlert, currentIndex: number) => {
        accumulator.count = accumulator.count + 1
        accumulator.titles = `${accumulator.titles}\n - ${formatAlertTitle(cV)}`
        accumulator.details = `${accumulator.details}\n\nID: ${currentIndex + 1}\n\t*Look*: ${cV.lookTitle}\n\t*Condition*: ${cV.alert.baseField} ${cV.alert.conditional} ${cV.alert.compareField}\n\t*Link*: ${cV.lookLink}\n\t*Owner*: ${cV.setBy.name}\n\t*Set at*: ${formatTimeDispaly(cV.setAt)} ${cV.setAt.toLocaleDateString()}`
        return accumulator
    }, returnObject)

    const detailMsg = skipDetail ? "" : `\n${details}`
    return `${countMessage(count)} available.${detailMsg}`
}
export class StatusReportCommand extends Command {
    public attempt(context: ReplyContext) {

        const msg = context.sourceMessage.text.toLowerCase()
        const match = msg.match(new RegExp(`${getOptions(options)}`))
        const detailViewMatch = msg.match(new RegExp(`${getOptions(optionsWithDetail)}`))
        if (match) {
            generateAlertListText()
            const replyText = (AlertsState.savedAlerts.length > 0) ? `${generateAlertListText(!!detailViewMatch)}` : noResults
            context.replyPublic({ text: replyText})
            return true
        } else {
            return false
        }
    }
}
