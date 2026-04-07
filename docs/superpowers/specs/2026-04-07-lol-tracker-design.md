# LOL Group Tracker — Design Spec

**Date:** 2026-04-07
**Status:** Approved

---

## Overview

A web application that tracks ranked Solo/Duo League of Legends games for a group of 11 friends. A Python scraper pulls the 10 most recent ranked games per player from leagueofgraphs.com and stores them in Firebase Realtime Database. A React frontend hosted on Firebase Hosting displays the data with per-player stats and a combined group win rate as the main feature.

---

## Architecture

```
leagueofgraphs.com
        │
        ▼
  Python scraper (GitHub Actions, every 30 min)
        │  scrapes 11 accounts × 10 ranked solo/duo games
        ▼
  Firebase Realtime Database
        │  stores game history + computed stats
        ▼
  React + Vite frontend (Firebase Hosting)
        │  reads live from Firebase JS SDK
        ▼
  Browser
```

**Three components:**

1. **`scraper/`** — Python script using `requests` + `BeautifulSoup4`. Runs on GitHub Actions cron schedule (`*/30 * * * *`). Authenticates to Firebase using the Admin SDK with a service account key stored as a GitHub Actions secret. Overwrites player data on each run.

2. **`frontend/`** — React + Vite app styled with Tailwind CSS. Reads from Firebase Realtime Database using the Firebase JS SDK. Deployed to Firebase Hosting via GitHub Actions on push to `main`.

3. **Firebase** — Free Spark plan. Realtime Database stores data (~few KB). Hosting serves the frontend.

---

## Players

| Name | leagueofgraphs URL |
|---|---|
| Oliver | https://www.leagueofgraphs.com/summoner/euw/Hopa-Hopa |
| Eirik | https://www.leagueofgraphs.com/summoner/euw/ErikBby69-EUW |
| Marcus | https://www.leagueofgraphs.com/summoner/euw/Easy+Geometry-EUW |
| Minh | https://www.leagueofgraphs.com/summoner/euw/KingOfTheWolvez-EUW |
| Jon | https://www.leagueofgraphs.com/summoner/euw/Markemouse-Monke |
| Daniel | https://www.leagueofgraphs.com/summoner/euw/MczExperttt-EUW |
| Nontagan | https://www.leagueofgraphs.com/summoner/euw/MrHipsterYip-EUW |
| Tim | https://www.leagueofgraphs.com/summoner/euw/Pamit-EUW |
| Sigurd | https://www.leagueofgraphs.com/summoner/euw/Pog0p-EUW |
| Simon | https://www.leagueofgraphs.com/summoner/euw/sXBLACKPHANTOMXs-2003 |
| Fredrik | https://www.leagueofgraphs.com/summoner/euw/XxVortexSpeedxX-3845 |

---

## Data Model (Firebase Realtime Database)

```json
{
  "players": {
    "oliver": {
      "displayName": "Oliver",
      "profileUrl": "https://www.leagueofgraphs.com/summoner/euw/Hopa-Hopa",
      "games": [
        {
          "champion": "Jinx",
          "result": "win",
          "kills": 8,
          "deaths": 2,
          "assists": 10,
          "kda": 9.0,
          "cs": 210,
          "duration": "32:14",
          "timestamp": "2026-04-07T18:00:00Z"
        }
      ],
      "stats": {
        "wins": 7,
        "losses": 3,
        "winRate": 0.70
      }
    }
  },
  "group": {
    "totalWins": 58,
    "totalLosses": 52,
    "winRate": 0.527,
    "lastUpdated": "2026-04-07T18:00:00Z"
  }
}
```

- Each scrape run overwrites `players/{id}` fully and recalculates `group`.
- Games are stored as an array, most recent first.
- Only Ranked Solo/Duo games are counted.

---

## Scraper Design

- Language: Python 3.11+
- Libraries: `requests`, `beautifulsoup4`, `firebase-admin`
- Entry point: `scraper/main.py`
- For each player: fetch their leagueofgraphs page, parse the recent games table, filter to Ranked Solo/Duo only, take the 10 most recent, extract champion, result, K/D/A, CS, duration, timestamp
- Compute per-player stats (wins, losses, win rate, avg KDA, avg CS, most played champion)
- Compute group stats (total wins, losses, combined win rate)
- Write everything to Firebase in a single `update()` call
- Firebase credentials loaded from `FIREBASE_CREDENTIALS` environment variable (JSON string of service account key)

**GitHub Actions workflow:** `.github/workflows/scrape.yml`
- Trigger: `schedule: - cron: '*/30 * * * *'`
- Also triggerable manually via `workflow_dispatch`
- Steps: checkout, setup Python, install deps, run scraper
- Secret: `FIREBASE_CREDENTIALS`

---

## Frontend Design

- Framework: React 18 + Vite
- Styling: Tailwind CSS
- Data: Firebase JS SDK (Realtime Database, `onValue` listener for live updates)
- Deployment: Firebase Hosting via GitHub Actions on push to `main`

**Layout (single-page, dark theme):**

1. **Hero section** — Large group win rate display. Shows total W / L, win rate percentage, and a horizontal progress bar. This is the main attraction.

2. **Player cards grid** — One card per player:
   - Name + win rate
   - Last 10 games as colored dots (green = win, red = loss)
   - Avg KDA, avg CS, most played champion
   - Click to expand: full 10-game history table with champion, result, K/D/A, CS, duration

3. **Leaderboard** — Players ranked by win rate, with a trophy icon for #1.

4. **Footer** — "Last updated: X minutes ago" using `group.lastUpdated`.

**Component structure:**
```
App
├── HeroStats          (group win rate)
├── PlayerGrid
│   └── PlayerCard     (collapsed + expanded state)
└── Leaderboard
```

---

## Deployment

- Frontend: `firebase deploy --only hosting` (via GitHub Actions on push to `main`)
- Scraper: GitHub Actions cron, every 30 minutes
- Firebase project: free Spark plan
- Domain: Firebase default domain (`<project-id>.web.app`)

---

## Out of Scope

- Authentication / login
- Historical tracking beyond the 10 most recent games
- Push notifications
- Mobile app
