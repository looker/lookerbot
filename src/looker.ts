import { IDashboard, ISpace } from "./looker_api_types"
import { LookerAPIClient } from "./looker_client"

export interface ICustomCommand {
  name: string
  description: string
  dashboard: any
  looker: Looker
  category: string
  helptext?: string
  hidden: boolean
  config: IQueryConfig
}

export interface IQueryConfig {
  tableAsImage?: boolean | false
  image_height?: number
  image_width?: number
  description: string | ""
}

interface ILookerOptions {
  apiBaseUrl: string
  clientId: string
  clientSecret: string
  customCommandSpaceId: string
  url: string
  webhookToken: string
}

export class Looker {

  public static all: Looker[]
  public static customCommands: {[key: string]: ICustomCommand} = {}

  public static customCommandList() {
    return Object.keys(Looker.customCommands).map((key) => Looker.customCommands[key])
  }

  public static loadAll() {
    const configs: ILookerOptions[] = process.env.LOOKERS ?
      (console.log("Using Looker information specified in LOOKERS environment variable."),
      JSON.parse(process.env.LOOKERS))
    :
      (console.log("Using Looker information specified in individual environment variables."),
      [{
        apiBaseUrl: process.env.LOOKER_API_BASE_URL,
        clientId: process.env.LOOKER_API_3_CLIENT_ID,
        clientSecret: process.env.LOOKER_API_3_CLIENT_SECRET,
        customCommandSpaceId: process.env.LOOKER_CUSTOM_COMMAND_SPACE_ID,
        url: process.env.LOOKER_URL,
        webhookToken: process.env.LOOKER_WEBHOOK_TOKEN,
      }])
    return this.all = configs.map((config) => new Looker(config))
  }

  public url: string
  public customCommandSpaceId: string
  public webhookToken: string
  public client: LookerAPIClient

  constructor(options: ILookerOptions) {

    this.url = options.url
    this.customCommandSpaceId = options.customCommandSpaceId
    this.webhookToken = options.webhookToken

    this.client = new LookerAPIClient({
      afterConnect: () => {
        return this.refreshCommands()
      },
      baseUrl: options.apiBaseUrl,
      clientId: options.clientId,
      clientSecret: options.clientSecret,
    })
  }

  public refreshCommands() {
    if (!this.customCommandSpaceId) {
      console.log(`No commands specified for ${this.url}...`)
      return
    }
    console.log(`Refreshing custom commands for ${this.url}...`)

    this.client.get(`spaces/${this.customCommandSpaceId}`, (space: ISpace) => {
      this.addCommandsForSpace(space, "Shortcuts")
      this.client.get(`spaces/${this.customCommandSpaceId}/children`, (children: ISpace[]) => {
        children.map((child) =>
          this.addCommandsForSpace(child, child.name))
      },
      console.log)
    },
    console.log)
  }

  private addCommandsForSpace(space: ISpace, category: string) {
    space.dashboards.forEach((partialDashboard) =>
      this.client.get(`dashboards/${partialDashboard.id}`, (dashboard: IDashboard) => {

        const command: ICustomCommand = {
          category,
          dashboard,
          description: dashboard.description,
          hidden: false,
          looker: this,
          name: dashboard.title.toLowerCase().trim(),
          config: {}
        }

        if(dashboard.description && dashboard.description.trim().startsWith("{")){
          try{
            command.config = JSON.parse(dashboard.description);
            command.description = command.config.description
          }catch(e) {
            console.warn("dashboard description is not valid json or starts with {")
          }
        }

        command.hidden = (category.toLowerCase().indexOf("[hidden]") !== -1) || (command.name.indexOf("[hidden]") !== -1)

        command.helptext = ""

        const dashboardFilters = dashboard.dashboard_filters || dashboard.filters
        if (dashboardFilters && dashboardFilters.length > 0) {
          command.helptext = `<${dashboardFilters[0].title.toLowerCase()}>`
        }

        Looker.customCommands[command.name] = command
      },

      console.log))
  }
}
