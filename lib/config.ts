import * as dotenv from "dotenv"

dotenv.config()

const config = {
  debugMode: process.env.DEBUG_MODE === "true",
  enableGuestUsers: process.env.ALLOW_SLACK_GUEST_USERS === "true",
  hipchatAuthToken: process.env.HIPCHAT_AUTH_TOKEN,
  lookerbotAuthorizationToken: (process.env.LOOKERBOT_AUTH_TOKEN as string | undefined),
  npmPackage: require("./../package.json"),
  slackApiKey: process.env.SLACK_API_KEY,
  unsafeLocalDev: process.env.UNSAFE_LOCAL_DEV === "true",
}

if (config.unsafeLocalDev) {
  // Allow communicating with Lookers running on localhost with self-signed certificates
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0
}

/* tslint:disable:no-default-export */
export default config
