# All-Time Records — Design Spec
**Date:** 2026-04-08

## Overview

Extend the header hero to display two all-time records: the best win streak ever observed across any scrape run, and the best average KDA across a 30-game window ever observed. Records are persisted in Firebase and only replaced when beaten.

---

## Data Layer — Firebase `/records` node

A new top-level node `/records` stores both records. It is read-before-write on every scrape run and only updated when a new value beats the stored one. Ties do not replace the existing holder.

```json
{
  "records": {
    "bestWinStreak": {
      "playerId": "oliver",
      "displayName": "Oliver",
      "value": 8,
      "achievedAt": "2026-04-08T04:00:00Z"
    },
    "bestKda": {
      "playerId": "eirik",
      "displayName": "Eirik",
      "value": 4.52,
      "achievedAt": "2026-04-08T04:00:00Z"
    }
  }
}
```

**Win streak** is defined as consecutive wins starting from game[0] (most recent) going forward in the games array. Capped at 30 (the scrape window). If a player is not currently on a win streak their streak value is 0 and will not beat any existing record.

**Best KDA** is the `avgKda` value already computed by `compute_player_stats()` over the player's current 30 games.

---

## Scraper Changes

### New file: `scraper/records.py`

Two functions:

**`compute_win_streak(games: list[dict]) -> int`**
Iterates games from index 0, counts consecutive wins, stops at first non-win. Returns the count.

**`update_records(all_player_data: list[dict], existing: dict) -> dict`**
- Takes the full list of scraped player dicts and the existing `/records` dict from Firebase (may be `None` if first run).
- For each player, computes their current win streak and reads their `stats.avgKda`.
- Compares against existing record values.
- Returns a new records dict containing only fields that were beaten (or all fields on first run). Returns `None` if nothing changed.

### Changes to `scraper/firebase_client.py`

- Add `read_records() -> dict` — reads `/records` from Firebase, returns `{}` if not set.
- Add `write_records(records: dict)` — writes the records dict to `/records` using `update()`.

### Changes to `scraper/main.py`

After computing all player stats, before writing to Firebase:
1. Call `read_records()` to fetch existing records.
2. Call `update_records(all_player_data, existing_records)`.
3. If result is not `None`, call `write_records(result)`.
4. Log which record was beaten and by whom.

---

## Frontend Changes

### `src/hooks/useGameData.js`

Add a second Firebase listener on `/records`. Expose `records` alongside the existing `players` and `group`.

### New component: `src/components/RecordBanner.jsx`

Two "trophy cards" displayed side by side inside the header, between the group win rate block and the timestamp. Each card shows:
- An icon (🏆 for streak, ⚡ for KDA)
- A label ("Best Win Streak" / "Best KDA · 30g")
- The record holder's display name
- The record value (e.g. "12 wins" / "6.24")

**Styling (UI-UX-PRO-MAX):** Dark surface cards with a subtle glow border matching the accent colour. Value displayed in the heading font, large and prominent. Name in mono dimmed. Cards are compact — they sit in the header without breaking the layout on typical screen widths. On narrow screens they wrap below the win rate block.

### `src/App.jsx`

- Import and render `<RecordBanner records={records} />` inside the header.
- Pass `records` from `useGameData`.

---

## Error Handling

- If `/records` does not exist yet (first run), `read_records()` returns `{}` and all players are candidates for the initial record.
- If a player's games list is empty, they are skipped in `update_records`.
- If `records` is `null`/`undefined` in the frontend, `RecordBanner` renders nothing (no placeholder shown until data exists).

---

## Out of Scope

- Streaks longer than 30 games (acceptable per product decision).
- Loss streak records.
- Historical record log / leaderboard of past records.
- Per-champion KDA records.
