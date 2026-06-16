# Plan: "What's New" Feature

## Goal
Show users a modal with the latest release highlights after each new release (once per version). The same content is accessible any time via the nav menu.

## Approach
- Changelog content lives as a static TypeScript file in `apps/web` — no API needed for content, easy to update on each deploy.
- User's last-seen version is persisted in MongoDB so the "seen" state carries across devices and sessions.
- A dedicated API endpoint marks a version as seen.
- A modal auto-shows when `user.last_viewed_changelog_version !== LATEST_VERSION`; the trigger lives as a `useEffect` in `layout.tsx` (or `AuthProvider`) so it runs once user state loads.
- A nav menu item opens the same modal on demand, with a badge dot when unseen content exists.

## Key decisions / constraints found in codebase
- `packages/contracts/src/index.ts` is auto-generated via `pnpm gen` (hits `http://localhost:8000/openapi.json`). **Do not hand-edit** `schema.d.ts`; run `pnpm gen` after changing the API, with the API server running.
- `_user_out()` in `apps/api/app/routers/auth.py:29` builds `UserOut` from a `User` document — must be updated when the schema gains a new field.
- `PATCH /auth/me` already exists for profile/onboarding; add a separate `POST /auth/me/changelog-seen` to keep concerns distinct.
- Auth context (`apps/web/lib/auth.tsx`) exposes `user`, `loading`, `refresh`. After marking seen, call `refresh()` to pull updated user state — consistent with existing pattern.

## Assumptions / Risks
- Version string is a date-based constant (e.g., `"2026-06-16"`) defined in `lib/changelog.ts`, bumped manually with each release.
- `last_viewed_changelog_version: null` in the DB = never seen → modal shows for new users automatically.
- No DB migration needed; Beanie adds the field with its `None` default on first access.
- Modal reuses existing Tailwind CSS patterns from the project; no new UI library needed.

---

## Checklist

### Backend — model & schema
- [ ] Add `last_viewed_changelog_version: str | None = None` to `User` document in `apps/api/app/models/__init__.py`
- [ ] Add `last_viewed_changelog_version: str | None` to `UserOut` schema in `apps/api/app/schemas.py`
- [ ] Update `_user_out()` in `apps/api/app/routers/auth.py` to include the new field

### Backend — endpoint
- [ ] Add `POST /auth/me/changelog-seen` endpoint in `apps/api/app/routers/auth.py`
  - Accepts body `{ version: str }` (new `ChangelogSeenIn` schema)
  - Sets `user.last_viewed_changelog_version = payload.version` and saves
  - Returns updated `UserOut` (consistent with other auth endpoints)

### Contracts regeneration
- [ ] Start the API dev server, then run `pnpm gen` in `packages/contracts` to regenerate `schema.d.ts`
- [ ] Verify `UserOut` in the generated schema includes `last_viewed_changelog_version`

### Frontend — data & API
- [ ] Create `apps/web/lib/changelog.ts`:
  - `LATEST_VERSION` constant (date string, e.g. `"2026-06-16"`)
  - `CHANGELOG` typed array `{ version: string; title: string; items: string[] }[]`, newest first
- [ ] Add `markChangelogSeen(version: string) → Promise<UserOut>` to `apps/web/lib/api.ts`

### Frontend — UI
- [ ] Create `apps/web/components/WhatsNewModal.tsx`:
  - Renders the current release entry from `CHANGELOG`
  - "Fechar" / "Entendi" button that calls `markChangelogSeen(LATEST_VERSION)` then `refresh()`
  - Also shows all previous entries in a scrollable list below (for reference)
  - Controlled by `isOpen`/`onClose` props
- [ ] Add modal state + trigger to `apps/web/app/layout.tsx`:
  - `const [showWhatsNew, setShowWhatsNew] = useState(false)`
  - `useEffect(() => { if (user && user.last_viewed_changelog_version !== LATEST_VERSION) setShowWhatsNew(true); }, [user])`
  - Render `<WhatsNewModal isOpen={showWhatsNew} onClose={() => setShowWhatsNew(false)} />`
- [ ] Add nav item + badge to `apps/web/components/TopBar.tsx`:
  - New icon (`SparklesIcon` or similar inline SVG)
  - Link/button "O que há de novo" with a small badge dot when `user.last_viewed_changelog_version !== LATEST_VERSION`
  - Clicking opens the modal (pass `setShowWhatsNew` down, or lift state up)
  - Add it between the "Regras" link and the admin link in the drawer nav

### Verification
- [ ] New user (`last_viewed_changelog_version: null`): modal auto-shows on first login
- [ ] After dismissing: modal does not reappear on refresh; badge dot disappears; DB field updated
- [ ] Bumping `LATEST_VERSION` in `changelog.ts`: modal reappears for all existing users on next load
- [ ] Nav item opens modal from any page; badge dot reflects seen state correctly
- [ ] TypeScript compiles clean: `pnpm -w tsc --noEmit` or `pnpm --filter=web tsc --noEmit`
- [ ] Existing auth flow, onboarding, and profile update are not broken
