# Win Streak Fix + Match Modal Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix win streak calculation to find the best streak across all 30 games, extend the match scraper to capture vision score and team winner, and redesign the match detail modal to be larger with kill participation, vision score, and victory/defeat banners.

**Architecture:** Three sequential tasks: (1) fix the backend streak calculation, (2) extend the match scraper with two new fields and update its HTML fixture and tests, (3) replace the match modal component with a redesigned version that consumes the new fields and gracefully degrades for already-cached matches. No new files needed — all changes are in-place modifications.

**Tech Stack:** Python 3 + BeautifulSoup (scraper), React with inline styles (frontend), Firebase Realtime DB, existing CSS variable design system (Russo One / Chakra Petch / JetBrains Mono fonts, `--win`, `--loss`, `--gold`, `--accent`, `--accent-soft` tokens).

---

## File Map

| File | Change |
|------|--------|
| `scraper/records.py` | Fix `compute_win_streak` to find max streak |
| `scraper/tests/test_records.py` | Update broken test + add new test |
| `scraper/tests/fixtures/sample_match.html` | Add `visionScore` divs to each kdaColumn |
| `scraper/match_scraper.py` | Scrape `visionScore` per participant + `team1Won` |
| `scraper/tests/test_match_scraper.py` | Add tests for new fields |
| `frontend/src/index.css` | Add `@keyframes modalEnter` |
| `frontend/src/components/MatchModal.jsx` | Full redesign |

---

## Task 1: Fix Win Streak Calculation

**Files:**
- Modify: `scraper/records.py:4-10`
- Modify: `scraper/tests/test_records.py:11-16`

### Background

`compute_win_streak` currently iterates from index 0 (most recent game) and stops at the first loss — returning the current streak at the front of the array, not the max streak across all 30 games. A player with `[L, W, W, W, W, L, W]` returns `0` instead of `4`.

The existing test `test_win_streak_starts_with_loss` asserts `games = [L, W, W] == 0`, which is wrong for the new behavior (correct answer: `2`). It must be updated.

---

- [ ] **Step 1: Update the failing test and add a new one**

In `scraper/tests/test_records.py`, replace lines 11–16:

```python
def test_win_streak_starts_with_loss():
    games = [{"result": "loss"}, {"result": "win"}, {"result": "win"}]
    assert compute_win_streak(games) == 2


def test_win_streak_best_not_at_front():
    games = [
        {"result": "loss"},
        {"result": "win"},
        {"result": "win"},
        {"result": "win"},
        {"result": "win"},
        {"result": "loss"},
        {"result": "win"},
    ]
    assert compute_win_streak(games) == 4
```

---

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
cd /Users/olindkri/Projects/LOLScraper/scraper && .venv/bin/python -m pytest tests/test_records.py::test_win_streak_starts_with_loss tests/test_records.py::test_win_streak_best_not_at_front -v
```

Expected: both FAIL (`assert 0 == 2` and `NameError` or `assert 0 == 4`).

---

- [ ] **Step 3: Fix `compute_win_streak` in `scraper/records.py`**

Replace the function (lines 4–10):

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

---

- [ ] **Step 4: Run the full test_records suite to confirm all pass**

```bash
cd /Users/olindkri/Projects/LOLScraper/scraper && .venv/bin/python -m pytest tests/test_records.py -v
```

Expected: all 8 tests PASS.

---

- [ ] **Step 5: Commit**

```bash
git add scraper/records.py scraper/tests/test_records.py
git commit -m "fix: compute max win streak across all games, not just from front"
```

---

## Task 2: Extend Match Scraper (Vision Score + Team Winner)

**Files:**
- Modify: `scraper/tests/fixtures/sample_match.html`
- Modify: `scraper/tests/test_match_scraper.py`
- Modify: `scraper/match_scraper.py`

### Background

The match page on leagueofgraphs contains vision scores per player (in a `<div class="visionScore">`) and marks the winning team via "Victory"/"Defeat" text in the header row of the match table. We add `visionScore: int` to each participant and `team1Won: bool | None` to the match dict.

The HTML fixture must be updated to include these elements so the parser tests run against realistic HTML.

---

- [ ] **Step 1: Replace the HTML fixture with an updated version**

Overwrite `scraper/tests/fixtures/sample_match.html` entirely:

```html
<html><body>
<table class="matchTable data_table">
<tbody>
<tr><td>Victory 20 / 15 / 30</td><td></td><td></td><td></td><td>15 / 20 / 25 Defeat</td></tr>
<tr class="playerRow">
  <td class="text-left summoner_column"><a href="/summoner/euw/Hopa-Hopa"><img alt="Sejuani"/><div class="name">Hopa#Hopa</div></a></td>
  <td class="kdaColumn"><div class="kda"><span class="kills">5</span>/<span class="deaths">2</span>/<span class="assists">8</span></div><div class="cs">200 CS - 10k gold</div><div class="visionScore">28</div></td>
  <td></td><td></td>
  <td class="kdaColumn"><div class="kda"><span class="kills">3</span>/<span class="deaths">4</span>/<span class="assists">6</span></div><div class="cs">150 CS - 8k gold</div><div class="visionScore">12</div></td>
  <td class="text-left summoner_column"><a href="/summoner/euw/Enemy1-EUW"><img alt="Caitlyn"/><div class="name">Enemy1#EUW</div></a></td>
