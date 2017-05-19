Store = require("./store")
AzureStorage = require('azure-storage')

class AzureStore extends Store

  configured: ->
    !!process.env.SLACKBOT_AZURE_CONTAINER

  storeBlob: (blob, success, error) ->
    key = @randomPath()
    container = process.env.SLACKBOT_AZURE_CONTAINER
    options =
      ContentType: "image/png"
    wasb = new AzureStorage.createBlobService()
    wasb.createBlockBlobFromText container, key, blob, options, (err, result, response) ->
      if err
        error(err, "Azure Error")
      else
        storageAccount = process.env.AZURE_STORAGE_ACCOUNT
        success("https://#{storageAccount}.blob.core.windows.net/#{container}/#{key}")

module.exports = AzureStore
