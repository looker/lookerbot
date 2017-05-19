import Command from "./commands/command";
import Listener from "./listeners/listener";
import Looker from "./looker";
import LookQueryRunner from "./repliers/look_query_runner";
import QueryRunner from "./repliers/query_runner";
import SlackService from "./services/slack_service";

export default class Commander {

  service: SlackService;
  commands: Command[];

  constructor(opts: {listeners: Array<typeof Listener>, commands: Array<typeof Command>}) {
    this.service = new SlackService({
      listeners: opts.listeners,
      messageHandler: (context) => {
        return this.handleMessage(context);
      },
      urlHandler: (context, url) => {
        return this.handleUrlExpansion(context, url);
      },
    });
    this.service.begin();

    this.commands = opts.commands.map((c) => new c());
  }

  handleMessage(context) {

    let message = context.sourceMessage;

    message.text = message.text.split("“").join('"');
    message.text = message.text.split("”").join('"');

    for (let command of Array.from(this.commands)) {
      if (command.attempt(context)) {
        break;
      }
    }

    if (context.isSlashCommand() && !context.hasRepliedPrivately) {
      // Return 200 immediately for slash commands
      context.messageBot.res.setHeader("Content-Type", "application/json");
      context.messageBot.res.send(JSON.stringify({response_type: "in_channel"}));
    }

  }

  handleUrlExpansion(context, url) {
    for (let looker of Array.from(Looker.all)) {
      // Starts with Looker base URL?
      if (url.lastIndexOf(looker.url, 0) === 0) {
        context.looker = looker;
        this.annotateLook(context, url);
        this.annotateShareUrl(context, url);
      }
    }

  }

  annotateLook(context, url) {
    let matches;
    if (matches = url.match(/\/looks\/([0-9]+)$/)) {
      console.log(`Expanding Look URL ${url}`);
      let runner = new LookQueryRunner(context, matches[1]);
      runner.start();
    }

  }

  annotateShareUrl(context, url) {
    let matches;
    if (matches = url.match(/\/x\/([A-Za-z0-9]+)$/)) {
      console.log(`Expanding Share URL ${url}`);
      let runner = new QueryRunner(context, {slug: matches[1]});
      runner.start();
    }
  }

}