</tr>
<tr class="playerRow">
  <td class="text-left summoner_column"><a href="/summoner/euw/Ally2-EUW"><img alt="Jinx"/><div class="name">Ally2#EUW</div></a></td>
  <td class="kdaColumn"><div class="kda"><span class="kills">4</span>/<span class="deaths">3</span>/<span class="assists">7</span></div><div class="cs">180 CS - 9k gold</div><div class="visionScore">15</div></td>
  <td></td><td></td>
  <td class="kdaColumn"><div class="kda"><span class="kills">2</span>/<span class="deaths">5</span>/<span class="assists">4</span></div><div class="cs">120 CS - 7k gold</div><div class="visionScore">18</div></td>
  <td class="text-left summoner_column"><a href="/summoner/euw/Enemy2-EUW"><img alt="Ashe"/><div class="name">Enemy2#EUW</div></a></td>
</tr>
<tr class="playerRow">
  <td class="text-left summoner_column"><a href="/summoner/euw/Ally3-EUW"><img alt="Lux"/><div class="name">Ally3#EUW</div></a></td>
  <td class="kdaColumn"><div class="kda"><span class="kills">3</span>/<span class="deaths">4</span>/<span class="assists">9</span></div><div class="cs">100 CS - 6k gold</div><div class="visionScore">22</div></td>
  <td></td><td></td>
  <td class="kdaColumn"><div class="kda"><span class="kills">4</span>/<span class="deaths">3</span>/<span class="assists">5</span></div><div class="cs">110 CS - 6k gold</div><div class="visionScore">20</div></td>
  <td class="text-left summoner_column"><a href="/summoner/euw/Enemy3-EUW"><img alt="Zed"/><div class="name">Enemy3#EUW</div></a></td>
</tr>
<tr class="playerRow">
  <td class="text-left summoner_column"><a href="/summoner/euw/Ally4-EUW"><img alt="Thresh"/><div class="name">Ally4#EUW</div></a></td>
  <td class="kdaColumn"><div class="kda"><span class="kills">1</span>/<span class="deaths">3</span>/<span class="assists">12</span></div><div class="cs">30 CS - 3k gold</div><div class="visionScore">35</div></td>
  <td></td><td></td>
  <td class="kdaColumn"><div class="kda"><span class="kills">3</span>/<span class="deaths">4</span>/<span class="assists">7</span></div><div class="cs">40 CS - 3k gold</div><div class="visionScore">40</div></td>
  <td class="text-left summoner_column"><a href="/summoner/euw/Enemy4-EUW"><img alt="Nautilus"/><div class="name">Enemy4#EUW</div></a></td>
