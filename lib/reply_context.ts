// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
let ReplyContext;
import _ from 'underscore';

export default (ReplyContext = class ReplyContext {

  constructor(defaultBot, messageBot, sourceMessage) {
    this.defaultBot = defaultBot;
    this.messageBot = messageBot;
    this.sourceMessage = sourceMessage;
  }

  isSlashCommand() {
    return !!this.messageBot.res;
  }

  replyPrivate(message, cb) {
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

  replyPublic(message, cb) {
    message = this._rtmOptOut(message);
    if (this.isSlashCommand()) {
      return this.messageBot.replyPublicDelayed(this.sourceMessage, message, cb);
    } else {
      return this.defaultBot.reply(this.sourceMessage, message, cb);
    }
  }

  startTyping() {
    if (this.isSlashCommand()) {
      return this.messageBot.replyPublicDelayed(this.sourceMessage, { type: 'typing' });
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
});

