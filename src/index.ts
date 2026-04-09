import { App } from "@slack/bolt";
import dotenv from "dotenv";
import { registerCommands } from "./handlers/commands";
import { registerEvents } from "./handlers/events";

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ["SLACK_BOT_TOKEN", "SLACK_SIGNING_SECRET", "GITHUB_TOKEN"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Initialize the Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  // Use socket mode if app token is provided (recommended for development)
  ...(process.env.SLACK_APP_TOKEN
    ? {
        socketMode: true,
        appToken: process.env.SLACK_APP_TOKEN,
      }
    : {}),
});

// Register handlers
registerCommands(app);
registerEvents(app);

// Start the app
const port = process.env.PORT || 3000;

(async () => {
  await app.start(port);
  console.log(`GTM Slack Bot is running!`);
  console.log(`Connected to GitHub: ${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}`);
  console.log(`Mode: ${process.env.SLACK_APP_TOKEN ? "Socket Mode" : `HTTP on port ${port}`}`);
})();
