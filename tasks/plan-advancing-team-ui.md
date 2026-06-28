# Plan: Advancing team picker (front-end)

**Goal:** Users currently have no way to pick which team advances in knockout matches.
The backend, scoring logic, and contracts all support `advancing_team_id` on predictions
already — the gap is entirely front-end. This plan adds a team picker to the predict page
so users can earn the `ADVANCE_BONUS × round_weight` points.

**Scope:** Front-end only (`apps/web`). No API, contract, schema, or scoring changes needed.

**Key facts:**
- `PredictionIn.advancing_team_id` is already an optional field in the contract
- `PredictionOut.advancing_team_id` is already returned by the API
- `MatchOut.advancing_team_id` carries the actual result (set by admin after the match)
- The predictions router already persists `advancing_team_id` when sent
- Group matches must not have an advancing pick (the API rejects it with 400)

---

## Checklist

### Implementation — `apps/web/app/pools/[id]/predict/page.tsx`

- [x] Add `advancingId` state to `MatchRow`:
  ```ts
  const [advancingId, setAdvancingId] = useState<string | null>(
    pred?.advancing_team_id ?? null
  );
  ```

- [x] Sync `advancingId` with `pred` in a `useEffect` so it updates when the page
  reloads saved data — handled via useState initializer; no separate useEffect needed
  since save() and saveAdvancing() both call onSaved() to keep parent state current.

- [x] Update `save()` to include `advancing_team_id` in the payload. Also updated the
  early-return guard to check advancingId so score blurs after a team pick change still save:
  ```ts
  if (h === pred?.home_score && a === pred?.away_score && advancingId === pred?.advancing_team_id) return;
  ```

- [x] Add a separate `saveAdvancing(id: string | null)` handler that calls `api.savePrediction`
  immediately when the user taps a team button (no blur needed — it's a toggle, not a text input).
  If scores are not yet filled in, only the local state is updated; the pick is included the
  next time `save()` runs on score blur.

- [x] Render the picker below the score row, only when:
  - `match.stage !== "group"`
  - `match.home_team_id !== null && match.away_team_id !== null` (teams are known)
  - `!match.is_locked` (or show read-only result when locked/final)

  Picker design: two pill buttons side by side (home team short label / away team short label),
  highlighting the selected one. Tap toggles selection and immediately saves.

- [x] When `match.status === "final"`:
  - Show which team the user picked (or "—" if no pick) alongside a ✓ or ✗ based on
    `pred.advancing_team_id === match.advancing_team_id`
  - Do not render editable buttons

### Verification
- [ ] Submit a prediction for a knockout match with an advancing pick — confirm `advancing_team_id`
  is stored (check via the pool leaderboard or browser network tab)
- [ ] Reload the page — confirm the saved pick is pre-selected
- [ ] Lock a knockout match (admin) — confirm the picker becomes read-only
- [ ] Finalize a knockout match (admin sets `advancing_team_id`) — confirm ✓/✗ indicator appears
- [ ] Group match rows show no picker
- [ ] Knockout match where teams are not yet set (slot label only) shows no picker
- [ ] Confirm points are awarded correctly after a final match: `ADVANCE_BONUS × round_weight`
  visible in the pts display
