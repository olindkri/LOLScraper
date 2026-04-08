# Mobile Layout Design

**Date:** 2026-04-09
**Status:** Approved

## Problem

On phone-sized viewports (~390px wide), the scoreboard table forces horizontal scroll because of a hardcoded `minWidth: 640px`. The header also wraps awkwardly due to uncontrolled `flexWrap`. Users can't read the table without scrolling sideways.

## Goal

Make the scoreboard fully readable on mobile without horizontal scroll, showing only the information that matters: group win rate, individual ranking, win rate, and solo rank tier.

---

## Breakpoint

`640px` — matches the existing `minWidth` value. All changes use `@media (max-width: 640px)` CSS or inline conditional rendering.

---

## Scoreboard Table

### Root cause fix
Remove `minWidth: 640px` from the `<main>` table. The table will be allowed to shrink to viewport width.

### Visible columns on mobile

| Column | Desktop | Mobile |
|--------|---------|--------|
| # (rank) | ✓ | ✓ |
| Player (name + rank tier) | ✓ | ✓ |
| Win Rate (% + bar + W/L) | ✓ | ✓ |
| Last N Games (dots) | 15 dots | 5 dots |
| KDA | ✓ | hidden |
| CS | ✓ | hidden |
| Top Champ | ✓ | hidden |

### Game dots
Render all 15 dots in the DOM. Dots 6–15 get `display: none` on mobile via a CSS class. This avoids conditional rendering logic and keeps the component simple.

### Column hiding
Apply `display: none` to the `<th>` and `<td>` elements for KDA, CS, and Top Champ at the mobile breakpoint. Add a CSS class to each (e.g., `.col-kda`, `.col-cs`, `.col-champ`) to target them cleanly.

### Rank tier label
Already sits in the Player cell below the display name — no change needed. It's `whiteSpace: nowrap` which is fine at 4-column width.

---

## Header

### Desktop (unchanged)
Logo | Win% + W/L counts + bar | RecordBanner | timestamp — all in one flex row.

### Mobile layout
Two-row stacked layout:

**Row 1:** Logo (left) + Win% big number + W/L counts (right side)
**Row 2:** Win rate bar (full width) + timestamp (right-aligned)

- RecordBanner hidden on mobile
- Padding reduced from `24px` to `12px` horizontal
- Logo divider (`borderRight`) removed on mobile (no room)
- Win% font size reduced from `2rem` to `1.5rem` on mobile

---

## Expanded Row

The tap-to-expand game history inner table already has `overflowX: auto` — it scrolls independently on mobile. No changes needed.

---

## Implementation Approach

All responsive logic via CSS media queries added to `index.css`. Inline styles in JSX components get companion CSS classes where needed. No new components required.

Files to change:
- `frontend/src/index.css` — add `@media (max-width: 640px)` rules
- `frontend/src/App.jsx` — add CSS class names to header elements; reduce table `minWidth`
- `frontend/src/components/ScoreboardRow.jsx` — add CSS class names to `<th>`/`<td>` cells; render 15 dots with classes on dots 6–15
