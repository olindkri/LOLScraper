# LOL Group Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web app that scrapes ranked Solo/Duo game history for 11 LoL accounts, stores data in Firebase Realtime Database, and displays combined group win rate + per-player stats in a dark-themed React frontend.

**Architecture:** A Python scraper runs on GitHub Actions every 30 minutes, using requests + BeautifulSoup to scrape leagueofgraphs.com and firebase-admin to write to Firebase Realtime Database. A React + Vite + Tailwind CSS frontend hosted on Firebase Hosting reads live data via the Firebase JS SDK.

**Tech Stack:** Python 3.11, requests, beautifulsoup4, lxml, firebase-admin, pytest | React 18, Vite 5, Tailwind CSS v3, Firebase JS SDK v10, Vitest, @testing-library/react

---

## File Map

```
LOLScraper/
├── scraper/
│   ├── main.py                    # Entry point: orchestrates scraping + writing
│   ├── scrape.py                  # leagueofgraphs HTML parsing logic
│   ├── firebase_client.py         # Firebase Realtime DB write logic
│   ├── players.py                 # Player name → URL mapping
│   ├── requirements.txt           # Python dependencies
│   └── tests/
│       ├── fixtures/
│       │   └── sample_page.html   # Saved HTML for offline tests
│       ├── test_scrape.py         # Tests for HTML parsing
│       └── test_firebase_client.py
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── package.json
│   ├── .env.example               # Documents required env vars
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── firebase.js            # Firebase app init + db export
│       ├── hooks/
│       │   └── useGameData.js     # onValue listener → {players, group}
│       └── components/
│           ├── HeroStats.jsx      # Group win rate hero section
│           ├── PlayerGrid.jsx     # Responsive grid of PlayerCards
│           ├── PlayerCard.jsx     # Card with dots + expandable game table
│           └── Leaderboard.jsx    # Players ranked by win rate
├── .github/
│   └── workflows/
│       ├── scrape.yml             # Cron job: every 30 min
│       └── deploy.yml             # Deploy frontend on push to main
├── .firebaserc                    # Firebase project alias
└── firebase.json                  # Hosting config
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `scraper/requirements.txt`
- Create: `scraper/players.py`
- Create: `frontend/package.json` (via npm init)

- [ ] **Step 1: Create scraper directory and requirements**

```
mkdir -p scraper/tests/fixtures
```

Create `scraper/requirements.txt`:
```
requests==2.31.0
beautifulsoup4==4.12.3
lxml==5.1.0
firebase-admin==6.4.0
pytest==8.1.0
pytest-mock==3.14.0
```

- [ ] **Step 2: Install scraper dependencies**

```bash
cd scraper && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
```

Expected: all packages install without errors.

- [ ] **Step 3: Create players.py**

Create `scraper/players.py`:
```python
PLAYERS = [
    {"id": "oliver",   "displayName": "Oliver",   "url": "https://www.leagueofgraphs.com/summoner/euw/Hopa-Hopa"},
    {"id": "eirik",    "displayName": "Eirik",    "url": "https://www.leagueofgraphs.com/summoner/euw/ErikBby69-EUW"},
    {"id": "marcus",   "displayName": "Marcus",   "url": "https://www.leagueofgraphs.com/summoner/euw/Easy+Geometry-EUW"},
    {"id": "minh",     "displayName": "Minh",     "url": "https://www.leagueofgraphs.com/summoner/euw/KingOfTheWolvez-EUW"},
    {"id": "jon",      "displayName": "Jon",      "url": "https://www.leagueofgraphs.com/summoner/euw/Markemouse-Monke"},
    {"id": "daniel",   "displayName": "Daniel",   "url": "https://www.leagueofgraphs.com/summoner/euw/MczExperttt-EUW"},
    {"id": "nontagan", "displayName": "Nontagan", "url": "https://www.leagueofgraphs.com/summoner/euw/MrHipsterYip-EUW"},
    {"id": "tim",      "displayName": "Tim",      "url": "https://www.leagueofgraphs.com/summoner/euw/Pamit-EUW"},
    {"id": "sigurd",   "displayName": "Sigurd",   "url": "https://www.leagueofgraphs.com/summoner/euw/Pog0p-EUW"},
    {"id": "simon",    "displayName": "Simon",    "url": "https://www.leagueofgraphs.com/summoner/euw/sXBLACKPHANTOMXs-2003"},
    {"id": "fredrik",  "displayName": "Fredrik",  "url": "https://www.leagueofgraphs.com/summoner/euw/XxVortexSpeedxX-3845"},
]
```

- [ ] **Step 4: Scaffold the React frontend with Vite**

```bash
cd frontend && npm create vite@latest . -- --template react && npm install
```

Expected: Vite project created in `frontend/`.

- [ ] **Step 5: Install frontend dependencies**

```bash
cd frontend && npm install -D tailwindcss@3 postcss autoprefixer && npx tailwindcss init -p && npm install firebase
```

Expected: tailwind, postcss, autoprefixer, firebase installed.

- [ ] **Step 6: Configure Tailwind**

Replace the content of `frontend/tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Replace the content of `frontend/src/index.css` with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 7: Commit scaffolding**

