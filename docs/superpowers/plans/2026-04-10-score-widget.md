# Score Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat score badge in the Match detail view with a compact circular arc gauge showing performance score (0–100) and per-match rank ("MVP", "2nd", etc.).

**Architecture:** A new `ScoreWidget` component handles all rendering. `MatchModal` computes a `rankMap` (all 10 participants sorted by score) and passes each player's rank down through `TeamColumn` → `ParticipantRow` → `ScoreWidget`. The SVG arc uses `stroke-dashoffset` to fill proportionally to score.

**Tech Stack:** React 19, Vite, inline CSS custom properties (`var(--win)`, `var(--gold)`, `var(--loss)`, `var(--surface)`, `var(--border)`, `var(--fg-muted)`, `var(--font-head)`, `var(--font-data)`), Node.js built-in test runner (`node:test`, `node:assert/strict`).

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/src/components/ScoreWidget.jsx` | **Create** | Circular arc gauge — all rendering logic, arc math, rank label, reduced-motion |
| `frontend/src/components/score-widget.test.mjs` | **Create** | Source-code structural tests for ScoreWidget |
| `frontend/src/components/MatchModal.jsx` | **Modify** | Add `rankMap` computation; pass `rankMap` to `TeamColumn`; remove old `scoreBg`/badge; import `ScoreWidget` |
| `frontend/src/components/match-modal-rank.test.mjs` | **Create** | Source-code structural tests for MatchModal integration |

---

## Task 1: Create `ScoreWidget` component

**Files:**
- Create: `frontend/src/components/ScoreWidget.jsx`
- Create: `frontend/src/components/score-widget.test.mjs`

---

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/score-widget.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const path = new URL('./ScoreWidget.jsx', import.meta.url);

test('ScoreWidget uses ARC constant 65.97', async () => {
  const src = await readFile(path, 'utf8');
  assert.match(src, /65\.97/);
});

test('ScoreWidget SVG has role="img"', async () => {
  const src = await readFile(path, 'utf8');
  assert.match(src, /role="img"/);
});

test('ScoreWidget SVG has aria-label', async () => {
  const src = await readFile(path, 'utf8');
  assert.match(src, /aria-label=/);
});

test('ScoreWidget ranks 1 as MVP', async () => {
  const src = await readFile(path, 'utf8');
  assert.match(src, /MVP/);
});

test('ScoreWidget multiplies score by 10 for display', async () => {
  const src = await readFile(path, 'utf8');
  assert.match(src, /score.*\*.*10|10.*\*.*score/);
});

test('ScoreWidget respects prefers-reduced-motion', async () => {
  const src = await readFile(path, 'utf8');
  assert.match(src, /prefers-reduced-motion|reducedMotion|reduceMotion/);
});
```

---

- [ ] **Step 2: Run tests — confirm they all fail**

```bash
node --test frontend/src/components/score-widget.test.mjs
```

Expected: 6 failures — `ENOENT: no such file or directory` (file doesn't exist yet).

---

- [ ] **Step 3: Create `ScoreWidget.jsx`**

Create `frontend/src/components/ScoreWidget.jsx`:

```jsx
import { useState, useEffect } from 'react';

const CIRCUMFERENCE = 87.96; // 2π × 14
const ARC = 65.97;           // (270 / 360) × CIRCUMFERENCE

function rankLabel(rank) {
  if (rank === 1) return 'MVP';
  if (rank === 2) return '2nd';
  if (rank === 3) return '3rd';
  return `${rank}th`;
}

function useReducedMotion() {
  const [reduce, setReduce] = useState(
    () => typeof window !== 'undefined' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = e => setReduce(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduce;
}

export default function ScoreWidget({ score, rank }) {
  const reducedMotion = useReducedMotion();
  const display = Math.round((score ?? 0) * 10);
  const arcColor = display >= 70
    ? 'var(--win)'
    : display >= 40
    ? 'var(--gold)'
    : 'var(--loss)';
  const offset = ARC * (1 - (score ?? 0) / 10);
  const label = rankLabel(rank ?? 10);

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      background: 'var(--surface)',
      borderRadius: '20px',
      padding: '4px 6px 4px 10px',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginRight: '2px' }}>
        <span style={{
          fontFamily: 'var(--font-head)', fontSize: '1.1rem',
          color: arcColor, lineHeight: 1,
        }}>
          {display}
        </span>
        <span style={{
          fontFamily: 'var(--font-data)', fontSize: '0.6rem',
          color: 'var(--fg-muted)', lineHeight: 1, marginTop: '2px',
        }}>
          {label}
        </span>
      </div>

      <svg
        width="40" height="40"
        viewBox="0 0 40 40"
        role="img"
        aria-label={`Score: ${display} out of 100 — ${label}`}
      >
        {/* Background track */}
        <circle
          cx="20" cy="20" r="14"
          fill="none"
          stroke="var(--border)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${ARC} ${CIRCUMFERENCE}`}
          transform="rotate(-225 20 20)"
        />
        {/* Active fill arc */}
        <circle
          cx="20" cy="20" r="14"
          fill="none"
          stroke={arcColor}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${ARC} ${CIRCUMFERENCE}`}
          strokeDashoffset={offset}
          transform="rotate(-225 20 20)"
          style={{ transition: reducedMotion ? 'none' : 'stroke-dashoffset 400ms ease' }}
        />
        {/* Center button */}
        <circle cx="20" cy="20" r="10" fill="var(--surface)" />
      </svg>
    </div>
  );
}
```

