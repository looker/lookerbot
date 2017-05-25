import * as express from "express";
import config from "../config";
import { Listener } from "../listeners/listener";
import Looker from "../looker";
import { Message, SentMessage } from "../message";
import ReplyContext from "../reply_context";
import SlackUtils from "../slack_utils";

const botkit = require("botkit");
const getUrls = require("get-urls");

export default class SlackService {

  private listeners: Array<typeof Listener>;
  private runningListeners: Listener[];
  private messageHandler: (context: ReplyContext) => void;
  private urlHandler: (context: ReplyContext, url: string) => void;
  private controller: any;
  private defaultBot: any;

  constructor(opts: {
    listeners: Array<typeof Listener>,
    messageHandler: (context: ReplyContext) => void,
    urlHandler: (context: ReplyContext, url: string) => void,
  }) {
    this.listeners = opts.listeners;
    this.messageHandler = opts.messageHandler;
    this.urlHandler = opts.urlHandler;
  }

  public begin() {

    this.controller = botkit.slackbot({
      debug: config.debugMode,
    });

    this.defaultBot = this.controller.spawn({
      retry: 10,
      token: config.slackApiKey,
    }).startRTM();

    // This is a workaround to how Botkit handles teams, but this server manages only a single team.

    this.defaultBot.api.team.info({}, (err: any, response: any) => {
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

    this.controller.setupWebserver(process.env.PORT || 3333,
      (err: any, expressWebserver: express.Application) => {
        this.controller.createWebhookEndpoints(expressWebserver);

        for (const listener of this.listeners) {
          const instance = new listener(expressWebserver, this.defaultBot, Looker.all);
          instance.listen();
          this.runningListeners.push(instance);
        }
    });

    // Listen to the various events

    const processCommand = (bot: any, message: SentMessage, isDM = false) => {
      const context = new ReplyContext(this.defaultBot, bot, message);
      context.isDM = isDM;
      this.ensureUserAuthorized(context, () => {
        this.messageHandler(context);
      });
    };

    this.controller.on("rtm_reconnect_failed", () => {
      throw new Error("Failed to reconnect to the Slack RTM API.");
    });

    this.controller.on("slash_command", (bot: any, message: SentMessage) => {
      if (!SlackUtils.checkToken(bot, message)) { return; }
      processCommand(bot, message);
    });

    this.controller.on("direct_mention", (bot: any, message: SentMessage) => {
      message.text = SlackUtils.stripMessageText(message.text);
      processCommand(bot, message);
    });

    this.controller.on("direct_message", (bot: any, message: SentMessage) => {
      if (message.text.indexOf("/") !== 0) {
        message.text = SlackUtils.stripMessageText(message.text);
        processCommand(bot, message, true);
      }
    });

    this.controller.on("ambient", (bot: any, message: SentMessage) => {

      if (!message.text || (message.subtype === "bot_message")) { return; }

      if (process.env.LOOKER_SLACKBOT_EXPAND_URLS !== "true") { return; }

      const context = new ReplyContext(this.defaultBot, bot, message);

      this.ensureUserAuthorized(context, () => {
        // URL Expansion
        getUrls(message.text).forEach((url: string) => {
          this.urlHandler(context, url.replace("%3E", ""));
        });
      }
      , {silent: true});
    });

  }

  private ensureUserAuthorized(
    context: ReplyContext,
    callback: () => void,
    options: {silent: boolean} = {silent: false},
  ) {

    const reply = (text: string) => {
      if (!options.silent) {
        context.replyPrivate({text});
      }
    };

    this.defaultBot.api.users.info({user: context.sourceMessage.user}, (error: any, response: any) => {
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
