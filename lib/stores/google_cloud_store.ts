import * as gcs from "@google-cloud/storage";
import * as streamBuffers from "stream-buffers";
import Store from "./store";

export default class GoogleCloudStore extends Store {

  public configured() {
    return !!process.env.GOOGLE_CLOUD_BUCKET;
  }

  public storeBlob(blob, success, error) {
    const blobStream = new streamBuffers.ReadableStreamBuffer();
    blobStream.put(blob);
    blobStream.stop();

    const storage = gcs({
      credentials: process.env.GOOGLE_CLOUD_CREDENTIALS_JSON ? JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS_JSON) : undefined,
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
    });

    const bucketName = process.env.GOOGLE_CLOUD_BUCKET;
    const bucket = storage.bucket(bucketName);
    const key = this.randomPath();
    const file = bucket.file(key);

    blobStream.pipe(file.createWriteStream({
      public: true,
    })).on("error", (err) => error(`\`\`\`\n${JSON.stringify(err)}\n\`\`\``, "Google Cloud Storage Error")).on("finish", () => success(`https://storage.googleapis.com/${bucketName}/${key}`));

  }

}
