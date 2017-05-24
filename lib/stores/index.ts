import Store from "./store";

import AmazonS3Store from "./amazon_s3_store";
import AzureStore from "./azure_store";
import GoogleCloudStore from "./google_cloud_store";

const stores: Store[] = [
  new AmazonS3Store(),
  new AzureStore(),
  new GoogleCloudStore(),
];

let currentStore: Store | undefined;

for (const store of stores) {
  if (store.configured()) {
    currentStore = store;
    break;
  }
}

export default {
  current: currentStore,
};
