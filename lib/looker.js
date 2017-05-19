// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
import LookerClient from './looker_client';
import blobStores from './stores/index';

class Looker {
  static initClass() {
  
    this.customCommands = {};
  
    this.all = undefined;
  }

  static loadAll() {
    let configs = process.env.LOOKERS ?
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
        webhookToken: process.env.LOOKER_WEBHOOK_TOKEN
      }]);
    return this.all = configs.map(config => new Looker(config));
  }

  constructor(options) {

    this.url = options.url;
    this.customCommandSpaceId = options.customCommandSpaceId;
    this.webhookToken = options.webhookToken;

    this.client = new LookerClient({
      baseUrl: options.apiBaseUrl,
      clientId: options.clientId,
      clientSecret: options.clientSecret,
      afterConnect: () => {
        return this.refreshCommands();
      }
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

    return this.client.get(`spaces/${this.customCommandSpaceId}`, space => {
      this.addCommandsForSpace(space, "Shortcuts");
      return this.client.get(`spaces/${this.customCommandSpaceId}/children`, children => {
        return Array.from(children).map((child) =>
          this.addCommandsForSpace(child, child.name));
      },
      console.log);
    },
    console.log);
  }

  addCommandsForSpace(space, category) {
    return Array.from(space.dashboards).map((partialDashboard) =>
      this.client.get(`dashboards/${partialDashboard.id}`, dashboard => {

        let command = {
          name: dashboard.title.toLowerCase().trim(),
          description: dashboard.description,
          dashboard,
          looker: this,
          category
        };

        command.hidden = (category.toLowerCase().indexOf("[hidden]") !== -1) || (command.name.indexOf("[hidden]") !== -1);

        command.helptext = "";

        let dashboard_filters = dashboard.dashboard_filters || dashboard.filters;
        if ((dashboard_filters != null ? dashboard_filters.length : undefined) > 0) {
          command.helptext = `<${dashboard_filters[0].title.toLowerCase()}>`;
        }

        return this.constructor.customCommands[command.name] = command;
      },

      console.log));
  }
}
Looker.initClass();

export default Looker;
