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
}

interface ILookerOptions {
  apiBaseUrl: string
  clientId: string
  clientSecret: string
  customCommandSpaceId: string
  customCommandSpaceId2: string
  url: string
  webhookToken: string
}

export class Looker {

  public static all: Looker[]
  public static customCommands: {[key: string]: ICustomCommand} = {}
  public static customCommands2: {[key: string]: ICustomCommand} = {}

  public static customCommandList() {
    return Object.keys(Looker.customCommands).map((key) => Looker.customCommands[key])
  }
  public static customCommandList2() {
    return Object.keys(Looker.customCommands2).map((key) => Looker.customCommands2[key])
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
        clientId2: process.env.LOOKER_API_3_CLIENT_ID2,
        clientSecret: process.env.LOOKER_API_3_CLIENT_SECRET,
        clientSecret2: process.env.LOOKER_API_3_CLIENT_SECRET2,
        customCommandSpaceId: process.env.LOOKER_CUSTOM_COMMAND_SPACE_ID,
        customCommandSpaceId2: process.env.LOOKER_CUSTOM_COMMAND_SPACE_ID2,
        url: process.env.LOOKER_URL,
        webhookToken: process.env.LOOKER_WEBHOOK_TOKEN,
      }])
    return this.all = configs.map((config) => new Looker(config))
  }

  public url: string
  public customCommandSpaceId: string
  public customCommandSpaceId2: string
  public webhookToken: string
  public client: LookerAPIClient
  public client2: LookerAPIClient

  constructor(options: ILookerOptions) {

    this.url = options.url
    this.customCommandSpaceId = options.customCommandSpaceId
    this.customCommandSpaceId2 = options.customCommandSpaceId2
    this.webhookToken = options.webhookToken

    this.client = new LookerAPIClient({
      afterConnect: () => {
        return this.refreshCommands()
      },
      baseUrl: options.apiBaseUrl,
      clientId: options.clientId,
      clientSecret: options.clientSecret,
    })

    this.client2 = new LookerAPIClient({
      afterConnect: () => {
        return this.refreshCommands2("UJN3N1SGM")
      },
      baseUrl: options.apiBaseUrl,
      clientId: options.clientId2,
      clientSecret: options.clientSecret2,
    })
  }

  public refreshCommands() {
    if (!this.customCommandSpaceId) {
      console.log(`No commands specified for ${this.url}...`)
      return
    }
    console.log(`Refreshing custom commands for ${this.url}...${this.customCommandSpaceId}`)

    this.client.get(`spaces/${this.customCommandSpaceId}`, (space: ISpace) => {
      this.addCommandsForSpace(space, "Shortcuts", this.client)
      this.client.get(`spaces/${this.customCommandSpaceId}/children`, (children: ISpace[]) => {
        children.map((child) =>
          this.addCommandsForSpace(child, child.name, this.client))
      },
      console.log)
    },
    console.log)
  }

  public refreshCommands2(userId: string) {
    let client = this.client
    let customCommandSpaceId = this.customCommandSpaceId
    if (userId === "UJN3N1SGM") {
      client = this.client2
      customCommandSpaceId = this.customCommandSpaceId2
    }
    if (!customCommandSpaceId) {
      console.log(`No commands specified for ${this.url}...`)
      return
    }
    console.log(`Refreshing custom commands for ${this.url}...${customCommandSpaceId}`)
    if (userId === "UJN3N1SGM") {
      client.get(`spaces/${customCommandSpaceId}`, (space: ISpace) => {
            this.addCommandsForSpace2(space, "Shortcuts", client)
            client.get(`spaces/${customCommandSpaceId}/children`, (children: ISpace[]) => {
                  children.map((child) =>
                      this.addCommandsForSpace2(child, child.name, client))
                },
                console.log)
          },
          console.log)
    } else {
      client.get(`spaces/${customCommandSpaceId}`, (space: ISpace) => {
            this.addCommandsForSpace(space, "Shortcuts", client)
            client.get(`spaces/${customCommandSpaceId}/children`, (children: ISpace[]) => {
                  children.map((child) =>
                      this.addCommandsForSpace(child, child.name, client))
                },
                console.log)
          },
          console.log)
    }

  }

  private addCommandsForSpace(space: ISpace, category: string, client: LookerAPIClient) {
    space.dashboards.forEach((partialDashboard) =>
      client.get(`dashboards/${partialDashboard.id}`, (dashboard: IDashboard) => {

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

  private addCommandsForSpace2(space: ISpace, category: string, client: LookerAPIClient) {
    space.dashboards.forEach((partialDashboard) =>
        client.get(`dashboards/${partialDashboard.id}`, (dashboard: IDashboard) => {

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

              Looker.customCommands2[command.name] = command
            },

            console.log))
  }

}
