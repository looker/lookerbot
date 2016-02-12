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


##### Create a new bot in Slack

1. Under "Customize Slack" > "Configure" > "Custom Integrations" select "Bots"
2. Choose "Add Configuration"
3. Create a username for your Slack bot. We use **@lookerbot** but it's up to you.
4. Grab the API token from the settings page, you'll need this when you set up the bot server.

##### Configure Bot Server

The bot is a simple Node.js application. The application needs to be able to reach both your Looker instance's API and Slack's API.

The bot is configured entirely via environment variables. You'll want to set up these variables:

- `SLACK_API_KEY` (required) – Your Slack API key for the bot. You'll have gotten this when you created the bot user in the Slack settings.

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

- `PORT` (optional) – The port that the bot web server will run on to accept slash commands. Defaults to `3333`.

##### Running the Server

If you've deployed the bot to Heroku, the included `Procfile` will handle running the server and configure the `PORT` environment variable for you. This is probably the easiest way to run the server.

If you're running the server yourself, you'll need to do the following:

1. Ensure Node.js is installed
2. `npm install` to install dependencies
3. `npm start` to start the bot server. The server will run until you type `Crl+C` to stop it.

The included `Procfile` will also allow you to run the app using [foreman](https://github.com/ddollar/foreman) or [node-foreman](https://github.com/jeffjewiss/node-foreman). These libraries also provide easy ways of creating scripts for use with `upstart`, `supervisord`, and `systemd`.

##### Configuring slash commands

Slash commands are not required to interact with the bot. You can DM the bot directly or mention the bot like:

> @lookerbot help

and use all the functionality.

However, Slash commands are a bit friendlier to use and allow Slack to auto-complete so you'll probably want to set those up.

1. Under "Customize Slack" > "Configure" > "Custom Integrations" select "Slash Commands"
2. Choose "Add Configuration"
3. Create a command to use for the Looker bot. We use **/looker** but it's up to you.
4. You can configure the options for the slash command however you like, but you'll need to set the URL to wherever you have your bot server hosted. The path to the slash command endpoint is `/slack/receive`, so if your bot is hosted at `https://example.com`, the URL would be `https://example.com/slack/receive`.

### Contributing

Pull Requests are welcome – we'd love to have help expanding the bot's functionality.

##### Running Locally for Development

1. Install Ruby and Node.js on your local machine.
2. Install [foreman](https://github.com/ddollar/foreman) with `gem install foreman`
3. Add your environment variables to a file called `.env` at the base of the repo.
4. Install dependencies with `npm install`
5. Run the bot with `foreman start`
