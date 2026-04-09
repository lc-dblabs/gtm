# GTM Slack Bot

A Claude-powered Slack bot that executes skills/workflows from GitHub.

## Features

- **AI-powered**: Claude reads and executes SKILL.md workflows from any GitHub repo
- **GitHub integration**: Read files, manage issues/PRs, list commits/branches, write files
- **Skill discovery**: Automatically loads SKILL.md files from `DearbornLabs/dl-shared-kb` and other configured repos
- Works via @mentions, DMs, or slash commands

## Commands

| Command | Description |
|---------|-------------|
| `/skills` | List all skills loaded from GitHub |
| `/skills refresh` | Force-reload skills from GitHub |
| `/skills <name>` | View a specific skill's content |
| `/run <skill> — <task>` | Execute a specific skill |
| `/run <task>` | Claude picks the right skill automatically |
| `/ask <question>` | Ask Claude anything about the repo |
| `/repo` | Repository info |
| `/prs [open\|closed\|all]` | List pull requests |
| `/pr <number>` | Get PR details |
| `/issues [open\|closed\|all]` | List issues |
| `/branches` | List branches |
| `/commits [branch]` | Recent commits |
| `/newissue <title> \| <body>` | Create an issue |

**@mention the bot** with anything — Claude will use the loaded skills to help.

## Setup

### 1. Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" > "From scratch"
3. Name it and select your workspace

### 2. Configure Bot Permissions

Under **OAuth & Permissions**, add these Bot Token Scopes:
- `app_mentions:read`
- `chat:write`
- `commands`
- `im:history`

### 3. Enable Socket Mode (Recommended)

1. Go to **Socket Mode** and enable it
2. Generate an App-Level Token with `connections:write` scope
3. Save the token as `SLACK_APP_TOKEN`

### 4. Create Slash Commands

Under **Slash Commands**, create:
- `/skills`, `/run`, `/ask`
- `/repo`, `/prs`, `/pr`, `/issues`, `/branches`, `/commits`, `/newissue`

### 5. Subscribe to Events

Under **Event Subscriptions**:
- Enable Events
- Subscribe to `app_mention` and `message.im`

### 6. Install the App

Go to **Install App** and install to your workspace.

### 7. Configure Environment

```bash
cp .env.example .env
# Edit .env with your tokens
```

### 8. Run the Bot

```bash
npm install
npm run dev    # Development
npm run build && npm start  # Production
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SLACK_BOT_TOKEN` | Bot User OAuth Token (xoxb-...) |
| `SLACK_SIGNING_SECRET` | Signing Secret from Basic Info |
| `SLACK_APP_TOKEN` | App-Level Token for Socket Mode (xapp-...) |
| `ANTHROPIC_API_KEY` | Your Anthropic API key (sk-ant-...) |
| `CLAUDE_MODEL` | Claude model (default: claude-opus-4-5) |
| `GITHUB_TOKEN` | GitHub Personal Access Token |
| `GITHUB_OWNER` | GitHub org/user (default: DearbornLabs) |
| `GITHUB_REPO` | Repository name (default: dl-shared-kb) |
| `SKILL_SOURCES` | Comma-separated repos to load skills from (default: DearbornLabs/dl-shared-kb) |

## Tokens

**Anthropic**: Get your API key at [console.anthropic.com](https://console.anthropic.com)

**GitHub**: Create a token at [github.com/settings/tokens](https://github.com/settings/tokens) with:
- `repo` scope for private repos, or
- `public_repo` for public repos only

## How Skills Work

The bot scans `SKILL_SOURCES` repos for `SKILL.md` files. Each skill has:
- **Frontmatter** with `name` and `description`
- **Content** with instructions Claude follows

When you @mention the bot or use `/run`, Claude reads the skill instructions and executes them step-by-step using GitHub tools.
