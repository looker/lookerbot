import * as crypto from "crypto"
import * as request from "request"
import * as _ from "underscore"
import config from "./config"
import { ReplyContext } from "./reply_context"

export interface ILookerRequestConfig {
  method: string
  path: string
  headers?: request.Headers
  body?: any
}

export interface ILookerRequestOptions {
  encoding?: string | null
}

export class LookerAPIClient {

  private token?: string
  private tokenError?: string

  constructor(private options: {
    baseUrl: string,
    clientId: string,
    clientSecret: string,
    afterConnect?: () => void,
  }) {
    this.options = options
    this.fetchAccessToken()
  }

  public request(
    requestConfig: ILookerRequestConfig & ILookerRequestOptions,
    successCallback?: any,
    errorCallback?: any,
    replyContext?: ReplyContext,
  ) {

    if (!this.reachable()) {
      errorCallback({error: `Looker ${this.options.baseUrl} not reachable.\n${this.tokenError || ""}`})
      return
    }

    if (!errorCallback) {
      errorCallback = () => { return }
    }
    if (!successCallback) {
      successCallback = () => { return }
    }

    const newConfig: request.CoreOptions & request.UrlOptions = {
      body: requestConfig.body,
      headers: {
        "Authorization": `token ${this.token}`,
        "User-Agent": `looker-slackbot/${config.npmPackage.version}${replyContext ? this.buildMetadata(replyContext) : ""}`,
      },
      method: requestConfig.method,
      url: `${this.options.baseUrl}/${requestConfig.path}`,
    }

    if (typeof requestConfig.encoding !== "undefined") {
      newConfig.encoding = requestConfig.encoding
    }

    newConfig.headers = _.extend(newConfig.headers, requestConfig.headers || {})

    request(newConfig, (error, response, body: string | Buffer) => {
      if (error) {
        errorCallback(error)
      } else if (response.statusCode === 200) {
        if (response.headers["content-type"].indexOf("application/json") !== -1) {
          successCallback(JSON.parse(body as string))
        } else {
          successCallback(body)
        }
      } else {
        try {
          if (Buffer.isBuffer(body) && (body.length === 0)) {
            errorCallback({error: "Received empty response from Looker."})
          } else {
            errorCallback(JSON.parse(body as string))
          }
        } catch (error1) {
          console.error("JSON parse failed:")
          console.error(body)
          errorCallback({error: "Couldn't parse Looker response. The server may be offline."})
        }
      }
    })

  }

  public requestAsync(
    requestConfig: ILookerRequestConfig,
    replyContext?: ReplyContext,
  ) {
    return new Promise((resolve, reject) => {
      this.request(requestConfig, resolve, reject, replyContext)
    })
  }

  public get(path: string, successCallback?: any, errorCallback?: any, options?: ILookerRequestOptions, replyContext?: ReplyContext) {
    this.request(_.extend({method: "GET", path}, options || {}), successCallback, errorCallback, replyContext)
  }

  public getAsync(
    path: string,
    replyContext?: ReplyContext,
    options?: ILookerRequestOptions,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.get(path, resolve, reject, options, replyContext)
    })
  }

  public getBinaryAsync(
    path: string,
    replyContext?: ReplyContext,
  ): Promise<Buffer> {
    return this.getAsync(path, replyContext, {encoding: null})
  }

  public post(path: string, body: any, successCallback?: any, errorCallback?: any, replyContext?: ReplyContext) {
    this.request(
      {
        body: JSON.stringify(body),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
        path,
      },
      successCallback,
      errorCallback,
      replyContext,
    )
  }

  public postAsync(
    path: string,
    body: any,
    options?: ILookerRequestOptions,
    replyContext?: ReplyContext,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.post(path, body, resolve, reject, replyContext)
    })
  }

  public fetchAccessToken() {

    const options = {
      form: {
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
      },
      method: "POST",
      url: `${this.options.baseUrl}/login`,
    }

    request(options, (error, response, body) => {
      this.tokenError = undefined
      if (error) {
        console.warn(`Couldn't fetchAccessToken for Looker ${this.options.baseUrl}: ${error}`)
        this.tokenError = error
        this.token = undefined
      } else if (response.statusCode === 200) {
        const json = JSON.parse(body)
        this.token = json.access_token
        console.log(`Updated API token for ${this.options.baseUrl}`)
      } else {
        this.token = undefined
        console.warn(`Failed fetchAccessToken for Looker ${this.options.baseUrl}: ${body}`)
      }

      if (this.options.afterConnect) {
        this.options.afterConnect()
      }

    })
  }

  private reachable() {
    return (this.token != null)
  }

  private buildMetadata(context: ReplyContext) {
    const msg = context.sourceMessage
    let metadata = ""
    if (msg.user) {
      metadata += ` user=${this.sha(msg.user)}`
    }
    if (msg.team) {
      metadata += ` team=${this.sha(msg.team)}`
    }
    if (msg.channel) {
      metadata += ` channel=${this.sha(msg.channel)}`
      metadata += ` channel_type=${msg.channel[0]}`
    }
    if (context) {
      metadata += ` slash=${context.isSlashCommand()}`
    }
    return metadata
  }

  private sha(text: string) {
    const shasum = crypto.createHash("sha1")
    shasum.update(text)
    return shasum.digest("hex")
  }

}
