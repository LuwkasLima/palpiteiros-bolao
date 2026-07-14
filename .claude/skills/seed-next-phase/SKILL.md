---
name: seed-next-phase
description: Seed the next knockout phase with official FIFA team matchups, add a user notification, commit to a release branch, and open a PR.
---

Use this skill when:

- A knockout stage has just finished and the next phase teams are now known
- The user says "seed the [round]" or "the [stage] is ready"

## Workflow

### 1. Look up matchups from FIFA.com

Search for each match using `"[Team A] v [Team B]" site:fifa.com` to get the official home/away ordering — FIFA always lists the bracket-left team first. Do not rely on other sources, as they swap the order inconsistently.

Confirm kick-off times match the UTC times already in `apps/api/data/wc2026_schedule.json`, and show the user a table with EDT times before touching any file.

### 2. Update the schedule JSON

In `apps/api/data/wc2026_schedule.json`, add `"home"` and `"away"` fields to the target stage entries (e.g. `SF-1`, `SF-2`). Do not touch any other field.

The seed script is safe to run in production:
- Matches with `status: FINAL` are skipped entirely — scores, predictions, and results are never touched.
- `Prediction` documents are in a separate collection and are never modified by the seed.
- Non-FINAL matches get `status` reset to `SCHEDULED`; the auto-lock will re-lock them before kick-off.

### 3. Add a user notification

Add a new entry at the **top** of `NOTIFICATIONS` in `apps/web/lib/notifications.ts`:

```ts
{
  id: "action-{stage}-predictions-{YYYY-MM-DD}",
  title: "⚽ {Stage name} disponíveis!",
  body: "{Team A} x {Team B} e {Team C} x {Team D}. Faça seus palpites antes do primeiro jogo {time reference}.",
  cta: { label: "Fazer palpites →", href: "/" },
  time: "hoje",
},
```

- Write in Portuguese.
- `time reference` should be relative (e.g. "amanhã", "hoje").
- No changelog entry — this is a data update, not a feature release.

### 4. Commit and open a PR

```
git checkout main
git checkout -b release/{YYYY-MM-DD}
git add apps/api/data/wc2026_schedule.json apps/web/lib/notifications.ts
git commit -m "feat(data): seed {stage} teams and notify users"
git push -u origin release/{YYYY-MM-DD}
gh pr create --base main ...
```

Do **not** commit `tasks/todo.md` or any untracked files unrelated to this task.

### 5. Remind about the seed

After the PR is open, remind the user to run `pnpm api:seed` once it is merged. Note the kick-off time of the first match so they know the deadline.
