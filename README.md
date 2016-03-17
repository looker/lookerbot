# Lookerbot for Slack

Lookerbot for [Slack](http://slack.com) integrates with [Looker](http://looker.com) to allow you to query all of your data directly from Slack. This enables everyone in your company to share data easily and answer data-driven questions instantly. Lookerbot expands Looker URLs in channels and allows you to create custom commands for running saved queries.

> For a free trial of Looker go to [looker.com/free-trial](http://looker.com/free-trial).

### Features

Detailed information on how to interact with Lookerbot [can be found on Looker Discourse](https://discourse.looker.com/t/using-the-lookerbot/2302).

### Requirements

- [Looker](http://looker.com) 3.40 or later
- A server capable of running [Node.js](https://nodejs.org/en/) to deploy the bot application to
- (optional) To display chart images:
  - An [Amazon S3](https://aws.amazon.com/s3/) bucket and access keys

### Deployment

#### Create a new bot in Slack

1. Under "Customize Slack" > "Configure" > "Custom Integrations" select "Bots"
2. Choose "Add Configuration"
3. Create a username for your Slack bot. We use **@looker** but it's up to you.
4. Choose an icon for the Slack bot. [Here's the icon we use](looker-bot-icon-512.png).
5. Grab the API token from the settings page, you'll need this when you set up the bot server.

#### Heroku Deployment

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/looker/looker-slackbot/tree/master)

The quickest way to deploy the bot is to use Heroku's one-click deploy button, which will provision a server for your bot.

#### Manual Deployment

The bot is a simple Node.js application. The application needs to be able to reach both your Looker instance's API and Slack's API.

The bot is configured entirely via environment variables. You'll want to set up these variables:

- `SLACK_API_KEY` (required) – Your Slack API key for the bot. You'll have gotten this when you created the bot user in the Slack settings.

- `LOOKER_URL` (required) – The web url of your Looker instance.

- `LOOKER_API_BASE_URL` (required) – The API 3.0 endpoint of your Looker instance.

- `LOOKER_API_3_CLIENT_ID` (required) – The API 3.0 client ID for the user you want the bot to run as.

- `LOOKER_API_3_CLIENT_SECRET` (required) – The API 3.0 client secret for the user you want the bot to run as.

- `LOOKER_CUSTOM_COMMAND_SPACE_ID` (optional) – The ID of a Space that you would like the bot to use to define custom commands.

- `SLACKBOT_S3_BUCKET` (optional) – If you want to use the Slack bot to post visualization images, provide an Amazon S3 bucket name.

- `AWS_ACCESS_KEY_ID` (optional) – If you want to use the Slack bot to post visualization images, provide an Amazon S3 access key that can write to the provided bucket.

- `AWS_SECRET_ACCESS_KEY` (optional) – If you want to use the Slack bot to post visualization images, provide an Amazon S3 secret access key that can write to the provided bucket.

- `SLACK_SLASH_COMMAND_TOKEN` (optional) – If you want to use slash commands with the Slack bot, provide the verification token from the slash command setup page so that the bot can verify the integrity of incoming slash commands.

- `PORT` (optional) – The port that the bot web server will run on to accept slash commands. Defaults to `3333`.

If you'd like to put these configurations on the filesystem, you can place them in a `.env` file at the root of the project and start the bot using node-foreman [as described below](#running-locally-for-development).

##### Connecting the bot to multiple Looker instances

If you would like the bot to connect to multiple instances of Looker, then you can configure the bot with the `LOOKERS` environment variable. This variable should be JSON array of JSON objects, each representing a Looker instance and its authentication information.

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

The `LOOKER_URL`, `LOOKER_API_BASE_URL`, `LOOKER_API_3_CLIENT_ID`, `LOOKER_API_3_CLIENT_SECRET`, and `LOOKER_CUSTOM_COMMAND_SPACE_ID` variables are ignored when `LOOKERS` is set.

##### Running the Server

To run the server:

1. Ensure Node.js is installed
2. `npm install` to install dependencies
3. `npm start` to start the bot server. The server will run until you type `Crl+C` to stop it.

The included `Procfile` will also allow you to run the app using [foreman](https://github.com/ddollar/foreman) or [node-foreman](https://github.com/jeffjewiss/node-foreman). These libraries also provide easy ways of creating scripts for use with `upstart`, `supervisord`, and `systemd`.

### Configuring Slash Commands

Slash commands are not required to interact with the bot. You can DM the bot directly or mention the bot like:

> @lookerbot help

and use all the functionality.

However, Slash commands are a bit friendlier to use and allow Slack to auto-complete so you'll probably want to set those up.

1. Under "Customize Slack" > "Configure" > "Custom Integrations" select "Slash Commands"
2. Choose "Add Configuration"
3. Create a command to use for the Looker bot. We use **/looker** but it's up to you.
4. Choose an icon for the slash command responses. [Here's the icon we use](looker-bot-icon-512.png).
5. Set the URL to wherever you have your bot server hosted. The path to the slash command endpoint is `/slack/receive`, so if your bot is hosted at `https://example.com`, the URL would be `https://example.com/slack/receive`.
6. You'll need to copy the token provided when you created the slash command and set the `SLACK_SLASH_COMMAND_TOKEN` variable with it for the bot to accept slash commands.

### Data Access

We suggest creating a Looker user specifically for the Slack bot, and using that user's API credentials. It's worth remembering that _everyone who can talk to your Slack bot has the permissions of this user_. If there's data you don't want people to access via Slack, ensure that user cannot access it using Looker's permissioning mechanisms.

Also, keep in mind that when the Looker bot answers questions in Slack _the resulting data moves into Slack and is now hosted there_. Be sure to carefully consider what data is allowed to leave Looker. Slack retains chat message history on their servers and pushes many types of notifications about messages out via other services.

To allow visualizations to appear in Slack, if configured to do so, the bot uploads them as images to Amazon S3 with an extremely long randomly-generated URL. Anyone with this URL can access that image at any time, though it should be extremely difficult to guess.

If you choose to remove the image files from S3, the Slack messages that relied on those images will be blank.

### Running Locally for Development

1. Install [Node.js](https://nodejs.org/en/) on your local machine.
2. Install [node-foreman](https://github.com/jeffjewiss/node-foreman) with `npm install -g foreman`
3. Add your environment variables to a file called `.env` at the base of the repo.
4. Install dependencies with `npm install`
5. Run the bot with `nf start`

### Contributing

Pull Requests are welcome – we'd love to have help expanding the bot's functionality.

If you have any trouble with the bot, please open an issue so we can help you out!
