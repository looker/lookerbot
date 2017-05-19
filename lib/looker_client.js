// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
let LookerAPIClient;
import request from "request";
import _ from "underscore";
import npmPackage from './../package.json';
import crypto from "crypto";

export default (LookerAPIClient = class LookerAPIClient {

  constructor(options) {
    this.options = options;
    this.fetchAccessToken();
  }

  reachable() {
    return (this.token != null);
  }

  request(requestConfig, successCallback, errorCallback, replyContext) {

    if (!this.reachable()) {
      errorCallback({error: `Looker ${this.options.baseUrl} not reachable.\n${this.tokenError || ""}`});
      return;
    }

    let msg = replyContext != null ? replyContext.sourceMessage : undefined;
    let metadata = "";
    if (msg != null ? msg.user : undefined) {
      metadata += ` user=${this._sha(msg.user)}`;
    }
    if (msg != null ? msg.team : undefined) {
      metadata += ` team=${this._sha(msg.team)}`;
    }
    if (msg != null ? msg.channel : undefined) {
      metadata += ` channel=${this._sha(msg.channel)}`;
      metadata += ` channel_type=${msg.channel[0]}`;
    }
    if (replyContext) {
      metadata += ` slash=${replyContext.isSlashCommand()}`;
    }

    requestConfig.url = `${this.options.baseUrl}/${requestConfig.path}`;
    let headers = {
      Authorization: `token ${this.token}`,
      "User-Agent": `looker-slackbot/${npmPackage.version}${metadata}`
    };
    requestConfig.headers = _.extend(headers, requestConfig.headers || {});
    return request(requestConfig, (error, response, body) => {
      if (error) {
        return (typeof errorCallback === 'function' ? errorCallback(error) : undefined);
      } else if (response.statusCode === 200) {
        if (response.headers['content-type'].indexOf("application/json") !== -1) {
          return (typeof successCallback === 'function' ? successCallback(JSON.parse(body)) : undefined);
        } else {
          return (typeof successCallback === 'function' ? successCallback(body) : undefined);
        }
      } else {
        try {
          if (Buffer.isBuffer(body) && (body.length === 0)) {
            return (typeof errorCallback === 'function' ? errorCallback({error: "Received empty response from Looker."}) : undefined);
          } else {
            return (typeof errorCallback === 'function' ? errorCallback(JSON.parse(body)) : undefined);
          }
        } catch (error1) {
          console.error("JSON parse failed:");
          console.error(body);
          return errorCallback({error: "Couldn't parse Looker response. The server may be offline."});
        }
      }
    });
  }

  get(path, successCallback, errorCallback, options, replyContext) {
    return this.request(_.extend({method: "GET", path}, options || {}), successCallback, errorCallback, replyContext);
  }

  post(path, body, successCallback, errorCallback, replyContext) {
    return this.request(
      {
        method: "POST",
        path,
        body: JSON.stringify(body),
        headers: {
          "content-type": "application/json"
        }
      },
      successCallback,
      errorCallback,
      replyContext
    );
  }

  fetchAccessToken() {

    let options = {
      method: "POST",
      url: `${this.options.baseUrl}/login`,
      form: {
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret
      }
    };

    return request(options, (error, response, body) => {
      this.tokenError = null;
      if (error) {
        console.warn(`Couldn't fetchAccessToken for Looker ${this.options.baseUrl}: ${error}`);
        this.tokenError = error;
        this.token = null;
      } else if (response.statusCode === 200) {
        let json = JSON.parse(body);
        this.token = json.access_token;
        console.log(`Updated API token for ${this.options.baseUrl}`);
      } else {
        this.token = null;
        console.warn(`Failed fetchAccessToken for Looker ${this.options.baseUrl}: ${body}`);
      }
      return (typeof this.options.afterConnect === 'function' ? this.options.afterConnect() : undefined);
    });
  }

  _sha(text) {
    let shasum = crypto.createHash("sha1");
    shasum.update(text);
    return shasum.digest("hex");
  }
});