```bash
git add scraper/ frontend/ && git commit -m "chore: scaffold scraper and frontend"
```

---

## Task 2: HTML Selector Discovery (Scraper)

**Files:**
- Create: `scraper/inspect_html.py` (temporary helper, deleted after task)
- Create: `scraper/tests/fixtures/sample_page.html`

This task captures a real page for use in offline tests.

- [ ] **Step 1: Create inspection helper**

Create `scraper/inspect_html.py`:
```python
"""Run once to capture HTML and discover selectors. Delete after Task 2."""
import requests

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

url = "https://www.leagueofgraphs.com/summoner/euw/Hopa-Hopa"
resp = requests.get(url, headers=HEADERS, timeout=15)
print("Status:", resp.status_code)

with open("tests/fixtures/sample_page.html", "w", encoding="utf-8") as f:
    f.write(resp.text)

print("Saved to tests/fixtures/sample_page.html")
print("Open the file and search for 'Ranked Solo' to find game row structure.")
```

- [ ] **Step 2: Run the inspection helper**

```bash
cd scraper && source .venv/bin/activate && python inspect_html.py
```

Expected: `Status: 200` and file saved. If you still get 403, add a `time.sleep(2)` before the request.

- [ ] **Step 3: Inspect the HTML to identify selectors**

Open `scraper/tests/fixtures/sample_page.html` in a browser or text editor.
Search for "Ranked Solo" to find game rows.

You are looking for:
- The container element holding all game rows (e.g., `table.recent-games`, `div.recentGames`)
- The class on individual game rows that indicates win or loss
- The element containing champion name
- The element(s) containing K / D / A values
- The element containing CS (creep score)
- The element containing game duration
- The element containing queue type ("Ranked Solo" text)

Write down your findings before proceeding to Task 3. The selectors you discover here go directly into `scrape.py`.

- [ ] **Step 4: Delete the inspection helper**

```bash
rm scraper/inspect_html.py
git add scraper/tests/fixtures/sample_page.html && git commit -m "chore: add HTML fixture for scraper tests"
```

---

## Task 3: Scraper — HTML Parsing

**Files:**
- Create: `scraper/scrape.py`
- Create: `scraper/tests/test_scrape.py`

> **Note:** The CSS selectors below are based on leagueofgraphs HTML patterns known at plan-writing time. Use the selectors you discovered in Task 2 if they differ.

- [ ] **Step 1: Write failing tests using the fixture HTML**

Create `scraper/tests/test_scrape.py`:
```python
from pathlib import Path
from bs4 import BeautifulSoup
from scrape import parse_games

FIXTURE = Path(__file__).parent / "fixtures" / "sample_page.html"

def get_soup():
    return BeautifulSoup(FIXTURE.read_text(encoding="utf-8"), "lxml")

def test_returns_list_of_dicts():
    games = parse_games(get_soup())
    assert isinstance(games, list)

def test_returns_at_most_10_games():
    games = parse_games(get_soup())
    assert len(games) <= 10

def test_only_ranked_solo_duo():
    games = parse_games(get_soup())
    for game in games:
        assert game["queue"] == "Ranked Solo/Duo"

def test_game_has_required_fields():
    games = parse_games(get_soup())
    if not games:
        return  # account may have no ranked games
    game = games[0]
    assert "champion" in game
    assert "result" in game
    assert game["result"] in ("win", "loss")
    assert "kills" in game
    assert "deaths" in game
    assert "assists" in game
    assert "cs" in game
    assert "duration" in game
    assert "queue" in game

def test_kills_deaths_assists_are_ints():
    games = parse_games(get_soup())
    if not games:
        return
    game = games[0]
    assert isinstance(game["kills"], int)
    assert isinstance(game["deaths"], int)
    assert isinstance(game["assists"], int)

def test_cs_is_int():
    games = parse_games(get_soup())
    if not games:
        return
    assert isinstance(games[0]["cs"], int)
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd scraper && source .venv/bin/activate && python -m pytest tests/test_scrape.py -v
```

Expected: ImportError or NameError — `scrape` module does not exist yet.

- [ ] **Step 3: Implement scrape.py**

Create `scraper/scrape.py`:

