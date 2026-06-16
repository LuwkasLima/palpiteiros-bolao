## Project working style

- For non-trivial work, explore first and make a brief plan before implementing.
- Use subagents for broad investigation, parallel analysis, or independent review when that will keep the main context focused.
- Prefer simple, root-cause fixes over temporary patches.
- Minimize change surface area; only touch what is necessary.

## Verification expectations

- Do not consider work complete until relevant verification has been performed.
- Use the most appropriate checks for the task: tests, linting, logs, local validation, or behavioral comparison.
- When changing existing behavior, verify the result matches intended behavior and does not regress adjacent functionality.

## Communication

- Summarize intended approach before starting non-trivial implementation.
- Report meaningful progress at natural checkpoints for multi-step work.
- Call out risks, assumptions, and open questions early rather than pushing through ambiguity.

## Repository conventions

- `tasks/todo.md` is the user's backlog. Do not write to it unless explicitly asked.
- For in-session task tracking, use the `TodoWrite` tool (in-memory only, never written to disk).
- When a task requires a multi-step plan written to disk, create a named file like `tasks/plan-<topic>.md` and delete it when the work is done. Never use `tasks/todo.md` for this.
- Keep project lessons and recurring gotchas in `tasks/lessons.md` only when those lessons are meant to be shared by the team.
- Prefer concise updates over long narrative logs.

## Quality bar

- Ask whether the solution is the simplest correct approach.
- Avoid hacky fixes when a clean, durable solution is reasonable within scope.
- Make changes that a senior engineer could review and understand quickly.

## Changelog (mandatory after every feature)

After completing any user-facing feature, do both of the following before considering the work done:

1. **Evaluate relevance**: Decide whether the change is meaningful enough to surface to users. Changelog-worthy changes are things a user would notice or care about — new capabilities, visible UI changes, behaviour changes. Bug fixes, refactors, internal tooling, and style tweaks are generally not worth surfacing.

2. **Update the changelog** (if relevant): Add a new entry to the top of `CHANGELOG` in `apps/web/lib/changelog.ts` and bump `LATEST_VERSION` to today's date (`YYYY-MM-DD`). The entry must have a short `title` and 1–3 `items` written from the user's perspective — what they can now do, not what changed in the code.

## Architecture

- Monorepo with three apps: `apps/web`, `apps/api`, `apps/worker`.
- `apps/web` is the React UI and may call the API only through typed client wrappers.
- `apps/api` owns business logic, auth, and persistence.
- `apps/worker` handles async jobs, imports, and scheduled tasks.
- Shared types and validation schemas live in `packages/contracts`.
- Prefer changes within the owning layer; do not place business logic in controllers or UI components.

## Read when relevant

- Full architecture: `@docs/architecture.md`
- Data model: `@docs/data-model.md`
- Integration patterns: `@docs/integrations.md`