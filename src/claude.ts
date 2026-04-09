import Anthropic from "@anthropic-ai/sdk";
import { Octokit } from "@octokit/rest";
import type { Skill } from "./skills";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const DEFAULT_OWNER = process.env.GITHUB_OWNER || "DearbornLabs";
const DEFAULT_REPO = process.env.GITHUB_REPO || "dl-shared-kb";
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-4-5";
const MAX_TOKENS = 4096;

// GitHub tools Claude can use during skill execution
const GITHUB_TOOLS: Anthropic.Tool[] = [
  {
    name: "github_get_file",
    description: "Read a file from the GitHub repository",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "File path in the repo" },
        owner: { type: "string", description: "Repo owner (defaults to configured repo)" },
        repo: { type: "string", description: "Repo name (defaults to configured repo)" },
      },
      required: ["path"],
    },
  },
  {
    name: "github_list_directory",
    description: "List files in a directory of the GitHub repository",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "Directory path (use '/' for root)" },
        owner: { type: "string", description: "Repo owner" },
        repo: { type: "string", description: "Repo name" },
      },
      required: ["path"],
    },
  },
  {
    name: "github_list_issues",
    description: "List issues in the GitHub repository",
    input_schema: {
      type: "object" as const,
      properties: {
        state: { type: "string", enum: ["open", "closed", "all"], description: "Issue state filter" },
        labels: { type: "string", description: "Comma-separated label names to filter by" },
      },
    },
  },
  {
    name: "github_get_issue",
    description: "Get details of a specific GitHub issue",
    input_schema: {
      type: "object" as const,
      properties: {
        issue_number: { type: "number", description: "Issue number" },
      },
      required: ["issue_number"],
    },
  },
  {
    name: "github_create_issue",
    description: "Create a new GitHub issue",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Issue title" },
        body: { type: "string", description: "Issue body (markdown)" },
        labels: { type: "array", items: { type: "string" }, description: "Labels to apply" },
      },
      required: ["title"],
    },
  },
  {
    name: "github_add_issue_comment",
    description: "Add a comment to a GitHub issue or pull request",
    input_schema: {
      type: "object" as const,
      properties: {
        issue_number: { type: "number", description: "Issue or PR number" },
        body: { type: "string", description: "Comment body (markdown)" },
      },
      required: ["issue_number", "body"],
    },
  },
  {
    name: "github_list_pull_requests",
    description: "List pull requests in the GitHub repository",
    input_schema: {
      type: "object" as const,
      properties: {
        state: { type: "string", enum: ["open", "closed", "all"], description: "PR state filter" },
      },
    },
  },
  {
    name: "github_get_pull_request",
    description: "Get details of a specific pull request",
    input_schema: {
      type: "object" as const,
      properties: {
        pull_number: { type: "number", description: "Pull request number" },
      },
      required: ["pull_number"],
    },
  },
  {
    name: "github_list_commits",
    description: "List recent commits in the repository",
    input_schema: {
      type: "object" as const,
      properties: {
        branch: { type: "string", description: "Branch name (optional)" },
        per_page: { type: "number", description: "Number of commits to return (max 20)" },
      },
    },
  },
  {
    name: "github_list_branches",
    description: "List branches in the GitHub repository",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "github_create_file",
    description: "Create or update a file in the GitHub repository",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "File path" },
        content: { type: "string", description: "File content" },
        message: { type: "string", description: "Commit message" },
        branch: { type: "string", description: "Branch (defaults to main)" },
      },
      required: ["path", "content", "message"],
    },
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeTool(name: string, input: Record<string, any>): Promise<string> {
  const owner = input.owner ?? DEFAULT_OWNER;
  const repo = input.repo ?? DEFAULT_REPO;

  try {
    switch (name) {
      case "github_get_file": {
        const { data } = await octokit.repos.getContent({ owner, repo, path: input.path });
        if ("content" in data && typeof data.content === "string") {
          return Buffer.from(data.content, "base64").toString("utf-8");
        }
        return JSON.stringify(data);
      }

      case "github_list_directory": {
        const { data } = await octokit.repos.getContent({ owner, repo, path: input.path });
        if (Array.isArray(data)) {
          return data.map((f) => `${f.type === "dir" ? "📁" : "📄"} ${f.name}`).join("\n");
        }
        return JSON.stringify(data);
      }

      case "github_list_issues": {
        const { data } = await octokit.issues.listForRepo({
          owner,
          repo,
          state: input.state ?? "open",
          labels: input.labels,
          per_page: 15,
        });
        return JSON.stringify(
          data
            .filter((i) => !i.pull_request)
            .map((i) => ({ number: i.number, title: i.title, state: i.state, url: i.html_url, labels: i.labels.map((l) => (typeof l === "string" ? l : l.name)) }))
        );
      }

      case "github_get_issue": {
        const { data } = await octokit.issues.get({ owner, repo, issue_number: input.issue_number });
        return JSON.stringify({ number: data.number, title: data.title, body: data.body, state: data.state, url: data.html_url, labels: data.labels.map((l) => (typeof l === "string" ? l : l.name)) });
      }

      case "github_create_issue": {
        const { data } = await octokit.issues.create({ owner, repo, title: input.title, body: input.body ?? "", labels: input.labels ?? [] });
        return JSON.stringify({ number: data.number, url: data.html_url, title: data.title });
      }

      case "github_add_issue_comment": {
        const { data } = await octokit.issues.createComment({ owner, repo, issue_number: input.issue_number, body: input.body });
        return `Comment created: ${data.html_url}`;
      }

      case "github_list_pull_requests": {
        const { data } = await octokit.pulls.list({ owner, repo, state: input.state ?? "open", per_page: 10 });
        return JSON.stringify(data.map((pr) => ({ number: pr.number, title: pr.title, state: pr.state, user: pr.user?.login, url: pr.html_url })));
      }

      case "github_get_pull_request": {
        const { data } = await octokit.pulls.get({ owner, repo, pull_number: input.pull_number });
        return JSON.stringify({ number: data.number, title: data.title, body: data.body, state: data.state, user: data.user?.login, url: data.html_url, mergeable: data.mergeable });
      }

      case "github_list_commits": {
        const { data } = await octokit.repos.listCommits({ owner, repo, sha: input.branch, per_page: Math.min(input.per_page ?? 5, 20) });
        return JSON.stringify(data.map((c) => ({ sha: c.sha.substring(0, 7), message: c.commit.message.split("\n")[0], author: c.commit.author?.name, date: c.commit.author?.date })));
      }

      case "github_list_branches": {
        const { data } = await octokit.repos.listBranches({ owner, repo, per_page: 30 });
        return JSON.stringify(data.map((b) => ({ name: b.name, protected: b.protected })));
      }

      case "github_create_file": {
        // Check if file exists to get its SHA for update
        let existingSha: string | undefined;
        try {
          const { data } = await octokit.repos.getContent({ owner, repo, path: input.path });
          if ("sha" in data) existingSha = data.sha;
        } catch {
          // File doesn't exist yet, that's fine
        }
        const { data } = await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: input.path,
          message: input.message,
          content: Buffer.from(input.content).toString("base64"),
          branch: input.branch ?? "main",
          sha: existingSha,
        });
        return `File ${existingSha ? "updated" : "created"}: ${data.content?.html_url}`;
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err) {
    return `Tool error: ${String(err)}`;
  }
}

