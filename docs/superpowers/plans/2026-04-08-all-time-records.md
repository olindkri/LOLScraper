# All-Time Records Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist and display all-time best win streak and best 30-game KDA records in Firebase, shown as trophy cards in the site header.

**Architecture:** The scraper reads `/records` from Firebase before each run, computes each player's current win streak and KDA, updates `/records` only when beaten, and writes back. The frontend reads `/records` from the root listener and renders a `RecordBanner` component inside the header.

**Tech Stack:** Python (scraper), Firebase Realtime DB, React + Vite (frontend), Tailwind/inline styles

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `scraper/records.py` | `compute_win_streak`, `update_records` |
| Create | `scraper/tests/test_records.py` | Tests for records logic |
| Modify | `scraper/firebase_client.py` | Add `read_records`, `write_records` |
| Modify | `scraper/main.py` | Wire records read/update/write into run loop |
| Modify | `frontend/src/hooks/useGameData.js` | Expose `records` from Firebase root |
| Create | `frontend/src/components/RecordBanner.jsx` | Trophy card UI component |
| Modify | `frontend/src/App.jsx` | Render `RecordBanner` in header |

---

## Task 1: `records.py` — core logic with TDD

**Files:**
- Create: `scraper/records.py`
- Create: `scraper/tests/test_records.py`

- [ ] **Step 1: Write failing tests**

Create `scraper/tests/test_records.py`:

```python
from records import compute_win_streak, update_records


# ── compute_win_streak ──────────────────────────────────────────────────────

def test_win_streak_all_wins():
    games = [{"result": "win"}] * 5
    assert compute_win_streak(games) == 5


def test_win_streak_starts_with_loss():
    games = [{"result": "loss"}, {"result": "win"}, {"result": "win"}]
    assert compute_win_streak(games) == 0


def test_win_streak_mixed():
    games = [
        {"result": "win"},
        {"result": "win"},
        {"result": "win"},
        {"result": "loss"},
        {"result": "win"},
    ]
    assert compute_win_streak(games) == 3


def test_win_streak_empty():
    assert compute_win_streak([]) == 0


def test_win_streak_single_win():
    assert compute_win_streak([{"result": "win"}]) == 1


def test_win_streak_single_loss():
    assert compute_win_streak([{"result": "loss"}]) == 0


# ── update_records ──────────────────────────────────────────────────────────

PLAYER_A = {
    "id": "oliver",
    "displayName": "Oliver",
    "games": [{"result": "win"}] * 8,
    "stats": {"avgKda": 5.5},
}

PLAYER_B = {
    "id": "eirik",
    "displayName": "Eirik",
    "games": [{"result": "win"}] * 4 + [{"result": "loss"}],
    "stats": {"avgKda": 3.2},
}


def test_update_records_first_run_no_existing():
    result = update_records([PLAYER_A, PLAYER_B], {})
    assert result["bestWinStreak"]["playerId"] == "oliver"
    assert result["bestWinStreak"]["value"] == 8
    assert result["bestKda"]["playerId"] == "oliver"
    assert result["bestKda"]["value"] == 5.5


def test_update_records_beats_existing_streak():
    existing = {
        "bestWinStreak": {"playerId": "eirik", "displayName": "Eirik", "value": 6, "achievedAt": "2026-01-01T00:00:00Z"},
        "bestKda": {"playerId": "eirik", "displayName": "Eirik", "value": 9.0, "achievedAt": "2026-01-01T00:00:00Z"},
    }
    result = update_records([PLAYER_A, PLAYER_B], existing)
    assert result["bestWinStreak"]["playerId"] == "oliver"
    assert result["bestWinStreak"]["value"] == 8
    # KDA not beaten — existing preserved
    assert result["bestKda"]["value"] == 9.0


def test_update_records_no_change_returns_existing():
    existing = {
        "bestWinStreak": {"playerId": "oliver", "displayName": "Oliver", "value": 20, "achievedAt": "2026-01-01T00:00:00Z"},
        "bestKda": {"playerId": "oliver", "displayName": "Oliver", "value": 99.0, "achievedAt": "2026-01-01T00:00:00Z"},
    }
    result = update_records([PLAYER_A, PLAYER_B], existing)
    assert result is None


def test_update_records_tie_does_not_replace():
    existing = {
        "bestWinStreak": {"playerId": "eirik", "displayName": "Eirik", "value": 8, "achievedAt": "2026-01-01T00:00:00Z"},
        "bestKda": {"playerId": "eirik", "displayName": "Eirik", "value": 5.5, "achievedAt": "2026-01-01T00:00:00Z"},
    }
    result = update_records([PLAYER_A, PLAYER_B], existing)
    assert result is None


def test_update_records_skips_empty_games():
    empty_player = {"id": "ghost", "displayName": "Ghost", "games": [], "stats": {"avgKda": 0.0}}
    existing = {
        "bestWinStreak": {"playerId": "oliver", "displayName": "Oliver", "value": 8, "achievedAt": "2026-01-01T00:00:00Z"},
        "bestKda": {"playerId": "oliver", "displayName": "Oliver", "value": 5.5, "achievedAt": "2026-01-01T00:00:00Z"},
    }
    result = update_records([empty_player], existing)
    assert result is None
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd scraper && .venv/bin/pytest tests/test_records.py -v
```
Expected: `ModuleNotFoundError: No module named 'records'`

