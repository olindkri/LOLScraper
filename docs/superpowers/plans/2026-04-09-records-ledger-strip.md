# Records Ledger Strip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `bestWinRate` (30-game rolling window) and `highestRank` (ever seen) records to the backend, and replace the two floating trophy cards in the hero with a four-column flat ledger strip.

**Architecture:** Backend extends `update_records` with two new record types using the same strict `>` comparison pattern. Frontend replaces `RecordBanner` with a new `RecordsStrip` component; the hero header becomes a two-row flex column (row 1 = existing content, row 2 = the strip).

**Tech Stack:** Python 3 (scraper), pytest, React 19 + Vite, inline styles with CSS variables, Firebase Realtime DB.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `scraper/records.py` | Add `compute_best_winrate`, `rank_score`, `_format_rank`; extend `update_records` |
| Modify | `scraper/tests/test_records.py` | Tests for new functions and updated `update_records` |
| Create | `frontend/src/components/RecordsStrip.jsx` | Ledger strip — four record entries in a horizontal band |
| Modify | `frontend/src/App.jsx` | Swap `RecordBanner` → `RecordsStrip`; restructure header to two rows |
| Modify | `frontend/src/index.css` | Replace `.header-record` with `.records-strip` for mobile hiding |
| Delete | `frontend/src/components/RecordBanner.jsx` | Removed — replaced by `RecordsStrip` |

---

## Task 1: `compute_best_winrate` and `rank_score`

**Files:**
- Modify: `scraper/records.py`
- Modify: `scraper/tests/test_records.py`

- [ ] **Step 1: Write failing tests for `compute_best_winrate`**

Append to `scraper/tests/test_records.py`:

```python
from records import compute_win_streak, update_records, compute_best_winrate, rank_score


# ── compute_best_winrate ─────────────────────────────────────────────────────

def test_best_winrate_fewer_than_30_games_returns_none():
    games = [{"result": "win"}] * 29
    assert compute_best_winrate(games) is None


def test_best_winrate_exactly_30_all_wins():
    games = [{"result": "win"}] * 30
    assert compute_best_winrate(games) == 1.0


def test_best_winrate_exactly_30_mixed():
    games = [{"result": "win"}] * 24 + [{"result": "loss"}] * 6
    assert compute_best_winrate(games) == pytest.approx(24 / 30)


def test_best_winrate_finds_best_window():
    # Window 0–29: 25 wins. Window 1–30: 24 wins. Best = 25/30.
    games = [{"result": "win"}] * 25 + [{"result": "loss"}] + [{"result": "win"}] * 4
    assert compute_best_winrate(games) == pytest.approx(25 / 30)


def test_best_winrate_empty():
    assert compute_best_winrate([]) is None


# ── rank_score ───────────────────────────────────────────────────────────────

def test_rank_score_diamond_one():
    assert rank_score("diamond", "I", 92) == 7 * 10000 + 4 * 100 + 92


def test_rank_score_platinum_two():
    assert rank_score("platinum", "II", 75) == 5 * 10000 + 3 * 100 + 75


def test_rank_score_diamond_beats_platinum():
    assert rank_score("diamond", "IV", 0) > rank_score("platinum", "I", 100)


def test_rank_score_higher_division_beats_lower():
    assert rank_score("gold", "I", 0) > rank_score("gold", "II", 99)


def test_rank_score_higher_lp_breaks_tie():
    assert rank_score("gold", "I", 80) > rank_score("gold", "I", 50)


def test_rank_score_master_no_division():
    # Master/Grandmaster/Challenger: division ignored, just LP
    assert rank_score("master", None, 500) == 8 * 10000 + 4 * 100 + 500


def test_rank_score_master_beats_diamond():
    assert rank_score("master", None, 0) > rank_score("diamond", "I", 100)
```

