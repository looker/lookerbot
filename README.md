# Looker Slackbot

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

A bot for [Slack](http://slack.com) that integrates with [Looker](http://looker.com) to make sharing data in your organization easier!

### Deployment

Set an environment variable called `SLACK_API_KEY` to your Slack API key.

Set another environment variable called `LOOKERS` to a JSON array of Looker instances you'd like to integrate with.

The JSON should look something like this:

```json
[{"url": "https://me.looker.com", "apiBaseUrl": "https://me.looker.com:19999/api/3.0", "clientId": "abcdefghjkl", "clientSecret": "abcdefghjkl"},{"url": "https://me-staging.looker.com", "apiBaseUrl": "https://me-staging.looker.com:19999/api/3.0", "clientId": "abcdefghjkl", "clientSecret": "abcdefghjkl"}]
```

### Contributing

Pull Requests are welcome!

##### Running Locally for Development

1. Install Ruby and Node.js on your local machine.
2. Install [foreman](https://github.com/ddollar/foreman) with `gem install foreman`
3. Add your environment variables to a file called `.env` at the base of the repo.
4. Install dependencies with `npm install`
5. Run the bot with `foreman start`
