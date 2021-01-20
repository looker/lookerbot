import { expect } from "chai"
import "mocha"
import * as sinon from "sinon"
import { ReplyContext } from "../src/reply_context"
import { SlackService } from "../src/services/slack_service"
const channelsListJson = require("./slack/channels_list.json")
const conversationsListJson = require("./slack/conversations_list.json")
const teamInfoJson = require("./slack/team_info.json")
const usersListJson = require("./slack/users_list.json")
const botkit = require("botkit")

describe("Slack Service", () => {
  let webClient: any

  beforeEach(() => {
    const bot = {
      startRTM: () => ({
        api: {
          channels: {
            // https://api.slack.com/methods/channels.list
            list: (opts: {}, fn: (err: any, response: any) => any) => {
              return fn(null, channelsListJson)
            },
          },
          users: {
            // https://api.slack.com/methods/users.list
            list: (opts: {}, fn: (err: any, response: any) => any) => {
              return fn(null, usersListJson)
            },
          },
          // https://api.slack.com/methods/team.info
          team: {
            info: sinon.stub().returns(teamInfoJson),
          },
        },
      }),
    }
    webClient = {
      conversations: {
        // https://api.slack.com/methods/conversations.list
        list: async () => conversationsListJson,
      },
    }
    const slackbot = {
      on: sinon.stub().returns({}),
      setupWebserver: sinon.stub().returns({}),
      spawn: sinon.stub().returns(bot),
    }

    sinon.stub(botkit, "slackbot").returns(slackbot)
  })

  it("usableChannels works", async () => {
    const service = new SlackService()
    sinon.stub(service, "getSlackWebClient" as any).returns(webClient)
    service.begin({
      listeners: [],
      messageHandler: (context: ReplyContext) => undefined,
      urlHandler: (context: ReplyContext, url: string) => undefined,
    })
    const result = await service.usableChannels()
    expect(result.length).to.equal(4)
    expect(result).to.deep.equal([
      { id: "C0G9QKBBL", label: "#general" },
      { id: "C0G9QF9GW", label: "#random" },
      { id: "W07QCRPA4", label: "@glinda" },
      { id: "W012A3CDE", label: "@spengler" },
    ])
 })
})
