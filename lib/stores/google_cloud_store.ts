// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
import Store from "./store";
import gcs from '@google-cloud/storage';
import streamBuffers from 'stream-buffers';

class GoogleCloudStore extends Store {

  configured() {
    return !!process.env.GOOGLE_CLOUD_BUCKET;
  }

  storeBlob(blob, success, error) {
    let blobStream = new streamBuffers.ReadableStreamBuffer();
    blobStream.put(blob);
    blobStream.stop();

    let storage = gcs({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      credentials: process.env.GOOGLE_CLOUD_CREDENTIALS_JSON ? JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS_JSON) : undefined
    });

    let bucketName = process.env.GOOGLE_CLOUD_BUCKET;
    let bucket = storage.bucket(bucketName);
    let key = this.randomPath();
    let file = bucket.file(key);

    blobStream.pipe(file.createWriteStream({
      public: true
    })).on("error", err => error(`\`\`\`\n${JSON.stringify(err)}\n\`\`\``, "Google Cloud Storage Error")).on("finish", () => success(`https://storage.googleapis.com/${bucketName}/${key}`));

  }
}

export default GoogleCloudStore;
