# 🐄 Baby Cow — LoL Group Tracker

A live dashboard that tracks ranked League of Legends game history for a group of friends. Shows the combined group win rate, individual stats, and a sortable scoreboard updated every 20 minutes.

**Live site:** https://lol-group-tracker.web.app

---

## What it does

- Scrapes ranked Solo/Duo and Flex game history for 11 players from [leagueofgraphs.com](https://www.leagueofgraphs.com)
- Stores stats in Firebase Realtime Database
- Displays a live scoreboard ranked by win rate, with last 10 games, KDA, CS, and top champion per player
- Automatically re-scrapes every 20 minutes via GitHub Actions

---

## Architecture

```
GitHub Actions (cron every 20 min)
    └── scraper/main.py
            ├── fetches leagueofgraphs.com pages
            ├── parses Ranked Solo/Duo + Flex games
            └── writes to Firebase Realtime Database
                        │
                        ▼
            Firebase Realtime Database
                        │
                        ▼
            React frontend (Firebase Hosting)
                └── reads live via onValue() listener
```

---

## Firebase data structure

```json
{
  "players": {
    "oliver": {
      "displayName": "Oliver",
      "gamertag": "Hopa#Hopa",
      "profileUrl": "https://www.leagueofgraphs.com/summoner/euw/Hopa-Hopa",
      "games": [
        {
          "champion": "Jinx",
          "result": "win",
          "kills": 8,
          "deaths": 2,
          "assists": 10,
          "cs": 198,
          "duration": "32min 14s",
          "queue": "Ranked Solo/Duo"
        }
      ],
      "stats": {
        "wins": 6,
        "losses": 4,
        "winRate": 0.6,
        "avgKda": 4.2,
        "avgCs": 185,
        "mostPlayedChampion": "Jinx"
      }
    }
  },
  "group": {
    "totalWins": 40,
    "totalLosses": 49,
    "winRate": 0.449,
    "lastUpdated": "2026-04-07T20:06:54+00:00"
  }
}
```

---

## Project structure

```
├── scraper/
│   ├── main.py              # Orchestrator — loops players, scrapes, writes to Firebase
│   ├── scrape.py            # HTML parser (leagueofgraphs.com)
│   ├── stats.py             # Computes per-player and group stats
│   ├── firebase_client.py   # Firebase Admin SDK writer
│   ├── players.py           # Player list (id, displayName, gamertag, URL)
│   ├── requirements.txt
│   └── tests/
│       ├── test_scrape.py
│       ├── test_stats.py
│       └── test_firebase_client.py
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                      # Main layout — header + scoreboard table
│   │   ├── components/
│   │   │   └── ScoreboardRow.jsx        # One row per player, expandable game history
│   │   ├── hooks/
│   │   │   └── useGameData.js           # Firebase Realtime DB listener
│   │   ├── firebase.js                  # Firebase app init
│   │   └── index.css                    # Design tokens (CSS vars)
│   ├── index.html
│   └── package.json
│
├── .github/workflows/
│   ├── scraper.yml   # Cron every 20 min + manual trigger
│   └── deploy.yml    # Deploy frontend on push to main (frontend/** changes)
│
├── firebase.json     # Firebase Hosting config
├── .firebaserc       # Firebase project binding
└── SETUP.md          # One-time setup guide
```

---

## GitHub Actions workflows

### `scraper.yml` — Scrape LOL Stats
- **Trigger:** every 20 minutes (`*/20 * * * *`) + manual `workflow_dispatch`
- **What it does:** runs `scraper/main.py` which scrapes all 11 players and writes to Firebase
- **Secrets needed:** `FIREBASE_CREDENTIALS`, `FIREBASE_DATABASE_URL`

### `deploy.yml` — Deploy Frontend
- **Trigger:** push to `main` when `frontend/**`, `firebase.json`, or `.firebaserc` change
- **What it does:** `npm run build` then deploys to Firebase Hosting
- **Secrets needed:** all `VITE_FIREBASE_*` vars + `FIREBASE_SERVICE_ACCOUNT`

To trigger a manual scrape: **GitHub → Actions → Scrape LOL Stats → Run workflow**

---

## Local development

### Frontend

```bash
cd frontend
npm install
# create frontend/.env with your Firebase config (see SETUP.md)
npm run dev
```

### Scraper

```bash
cd scraper
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

export FIREBASE_CREDENTIALS='{"type":"service_account",...}'
export FIREBASE_DATABASE_URL='https://your-project-default-rtdb.firebaseio.com'
python3 main.py
```

### Tests

```bash
cd scraper
source .venv/bin/activate
python3 -m pytest tests/ -v
```

---

## Adding or changing players

Edit `scraper/players.py`:

```python
{"id": "newplayer", "displayName": "Name", "gamertag": "RiotID#Tag", "url": "https://www.leagueofgraphs.com/summoner/euw/RiotID-Tag"},
```

The `id` is used as the Firebase key — keep it lowercase, no spaces.

---

## First-time setup

See [SETUP.md](./SETUP.md) for the full guide: creating the Firebase project, generating credentials, setting GitHub secrets, and deploying.
