# Copilot instructions

## Elephant-Goldfish Model (EGM)

This repo uses EGM for design work. The full package is the git submodule at `.egm/`.
If `.egm/skills` is missing, run `git submodule update --init` first.

When the user asks for an EGM skill (egm-brainstorm, egm-draft, egm-review, egm-resolve, egm-review-loop, egm-drift-report, egm-bootstrap):

1. Read `.egm/docs/copilot.md`, then the canonical `.egm/skills/<skill>/SKILL.md`. Follow its workflow and every human approval gate exactly.
2. Resolve `agents/`, `resources/` and `docs/` against the absolute path of `.egm/`. Resolve a skill's `references/` against that skill's folder.
3. Goldfish reviewers: each reviewer must be a NEW subagent with fresh context (use the `task` tool, general-purpose agent, read-only work). Its prompt contains only the canonical persona file from `.egm/agents/`, the mode, the absolute target path, line ranges, standards and an explicit reading list. Never forward conversation history, rationale or prior findings unless the skill stage explicitly requires them. Reviewers must not edit files.
4. If a reviewer cannot be started or fails, stop and report it. Never simulate a review inline.
5. The main session (the Elephant) writes all artifacts to `docs/egm/` unless the user says otherwise.
6. Do not update the `.egm` submodule unless the user asks.
