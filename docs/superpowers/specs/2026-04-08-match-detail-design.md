# Match Detail Design Spec
**Date:** 2026-04-08

## Overview

Extend the scraper to fetch full 10-player match data for every game, cache it in Firebase, and expose it in the frontend via a match detail modal. Users can click any game row in the expanded player view to see all 10 participants, team kill totals, per-player performance scores, and highlighted group members.

---

## Scraper Changes

### 1. Add `matchId` to game dicts — `scraper/scrape.py`

In `_parse_rows`, extract the match URL from the `<a href="/match/euw/{matchId}#...">` anchor on each row. Parse out the numeric match ID. Add `"matchId": "7813808785"` to each game dict. If no match link is found, set `matchId` to `None`.

### 2. New file: `scraper/match_scraper.py`

Single public function:

**`scrape_match(match_id: str) -> dict`**

Fetches `https://www.leagueofgraphs.com/match/euw/{match_id}`, parses the `<table class="matchTable">`. Returns:

```json
{
  "matchId": "7813808785",
  "participants": [
    {
      "summonerName": "Hopa#Hopa",
      "champion": "Sejuani",
      "team": 1,
      "kills": 4,
      "deaths": 4,
      "assists": 11,
      "cs": 203,
      "score": 4.3
    }
  ],
  "team1Kills": 39,
  "team2Kills": 25
}
```

**Team assignment:** The matchTable renders players interleaved — each `playerRow` `<tr>` contains two `<td class="summoner_column">` cells: left cell = team 1 player, right cell = team 2 player. Extract both cells per row to build 5 players for each team.

**Score formula:** `round((kills * 2 + assists) / max(deaths, 1) + cs / 100, 1)`

**Team kill totals:** parsed from the first summary row (`row[0]`), which contains aggregated K/D/A for each team as text like `"Victory 39 / 25 / 33"`. Extract the first number (kills) for each team column.

**Summoner name:** from `<div class="name">` inside the summoner column cell. Clean whitespace. Format is `"Name#Tag"`.

**Champion:** from `<img alt="ChampionName">` in the summoner column cell.

### 3. New logic in `scraper/main.py`

After `write_to_firebase`, before records:

1. Collect all unique non-None `matchId`s from all players' games.
2. Call `read_cached_match_ids(DATABASE_URL)` to get the set of match IDs already in `/matches`.
3. For each uncached match ID, call `scrape_match(match_id)` with a 0.5s sleep between requests.
4. Write each result to Firebase via `write_match(match_data, DATABASE_URL)`.
5. Log: `"Fetched N new matches (M already cached)"`.

### 4. New functions in `scraper/firebase_client.py`

**`read_cached_match_ids(database_url: str) -> set[str]`**
Reads `/matches` from Firebase using `db.reference("/matches").get()`, extracts the keys (match IDs) from the returned dict. Returns an empty set if the node doesn't exist or returns None. Note: with 200+ matches this returns the full objects — acceptable since match objects are small (~500 bytes each). If this becomes a performance concern, switch to the REST API with `?shallow=true`.

**`write_match(match_data: dict, database_url: str) -> None`**
Writes `match_data` to `/matches/{matchId}` using `.set()`.

---

## Firebase Schema

```
/matches/{matchId}:
  matchId: string
  team1Kills: int
  team2Kills: int
  participants: [
    {
      summonerName: string   # "Name#Tag"
      champion: string
      team: 1 | 2
      kills: int
      deaths: int
      assists: int
      cs: int
      score: float           # (kills*2 + assists) / max(deaths,1) + cs/100, rounded to 1dp
    }
    ... × 10
  ]
```

Match records are written once. They are never updated or deleted.

---

## Frontend Changes

### 1. `ScoreboardRow.jsx`

In the expanded game detail table, each game row (`<tr>`) becomes clickable. On click, call `onGameClick(game.matchId)`. If `matchId` is null/missing, the row is not clickable (no cursor change, no handler).

`ScoreboardRow` accepts a new optional prop `onGameClick(matchId: string)`.

### 2. `App.jsx`

- Manage `selectedMatchId` state (null by default).
- Pass `onGameClick={(id) => setSelectedMatchId(id)}` to each `ScoreboardRow`.
- Render `<MatchModal matchId={selectedMatchId} onClose={() => setSelectedMatchId(null)} />` at the bottom of the component (outside the table).

### 3. New file: `frontend/src/components/MatchModal.jsx`

**Props:** `{ matchId: string | null, onClose: () => void }`

**Behaviour:**
- Returns `null` if `matchId` is null.
- On mount / when `matchId` changes, fetches `/matches/{matchId}` from Firebase using `get(ref(db, '/matches/' + matchId))`.
- Shows a loading state while fetching.
- Shows an error state if fetch fails or returns null.
- Closes on backdrop click or Escape keypress.

**Layout (UI-UX-PRO-MAX):**
- Full-screen semi-transparent backdrop (`rgba(0,0,0,0.7)`) with `z-index: 1000`.
- Centred modal card, `max-width: 900px`, dark surface (`var(--card)`), border `var(--border-hi)`, `border-radius: 8px`.
- Header: match ID, team kill totals (`Team 1: 39 kills · Team 2: 25 kills`), close button.
- Body: two-column layout (Team 1 left, Team 2 right), each column showing 5 player rows.
- Each player row: champion name · summoner name · K/D/A · CS · score badge.
- Score badge: coloured pill — green (`var(--win)`) for score ≥ 5, yellow (`var(--gold)`) for ≥ 3, red (`var(--loss)`) below 3.
- **Group member highlight:** build a set of all tracked player gamertags (passed as prop from App or imported from a constants file). If a participant's `summonerName` matches a tracked gamertag, highlight the row with `background: var(--accent-soft)` and a left border `3px solid var(--accent)`.
- Accessible: `role="dialog"`, `aria-modal="true"`, `aria-label="Match detail"`, focus trapped inside modal while open.

### 4. Tracked gamertags constant

Create `frontend/src/trackedPlayers.js` exporting the list of gamertags matching `players.py`:

```js
export const TRACKED_GAMERTAGS = new Set([
  'Hopa#Hopa', 'ErikBby69#EUW', 'Easy Geometry#EUW', 'KingOfTheWolvez#EUW',
  'Markemouse#Monke', 'MczExperttt#EUW', 'MrHipsterYip#EUW', 'Pamit#EUW',
  'Pog0p#EUW', 'sXBLACKPHANTOMXs#2003', 'XxVortexSpeedxX#3845',
]);
```

---

## Performance

- **First run:** up to ~200 unique match pages fetched at 0.5s sleep = ~4–5 minutes extra. Total scrape ~8–10 min, within 20-min cron window.
- **Subsequent runs:** only new games fetched. Typically 5–15 unique new matches per run = ~10–30s extra.
- **Deduplication:** by match ID across all players before fetching. Same match played by two group members is fetched once.

---

## Error Handling

- `scrape_match` failure: log warning, skip that match. Do not crash the run.
- `/matches/{matchId}` not found in Firebase when modal opens: show "Match data unavailable" message.
- `matchId` null on a game: row not clickable, no modal attempted.

---

## Out of Scope

- Win/loss result per participant (not reliably parseable from the match table without additional work).
- Role/position detection.
- Item builds.
- Historical match data older than the 30-game window.
- Deleting stale match records from Firebase.
