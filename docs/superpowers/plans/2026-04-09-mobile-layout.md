# Mobile Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the scoreboard readable on phone-sized viewports without horizontal scroll, showing rank, player name, win rate, solo rank tier, and last 5 game dots.

**Architecture:** CSS media queries at 640px hide non-essential columns (KDA, CS, Top Champ) and dots 6–15. CSS class names are added to JSX elements as handles; all responsive logic lives in `index.css`. The table's hardcoded `minWidth: 640px` is removed. The header RecordBanner is hidden on mobile and padding is tightened.

**Tech Stack:** React 19, Vite, plain CSS (no Tailwind utilities used for these changes). Tests use Node.js built-in `node:test` runner with source-code regex assertions — no DOM mounting required.

---

## File Map

| File | Change |
|------|--------|
| `frontend/src/components/ScoreboardRow.jsx` | Add `className` props to KDA/CS/Champ `<td>` cells; add `className` prop to `GameDot`; pass `mobile-dot-hidden` for dots at index ≥ 5 |
| `frontend/src/App.jsx` | Add `className` props to KDA/CS/Champ `<th>` headers; remove `minWidth: '640px'` from table; add `className` props to header parts |
| `frontend/src/index.css` | Add `@media (max-width: 640px)` block hiding `.col-kda`, `.col-cs`, `.col-champ`, `.mobile-dot-hidden`, `.header-record`; tighten header padding |
| `frontend/src/components/scoreboard-mobile-dots.test.mjs` | New test: dots at index ≥ 5 have `mobile-dot-hidden` class |
| `frontend/src/components/scoreboard-mobile-columns.test.mjs` | New test: KDA/CS/Champ `<td>` cells have correct class names |

---

## Task 1: Test and implement mobile-hidden dot classes

**Files:**
- Create: `frontend/src/components/scoreboard-mobile-dots.test.mjs`
- Modify: `frontend/src/components/ScoreboardRow.jsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/scoreboard-mobile-dots.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const path = new URL('./ScoreboardRow.jsx', import.meta.url);

test('GameDot accepts a className prop and applies it to the span', async () => {
  const source = await readFile(path, 'utf8');
  // GameDot destructures className
  assert.match(source, /function GameDot\(\s*\{[^}]*className[^}]*\}\s*\)/);
  // className is spread onto the span
  assert.match(source, /className=\{className\}/);
});

test('dots at index >= 5 receive mobile-dot-hidden class', async () => {
  const source = await readFile(path, 'utf8');
  assert.match(source, /i >= 5[^']*'mobile-dot-hidden'/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd frontend && node --test src/components/scoreboard-mobile-dots.test.mjs
```

Expected: both tests FAIL — `GameDot` doesn't yet accept `className` and the map doesn't pass the class.

- [ ] **Step 3: Implement — update `GameDot` and the dots render in `ScoreboardRow.jsx`**

In `ScoreboardRow.jsx`, change `GameDot` from:
```jsx
function GameDot({ result }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '10px',
        height: '10px',
        borderRadius: '2px',
        backgroundColor: result === 'win' ? 'var(--win)' : 'var(--loss)',
        flexShrink: 0,
      }}
      title={result}
    />
  );
}
```

To:
```jsx
function GameDot({ result, className }) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        width: '10px',
        height: '10px',
        borderRadius: '2px',
        backgroundColor: result === 'win' ? 'var(--win)' : 'var(--loss)',
        flexShrink: 0,
      }}
      title={result}
    />
  );
}
```

And change the dots render from:
```jsx
games.slice(0, 15).map((g, i) => <GameDot key={i} result={g.result} />)
```

To:
```jsx
games.slice(0, 15).map((g, i) => (
  <GameDot key={i} result={g.result} className={i >= 5 ? 'mobile-dot-hidden' : undefined} />
))
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd frontend && node --test src/components/scoreboard-mobile-dots.test.mjs
```

Expected: both tests PASS.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/ScoreboardRow.jsx src/components/scoreboard-mobile-dots.test.mjs
git commit -m "feat: add mobile-dot-hidden class to game dots 6-15"
```

---

## Task 2: Test and implement column class names on `<td>` cells

**Files:**
- Create: `frontend/src/components/scoreboard-mobile-columns.test.mjs`
- Modify: `frontend/src/components/ScoreboardRow.jsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/scoreboard-mobile-columns.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const path = new URL('./ScoreboardRow.jsx', import.meta.url);

test('KDA td has class col-kda', async () => {
  const source = await readFile(path, 'utf8');
  assert.match(source, /className="col-kda"/);
});

test('CS td has class col-cs', async () => {
  const source = await readFile(path, 'utf8');
  assert.match(source, /className="col-cs"/);
});

test('Top Champ td has class col-champ', async () => {
  const source = await readFile(path, 'utf8');
  assert.match(source, /className="col-champ"/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd frontend && node --test src/components/scoreboard-mobile-columns.test.mjs
```

Expected: all three tests FAIL.

- [ ] **Step 3: Implement — add className to KDA, CS, Top Champ `<td>` cells in `ScoreboardRow.jsx`**

Change the KDA `<td>` from:
```jsx
<td style={{ padding: '14px 12px', width: '60px' }}>
  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--fg)' }}>
    {avgKda}
  </span>
  <div style={{ fontSize: '0.6rem', color: 'var(--fg-dim)', fontFamily: 'var(--font-mono)' }}>KDA</div>
</td>
```

To:
```jsx
<td className="col-kda" style={{ padding: '14px 12px', width: '60px' }}>
  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--fg)' }}>
    {avgKda}
  </span>
  <div style={{ fontSize: '0.6rem', color: 'var(--fg-dim)', fontFamily: 'var(--font-mono)' }}>KDA</div>
</td>
```

Change the CS `<td>` from:
```jsx
<td style={{ padding: '14px 12px', width: '60px' }}>
  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--fg)' }}>
    {avgCs}
  </span>
  <div style={{ fontSize: '0.6rem', color: 'var(--fg-dim)', fontFamily: 'var(--font-mono)' }}>CS/G</div>