```python
import re
import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

RANKED_QUEUE_NAMES = {"Ranked Solo/Duo", "Ranked Solo", "Solo/Duo"}


def fetch_page(url: str) -> BeautifulSoup:
    resp = requests.get(url, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, "lxml")


def _parse_int(text: str) -> int:
    """Extract first integer from a string like '8 / 2 / 10' or '210 CS'."""
    match = re.search(r"\d+", text.replace(",", ""))
    return int(match.group()) if match else 0


def parse_games(soup: BeautifulSoup) -> list[dict]:
    """
    Parse up to 10 Ranked Solo/Duo games from a leagueofgraphs summoner page.

    Returns a list of dicts with keys:
        champion, result, kills, deaths, assists, cs, duration, queue

    IMPORTANT: If this returns empty or incorrect data, inspect the fixture HTML
    from Task 2 and update the selectors below to match the actual page structure.
    """
    games = []

    # --- Selector block: update these if the page structure differs ---
    # Game rows are <tr> elements. Win rows have class 'win', loss rows 'loss'.
    # Each row contains cells for: champion, queue type, KDA, CS, duration.
    game_rows = soup.select("tr.win, tr.loss")
    # -----------------------------------------------------------------

    for row in game_rows:
        # Queue type — skip non-ranked games
        queue_el = row.select_one("td.gamemode, .queue-type, .gameType")
        queue_text = queue_el.get_text(strip=True) if queue_el else ""
        if not any(q in queue_text for q in RANKED_QUEUE_NAMES):
            continue

        # Result
        result = "win" if "win" in row.get("class", []) else "loss"

        # Champion name — try common selectors
        champ_el = (
            row.select_one(".champion-nameinfo .name")
            or row.select_one(".champion-name")
            or row.select_one("td.champion img")
        )
        champion = ""
        if champ_el:
            champion = champ_el.get_text(strip=True) if champ_el.name != "img" else champ_el.get("alt", "")

        # KDA — three separate cells or one cell with slashes
        kda_cells = row.select("td.kda span, .kda-block span")
        if len(kda_cells) >= 3:
            kills = _parse_int(kda_cells[0].get_text())
            deaths = _parse_int(kda_cells[1].get_text())
            assists = _parse_int(kda_cells[2].get_text())
        else:
            kda_text = row.select_one("td.kda, .kda-block")
            kda_text = kda_text.get_text() if kda_text else "0/0/0"
            parts = re.findall(r"\d+", kda_text)
            kills = int(parts[0]) if len(parts) > 0 else 0
            deaths = int(parts[1]) if len(parts) > 1 else 0
            assists = int(parts[2]) if len(parts) > 2 else 0

        # CS
        cs_el = row.select_one("td.cs, .creep-score")
        cs = _parse_int(cs_el.get_text()) if cs_el else 0

        # Duration
        dur_el = row.select_one("td.duration, .game-duration")
        duration = dur_el.get_text(strip=True) if dur_el else ""

        games.append({
            "champion": champion,
            "result": result,
            "kills": kills,
            "deaths": deaths,
            "assists": assists,
            "cs": cs,
            "duration": duration,
            "queue": "Ranked Solo/Duo",
        })

        if len(games) == 10:
            break

    return games
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd scraper && source .venv/bin/activate && python -m pytest tests/test_scrape.py -v
```

Expected: all tests pass. If any fail due to selector mismatches, open `tests/fixtures/sample_page.html`, find the correct class names, and update the selector block in `scrape.py`.

- [ ] **Step 5: Commit**

```bash
git add scraper/scrape.py scraper/tests/test_scrape.py && git commit -m "feat: implement leagueofgraphs HTML parser with tests"
```

---

## Task 4: Scraper — Stats Computation

**Files:**
- Create: `scraper/stats.py`
- Create: `scraper/tests/test_stats.py`

- [ ] **Step 1: Write failing tests**

Create `scraper/tests/test_stats.py`:
```python
from stats import compute_player_stats, compute_group_stats

SAMPLE_GAMES = [
    {"result": "win",  "kills": 8, "deaths": 2, "assists": 10, "cs": 200, "champion": "Jinx"},
    {"result": "loss", "kills": 3, "deaths": 5, "assists": 4,  "cs": 150, "champion": "Lux"},
    {"result": "win",  "kills": 6, "deaths": 1, "assists": 8,  "cs": 220, "champion": "Jinx"},
    {"result": "win",  "kills": 9, "deaths": 3, "assists": 12, "cs": 190, "champion": "Jinx"},
    {"result": "loss", "kills": 2, "deaths": 6, "assists": 3,  "cs": 130, "champion": "Lux"},
]

def test_player_stats_wins_losses():
    stats = compute_player_stats(SAMPLE_GAMES)
    assert stats["wins"] == 3
    assert stats["losses"] == 2

def test_player_stats_win_rate():
    stats = compute_player_stats(SAMPLE_GAMES)
    assert stats["winRate"] == 0.6

def test_player_stats_avg_kda():
    stats = compute_player_stats(SAMPLE_GAMES)
    # (8+3+6+9+2) / (2+5+1+3+6) / ... actually KDA = (K+A)/D per game averaged
    # kills: 28, deaths: 17, assists: 37
    # avg KDA = (28 + 37) / 17 = 65/17 ≈ 3.82
    assert abs(stats["avgKda"] - round((28 + 37) / 17, 2)) < 0.01

def test_player_stats_most_played_champion():
    stats = compute_player_stats(SAMPLE_GAMES)
    assert stats["mostPlayedChampion"] == "Jinx"

def test_player_stats_empty_games():
    stats = compute_player_stats([])
    assert stats["wins"] == 0
    assert stats["losses"] == 0
    assert stats["winRate"] == 0.0

def test_group_stats_totals():
    player_stats_list = [
        {"wins": 7, "losses": 3},
        {"wins": 5, "losses": 5},
        {"wins": 6, "losses": 4},
    ]
    group = compute_group_stats(player_stats_list)
    assert group["totalWins"] == 18
    assert group["totalLosses"] == 12
    assert group["winRate"] == 0.6

def test_group_stats_zero_games():
    group = compute_group_stats([])
    assert group["winRate"] == 0.0
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd scraper && source .venv/bin/activate && python -m pytest tests/test_stats.py -v
```

