import * as dotenv from "dotenv";
import * as jsonfile from "jsonfile";

dotenv.config();

let config = {
  enableGuestUsers: process.env.ALLOW_SLACK_GUEST_USERS === "true",
  unsafeLocalDev: process.env.UNSAFE_LOCAL_DEV === "true",
  slackApiKey: process.env.SLACK_API_KEY,
  debugMode: process.env.DEBUG_MODE === "true",
  npmPackage: require("./../package.json"),
};

if (config.unsafeLocalDev) {
  // Allow communicating with Lookers running on localhost with self-signed certificates
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
}

export default config;