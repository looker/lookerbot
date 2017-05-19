// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
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
