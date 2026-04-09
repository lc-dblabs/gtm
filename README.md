# DearbornLabs Shared Knowledge Base

Shared skills, workflows, and tools for the GTM team.

## Structure

```
dl-shared-kb/
├── .claude/
│   └── skills/           # Skills auto-load in Claude Code
│       ├── gtm-help/     # Help & onboarding
│       ├── attio-lookup/ # CRM queries (TODO: implement)
│       └── ...
├── oracle/               # Oracle (GTM) Slack bot
│   ├── src/
│   ├── package.json
│   └── .env.example
└── README.md
```

## For Colleagues: Using Skills

### Option 1: Slack (via Oracle)
Just @mention `@Oracle` in Slack and ask your question. Oracle reads these skills and executes them.

```
@Oracle What's the status of the Acme deal?
@Oracle help
```

### Option 2: Claude Code (directly)
Clone this repo and skills auto-load:

```bash
git clone https://github.com/DearbornLabs/dl-shared-kb
cd dl-shared-kb
# Open Claude Code - skills are now available
```

Then just ask Claude or use `/skills` to see what's available.

## Available Skills

| Skill | Description |
|-------|-------------|
| `gtm-help` | Get help with GTM tools and workflows |
| `attio-lookup` | Query Attio CRM for contacts, deals, companies |

## Adding Skills

Create a folder in `.claude/skills/` with a `SKILL.md`:

```
.claude/skills/my-skill/
└── SKILL.md
```

See [gtm-help](.claude/skills/gtm-help/SKILL.md) for an example.

---

## Oracle Bot (for admins)

The Slack bot lives in `oracle/`. See [oracle/README.md](oracle/README.md) for deployment.
