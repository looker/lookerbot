LookerClient = require('./looker_client')
blobStores = require('./stores/index')

class Looker

  @customCommands: {}

  @all: undefined

  @loadAll: ->
    configs = if process.env.LOOKERS
      console.log("Using Looker information specified in LOOKERS environment variable.")
      JSON.parse(process.env.LOOKERS)
    else
      console.log("Using Looker information specified in individual environment variables.")
      [{
        url: process.env.LOOKER_URL
        apiBaseUrl: process.env.LOOKER_API_BASE_URL
        clientId: process.env.LOOKER_API_3_CLIENT_ID
        clientSecret: process.env.LOOKER_API_3_CLIENT_SECRET
        customCommandSpaceId: process.env.LOOKER_CUSTOM_COMMAND_SPACE_ID
        webhookToken: process.env.LOOKER_WEBHOOK_TOKEN
      }]
    @all = configs.map((config) -> new Looker(config))

  constructor: (options) ->

    @url = options.url
    @customCommandSpaceId = options.customCommandSpaceId
    @webhookToken = options.webhookToken

    @client = new LookerClient(
      baseUrl: options.apiBaseUrl
      clientId: options.clientId
      clientSecret: options.clientSecret
      afterConnect: =>
        @refreshCommands()
    )

  storeBlob: (blob, success, error) ->
    blobStores.current.storeBlob(blob, success, error)

  refreshCommands: ->
    unless @customCommandSpaceId
      console.log "No commands specified for #{@url}..."
      return
    console.log "Refreshing custom commands for #{@url}..."

    @client.get("spaces/#{@customCommandSpaceId}", (space) =>
      @addCommandsForSpace(space, "Shortcuts")
      @client.get("spaces/#{@customCommandSpaceId}/children", (children) =>
        for child in children
          @addCommandsForSpace(child, child.name)
      console.log)
    console.log)

  addCommandsForSpace: (space, category) ->
    for partialDashboard in space.dashboards
      @client.get("dashboards/#{partialDashboard.id}", (dashboard) =>

        command =
          name: dashboard.title.toLowerCase().trim()
          description: dashboard.description
          dashboard: dashboard
          looker: @
          category: category

        command.hidden = category.toLowerCase().indexOf("[hidden]") != -1 || command.name.indexOf("[hidden]") != -1

        command.helptext = ""

        dashboard_filters = dashboard.dashboard_filters || dashboard.filters
        if dashboard_filters?.length > 0
          command.helptext = "<#{dashboard_filters[0].title.toLowerCase()}>"

        @constructor.customCommands[command.name] = command

      console.log)

module.exports = Looker
