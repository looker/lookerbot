import * as _ from "underscore"
import { Looker } from "./looker"
import { Message, SentMessage } from "./message"

export class ReplyContext {

  public looker: Looker
  public sourceMessage: SentMessage
  public isDM = false
  public scheduled = false
  public dataAction = false

  private hasRepliedPrivately = false

  constructor(private defaultBot: any, private messageBot: any, sourceMessage: SentMessage) {
    this.defaultBot = defaultBot
    this.messageBot = messageBot
    this.sourceMessage = sourceMessage
  }

  public isSlashCommand() {
    return !!this.messageBot.res
  }

  public replyPrivate(message: Message, cb?: any) {
    message = this.rtmOptOut(message)
    if (this.isSlashCommand()) {
      if (this.hasRepliedPrivately) {
        return this.messageBot.replyPrivateDelayed(this.sourceMessage, message, cb)
      } else {
        this.hasRepliedPrivately = true
        return this.messageBot.replyPrivate(this.sourceMessage, message, cb)
      }
    } else {
      return this.defaultBot.reply(this.sourceMessage, message, cb)
    }
  }

  public replyPublic(message: Message, cb?: any) {
    message = this.rtmOptOut(message)
    if (this.isSlashCommand()) {
      return this.messageBot.replyPublicDelayed(this.sourceMessage, message, cb)
    } else {
      return this.defaultBot.reply(this.sourceMessage, message, cb)
    }
  }

  public startTyping() {
    if (this.isSlashCommand()) {
      return this.messageBot.replyPublicDelayed(this.sourceMessage, { type: "typing" })
    } else {
      return this.defaultBot.startTyping(this.sourceMessage)
    }
  }

  public completeSlashCommand() {
    if (this.isSlashCommand() && !this.hasRepliedPrivately) {
      // Return 200 immediately for slash commands
      this.messageBot.res.setHeader("Content-Type", "application/json")
      this.messageBot.res.send(JSON.stringify({response_type: "in_channel"}))
    }
  }

  public updateMessage(updatedMessage: SentMessage) {
    this.defaultBot.api.chat.update(updatedMessage)
  }

  // The Slack RTM API seems to be unreliable at delivering messages, or has formatting differences.
  // Setting the attachments to [] hints to botkit to skip the RTM API and use the REST one.
  private rtmOptOut(message: Message) {
    if (typeof(message) === "string") {
      return {text: message, attachments: []}
    } else {
      if (message.attachments == null) { message.attachments = [] }
      return message
    }
  }
}