---

- [ ] **Step 4: Run tests — confirm they all pass**

```bash
node --test frontend/src/components/score-widget.test.mjs
```

Expected output:
```
✔ ScoreWidget uses ARC constant 65.97
✔ ScoreWidget SVG has role="img"
✔ ScoreWidget SVG has aria-label
✔ ScoreWidget ranks 1 as MVP
✔ ScoreWidget multiplies score by 10 for display
✔ ScoreWidget respects prefers-reduced-motion
ℹ tests 6
ℹ pass 6
ℹ fail 0
```

---

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ScoreWidget.jsx frontend/src/components/score-widget.test.mjs
git commit -m "feat: add ScoreWidget circular arc gauge component"
```

---

## Task 2: Integrate `ScoreWidget` into `MatchModal`

**Files:**
- Modify: `frontend/src/components/MatchModal.jsx:1` (add import)
- Modify: `frontend/src/components/MatchModal.jsx:36-37` (add rankMap computation)
- Modify: `frontend/src/components/MatchModal.jsx:117-130` (pass rankMap to TeamColumn)
- Modify: `frontend/src/components/MatchModal.jsx:140` (TeamColumn accepts rankMap)
- Modify: `frontend/src/components/MatchModal.jsx:192-194` (pass rank to ParticipantRow)
- Modify: `frontend/src/components/MatchModal.jsx:199-241` (ParticipantRow: remove scoreBg, swap badge for ScoreWidget)
- Create: `frontend/src/components/match-modal-rank.test.mjs`

---

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/match-modal-rank.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const path = new URL('./MatchModal.jsx', import.meta.url);

test('MatchModal imports ScoreWidget', async () => {
  const src = await readFile(path, 'utf8');
  assert.match(src, /import.*ScoreWidget.*from/);
});

test('MatchModal computes rankMap from participants', async () => {
  const src = await readFile(path, 'utf8');
  assert.match(src, /rankMap/);
  assert.match(src, /\.sort\(/);
});

test('MatchModal passes rankMap to TeamColumn', async () => {
  const src = await readFile(path, 'utf8');
  assert.match(src, /rankMap=\{rankMap\}/);
});

test('TeamColumn passes rank to ParticipantRow', async () => {
  const src = await readFile(path, 'utf8');
  assert.match(src, /rank=\{/);
});

test('MatchModal no longer renders raw scoreBg badge', async () => {
  const src = await readFile(path, 'utf8');
  assert.doesNotMatch(src, /scoreBg/);
});
```

---

- [ ] **Step 2: Run tests — confirm they fail**

```bash
node --test frontend/src/components/match-modal-rank.test.mjs
```

Expected: failures on all 5 tests (MatchModal has no ScoreWidget import, no rankMap, has scoreBg).

---

- [ ] **Step 3: Update `MatchModal.jsx`**

**3a — Add import at the top of the file (after existing imports, line 5):**

Replace:
```jsx
import ChampionBadge from './ChampionBadge';
```
With:
```jsx
import ChampionBadge from './ChampionBadge';
import ScoreWidget from './ScoreWidget';
```

**3b — Compute `rankMap` in `MatchModal` (after line 38, inside the component before the return):**

