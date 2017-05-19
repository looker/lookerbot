let stores = [
  require('./amazon_s3_store'),
  require('./azure_store'),
  require('./google_cloud_store')
];

for (let storeClass of Array.from(stores)) {
  let store = new storeClass();
  if (store.configured()) {
    module.exports = {current: store};
    break;
  }
}
