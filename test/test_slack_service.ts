import { expect } from "chai"
import "mocha"
import * as sinon from "sinon"
import { ReplyContext } from "../src/reply_context"
import { SlackService } from "../src/services/slack_service"
const botkit = require("botkit")

describe("Slack Service", () => {
  let webClient: any

  beforeEach(() => {
    const bot = {
      startRTM: () => ({
        api: {
          // https://api.slack.com/types/channel
          channels: {
            list: (opts: {}, fn: (err: any, response: any) => any) => {
              return fn(null, {
                channels: [
                  {
                    created: 1449709280,
                    creator: "U0G9QF9C6",
                    id: "C0G9QF9GW",
                    is_archived: false,
                    is_channel: true,
                    is_general: false,
                    is_member: true,
                    is_mpim: false,
                    is_org_shared: false,
                    is_private: false,
                    is_shared: false,
                    members: [
                      "U0G9QF9C6",
                      "U0G9WFXNZ",
                    ],
                    name: "random",
                    name_normalized: "random",
                    num_members: 2,
                    previous_names: [],
                  },
                  {
                    created: 1449709280,
                    creator: "U0G9QF9C6",
                    id: "C0G9QKBBL",
                    is_archived: false,
                    is_channel: true,
                    is_general: true,
                    is_member: true,
                    is_mpim: false,
                    is_org_shared: false,
                    is_private: false,
                    is_shared: false,
                    members: [
                      "U0G9QF9C6",
                      "U0G9WFXNZ",
                    ],
                    name: "general",
                    name_normalized: "general",
                    num_members: 2,
                    previous_names: [],
                  },
                ],
                ok: true,
                response_metadata: {
                  next_cursor: "dGVhbTpDMUg5UkVTR0w=",
                },
              })
            },
          },
          // https://api.slack.com/methods/users.list
          users: {
            list: (opts: {}, fn: (err: any, response: any) => any) => {
              return fn(null, {
                cache_ts: 1498777272,
                members: [
                  {
                    color: "9f69e7",
                    deleted: false,
                    has_2fa: false,
                    id: "W012A3CDE",
                    is_admin: true,
                    is_app_user: false,
                    is_bot: false,
                    is_owner: false,
                    is_primary_owner: false,
                    is_restricted: false,
                    is_ultra_restricted: false,
                    name: "spengler",
                    team_id: "T012AB3C4",
                    updated: 1502138686,
                    real_name: "spengler",
                    profile: {
                      avatar_hash: "ge3b51ca72de",
                      display_name: "spengler",
                      display_name_normalized: "spengler",
                      email: "spengler@ghostbusters.example.com",
                      image_24: "https://.../avatar/e3b51ca72dee4ef87916ae2b9240df50.jpg",
                      image_32: "https://.../avatar/e3b51ca72dee4ef87916ae2b9240df50.jpg",
                      image_48: "https://.../avatar/e3b51ca72dee4ef87916ae2b9240df50.jpg",
                      image_72: "https://.../avatar/e3b51ca72dee4ef87916ae2b9240df50.jpg",
                      real_name: "Egon Spengler",
                      real_name_normalized: "Egon Spengler",
                      status_emoji: ":books:",
                      status_text: "Print is dead",
                      team: "T012AB3C4",
                    },
                  },
                  {
                    id: "W07QCRPA4",
                    team_id: "T0G9PQBBK",
                    name: "glinda",
                    deleted: false,
                    color: "9f69e7",
                    real_name: "Glinda Southgood",
                    tz: "America/Los_Angeles",
                    tz_label: "Pacific Daylight Time",
                    tz_offset: -25200,
                    profile: {
                      avatar_hash: "8fbdd10b41c6",
                      image_24: "https://a.slack-edge.com...png",
                      image_32: "https://a.slack-edge.com...png",
                      image_48: "https://a.slack-edge.com...png",
                      image_72: "https://a.slack-edge.com...png",
                      image_192: "https://a.slack-edge.com...png",
                      image_512: "https://a.slack-edge.com...png",
                      image_1024: "https://a.slack-edge.com...png",
                      image_original: "https://a.slack-edge.com...png",
                      first_name: "Glinda",
                      last_name: "Southgood",
                      title: "Glinda the Good",
                      phone: "",
                      skype: "",
                      real_name: "Glinda Southgood",
                      real_name_normalized: "Glinda Southgood",
                      display_name: "Glinda the Fairly Good",
                      display_name_normalized: "Glinda the Fairly Good",
                      email: "glenda@south.oz.coven",
                    },
                    is_admin: true,
                    is_owner: false,
                    is_primary_owner: false,
                    is_restricted: false,
                    is_ultra_restricted: false,
                    is_bot: false,
                    updated: 1480527098,
                    has_2fa: false,
                  },
                ],
                ok: true,
                response_metadata: {
                  next_cursor: "dXNlcjpVMEc5V0ZYTlo=",
                },
              })
            },
          },
          // https://api.slack.com/methods/team.info
          team: {
            info: sinon.stub().returns({
              ok: true,
              team: {
                domain: "example",
                email_domain: "example.com",
                enterprise_id: "E1234A12AB",
                enterprise_name: "Umbrella Corporation",
                icon: {
                  image_34: "https://...",
                  image_44: "https://...",
                  image_68: "https://...",
                  image_88: "https://...",
                  image_default: true,
                },
                id: "T12345",
                name: "My Team",
              },
            }),
          },
        },
      }),
    }
    webClient = {
      conversations: {
        // https://api.slack.com/methods/conversations.list
        list: async () => ({
          ok: true,
          channels: [
            {
              id: "C0G9QKBBL",
              name: "general",
              is_channel: true,
              is_group: false,
              is_im: false,
              created: 1449252889,
              creator: "U012A3CDE",
              is_archived: false,
              is_general: true,
              unlinked: 0,
              name_normalized: "general",
              is_shared: false,
              is_ext_shared: false,
              is_org_shared: false,
              pending_shared: [],
              is_pending_ext_shared: false,
              is_member: true,
              is_private: false,
              is_mpim: false,
              previous_names: [],
              num_members: 4,
            },
            {
              id: "C0G9QF9GW",
              name: "random",
              is_channel: true,
              is_group: false,
              is_im: false,
              created: 1449252889,
              creator: "U061F7AUR",
              is_archived: false,
              is_general: false,
              unlinked: 0,
              name_normalized: "random",
              is_shared: false,
              is_ext_shared: false,
              is_org_shared: false,
              pending_shared: [],
              is_pending_ext_shared: false,
              is_member: true,
              is_private: false,
              is_mpim: false,
              previous_names: [],
              num_members: 4,
            },
          ],
          response_metadata: {
            next_cursor: "dGVhbTpDMDYxRkE1UEI=",
          },
        }),
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
