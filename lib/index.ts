import "./config";

import Commander from "./commander";
import Looker from "./looker";
import VersionChecker from "./version_checker";

let state: any = {
  VersionChecker: new VersionChecker(),
};

// Connect to all the Looker instances
Looker.loadAll();

state.VersionChecker = new VersionChecker();

// Update access tokens every half hour
setInterval(() =>
  Array.from(Looker.all).map((looker) =>
    looker.client.fetchAccessToken())

, 30 * 60 * 1000);

// Set up the commander and its listeners
state.commander = new Commander({
  listeners: [
    require("./listeners/data_action_listener").default,
    require("./listeners/health_check_listener").default,
    require("./listeners/schedule_listener").default,
    require("./listeners/slack_action_listener").default,
    require("./listeners/slack_event_listener").default,
  ],
  commands: [
    require("./commands/cli_command").default,
    require("./commands/search_command").default,
    require("./commands/custom_command").default,
    require("./commands/help_command").default,
  ],
});