Expected: ImportError — `stats` module does not exist.

- [ ] **Step 3: Implement stats.py**

Create `scraper/stats.py`:
```python
from collections import Counter
from datetime import datetime, timezone


def compute_player_stats(games: list[dict]) -> dict:
    if not games:
        return {
            "wins": 0,
            "losses": 0,
            "winRate": 0.0,
            "avgKda": 0.0,
            "avgCs": 0.0,
            "mostPlayedChampion": "",
        }

    wins = sum(1 for g in games if g["result"] == "win")
    losses = len(games) - wins

    total_kills = sum(g["kills"] for g in games)
    total_deaths = sum(g["deaths"] for g in games)
    total_assists = sum(g["assists"] for g in games)
    avg_kda = round((total_kills + total_assists) / max(total_deaths, 1), 2)

    avg_cs = round(sum(g["cs"] for g in games) / len(games))

    champion_counts = Counter(g["champion"] for g in games if g.get("champion"))
    most_played = champion_counts.most_common(1)[0][0] if champion_counts else ""

    return {
        "wins": wins,
        "losses": losses,
        "winRate": round(wins / len(games), 4),
        "avgKda": avg_kda,
        "avgCs": avg_cs,
        "mostPlayedChampion": most_played,
    }


def compute_group_stats(player_stats_list: list[dict]) -> dict:
    if not player_stats_list:
        return {"totalWins": 0, "totalLosses": 0, "winRate": 0.0, "lastUpdated": _now()}

    total_wins = sum(p["wins"] for p in player_stats_list)
    total_losses = sum(p["losses"] for p in player_stats_list)
    total_games = total_wins + total_losses

    return {
        "totalWins": total_wins,
        "totalLosses": total_losses,
        "winRate": round(total_wins / max(total_games, 1), 4),
        "lastUpdated": _now(),
    }


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd scraper && source .venv/bin/activate && python -m pytest tests/test_stats.py -v
```

Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add scraper/stats.py scraper/tests/test_stats.py && git commit -m "feat: implement stats computation with tests"
```

---

## Task 5: Scraper — Firebase Client

**Files:**
- Create: `scraper/firebase_client.py`
- Create: `scraper/tests/test_firebase_client.py`

- [ ] **Step 1: Write failing tests**

Create `scraper/tests/test_firebase_client.py`:
```python
from unittest.mock import MagicMock, patch
from firebase_client import build_payload, write_to_firebase

SAMPLE_PLAYERS = [
    {
        "id": "oliver",
        "displayName": "Oliver",
        "url": "https://www.leagueofgraphs.com/summoner/euw/Hopa-Hopa",
        "games": [{"champion": "Jinx", "result": "win", "kills": 8, "deaths": 2, "assists": 10, "cs": 200, "duration": "32:14", "queue": "Ranked Solo/Duo"}],
        "stats": {"wins": 1, "losses": 0, "winRate": 1.0, "avgKda": 9.0, "avgCs": 200, "mostPlayedChampion": "Jinx"},
    }
]

SAMPLE_GROUP = {"totalWins": 1, "totalLosses": 0, "winRate": 1.0, "lastUpdated": "2026-01-01T00:00:00+00:00"}

def test_build_payload_structure():
    payload = build_payload(SAMPLE_PLAYERS, SAMPLE_GROUP)
    assert "players" in payload
    assert "group" in payload
    assert "oliver" in payload["players"]
    assert payload["players"]["oliver"]["displayName"] == "Oliver"
    assert payload["group"]["totalWins"] == 1

def test_build_payload_games_included():
    payload = build_payload(SAMPLE_PLAYERS, SAMPLE_GROUP)
    assert len(payload["players"]["oliver"]["games"]) == 1
    assert payload["players"]["oliver"]["games"][0]["champion"] == "Jinx"

def test_write_to_firebase_calls_update(mocker):
    mock_ref = MagicMock()
    mocker.patch("firebase_client._init_app")  # prevent env var + Firebase SDK call
    mocker.patch("firebase_client.db.reference", return_value=mock_ref)
    write_to_firebase(SAMPLE_PLAYERS, SAMPLE_GROUP, database_url="https://fake.firebaseio.com")
    mock_ref.update.assert_called_once()
    call_args = mock_ref.update.call_args[0][0]
    assert "players" in call_args
    assert "group" in call_args
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd scraper && source .venv/bin/activate && python -m pytest tests/test_firebase_client.py -v
```

Expected: ImportError.

- [ ] **Step 3: Implement firebase_client.py**

Create `scraper/firebase_client.py`:
```python
import json
import os
import firebase_admin
from firebase_admin import credentials, db

