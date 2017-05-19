stores = [
  require('./amazon_s3_store')
  require('./azure_store')
  require('./google_cloud_store')
]

for storeClass in stores
  store = new storeClass()
  if store.configured()
    module.exports = {current: store}
    break
