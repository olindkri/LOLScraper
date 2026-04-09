# Manual Fetch Button & Cloud Functions Scraper — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the GitHub Actions cron scraper with two Firebase Cloud Functions (a full scheduled scrape every 20 minutes and a fast incremental callable triggered by a new UI button), and add a `FetchButton` component to the header that lets users manually pull fresh game data within ~30 seconds.

**Architecture:** `scheduledFetch` is a direct port of `scraper/main.py` running on Cloud Scheduler. `quickFetch` is an HTTPS callable that fetches only page 1 per player in parallel, diffs against existing Firebase data, and writes only new games. The frontend `FetchButton` calls `quickFetch` via the Firebase Functions SDK and drives its cooldown display from a `/metadata/lastManualFetch` realtime listener.

**Tech Stack:** Python 3.11, `firebase-functions` (gen 2), `firebase-admin`, `beautifulsoup4`, `requests`, React 19, Firebase JS SDK 12 (`firebase/functions`)

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `functions/requirements.txt` | Python deps for Cloud Functions |
| Create | `functions/main.py` | Both Cloud Functions |
| Create | `functions/scraper/__init__.py` | Package marker |
| Create | `functions/scraper/players.py` | Copy of `scraper/players.py` |
| Create | `functions/scraper/scrape.py` | Copy of `scraper/scrape.py` |
| Create | `functions/scraper/stats.py` | Copy of `scraper/stats.py` |
| Create | `functions/scraper/records.py` | Copy of `scraper/records.py` |
| Create | `functions/scraper/match_scraper.py` | Copy of `scraper/match_scraper.py` |
| Create | `functions/scraper/firebase_client.py` | Copy of `scraper/firebase_client.py` + new helpers |
| Create | `functions/tests/__init__.py` | Package marker |
| Create | `functions/tests/test_quick_fetch.py` | Tests for diff + cooldown logic |
| Modify | `firebase.json` | Add `functions` block |
| Modify | `.github/workflows/scraper.yml` | Remove cron trigger |
| Modify | `frontend/src/firebase.js` | Export `functions` instance |
| Create | `frontend/src/hooks/useQuickFetch.js` | Firebase listener + callable trigger |
| Create | `frontend/src/components/FetchButton.jsx` | Button with idle/loading/success/cooldown states |
| Modify | `frontend/src/App.jsx` | Render `FetchButton` next to timestamp |

---

## Task 1: Scaffold `functions/` directory

**Files:**
- Create: `functions/requirements.txt`
- Create: `functions/scraper/__init__.py`
- Create: `functions/scraper/players.py`
- Create: `functions/scraper/scrape.py`
- Create: `functions/scraper/stats.py`
- Create: `functions/scraper/records.py`
- Create: `functions/scraper/match_scraper.py`
- Create: `functions/tests/__init__.py`

- [ ] **Step 1: Create `functions/requirements.txt`**

```
firebase-functions>=0.1.0
firebase-admin==6.4.0
requests==2.31.0
beautifulsoup4==4.12.3
lxml==5.3.0
pytest==8.3.5
```

- [ ] **Step 2: Copy scraper modules into `functions/scraper/`**

```bash
mkdir -p functions/scraper functions/tests
touch functions/scraper/__init__.py functions/tests/__init__.py
cp scraper/players.py functions/scraper/players.py
cp scraper/scrape.py functions/scraper/scrape.py
cp scraper/stats.py functions/scraper/stats.py
cp scraper/records.py functions/scraper/records.py
cp scraper/match_scraper.py functions/scraper/match_scraper.py
```

- [ ] **Step 3: Commit**

```bash
git add functions/
git commit -m "chore: scaffold functions/ directory with scraper module copies"
```

---

## Task 2: Write `functions/scraper/firebase_client.py`

This is a modified copy of `scraper/firebase_client.py`. It adds new read/write helpers needed by `quickFetch` and changes `_init_app` to use Application Default Credentials (ADC) when `FIREBASE_CREDENTIALS` is not set — Cloud Functions on GCP provides ADC automatically, so only `FIREBASE_DATABASE_URL` needs to be set as a secret.

