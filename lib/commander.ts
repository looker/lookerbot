import { Command } from "./commands/command"
import { Listener } from "./listeners/listener"
import { Looker } from "./looker"
import { LookQueryRunner } from "./repliers/look_query_runner"
import { QueryRunner } from "./repliers/query_runner"
import { ReplyContext } from "./reply_context"
import { SlackService } from "./services/slack_service"

export class Commander {

  private service: SlackService
  private commands: Command[]

  constructor(opts: {listeners: Array<typeof Listener>, commands: Array<typeof Command>}) {
    this.service = new SlackService({
      listeners: opts.listeners,
      messageHandler: (context: ReplyContext) => {
        return this.handleMessage(context)
      },
      urlHandler: (context: ReplyContext, url: string) => {
        return this.handleUrlExpansion(context, url)
      },
    })
    this.service.begin()

    this.commands = opts.commands.map((c) => new c())
  }

  private handleMessage(context: ReplyContext) {

    const message = context.sourceMessage

    message.text = message.text.split("“").join('"')
    message.text = message.text.split("”").join('"')

    for (const command of this.commands) {
      if (command.attempt(context)) {
        break
      }
    }

    context.completeSlashCommand()

  }

  private handleUrlExpansion(context: ReplyContext, url: string) {
    for (const looker of Looker.all) {
      // Starts with Looker base URL?
      if (url.lastIndexOf(looker.url, 0) === 0) {
        context.looker = looker
        this.annotateLook(context, url)
        this.annotateShareUrl(context, url)
      }
    }

  }

  private annotateLook(context: ReplyContext, url: string) {
    const matches = url.match(/\/looks\/([0-9]+)$/)
    if (matches) {
      console.log(`Expanding Look URL ${url}`)
      const runner = new LookQueryRunner(context, matches[1])
      runner.start()
    }
  }

  private annotateShareUrl(context: ReplyContext, url: string) {
    const matches = url.match(/\/x\/([A-Za-z0-9]+)$/)
    if (matches) {
      console.log(`Expanding Share URL ${url}`)
      const runner = new QueryRunner(context, {slug: matches[1]})
      runner.start()
    }
  }

}