</tr>
<tr class="playerRow">
  <td class="text-left summoner_column"><a href="/summoner/euw/Ally5-EUW"><img alt="Graves"/><div class="name">Ally5#EUW</div></a></td>
  <td class="kdaColumn"><div class="kda"><span class="kills">7</span>/<span class="deaths">3</span>/<span class="assists">4</span></div><div class="cs">220 CS - 11k gold</div><div class="visionScore">10</div></td>
  <td></td><td></td>
  <td class="kdaColumn"><div class="kda"><span class="kills">3</span>/<span class="deaths">4</span>/<span class="assists">3</span></div><div class="cs">130 CS - 7k gold</div><div class="visionScore">14</div></td>
  <td class="text-left summoner_column"><a href="/summoner/euw/Enemy5-EUW"><img alt="Ahri"/><div class="name">Enemy5#EUW</div></a></td>
</tr>
</tbody>
</table>
</body></html>
```

Key additions: each `kdaColumn` now has `<div class="visionScore">N</div>`. The header row already has "Victory" in the first `<td>` — this signals `team1Won = True`.

---

- [ ] **Step 2: Add tests for the new fields**

Append to `scraper/tests/test_match_scraper.py`:

```python
def test_vision_score_parsed():
    result = _parse_match_soup("12345", get_soup())
    hopa = next(p for p in result["participants"] if p["summonerName"] == "Hopa#Hopa")
    assert hopa["visionScore"] == 28


def test_team1_won_is_true():
    result = _parse_match_soup("12345", get_soup())
    assert result["team1Won"] is True


def test_team1_won_absent_when_no_header():
    from bs4 import BeautifulSoup
    html = """
    <html><body><table class="matchTable">
    <tbody>
    <tr class="playerRow">
      <td class="summoner_column"><img alt="Aatrox"/><div class="name">A#1</div></td>
      <td class="kdaColumn"><div class="kda"><span class="kills">1</span>/<span class="deaths">1</span>/<span class="assists">1</span></div><div class="cs">50 CS</div></td>
      <td class="kdaColumn"><div class="kda"><span class="kills">1</span>/<span class="deaths">1</span>/<span class="assists">1</span></div><div class="cs">50 CS</div></td>
      <td class="summoner_column"><img alt="Ahri"/><div class="name">B#2</div></td>
    </tr>
    </tbody></table></body></html>
    """
    soup = BeautifulSoup(html, "lxml")
    result = _parse_match_soup("99999", soup)
    assert result["team1Won"] is None
```

---

- [ ] **Step 3: Run the new tests to confirm they fail**

```bash
cd /Users/olindkri/Projects/LOLScraper/scraper && .venv/bin/python -m pytest tests/test_match_scraper.py::test_vision_score_parsed tests/test_match_scraper.py::test_team1_won_is_true tests/test_match_scraper.py::test_team1_won_absent_when_no_header -v
```

Expected: all three FAIL (`KeyError: 'visionScore'` and `KeyError: 'team1Won'`).

---

- [ ] **Step 4: Update `_parse_match_soup` in `scraper/match_scraper.py`**

Replace the entire file:

```python
import re
from bs4 import BeautifulSoup
from scrape import fetch_page, BASE_URL, _parse_span_int


def scrape_match(match_id: str) -> dict:
    soup = fetch_page(f"{BASE_URL}/match/euw/{match_id}")
    return _parse_match_soup(match_id, soup)