export interface ExecuteOptions {
  skills?: Skill[];
  skillName?: string; // Force a specific skill
  channelContext?: string;
  userName?: string;
}

export async function executeWithClaude(userMessage: string, options: ExecuteOptions = {}): Promise<string> {
  const { skills = [], skillName, channelContext, userName } = options;

  // Build system prompt
  const skillDescriptions = skills.length > 0
    ? `## Available Skills\n\nYou have access to the following skills/workflows from GitHub. When a user's request matches a skill, follow that skill's instructions:\n\n${skills.map((s) => `### ${s.name} (from ${s.source})\n${s.description}\n\n<skill_content>\n${s.content}\n</skill_content>`).join("\n\n---\n\n")}`
    : "";

  const systemPrompt = `You are a GTM (Go-To-Market) assistant bot connected to GitHub. You help the team with their workflows and activities.

You are connected to the GitHub repo: ${DEFAULT_OWNER}/${DEFAULT_REPO}

You have tools to read files, manage issues, review pull requests, inspect commits and branches, and write files to GitHub.

${skillDescriptions}

When executing skills/workflows, follow the skill instructions step by step. Use your GitHub tools to interact with the repository as needed. Be concise in your Slack responses — use markdown formatting but keep it readable.

${channelContext ? `Channel context: ${channelContext}` : ""}
${userName ? `User: ${userName}` : ""}`;

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  // Agentic loop — Claude calls tools until it's done
  let response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    tools: GITHUB_TOOLS,
    messages,
  });

  let iterations = 0;
  const MAX_ITERATIONS = 10;

  while (response.stop_reason === "tool_use" && iterations < MAX_ITERATIONS) {
    iterations++;

    // Collect tool uses from this response
    const toolUseBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUseBlocks) {
      console.log(`Claude calling tool: ${toolUse.name}`, toolUse.input);
      const result = await executeTool(toolUse.name, toolUse.input as Record<string, unknown>);
      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: result,
      });
    }

    // Continue the conversation with tool results
    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });

    response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      tools: GITHUB_TOOLS,
      messages,
    });
  }

  // Extract final text response
  const textBlocks = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text");
  return textBlocks.map((b) => b.text).join("\n") || "_No response generated._";
}
