# Score Widget — Match Detail View

**Date:** 2026-04-10

## Overview

Replace the flat score badge in `ParticipantRow` (MatchModal) with a compact circular arc gauge widget. The widget displays the player's performance score (0–100) and their rank among all 10 participants in the match.

---

## Component Structure

### New component: `ScoreWidget`

Props:
- `score` — raw 0–10 float from `participant.score`
- `rank` — 1-based integer position among all 10 participants, sorted by score descending

**Location:** new file `frontend/src/components/ScoreWidget.jsx`

Replaces the `<span>` score badge at `MatchModal.jsx:234–240`.

### Rank computation (in `MatchModal`)

Before rendering participant rows, sort all participants by `score` descending and assign each a 1-based rank:

```js
const rankMap = {};
[...match.participants]
  .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  .forEach((p, i) => { rankMap[p.summonerName] = i + 1; });
```

Pass `rank={rankMap[participant.summonerName]}` to each `ParticipantRow`, which forwards it to `ScoreWidget`.

### Rank label mapping

| Rank | Label |
|------|-------|
| 1    | MVP   |
| 2    | 2nd   |
| 3    | 3rd   |
| 4    | 4th   |
| …    | …     |
| 10   | 10th  |

---

## Visual Layout

The widget is ~68px wide × ~40px tall, placed inline at the right end of Row 1 in `ParticipantRow` (where the badge currently lives).

**Left portion — text:**
- Large display number: `Math.round(score * 10)` rendered in `var(--font-head)`, ~1.1rem
- Rank label below: e.g. `"MVP"`, `"2nd"` in `var(--font-data)`, ~0.6rem, color `var(--fg-muted)`

**Right portion — SVG gauge (40×40px):**
- 270° arc gauge with the gap at the bottom
- Background track ring + active fill arc + dark center circle

Both portions share a dark pill background (`var(--surface)`, border-radius 20px, padding `4px 6px 4px 10px`).

---

## SVG Arc Mechanics

- `viewBox="0 0 40 40"`, `width=40`, `height=40`
- Circle: `r=14`, `cx=20`, `cy=20`
- Circumference: `2π × 14 ≈ 87.96px`
- 270° arc length: `(270/360) × 87.96 ≈ 65.97px`

### Background track

```
stroke-dasharray: 65.97 87.96
transform: rotate(-225deg) (transform-origin: center)
stroke: var(--border)
stroke-width: 3.5
stroke-linecap: round
fill: none
```

### Active fill arc

Same `stroke-dasharray` as the track. Offset controls fill:

```
stroke-dashoffset: 65.97 × (1 - score / 10)
```

- Full score (10/10): offset = 0 → full arc
- Zero score (0/10): offset = 65.97 → no arc

```
stroke: <score color>
stroke-width: 3.5
stroke-linecap: round
fill: none
transition: stroke-dashoffset 400ms ease
```

### Center button circle

```
r=10, cx=20, cy=20
fill: var(--surface)
```

### Score color

| Condition         | Color          | CSS variable  |
|-------------------|----------------|---------------|
| score × 10 ≥ 70  | Green          | `var(--win)`  |
| score × 10 ≥ 40  | Gold/orange    | `var(--gold)` |
| score × 10 < 40  | Red            | `var(--loss)` |

---

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/components/ScoreWidget.jsx` | New component |
| `frontend/src/components/MatchModal.jsx` | Compute rank map, pass `rank` to `ParticipantRow`, swap badge for `<ScoreWidget>` |

---

## Out of Scope

- No changes to the scoreboard or any other view
- No changes to how `score` is computed (backend unchanged)
- No changes to other participant row stats (KDA, CS, KP bar)
