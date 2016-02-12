# Looker Slackbot

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

A bot for [Slack](http://slack.com) that integrates with [Looker](http://looker.com) to make sharing data in your organization easier!

### Requirements

- Looker
- A server capable of running Node.js to deploy the bot application to
- (optional) To display chart images:
  - Looker 3.40 or later
  - An Amazon S3 bucket and access keys

### Deployment

A few environment variables are used to configure the bot:

- `SLACK_API_KEY` (required) – Your Slack API key.

- `LOOKERS` (required) - A JSON array of JSON objects, each representing a Looker instance and its authentication information.

  The JSON objects should have the following keys:

  - `url` should be the web url of the instance
  - `apiBaseUrl` should be the API 3.0 endpoint
  - `clientID` should be the API 3.0 client ID for the user you want the bot to run as
  - `clientSecret` should be the secret for that API 3.0 key
  - `customCommandSpaceId` is an optional parameter, representing a Space that you would like the bot to use to define custom commands.

  Here's an example JSON that connects to two Looker instances:

  ```json
  [{"url": "https://me.looker.com", "apiBaseUrl": "https://me.looker.com:19999/api/3.0", "clientId": "abcdefghjkl", "clientSecret": "abcdefghjkl"},{"url": "https://me-staging.looker.com", "apiBaseUrl": "https://me-staging.looker.com:19999/api/3.0", "clientId": "abcdefghjkl", "clientSecret": "abcdefghjkl"}]
  ```

- `SLACKBOT_S3_BUCKET` (optional) – If you want to use the Slack bot to post visualization images, provide an Amazon S3 bucket name.

- `AWS_ACCESS_KEY_ID` (optional) – If you want to use the Slack bot to post visualization images, provide an Amazon S3 access key that can write to the provided bucket.

- `AWS_SECRET_ACCESS_KEY` (optional) – If you want to use the Slack bot to post visualization images, provide an Amazon S3 secret access key that can write to the provided bucket.

### Contributing

Pull Requests are welcome!

##### Running Locally for Development

1. Install Ruby and Node.js on your local machine.
2. Install [foreman](https://github.com/ddollar/foreman) with `gem install foreman`
3. Add your environment variables to a file called `.env` at the base of the repo.
4. Install dependencies with `npm install`
5. Run the bot with `foreman start`
