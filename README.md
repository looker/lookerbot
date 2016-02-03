# Looker Slackbot

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

A bot for [Slack](http://slack.com) that integrates with [Looker](http://slack.com) to make sharing data in your organization easier!

### Configuration

Set an environment variable called `SLACK_API_KEY` to your Slack API key.

Set another environment variable called `LOOKERS` to a JSON array of Looker instances you'd like to integrate with.

The JSON should look something like this:

```json
[{"url": "https://me.looker.com", "apiBaseUrl": "https://me.looker.com:19999/api/3.0", "clientId": "abcdefghjkl", "clientSecret": "abcdefghjkl"},{"url": "https://me-staging.looker.com", "apiBaseUrl": "https://me-staging.looker.com:19999/api/3.0", "clientId": "abcdefghjkl", "clientSecret": "abcdefghjkl"}]
```

### Running Locally

1. Install [foreman](https://github.com/ddollar/foreman) with `gem install foreman`
2. Add your environment variables to a file called `.env` at the base of the repo.
3. Install dependencies with `npm install`
3. Run the bot with `foreman start`
