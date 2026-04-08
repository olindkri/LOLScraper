# Champion Icons in Match Detail View — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace plain text champion name in `MatchModal.jsx` with the existing `ChampionBadge` component so participant rows show a 22px icon + name, consistent with the rest of the app.

**Architecture:** Single-file change — add one import and swap one JSX expression. `ChampionBadge` already resolves champions, handles broken images, and renders the icon+name layout. No data or infrastructure changes needed.

**Tech Stack:** React 19, Node built-in test runner (`node --test`), static source analysis tests (no DOM).

---

### Task 1: Write the failing test

**Files:**
- Create: `frontend/src/components/match-modal-champion-icons.test.mjs`

- [ ] **Step 1: Create the test file**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const matchModalPath = new URL('./MatchModal.jsx', import.meta.url);

test('MatchModal imports ChampionBadge', async () => {
  const source = await readFile(matchModalPath, 'utf8');
  assert.match(source, /import ChampionBadge from '\.\/ChampionBadge'/);
});

test('MatchModal renders participant champion through ChampionBadge', async () => {
  const source = await readFile(matchModalPath, 'utf8');
  assert.match(source, /<ChampionBadge[\s\S]*championName=\{participant\.champion\}/);
  assert.match(source, /size=\{22\}/);
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd frontend && node --test src/components/match-modal-champion-icons.test.mjs
```

Expected output: 2 tests FAIL — `MatchModal imports ChampionBadge` and `MatchModal renders participant champion through ChampionBadge`.

---

### Task 2: Implement the change

**Files:**
- Modify: `frontend/src/components/MatchModal.jsx:1` (import line)
- Modify: `frontend/src/components/MatchModal.jsx:215-219` (champion display)

- [ ] **Step 1: Add the ChampionBadge import**

At the top of `MatchModal.jsx`, after the existing imports (line 4), add:

```jsx
import ChampionBadge from './ChampionBadge';
```

So the imports block becomes:

```jsx
import { useEffect, useState } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '../firebase';
import { TRACKED_GAMERTAGS } from '../trackedPlayers';
import ChampionBadge from './ChampionBadge';
```

- [ ] **Step 2: Replace the champion text span**

Find this block (around line 215–219):

```jsx
<span style={{ fontFamily: 'var(--font-head)', fontSize: '0.85rem', color: 'var(--fg)', minWidth: '84px' }}>
  {participant.champion || '—'}
</span>
```

Replace it with:

```jsx
<ChampionBadge
  championName={participant.champion}
  size={22}
  textStyle={{
    color: 'var(--fg)',
    fontFamily: 'var(--font-data)',
  }}
/>
```

---

### Task 3: Verify and commit

- [ ] **Step 1: Run the new test to confirm it passes**

```bash
cd frontend && node --test src/components/match-modal-champion-icons.test.mjs
```

Expected: 2 tests PASS.

- [ ] **Step 2: Run all existing tests to confirm no regressions**

```bash
cd frontend && node --test src/components/scoreboard-champion-icons.test.mjs src/components/scoreboard-expand-toggle.test.mjs src/components/scoreboard-mobile-dots.test.mjs src/components/scoreboard-mobile-columns.test.mjs src/components/scoreboard-rank-display.test.mjs src/champions/catalog.test.mjs src/champions/resolveChampion.test.mjs
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/MatchModal.jsx frontend/src/components/match-modal-champion-icons.test.mjs
git commit -m "feat: add ChampionBadge to MatchModal participant rows"
```
