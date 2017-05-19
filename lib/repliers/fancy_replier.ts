import * as _ from "underscore";
import config from "../config";
import ReplyContext from "../reply_context";

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
  let [country, message] = param;
  let translate = `https://translate.google.com/#auto/auto/${encodeURIComponent(message)}`;
  return `<${translate}|:flag-${country}:> _${message}..._`;
});

export default abstract class FancyReplier {

  replyContext: ReplyContext;
  loadingMessage: any;

  constructor(replyContext) {
    this.replyContext = replyContext;
  }

  reply(obj, cb = undefined) {
    if (this.loadingMessage) {

      // Hacky stealth update of message to preserve chat order

      if (typeof(obj) === "string") {
        obj = {text: obj, channel: this.replyContext.sourceMessage.channel};
      }

      let params = {ts: this.loadingMessage.ts, channel: this.replyContext.sourceMessage.channel};

      let update = _.extend(params, obj);
      update.attachments = update.attachments ? JSON.stringify(update.attachments) : null;
      update.text = update.text || " ";
      update.parse = "none";

      return this.replyContext.defaultBot.api.chat.update(update);

    } else {
      return this.replyContext.replyPublic(obj, cb);
    }
  }

  startLoading(cb) {

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

    let params = {
      text: sass,
      as_user: true,
      attachments: [], // Override some Botkit stuff
      unfurl_links: false,
      unfurl_media: false,
    };

    return this.replyContext.replyPublic(params, (error, response) => {
      this.loadingMessage = response;
      return cb();
    });
  }

  start() {
    if (process.env.LOOKER_SLACKBOT_LOADING_MESSAGES !== "false") {
      return this.startLoading(() => {
        return this.work();
      });
    } else {
      return this.work();
    }
  }

  replyError(response) {
    console.error(response);
    if ((response != null ? response.error : undefined)) {
      return this.reply(`:warning: ${response.error}`);
    } else if ((response != null ? response.message : undefined)) {
      return this.reply(`:warning: ${response.message}`);
    } else {
      return this.reply(`:warning: Something unexpected went wrong: ${JSON.stringify(response)}`);
    }
  }

  abstract work(): void;

}