The existing code at lines 36–38 is:
```js
  const team1 = (match?.participants ?? []).filter(p => p.team === 1);
  const team2 = (match?.participants ?? []).filter(p => p.team === 2);
  const totalKills = match ? match.team1Kills + match.team2Kills : 0;
```

Replace with:
```js
  const team1 = (match?.participants ?? []).filter(p => p.team === 1);
  const team2 = (match?.participants ?? []).filter(p => p.team === 2);
  const totalKills = match ? match.team1Kills + match.team2Kills : 0;
  const rankMap = {};
  if (match?.participants) {
    [...match.participants]
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .forEach((p, i) => { rankMap[p.summonerName] = i + 1; });
  }
```

**3c — Pass `rankMap` to both `TeamColumn` calls (lines 117–130):**

Replace:
```jsx
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
```
With:
```jsx
              <TeamColumn
                title="Team 1"
                players={team1}
                teamKills={match.team1Kills}
                totalKills={totalKills}
                won={match.team1Won != null ? match.team1Won === true : null}
                rankMap={rankMap}
              />
              <TeamColumn
                title="Team 2"
                players={team2}
                teamKills={match.team2Kills}
                totalKills={totalKills}
                won={match.team1Won != null ? match.team1Won === false : null}
                rankMap={rankMap}
              />
```

**3d — `TeamColumn` accepts and forwards `rankMap` (line 140 and 192–194):**

Replace:
```jsx
function TeamColumn({ title, players, teamKills, totalKills, won }) {
```
With:
```jsx
function TeamColumn({ title, players, teamKills, totalKills, won, rankMap }) {
```

Replace the player cards render (line 192–194):
```jsx
      {players.map((p) => (
        <ParticipantRow key={`${p.team}-${p.summonerName}`} participant={p} teamKills={teamKills} teamColor={color} />
      ))}
```
With:
```jsx
      {players.map((p) => (
        <ParticipantRow
          key={`${p.team}-${p.summonerName}`}
          participant={p}
          teamKills={teamKills}
          teamColor={color}
          rank={rankMap?.[p.summonerName] ?? 10}
        />
      ))}
```

**3e — `ParticipantRow` accepts `rank`, removes `scoreBg`, uses `ScoreWidget` (lines 199–241):**

Replace:
```jsx
function ParticipantRow({ participant, teamKills, teamColor }) {
  const isTracked = TRACKED_GAMERTAGS.has(participant.summonerName);
  const score = participant.score ?? 0;
  const scoreBg = score >= 7 ? 'var(--win)' : score >= 4 ? 'var(--gold)' : 'var(--loss)';
  const kp = teamKills > 0
    ? Math.min(100, Math.round(((participant.kills + participant.assists) / teamKills) * 100))
    : 0;
```
With:
```jsx
function ParticipantRow({ participant, teamKills, teamColor, rank }) {
  const isTracked = TRACKED_GAMERTAGS.has(participant.summonerName);
  const kp = teamKills > 0
    ? Math.min(100, Math.round(((participant.kills + participant.assists) / teamKills) * 100))
    : 0;
```

Replace the score badge (lines 234–240):
```jsx
        <span style={{
          background: scoreBg, color: '#fff',
          fontFamily: 'var(--font-head)', fontSize: '0.65rem',
          padding: '2px 7px', borderRadius: '3px', flexShrink: 0,
        }}>
          {score}
        </span>
```
With:
```jsx
        <ScoreWidget score={participant.score ?? 0} rank={rank} />
```

---

- [ ] **Step 4: Run tests — confirm they all pass**

```bash
node --test frontend/src/components/match-modal-rank.test.mjs
```

Expected output:
```
✔ MatchModal imports ScoreWidget
✔ MatchModal computes rankMap from participants
✔ MatchModal passes rankMap to TeamColumn
✔ TeamColumn passes rank to ParticipantRow
✔ MatchModal no longer renders raw scoreBg badge
ℹ tests 5
ℹ pass 5
ℹ fail 0
```

---

- [ ] **Step 5: Run all tests together**

```bash
node --test frontend/src/components/score-widget.test.mjs frontend/src/components/match-modal-rank.test.mjs
```

Expected: 11 pass, 0 fail.

---

- [ ] **Step 6: Verify the UI builds without errors**

```bash
cd frontend && npm run build
```

Expected: build completes with no errors or warnings about missing imports.

---

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/MatchModal.jsx frontend/src/components/match-modal-rank.test.mjs
git commit -m "feat: integrate ScoreWidget into MatchModal with per-match ranking"
```
