import * as express from "express"
import config from "../config"
import { Looker } from "../looker"
import { Service } from "../services/service"

const TOKEN_REGEX = new RegExp(/[T|t]oken token="(.*)"/)

export class Listener {

  constructor(
    protected server: express.Application,
    protected service: Service,
    protected lookers: Looker[],
  ) {
    this.server = server
    this.service = service
    this.lookers = lookers
  }

  public listen() { throw new Error("implement") }

  protected validateToken(req: express.Request, res: express.Response) {
    if (this.usesNewTokenAuth(req)) {
      const tokenMatch = req.headers.authorization.match(TOKEN_REGEX)
      if (tokenMatch && config.lookerbotAuthorizationToken === tokenMatch[1]) {
        return true
      } else {
        this.replyBadAuth(res)
        return false
      }
    } else {
      return this.validateLegacyWebhookToken(req, res)
    }
  }

  protected validateTokenForLooker(req: express.Request, res: express.Response, looker: Looker) {
    if (this.usesNewTokenAuth(req)) {
      return this.validateToken(req, res)
    }
    if (!req.headers["x-looker-webhook-token"]) {
      this.replyBadAuth(res)
      return false
    }
    const value = req.headers["x-looker-webhook-token"] === looker.webhookToken
    if (!value) {
      this.replyBadAuth(res)
    }
    return value
  }

  protected reply(res: express.Response, json: any, code = 200) {
    res.status(code)
    res.json(json)
    console.log(`Replied to ${this.constructor.name}.`, json)
  }

  private usesNewTokenAuth(req: express.Request) {
    return req.headers.authorization && config.lookerbotAuthorizationToken
  }

  private replyBadAuth(res: express.Response) {
    this.reply(res, {looker: {success: false}, reason: "Invalid authorization headers."}, 401)
  }

  private validateLegacyWebhookToken(req: express.Request, res: express.Response) {
    if (!req.headers["x-looker-webhook-token"]) {
      this.replyBadAuth(res)
      return false
    }
    if (this.lookers.map((l) => l.webhookToken).indexOf(req.headers["x-looker-webhook-token"]) === -1) {
      this.replyBadAuth(res)
      return false
    }
    return true
  }

}