_app = None


def _init_app(database_url: str) -> None:
    global _app
    if _app is not None:
        return
    cred_json = json.loads(os.environ["FIREBASE_CREDENTIALS"])
    cred = credentials.Certificate(cred_json)
    _app = firebase_admin.initialize_app(cred, {"databaseURL": database_url})


def build_payload(players: list[dict], group: dict) -> dict:
    players_data = {}
    for p in players:
        players_data[p["id"]] = {
            "displayName": p["displayName"],
            "profileUrl": p["url"],
            "games": p["games"],
            "stats": p["stats"],
        }
    return {"players": players_data, "group": group}


def write_to_firebase(players: list[dict], group: dict, database_url: str) -> None:
    _init_app(database_url)
    payload = build_payload(players, group)
    db.reference("/").update(payload)
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd scraper && source .venv/bin/activate && python -m pytest tests/test_firebase_client.py -v
```

Expected: all 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add scraper/firebase_client.py scraper/tests/test_firebase_client.py && git commit -m "feat: implement Firebase client with tests"
```

---

## Task 6: Scraper — Main Orchestrator

**Files:**
- Create: `scraper/main.py`

- [ ] **Step 1: Implement main.py**

Create `scraper/main.py`:
```python
import os
import sys
import time
import logging
from players import PLAYERS
from scrape import fetch_page, parse_games
from stats import compute_player_stats, compute_group_stats
from firebase_client import write_to_firebase

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

DATABASE_URL = os.environ.get("FIREBASE_DATABASE_URL", "")


def run():
    if not DATABASE_URL:
        log.error("FIREBASE_DATABASE_URL environment variable is not set.")
        sys.exit(1)

    all_player_data = []
    for player in PLAYERS:
        log.info(f"Scraping {player['displayName']} ({player['url']})")
        try:
            soup = fetch_page(player["url"])
            games = parse_games(soup)
            stats = compute_player_stats(games)
            all_player_data.append({
                **player,
                "games": games,
                "stats": stats,
            })
            log.info(f"  → {len(games)} ranked games, {stats['wins']}W {stats['losses']}L")
        except Exception as e:
            log.warning(f"  → Failed to scrape {player['displayName']}: {e}")
            # Include player with empty data so frontend can still show them
            all_player_data.append({
                **player,
                "games": [],
                "stats": compute_player_stats([]),
            })
        time.sleep(1)  # Be polite to the server

    group = compute_group_stats([p["stats"] for p in all_player_data])
    log.info(f"Group: {group['totalWins']}W {group['totalLosses']}L ({group['winRate']:.1%})")

    write_to_firebase(all_player_data, group, DATABASE_URL)
    log.info("Data written to Firebase successfully.")


if __name__ == "__main__":
    run()
```

- [ ] **Step 2: Run a smoke test (requires real Firebase credentials)**

If you have Firebase credentials available:
```bash
cd scraper && source .venv/bin/activate
export FIREBASE_CREDENTIALS='<paste service account JSON as single line>'
export FIREBASE_DATABASE_URL='https://<your-project-id>-default-rtdb.firebaseio.com'
python main.py
```

Expected: logs showing each player scraped and "Data written to Firebase successfully."

If credentials aren't available yet, skip this step and verify after Task 9 (Firebase setup).

- [ ] **Step 3: Commit**

```bash
git add scraper/main.py && git commit -m "feat: implement scraper orchestrator"
```

---

## Task 7: GitHub Actions — Scraper Workflow

**Files:**
- Create: `.github/workflows/scrape.yml`

- [ ] **Step 1: Create scraper workflow**

```bash
mkdir -p .github/workflows
```

Create `.github/workflows/scrape.yml`:
```yaml
name: Scrape LoL Stats

on:
  schedule:
    - cron: '*/30 * * * *'
  workflow_dispatch:

jobs:
  scrape:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: scraper

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
          cache-dependency-path: scraper/requirements.txt

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Run scraper
        env:
          FIREBASE_CREDENTIALS: ${{ secrets.FIREBASE_CREDENTIALS }}
          FIREBASE_DATABASE_URL: ${{ secrets.FIREBASE_DATABASE_URL }}
        run: python main.py
```

- [ ] **Step 2: Add required GitHub Secrets documentation**

Create `scraper/README.md`:
```markdown
# Scraper

Python script that scrapes leagueofgraphs.com and writes to Firebase Realtime Database.

## GitHub Secrets Required

Set these in your GitHub repo → Settings → Secrets and variables → Actions:

| Secret | Description |
|--------|-------------|
| `FIREBASE_CREDENTIALS` | Service account JSON as a single-line string |
| `FIREBASE_DATABASE_URL` | e.g. `https://your-project-default-rtdb.firebaseio.com` |

