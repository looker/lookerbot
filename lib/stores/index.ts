import Store from "./store";

import AmazonS3Store from "./amazon_s3_store";
import AzureStore from "./azure_store";
import GoogleCloudStore from "./google_cloud_store";

let stores: Store[] = [
  new AmazonS3Store(),
  new AzureStore(),
  new GoogleCloudStore()
];

let currentStore;

for (let store of stores) {
  if (store.configured()) {
    currentStore = store;
    break;
  }
}

export default {
  current: currentStore
}
