import LookerAPIClient from "./looker_client";
import blobStores from "./stores/index";

export interface CustomCommand {
  name: string;
  description: string;
  dashboard: any;
  looker: Looker;
  category: string;
  helptext?: string;
  hidden: boolean;
}

export default class Looker {

  static all: Looker[];
  static customCommands: {[key: string]: CustomCommand} = {};

  static customCommandList() {
    return Object.keys(Looker.customCommands).map((key) => Looker.customCommands[key]);
  }

  static loadAll() {
    const configs = process.env.LOOKERS ?
      (console.log("Using Looker information specified in LOOKERS environment variable."),
      JSON.parse(process.env.LOOKERS))
    :
      (console.log("Using Looker information specified in individual environment variables."),
      [{
        url: process.env.LOOKER_URL,
        apiBaseUrl: process.env.LOOKER_API_BASE_URL,
        clientId: process.env.LOOKER_API_3_CLIENT_ID,
        clientSecret: process.env.LOOKER_API_3_CLIENT_SECRET,
        customCommandSpaceId: process.env.LOOKER_CUSTOM_COMMAND_SPACE_ID,
        webhookToken: process.env.LOOKER_WEBHOOK_TOKEN,
      }]);
    return this.all = configs.map((config) => new Looker(config));
  }

  url: string;
  customCommandSpaceId: string;
  webhookToken: string;
  client: LookerAPIClient;

  constructor(options) {

    this.url = options.url;
    this.customCommandSpaceId = options.customCommandSpaceId;
    this.webhookToken = options.webhookToken;

    this.client = new LookerAPIClient({
      baseUrl: options.apiBaseUrl,
      clientId: options.clientId,
      clientSecret: options.clientSecret,
      afterConnect: () => {
        return this.refreshCommands();
      },
    });
  }

  storeBlob(blob, success, error) {
    return blobStores.current.storeBlob(blob, success, error);
  }

  refreshCommands() {
    if (!this.customCommandSpaceId) {
      console.log(`No commands specified for ${this.url}...`);
      return;
    }
    console.log(`Refreshing custom commands for ${this.url}...`);

    this.client.get(`spaces/${this.customCommandSpaceId}`, (space) => {
      this.addCommandsForSpace(space, "Shortcuts");
      this.client.get(`spaces/${this.customCommandSpaceId}/children`, (children) => {
        children.map((child) =>
          this.addCommandsForSpace(child, child.name));
      },
      console.log);
    },
    console.log);
  }

  addCommandsForSpace(space, category: string) {
    space.dashboards.forEach((partialDashboard) =>
      this.client.get(`dashboards/${partialDashboard.id}`, (dashboard) => {

        const command: CustomCommand = {
          name: dashboard.title.toLowerCase().trim(),
          description: dashboard.description,
          dashboard,
          looker: this,
          category,
          hidden: false,
        };

        command.hidden = (category.toLowerCase().indexOf("[hidden]") !== -1) || (command.name.indexOf("[hidden]") !== -1);

        command.helptext = "";

        const dashboard_filters = dashboard.dashboard_filters || dashboard.filters;
        if ((dashboard_filters != null ? dashboard_filters.length : undefined) > 0) {
          command.helptext = `<${dashboard_filters[0].title.toLowerCase()}>`;
        }

        Looker.customCommands[command.name] = command;
      },

      console.log));
  }
}
