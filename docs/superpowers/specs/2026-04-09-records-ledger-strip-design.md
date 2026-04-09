# Records Ledger Strip — Design Spec

**Date:** 2026-04-09
**Status:** Approved

## Overview

Add two new all-time records (Best Win Rate over 30-game window, Highest Rank ever seen) and redesign how records are displayed in the hero bar. The current two floating trophy cards are replaced by a slim horizontal "ledger strip" anchored below the main hero row, showing all four records in a flat, sports-results-board style.

---

## New Records

### `bestWinRate`

- **Definition:** Highest win rate observed in any 30-consecutive-game window across all scrape runs.
- **Computation:** For each player with ≥30 games, slide a window across `games[i:i+30]` (newest-first order) and compute `wins / 30` for each window. Take the maximum.
- **Comparison:** Strict `>` only — ties do not replace the existing record.
- **Firebase shape:**
  ```json
  {
    "playerId": "luca",
    "displayName": "Luca",
    "value": 0.8,
    "achievedAt": "2026-04-09T10:00:00Z"
  }
  ```
- **Display value:** `value` formatted as percentage, e.g. `80%`.

### `highestRank`

- **Definition:** Highest solo rank observed for any player across all scrape runs.
- **Computation:** On each scrape, compare each player's current `soloRank` against the stored record using a numeric score:
  ```
  score = tier_score * 10000 + division_score * 100 + lp
  ```
  Tier scores (ascending): Iron=1, Bronze=2, Silver=3, Gold=4, Platinum=5, Emerald=6, Diamond=7, Master=8, Grandmaster=9, Challenger=10.
  Division scores: IV=1, III=2, II=3, I=4. (Master/Grandmaster/Challenger use division=1 and LP only.)
- **Comparison:** Strict `>` on the numeric score.
- **Firebase shape:**
  ```json
  {
    "playerId": "jonas",
    "displayName": "Jonas",
    "tier": "diamond",
    "division": "I",
    "lp": 92,
    "value": "Diamond I 92LP",
    "achievedAt": "2026-04-09T10:00:00Z"
  }
  ```
- **Display value:** Pre-formatted `value` string, e.g. `Diamond I 92LP`.

---

## Frontend — Records Ledger Strip

### Hero layout change

The hero `div` in `App.jsx` becomes a two-row flex column:

```
┌─────────────────────────────────────────────────────────────────┐
│  🐄 BABY COW  │  Group W/R  72%  ████████░░  │  5m ago         │  ← row 1 (unchanged)
├─────────────────────────────────────────────────────────────────┤
│  STREAK       │  KDA          │  WINRATE      │  PEAK RANK      │  ← row 2 (new strip)
│  12  Oliver   │  6.24  Eirik  │  80%  Luca    │  Diamond I Jonas │
└─────────────────────────────────────────────────────────────────┘
```

### `RecordsStrip` component (replaces `RecordBanner`)

**File:** `frontend/src/components/RecordsStrip.jsx`

- Returns `null` if `records` prop is falsy.
- Renders a horizontal flex container with four equal entries.
- Entries separated by 1px `var(--border)` vertical dividers.
- Missing individual records (not yet set) render `—` as the value.

**Strip container styles:**
- `background: var(--surface)`
- `border-top: 1px solid var(--border)`
- `display: flex`, `width: 100%`
- Hidden on mobile (`<640px`), same as current behavior.

**Each entry layout (flex column, centered):**
```
LABEL       ← 10px, uppercase, letter-spaced, var(--muted), JetBrains Mono
VALUE       ← 28px, Chakra Petch bold, accent color
HOLDER      ← 11px, var(--muted), JetBrains Mono
```

**Accent colors (applied to value text only):**
| Record | Key | Color |
|---|---|---|
| Best Win Streak | `bestWinStreak` | `var(--gold)` (amber) |
| Best KDA | `bestKda` | `#a78bfa` (purple) |
| Best Win Rate | `bestWinRate` | `var(--win)` (green) |
| Peak Rank | `highestRank` | `#60a5fa` (blue) |

**Display order:** Streak → KDA → Win Rate → Peak Rank.

**Icons:** Removed from redesign. The ledger style does not use emoji/SVG icons per entry — the label text is sufficient.

### `App.jsx` changes

- Import `RecordsStrip` instead of `RecordBanner`.
- Header outer `div` switches from `flex-direction: row` to `flex-direction: column`.
- Inner row 1 keeps existing layout (logo, win rate, timestamp).
- Row 2 is `<RecordsStrip records={records} />`.

### `RecordBanner.jsx`

Deleted — fully replaced by `RecordsStrip.jsx`.

---

## Backend — `scraper/records.py`

### New functions

**`compute_best_winrate(games: list) -> float | None`**
- Returns `None` if `len(games) < 30`.
- Slides window `games[i:i+30]` for `i in range(len(games) - 29)`.
- Returns `max(wins_in_window / 30)` across all windows.

**`rank_score(tier: str, division: str, lp: int) -> int`**
- Returns the numeric rank score for comparison.
- Handles Master/Grandmaster/Challenger (no meaningful division).

### `update_records` changes

Extends the existing function to also check `bestWinRate` and `highestRank` per player. Same strict `>` pattern. Returns `None` only if nothing changed across all four record types.

---

## Data Flow (unchanged)

```
GitHub Actions (every 20 min)
    → scraper/main.py
        → read_records() from /records
        → update_records() — now checks 4 record types
        → write_records() if any changed
    → Firebase /records
        → useGameData() listener
        → RecordsStrip receives records prop
        → renders ledger strip
```

---

## Out of Scope

- No mobile display of records (hidden at `<640px`, unchanged).
- No historical record chart or "previously held by" tracking.
- No per-player record pages.
