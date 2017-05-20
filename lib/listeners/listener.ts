import * as express from "express";
import Looker from "../looker";

export default class Listener {

  server: express.Application;
  bot: any;
  lookers: Looker[];

  constructor(server, bot, lookers) {
    this.server = server;
    this.bot = bot;
    this.lookers = lookers;
  }

  validateToken(req, res) {
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

  validateTokenForLooker(req, res, looker) {
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

  reply(res, json) {
    res.json(json);
    console.log(`Replied to ${this.type()}.`, json);
  }

  type(): string { throw "implement"; };
  listen() { throw "implement"; };

}