</td>
```

To:
```jsx
<td className="col-cs" style={{ padding: '14px 12px', width: '60px' }}>
  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--fg)' }}>
    {avgCs}
  </span>
  <div style={{ fontSize: '0.6rem', color: 'var(--fg-dim)', fontFamily: 'var(--font-mono)' }}>CS/G</div>
</td>
```

Change the Top Champ `<td>` from:
```jsx
<td style={{ padding: '14px 20px 14px 12px' }}>
```

To:
```jsx
<td className="col-champ" style={{ padding: '14px 20px 14px 12px' }}>
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd frontend && node --test src/components/scoreboard-mobile-columns.test.mjs
```

Expected: all three tests PASS.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/ScoreboardRow.jsx src/components/scoreboard-mobile-columns.test.mjs
git commit -m "feat: add col-kda/col-cs/col-champ classes to scoreboard td cells"
```

---

## Task 3: Add column class names to `<th>` headers in `App.jsx`

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Add className to KDA, CS, Top Champ `<th>` headers**

In `App.jsx`, change:
```jsx
<th style={{ padding: '10px 12px', textAlign: 'left', width: '60px' }}>KDA</th>
<th style={{ padding: '10px 12px', textAlign: 'left', width: '60px' }}>CS</th>
<th style={{ padding: '10px 20px 10px 12px', textAlign: 'left' }}>Top Champ</th>
```

To:
```jsx
<th className="col-kda" style={{ padding: '10px 12px', textAlign: 'left', width: '60px' }}>KDA</th>
<th className="col-cs" style={{ padding: '10px 12px', textAlign: 'left', width: '60px' }}>CS</th>
<th className="col-champ" style={{ padding: '10px 20px 10px 12px', textAlign: 'left' }}>Top Champ</th>
```

- [ ] **Step 2: Remove `minWidth` from the table**

Change:
```jsx
<table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
```

To:
```jsx
<table style={{ width: '100%', borderCollapse: 'collapse' }}>
```

- [ ] **Step 3: Add className to the RecordBanner wrapper**

Change:
```jsx
<div style={{ paddingLeft: '16px', paddingTop: '8px', paddingBottom: '8px' }}>
  <RecordBanner records={records} />
</div>
```

To:
```jsx
<div className="header-record" style={{ paddingLeft: '16px', paddingTop: '8px', paddingBottom: '8px' }}>
  <RecordBanner records={records} />
</div>
```

- [ ] **Step 4: Add className to the header root element**

Change:
```jsx
<header style={{
  background: 'var(--surface)',
  borderBottom: '1px solid var(--border)',
  padding: '0 24px',
  display: 'flex',
  alignItems: 'center',
  gap: '0',
  flexWrap: 'wrap',
  minHeight: '96px',
}}>
```

To:
```jsx
<header className="app-header" style={{
  background: 'var(--surface)',
  borderBottom: '1px solid var(--border)',
  padding: '0 24px',
  display: 'flex',
  alignItems: 'center',
  gap: '0',
  flexWrap: 'wrap',
  minHeight: '96px',
}}>
```

- [ ] **Step 5: Run existing tests to confirm nothing broke**

```bash
cd frontend && node --test src/components/scoreboard-mobile-dots.test.mjs src/components/scoreboard-mobile-columns.test.mjs src/components/scoreboard-expand-toggle.test.mjs src/components/scoreboard-rank-display.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
cd frontend && git add src/App.jsx
git commit -m "feat: add mobile CSS class handles to header and table th elements"
```

---

## Task 4: Add mobile CSS rules to `index.css`

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Add the mobile media query block**

Append to the bottom of `frontend/src/index.css`:

```css
@media (max-width: 640px) {
  /* Hide non-essential scoreboard columns */
  .col-kda,
  .col-cs,
  .col-champ {
    display: none;
  }

  /* Hide game dots 6–15, show only first 5 */
  .mobile-dot-hidden {
    display: none;
  }

  /* Hide record banner — not enough space */
  .header-record {
    display: none;
  }

  /* Tighten header padding */
  .app-header {
    padding: 0 12px;
    min-height: unset;
  }
}
```

- [ ] **Step 2: Run all tests**

```bash
cd frontend && node --test src/components/scoreboard-mobile-dots.test.mjs src/components/scoreboard-mobile-columns.test.mjs src/components/scoreboard-expand-toggle.test.mjs src/components/scoreboard-rank-display.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 3: Manual smoke test on mobile viewport**

Run the dev server:
```bash
cd frontend && npm run dev
```

Open DevTools → Toggle device toolbar → set to iPhone 14 Pro (393px wide). Verify:
- No horizontal scroll on the scoreboard table
- 4 columns visible: `#`, `Player`, `Win Rate`, `Last 5 Games`
- Header shows logo + win% + W/L counts without RecordBanner
- Tapping a row still expands game history (scrolls internally)

- [ ] **Step 4: Commit**

```bash
cd frontend && git add src/index.css
git commit -m "feat: add mobile responsive CSS — hide columns, show 5 dots, tighten header"
```
