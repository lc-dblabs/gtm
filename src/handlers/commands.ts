import type { App } from "@slack/bolt";
import * as github from "../github";

export function registerCommands(app: App): void {
  // /repo - Get repository info
  app.command("/repo", async ({ command, ack, respond }) => {
    await ack();

    try {
      const info = await github.getRepoInfo();
      await respond({
        response_type: "in_channel",
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: `Repository: ${info.name}` },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Description:*\n${info.description || "No description"}` },
              { type: "mrkdwn", text: `*Default Branch:*\n${info.defaultBranch}` },
              { type: "mrkdwn", text: `*Open Issues:*\n${info.openIssues}` },
              { type: "mrkdwn", text: `*Stars:*\n${info.stars}` },
            ],
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: "View on GitHub" },
                url: info.url,
              },
            ],
          },
        ],
      });
    } catch (error) {
      await respond(`Error fetching repo info: ${error}`);
    }
  });

  // /prs - List pull requests
  app.command("/prs", async ({ command, ack, respond }) => {
    await ack();

    try {
      const state = (command.text.trim() as "open" | "closed" | "all") || "open";
      const prs = await github.listPullRequests(state);

      if (prs.length === 0) {
        await respond(`No ${state} pull requests found.`);
        return;
      }

      const prBlocks = prs.map((pr) => ({
        type: "section" as const,
        text: {
          type: "mrkdwn" as const,
          text: `*<${pr.url}|#${pr.number}: ${pr.title}>*\nby ${pr.user} - ${pr.state}`,
        },
      }));

      await respond({
        response_type: "in_channel",
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: `Pull Requests (${state})` },
          },
          ...prBlocks,
        ],
      });
    } catch (error) {
      await respond(`Error fetching PRs: ${error}`);
    }
  });

  // /pr <number> - Get specific PR details
  app.command("/pr", async ({ command, ack, respond }) => {
    await ack();

    const prNumber = parseInt(command.text.trim(), 10);
    if (isNaN(prNumber)) {
      await respond("Please provide a valid PR number: `/pr 123`");
      return;
    }

    try {
      const pr = await github.getPullRequest(prNumber);
      await respond({
        response_type: "in_channel",
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: `PR #${pr.number}: ${pr.title}` },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Author:*\n${pr.user}` },
              { type: "mrkdwn", text: `*State:*\n${pr.state}` },
              { type: "mrkdwn", text: `*Mergeable:*\n${pr.mergeable === null ? "Checking..." : pr.mergeable ? "Yes" : "No"}` },
            ],
          },
          {
            type: "section",
            text: { type: "mrkdwn", text: pr.body ? `*Description:*\n${pr.body.substring(0, 500)}${pr.body.length > 500 ? "..." : ""}` : "_No description_" },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: "View PR" },
                url: pr.url,
              },
            ],
          },
        ],
      });
    } catch (error) {
      await respond(`Error fetching PR #${prNumber}: ${error}`);
    }
  });

  // /issues - List issues
  app.command("/issues", async ({ command, ack, respond }) => {
    await ack();

    try {
      const state = (command.text.trim() as "open" | "closed" | "all") || "open";
      const issues = await github.listIssues(state);

      if (issues.length === 0) {
        await respond(`No ${state} issues found.`);
        return;
      }

      const issueBlocks = issues.map((issue) => ({
        type: "section" as const,
        text: {
          type: "mrkdwn" as const,
          text: `*<${issue.url}|#${issue.number}: ${issue.title}>*\nby ${issue.user} - ${issue.labels.join(", ") || "no labels"}`,
        },
      }));

      await respond({
        response_type: "in_channel",
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: `Issues (${state})` },
          },
          ...issueBlocks,
        ],
      });
    } catch (error) {
      await respond(`Error fetching issues: ${error}`);
    }
  });

  // /branches - List branches
  app.command("/branches", async ({ command, ack, respond }) => {
    await ack();

    try {
      const branches = await github.listBranches();
      const branchList = branches.map((b) => `• ${b.name}${b.protected ? " (protected)" : ""}`).join("\n");

      await respond({
        response_type: "in_channel",
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: "Branches" },
          },
          {
            type: "section",
            text: { type: "mrkdwn", text: branchList },
          },
        ],
      });
    } catch (error) {
      await respond(`Error fetching branches: ${error}`);
    }
  });

  // /commits [branch] - List recent commits
  app.command("/commits", async ({ command, ack, respond }) => {
    await ack();

    try {
      const branch = command.text.trim() || undefined;
      const commits = await github.getLatestCommits(branch);

      const commitList = commits.map((c) => `• \`${c.sha}\` ${c.message} - _${c.author}_`).join("\n");

      await respond({
        response_type: "in_channel",
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: `Recent Commits${branch ? ` (${branch})` : ""}` },
          },
          {
            type: "section",
            text: { type: "mrkdwn", text: commitList },
          },
        ],
      });
    } catch (error) {
      await respond(`Error fetching commits: ${error}`);
    }
  });

  // /newissue <title> | <body> - Create a new issue
  app.command("/newissue", async ({ command, ack, respond }) => {
    await ack();

    const parts = command.text.split("|").map((p) => p.trim());
    const title = parts[0];
    const body = parts[1] || "";

    if (!title) {
      await respond("Please provide a title: `/newissue My Issue Title | Optional description`");
      return;
    }

    try {
      const issue = await github.createIssue(title, body);
      await respond({
        response_type: "in_channel",
        blocks: [
          {
            type: "section",
            text: { type: "mrkdwn", text: `Created issue *<${issue.url}|#${issue.number}: ${issue.title}>*` },
          },
        ],
      });
    } catch (error) {
      await respond(`Error creating issue: ${error}`);
    }
  });
}
