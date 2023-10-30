import * as fs from "fs"
import { ReadableStreamBuffer } from "stream-buffers"
import { Store } from "./store"

// post v2.* nodejs cloud storage client requires the below import
const {Storage} = require("@google-cloud/storage")

export class GoogleCloudStore extends Store {

  public configured() {
    return !!process.env.GOOGLE_CLOUD_BUCKET
  }

  public storeImage(buffer: Buffer): Promise<string> {

    const blobStream = new ReadableStreamBuffer()
    blobStream.put(buffer)
    blobStream.stop()

    // updating due to v2.* nodejs client changes
    const storage = new Storage({
      // if keyFilename is supplied, projectID is no longer required
      keyFilename: process.env.GOOGLE_CLOUD_CREDENTIALS_JSON
    })

    const bucketName = process.env.GOOGLE_CLOUD_BUCKET
    const bucket = storage.bucket(bucketName)
    const key = this.randomPath()
    const file = bucket.file(key)

    return new Promise<string>((resolve, reject) => {
      blobStream
      .pipe(file.createWriteStream({public: true}))
      .on("error", (err: any) => {
        reject(`Google Cloud Storage Error: ${JSON.stringify(err)}`)
      }).on("finish", () => {
        resolve(`https://storage.googleapis.com/${bucketName}/${key}`)
      })
    })

  }

}