def _parse_match_soup(match_id: str, soup: BeautifulSoup) -> dict:
    table = soup.find("table", class_="matchTable")
    if not table:
        raise ValueError(f"No matchTable found for match {match_id}")

    # Determine winner from header row (non-playerRow tr)
    team1_won = None
    for row in table.find_all("tr"):
        if "playerRow" in row.get("class", []):
            continue
        cells = row.find_all("td")
        if not cells:
            continue
        first_text = cells[0].get_text().lower()
        last_text = cells[-1].get_text().lower()
        if "victory" in first_text:
            team1_won = True
            break
        elif "victory" in last_text:
            team1_won = False
            break

    participants = []
    for row in table.find_all("tr", class_="playerRow"):
        summoner_cols = row.find_all("td", class_="summoner_column")
        kda_cols = row.find_all("td", class_="kdaColumn")
        if len(summoner_cols) < 2 or len(kda_cols) < 2:
            continue

        for team_idx in range(2):
            team = team_idx + 1
            summoner_td = summoner_cols[team_idx]
            kda_td = kda_cols[0] if team == 1 else kda_cols[-1]

            champ_img = summoner_td.find("img", alt=True)
            champion = champ_img["alt"] if champ_img else ""

            name_div = summoner_td.find("div", class_="name")
            summoner_name = name_div.get_text(strip=True) if name_div else ""

            kills = _parse_span_int(kda_td, "kills")
            deaths = _parse_span_int(kda_td, "deaths")
            assists = _parse_span_int(kda_td, "assists")

            cs = 0
            cs_div = kda_td.find("div", class_="cs")
            if cs_div:
                m = re.search(r"(\d+)\s*CS", cs_div.get_text())
                cs = int(m.group(1)) if m else 0

            vision_score = 0
            vs_div = kda_td.find("div", class_="visionScore")
            if vs_div:
                m = re.search(r"(\d+)", vs_div.get_text())
                vision_score = int(m.group(1)) if m else 0

            score = min(10.0, round((kills * 2 + assists) / max(deaths, 1) + cs / 100, 1))

            participants.append({
                "summonerName": summoner_name,
                "champion": champion,
                "team": team,
                "kills": kills,
                "deaths": deaths,
                "assists": assists,
                "cs": cs,
                "visionScore": vision_score,
                "score": score,
            })

    team1_kills = sum(p["kills"] for p in participants if p["team"] == 1)
    team2_kills = sum(p["kills"] for p in participants if p["team"] == 2)

    return {
        "matchId": match_id,
        "team1Won": team1_won,
        "participants": participants,
        "team1Kills": team1_kills,
        "team2Kills": team2_kills,
    }
```

---

- [ ] **Step 5: Run the full test_match_scraper suite**

```bash
cd /Users/olindkri/Projects/LOLScraper/scraper && .venv/bin/python -m pytest tests/test_match_scraper.py -v
```

Expected: all 13 tests PASS.

---

- [ ] **Step 6: Commit**

```bash
git add scraper/match_scraper.py scraper/tests/test_match_scraper.py scraper/tests/fixtures/sample_match.html
git commit -m "feat: scrape vision score and team winner from match page"
```

---

## Task 3: Redesign Match Modal

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/components/MatchModal.jsx`

### Background

The redesigned modal is wider (1100px), uses a card-per-player layout, and shows:
- Team VICTORY/DEFEAT banners with neon glow (from `team1Won`; graceful degradation when absent)
- A kill bar showing each team's fraction of total kills
- Per-player cards with champion, summoner name, KDA, CS, vision score (shows `—` if absent), kill participation bar, and score badge
- Group member highlight (`--accent-soft` bg + `--accent` left border)
- Entry animation via `@keyframes modalEnter` + `key={matchId}` to replay on each new match

Score badge thresholds are calibrated to the 10-point scale: `≥ 7.0` → green, `≥ 4.0` → gold, `< 4.0` → red.

Kill participation formula: `Math.min(100, Math.round((kills + assists) / teamKills * 100))`.

---

- [ ] **Step 1: Add `@keyframes modalEnter` to `frontend/src/index.css`**

Append to the end of the file (after the `prefers-reduced-motion` block):

```css
@keyframes modalEnter {
  from { transform: scale(0.95); opacity: 0; }
  to   { transform: scale(1);    opacity: 1; }
}
```

The existing `prefers-reduced-motion` block already sets all animation durations to `0.01ms`, so this keyframe is automatically suppressed for users who prefer reduced motion.

---

- [ ] **Step 2: Replace `frontend/src/components/MatchModal.jsx` entirely**

