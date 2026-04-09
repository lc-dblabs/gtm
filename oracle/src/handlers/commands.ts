import type { App } from "@slack/bolt";
import * as github from "../github";
import { loadSkills, formatSkillList, getSkill, getSkillSources } from "../skills";
import { executeWithClaude } from "../claude";

export function registerCommands(app: App): void {
  // /skills - List all available skills from GitHub repos
  app.command("/skills", async ({ command, ack, respond }) => {
    await ack();

    const arg = command.text.trim();

    // /skills refresh - force reload from GitHub
    if (arg === "refresh") {
      try {
        const skills = await loadSkills(true);
        await respond({
          response_type: "ephemeral",
          text: `Refreshed ${skills.length} skills from GitHub.\n\n${formatSkillList(skills)}`,
        });
      } catch (err) {
        await respond(`Error refreshing skills: ${err}`);
      }
      return;
    }

    // /skills <name> - show a specific skill's content
    if (arg) {
      try {
        const skill = await getSkill(arg);
        if (!skill) {
          await respond(`Skill \`${arg}\` not found. Run \`/skills\` to see all available skills.`);
          return;
        }
        await respond({
          response_type: "ephemeral",
          blocks: [
            {
              type: "header",
              text: { type: "plain_text", text: `Skill: ${skill.name}` },
            },
            {
              type: "section",
              fields: [
                { type: "mrkdwn", text: `*Source:*\n${skill.source}` },
                { type: "mrkdwn", text: `*Path:*\n${skill.path}` },
              ],
            },
            {
              type: "section",
              text: { type: "mrkdwn", text: `*Description:*\n${skill.description}` },
            },
            {
              type: "section",
              text: { type: "mrkdwn", text: `\`\`\`\n${skill.content.substring(0, 2000)}${skill.content.length > 2000 ? "\n... (truncated)" : ""}\n\`\`\`` },
            },
          ],
        });
      } catch (err) {
        await respond(`Error loading skill: ${err}`);
      }
      return;
    }

    // /skills - list all
    try {
      const skills = await loadSkills();
      const sources = getSkillSources();

      await respond({
        response_type: "ephemeral",
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: `Skills (${skills.length} loaded)` },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Sources:* ${sources.map((s) => `\`${s.owner}/${s.repo}\``).join(", ")}\n\n${formatSkillList(skills)}`,
            },
          },
          {
            type: "context",
            elements: [{ type: "mrkdwn", text: "Use `/skills refresh` to reload • `/skills <name>` to view a skill • `/run <skill> — <task>` to execute" }],
          },
        ],
      });
    } catch (err) {
      await respond(`Error loading skills: ${err}`);
    }
  });

  // /run <skill-name> — <task description>
  // Executes a specific skill with Claude
  app.command("/run", async ({ command, ack, respond, client }) => {
    await ack();

    const input = command.text.trim();
    if (!input) {
      await respond("Usage: `/run <skill-name> — <task>` or `/run <task>` to let Claude choose the right skill.");
      return;
    }

    // Post thinking state
    await respond({ response_type: "in_channel", text: `_Running: ${input}..._` });

    try {
      const skills = await loadSkills();

      // Check if a specific skill is named before the — delimiter
      let skillName: string | undefined;
      let userTask = input;

      const delimIdx = input.indexOf("—");
      const dashIdx = input.indexOf(" - ");
      const separatorIdx = delimIdx !== -1 ? delimIdx : dashIdx !== -1 ? dashIdx : -1;

      if (separatorIdx !== -1) {
        skillName = input.substring(0, separatorIdx).trim();
        userTask = input.substring(separatorIdx + 1).trim();
      }

      // Find matching skill
      let matchedSkills = skills;
      if (skillName) {
        const found = await getSkill(skillName);
        if (found) {
          matchedSkills = [found];
        } else {
          await respond(`Skill \`${skillName}\` not found. Running with all skills instead.`);
        }
      }

      const response = await executeWithClaude(userTask, {
        skills: matchedSkills,
        skillName,
        channelContext: `Slack channel command from ${command.channel_name}`,
        userName: command.user_name,
      });

      await respond({ response_type: "in_channel", text: response });
    } catch (err) {
      await respond(`Error running skill: ${err}`);
    }
  });

  // /ask <question> - Ask Claude anything about the repo (no skill context)
  app.command("/ask", async ({ command, ack, respond }) => {
    await ack();

    const question = command.text.trim();
    if (!question) {
      await respond("Usage: `/ask <question about the repo>`");
      return;
    }

    await respond({ response_type: "in_channel", text: "_Thinking..._" });

    try {
      const response = await executeWithClaude(question, {
        userName: command.user_name,
        channelContext: `Slack channel: ${command.channel_name}`,
      });
      await respond({ response_type: "in_channel", text: response });
    } catch (err) {
      await respond(`Error: ${err}`);
    }
  });

  // --- Original GitHub commands below ---

  app.command("/repo", async ({ ack, respond }) => {
    await ack();
    try {
      const info = await github.getRepoInfo();
      await respond({
        response_type: "in_channel",
        blocks: [
          { type: "header", text: { type: "plain_text", text: `Repository: ${info.name}` } },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Description:*\n${info.description || "No description"}` },
              { type: "mrkdwn", text: `*Default Branch:*\n${info.defaultBranch}` },
              { type: "mrkdwn", text: `*Open Issues:*\n${info.openIssues}` },
              { type: "mrkdwn", text: `*Stars:*\n${info.stars}` },
            ],
          },
          { type: "actions", elements: [{ type: "button", text: { type: "plain_text", text: "View on GitHub" }, url: info.url }] },
        ],
      });
    } catch (err) {
      await respond(`Error fetching repo info: ${err}`);
    }
  });

  app.command("/prs", async ({ command, ack, respond }) => {
    await ack();
    try {
      const state = (command.text.trim() as "open" | "closed" | "all") || "open";
      const prs = await github.listPullRequests(state);
      if (prs.length === 0) { await respond(`No ${state} pull requests found.`); return; }
      await respond({
        response_type: "in_channel",
        blocks: [
          { type: "header", text: { type: "plain_text", text: `Pull Requests (${state})` } },
          ...prs.map((pr) => ({ type: "section" as const, text: { type: "mrkdwn" as const, text: `*<${pr.url}|#${pr.number}: ${pr.title}>*\nby ${pr.user} — ${pr.state}` } })),
        ],
      });
    } catch (err) {
      await respond(`Error fetching PRs: ${err}`);
    }
  });

  app.command("/pr", async ({ command, ack, respond }) => {
    await ack();
    const prNumber = parseInt(command.text.trim(), 10);
    if (isNaN(prNumber)) { await respond("Usage: `/pr 123`"); return; }
    try {
      const pr = await github.getPullRequest(prNumber);
      await respond({
        response_type: "in_channel",
        blocks: [
          { type: "header", text: { type: "plain_text", text: `PR #${pr.number}: ${pr.title}` } },
          { type: "section", fields: [{ type: "mrkdwn", text: `*Author:*\n${pr.user}` }, { type: "mrkdwn", text: `*State:*\n${pr.state}` }, { type: "mrkdwn", text: `*Mergeable:*\n${pr.mergeable === null ? "Checking..." : pr.mergeable ? "Yes" : "No"}` }] },
          { type: "section", text: { type: "mrkdwn", text: pr.body ? `*Description:*\n${pr.body.substring(0, 500)}${pr.body.length > 500 ? "..." : ""}` : "_No description_" } },
          { type: "actions", elements: [{ type: "button", text: { type: "plain_text", text: "View PR" }, url: pr.url }] },
        ],
      });
    } catch (err) {
      await respond(`Error fetching PR: ${err}`);
    }
  });

  app.command("/issues", async ({ command, ack, respond }) => {
    await ack();
    try {
      const state = (command.text.trim() as "open" | "closed" | "all") || "open";
      const issues = await github.listIssues(state);
      if (issues.length === 0) { await respond(`No ${state} issues found.`); return; }
      await respond({
        response_type: "in_channel",
        blocks: [
          { type: "header", text: { type: "plain_text", text: `Issues (${state})` } },
          ...issues.map((i) => ({ type: "section" as const, text: { type: "mrkdwn" as const, text: `*<${i.url}|#${i.number}: ${i.title}>*\nby ${i.user} — ${i.labels.join(", ") || "no labels"}` } })),
        ],
      });
    } catch (err) {
      await respond(`Error fetching issues: ${err}`);
    }
  });

  app.command("/branches", async ({ ack, respond }) => {
    await ack();
    try {
      const branches = await github.listBranches();
      const branchList = branches.map((b) => `• ${b.name}${b.protected ? " (protected)" : ""}`).join("\n");
      await respond({ response_type: "in_channel", blocks: [{ type: "header", text: { type: "plain_text", text: "Branches" } }, { type: "section", text: { type: "mrkdwn", text: branchList } }] });
    } catch (err) {
      await respond(`Error fetching branches: ${err}`);
    }
  });

  app.command("/commits", async ({ command, ack, respond }) => {
    await ack();
    try {
      const branch = command.text.trim() || undefined;
      const commits = await github.getLatestCommits(branch);
      const commitList = commits.map((c) => `• \`${c.sha}\` ${c.message} — _${c.author}_`).join("\n");
      await respond({ response_type: "in_channel", blocks: [{ type: "header", text: { type: "plain_text", text: `Recent Commits${branch ? ` (${branch})` : ""}` } }, { type: "section", text: { type: "mrkdwn", text: commitList } }] });
    } catch (err) {
      await respond(`Error fetching commits: ${err}`);
    }
  });

  app.command("/newissue", async ({ command, ack, respond }) => {
    await ack();
    const parts = command.text.split("|").map((p) => p.trim());
    const title = parts[0];
    if (!title) { await respond("Usage: `/newissue My Issue Title | Optional description`"); return; }
    try {
      const issue = await github.createIssue(title, parts[1] || "");
      await respond({ response_type: "in_channel", blocks: [{ type: "section", text: { type: "mrkdwn", text: `Created issue *<${issue.url}|#${issue.number}: ${issue.title}>*` } }] });
    } catch (err) {
      await respond(`Error creating issue: ${err}`);
    }
  });
}
