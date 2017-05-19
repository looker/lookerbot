Store = require("./store")
gcs = require('@google-cloud/storage')
streamBuffers = require('stream-buffers')

class GoogleCloudStore extends Store

  configured: ->
    !!process.env.GOOGLE_CLOUD_BUCKET

  storeBlob: (blob, success, error) ->
    blobStream = new streamBuffers.ReadableStreamBuffer()
    blobStream.put(blob)
    blobStream.stop()

    storage = gcs(
      projectId: process.env.GOOGLE_CLOUD_PROJECT
      credentials: if process.env.GOOGLE_CLOUD_CREDENTIALS_JSON then JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS_JSON) else undefined
    )

    bucketName = process.env.GOOGLE_CLOUD_BUCKET
    bucket = storage.bucket(bucketName)
    key = @randomPath()
    file = bucket.file(key)

    blobStream.pipe(file.createWriteStream(
      public: true
    )).on("error", (err) ->
      error("```\n#{JSON.stringify(err)}\n```", "Google Cloud Storage Error")
    ).on("finish", ->
      success("https://storage.googleapis.com/#{bucketName}/#{key}")
    )

module.exports = GoogleCloudStore
