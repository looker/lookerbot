// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
import Store from "./store";
import AWS from 'aws-sdk';

class AmazonS3Store extends Store {

  configured() {
    return !!process.env.SLACKBOT_S3_BUCKET;
  }

  storeBlob(blob, success, error) {
    let key = this.randomPath();
    let region = process.env.SLACKBOT_S3_BUCKET_REGION;
    let domain = region && (region !== "us-east-1") ?
      `s3-${process.env.SLACKBOT_S3_BUCKET_REGION}.amazonaws.com`
    :
      "s3.amazonaws.com";

    let params = {
      Bucket: process.env.SLACKBOT_S3_BUCKET,
      Key: key,
      Body: blob,
      ACL: 'public-read',
      ContentType: "image/png"
    };

    let s3 = new AWS.S3({
      endpoint: new AWS.Endpoint(domain)
    });
    s3.putObject(params, function(err, data) {
      if (err) {
        return error(err, "S3 Error");
      } else {
        return success(`https://${domain}/${params.Bucket}/${key}`);
      }
    });

  }
}
export default AmazonS3Store;
