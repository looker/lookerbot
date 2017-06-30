import * as express from "express"

import * as rp from "request-promise"
import config from "../config"
import { Message, SentMessage } from "../message"
import { ReplyContext } from "../reply_context"
import { IChannel, Service } from "./service"

const hipchatter = require("hipchatter")

export class HipchatService extends Service {

  private server: express.Application
  private client: any

  public usableChannels() {
    return Promise.resolve<IChannel[]>([])
  }

  public replyContextForChannelId(id: string): ReplyContext {
    return new ReplyContext(null, null, {channel: id} as SentMessage)
  }

  protected start() {
    this.server = express()
    super.setWebserver(this.server)

    this.client = new hipchatter(config.hipchatAuthToken)

    this.client.capabilities((err: any, capabilities: any) => {
      console.log(capabilities.capabilities.hipchatApiProvider.availableScopes)
    })

    this.client.rooms((err: any, rooms: any) => {
      console.log(err)
      console.log(rooms)
    })

  }

}
