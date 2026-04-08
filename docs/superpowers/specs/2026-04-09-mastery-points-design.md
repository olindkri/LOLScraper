---
title: Champion Mastery Points — Scraper + Display
date: 2026-04-09
status: approved
---

## Overview

Scrape mastery points for each player's most-played champion from the leagueofgraphs summoner page (same page already fetched), store in Firebase, and display as a dim sub-label below the champion badge in the top champ column of the scoreboard.

## Data Source

Mastery data is present in the HTML of the leagueofgraphs summoner page as `tooltip` attributes on `div.relative.requireTooltip` elements in the most-played champions section. No additional page fetch is required.

Example tooltip value:
```
<itemname><img class='tooltipMasteryIcon' .../> Mastery Level 44</itemname><br/>Points: 562,779<br/>...
```

The champion name is found by traversing up from the tooltip element to a parent containing a `.name` div.

## Scraper Changes (`scrape.py`)

### New helper: `_parse_mastery(soup) -> dict[str, int]`

- Finds all `div.relative.requireTooltip` elements whose `tooltip` attr matches `r'Mastery Level'`
- For each, traverses up the DOM (max 5 levels) to find a `.name` div containing the champion name
- Parses points using `r'Points: ([\d,]+)'` from the tooltip, strips commas, converts to int
- Returns `{champion_name: points_int}` — e.g. `{"Twitch": 562779, "Kayn": 269203}`
- If a champion name cannot be resolved or points cannot be parsed, that entry is skipped

### Modified: `fetch_games_for_player`

- Calls `_parse_mastery(soup)` on the first page (the full summoner page already fetched for rank)
- Returns `(games, rank, mastery)` — a 3-tuple instead of the current 2-tuple

## Scraper Changes (`main.py`)

- Unpack `games, rank, mastery = fetch_games_for_player(player["url"])`
- After `stats = compute_player_stats(games)`, add:
  ```python
  stats["mostPlayedChampionMastery"] = mastery.get(stats["mostPlayedChampion"])
  ```
  Value is an `int` if found, `None` if not (omitted from Firebase when `None`).

## No changes to `stats.py`

`compute_player_stats` remains pure (games → stats only). Mastery is merged in `main.py`.

## Firebase Schema

`players/{id}/stats/mostPlayedChampionMastery`: integer (e.g. `562779`), absent if unknown.

## Frontend Changes (`ScoreboardRow.jsx`)

### Destructuring

```js
const { wins, losses, winRate, avgKda, avgCs, mostPlayedChampion = '', mostPlayedChampionMastery = null } = stats;
```

### Display

In `col-champ`, below the existing `ChampionBadge`:

```jsx
{mostPlayedChampionMastery > 0 && (
  <div style={{
    fontFamily: 'var(--font-mono)',
    fontSize: '0.65rem',
    color: 'var(--fg-dim)',
    marginTop: '2px',
  }}>
    {Math.round(mostPlayedChampionMastery / 1000)}K pts
  </div>
)}
```

Example output: `563K pts` for 562,779 mastery points.

## Error Handling

- If `_parse_mastery` fails entirely (unexpected DOM change), it returns `{}` — mastery is omitted from stats gracefully, no scraper crash.
- If `mostPlayedChampionMastery` is absent or `null` in Firebase, the frontend renders nothing (existing `—` fallback for missing champion covers the case where there's no champion at all).

## Testing

- Scraper: unit tests for `_parse_mastery` with representative HTML fixtures
- Frontend: static source analysis test verifying `mostPlayedChampionMastery` is destructured and rendered
