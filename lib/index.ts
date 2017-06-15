import "./config"

import { Commander } from "./commander"
import { Looker } from "./looker"
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

// Set up the commander and its listeners
state.commander = new Commander({
  commands: [
    require("./commands/search_command").SearchCommand,
    require("./commands/custom_command").CustomCommand,
    require("./commands/help_command").HelpCommand,
  ],
  listeners: [
    require("./listeners/static_listener").StaticListener,
    require("./listeners/data_action_listener").DataActionListener,
    require("./listeners/health_check_listener").HealthCheckListener,
    require("./listeners/schedule_listener").ScheduleListener,
    require("./listeners/slack_action_listener").SlackActionListener,
    require("./listeners/slack_event_listener").SlackEventListener,
  ],
})
