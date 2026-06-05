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

- Keep plans and progress notes in `tasks/todo.md` when a task spans multiple steps or sessions.
- Keep project lessons and recurring gotchas in `tasks/lessons.md` only when those lessons are meant to be shared by the team.
- Prefer concise updates over long narrative logs.

## Quality bar

- Ask whether the solution is the simplest correct approach.
- Avoid hacky fixes when a clean, durable solution is reasonable within scope.
- Make changes that a senior engineer could review and understand quickly.

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