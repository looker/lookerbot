require('./config')

Commander = require('./commander')
Looker = require('./looker')
VersionChecker = require('./version_checker')

state = {}

# Connect to all the Looker instances
Looker.loadAll()

state.VersionChecker = new VersionChecker()

# Update access tokens every half hour
setInterval(->
  for looker in Looker.all
    looker.client.fetchAccessToken()
, 30 * 60 * 1000)

# Set up the commander and its listeners
state.commander = new Commander({
  listeners: [
    require('./listeners/data_action_listener')
    require('./listeners/health_check_listener')
    require('./listeners/schedule_listener')
    require('./listeners/slack_action_listener')
    require('./listeners/slack_event_listener')
  ]
  commands: [
    require('./commands/cli_command')
    require('./commands/search_command')
    require('./commands/custom_command')
    require('./commands/help_command')
  ]
})
