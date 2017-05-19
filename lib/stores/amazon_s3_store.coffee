Store = require("./store")
AWS = require('aws-sdk')

class AmazonS3Store extends Store

  configured: ->
    !!process.env.SLACKBOT_S3_BUCKET

  storeBlob: (blob, success, error) ->
    key = @randomPath()
    region = process.env.SLACKBOT_S3_BUCKET_REGION
    domain = if region && region != "us-east-1"
      "s3-#{process.env.SLACKBOT_S3_BUCKET_REGION}.amazonaws.com"
    else
      "s3.amazonaws.com"

    params =
      Bucket: process.env.SLACKBOT_S3_BUCKET
      Key: key
      Body: blob
      ACL: 'public-read'
      ContentType: "image/png"

    s3 = new AWS.S3(
      endpoint: new AWS.Endpoint(domain)
    )
    s3.putObject params, (err, data) ->
      if err
        error(err, "S3 Error")
      else
        success("https://#{domain}/#{params.Bucket}/#{key}")

    return
module.exports = AmazonS3Store
