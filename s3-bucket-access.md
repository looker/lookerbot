# AWS S3 Bucket access setup example

To keep AWS infrastructure safe and out of risk to leak any data through Lookerbot account
it is better to create dedicated AMI user, S3 Bucket and restrict access for the user only to the bucket.

Here is an example how to achieve that:

1. Create an S3 Bucket, f.ex. `lookerbot-s3-bucket`.<br />
It should stay private. No special configuration required.

2. Create an IAM policy, named f.ex `lookerbot-policy`, like
    ```
    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "s3:ListBucket"
                ],
                "Resource": [
                    "arn:aws:s3:::lookerbot-s3-bucket"
                ]
            },
            {
                "Effect": "Allow",
                "Action": [
                    "s3:PutObject",
                    "s3:PutObjectAcl",
                    "s3:GetObject",
                    "s3:DeleteObject"
                ],
                "Resource": [
                    "arn:aws:s3:::lookerbot-s3-bucket/*"
                ]
            }
        ]
    }
     ```
     The policy consists of 2 sections:
     - first allows to list the bucket itself,
     - seconds allows to put, get and delete objects in the bucket and to put object's ACL

    More on ARN bucket names could be found on [AWS Docs](http://docs.aws.amazon.com/general/latest/gr/aws-arns-and-namespaces.html#arn-syntax-s3)

3. Create an IAM account, f.ex `lookerbot`. <br />
Enable `Programmatic access` only.

4. Go to the summary page for `lookerbot` user. <br />
On `Permissions` section add `lookerbot-policy` to it.
