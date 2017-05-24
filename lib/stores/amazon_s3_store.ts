import * as AWS from "aws-sdk";
import Store from "./store";

export default class AmazonS3Store extends Store {

  public configured() {
    return !!process.env.SLACKBOT_S3_BUCKET;
  }

  public storeBlob(blob, success, error) {
    const key = this.randomPath();
    const region = process.env.SLACKBOT_S3_BUCKET_REGION;
    const domain = region && (region !== "us-east-1") ?
      `s3-${process.env.SLACKBOT_S3_BUCKET_REGION}.amazonaws.com`
    :
      "s3.amazonaws.com";

    const params = {
      ACL: "public-read",
      Body: blob,
      Bucket: process.env.SLACKBOT_S3_BUCKET,
      ContentType: "image/png",
      Key: key,
    };

    const s3 = new AWS.S3({
      endpoint: new AWS.Endpoint(domain) as any,
    });
    s3.putObject(params, (err, data) => {
      if (err) {
        return error(err, "S3 Error");
      } else {
        return success(`https://${domain}/${params.Bucket}/${key}`);
      }
    });

  }
}
