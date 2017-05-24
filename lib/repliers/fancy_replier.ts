import * as _ from "underscore";
import config from "../config";
import ReplyContext from "../reply_context";
import { Message, IRichMessage } from "../message";

const sassyMessages = [

  // English
  ["us", "Just a second"],
  ["us", "Thinking"],
  ["ca", "On it"],
  ["us", "Working on it"],
  ["gb", "Queueing"],
  ["gb", "Having a think"],
  ["ca", "One moment please"],
  ["in", "Give me a minute"],
  ["pk", "Hold on"],
  ["ng", "Looking into it"],
  ["ph", "One sec"],
  ["ph", "Working it out"],
  ["us", "Hold please"],
  ["eg", "Wait a moment"],
  ["eg", "Hmm"],

  // Cooler Languages
  ["es", "Un momento, por favor"],
  ["mx", "Por favor espera"],
  ["de", "Bitte warten Sie einen Augenblick"],
  ["jp", "お待ちください"],
  ["ca", "Un moment s'il vous plait"],
  ["cn", "稍等一會兒"],
  ["nl", "Even geduld aub"],
  ["so", "Ka shaqeeya waxaa ku"],
  ["th", "กรุณารอสักครู่"],
  ["ru", "один момент, пожалуйста"],
  ["fi", "Hetkinen"],
  ["ro", "Lucrez la asta"],
  ["is", "Eitt andartak"],
  ["az", "Bir dəqiqə zəhmət olmasa"],
  ["ie", "Fán le do thoil"],
  ["ne", "कृपया पर्खनुहोस्"],
  ["in", "कृपया एक क्षण के लिए"],

].map(function(param ) {
  const [country, message] = param;
  const translate = `https://translate.google.com/#auto/auto/${encodeURIComponent(message)}`;
  return `<${translate}|:flag-${country}:> _${message}..._`;
});

export abstract class FancyReplier {

  public replyContext: ReplyContext;
  private loadingMessage: any;

  constructor(replyContext: ReplyContext) {
    this.replyContext = replyContext;
  }

  public reply(obj: Message, cb?: any) {
    let sendableMsg: IRichMessage;

    if (typeof(obj) === "string") {
      sendableMsg = {text: obj};
    } else {
      sendableMsg = obj;
    }

    if (this.loadingMessage) {

      // Hacky stealth update of message to preserve chat order
      const params = {ts: this.loadingMessage.ts, channel: this.replyContext.sourceMessage.channel};

      const update = _.extend(params, sendableMsg);
      update.attachments = update.attachments ? JSON.stringify(update.attachments) : null;
      update.text = update.text || " ";
      update.parse = "none";

      this.replyContext.updateMessage(update);

    } else {
      this.replyContext.replyPublic(sendableMsg, cb);
    }
  }

  private startLoading(cb) {

    // Scheduled messages don't have a loading indicator, why distract everything?
    if (this.replyContext.scheduled) {
      cb();
      return;
    }

    let sass = this.replyContext.isSlashCommand() ?
      "…"
    :
      sassyMessages[Math.floor(Math.random() * sassyMessages.length)];

    if (config.unsafeLocalDev) {
      sass = `[DEVELOPMENT] ${sass}`;
    }

    const params = {
      text: sass,
      as_user: true,
      attachments: [], // Override some Botkit stuff
      unfurl_links: false,
      unfurl_media: false,
    };

    this.replyContext.replyPublic(params, (error, response) => {
      this.loadingMessage = response;
      cb();
    });
  }

  public start() {
    if (process.env.LOOKER_SLACKBOT_LOADING_MESSAGES !== "false") {
      this.startLoading(() => {
        this.performWork();
      });
    } else {
      this.performWork();
    }
  }

  private performWork() {
    const promise = this.work();
    if (promise) {
      promise.catch((err) => this.replyError(err));
    }
  }

  protected replyError(response) {
    console.error(response);
    if ((response != null ? response.error : undefined)) {
      this.reply(`:warning: ${response.error}`);
    } else if ((response != null ? response.message : undefined)) {
      this.reply(`:warning: ${response.message}`);
    } else {
      this.reply(`:warning: Something unexpected went wrong: ${JSON.stringify(response)}`);
    }
  }

  protected abstract async work();

}
