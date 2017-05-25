import * as fs from "fs";
import { ReadableStreamBuffer } from "stream-buffers";
import { Store } from "./store";

const gcs = require("@google-cloud/storage");

export class GoogleCloudStore extends Store {

  public configured() {
    return !!process.env.GOOGLE_CLOUD_BUCKET;
  }

  public storeImage(buffer: Buffer): Promise<string> {

    const blobStream = new ReadableStreamBuffer();
    blobStream.put(buffer);
    blobStream.stop();

    const storage = gcs({
      credentials: process.env.GOOGLE_CLOUD_CREDENTIALS_JSON ? JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS_JSON) : undefined,
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
    });

    const bucketName = process.env.GOOGLE_CLOUD_BUCKET;
    const bucket = storage.bucket(bucketName);
    const key = this.randomPath();
    const file = bucket.file(key);

    return new Promise<string>((resolve, reject) => {
      blobStream
      .pipe(file.createWriteStream({public: true}))
      .on("error", (err: any) => {
        reject(`Google Cloud Storage Error: ${JSON.stringify(err)}`);
      }).on("finish", () => {
        resolve(`https://storage.googleapis.com/${bucketName}/${key}`);
      });
    });

  }

}
