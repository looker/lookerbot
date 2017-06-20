import * as express from "express"

import config from "../config"
import { Message, SentMessage } from "../message"
import { IChannel, Service } from "./service"
import { ReplyContext } from "../reply_context"
import * as rp from "request-promise"

const Hipchatter = require("hipchatter")

export class HipchatService extends Service {

  public usableChannels() {
    return Promise.resolve<IChannel[]>([])
  }

  public replyContextForChannelId(id: string): ReplyContext {
    return new ReplyContext(null, null, {channel: id} as SentMessage)
  }

  private server: express.Application
  private hipchatter: any

  protected start() {
    this.server = express()
    super.attachListeners(this.server)

    this.hipchatter = new Hipchatter(config.hipchatAuthToken)

    this.hipchatter.capabilities(function(err: any, capabilities: any){
      console.log(capabilities.capabilities.hipchatApiProvider.availableScopes);
    });

    this.hipchatter.rooms((err: any, rooms: any) => {
      console.log(err)
      console.log(rooms)
    })

  }

}
