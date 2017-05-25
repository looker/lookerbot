import { SentMessage } from "./message";

export default class SlackUtils {

  public static slackButtonsEnabled = process.env.SLACK_SLASH_COMMAND_TOKEN && (process.env.LOOKERBOT_DATA_ACTIONS_IN_MESSAGES !== "false");

  public static stripMessageText(text: string) {
    return text.split("&gt;").join(">").split("&lt;").join("<");
  }

  public static checkToken(bot: any, message: SentMessage) {
    if (process.env.SLACK_SLASH_COMMAND_TOKEN && message.token && (process.env.SLACK_SLASH_COMMAND_TOKEN === message.token)) {
      return true;
    } else {
      if (bot != null) {
        bot.replyPrivate(message, "This bot cannot accept slash commands until `SLACK_SLASH_COMMAND_TOKEN` is configured.");
      }
      return false;
    }
  }

}