Also add `import pytest` at the top of the test file (it is likely already imported transitively, but make it explicit).

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/olindkri/Projects/LOLScraper/scraper
python -m pytest tests/test_records.py -k "best_winrate or rank_score" -v
```

Expected: `ImportError` or `AttributeError` — `compute_best_winrate` and `rank_score` don't exist yet.

- [ ] **Step 3: Implement `compute_best_winrate` and `rank_score` in `scraper/records.py`**

Add these constants and functions after the existing `compute_win_streak` and before `update_records`:

```python
_TIER_SCORES = {
    "iron": 1, "bronze": 2, "silver": 3, "gold": 4,
    "platinum": 5, "emerald": 6, "diamond": 7,
    "master": 8, "grandmaster": 9, "challenger": 10,
}
_DIVISION_SCORES = {"IV": 1, "III": 2, "II": 3, "I": 4}
_NO_DIVISION_TIERS = {"master", "grandmaster", "challenger"}


def compute_best_winrate(games: list[dict]) -> float | None:
    if len(games) < 30:
        return None
    best = 0.0
    for i in range(len(games) - 29):
        window = games[i : i + 30]
        wins = sum(1 for g in window if g["result"] == "win")
        best = max(best, wins / 30)
    return best


def rank_score(tier: str, division: str | None, lp: int) -> int:
    t = _TIER_SCORES.get((tier or "").lower(), 0)
    d = 4 if (tier or "").lower() in _NO_DIVISION_TIERS else _DIVISION_SCORES.get(division or "", 0)
    return t * 10000 + d * 100 + lp


def _format_rank(tier: str, division: str | None, lp: int) -> str:
    tier_cap = tier.capitalize()
    if tier.lower() in _NO_DIVISION_TIERS:
        return f"{tier_cap} {lp}LP"
    return f"{tier_cap} {division or ''} {lp}LP"
```

- [ ] **Step 4: Run tests — all new tests should pass**

```bash
cd /Users/olindkri/Projects/LOLScraper/scraper
python -m pytest tests/test_records.py -k "best_winrate or rank_score" -v
```

Expected: all 12 new tests PASS.

- [ ] **Step 5: Run the full test suite to confirm no regressions**

```bash
cd /Users/olindkri/Projects/LOLScraper/scraper
python -m pytest tests/test_records.py -v
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/olindkri/Projects/LOLScraper
git add scraper/records.py scraper/tests/test_records.py
git commit -m "feat: add compute_best_winrate and rank_score helpers"
```

---

## Task 2: Extend `update_records` for `bestWinRate` and `highestRank`

**Files:**
- Modify: `scraper/records.py`
- Modify: `scraper/tests/test_records.py`

- [ ] **Step 1: Write failing tests for the extended `update_records`**

Append to `scraper/tests/test_records.py`:

```python
# ── update_records — bestWinRate and highestRank ─────────────────────────────

# 30 games: 25 wins, 5 losses → best window = 25/30
_GAMES_30 = [{"result": "win"}] * 25 + [{"result": "loss"}] * 5

PLAYER_WITH_RANK = {
    "id": "oliver",
    "displayName": "Oliver",
    "games": _GAMES_30,
    "stats": {"avgKda": 5.5},
    "soloRank": {"tier": "diamond", "division": "I", "lp": 92},
}

PLAYER_WITH_LOWER_RANK = {
    "id": "eirik",
    "displayName": "Eirik",
    "games": _GAMES_30,
    "stats": {"avgKda": 3.2},
    "soloRank": {"tier": "platinum", "division": "II", "lp": 75},
}


def test_update_records_sets_best_winrate_on_first_run():
    result = update_records([PLAYER_WITH_RANK], {})
    assert result["bestWinRate"]["value"] == pytest.approx(25 / 30)
    assert result["bestWinRate"]["playerId"] == "oliver"


def test_update_records_sets_highest_rank_on_first_run():
    result = update_records([PLAYER_WITH_RANK], {})
    assert result["highestRank"]["tier"] == "diamond"
    assert result["highestRank"]["division"] == "I"
    assert result["highestRank"]["lp"] == 92
    assert result["highestRank"]["value"] == "Diamond I 92LP"
    assert result["highestRank"]["playerId"] == "oliver"


def test_update_records_picks_highest_rank_across_players():
    result = update_records([PLAYER_WITH_LOWER_RANK, PLAYER_WITH_RANK], {})
    assert result["highestRank"]["playerId"] == "oliver"