- [ ] **Step 3: Implement `scraper/records.py`**

```python
from datetime import datetime, timezone


def compute_win_streak(games: list[dict]) -> int:
    streak = 0
    for game in games:
        if game["result"] == "win":
            streak += 1
        else:
            break
    return streak


def update_records(all_player_data: list[dict], existing: dict) -> dict | None:
    best_streak_value = existing.get("bestWinStreak", {}).get("value", -1)
    best_kda_value = existing.get("bestKda", {}).get("value", -1)

    new_streak = dict(existing.get("bestWinStreak", {}))
    new_kda = dict(existing.get("bestKda", {}))

    streak_beaten = False
    kda_beaten = False

    for p in all_player_data:
        if not p.get("games"):
            continue

        streak = compute_win_streak(p["games"])
        kda = p["stats"]["avgKda"]

        if streak > best_streak_value:
            best_streak_value = streak
            new_streak = {
                "playerId": p["id"],
                "displayName": p["displayName"],
                "value": streak,
                "achievedAt": _now(),
            }
            streak_beaten = True

        if kda > best_kda_value:
            best_kda_value = kda
            new_kda = {
                "playerId": p["id"],
                "displayName": p["displayName"],
                "value": kda,
                "achievedAt": _now(),
            }
            kda_beaten = True

    if not streak_beaten and not kda_beaten:
        return None

    return {"bestWinStreak": new_streak, "bestKda": new_kda}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd scraper && .venv/bin/pytest tests/test_records.py -v
```
Expected: all 11 tests pass.

- [ ] **Step 5: Commit**

```bash
git add scraper/records.py scraper/tests/test_records.py
git commit -m "feat: add records logic — win streak and best KDA tracking"
```

---

## Task 2: Firebase client — `read_records` and `write_records`

**Files:**
- Modify: `scraper/firebase_client.py`
- Modify: `scraper/tests/test_firebase_client.py`

- [ ] **Step 1: Write failing tests**

Add to `scraper/tests/test_firebase_client.py`:

```python
from firebase_client import read_records, write_records


def test_read_records_returns_dict(mocker):
    mock_ref = MagicMock()
    mock_ref.get.return_value = {"bestWinStreak": {"value": 5}, "bestKda": {"value": 3.2}}
    mocker.patch("firebase_client._init_app")
    mock_db_ref = mocker.patch("firebase_client.db.reference", return_value=mock_ref)
    result = read_records("https://fake.firebaseio.com")
    assert result == {"bestWinStreak": {"value": 5}, "bestKda": {"value": 3.2}}
    mock_db_ref.assert_called_with("/records")


def test_read_records_returns_empty_when_none(mocker):
    mock_ref = MagicMock()
    mock_ref.get.return_value = None
    mocker.patch("firebase_client._init_app")
    mocker.patch("firebase_client.db.reference", return_value=mock_ref)
    result = read_records("https://fake.firebaseio.com")
    assert result == {}


def test_write_records_calls_set(mocker):
    mock_ref = MagicMock()
    mocker.patch("firebase_client._init_app")
    mock_db_ref = mocker.patch("firebase_client.db.reference", return_value=mock_ref)
    records = {"bestWinStreak": {"playerId": "oliver", "value": 8}}
    write_records(records, "https://fake.firebaseio.com")
    mock_db_ref.assert_called_with("/records")
    mock_ref.set.assert_called_once_with(records)
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd scraper && .venv/bin/pytest tests/test_firebase_client.py -v -k "records"
```
Expected: `ImportError: cannot import name 'read_records'`

- [ ] **Step 3: Add `read_records` and `write_records` to `firebase_client.py`**

Add after the existing `write_to_firebase` function:

```python
def read_records(database_url: str) -> dict:
    _init_app(database_url)
    data = db.reference("/records").get()
    return data if data is not None else {}


def write_records(records: dict, database_url: str) -> None:
    _init_app(database_url)
    db.reference("/records").set(records)
```

- [ ] **Step 4: Run all scraper tests**

