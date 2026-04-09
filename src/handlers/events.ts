import type { App } from "@slack/bolt";
import * as github from "../github";

export function registerEvents(app: App): void {
  // Handle app_mention events - when the bot is @mentioned
  app.event("app_mention", async ({ event, say }) => {
    const text = event.text.toLowerCase();

    // Parse commands from mentions
    if (text.includes("repo") || text.includes("repository")) {
      try {
        const info = await github.getRepoInfo();
        await say({
          thread_ts: event.ts,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*${info.name}*\n${info.description || "No description"}\n\n*Branch:* ${info.defaultBranch} | *Open Issues:* ${info.openIssues} | *Stars:* ${info.stars}`,
              },
            },
            {
              type: "actions",
              elements: [
                {
                  type: "button",
                  text: { type: "plain_text", text: "Open GitHub" },
                  url: info.url,
                },
              ],
            },
          ],
        });
      } catch (error) {
        await say({ thread_ts: event.ts, text: `Error: ${error}` });
      }
    } else if (text.includes("pr") || text.includes("pull request")) {
      // Check for specific PR number
      const prMatch = text.match(/(?:pr|pull request)\s*#?(\d+)/i);
      if (prMatch) {
        const prNumber = parseInt(prMatch[1], 10);
        try {
          const pr = await github.getPullRequest(prNumber);
          await say({
            thread_ts: event.ts,
            text: `*<${pr.url}|PR #${pr.number}: ${pr.title}>*\nby ${pr.user} - ${pr.state}${pr.mergeable ? " (mergeable)" : ""}`,
          });
        } catch (error) {
          await say({ thread_ts: event.ts, text: `Error fetching PR #${prNumber}: ${error}` });
        }
      } else {
        // List open PRs
        try {
          const prs = await github.listPullRequests("open");
          if (prs.length === 0) {
            await say({ thread_ts: event.ts, text: "No open pull requests." });
          } else {
            const prList = prs.map((pr) => `• <${pr.url}|#${pr.number}: ${pr.title}> by ${pr.user}`).join("\n");
            await say({ thread_ts: event.ts, text: `*Open Pull Requests:*\n${prList}` });
          }
        } catch (error) {
          await say({ thread_ts: event.ts, text: `Error: ${error}` });
        }
      }
    } else if (text.includes("issue")) {
      // Check for specific issue number
      const issueMatch = text.match(/issue\s*#?(\d+)/i);
      if (issueMatch) {
        const issueNumber = parseInt(issueMatch[1], 10);
        try {
          const issue = await github.getIssue(issueNumber);
          await say({
            thread_ts: event.ts,
            text: `*<${issue.url}|Issue #${issue.number}: ${issue.title}>*\nby ${issue.user} - ${issue.state}\n${issue.body ? issue.body.substring(0, 300) + (issue.body.length > 300 ? "..." : "") : "_No description_"}`,
          });
        } catch (error) {
          await say({ thread_ts: event.ts, text: `Error fetching issue #${issueNumber}: ${error}` });
        }
      } else {
        // List open issues
        try {
          const issues = await github.listIssues("open");
          if (issues.length === 0) {
            await say({ thread_ts: event.ts, text: "No open issues." });
          } else {
            const issueList = issues.map((i) => `• <${i.url}|#${i.number}: ${i.title}>`).join("\n");
            await say({ thread_ts: event.ts, text: `*Open Issues:*\n${issueList}` });
          }
        } catch (error) {
          await say({ thread_ts: event.ts, text: `Error: ${error}` });
        }
      }
    } else if (text.includes("commit")) {
      try {
        const commits = await github.getLatestCommits();
        const commitList = commits.map((c) => `• \`${c.sha}\` ${c.message} - _${c.author}_`).join("\n");
        await say({ thread_ts: event.ts, text: `*Recent Commits:*\n${commitList}` });
      } catch (error) {
        await say({ thread_ts: event.ts, text: `Error: ${error}` });
      }
    } else if (text.includes("branch")) {
      try {
        const branches = await github.listBranches();
        const branchList = branches.map((b) => `• ${b.name}${b.protected ? " (protected)" : ""}`).join("\n");
        await say({ thread_ts: event.ts, text: `*Branches:*\n${branchList}` });
      } catch (error) {
        await say({ thread_ts: event.ts, text: `Error: ${error}` });
      }
    } else if (text.includes("help")) {
      await say({
        thread_ts: event.ts,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*GitHub Bot Commands*\n\n*Slash Commands:*\n• \`/repo\` - Repository info\n• \`/prs [open|closed|all]\` - List pull requests\n• \`/pr <number>\` - PR details\n• \`/issues [open|closed|all]\` - List issues\n• \`/branches\` - List branches\n• \`/commits [branch]\` - Recent commits\n• \`/newissue <title> | <body>\` - Create issue\n\n*Mentions:*\n• \`@bot repo\` - Repository info\n• \`@bot prs\` - Open PRs\n• \`@bot pr #123\` - Specific PR\n• \`@bot issues\` - Open issues\n• \`@bot commits\` - Recent commits\n• \`@bot branches\` - List branches`,
            },
          },
        ],
      });
    } else {
      await say({
        thread_ts: event.ts,
        text: `I'm connected to *${github.owner}/${github.repo}*. Try asking about:\n• \`repo\` - repository info\n• \`prs\` - pull requests\n• \`issues\` - issues\n• \`commits\` - recent commits\n• \`branches\` - branches\n• \`help\` - full command list`,
      });
    }
  });

  // Log messages for debugging (optional)
  app.message(async ({ message }) => {
    // Can handle direct messages or specific patterns here
    // Currently just logs for monitoring
    if ("text" in message && message.channel_type === "im") {
      console.log(`DM received: ${message.text}`);
    }
  });
}