def test_update_records_winrate_beats_existing():
    existing = {
        "bestWinStreak": {"playerId": "x", "displayName": "X", "value": 99, "achievedAt": "2026-01-01T00:00:00Z"},
        "bestKda": {"playerId": "x", "displayName": "X", "value": 99.0, "achievedAt": "2026-01-01T00:00:00Z"},
        "bestWinRate": {"playerId": "x", "displayName": "X", "value": 0.5, "achievedAt": "2026-01-01T00:00:00Z"},
        "highestRank": {"playerId": "x", "displayName": "X", "tier": "gold", "division": "I", "lp": 99, "value": "Gold I 99LP", "achievedAt": "2026-01-01T00:00:00Z"},
    }
    result = update_records([PLAYER_WITH_RANK], existing)
    assert result["bestWinRate"]["value"] == pytest.approx(25 / 30)
    assert result["bestWinRate"]["playerId"] == "oliver"


def test_update_records_winrate_tie_does_not_replace():
    existing_rate = 25 / 30
    existing = {
        "bestWinStreak": {"playerId": "x", "displayName": "X", "value": 99, "achievedAt": "2026-01-01T00:00:00Z"},
        "bestKda": {"playerId": "x", "displayName": "X", "value": 99.0, "achievedAt": "2026-01-01T00:00:00Z"},
        "bestWinRate": {"playerId": "x", "displayName": "X", "value": existing_rate, "achievedAt": "2026-01-01T00:00:00Z"},
        "highestRank": {"playerId": "x", "displayName": "X", "tier": "master", "division": None, "lp": 999, "value": "Master 999LP", "achievedAt": "2026-01-01T00:00:00Z"},
    }
    result = update_records([PLAYER_WITH_RANK], existing)
    assert result is None


def test_update_records_rank_beats_existing():
    existing = {
        "bestWinStreak": {"playerId": "x", "displayName": "X", "value": 99, "achievedAt": "2026-01-01T00:00:00Z"},
        "bestKda": {"playerId": "x", "displayName": "X", "value": 99.0, "achievedAt": "2026-01-01T00:00:00Z"},
        "bestWinRate": {"playerId": "x", "displayName": "X", "value": 1.0, "achievedAt": "2026-01-01T00:00:00Z"},
        "highestRank": {"playerId": "x", "displayName": "X", "tier": "platinum", "division": "I", "lp": 99, "value": "Platinum I 99LP", "achievedAt": "2026-01-01T00:00:00Z"},
    }
    result = update_records([PLAYER_WITH_RANK], existing)
    assert result["highestRank"]["playerId"] == "oliver"
    assert result["highestRank"]["value"] == "Diamond I 92LP"


def test_update_records_no_solorank_skips_rank_check():
    player_no_rank = {
        "id": "ghost",
        "displayName": "Ghost",
        "games": _GAMES_30,
        "stats": {"avgKda": 5.5},
        # no soloRank key
    }
    existing = {
        "bestWinStreak": {"playerId": "x", "displayName": "X", "value": 99, "achievedAt": "2026-01-01T00:00:00Z"},
        "bestKda": {"playerId": "x", "displayName": "X", "value": 99.0, "achievedAt": "2026-01-01T00:00:00Z"},
        "bestWinRate": {"playerId": "x", "displayName": "X", "value": 1.0, "achievedAt": "2026-01-01T00:00:00Z"},
        "highestRank": {"playerId": "x", "displayName": "X", "tier": "master", "division": None, "lp": 999, "value": "Master 999LP", "achievedAt": "2026-01-01T00:00:00Z"},
    }
    result = update_records([player_no_rank], existing)
    assert result is None


