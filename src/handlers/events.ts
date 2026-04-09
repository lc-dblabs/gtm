import type { App } from "@slack/bolt";
import { loadSkills } from "../skills";
import { executeWithClaude } from "../claude";

export function registerEvents(app: App): void {
  // Handle @mention events — powered by Claude with skills from GitHub
  app.event("app_mention", async ({ event, say, client }) => {
    // Strip the bot mention from the message
    const rawText = "text" in event ? event.text : "";
    const userMessage = rawText.replace(/<@[A-Z0-9]+>/g, "").trim();

    if (!userMessage) {
      await say({ thread_ts: event.ts, text: "Hey! Ask me anything about the repo, or run a skill. Try `help` to see what I can do." });
      return;
    }

    // Post a thinking indicator
    const thinkingMsg = await say({ thread_ts: event.ts, text: "_Thinking..._" });

    try {
      // Load skills from all configured GitHub repos
      const skills = await loadSkills();

      // Get user info for context
      let userName = "unknown";
      try {
        const userInfo = await client.users.info({ user: event.user ?? "" });
        userName = userInfo.user?.real_name ?? userInfo.user?.name ?? "unknown";
      } catch {
        // non-fatal
      }

      // Execute with Claude, providing all skills
      const response = await executeWithClaude(userMessage, {
        skills,
        userName,
        channelContext: `Slack channel: ${event.channel}`,
      });

      // Update the thinking message with the real response
      if (thinkingMsg.ts) {
        await client.chat.update({
          channel: event.channel,
          ts: thinkingMsg.ts as string,
          thread_ts: event.ts,
          text: response,
        });
      } else {
        await say({ thread_ts: event.ts, text: response });
      }
    } catch (err) {
      console.error("Error in app_mention handler:", err);
      const errMsg = `Sorry, I hit an error: ${String(err)}`;
      if (thinkingMsg.ts) {
        await client.chat.update({ channel: event.channel, ts: thinkingMsg.ts as string, text: errMsg });
      } else {
        await say({ thread_ts: event.ts, text: errMsg });
      }
    }
  });

  // Handle direct messages
  app.message(async ({ message, say, client }) => {
    if (message.channel_type !== "im") return;
    if (!("text" in message) || !message.text) return;

    const userMessage = message.text.trim();
    const thinkingMsg = await say({ text: "_Thinking..._" });

    try {
      const skills = await loadSkills();

      let userName = "unknown";
      try {
        const userInfo = await client.users.info({ user: "user" in message ? (message.user ?? "") : "" });
        userName = userInfo.user?.real_name ?? userInfo.user?.name ?? "unknown";
      } catch {
        // non-fatal
      }

      const response = await executeWithClaude(userMessage, {
        skills,
        userName,
        channelContext: "Direct message",
      });

      if (thinkingMsg.ts) {
        await client.chat.update({ channel: message.channel, ts: thinkingMsg.ts as string, text: response });
      } else {
        await say({ text: response });
      }
    } catch (err) {
      console.error("Error in DM handler:", err);
      await say({ text: `Sorry, I hit an error: ${String(err)}` });
    }
  });
}