```jsx
import { useEffect, useState } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '../firebase';
import { TRACKED_GAMERTAGS } from '../trackedPlayers';

export default function MatchModal({ matchId, onClose }) {
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!matchId) return;
    setLoading(true);
    setMatch(null);
    setError(null);
    get(ref(db, `/matches/${matchId}`))
      .then(snapshot => {
        const data = snapshot.val();
        if (!data) setError('Match data unavailable.');
        else setMatch(data);
      })
      .catch(() => setError('Failed to load match data.'))
      .finally(() => setLoading(false));
  }, [matchId]);

  useEffect(() => {
    if (!matchId) return;
    const handleKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [matchId, onClose]);

  if (!matchId) return null;

  const team1 = match?.participants.filter(p => p.team === 1) ?? [];
  const team2 = match?.participants.filter(p => p.team === 2) ?? [];
  const totalKills = match ? match.team1Kills + match.team2Kills : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Match detail"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.80)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        key={matchId}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border-hi)',
          borderRadius: '10px',
          width: '100%',
          maxWidth: '1100px',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 32px 96px rgba(0,0,0,0.7)',
          animation: 'modalEnter 200ms ease-out forwards',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0,
          background: 'var(--card)',
          zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontFamily: 'var(--font-head)', fontSize: '0.85rem', color: 'var(--fg)', letterSpacing: '0.05em' }}>
              MATCH DETAIL
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--fg-dim)' }}>
              #{matchId}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close match detail"
            style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: '4px',
              color: 'var(--fg-dim)', cursor: 'pointer', padding: '4px 10px',
              fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
              transition: 'border-color 150ms ease, color 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hi)'; e.currentTarget.style.color = 'var(--fg)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--fg-dim)'; }}
          >
            ESC
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          {loading && (
            <div style={{ textAlign: 'center', color: 'var(--fg-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', padding: '48px' }}>
              Loading…
            </div>
          )}
          {error && (
            <div style={{ textAlign: 'center', color: 'var(--loss)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', padding: '48px' }}>
              {error}
            </div>
          )}
          {match && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <TeamColumn
                title="Team 1"
                players={team1}
                teamKills={match.team1Kills}
                totalKills={totalKills}
                won={match.team1Won != null ? match.team1Won === true : null}
              />
              <TeamColumn
                title="Team 2"
                players={team2}
                teamKills={match.team2Kills}
                totalKills={totalKills}
                won={match.team1Won != null ? match.team1Won === false : null}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TeamColumn({ title, players, teamKills, totalKills, won }) {
  const hasResult = won !== null;
  const color = won === true ? 'var(--win)' : won === false ? 'var(--loss)' : 'var(--fg-dim)';
  const glow = won === true ? 'var(--win-soft)' : won === false ? 'var(--loss-soft)' : 'transparent';
  const killPct = totalKills > 0 ? Math.round((teamKills / totalKills) * 100) : 0;

  return (
    <div>
      {/* Team header */}
      <div style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
        {hasResult ? (
          <div style={{
            fontFamily: 'var(--font-head)',
            fontSize: '0.9rem',
            letterSpacing: '0.1em',
            color,
            textShadow: `0 0 16px ${glow}`,
            marginBottom: '8px',
          }}>
            {won ? 'VICTORY' : 'DEFEAT'}
          </div>
        ) : (
          <div style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.6rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--fg-dim)',
            marginBottom: '8px',
          }}>
            {title}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 600, color, lineHeight: 1 }}>
            {teamKills}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--fg-dim)' }}>kills</span>
          <div style={{ flex: 1, height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              width: `${killPct}%`, height: '100%',
              background: color, borderRadius: '3px',
              transition: 'width 400ms ease',
            }} />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--fg-dim)', minWidth: '28px', textAlign: 'right' }}>
            {killPct}%
          </span>
        </div>
      </div>

      {/* Player cards */}
      {players.map((p, i) => (
        <ParticipantRow key={i} participant={p} teamKills={teamKills} teamColor={color} />
      ))}
    </div>
  );
}

function ParticipantRow({ participant, teamKills, teamColor }) {
  const isTracked = TRACKED_GAMERTAGS.has(participant.summonerName);
  const score = participant.score ?? 0;
  const scoreBg = score >= 7 ? 'var(--win)' : score >= 4 ? 'var(--gold)' : 'var(--loss)';
  const kp = teamKills > 0
    ? Math.min(100, Math.round(((participant.kills + participant.assists) / teamKills) * 100))
    : 0;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '6px',
      padding: '10px 12px',
      borderRadius: '6px',
      marginBottom: '6px',
      background: isTracked ? 'var(--accent-soft)' : 'var(--surface)',
      borderLeft: `3px solid ${isTracked ? 'var(--accent)' : 'transparent'}`,
    }}>
      {/* Row 1: Champion + Summoner name + Score badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontFamily: 'var(--font-head)', fontSize: '0.85rem', color: 'var(--fg)', minWidth: '84px' }}>
          {participant.champion || '—'}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
          color: isTracked ? 'var(--fg)' : 'var(--fg-muted)',
          fontWeight: isTracked ? 600 : 400,
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {participant.summonerName}
        </span>
        <span style={{
          background: scoreBg, color: '#fff',
          fontFamily: 'var(--font-head)', fontSize: '0.65rem',
          padding: '2px 7px', borderRadius: '3px', flexShrink: 0,
        }}>
          {score}
        </span>
      </div>

      {/* Row 2: KDA · CS · Vision */}
      <div style={{ display: 'flex', gap: '16px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', alignItems: 'center' }}>
        <span>
          <span style={{ color: 'var(--fg)' }}>{participant.kills}</span>
          <span style={{ color: 'var(--fg-dim)' }}> / </span>
          <span style={{ color: participant.deaths >= 7 ? 'var(--loss)' : 'var(--fg)' }}>{participant.deaths}</span>
          <span style={{ color: 'var(--fg-dim)' }}> / </span>
          <span style={{ color: 'var(--fg)' }}>{participant.assists}</span>
          <span style={{ color: 'var(--fg-dim)', fontSize: '0.6rem', marginLeft: '3px' }}>KDA</span>
        </span>
        <span style={{ color: 'var(--fg-muted)' }}>
          {participant.cs}
          <span style={{ color: 'var(--fg-dim)', fontSize: '0.6rem', marginLeft: '2px' }}>CS</span>
        </span>
        <span style={{ color: 'var(--fg-muted)' }}>
          {participant.visionScore != null ? participant.visionScore : '—'}
          <span style={{ color: 'var(--fg-dim)', fontSize: '0.6rem', marginLeft: '2px' }}>VS</span>
        </span>
      </div>

      {/* Row 3: Kill participation bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--fg-dim)', flexShrink: 0, width: '16px' }}>
          KP
        </span>
        <div style={{ flex: 1, height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            width: `${kp}%`, height: '100%',
            background: teamColor, borderRadius: '2px',
            transition: 'width 400ms ease',
          }} />
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--fg-muted)', minWidth: '32px', textAlign: 'right' }}>
          {kp}%
        </span>
      </div>
    </div>
  );
}
```

---

- [ ] **Step 3: Manual verification**

Start the frontend dev server:
```bash
cd /Users/olindkri/Projects/LOLScraper/frontend && npm run dev
```

Check the following:
1. Click any game row in the expanded player table → modal opens with scale+fade animation
2. Click a different game row → animation replays (new key forces remount)
3. For a **newly cached match** (has `team1Won` + `visionScore`): VICTORY/DEFEAT banners glow, kill bars fill, vision scores show as numbers, kill participation bars show per player
4. For an **old cached match** (missing those fields): team header shows "Team 1" / "Team 2" labels (no banner), vision shows `—`
5. Tracked group member rows have purple-tinted background and left accent border
6. Score badge colors: green for ≥ 7, gold for ≥ 4, red for < 4
7. High-death players (≥ 7 deaths) show red death count
8. ESC key closes modal, backdrop click closes modal
9. Modal header is sticky when scrolling tall match lists

---

- [ ] **Step 4: Commit**

```bash
git add frontend/src/index.css frontend/src/components/MatchModal.jsx
git commit -m "feat: redesign match modal with kill participation, vision score, and victory banners"
```