**Files:**
- Create: `functions/scraper/firebase_client.py`

- [ ] **Step 1: Create `functions/scraper/firebase_client.py`**

```python
import json
import os
from datetime import datetime, timezone

import firebase_admin
from firebase_admin import credentials, db

_app = None


def _init_app(database_url: str) -> None:
    global _app
    if _app is not None:
        return
    cred_env = os.environ.get("FIREBASE_CREDENTIALS")
    if cred_env:
        cred_json = json.loads(cred_env)
        cred = credentials.Certificate(cred_json)
        _app = firebase_admin.initialize_app(cred, {"databaseURL": database_url})
    else:
        # Application Default Credentials — used when running on Google Cloud
        _app = firebase_admin.initialize_app(options={"databaseURL": database_url})


def build_payload(players: list[dict], group: dict) -> dict:
    players_data = {}
    for p in players:
        players_data[p["id"]] = {
            "displayName": p["displayName"],
            "gamertag": p["gamertag"],
            "profileUrl": p["url"],
            "games": p["games"],
            "stats": p["stats"],
            "soloRank": p.get("soloRank"),
        }
    return {"players": players_data, "group": group}


def write_to_firebase(players: list[dict], group: dict, database_url: str) -> None:
    _init_app(database_url)
    payload = build_payload(players, group)
    db.reference("/").update(payload)


def read_records(database_url: str) -> dict:
    _init_app(database_url)
    data = db.reference("/records").get()
    return data if data is not None else {}


def write_records(records: dict, database_url: str) -> None:
    _init_app(database_url)
    db.reference("/records").set(records)


def read_cached_match_ids(database_url: str) -> set:
    _init_app(database_url)
    data = db.reference("/matches").get()
    if not data:
        return set()
    return set(data.keys())


def write_match(match_data: dict, database_url: str) -> None:
    _init_app(database_url)
    match_id = match_data["matchId"]
    db.reference(f"/matches/{match_id}").set(match_data)


# ── New helpers for quickFetch ──────────────────────────────────────────────

def read_player_games(player_id: str, database_url: str) -> list:
    _init_app(database_url)
    data = db.reference(f"/players/{player_id}/games").get()
    return data if data is not None else []


def read_player_stats(player_id: str, database_url: str) -> dict | None:
    _init_app(database_url)
    return db.reference(f"/players/{player_id}/stats").get()


def patch_player(player_id: str, data: dict, database_url: str) -> None:
    _init_app(database_url)
    db.reference(f"/players/{player_id}").update(data)


def write_group(group: dict, database_url: str) -> None:
    _init_app(database_url)
    db.reference("/group").set(group)


def read_manual_fetch_time(database_url: str) -> str | None:
    _init_app(database_url)
    return db.reference("/metadata/lastManualFetch").get()


def write_manual_fetch_time(database_url: str) -> None:
    _init_app(database_url)
    ts = datetime.now(timezone.utc).isoformat()
    db.reference("/metadata/lastManualFetch").set(ts)
```

- [ ] **Step 2: Commit**

```bash
git add functions/scraper/firebase_client.py
git commit -m "feat: add firebase_client copy with quickFetch helpers for Cloud Functions"
```

---

## Task 3: TDD — `find_new_games` helper

This pure function is the core diff logic in `quickFetch`. Write the test first, then implement it in `functions/main.py`.

**Files:**
- Create: `functions/tests/test_quick_fetch.py`
- Create: `functions/main.py` (initial skeleton with helper only)

- [ ] **Step 1: Write failing tests in `functions/tests/test_quick_fetch.py`**

