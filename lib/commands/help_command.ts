import * as _ from "underscore";
import config from "../config";
import Looker from "../looker";
import DashboardQueryRunner from "../repliers/dashboard_query_runner";
import VersionChecker from "../version_checker";
import Command from "./command";

export default class HelpCommand extends Command {

  attempt(context) {
    let helpAttachments: any = [];

    let groups = _.groupBy(Looker.customCommandList(), "category");

    for (let groupName in groups) {
      let groupCommmands = groups[groupName];
      let groupText = "";
      for (let command of _.sortBy(_.values(groupCommmands), "name")) {
        if (!command.hidden) {
          groupText += `• *<${command.looker.url}/dashboards/${command.dashboard.id}|${command.name}>* ${command.helptext}`;
          if (command.description) {
            groupText += ` — _${command.description}_`;
          }
          groupText += "\n";
        }
      }

      if (groupText) {
        helpAttachments.push({
          title: groupName,
          text: groupText,
          color: "#64518A",
          mrkdwn_in: ["text"],
        });
      }
    }

    let defaultText = `\
• *find* <look search term> — _Shows the top five Looks matching the search._\
`;

    if (config.enableQueryCli) {
      defaultText += "• *q* <model_name>/<view_name>/<field>[<filter>] — _Runs a custom query._\n";
    }

    helpAttachments.push({
      title: "Built-in Commands",
      text: defaultText,
      color: "#64518A",
      mrkdwn_in: ["text"],
    });

    let spaces = Looker.all.filter((l) => l.customCommandSpaceId).map((l) => `<${l.url}/spaces/${l.customCommandSpaceId}|this space>`).join(" or ");
    if (spaces) {
      helpAttachments.push({
        text: `\n_To add your own commands, add a dashboard to ${spaces}._`,
        mrkdwn_in: ["text"],
      });
    }

    if (VersionChecker.newVersion) {
      helpAttachments.push({
        text: `\n\n:scream: *<${VersionChecker.newVersion.url}|Lookerbot is out of date! Version ${VersionChecker.newVersion.number} is now available.>* :scream:`,
        color: "warning",
        mrkdwn_in: ["text"],
      });
    }

    if (context.isDM && (context.sourceMessage.text.toLowerCase() !== "help")) {
      context.replyPrivate(":crying_cat_face: I couldn't understand that command. You can use `help` to see the list of possible commands.");
    } else {
      context.replyPrivate({attachments: helpAttachments});
    }

    for (let looker of Array.from(Looker.all)) {
      looker.refreshCommands();
    }

    return true;
  }

}
