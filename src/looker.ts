import { IDashboard, IFolder } from "./looker_api_types"
import { LookerAPIClient } from "./looker_client"

export interface ICustomCommand {
  name: string
  description: string
  dashboard: any
  looker: Looker
  category: string
  helptext?: string
  hidden: boolean
}

interface ILookerOptions {
  apiBaseUrl: string
  clientId: string
  clientSecret: string
  customCommandFolderId: string
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
        clientId: process.env.LOOKER_API_CLIENT_ID,
        clientSecret: process.env.LOOKER_API_CLIENT_SECRET,
        customCommandFolderId: process.env.LOOKER_CUSTOM_COMMAND_FOLDER_ID,
        url: process.env.LOOKER_URL,
        webhookToken: process.env.LOOKER_WEBHOOK_TOKEN,
      }])
    return this.all = configs.map((config) => new Looker(config))
  }

  public url: string
  public customCommandFolderId: string
  public webhookToken: string
  public client: LookerAPIClient

  constructor(options: ILookerOptions) {

    this.url = options.url
    this.customCommandFolderId = options.customCommandFolderId
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
    if (!this.customCommandFolderId) {
      console.log(`No commands specified for ${this.url}...`)
      return
    }
    console.log(`Refreshing custom commands for ${this.url}...`)

    this.client.get(`folders/${this.customCommandFolderId}`, (folder: IFolder) => {
      this.addCommandsForFolder(folder, "Shortcuts")
      this.client.get(`folders/${this.customCommandFolderId}/children`, (children: IFolder[]) => {
        children.map((child) =>
          this.addCommandsForFolder(child, child.name))
      },
      console.log)
    },
    console.log)
  }

  private addCommandsForFolder(folder: IFolder, category: string) {
    folder.dashboards.forEach((partialDashboard) =>
      this.client.get(`dashboards/${partialDashboard.id}`, (dashboard: IDashboard) => {

        const command: ICustomCommand = {
          category,
          dashboard,
          description: dashboard.description,
          hidden: false,
          looker: this,
          name: dashboard.title.toLowerCase().trim(),
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