```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import find_new_games


def _game(match_id, result="win"):
    return {"matchId": match_id, "result": result, "champion": "Ahri",
            "kills": 5, "deaths": 2, "assists": 7, "cs": 180,
            "duration": "30min", "queue": "Ranked Solo/Duo", "lpDelta": 18}


def test_all_new_when_existing_is_empty():
    page1 = [_game("1"), _game("2"), _game("3")]
    assert find_new_games(page1, []) == page1


def test_no_new_when_all_already_in_firebase():
    page1 = [_game("1"), _game("2")]
    existing = [_game("1"), _game("2"), _game("3")]
    assert find_new_games(page1, existing) == []


def test_returns_only_games_not_in_existing():
    page1 = [_game("3"), _game("4"), _game("1")]
    existing = [_game("1"), _game("2")]
    result = find_new_games(page1, existing)
    assert len(result) == 2
    assert {g["matchId"] for g in result} == {"3", "4"}


def test_games_without_match_id_are_excluded():
    page1 = [{"matchId": None, "result": "win"}, _game("5")]
    assert find_new_games(page1, []) == [_game("5")]


def test_preserves_order_of_page1():
    page1 = [_game("10"), _game("11"), _game("12")]
    result = find_new_games(page1, [])
    assert [g["matchId"] for g in result] == ["10", "11", "12"]
```

- [ ] **Step 2: Run tests — expect ImportError since `main.py` doesn't exist yet**

```bash
cd functions && python -m pytest tests/test_quick_fetch.py -v
```

Expected: `ModuleNotFoundError: No module named 'main'`

- [ ] **Step 3: Create `functions/main.py` with just the helper**

```python
import os
import time
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

DATABASE_URL = os.environ.get("FIREBASE_DATABASE_URL", "")
COOLDOWN_SECONDS = 300  # 5 minutes


def find_new_games(page1_games: list[dict], existing_games: list[dict]) -> list[dict]:
    """Return games from page1_games whose matchId is not already in existing_games."""
    existing_ids = {g["matchId"] for g in existing_games if g.get("matchId")}
    return [g for g in page1_games if g.get("matchId") and g["matchId"] not in existing_ids]
```

- [ ] **Step 4: Run tests — expect all to pass**

```bash
cd functions && python -m pytest tests/test_quick_fetch.py -v
```

Expected output:
```
tests/test_quick_fetch.py::test_all_new_when_existing_is_empty PASSED
tests/test_quick_fetch.py::test_no_new_when_all_already_in_firebase PASSED
tests/test_quick_fetch.py::test_returns_only_games_not_in_existing PASSED
tests/test_quick_fetch.py::test_games_without_match_id_are_excluded PASSED
tests/test_quick_fetch.py::test_preserves_order_of_page1 PASSED
5 passed
```

- [ ] **Step 5: Commit**

```bash
cd ..
git add functions/main.py functions/tests/test_quick_fetch.py
git commit -m "feat: add find_new_games helper with tests"
```

---

## Task 4: Write `scheduledFetch` in `functions/main.py`

Port of `scraper/main.py` as a Cloud Scheduler function. Logic is identical — no changes to the scraper behaviour.

**Files:**
- Modify: `functions/main.py`

- [ ] **Step 1: Append `scheduledFetch` to `functions/main.py`**

Add these imports at the top of `functions/main.py` (after the existing imports):

```python
from firebase_functions import https_fn, scheduler
from firebase_functions.options import MemoryOption

from scraper.players import PLAYERS
from scraper.scrape import fetch_games_for_player
from scraper.stats import compute_player_stats, compute_group_stats
from scraper.records import update_records
from scraper.match_scraper import scrape_match
from scraper.firebase_client import (
    _init_app,
    write_to_firebase,
    read_records,
    write_records,
    read_cached_match_ids,
    write_match,
    read_player_games,
    read_player_stats,
    patch_player,
    write_group,
    read_manual_fetch_time,
    write_manual_fetch_time,
)
```

Then append this function:

