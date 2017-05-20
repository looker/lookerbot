import * as _ from "underscore";
import Looker from "./looker";

export default class ReplyContext {

  looker: Looker;
  defaultBot: any;
  messageBot: any;
  sourceMessage: any;
  isDM = false;
  scheduled = false;
  dataAction = false;
  hasRepliedPrivately = false;

  constructor(defaultBot, messageBot, sourceMessage) {
    this.defaultBot = defaultBot;
    this.messageBot = messageBot;
    this.sourceMessage = sourceMessage;
  }

  isSlashCommand() {
    return !!this.messageBot.res;
  }

  replyPrivate(message, cb?: any) {
    message = this._rtmOptOut(message);
    if (this.isSlashCommand()) {
      if (this.hasRepliedPrivately) {
        return this.messageBot.replyPrivateDelayed(this.sourceMessage, message, cb);
      } else {
        this.hasRepliedPrivately = true;
        return this.messageBot.replyPrivate(this.sourceMessage, message, cb);
      }
    } else {
      return this.defaultBot.reply(this.sourceMessage, message, cb);
    }
  }

  replyPublic(message, cb?: any) {
    message = this._rtmOptOut(message);
    if (this.isSlashCommand()) {
      return this.messageBot.replyPublicDelayed(this.sourceMessage, message, cb);
    } else {
      return this.defaultBot.reply(this.sourceMessage, message, cb);
    }
  }

  startTyping() {
    if (this.isSlashCommand()) {
      return this.messageBot.replyPublicDelayed(this.sourceMessage, { type: "typing" });
    } else {
      return this.defaultBot.startTyping(this.sourceMessage);
    }
  }

  // The Slack RTM API seems to be unreliable at delivering messages, or has formatting differences.
  // Setting the attachments to [] hints to botkit to skip the RTM API and use the REST one.
  _rtmOptOut(message) {
    if (typeof(message) === "string") {
      return {text: message, attachments: []};
    } else {
      if (message.attachments == null) { message.attachments = []; }
      return message;
    }
  }
}
