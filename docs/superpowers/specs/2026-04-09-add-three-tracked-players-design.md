# Add Three Tracked Players — Design Spec

**Date:** 2026-04-09
**Status:** Approved

## Overview

Expand the tracked League of Legends roster from 11 players to 14 by adding Adrian, Sigurd N, and Elias. The scraper should fetch their leagueofgraphs.com data alongside the existing players, and the frontend should render them exactly like the rest of the roster anywhere tracked-player metadata is used.

---

## Goals

- Add the three new players to both scraper runtimes so scheduled and manual fetches include them
- Keep display names in the UI exactly as `Adrian`, `Sigurd N`, and `Elias`
- Ensure match detail views recognize the new gamertags as tracked players
- Remove the current frontend duplication where tracked gamertags and scoreboard fallback gamertags are maintained separately

---

## Current State

The roster is currently hard-coded in three places:

1. `scraper/players.py` for local scraper runs
2. `functions/scraper/players.py` for Firebase Cloud Functions
3. `frontend/src/trackedPlayers.js` for match-modal tracked-player highlighting

The scoreboard also carries a separate fallback `GAMERTAGS` map inside `frontend/src/components/ScoreboardRow.jsx` to display gamertags before Firebase has been refreshed with the latest player metadata. That means a roster change currently requires touching four separate lists.

---

## Player Metadata

The new tracked players are:

| ID | Display Name | Gamertag | leagueofgraphs URL |
|---|---|---|---|
| `adrian` | Adrian | `Requiem#9749` | https://www.leagueofgraphs.com/summoner/euw/Requiem-9749 |
| `sigurdn` | Sigurd N | `Mr Naess#EUW` | https://www.leagueofgraphs.com/summoner/euw/Mr+Naess-EUW |
| `elias` | Elias | `Hotdogmaster64#EUW` | https://www.leagueofgraphs.com/summoner/euw/Hotdogmaster64-EUW |

These IDs follow the existing lowercase, punctuation-free pattern already used by the roster.

---

## Architecture

```
scraper/players.py
  └─ canonical Python roster for local scraper runs

functions/scraper/players.py
  └─ deployed Cloud Functions roster, kept in sync with scraper/

frontend/src/trackedPlayers.js
  └─ frontend tracked-player metadata
       ├─ tracked player list
       ├─ TRACKED_GAMERTAGS set
       └─ GAMERTAGS_BY_ID fallback map

frontend UI
  ├─ MatchModal uses TRACKED_GAMERTAGS
  └─ ScoreboardRow uses GAMERTAGS_BY_ID until Firebase data contains gamertag
```

This keeps the existing split between Python and frontend, but removes unnecessary duplication inside the frontend itself.

---

## Frontend Design

### Metadata source

`frontend/src/trackedPlayers.js` becomes the single frontend metadata source for tracked players. It should export:

- A tracked-player array or object containing player IDs and gamertags
- `TRACKED_GAMERTAGS`, derived from that metadata for use in `MatchModal`
- `GAMERTAGS_BY_ID`, derived from that metadata for use in `ScoreboardRow`

`ScoreboardRow.jsx` should stop defining its own local fallback map and instead import `GAMERTAGS_BY_ID`.

### UI behavior

No layout or styling changes are needed.

- The scoreboard already renders any player present in Firebase with games/stats, so new rows appear automatically after the next scrape
- The player label shown in the scoreboard remains the `displayName` written by the scraper
- The gamertag line under the player name continues to work even before Firebase data has been refreshed, because the fallback map now includes the new players
- Match detail views continue highlighting tracked participants using the shared tracked gamertag set

---

## Data Flow

1. The scraper and Cloud Functions iterate a 14-player roster instead of 11
2. Each fetch writes `players/{id}` entries for the new players using the same schema as the existing roster
3. The frontend `useGameData` hook reads those Firebase entries without schema changes
4. `App.jsx` includes the new players automatically when sorting and rendering scoreboard rows
5. `MatchModal.jsx` recognizes the new gamertags as tracked because its tracked set is expanded from shared frontend metadata

No Firebase schema changes are required.

---

## Testing

- Verify the frontend tracked-player metadata exports include the three new entries
- Verify `ScoreboardRow` still resolves fallback gamertags from shared metadata
- Verify `MatchModal` still classifies tracked participants correctly with the expanded gamertag set
- Run the relevant frontend tests touching tracked-player metadata and scoreboard behavior

The scraper change is constant-only, so no scraper parsing or Firebase payload logic changes are required beyond keeping both Python roster files synchronized.

---

## Out of Scope

- Moving player metadata into a cross-language shared manifest consumed by Python and frontend
- Any scoreboard layout changes, rank logic changes, or stat calculations
- Backfilling old Firebase data before the next scheduled or manual fetch