```bash
cd scraper && .venv/bin/pytest -v
```
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add scraper/firebase_client.py scraper/tests/test_firebase_client.py
git commit -m "feat: add read_records and write_records to firebase_client"
```

---

## Task 3: Wire records into `main.py`

**Files:**
- Modify: `scraper/main.py`

- [ ] **Step 1: Update imports and run loop**

Replace the current `main.py` with:

```python
import os
import sys
import time
import logging
from players import PLAYERS
from scrape import fetch_games_for_player
from stats import compute_player_stats, compute_group_stats
from records import update_records
from firebase_client import write_to_firebase, read_records, write_records

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
            games = fetch_games_for_player(player["url"])
            stats = compute_player_stats(games)
            all_player_data.append({
                **player,
                "games": games,
                "stats": stats,
            })
            log.info(f"  → {len(games)} ranked games, {stats['wins']}W {stats['losses']}L")
        except Exception as e:
            log.warning(f"  → Failed to scrape {player['displayName']}: {e}")
            all_player_data.append({
                **player,
                "games": [],
                "stats": compute_player_stats([]),
            })
        time.sleep(1)

    group = compute_group_stats([p["stats"] for p in all_player_data])
    log.info(f"Group: {group['totalWins']}W {group['totalLosses']}L ({group['winRate']:.1%})")

    write_to_firebase(all_player_data, group, DATABASE_URL)
    log.info("Data written to Firebase successfully.")

    existing_records = read_records(DATABASE_URL)
    new_records = update_records(all_player_data, existing_records)
    if new_records is not None:
        write_records(new_records, DATABASE_URL)
        streak = new_records.get("bestWinStreak", {})
        kda = new_records.get("bestKda", {})
        if streak:
            log.info(f"  🏆 New streak record: {streak['displayName']} — {streak['value']} wins")
        if kda:
            log.info(f"  ⚡ New KDA record: {kda['displayName']} — {kda['value']}")
    else:
        log.info("Records unchanged.")


if __name__ == "__main__":
    run()
```

- [ ] **Step 2: Run all scraper tests**

```bash
cd scraper && .venv/bin/pytest -v
```
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add scraper/main.py
git commit -m "feat: wire records read/update/write into scraper run loop"
```

---

## Task 4: Frontend — expose `records` from `useGameData`

**Files:**
- Modify: `frontend/src/hooks/useGameData.js`

- [ ] **Step 1: Update `useGameData.js`**

```js
import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';

export function useGameData() {
  const [players, setPlayers] = useState(null);
  const [group, setGroup] = useState(null);
  const [records, setRecords] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const rootRef = ref(db, '/');
    const unsubscribe = onValue(rootRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setPlayers(data.players || {});
        setGroup(data.group || null);
        setRecords(data.records || null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { players, group, records, loading };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useGameData.js
git commit -m "feat: expose records from useGameData hook"
```

---

## Task 5: Frontend — `RecordBanner` component (UI-UX-PRO-MAX)

**Files:**
- Create: `frontend/src/components/RecordBanner.jsx`

- [ ] **Step 1: Invoke ui-ux-pro-max skill, then create `RecordBanner.jsx`**

Invoke the `ui-ux-pro-max` skill before writing this component. The component receives:
```js
// props
{ records }
// records shape:
// {
//   bestWinStreak: { displayName: string, value: number, achievedAt: string },
//   bestKda:       { displayName: string, value: number, achievedAt: string }
// }
```

The component renders two compact trophy cards side by side. Render `null` if `records` is null/undefined or if both sub-keys are missing.

Each card:
- Icon left (🏆 streak, ⚡ KDA)
- Label top ("Best Win Streak" / "Best KDA · 30g") in dimmed mono uppercase
- Value large + bold in heading font (`var(--font-head)`) coloured `var(--accent)`
- Holder name below value in small dimmed mono

Style to match the existing dark scoreboard aesthetic using the existing CSS variables: `--surface`, `--border`, `--border-hi`, `--accent`, `--accent-soft`, `--fg`, `--fg-dim`, `--font-head`, `--font-mono`.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/RecordBanner.jsx
git commit -m "feat: add RecordBanner trophy card component"
```

---

## Task 6: Frontend — wire `RecordBanner` into `App.jsx`

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Import and render `RecordBanner`**

In `App.jsx`:

1. Add import at the top:
```js
import RecordBanner from './components/RecordBanner';
```

2. Destructure `records` from `useGameData`:
```js
const { players, group, records, loading } = useGameData();
```

3. Render `<RecordBanner records={records} />` inside the header, between the win rate block and the timestamp `div`. Place it after the closing `</div>` of the win rate bar block and before the `{group?.lastUpdated && ...}` timestamp block.

- [ ] **Step 2: Run the dev server and verify visually**

```bash
cd frontend && npm run dev
```

Check:
- Two trophy cards appear in the header (may show blank until Firebase has records)
- Layout doesn't break at normal desktop width
- On narrow windows the cards wrap gracefully

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: render RecordBanner in header"
```

---

## Task 7: End-to-end test — run scraper, verify Firebase, verify UI

- [ ] **Step 1: Run scraper locally**

```bash
cd scraper && FIREBASE_DATABASE_URL=https://lol-group-tracker-default-rtdb.europe-west1.firebasedatabase.app FIREBASE_CREDENTIALS=$(cat /tmp/lol-sa-key.json) .venv/bin/python main.py
```

Expected log output includes one of:
```
🏆 New streak record: <name> — <N> wins
⚡ New KDA record: <name> — <value>
```
(Both will fire on first run since no records exist yet.)

- [ ] **Step 2: Check Firebase console**

Verify `/records` node exists with `bestWinStreak` and `bestKda` populated.

- [ ] **Step 3: Verify UI shows records**

Open `https://lol-group-tracker.web.app/` — both trophy cards should be visible in the header with real data.

- [ ] **Step 4: Push**

```bash
git push
```