def test_update_records_fewer_than_30_games_skips_winrate():
    player_few_games = {
        "id": "rookie",
        "displayName": "Rookie",
        "games": [{"result": "win"}] * 10,
        "stats": {"avgKda": 5.5},
        "soloRank": {"tier": "master", "division": None, "lp": 9999},
    }
    existing = {
        "bestWinStreak": {"playerId": "x", "displayName": "X", "value": 99, "achievedAt": "2026-01-01T00:00:00Z"},
        "bestKda": {"playerId": "x", "displayName": "X", "value": 99.0, "achievedAt": "2026-01-01T00:00:00Z"},
        "bestWinRate": {"playerId": "x", "displayName": "X", "value": 1.0, "achievedAt": "2026-01-01T00:00:00Z"},
        "highestRank": {"playerId": "x", "displayName": "X", "tier": "gold", "division": "I", "lp": 0, "value": "Gold I 0LP", "achievedAt": "2026-01-01T00:00:00Z"},
    }
    result = update_records([player_few_games], existing)
    # highestRank is beaten (master > gold) but winrate is not (< 30 games)
    assert result["highestRank"]["playerId"] == "rookie"
    assert result["bestWinRate"]["value"] == 1.0  # unchanged
```

- [ ] **Step 2: Run new tests to confirm they fail**

```bash
cd /Users/olindkri/Projects/LOLScraper/scraper
python -m pytest tests/test_records.py -k "winrate or highest_rank or solorank or fewer_than_30" -v
```

Expected: failures — `update_records` doesn't handle new record types yet.

- [ ] **Step 3: Replace `update_records` in `scraper/records.py`**

Replace the entire `update_records` function with:

```python
def update_records(all_player_data: list[dict], existing: dict) -> dict | None:
    best_streak_value = existing.get("bestWinStreak", {}).get("value", -1)
    best_kda_value = existing.get("bestKda", {}).get("value", -1)
    best_winrate_value = existing.get("bestWinRate", {}).get("value", -1.0)

    existing_rank = existing.get("highestRank", {})
    best_rank_score = (
        rank_score(existing_rank["tier"], existing_rank.get("division"), existing_rank["lp"])
        if existing_rank
        else -1
    )

    new_streak = dict(existing.get("bestWinStreak", {}))
    new_kda = dict(existing.get("bestKda", {}))
    new_winrate = dict(existing.get("bestWinRate", {}))
    new_rank = dict(existing.get("highestRank", {}))

    streak_beaten = False
    kda_beaten = False
    winrate_beaten = False
    rank_beaten = False

    for p in all_player_data:
        if not p.get("games"):
            continue

        streak = compute_win_streak(p["games"])
        kda = p["stats"]["avgKda"]
        winrate = compute_best_winrate(p["games"])
        solo_rank = p.get("soloRank")

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

        if winrate is not None and winrate > best_winrate_value:
            best_winrate_value = winrate
            new_winrate = {
                "playerId": p["id"],
                "displayName": p["displayName"],
                "value": winrate,
                "achievedAt": _now(),
            }
            winrate_beaten = True

        if solo_rank:
            score = rank_score(solo_rank["tier"], solo_rank.get("division"), solo_rank["lp"])
            if score > best_rank_score:
                best_rank_score = score
                new_rank = {
                    "playerId": p["id"],
                    "displayName": p["displayName"],
                    "tier": solo_rank["tier"],
                    "division": solo_rank.get("division"),
                    "lp": solo_rank["lp"],
                    "value": _format_rank(solo_rank["tier"], solo_rank.get("division"), solo_rank["lp"]),
                    "achievedAt": _now(),
                }
                rank_beaten = True

    if not any([streak_beaten, kda_beaten, winrate_beaten, rank_beaten]):
        return None

    return {
        "bestWinStreak": new_streak,
        "bestKda": new_kda,
        "bestWinRate": new_winrate,
        "highestRank": new_rank,
    }
```

- [ ] **Step 4: Run all records tests**

```bash
cd /Users/olindkri/Projects/LOLScraper/scraper
python -m pytest tests/test_records.py -v
```

Expected: all tests PASS (including the original tests — they use players with <30 games and no soloRank, so the new paths are bypassed).

- [ ] **Step 5: Commit**

```bash
cd /Users/olindkri/Projects/LOLScraper
git add scraper/records.py scraper/tests/test_records.py
git commit -m "feat: add bestWinRate and highestRank to update_records"
```

---

## Task 3: `RecordsStrip` component

**Files:**
- Create: `frontend/src/components/RecordsStrip.jsx`

- [ ] **Step 1: Create `RecordsStrip.jsx`**

Create `frontend/src/components/RecordsStrip.jsx`:

```jsx
const RECORDS = [
  {
    key: 'bestWinStreak',
    label: 'STREAK',
    color: 'var(--gold)',
    format: (r) => String(r.value),
  },
  {
    key: 'bestKda',
    label: 'KDA',
    color: '#a78bfa',
    format: (r) => String(r.value),
  },
  {
    key: 'bestWinRate',
    label: 'WIN RATE',
    color: 'var(--win)',
    format: (r) => `${Math.round(r.value * 100)}%`,
  },
  {
    key: 'highestRank',
    label: 'PEAK RANK',
    color: '#60a5fa',
    format: (r) => r.value,
  },
];

