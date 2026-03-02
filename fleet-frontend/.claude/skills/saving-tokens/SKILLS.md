---
name: saving-tokens
description: Enforces token-efficient behaviors in Claude Code sessions and Claude.ai responses. Use when starting any new task, when context usage exceeds 70%, when MCP servers are active, or when the user wants to reduce token consumption.
---

# Token Efficiency

## Context commands
- `/clear` — between unrelated tasks; never carry stale context across sessions
- `/compact summarize only architectural decisions, omit debugging attempts` — run at 70% context, not 95%
- `/context` — check usage; target <30K tokens per session

## CLAUDE.md rules
Keep CLAUDE.md under 150 tokens:
- Short bullets only, no paragraphs
- List forbidden dirs: node_modules, dist, .git, .next
- Project-critical facts only; no tutorials or explanations

## File references
❌ `Check my auth code`
✅ `Check @src/api/auth.js for JWT bug in verifyUser()`

Always use `@file:line` precision. Never load entire folders.

## Session discipline
1. One task per session
2. Commit to Git after each task
3. `/clear` before next task
4. Reset at 20 back-and-forth iterations max

## MCP servers
Disable idle servers — Linear alone consumes ~14K tokens:
```bash
/mcp   # toggle interactively