```python
@scheduler.schedule(
    schedule="every 20 minutes",
    memory=MemoryOption.MB_512,
    timeout_sec=300,
    secrets=["FIREBASE_DATABASE_URL"],
)
def scheduled_fetch(event: scheduler.ScheduledEvent) -> None:
    """Full scrape — identical to scraper/main.py."""
    db_url = os.environ.get("FIREBASE_DATABASE_URL", "")
    _init_app(db_url)

    all_player_data = []
    for player in PLAYERS:
        log.info(f"Scraping {player['displayName']} ({player['url']})")
        try:
            games, rank, mastery = fetch_games_for_player(player["url"], target=30)
            stats = compute_player_stats(games)
            mastery_pts = mastery.get(stats["mostPlayedChampion"])
            if mastery_pts is not None:
                stats["mostPlayedChampionMastery"] = mastery_pts
            all_player_data.append({
                **player,
                "games": games,
                "stats": stats,
                "soloRank": rank,
            })
            rank_str = (
                " ".join(p for p in [rank["tier"], rank["division"], f"{rank['lp']} LP"] if p)
                if rank else "unranked"
            )
            log.info(f"  → {len(games)} games, {stats['wins']}W {stats['losses']}L, {rank_str}")
        except Exception as e:
            log.warning(f"  → Failed to scrape {player['displayName']}: {e}")
            all_player_data.append({
                **player,
                "games": [],
                "stats": compute_player_stats([]),
                "soloRank": None,
            })
        time.sleep(1)

    group = compute_group_stats([p["stats"] for p in all_player_data])
    log.info(f"Group: {group['totalWins']}W {group['totalLosses']}L ({group['winRate']:.1%})")
    write_to_firebase(all_player_data, group, db_url)

    existing_records = read_records(db_url)
    new_records = update_records(all_player_data, existing_records)
    if new_records is not None:
        write_records(new_records, db_url)

    all_match_ids = {
        g["matchId"]
        for p in all_player_data
        for g in p["games"]
        if g.get("matchId")
    }
    cached_ids = read_cached_match_ids(db_url)
    new_ids = sorted(all_match_ids - cached_ids)[:30]
    log.info(f"Fetching {len(new_ids)} new match details.")
    for match_id in new_ids:
        try:
            match_data = scrape_match(match_id)
            write_match(match_data, db_url)
        except Exception as e:
            log.warning(f"  → Failed to fetch match {match_id}: {e}")
        time.sleep(0.5)
```

- [ ] **Step 2: Verify existing tests still pass**

```bash
cd functions && python -m pytest tests/test_quick_fetch.py -v
```

Expected: 5 passed

- [ ] **Step 3: Commit**

```bash
cd ..
git add functions/main.py
git commit -m "feat: add scheduledFetch Cloud Function (port of main.py)"
```

---

## Task 5: Write `quickFetch` in `functions/main.py`

**Files:**
- Modify: `functions/main.py`
- Modify: `functions/tests/test_quick_fetch.py`

- [ ] **Step 1: Add cooldown tests to `functions/tests/test_quick_fetch.py`**

Append to the existing test file:

```python
from datetime import datetime, timezone, timedelta
from main import _seconds_since, COOLDOWN_SECONDS


def test_seconds_since_recent_timestamp():
    ts = (datetime.now(timezone.utc) - timedelta(seconds=120)).isoformat()
    result = _seconds_since(ts)
    assert 119 <= result <= 121


def test_seconds_since_old_timestamp():
    ts = (datetime.now(timezone.utc) - timedelta(seconds=400)).isoformat()
    assert _seconds_since(ts) >= 400


def test_seconds_since_none_returns_large_number():
    assert _seconds_since(None) >= COOLDOWN_SECONDS
```

- [ ] **Step 2: Run tests — expect failures for `_seconds_since`**

```bash
cd functions && python -m pytest tests/test_quick_fetch.py -v
```

Expected: 3 failures (`ImportError: cannot import name '_seconds_since'`)

- [ ] **Step 3: Add `_seconds_since` helper and `quickFetch` to `functions/main.py`**

Append to `functions/main.py`:

```python
def _seconds_since(iso_timestamp: str | None) -> float:
    """Return seconds elapsed since the given ISO timestamp, or a large value if None."""
    if iso_timestamp is None:
        return float("inf")
    then = datetime.fromisoformat(iso_timestamp)
    return (datetime.now(timezone.utc) - then).total_seconds()


@https_fn.on_call(
    timeout_sec=60,
    memory=MemoryOption.MB_512,
    secrets=["FIREBASE_DATABASE_URL"],
)
def quick_fetch(req: https_fn.CallableRequest) -> dict:
    """Incremental fetch: page 1 per player in parallel, writes only new games."""
    db_url = os.environ.get("FIREBASE_DATABASE_URL", "")
    _init_app(db_url)

    # Enforce cooldown
    last_fetch_ts = read_manual_fetch_time(db_url)
    elapsed = _seconds_since(last_fetch_ts)
    remaining = int(COOLDOWN_SECONDS - elapsed)
    if remaining > 0:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.RESOURCE_EXHAUSTED,
            message="cooldown",
            details={"cooldownSeconds": remaining},
        )

    # Fetch page 1 per player in parallel
    def fetch_player(player):
        try:
            games, rank, mastery = fetch_games_for_player(player["url"], target=10)
            return {"player": player, "games": games, "rank": rank, "mastery": mastery}
        except Exception as e:
            log.warning(f"quickFetch: failed to scrape {player['displayName']}: {e}")
            return {"player": player, "games": [], "rank": None, "mastery": {}}

    with ThreadPoolExecutor(max_workers=len(PLAYERS)) as executor:
        results = list(executor.map(fetch_player, PLAYERS))

    total_new = 0
    updated_player_data = []  # for records check
    all_stats = {}

    for result in results:
        player = result["player"]
        pid = player["id"]

        existing_games = read_player_games(pid, db_url)
        new_games = find_new_games(result["games"], existing_games)

        if new_games:
            merged = new_games + existing_games
            stats = compute_player_stats(merged)
            mastery_pts = result["mastery"].get(stats["mostPlayedChampion"])
            if mastery_pts is not None:
                stats["mostPlayedChampionMastery"] = mastery_pts

            patch_player(pid, {
                "games": merged,
                "stats": stats,
                "soloRank": result["rank"],
            }, db_url)

            all_stats[pid] = stats
            total_new += len(new_games)
            updated_player_data.append({**player, "games": merged, "stats": stats})
            log.info(f"quickFetch: {player['displayName']} +{len(new_games)} new games")
        else:
            existing_stats = read_player_stats(pid, db_url)
            if existing_stats:
                all_stats[pid] = existing_stats

    group = compute_group_stats(list(all_stats.values()))
    write_group(group, db_url)

    if updated_player_data:
        existing_records = read_records(db_url)
        new_records = update_records(updated_player_data, existing_records)
        if new_records is not None:
            write_records(new_records, db_url)

    write_manual_fetch_time(db_url)
    log.info(f"quickFetch complete: {total_new} new games total.")
    return {"newGames": total_new}
```

- [ ] **Step 4: Run all tests**

```bash
cd functions && python -m pytest tests/test_quick_fetch.py -v
```

Expected:
```
tests/test_quick_fetch.py::test_all_new_when_existing_is_empty PASSED
tests/test_quick_fetch.py::test_no_new_when_all_already_in_firebase PASSED
tests/test_quick_fetch.py::test_returns_only_games_not_in_existing PASSED
tests/test_quick_fetch.py::test_games_without_match_id_are_excluded PASSED
tests/test_quick_fetch.py::test_preserves_order_of_page1 PASSED
tests/test_quick_fetch.py::test_seconds_since_recent_timestamp PASSED
tests/test_quick_fetch.py::test_seconds_since_old_timestamp PASSED
tests/test_quick_fetch.py::test_seconds_since_none_returns_large_number PASSED
8 passed
```

- [ ] **Step 5: Commit**

```bash
cd ..
git add functions/main.py functions/tests/test_quick_fetch.py
git commit -m "feat: add quickFetch Cloud Function with cooldown enforcement"
```

---

## Task 6: Update `firebase.json` and disable GH Actions cron

**Files:**
- Modify: `firebase.json`
- Modify: `.github/workflows/scraper.yml`

- [ ] **Step 1: Update `firebase.json`**

Replace the entire file contents with:

```json
{
  "hosting": {
    "public": "frontend/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{"source": "**", "destination": "/index.html"}]
  },
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "ignore": ["venv", ".git", "*.pyc", "__pycache__", "tests/**"]
    }
  ]
}
```

- [ ] **Step 2: Remove the cron trigger from `.github/workflows/scraper.yml`**

Change the `on:` block from:

```yaml
on:
  schedule:
    - cron: '*/20 * * * *'
  workflow_dispatch:
```

To:

```yaml
on:
  workflow_dispatch:
```

