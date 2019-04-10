import config from "./config"

import { Commander } from "./commander"
import { Looker } from "./looker"
import { SlackService } from "./services/slack_service"
import { VersionChecker } from "./version_checker"

const state: any = {
  VersionChecker: new VersionChecker(),
}

// Connect to all the Looker instances
Looker.loadAll()

state.VersionChecker = new VersionChecker()

// Update access tokens every half hour
setInterval(() => {
  for (const looker of Looker.all) {
    looker.client.fetchAccessToken()
  }
}, 30 * 60 * 1000)

const commands = [
  require("./commands/search_command").SearchCommand,
  require("./commands/custom_command").CustomCommand,
  require("./commands/set_alert_command").SetAlertCommand,
  require("./commands/help_command").HelpCommand,
]

const listeners = [
  require("./listeners/static_listener").StaticListener,
  require("./listeners/data_action_listener").DataActionListener,
  require("./listeners/health_check_listener").HealthCheckListener,
  require("./listeners/schedule_listener").ScheduleListener,
]

state.commander = new Commander(new SlackService(), {
  commands,
  listeners,
})