To get `FIREBASE_CREDENTIALS`: Firebase Console → Project Settings → Service Accounts → Generate new private key. Then minify the JSON to a single line.

## Local development

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export FIREBASE_CREDENTIALS='...'
export FIREBASE_DATABASE_URL='...'
python main.py
```
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/scrape.yml scraper/README.md && git commit -m "ci: add GitHub Actions scraper workflow"
```

---

## Task 8: Firebase Project Setup

**Files:**
- Create: `.firebaserc`
- Create: `firebase.json`
- Create: `frontend/.env.example`

> **Note:** This task requires you to have the Firebase CLI installed and a Firebase project created. Run `npm install -g firebase-tools` then `firebase login` if needed.

- [ ] **Step 1: Create a Firebase project**

Go to https://console.firebase.google.com → Add project → name it (e.g. `lol-tracker`).

Then enable:
- Realtime Database (Build → Realtime Database → Create Database → Start in test mode for now)
- Hosting (Build → Hosting → Get started)

Note your **project ID** and **database URL** (shown in the Realtime Database panel, looks like `https://lol-tracker-default-rtdb.firebaseio.com`).

- [ ] **Step 2: Configure Firebase Hosting**

```bash
firebase init hosting
```

When prompted:
- Select your project
- Public directory: `frontend/dist`
- Configure as single-page app: **yes**
- Set up automatic builds: **no**

This creates `.firebaserc` and `firebase.json`. Verify `firebase.json` looks like:
```json
{
  "hosting": {
    "public": "frontend/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{"source": "**", "destination": "/index.html"}]
  }
}
```

- [ ] **Step 3: Create frontend environment file**

Create `frontend/.env.example`:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Create `frontend/.env` (not committed — in .gitignore) with your real values from Firebase Console → Project Settings → General → Your apps → Web app config.

- [ ] **Step 4: Update .gitignore**

Ensure `frontend/.env` is gitignored. Add to the root `.gitignore` if not already there:
```
frontend/.env
```

- [ ] **Step 5: Commit**

```bash
git add .firebaserc firebase.json frontend/.env.example && git commit -m "chore: configure Firebase Hosting"
```

---

## Task 9: Frontend — Firebase Init + Data Hook

**Files:**
- Create: `frontend/src/firebase.js`
- Create: `frontend/src/hooks/useGameData.js`

- [ ] **Step 1: Create firebase.js**

Create `frontend/src/firebase.js`:
```js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
```

- [ ] **Step 2: Create useGameData hook**

```bash
mkdir -p frontend/src/hooks
```

Create `frontend/src/hooks/useGameData.js`:
```js
import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';

/**
 * Returns { players, group, loading, lastUpdated } from Firebase Realtime DB.
 * players: object keyed by player id
 * group: { totalWins, totalLosses, winRate, lastUpdated }
 */
export function useGameData() {
  const [players, setPlayers] = useState(null);
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const rootRef = ref(db, '/');
    const unsubscribe = onValue(rootRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setPlayers(data.players || {});
        setGroup(data.group || null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { players, group, loading };
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/firebase.js frontend/src/hooks/useGameData.js && git commit -m "feat: add Firebase init and useGameData hook"
```

---

## Task 10: Frontend — HeroStats Component

**Files:**
- Create: `frontend/src/components/HeroStats.jsx`

- [ ] **Step 1: Implement HeroStats**

Create `frontend/src/components/HeroStats.jsx`:
```jsx
export default function HeroStats({ group }) {
  if (!group) return null;

  const { totalWins, totalLosses, winRate } = group;
  const pct = Math.round(winRate * 100);
  const totalGames = totalWins + totalLosses;

  return (
    <div className="text-center py-12 px-4">
      <p className="text-gray-400 uppercase tracking-widest text-sm mb-2">Group Win Rate</p>
      <div className="text-8xl font-black mb-4" style={{ color: pct >= 50 ? '#22c55e' : '#ef4444' }}>
        {pct}%
      </div>
      <p className="text-gray-300 text-lg mb-6">
        <span className="text-green-400 font-semibold">{totalWins}W</span>
        <span className="text-gray-500 mx-2">/</span>
        <span className="text-red-400 font-semibold">{totalLosses}L</span>
        <span className="text-gray-500 ml-2">— {totalGames} games tracked</span>
      </p>

      {/* Win rate bar */}
      <div className="max-w-lg mx-auto bg-gray-700 rounded-full h-4 overflow-hidden">
        <div
          className="h-4 rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            backgroundColor: pct >= 50 ? '#22c55e' : '#ef4444',
          }}
        />
      </div>
      <p className="text-gray-500 text-xs mt-2">50% threshold</p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/HeroStats.jsx && git commit -m "feat: add HeroStats component"
```

---

## Task 11: Frontend — PlayerCard Component

**Files:**
- Create: `frontend/src/components/PlayerCard.jsx`

- [ ] **Step 1: Implement PlayerCard**

