import * as express from "express"

import { Listener } from "../listeners/listener"
import { Looker } from "../looker"
import { ReplyContext } from "../reply_context"

export interface IChannel {
  id: string,
  label: string,
}

export abstract class Service {

  protected listeners: Array<typeof Listener>
  protected messageHandler: (context: ReplyContext) => void
  protected urlHandler: (context: ReplyContext, url: string) => void
  private runningListeners: Listener[] = []

  public begin(opts: {
    listeners: Array<typeof Listener>,
    messageHandler: (context: ReplyContext) => void,
    urlHandler: (context: ReplyContext, url: string) => void,
  }) {
    this.listeners = opts.listeners
    this.messageHandler = opts.messageHandler
    this.urlHandler = opts.urlHandler
    this.start()
  }

  public abstract usableChannels(): Promise<IChannel[]>

  public abstract replyContextForChannelId(id: string): ReplyContext

  protected abstract start(): void

  protected attachListeners(expressWebserver: express.Application) {
    for (const listener of this.listeners) {
      const instance = new listener(expressWebserver, this, Looker.all)
      instance.listen()
      this.runningListeners.push(instance)
    }
  }

}