export default function RecordsStrip({ records }) {
  if (!records) return null;

  return (
    <div
      className="records-strip"
      style={{
        display: 'flex',
        width: '100%',
        borderTop: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      {RECORDS.map((config, idx) => {
        const record = records[config.key];
        const isLast = idx === RECORDS.length - 1;
        return (
          <div
            key={config.key}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 8px',
              borderRight: isLast ? 'none' : '1px solid var(--border)',
              gap: '1px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--fg-dim)',
                lineHeight: 1,
              }}
            >
              {config.label}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: '20px',
                fontWeight: 700,
                color: record ? config.color : 'var(--fg-dim)',
                lineHeight: 1.1,
              }}
            >
              {record ? config.format(record) : '—'}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--fg-muted)',
                lineHeight: 1,
              }}
            >
              {record ? record.displayName : '—'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify the file was created**

```bash
ls /Users/olindkri/Projects/LOLScraper/frontend/src/components/RecordsStrip.jsx
```

Expected: file exists.

- [ ] **Step 3: Commit**

```bash
cd /Users/olindkri/Projects/LOLScraper
git add frontend/src/components/RecordsStrip.jsx
git commit -m "feat: add RecordsStrip ledger component"
```

---

## Task 4: Wire `RecordsStrip` into `App.jsx`, update CSS, delete `RecordBanner`

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/index.css`
- Delete: `frontend/src/components/RecordBanner.jsx`

- [ ] **Step 1: Update `frontend/src/App.jsx`**

Make the following changes:

**a) Replace the import at line 4:**

Old:
```jsx
import RecordBanner from './components/RecordBanner';
```

New:
```jsx
import RecordsStrip from './components/RecordsStrip';
```

**b) Replace the entire `<header>` element** (lines 63–131) with:

```jsx
      {/* ── Header ── */}
      <header className="app-header" style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Row 1: logo + win rate + timestamp */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0',
          padding: '0 24px',
          minHeight: '72px',
        }}>
          {/* Logo + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingRight: '28px', borderRight: '1px solid var(--border)', marginRight: '28px', alignSelf: 'stretch', paddingTop: '12px', paddingBottom: '12px' }}>
            <span style={{ fontSize: '28px', lineHeight: 1, flexShrink: 0 }} role="img" aria-label="cow">🐄</span>
            <span style={{ fontFamily: 'var(--font-head)', fontSize: '1rem', letterSpacing: '0.05em', color: 'var(--fg)' }}>
              BABY COW
            </span>
          </div>

          {/* Group win rate hero */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1, flexWrap: 'wrap', paddingTop: '12px', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{
                fontFamily: 'var(--font-head)',
                fontSize: '2rem',
                color: isWinning ? 'var(--win)' : 'var(--loss)',
                lineHeight: 1,
                letterSpacing: '0.02em',
                textShadow: isWinning ? '0 0 24px var(--win-soft)' : '0 0 24px var(--loss-soft)',
              }}>
                {pct}%
              </span>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.65rem', color: 'var(--fg-dim)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Group W/R
              </span>
            </div>

            {/* W / L counts */}
            <div style={{ display: 'flex', gap: '16px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
              <span><span style={{ color: 'var(--win)', fontWeight: 600 }}>{totalWins}</span><span style={{ color: 'var(--fg-dim)', fontSize: '0.7rem' }}> W</span></span>
              <span style={{ color: 'var(--border-hi)' }}>·</span>
              <span><span style={{ color: 'var(--loss)', fontWeight: 600 }}>{totalLosses}</span><span style={{ color: 'var(--fg-dim)', fontSize: '0.7rem' }}> L</span></span>
              <span style={{ color: 'var(--border-hi)' }}>·</span>
              <span style={{ color: 'var(--fg-muted)' }}>{totalGames}<span style={{ color: 'var(--fg-dim)', fontSize: '0.7rem' }}> games</span></span>
            </div>

            {/* Win rate bar */}
            <div style={{ flex: 1, maxWidth: '180px', height: '4px', background: 'var(--border)', borderRadius: '2px', position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', inset: '0 auto 0 0',
                width: `${pct}%`,
                background: isWinning ? 'var(--win)' : 'var(--loss)',
                borderRadius: '2px',
                transition: 'width 600ms ease',
              }} />
              <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: 'var(--fg-dim)' }} />
            </div>
          </div>

          {/* Updated timestamp */}
          {group?.lastUpdated && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--fg-dim)', paddingLeft: '16px', alignSelf: 'center' }}>
              {timeAgo(group.lastUpdated)}
            </div>
          )}
        </div>

        {/* Row 2: records ledger strip */}
        <RecordsStrip records={records} />
      </header>