Create `frontend/src/components/PlayerCard.jsx`:
```jsx
import { useState } from 'react';

function WinDot({ result }) {
  return (
    <span
      className="inline-block w-4 h-4 rounded-full"
      style={{ backgroundColor: result === 'win' ? '#22c55e' : '#ef4444' }}
      title={result}
    />
  );
}

export default function PlayerCard({ playerId, player }) {
  const [expanded, setExpanded] = useState(false);
  const { displayName, games = [], stats = {} } = player;
  const { wins = 0, losses = 0, winRate = 0, avgKda = 0, avgCs = 0, mostPlayedChampion = '' } = stats;
  const pct = Math.round(winRate * 100);

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      {/* Card header */}
      <button
        className="w-full text-left p-4 hover:bg-gray-750 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-white text-lg">{displayName}</span>
          <span
            className="text-sm font-semibold px-2 py-1 rounded"
            style={{
              backgroundColor: pct >= 50 ? '#16532d' : '#7f1d1d',
              color: pct >= 50 ? '#4ade80' : '#fca5a5',
            }}
          >
            {pct}%
          </span>
        </div>

        {/* Win/loss dots */}
        <div className="flex gap-1 mb-3">
          {games.map((g, i) => (
            <WinDot key={i} result={g.result} />
          ))}
          {games.length === 0 && <span className="text-gray-500 text-xs">No ranked games</span>}
        </div>

        <div className="flex gap-4 text-sm text-gray-400">
          <span><span className="text-green-400">{wins}W</span> / <span className="text-red-400">{losses}L</span></span>
          <span>KDA: <span className="text-white">{avgKda}</span></span>
          <span>CS: <span className="text-white">{avgCs}</span></span>
          {mostPlayedChampion && <span>⚔ <span className="text-yellow-400">{mostPlayedChampion}</span></span>}
        </div>
      </button>

      {/* Expanded game table */}
      {expanded && games.length > 0 && (
        <div className="border-t border-gray-700 overflow-x-auto">
          <table className="w-full text-sm text-gray-300">
            <thead>
              <tr className="bg-gray-900 text-gray-500 text-xs uppercase">
                <th className="text-left px-4 py-2">Result</th>
                <th className="text-left px-4 py-2">Champion</th>
                <th className="text-center px-4 py-2">K/D/A</th>
                <th className="text-center px-4 py-2">CS</th>
                <th className="text-center px-4 py-2">Duration</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g, i) => (
                <tr key={i} className="border-t border-gray-700 hover:bg-gray-750">
                  <td className="px-4 py-2">
                    <span style={{ color: g.result === 'win' ? '#4ade80' : '#f87171' }}>
                      {g.result === 'win' ? 'Win' : 'Loss'}
                    </span>
                  </td>
                  <td className="px-4 py-2">{g.champion || '—'}</td>
                  <td className="px-4 py-2 text-center">
                    {g.kills}/{g.deaths}/{g.assists}
                  </td>
                  <td className="px-4 py-2 text-center">{g.cs}</td>
                  <td className="px-4 py-2 text-center text-gray-500">{g.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/PlayerCard.jsx && git commit -m "feat: add PlayerCard component"
```

---

## Task 12: Frontend — PlayerGrid and Leaderboard

**Files:**
- Create: `frontend/src/components/PlayerGrid.jsx`
- Create: `frontend/src/components/Leaderboard.jsx`

- [ ] **Step 1: Implement PlayerGrid**

