# Plan: Penalty shootout score predictions

**Goal:** Add a second, optional score prediction for penalty shootouts on knockout matches.
Users fill in a predicted penalty score (e.g. 5×4). If the match goes to penalties, the
prediction is scored using the same tier logic (Exact / Near / Margin / Outcome × round
weight). If the match ends in regulation, the penalty prediction is silently ignored.

**Motivation:** Gives players an additional way to earn points in knockout matches — even
if they missed the regulation score and the advancing team, they might nail the shootout.

**Key design decisions:**
- Same tier system and point values as regulation (no new constants needed)
- Same round weight multiplier applies (so a correct QF penalty Exact = 5 × 4 = 20 pts)
- V2 scoring rules always apply to penalties (all knockouts are post-cutover)
- Draw outcome in penalties is impossible — `act_out` for a penalty score is always home or away
- Prediction is optional: not filling in penalty scores means no bonus, no penalty
- Scoring only fires if `match.penalty_home_score is not None`

**Layers affected:** data model → API schemas → contracts → scoring → front-end → admin UI.
Implement and test layer by layer.

---

## Checklist

### 1. Data model — `apps/api/app/models/__init__.py`

- [ ] Add fields to `Match`:
  ```python
  penalty_home_score: int | None = None
  penalty_away_score: int | None = None
  ```

- [ ] Add fields to `Prediction`:
  ```python
  penalty_home_score: int | None = None
  penalty_away_score: int | None = None
  ```

No migration needed — MongoDB adds new optional fields transparently.

### 2. API schemas — `apps/api/app/schemas.py`

- [ ] Add to `PredictionIn`:
  ```python
  penalty_home_score: int | None = Field(default=None, ge=0, le=20)
  penalty_away_score: int | None = Field(default=None, ge=0, le=20)
  ```
  Validate that both are provided together or both are null (add a `model_validator`).

- [ ] Add to `PredictionOut`:
  ```python
  penalty_home_score: int | None
  penalty_away_score: int | None
  ```

- [ ] Add to `MatchOut` (so the front-end can display the actual penalty result):
  ```python
  penalty_home_score: int | None
  penalty_away_score: int | None
  ```

- [ ] Add to `ResultIn` (so admins can record the penalty score):
  ```python
  penalty_home_score: int | None = None
  penalty_away_score: int | None = None
  ```

- [ ] Add to `PredictionEntryOut` (used in the revealed predictions view):
  ```python
  penalty_home_score: int | None
  penalty_away_score: int | None
  ```

### 3. Predictions router — `apps/api/app/routers/predictions.py`

- [ ] In the save/upsert handler, persist `penalty_home_score` and `penalty_away_score`
  from `payload` to the `Prediction` document. Reject penalty scores on group-stage matches
  with a 400 (same pattern as `advancing_team_id`).

- [ ] In the serializer / `PredictionOut` construction, include the penalty fields.

### 4. Admin router — `apps/api/app/routers/admin.py`

- [ ] In `set_result`, persist `penalty_home_score` and `penalty_away_score` from
  `ResultIn` to the `Match` document when provided.
- [ ] In `clear_result` (if it exists), reset penalty scores to `None` alongside other fields.

### 5. Serializer — `apps/api/app/serializers.py`

- [ ] In `match_to_out`, include `penalty_home_score` and `penalty_away_score` from the
  match document.

### 6. Scoring — `apps/api/app/services/scoring.py`

- [ ] In `points_for()`, add penalty scoring after the advancing bonus block:
  ```python
  if (
      match.penalty_home_score is not None
      and match.penalty_away_score is not None
      and prediction.penalty_home_score is not None
      and prediction.penalty_away_score is not None
  ):
      points += base_points(
          prediction.penalty_home_score,
          prediction.penalty_away_score,
          match.penalty_home_score,
          match.penalty_away_score,
          match.kickoff_at,
      ) * weight
  ```

- [ ] Update module docstring to document the penalty tier.

### 7. Scoring tests — `apps/api/tests/test_scoring.py`

- [ ] Add `test_points_for_penalty_exact`: penalty scores match → adds `POINTS_EXACT × weight`
- [ ] Add `test_points_for_penalty_near`: off by L1=1 → `POINTS_NEAR × weight`
- [ ] Add `test_points_for_no_penalty_on_match`: `match.penalty_home_score = None` → no bonus
- [ ] Add `test_points_for_no_penalty_on_prediction`: user didn't fill penalty → no bonus
- [ ] Run full test suite — confirm all pass

### 8. Contracts — `packages/contracts`

- [ ] Regenerate the OpenAPI schema / TypeScript types after the API schema changes. The
  contract is auto-generated — run whichever script produces `schema.d.ts` (check
  `packages/contracts/package.json` for the generate script).
- [ ] Confirm `PredictionIn`, `PredictionOut`, and `MatchOut` in the generated types include
  the penalty fields.

### 9. Front-end — `apps/web/app/pools/[id]/predict/page.tsx`

- [ ] Add state to `MatchRow`:
  ```ts
  const [penaltyHome, setPenaltyHome] = useState<string>(
    pred?.penalty_home_score != null ? String(pred.penalty_home_score) : ""
  );
  const [penaltyAway, setPenaltyAway] = useState<string>(
    pred?.penalty_away_score != null ? String(pred.penalty_away_score) : ""
  );
  ```

- [ ] Sync state with `pred` in a `useEffect` (same pattern as advancing plan).

- [ ] Update `save()` to include penalty scores in the payload when the match is a knockout:
  ```ts
  penalty_home_score: isKnockout && penaltyHome !== "" ? Number(penaltyHome) : undefined,
  penalty_away_score: isKnockout && penaltyAway !== "" ? Number(penaltyAway) : undefined,
  ```

- [ ] Render a collapsible "Pênaltis?" section below the score row, only for knockout matches.
  Use a disclosure toggle (chevron + label). Collapsed by default; expand on tap.
  Inside: two score inputs identical in style to the regulation inputs, labeled with the
  same team short names. Auto-save on blur (same as regulation).

- [ ] When `match.status === "final"`:
  - If `match.penalty_home_score !== null`: show the actual penalty result in the same chip
    style as the regulation result, and show the points earned (or 0) from the penalty tier
  - If `match.penalty_home_score === null`: show nothing (match didn't go to penalties)

### 10. Admin UI — `apps/web/app/admin/page.tsx`

- [ ] Add penalty score inputs to the match result form, visible only for knockout matches.
  These feed into `ResultIn.penalty_home_score` / `penalty_away_score`.
- [ ] Optional fields — leaving them blank means the match did not go to penalties.

### Verification
- [ ] Submit a knockout prediction with penalty scores via the UI — confirm they persist
  (reload page, scores re-populate)
- [ ] Admin sets a match result with penalty scores — confirm `match.penalty_home_score` is set
- [ ] Correct penalty exact: confirm extra points appear in leaderboard and pts display
- [ ] Near penalty: L1=1 → POINTS_NEAR × weight added
- [ ] Regulation-only match (no penalties): penalty predictions silently ignored, 0 pts
- [ ] Group match: penalty section does not appear in the UI
- [ ] Knockout match where teams are TBD: penalty section does not appear
- [ ] User with no penalty prediction: 0 penalty pts, no error
