# Tech Stack

- Next.js, PostgreSQL.
- Everything is Docker-containerized except Next.js — runs locally for fast iteration without rebuilding containers on every change.

# Rules

- Think first, read relevant files before answering. Never speculate about code you haven't opened.
- If a file is referenced, read it before responding. Investigate before answering — no hallucinations.
- Give a high-level explanation of changes at every step.
- Commit and push whenever you see fit — no need to wait for approval.

# Planning

- Maintain a `plan/` folder in the project root.
- Create and update plan files there for every feature or task.
- Plans persist across sessions — always check `plan/` before starting work.

# Documentation

- Maintain a `docs/` folder in the project root.
- Create or update doc files on every feature addition or update.
- Keep an architecture doc describing how the app works inside and out.

# Testing

- Test every added feature.
- After medium+ features, test in browser — logins and main user paths.

# Docker

- Always rebuild containers with `--no-cache` when changing anything container-based.

# Tools

- For any frontend work, always use the `frontend-design` skill.
- Always use Context7 MCP whenever needed.
