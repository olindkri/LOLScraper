# Manual Fetch Button & Cloud Functions Scraper

**Date:** 2026-04-09
**Status:** Approved

## Overview

Replace the GitHub Actions cron scraper with Firebase Cloud Functions, and add a manual "Fetch" button to the UI that lets users trigger a fast, incremental game data refresh without waiting for the 20-minute scheduled run.

---

## Goals

- Users can click a button in the UI and see fresh game data within ~30 seconds
- The existing 20-minute scheduled scrape continues running, now on Firebase Cloud Functions instead of GitHub Actions
- The scheduled and manual fetches produce data in exactly the same format — no Firebase schema changes
- Abuse is prevented via a server-enforced 5-minute cooldown on the manual fetch

---

## Architecture

```
Frontend (React)
  └─ FetchButton component
       ├─ Reads /metadata/lastManualFetch from Firebase (real-time, for cooldown display)
       ├─ Calls quickFetch Cloud Function via Firebase callable SDK
       └─ States: idle → loading → success flash → idle / cooldown

Cloud Function: scheduledFetch  (Cloud Scheduler, every 20 min)
  └─ Exact mirror of current main.py logic (full scrape)

Cloud Function: quickFetch  (HTTPS callable)
  └─ Incremental fetch: page 1 per player in parallel, diff against Firebase

Firebase Realtime DB
  └─ /metadata/lastManualFetch  ← new key (ISO timestamp string)
  └─ /players, /group, /records, /matches  ← unchanged schema
```

---

## Cloud Functions

### Deployment Structure

```
functions/
  main.py           ← both Cloud Functions defined here
  requirements.txt  ← mirrors scraper/requirements.txt
  scraper/
    __init__.py
    players.py
    scrape.py
    stats.py
    firebase_client.py
    records.py
    match_scraper.py
```

`scraper/` at the project root stays unchanged for local dev and testing. `functions/scraper/` is a copy deployed with the function. When scraper logic changes, both directories must be updated.

`firebase.json` is updated with a `functions` block pointing to `functions/` as the source.

---

### `scheduledFetch` — every 20 minutes

Runs on Cloud Scheduler, every 20 minutes. Identical behaviour to the current `scraper/main.py`:

1. For each player sequentially (1s sleep between requests):
   - `fetch_games_for_player(url, target=30)` — up to 30 ranked games, rank, mastery
   - `compute_player_stats(games)`
   - Attach mastery points to stats if available
2. `compute_group_stats(all_player_stats)`
3. `write_to_firebase(all_player_data, group, DATABASE_URL)` — full replace of `/players` + `/group`
4. Read existing records, `update_records`, write back if changed
5. Find new match IDs not in `/matches`, fetch up to 30 match details

**Timeout:** 300s
**Memory:** 512MB
**Credentials:** `FIREBASE_DATABASE_URL` and `FIREBASE_CREDENTIALS` stored as Cloud Functions secrets (same values as current GH Actions secrets)

---

### `quickFetch` — HTTPS callable

Triggered by the frontend button. Incremental — only writes new games, not a full replace.

1. Read `/metadata/lastManualFetch` from Firebase
   - If less than 5 minutes ago: return `{ error: "cooldown", cooldownSeconds: N }`
2. Fetch page 1 per player in parallel (`ThreadPoolExecutor`, 11 workers)
   - Each worker calls `fetch_games_for_player(url, target=10)` → first page only (~10 games), rank, mastery included
3. Read existing `/players/{id}/games` from Firebase for each player
4. Diff by `matchId` — identify games from page 1 not already in Firebase
5. For each player with new games:
   - Prepend new games to existing game list (no length cap — the next scheduled fetch will trim back to 30)
   - Recompute player stats via `compute_player_stats`
   - Stage updated `games`, `stats`, `soloRank` for that player
6. Recompute group stats: use updated stats for players that had new games, read existing `/players/{id}/stats` from Firebase for players that did not
7. Write changes to Firebase:
   - Patch only `/players/{id}` entries that changed (not a full root replace)
   - Write `/group`
8. Read existing records, `update_records`, write back if changed
9. Write `/metadata/lastManualFetch` = current ISO timestamp
10. Return `{ newGames: N }`

**No match detail fetching** — match pages are not fetched in quick mode. The scheduled fetch handles those.

**Timeout:** 60s
**Memory:** 512MB

---

## GitHub Actions

`scraper.yml` cron trigger is removed. The `workflow_dispatch` trigger is kept as a manual fallback for local debugging or emergencies. No other changes to the workflow file.

---

## Frontend

### New Firebase DB key

`/metadata/lastManualFetch` — ISO timestamp string written by `quickFetch` after each successful run. Frontend reads this in real-time to compute and display the cooldown without calling the function.

### `useQuickFetch` hook

New hook at `frontend/src/hooks/useQuickFetch.js`.

- Subscribes to `/metadata/lastManualFetch` via `onValue` (same pattern as `useGameData`)
- Derives `cooldownSeconds` from the timestamp (0 if no cooldown active)
- Exposes `{ cooldownSeconds, trigger, status }`
  - `status`: `'idle' | 'loading' | 'success' | 'cooldown'`
  - `trigger()`: calls the `quickFetch` Firebase callable, updates local status
- Cooldown state is server-driven, not local — all open tabs see the same countdown

### `FetchButton` component

New component at `frontend/src/components/FetchButton.jsx`.

Placed in the header directly next to the existing "last updated" timestamp. Styled to match the existing monospace/dim aesthetic.

**States:**

| State | Display | Interactive |
|---|---|---|
| idle | `↻ Fetch` | Yes |
| loading | `Fetching...` (pulse) | No |
| success (3s) | `+N new` or `up to date` | No |
| cooldown | `↻ M:SS` countdown | No |

### `App.jsx` changes

Minimal: import `FetchButton`, render it next to the timestamp in the header. No layout restructuring.

---

## Cost Estimate

| Item | Estimate |
|---|---|
| Invocations | ~$0 (well within 2M/month free tier) |
| Compute (vCPU-seconds overage from scheduled fetch) | ~$1–3/month |
| Outbound network to leagueofgraphs.com | ~$0.50–1.50/month |
| Firebase Realtime DB reads/writes | ~$0 |
| **Total** | **~$1–5/month** |

Set a Firebase billing alert at $10/month as a safety net.

---

## Out of Scope

- Match detail fetching in `quickFetch`
- Authentication / per-user rate limiting
- Push notifications when new games are detected
- Showing which specific players got new games in the success state
