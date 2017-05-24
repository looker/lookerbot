import * as AzureStorage from "azure-storage";
import Store from "./store";

export default class AzureStore extends Store {

  public configured() {
    return !!process.env.SLACKBOT_AZURE_CONTAINER;
  }

  public storeBlob(blob) : Promise<string> {
    const key = this.randomPath();
    const container = process.env.SLACKBOT_AZURE_CONTAINER;
    const options = {ContentType: "image/png"};
    const wasb = new AzureStorage.createBlobService();

    return new Promise<string>((resolve, reject) => {
      wasb.createBlockBlobFromText(container, key, blob, options, (err, result, response) => {
        if (err) {
          reject(`Azure Error: ${err}`);
        } else {
          const storageAccount = process.env.AZURE_STORAGE_ACCOUNT;
          resolve(`https://${storageAccount}.blob.core.windows.net/${container}/${key}`);
        }
      });
    });
  }

}
