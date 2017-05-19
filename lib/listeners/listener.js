// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
class Listener {

  constructor(server, bot, lookers) {
    this.server = server;
    this.bot = bot;
    this.lookers = lookers;
  }

  validateToken(req, res) {
    if (!req.headers['x-looker-webhook-token']) {
      this.reply(res, {looker: {success: false}, reason: "No x-looker-webhook-token token provided."});
      return false;
    }
    if (this.lookers.map(l => l.webhookToken).indexOf(req.headers['x-looker-webhook-token']) === -1) {
      this.reply(res, {looker: {success: false}, reason: "Invalid x-looker-webhook-token."});
      return false;
    }
    return true;
  }

  validateTokenForLooker(req, looker) {
    if (!req.headers['x-looker-webhook-token']) {
      this.reply(res, {looker: {success: false}, reason: "No x-looker-webhook-token token provided."});
      return false;
    }
    let value = req.headers['x-looker-webhook-token'] === looker.webhookToken;
    if (!value) {
      this.reply(res, {looker: {success: false}, reason: "Invalid x-looker-webhook-token."});
    }
    return value;
  }

  reply(res, json) {
    res.json(json);
    return console.log(`Replied to ${this.type()}.`, json);
  }

  type() {
    return "url listener";
  }
}

export default Listener;
