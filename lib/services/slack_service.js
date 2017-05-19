// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
let SlackService;
import config from "../config";
import Looker from "../looker";
import Botkit from "botkit";
import SlackUtils from "../slack_utils";
import getUrls from 'get-urls';
import ReplyContext from '../reply_context';

export default (SlackService = class SlackService {

  constructor(opts) {
    this.listeners = opts.listeners;
    this.messageHandler = opts.messageHandler;
    this.urlHandler = opts.urlHandler;
  }

  begin() {

    let context;
    this.controller = Botkit.slackbot({
      debug: config.debugMode
    });

    this.defaultBot = this.controller.spawn({
      token: config.slackApiKey,
      retry: 10,
    }).startRTM();

    // This is a workaround to how Botkit handles teams, but this server manages only a single team.

    this.defaultBot.api.team.info({}, (err, response) => {
      if (response != null ? response.ok : undefined) {
        return this.controller.saveTeam(response.team, () => console.log("Saved the team information..."));
      } else {
        throw new Error(`Could not connect to the Slack API. Ensure your Slack API key is correct. (${err})`);
      }
    });

    // Attach listeners. This should move elsewhere.
    // Botkit builds its own webserver to handle slash commands, but this is an annoyance.
    // Probably excising botkit is best.

    this.runningListeners = [];

    this.controller.setupWebserver(process.env.PORT || 3333, (err, expressWebserver) => {
      let instance;
      this.controller.createWebhookEndpoints(expressWebserver);

      return Array.from(this.listeners).map((listener) =>
        ((instance = new listener(expressWebserver, this.defaultBot, Looker.all)),
        instance.listen(),

        this.runningListeners.push(instance)));
    });

    // Listen to the various events

    let processCommand = (bot, message, isDM) => {
      if (isDM == null) { isDM = false; }
      context = new ReplyContext(this.defaultBot, bot, message);
      context.isDM = isDM;
      return this.ensureUserAuthorized(context, () => {
        return this.messageHandler(context);
      });
    };

    this.controller.on("rtm_reconnect_failed", () => {
      throw new Error("Failed to reconnect to the Slack RTM API.");
    });

    this.controller.on("slash_command", (bot, message) => {
      if (!SlackUtils.checkToken(bot, message)) { return; }
      return processCommand(bot, message);
    });

    this.controller.on("direct_mention", (bot, message) => {
      message.text = SlackUtils.stripMessageText(message.text);
      return processCommand(bot, message);
    });

    this.controller.on("direct_message", (bot, message) => {
      if (message.text.indexOf("/") !== 0) {
        message.text = SlackUtils.stripMessageText(message.text);
        return processCommand(bot, message, true);
      }
    });

    this.controller.on('ambient', (bot, message) => {

      if (!message.text || (message.subtype === "bot_message")) { return; }

      if (process.env.LOOKER_SLACKBOT_EXPAND_URLS !== "true") { return; }

      context = new ReplyContext(this.defaultBot, bot, message);
      context.isDM = isDM;

      return this.ensureUserAuthorized(context, () => {
        // URL Expansion
        return Array.from(getUrls(message.text).map(url => url.replace("%3E", ""))).map((url) =>
          this.urlHandler(context, url));
      }
      , {silent: true});
    });

  }

  ensureUserAuthorized(context, callback, options) {

    if (options == null) { options = {}; }
    if (options.silent) {
      context = null;
    }

    this.defaultBot.api.users.info({user: context.sourceMessage.user}, function(error, response) {
      let user = response != null ? response.user : undefined;
      if (error || !user) {
        return (context != null ? context.replyPrivate({
          text: `Could not fetch your user info from Slack. ${error || ""}`
        }) : undefined);
      } else {
        if (!config.enableGuestUsers && (user.is_restricted || user.is_ultra_restricted)) {
          return (context != null ? context.replyPrivate({
            text: `Sorry @${user.name}, as a guest user you're not able to use this command.`
          }) : undefined);
        } else if (user.is_bot) {
          return (context != null ? context.replyPrivate({
            text: `Sorry @${user.name}, as a bot you're not able to use this command.`
          }) : undefined);
        } else {
          return callback();
        }
      }
    });

  }
});
