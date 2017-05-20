import * as crypto from "crypto";
import * as request from "request";
import * as _ from "underscore";
import config from "./config";
import ReplyContext from "./reply_context";

export type LookerRequestConfig = {
  method: string,
  path: string,
  replyContext?: ReplyContext,
  headers?: request.Headers,
  body?: any
};

export default class LookerAPIClient {

  options: {
    baseUrl: string,
    clientId: string,
    clientSecret: string,
    afterConnect?: () => void
  };
  token?: string;
  tokenError?: string;

  constructor(options) {
    this.options = options;
    this.fetchAccessToken();
  }

  reachable() {
    return (this.token != null);
  }

  request(
    requestConfig: LookerRequestConfig,
    successCallback?: any,
    errorCallback?: any,
    replyContext?: ReplyContext
  ) : void {

    if (!this.reachable()) {
      errorCallback({error: `Looker ${this.options.baseUrl} not reachable.\n${this.tokenError || ""}`});
      return;
    }

    let newConfig = {
      method: requestConfig.method,
      url: `${this.options.baseUrl}/${requestConfig.path}`,
      body: requestConfig.body,
      headers: {
        "Authorization": `token ${this.token}`,
        "User-Agent": `looker-slackbot/${config.npmPackage.version}${replyContext ? this.buildMetadata(replyContext) : ""}`,
      }
    };

    newConfig.headers = _.extend(newConfig.headers, requestConfig.headers || {});

    request(newConfig, (error, response, body) => {
      if (error) {
        errorCallback && errorCallback(error);
      } else if (response.statusCode === 200) {
        if (response.headers["content-type"].indexOf("application/json") !== -1) {
          successCallback && successCallback(JSON.parse(body));
        } else {
          successCallback && successCallback(body);
        }
      } else {
        try {
          if (Buffer.isBuffer(body) && (body.length === 0)) {
            errorCallback && errorCallback({error: "Received empty response from Looker."});
          } else {
            errorCallback && errorCallback(JSON.parse(body));
          }
        } catch (error1) {
          console.error("JSON parse failed:");
          console.error(body);
          errorCallback && errorCallback({error: "Couldn't parse Looker response. The server may be offline."});
        }
      }
    });

  }

  get(path: string, successCallback?: any, errorCallback?: any, options?: any, replyContext?: ReplyContext) {
    return this.request(_.extend({method: "GET", path}, options || {}), successCallback, errorCallback, replyContext);
  }

  post(path: string, body, successCallback?: any, errorCallback?: any, replyContext?: ReplyContext) {
    return this.request(
      {
        method: "POST",
        path,
        body: JSON.stringify(body),
        headers: {
          "content-type": "application/json",
        },
      },
      successCallback,
      errorCallback,
      replyContext,
    );
  }

  fetchAccessToken() {

    let options = {
      method: "POST",
      url: `${this.options.baseUrl}/login`,
      form: {
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
      },
    };

    request(options, (error, response, body) => {
      this.tokenError = undefined;
      if (error) {
        console.warn(`Couldn't fetchAccessToken for Looker ${this.options.baseUrl}: ${error}`);
        this.tokenError = error;
        this.token = undefined;
      } else if (response.statusCode === 200) {
        let json = JSON.parse(body);
        this.token = json.access_token;
        console.log(`Updated API token for ${this.options.baseUrl}`);
      } else {
        this.token = undefined;
        console.warn(`Failed fetchAccessToken for Looker ${this.options.baseUrl}: ${body}`);
      }

      if (this.options.afterConnect) {
        this.options.afterConnect();
      }

    });
  }

  private buildMetadata(context: ReplyContext) {
    let msg = context.sourceMessage;
    let metadata = "";
    if (msg.user) {
      metadata += ` user=${this.sha(msg.user)}`;
    }
    if (msg.team) {
      metadata += ` team=${this.sha(msg.team)}`;
    }
    if (msg.channel) {
      metadata += ` channel=${this.sha(msg.channel)}`;
      metadata += ` channel_type=${msg.channel[0]}`;
    }
    if (context) {
      metadata += ` slash=${context.isSlashCommand()}`;
    }
    return metadata;
  }

  private sha(text) {
    let shasum = crypto.createHash("sha1");
    shasum.update(text);
    return shasum.digest("hex");
  }

}
