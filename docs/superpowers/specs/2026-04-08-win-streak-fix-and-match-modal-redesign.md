# Spec A: Win Streak Fix + Match Modal Redesign

## Goal

Fix the win streak record calculation to find the best streak across all 30 games (not just from the most recent game), and redesign the match detail modal to be larger and more informative — adding kill participation, vision score, and team win/loss result.

## Architecture

Two independent changes sharing the same deploy:
1. **Backend** — fix `compute_win_streak` in `scraper/records.py` + extend `scraper/match_scraper.py` to scrape `visionScore` and `team1Won`.
2. **Frontend** — full redesign of `frontend/src/components/MatchModal.jsx` consuming the new fields.

The two changes are independently deployable but ship together since the modal gracefully degrades for old cached matches missing the new fields.

## Tech Stack

Python 3 (scraper), React + inline styles (frontend), Firebase Realtime DB, Russo One + Chakra Petch + JetBrains Mono fonts, existing CSS variable design system.

---

## Section 1: Win Streak Bug Fix

### Problem

`compute_win_streak` in `scraper/records.py` iterates from index 0 (most recent game) and stops at the first loss. It returns the current streak from the front of the array — not the maximum streak across all 30 games. A player with `[L, W, W, W, W, L, W]` returns `0` instead of `4`.

### Fix

```python
def compute_win_streak(games: list[dict]) -> int:
    max_streak = 0
    current = 0
    for game in games:
        if game["result"] == "win":
            current += 1
            max_streak = max(max_streak, current)
        else:
            current = 0
    return max_streak
```

No changes to `update_records` — it already compares the returned value against the Firebase-stored record and updates only if it's a new all-time high.

### Files

- Modify: `scraper/records.py`
- Modify: `scraper/tests/test_records.py` — update/add tests for max-streak logic

---

## Section 2: Scraper Updates

### New Fields

**`visionScore: int`** — per participant, scraped from the match page HTML. Added to each object in `participants[]`.

**`team1Won: bool`** — top-level field on the match dict. `true` if team 1 won, `false` if team 2 won.

**Kill participation** — computed on the frontend as `(kills + assists) / teamTotalKills * 100`. No new scraping needed; `team1Kills` and `team2Kills` are already stored.

### Graceful Degradation

Matches already cached in Firebase are missing `visionScore` and `team1Won`. The modal handles this:
- Missing `visionScore`: display `—`
- Missing `team1Won`: skip the victory/defeat banner, show only kill counts

### Files

- Modify: `scraper/match_scraper.py` — scrape `visionScore` per participant, scrape `team1Won`
- Modify: `scraper/tests/fixtures/sample_match.html` — add vision score HTML to fixture
- Modify: `scraper/tests/test_match_scraper.py` — add tests for new fields

---

## Section 3: Match Modal Redesign

### Layout Overview

Two-column layout retained (Team 1 left, Team 2 right). Modal is larger and each player gets a proper card.

**Modal container:**
- `maxWidth: 1100px` (up from 900px)
- `maxHeight: 92vh`
- Entry animation: scale `0.95 → 1.0` + opacity `0 → 1`, 200ms ease-out on open
- Respects `prefers-reduced-motion`

**Team header (per column):**
- `VICTORY` in `--win` with `text-shadow: 0 0 16px var(--win-soft)` glow
- `DEFEAT` in `--loss` with `text-shadow: 0 0 16px var(--loss-soft)` glow
- If `team1Won` absent: show column title only ("Team 1" / "Team 2"), no banner
- Total kills in large `--font-mono`
- Kill bar: full-width 6px bar showing this team's fraction of total kills combined (`team1Kills / (team1Kills + team2Kills)`), filled with `--win` for the winning team and `--loss` for the losing team

**Per-player card:**
```
┌─ [3px left border --accent if tracked] ──────────────────────────────┐
│  CHAMPION NAME        Summoner#Tag                        [ SCORE ]  │
│  5 / 2 / 8            CS 200    Vision 28                             │
│  ████████████░░░░░░░  72%  kill participation                         │
└────────────────────────────────────────────────────────────────────────┘
```

- **Champion name:** `--font-head`, 0.85rem, `--fg`
- **Summoner name:** `--font-mono`, 0.65rem, `--fg-muted`; tracked group member: `--fg` + `fontWeight: 600`
- **Tracked highlight:** `background: var(--accent-soft)`, `borderLeft: 3px solid var(--accent)`
- **KDA:** `deaths >= 7` → `--loss` color; otherwise `--fg`
- **CS + Vision:** same row, `--fg-dim` labels, `--font-mono`; vision shows `—` if missing
- **Kill participation bar:** 4px height, `--border` track, fill color matches team (`--win` for team 1 / `--loss` for team 2), `%` value right-aligned in `--font-mono` 0.65rem
- **Score badge (top-right):** `≥ 7.0` → `--win` background; `≥ 4.0` → `--gold`; `< 4.0` → `--loss`; white text, `--font-head` 0.65rem, `padding: 2px 7px`, `borderRadius: 3px`

### Files

- Modify: `frontend/src/components/MatchModal.jsx` — full redesign

---

## Data Shape Reference

### Match object stored at `/matches/{matchId}`

```json
{
  "matchId": "12345",
  "team1Won": true,
  "team1Kills": 20,
  "team2Kills": 15,
  "participants": [
    {
      "summonerName": "Hopa#Hopa",
      "champion": "Sejuani",
      "team": 1,
      "kills": 5,
      "deaths": 2,
      "assists": 8,
      "cs": 200,
      "visionScore": 28,
      "score": 10.0
    }
  ]
}
```

Old cached matches are missing `team1Won` and `visionScore` — modal handles gracefully.

---

## Testing

### Backend

- `test_records.py`: assert `compute_win_streak([L,W,W,W,W,L,W]) == 4`, assert `[W,W,W] == 3`, assert `[] == 0`, assert `[L,L,L] == 0`
- `test_match_scraper.py`: assert `visionScore` present and correct for fixture player, assert `team1Won` present and correct type

### Frontend

Manual verification:
- Open a cached match → check graceful degradation (no banner, vision `—`)
- After next scraper run with new match → check full modal with banner, kill bar, vision score
- Confirm tracked players highlighted
- Confirm score badge colors correct across all three tiers
- Confirm modal entry animation plays
- Confirm ESC + backdrop click still closes