Create `frontend/src/components/PlayerGrid.jsx`:
```jsx
import PlayerCard from './PlayerCard';

export default function PlayerGrid({ players }) {
  if (!players) return null;

  const entries = Object.entries(players);
  if (entries.length === 0) return <p className="text-gray-500 text-center">No player data yet.</p>;

  return (
    <section className="px-4 pb-8">
      <h2 className="text-gray-400 uppercase tracking-widest text-sm mb-4">Players</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {entries.map(([id, player]) => (
          <PlayerCard key={id} playerId={id} player={player} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Implement Leaderboard**

Create `frontend/src/components/Leaderboard.jsx`:
```jsx
export default function Leaderboard({ players }) {
  if (!players) return null;

  const sorted = Object.entries(players)
    .map(([id, p]) => ({ id, ...p }))
    .filter((p) => (p.stats?.wins ?? 0) + (p.stats?.losses ?? 0) > 0)
    .sort((a, b) => (b.stats?.winRate ?? 0) - (a.stats?.winRate ?? 0));

  if (sorted.length === 0) return null;

  const MEDAL = ['🥇', '🥈', '🥉'];

  return (
    <section className="px-4 pb-12">
      <h2 className="text-gray-400 uppercase tracking-widest text-sm mb-4">Leaderboard</h2>
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden max-w-lg">
        {sorted.map((p, i) => {
          const pct = Math.round((p.stats?.winRate ?? 0) * 100);
          return (
            <div
              key={p.id}
              className="flex items-center justify-between px-4 py-3 border-b border-gray-700 last:border-0"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg w-6 text-center">{MEDAL[i] ?? `${i + 1}.`}</span>
                <span className="font-semibold text-white">{p.displayName}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <span>
                  <span className="text-green-400">{p.stats?.wins ?? 0}W</span>
                  {' / '}
                  <span className="text-red-400">{p.stats?.losses ?? 0}L</span>
                </span>
                <span
                  className="font-bold"
                  style={{ color: pct >= 50 ? '#4ade80' : '#f87171' }}
                >
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/PlayerGrid.jsx frontend/src/components/Leaderboard.jsx && git commit -m "feat: add PlayerGrid and Leaderboard components"
```

---

## Task 13: Frontend — App Assembly

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/main.jsx`
- Modify: `frontend/index.html`

- [ ] **Step 1: Rewrite App.jsx**

Replace `frontend/src/App.jsx` with:
```jsx
import { useGameData } from './hooks/useGameData';
import HeroStats from './components/HeroStats';
import PlayerGrid from './components/PlayerGrid';
import Leaderboard from './components/Leaderboard';

function timeAgo(isoString) {
  if (!isoString) return 'unknown';
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff === 1) return '1 minute ago';
  return `${diff} minutes ago`;
}

export default function App() {
  const { players, group, loading } = useGameData();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400 text-lg animate-pulse">Loading stats...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-700 px-6 py-4">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-yellow-400">LOL</span> Group Tracker
        </h1>
      </header>

      {/* Hero */}
      <HeroStats group={group} />

      {/* Player grid */}
      <PlayerGrid players={players} />

      {/* Leaderboard */}
      <Leaderboard players={players} />

      {/* Footer */}
      <footer className="border-t border-gray-700 px-6 py-4 text-center text-gray-500 text-sm">
        Last updated: {timeAgo(group?.lastUpdated)} · Data from leagueofgraphs.com · Updates every 30 min
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Update main.jsx to import CSS**

Replace `frontend/src/main.jsx` with:
```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 3: Update index.html title**

In `frontend/index.html`, change the `<title>` tag to:
```html
<title>LOL Group Tracker</title>
```

- [ ] **Step 4: Run the dev server and verify visually**

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173` in your browser.

Expected: Dark page with "Loading stats..." while Firebase connects, then data renders. The site will show empty/zero stats until the scraper has run at least once. You can manually run `python scraper/main.py` (with Firebase credentials set) to populate data.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.jsx frontend/src/main.jsx frontend/index.html && git commit -m "feat: assemble frontend app"
```

---

## Task 14: GitHub Actions — Deploy Workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create deploy workflow**

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'
      - 'firebase.json'
      - '.firebaserc'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: frontend
        run: npm ci

      - name: Build
        working-directory: frontend
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_DATABASE_URL: ${{ secrets.VITE_FIREBASE_DATABASE_URL }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
        run: npm run build

      - name: Deploy to Firebase Hosting
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
          projectId: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
```

- [ ] **Step 2: Add remaining GitHub Secrets documentation**

Append to `scraper/README.md` (or create a root `SETUP.md`):

The deploy workflow needs these additional GitHub secrets:

| Secret | Description |
|--------|-------------|
| `VITE_FIREBASE_API_KEY` | From Firebase Console → Project Settings → Web app |
| `VITE_FIREBASE_AUTH_DOMAIN` | e.g. `your-project.firebaseapp.com` |
| `VITE_FIREBASE_DATABASE_URL` | e.g. `https://your-project-default-rtdb.firebaseio.com` |
| `VITE_FIREBASE_PROJECT_ID` | Your Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | e.g. `your-project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | From Firebase web app config |
| `VITE_FIREBASE_APP_ID` | From Firebase web app config |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service account JSON (for Hosting deploy) |

- [ ] **Step 3: Commit and push to trigger first deploy**

```bash
git add .github/workflows/deploy.yml && git commit -m "ci: add Firebase Hosting deploy workflow"
git push origin main
```

Expected: GitHub Actions runs the deploy workflow, frontend is live at `https://<project-id>.web.app`.

---

## Task 15: Final Verification

- [ ] **Step 1: Run all scraper tests**

```bash
cd scraper && source .venv/bin/activate && python -m pytest tests/ -v
```

Expected: all tests pass.

- [ ] **Step 2: Build frontend and check for errors**

```bash
cd frontend && npm run build
```

Expected: `dist/` folder created, no build errors.

- [ ] **Step 3: Manually trigger scraper**

In GitHub → Actions → "Scrape LoL Stats" → Run workflow.

Expected: workflow completes, Firebase database populated with real data.

- [ ] **Step 4: Verify live site**

Open `https://<project-id>.web.app`.

Expected:
- Hero section shows combined win rate
- All 11 player cards visible with colored dots
- Leaderboard shows players ranked by win rate
- Footer shows "Last updated: X minutes ago"
- Clicking a player card expands to show game table

- [ ] **Step 5: Tag release**

```bash
git tag v1.0.0 && git push origin v1.0.0
```
