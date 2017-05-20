import * as AzureStorage from "azure-storage";
import Store from "./store";

export default class AzureStore extends Store {

  configured() {
    return !!process.env.SLACKBOT_AZURE_CONTAINER;
  }

  storeBlob(blob, success, error) {
    const key = this.randomPath();
    const container = process.env.SLACKBOT_AZURE_CONTAINER;
    const options =
      {ContentType: "image/png"};
    const wasb = new AzureStorage.createBlobService();
    wasb.createBlockBlobFromText(container, key, blob, options, function(err, result, response) {
      if (err) {
        return error(err, "Azure Error");
      } else {
        const storageAccount = process.env.AZURE_STORAGE_ACCOUNT;
        return success(`https://${storageAccount}.blob.core.windows.net/${container}/${key}`);
      }
    });
  }
}
