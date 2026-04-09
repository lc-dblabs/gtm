import { App } from "@slack/bolt";
import dotenv from "dotenv";
import { registerCommands } from "./handlers/commands";
import { registerEvents } from "./handlers/events";
import { loadSkills, getSkillSources } from "./skills";

// Load environment variables
dotenv.config();

// Validate required environment variables
const required = ["SLACK_BOT_TOKEN", "SLACK_SIGNING_SECRET", "GITHUB_TOKEN", "ANTHROPIC_API_KEY"];
for (const envVar of required) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Initialize the Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  ...(process.env.SLACK_APP_TOKEN
    ? { socketMode: true, appToken: process.env.SLACK_APP_TOKEN }
    : {}),
});

// Register handlers
registerCommands(app);
registerEvents(app);

const port = process.env.PORT || 3000;

(async () => {
  await app.start(port);

  const sources = getSkillSources();
  console.log(`GTM Slack Bot running!`);
  console.log(`GitHub repo: ${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}`);
  console.log(`Skill sources: ${sources.map((s) => `${s.owner}/${s.repo}`).join(", ")}`);
  console.log(`Mode: ${process.env.SLACK_APP_TOKEN ? "Socket Mode" : `HTTP on port ${port}`}`);

  // Pre-load skills at startup
  try {
    const skills = await loadSkills();
    console.log(`Pre-loaded ${skills.length} skills from GitHub`);
  } catch (err) {
    console.warn(`Could not pre-load skills: ${err}`);
  }
})();
