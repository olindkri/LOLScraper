# Lowest Win Rate Record — Design Spec

**Date:** 2026-04-09
**Status:** Approved

## Overview

Add a new all-time record for the lowest win rate observed in any 30-consecutive-game window. This record should behave exactly like the other hero-banner records: it is stored in `/records`, updated only when a new worst value is observed, and rendered in the hero records strip.

---

## New Record

### `lowestWinRate`

- **Definition:** Lowest win rate observed in any 30-consecutive-game window across all scrape runs.
- **Computation:** For each player with at least 30 games, slide a window across `games[i:i+30]` in current game order and compute `wins / 30` for each window. Take the minimum.
- **Comparison:** Strict `<` only. Ties do not replace the existing record.
- **Firebase shape:**
  ```json
  {
    "playerId": "eirik",
    "displayName": "Eirik",
    "value": 0.2,
    "achievedAt": "2026-04-09T10:00:00Z"
  }
  ```
- **Display value:** `value` formatted as a percentage, for example `20%`.

---

## Backend

**File:** `functions/scraper/records.py`

- Add `compute_lowest_winrate(games: list[dict]) -> float | None`.
- Return `None` when fewer than 30 games are available.
- Extend `update_records()` to track `lowestWinRate` beside the existing records.
- Preserve the same all-time behavior as the other records: if no record is beaten, return `None`.

---

## Frontend

**File:** `frontend/src/components/RecordsStrip.jsx`

- Add a new record entry labeled `LOWEST W/R`.
- Format the stored decimal as a percentage.
- Use `var(--loss)` for the value color.
- Keep the existing null-state behavior: render `—` when the record is missing.

**Display order:** `STREAK` → `KDA` → `WIN RATE` → `LOWEST W/R` → `PEAK RANK`.

---

## Testing

- Add tests for `compute_lowest_winrate()`:
  - fewer than 30 games returns `None`
  - exact 30-game window returns the expected value
  - multiple windows returns the minimum
- Add `update_records()` tests covering:
  - first-run initialization of `lowestWinRate`
  - replacing an existing higher value
  - tie/no-change behavior

---

## Out of Scope

- No separate UI treatment beyond the existing records strip.
- No retroactive backfill beyond what the current scrape data can observe.
- No historical timeline of who previously held the lowest-win-rate record.