```

- [ ] **Step 2: Update `frontend/src/index.css` — replace `.header-record` with `.records-strip`**

Find the line in the `@media (max-width: 640px)` block:

Old:
```css
  /* Hide record banner — not enough space */
  .header-record { display: none; }
```

New:
```css
  /* Hide records strip — not enough space */
  .records-strip { display: none !important; }
```

Also remove the `.app-header` mobile override for `min-height: unset` if it was tied to the old taller header — check if it's still needed. The new header no longer sets `minHeight` on the outer element (it's on the inner row 1 div), so the old override is harmless but can stay.

- [ ] **Step 3: Delete `RecordBanner.jsx`**

```bash
rm /Users/olindkri/Projects/LOLScraper/frontend/src/components/RecordBanner.jsx
```

- [ ] **Step 4: Start the dev server and visually verify**

```bash
cd /Users/olindkri/Projects/LOLScraper/frontend
npm run dev
```

Open `http://localhost:5173`. Check:
- Row 1: logo, group W/R, win/loss counts, bar, timestamp — all present and unchanged
- Row 2: four-column ledger strip with STREAK, KDA, WIN RATE, PEAK RANK labels
- Values show `—` for records not yet in Firebase (expected at this stage)
- No console errors about missing imports
- Header does not have the old trophy cards

Stop the dev server (`Ctrl+C`) when done.

- [ ] **Step 5: Commit**

```bash
cd /Users/olindkri/Projects/LOLScraper
git add frontend/src/App.jsx frontend/src/index.css
git commit -m "feat: replace RecordBanner with RecordsStrip two-row header"
git rm frontend/src/components/RecordBanner.jsx
git commit -m "chore: delete RecordBanner — replaced by RecordsStrip"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| `bestWinRate` — 30-game rolling window | Task 1 (`compute_best_winrate`) |
| `bestWinRate` — stored in Firebase with `value`, `playerId`, `displayName`, `achievedAt` | Task 2 (`update_records`) |
| `highestRank` — numeric score comparison | Task 1 (`rank_score`) |
| `highestRank` — stored with `tier`, `division`, `lp`, `value` (formatted), `playerId`, `displayName`, `achievedAt` | Task 2 (`update_records`) |
| Strict `>` comparison for both new records | Task 2 |
| `RecordsStrip` replaces `RecordBanner` | Tasks 3 + 4 |
| Four entries: Streak → KDA → Win Rate → Peak Rank | Task 3 |
| Accent colors per record | Task 3 |
| `background: var(--surface)`, `border-top: 1px solid var(--border)` | Task 3 |
| Label / value / holder typography | Task 3 |
| Missing record renders `—` | Task 3 |
| Hero is two-row flex column | Task 4 |
| Mobile: strip hidden at `<640px` | Task 4 (CSS) |
| `RecordBanner.jsx` deleted | Task 4 |
| Entries separated by 1px `var(--border)` vertical dividers | Task 3 |
