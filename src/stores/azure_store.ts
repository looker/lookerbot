import * as azure from "azure-storage"
import { Store } from "./store"

export class AzureStore extends Store {

  public configured() {
    return !!process.env.SLACKBOT_AZURE_CONTAINER
  }

  public storeImage(buffer: Buffer): Promise<string> {
    const key = this.randomPath()
    const container = process.env.SLACKBOT_AZURE_CONTAINER
    const options = {contentSettings: {contentType: "image/png"}}
    const wasb = azure.createBlobService()

    return new Promise<string>((resolve, reject) => {
      wasb.createBlockBlobFromText(container, key, buffer, options, (err, result, response) => {
        if (err) {
          reject(`Azure Error: ${err}`)
        } else {
          const storageAccount = process.env.AZURE_STORAGE_ACCOUNT
          resolve(`https://${storageAccount}.blob.core.windows.net/${container}/${key}`)
        }
      })
    })
  }

}
