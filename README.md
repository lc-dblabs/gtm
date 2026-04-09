# GTM Slack Bot

A Slack bot connected to the GTM GitHub repository for team collaboration.

## Features

- View repository info, PRs, issues, branches, and commits
- Create issues directly from Slack
- Works via slash commands or @mentions

## Commands

| Command | Description |
|---------|-------------|
| `/repo` | Repository info |
| `/prs [open\|closed\|all]` | List pull requests |
| `/pr <number>` | Get PR details |
| `/issues [open\|closed\|all]` | List issues |
| `/branches` | List branches |
| `/commits [branch]` | Recent commits |
| `/newissue <title> \| <body>` | Create an issue |

You can also @mention the bot: `@bot prs`, `@bot issue #123`, etc.

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
| `GITHUB_TOKEN` | GitHub Personal Access Token |
| `GITHUB_OWNER` | GitHub org/user (default: lc-dblabs) |
| `GITHUB_REPO` | Repository name (default: gtm) |

## GitHub Token

Create a token at [github.com/settings/tokens](https://github.com/settings/tokens) with:
- `repo` scope for private repos, or
- `public_repo` for public repos only
