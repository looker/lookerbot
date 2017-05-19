Botkit = require('botkit')

_ = require('underscore')
SlackUtils = require('./slack_utils')

Looker = require('./looker')

VersionChecker = require('./version_checker')

Commander = require('./commander')

config = require('./config')

listeners = [
  require('./listeners/data_action_listener')
  require('./listeners/health_check_listener')
  require('./listeners/schedule_listener')
  require('./listeners/slack_action_listener')
  require('./listeners/slack_event_listener')
]

blobStores = require('./stores/index')

Looker.loadAll()

currentVersionChecker = new VersionChecker()

# Update access tokens every half hour
setInterval(->
  for looker in Looker.all
    looker.client.fetchAccessToken()
, 30 * 60 * 1000)

commander = new Commander({
  listeners: listeners
})
