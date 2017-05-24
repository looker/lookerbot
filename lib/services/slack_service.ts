import * as Botkit from "botkit";
import getUrls from "get-urls";
import config from "../config";
import Looker from "../looker";
import ReplyContext from "../reply_context";
import SlackUtils from "../slack_utils";

import Listener from "../listeners/listener";

export default class SlackService {

  private listeners: Array<typeof Listener>;
  private runningListeners: Listener[];
  private messageHandler: (context: ReplyContext) => void;
  private urlHandler: (context: ReplyContext, url: string) => void;
  private controller: any;
  private defaultBot: any;

  constructor(opts) {
    this.listeners = opts.listeners;
    this.messageHandler = opts.messageHandler;
    this.urlHandler = opts.urlHandler;
  }

  public begin() {

    let context;
    this.controller = Botkit.slackbot({
      debug: config.debugMode,
    });

    this.defaultBot = this.controller.spawn({
      retry: 10,
      token: config.slackApiKey,
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

    const processCommand = (bot, message, isDM = false) => {
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

    this.controller.on("ambient", (bot, message) => {

      if (!message.text || (message.subtype === "bot_message")) { return; }

      if (process.env.LOOKER_SLACKBOT_EXPAND_URLS !== "true") { return; }

      context = new ReplyContext(this.defaultBot, bot, message);

      return this.ensureUserAuthorized(context, () => {
        // URL Expansion
        const urls = getUrls(message.text).map((url) => url.replace("%3E", ""));
        urls.forEach((url) => {
          this.urlHandler(context, url);
        });
      }
      , {silent: true});
    });

  }

  private ensureUserAuthorized(
    context: ReplyContext,
    callback,
    options: {silent: boolean} = {silent: false},
  ) {

    const reply = (text: string) => {
      if (!options.silent) {
        context.replyPrivate({text});
      }
    };

    this.defaultBot.api.users.info({user: context.sourceMessage.user}, (error, response) => {
      if (error || !response.user) {
        reply(`Could not fetch your user info from Slack. ${error || ""}`);
      } else {
        const user = response.user;
        if (!config.enableGuestUsers && (user.is_restricted || user.is_ultra_restricted)) {
          reply(`Sorry @${user.name}, as a guest user you're not able to use this command.`);
        } else if (user.is_bot) {
          reply(`Sorry @${user.name}, as a bot you're not able to use this command.`);
        } else {
          callback();
        }
      }
    });

  }

}
