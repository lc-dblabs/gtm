# Oracle (GTM)

Claude-powered Slack bot that executes skills from this repo.

## Setup

### 1. Create Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Create New App → From scratch
3. Add Bot Token Scopes: `app_mentions:read`, `chat:write`, `commands`, `im:history`
4. Enable Socket Mode, generate App-Level Token
5. Create slash commands: `/skills`, `/run`, `/ask`, `/repo`, `/prs`, `/pr`, `/issues`, `/branches`, `/commits`, `/newissue`
6. Subscribe to events: `app_mention`, `message.im`
7. Install to workspace

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your tokens
```

### 3. Run

```bash
npm install
npm run dev    # Development
npm run build && npm start  # Production
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SLACK_BOT_TOKEN` | Bot User OAuth Token (xoxb-...) |
| `SLACK_SIGNING_SECRET` | Signing Secret |
| `SLACK_APP_TOKEN` | App-Level Token for Socket Mode |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `GITHUB_TOKEN` | GitHub PAT with repo access |
| `GITHUB_OWNER` | Default: DearbornLabs |
| `GITHUB_REPO` | Default: dl-shared-kb |
| `SKILL_SOURCES` | Repos to load skills from |

## How It Works

1. User @mentions Oracle or uses `/run`
2. Bot loads SKILL.md files from configured GitHub repos
3. Claude receives skill instructions + user request
4. Claude executes using GitHub tools (and soon Attio, etc.)
5. Response posted to Slack
