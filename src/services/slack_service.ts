import * as express from "express"
import * as _ from "underscore"

import config from "../config"
import { Listener } from "../listeners/listener"
import { SlackActionListener } from "../listeners/slack_action_listener"
import { SlackEventListener } from "../listeners/slack_event_listener"
import { Looker } from "../looker"
import { Message, SentMessage } from "../message"
import { ReplyContext } from "../reply_context"
import { SlackUtils } from "../slack_utils"
import { IChannel, Service } from "./service"

const botkit = require("botkit")
const getUrls = require("get-urls")

export class SlackService extends Service {

  private controller: any
  private defaultBot: any

  public async usableChannels() {
    let channels = await this.usablePublicChannels()
    channels = channels.concat(await this.usableDMs())
    return channels
  }

  public replyContextForChannelId(id: string): ReplyContext {
    return new ReplyContext(this.defaultBot, this.defaultBot, {channel: id} as SentMessage)
  }

  protected start() {

    this.controller = botkit.slackbot({
      debug: config.debugMode,
    })

    this.defaultBot = this.controller.spawn({
      retry: 10,
      token: config.slackApiKey,
    }).startRTM()

    // This is a workaround to how Botkit handles teams, but this server manages only a single team.

    this.defaultBot.api.team.info({}, (err: any, response: any) => {
      if (response != null ? response.ok : undefined) {
        this.controller.saveTeam(response.team, () => console.log("Saved the team information..."))
      } else {
        throw new Error(`Could not connect to the Slack API. Ensure your Slack API key is correct. (${err})`)
      }
    })

    this.controller.setupWebserver(process.env.PORT || 3333,
      (err: any, expressWebserver: express.Application) => {

        this.controller.createWebhookEndpoints(expressWebserver)
        super.setWebserver(expressWebserver)

        if (SlackUtils.slackButtonsEnabled) {
          const actionListener = new SlackActionListener(expressWebserver, this, Looker.all)
          actionListener.bot = this.defaultBot
          this.startListener(actionListener)
        } else {
          console.log("Slack buttons are disabled or not configured.")
        }

        const eventListener = new SlackEventListener(expressWebserver, this, Looker.all)
        this.startListener(eventListener)

    })

    // Listen to the various events

    const processCommand = (bot: any, message: SentMessage, isDM = false) => {
      const context = new ReplyContext(this.defaultBot, bot, message)
      context.isDM = isDM
      this.ensureUserAuthorized(context, () => {
        this.messageHandler(context)
      })
    }

    this.controller.on("rtm_reconnect_failed", () => {
      throw new Error("Failed to reconnect to the Slack RTM API.")
    })

    this.controller.on("slash_command", (bot: any, message: SentMessage) => {
      if (!SlackUtils.checkToken(bot, message)) { return }
      processCommand(bot, message)
    })

    this.controller.on("direct_mention", (bot: any, message: SentMessage) => {
      message.text = SlackUtils.stripMessageText(message.text)
      processCommand(bot, message)
    })

    this.controller.on("direct_message", (bot: any, message: SentMessage) => {
      if (message.text.indexOf("/") !== 0) {
        message.text = SlackUtils.stripMessageText(message.text)
        processCommand(bot, message, true)
      }
    })

    this.controller.on("ambient", (bot: any, message: SentMessage) => {

      if (!message.text || (message.subtype === "bot_message")) { return }

      if (process.env.LOOKER_SLACKBOT_EXPAND_URLS !== "true") { return }

      const context = new ReplyContext(this.defaultBot, bot, message)

      this.ensureUserAuthorized(context, () => {
        // URL Expansion
        getUrls(message.text).forEach((url: string) => {
          this.urlHandler(context, url.replace("%3E", ""))
        })
      }
      , {silent: true})
    })

  }

  private usablePublicChannels() {
    return new Promise<IChannel[]>((resolve, reject) => {
      this.defaultBot.api.channels.list({
        exclude_archived: 1,
        exclude_members: 1,
      }, (err: any, response: any) => {
        if (err || !response.ok) {
          reject(err)
        } else {
          let channels = response.channels.filter((c: any) => c.is_member && !c.is_archived)
          channels = _.sortBy(channels, "name")
          const reformatted: IChannel[] = channels.map((channel: any) => ({id: channel.id, label: `#${channel.name}`}))
          resolve(reformatted)
        }
      })
    })
  }

  private usableDMs() {
    return new Promise<IChannel[]>((resolve, reject) => {
      this.defaultBot.api.users.list({}, (err: any, response: any) => {
        if (err || !response.ok) {
          reject(err)
        } else {
          let users = response.members.filter((u: any) => {
            return !u.is_restricted && !u.is_ultra_restricted && !u.is_bot && !u.is_app_user && !u.deleted
          })
          users = _.sortBy(users, "name")
          const reformatted: IChannel[] = users.map((user: any) => ({id: user.id, label: `@${user.name}`}))
          resolve(reformatted)
        }
      })
    })
  }

  private ensureUserAuthorized(
    context: ReplyContext,
    callback: () => void,
    options: {silent: boolean} = {silent: false},
  ) {

    const reply = (text: string) => {
      if (!options.silent) {
        context.replyPrivate({text})
      }
    }

    this.defaultBot.api.users.info({user: context.sourceMessage.user}, (error: any, response: any) => {
      if (error || !response.user) {
        reply(`Could not fetch your user info from Slack. ${error || ""}`)
      } else {
        const user = response.user
        if (!config.enableGuestUsers && (user.is_restricted || user.is_ultra_restricted)) {
          reply(`Sorry @${user.name}, as a guest user you're not able to use this command.`)
        } else if (!config.enableSharedWorkspaces && user.team_id !== this.defaultBot.team_info.id) {
          reply(`Sorry @${user.name}, as a user from another workspace you're not able to use this command.`)
        } else if (user.is_stranger) {
          reply(`Sorry @${user.name}, as a user from another workspace you're not able to use this command.`)
        } else if (user.is_bot || user.is_app_user) {
          reply(`Sorry @${user.name}, as a bot you're not able to use this command.`)
        } else {
          callback()
        }
      }
    })

  }

}