Leave every other line in the file unchanged.

- [ ] **Step 3: Commit**

```bash
git add firebase.json .github/workflows/scraper.yml
git commit -m "chore: configure Cloud Functions in firebase.json, disable GH Actions cron"
```

---

## Task 7: Deploy Cloud Functions + set secret

You will need the Firebase CLI installed (`npm install -g firebase-tools`) and to be logged in (`firebase login`).

The `FIREBASE_DATABASE_URL` value is in `frontend/.env` as `VITE_FIREBASE_DATABASE_URL`.

- [ ] **Step 1: Set the secret**

```bash
firebase functions:secrets:set FIREBASE_DATABASE_URL
```

When prompted, enter the database URL from `frontend/.env` (the value of `VITE_FIREBASE_DATABASE_URL`).

- [ ] **Step 2: Install Python deps locally to verify there are no import errors**

```bash
cd functions
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -c "import main; print('OK')"
deactivate
cd ..
```

Expected: `OK`

- [ ] **Step 3: Deploy functions**

```bash
firebase deploy --only functions
```

Expected output ends with:
```
✔  functions: Finished running predeploy script.
✔  functions[scheduled_fetch]: Successful create operation.
✔  functions[quick_fetch]: Successful create operation.
✔  Deploy complete!
```

- [ ] **Step 4: Verify `scheduledFetch` by triggering it manually in the GCP console**

Open: https://console.cloud.google.com/functions — find `scheduled_fetch` → Actions → Test function → Run. Check the logs for `Data written to Firebase successfully.`

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: deploy Cloud Functions (scheduledFetch + quickFetch)"
```

---

## Task 8: Update `frontend/src/firebase.js`

Export the Firebase Functions instance so the hook can call `httpsCallable`.

**Files:**
- Modify: `frontend/src/firebase.js`

- [ ] **Step 1: Update `frontend/src/firebase.js`**

```javascript
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getFunctions } from 'firebase/functions';

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
export const functions = getFunctions(app);
```

- [ ] **Step 2: Verify the dev server still starts**

```bash
cd frontend && npm run dev
```

Expected: Vite dev server starts with no errors. `ctrl+c` to stop.

- [ ] **Step 3: Commit**

```bash
cd ..
git add frontend/src/firebase.js
git commit -m "feat: export Firebase Functions instance from firebase.js"
```

---

## Task 9: Write `useQuickFetch` hook

**Files:**
- Create: `frontend/src/hooks/useQuickFetch.js`

- [ ] **Step 1: Create `frontend/src/hooks/useQuickFetch.js`**

```javascript
import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';

const COOLDOWN_SECONDS = 300;
const callQuickFetch = httpsCallable(functions, 'quick_fetch');

export function useQuickFetch() {
  const [lastFetch, setLastFetch] = useState(undefined); // undefined = not yet loaded
  const [fetching, setFetching] = useState(false);
  const [successCount, setSuccessCount] = useState(null); // null = not in success state

  useEffect(() => {
    const metaRef = ref(db, '/metadata/lastManualFetch');
    return onValue(metaRef, (snap) => setLastFetch(snap.val() ?? null));
  }, []);

  async function trigger() {
    if (fetching || successCount !== null) return;
    setFetching(true);
    try {
      const result = await callQuickFetch();
      setSuccessCount(result.data.newGames);
      setTimeout(() => setSuccessCount(null), 3000);
    } catch {
      // Cooldown error from server: the Firebase listener will update lastFetch,
      // which will show the countdown automatically. Nothing to do here.
    } finally {
      setFetching(false);
    }
  }

  return { lastFetch, fetching, successCount, trigger, COOLDOWN_SECONDS };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useQuickFetch.js
git commit -m "feat: add useQuickFetch hook"
```

---

## Task 10: Write `FetchButton` component

**Files:**
- Create: `frontend/src/components/FetchButton.jsx`

- [ ] **Step 1: Create `frontend/src/components/FetchButton.jsx`**

```jsx
import { useState, useEffect } from 'react';
import { useQuickFetch } from '../hooks/useQuickFetch';

function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `↻ ${m}:${String(s).padStart(2, '0')}`;
}

