import * as express from "express";
import Looker from "../looker";

export default class Listener {

  protected server: express.Application;
  protected bot: any;
  protected lookers: Looker[];

  constructor(server, bot, lookers) {
    this.server = server;
    this.bot = bot;
    this.lookers = lookers;
  }

  public type(): string { throw new Error("implement"); }
  public listen() { throw new Error("implement"); }

  protected validateToken(req, res) {
    if (!req.headers["x-looker-webhook-token"]) {
      this.reply(res, {looker: {success: false}, reason: "No x-looker-webhook-token token provided."});
      return false;
    }
    if (this.lookers.map((l) => l.webhookToken).indexOf(req.headers["x-looker-webhook-token"]) === -1) {
      this.reply(res, {looker: {success: false}, reason: "Invalid x-looker-webhook-token."});
      return false;
    }
    return true;
  }

  protected validateTokenForLooker(req, res, looker) {
    if (!req.headers["x-looker-webhook-token"]) {
      this.reply(res, {looker: {success: false}, reason: "No x-looker-webhook-token token provided."});
      return false;
    }
    const value = req.headers["x-looker-webhook-token"] === looker.webhookToken;
    if (!value) {
      this.reply(res, {looker: {success: false}, reason: "Invalid x-looker-webhook-token."});
    }
    return value;
  }

  protected reply(res, json) {
    res.json(json);
    console.log(`Replied to ${this.type()}.`, json);
  }

}
