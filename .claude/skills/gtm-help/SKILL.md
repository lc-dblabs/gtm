---
name: gtm-help
description: Get help with GTM activities, understand workflows, and learn what Oracle can do
---

# GTM Help

Help users understand the GTM tools and workflows available.

## What Oracle Can Do

Oracle is a Claude-powered assistant that helps with Go-To-Market activities:

1. **GitHub Integration** - Read files, manage issues/PRs, view commits and branches
2. **Skill Execution** - Run workflows defined in SKILL.md files
3. **API Queries** - Fetch data from connected services (Attio, etc.)

## Available Commands (Slack)

- `@Oracle <question>` - Ask anything, Oracle will use relevant skills
- `/skills` - List all available skills
- `/run <skill> — <task>` - Run a specific skill
- `/ask <question>` - Direct question to Oracle

## Using in Claude Code

If you're in Claude Code with this repo:
- Skills auto-load from `.claude/skills/`
- Use `/gtm-help` or just ask about GTM workflows
- Same skills work here and in Slack via Oracle

## Adding New Skills

Create a new folder in `.claude/skills/` with a `SKILL.md` file:

```
.claude/skills/my-skill/
└── SKILL.md
```

SKILL.md format:
```markdown
---
name: my-skill
description: When to use this skill (Claude reads this to decide)
---

# Instructions

Step-by-step instructions Claude will follow...
```