export default function FetchButton() {
  const { lastFetch, fetching, successCount, trigger, COOLDOWN_SECONDS } = useQuickFetch();
  const [, forceUpdate] = useState(0);

  // Re-render every second so the countdown display stays live
  useEffect(() => {
    const id = setInterval(() => forceUpdate(n => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const cooldownSeconds = lastFetch
    ? Math.max(0, COOLDOWN_SECONDS - Math.floor((Date.now() - new Date(lastFetch).getTime()) / 1000))
    : 0;

  const inCooldown = !fetching && successCount === null && cooldownSeconds > 0;
  const disabled = fetching || successCount !== null || inCooldown || lastFetch === undefined;

  let label;
  if (fetching) label = 'Fetching...';
  else if (successCount !== null) label = successCount > 0 ? `+${successCount} new` : 'up to date';
  else if (inCooldown) label = formatCountdown(cooldownSeconds);
  else label = '↻ Fetch';

  const isSuccess = successCount !== null;

  return (
    <button
      onClick={trigger}
      disabled={disabled}
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.65rem',
        color: isSuccess ? 'var(--win)' : disabled ? 'var(--fg-dim)' : 'var(--fg-muted)',
        background: 'none',
        border: '1px solid',
        borderColor: isSuccess ? 'var(--win)' : 'var(--border)',
        borderRadius: '3px',
        padding: '2px 8px',
        cursor: disabled ? 'default' : 'pointer',
        letterSpacing: '0.05em',
        transition: 'color 150ms, border-color 150ms',
        animation: fetching ? 'pulse 1.5s ease-in-out infinite' : 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/FetchButton.jsx
git commit -m "feat: add FetchButton component with idle/loading/success/cooldown states"
```

---

## Task 11: Wire `FetchButton` into `App.jsx` and deploy

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Add the import at the top of `App.jsx`**

Add this import after the existing imports:

```javascript
import FetchButton from './components/FetchButton';
```

- [ ] **Step 2: Replace the timestamp block in `App.jsx`**

Find this block (lines 125–130):

```jsx
        {/* Updated timestamp */}
        {group?.lastUpdated && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--fg-dim)', paddingLeft: '16px', alignSelf: 'center' }}>
            {timeAgo(group.lastUpdated)}
          </div>
        )}
```

Replace with:

```jsx
        {/* Updated timestamp + fetch button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '16px' }}>
          {group?.lastUpdated && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--fg-dim)' }}>
              {timeAgo(group.lastUpdated)}
            </span>
          )}
          <FetchButton />
        </div>
```

- [ ] **Step 3: Verify in the browser**

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173`. Confirm:
- Header shows `[Xm ago] [↻ Fetch]`
- Clicking `↻ Fetch` shows `Fetching...` then either `+N new` or `up to date`
- After 3 seconds it returns to idle or cooldown countdown
- Button is disabled during cooldown and shows `↻ M:SS`

`ctrl+c` to stop.

- [ ] **Step 4: Build and deploy frontend**

```bash
npm run build && cd .. && firebase deploy --only hosting
```

Expected:
```
✔  hosting: File upload complete.
✔  Deploy complete!
Hosting URL: https://lol-group-tracker.web.app
```

- [ ] **Step 5: Smoke test on production**

Open `https://lol-group-tracker.web.app`. Click `↻ Fetch`. Confirm data updates within ~30 seconds.

- [ ] **Step 6: Commit**

```bash
cd ..
git add frontend/src/App.jsx frontend/src/components/FetchButton.jsx
git commit -m "feat: wire FetchButton into App header"
```

---

## Final checklist

- [ ] `functions/` deploys cleanly via `firebase deploy --only functions`
- [ ] `scheduledFetch` runs every 20 min (verify in GCP Cloud Scheduler console)
- [ ] `quickFetch` responds in < 30s when clicked
- [ ] 5-minute cooldown is enforced on the server
- [ ] Cooldown countdown displays correctly and resets after the window
- [ ] GitHub Actions `scraper.yml` no longer has a cron trigger
- [ ] Firebase billing alert set at $10/month (Firebase console → Project Settings → Usage and billing → Budget alerts)
