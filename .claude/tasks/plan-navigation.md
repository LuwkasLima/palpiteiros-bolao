# Plan: Navigation Redesign

## Goal
Split the monolithic home page into four dedicated pages (Meus Bolões, Jogos de Hoje, Novo Bolão, Meu Perfil) and add a **bottom tab bar** as the primary mobile navigation pattern. The hamburger drawer keeps only secondary/utility items.

---

## Key findings

- **`/` home page** is a monolith: pool list + in-progress/upcoming match widgets + create/join forms — all three sections move to dedicated pages.
- **Current drawer** has only utility items (Rules, What's New, Admin, Install, Logout) — no real nav links. Stays as secondary tray.
- **API coverage**: `GET /pools`, `POST /pools`, `POST /pools/join`, `GET /matches/in-progress`, `GET /matches/next-today` all exist. Missing: today's **finished** matches with team names embedded.
- **`MatchOut`** has scores and status but only `home_team_id` / `away_team_id` — no names/flags. Need either a new endpoint or a client-side join with `/teams`.

---

## Proposed page map

| Route | Tab label | Content |
|---|---|---|
| `/` | ⚽ Bolões | Pool list (simplified home) |
| `/jogos` | 📅 Jogos | Today: in-progress → upcoming → finished with scores |
| `/novo-bolao` | ➕ Novo | Create pool + join with code |
| `/perfil` | 👤 Perfil | Display name edit, What's New, Rules, Logout |

**Suggested future page (not this sprint):** `/tabela` — tournament group standings and knockout bracket. Good candidate for a 5th tab once the tournament advances to knockouts.

---

## Assumptions & risks

- "Today" is client-local timezone, not UTC — pass `day_start` / `day_end` from the browser, same pattern as the existing `window_end` param.
- Bottom nav must not render on login/onboarding/auth pages — condition on `user` in layout.
- `pb-24` on `<main>` already exists; may need to adjust to avoid bottom-nav overlap.
- All new pages need the same auth-redirect guard as the home page.

---

## Steps

### 1. API — `GET /matches/today` endpoint
- [ ] Add `MatchTodayOut` schema: `id, key, kickoff_at, status, home_name, home_flag, away_name, away_flag, home_score, away_score, stage, group_label`
- [ ] Add endpoint in `routers/matches.py`: `GET /matches/today?day_start=...&day_end=...` — returns all matches for the day across all statuses, team names embedded
- [ ] Update `packages/contracts/src/schema.d.ts`
- [ ] Add `api.matchesToday(dayStart, dayEnd)` to `lib/api.ts`

### 2. Web — `BottomNav` component
- [ ] Create `components/BottomNav.tsx` — 4 tabs with icons, labels, and active-state highlight via `usePathname()`
- [ ] Render `<BottomNav />` in `app/layout.tsx` only when `user` is present (inside `AuthProvider`)
- [ ] Confirm `pb-24` on `<main>` is enough clearance for the nav bar

### 3. Refactor `/` home page
- [ ] Remove in-progress / upcoming match widgets (now at `/jogos`)
- [ ] Remove create/join forms (now at `/novo-bolao`)
- [ ] Keep pool list with empty state CTA pointing to `/novo-bolao`

### 4. New page `/jogos`
- [ ] Create `app/jogos/page.tsx`
- [ ] Call `api.matchesToday(dayStart, dayEnd)`
- [ ] Three sections: **Em andamento** · **Ainda hoje** · **Encerradas hoje** (with scores)
- [ ] Auth guard (redirect to `/login` if no user)

### 5. New page `/novo-bolao`
- [ ] Create `app/novo-bolao/page.tsx`
- [ ] Move create + join forms verbatim from home page
- [ ] On success: `router.push(\`/pools/${pool.id}\`)`
- [ ] Auth guard

### 6. New page `/perfil`
- [ ] Create `app/perfil/page.tsx`
- [ ] Display name input + save (`PATCH /auth/me`)
- [ ] "O que há de novo" button (opens `WhatsNewModal`)
- [ ] Link to `/regras`
- [ ] Logout button
- [ ] Auth guard

### 7. Update `TopBar` drawer
- [ ] Remove "Regras" and "O que há de novo" entries (they live in `/perfil` now)
- [ ] Keep: Admin link (if admin), Baixar App, Sair
- [ ] Drawer becomes a lean utility tray

### 8. Verification
- [ ] All 4 bottom tabs navigate and highlight correctly
- [ ] `/jogos` shows all three match status groups
- [ ] `/novo-bolao` create and join flows succeed end-to-end
- [ ] `/perfil` display name save works; logout redirects to `/login`
- [ ] Existing `/pools/[id]` and `/pools/[id]/predict` pages unaffected
- [ ] Auth redirect fires on all new pages when logged out
- [ ] Bottom nav does not appear on `/login`, `/onboarding`, `/auth/verify`

---

## Results
<!-- filled in after implementation -->
