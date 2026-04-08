---
title: Champion Icons in Match Detail View
date: 2026-04-09
status: approved
---

## Overview

Add champion icons to participant rows in the match detail modal (`MatchModal.jsx`), replacing the current plain text champion name display with the existing `ChampionBadge` component.

## Current State

`MatchModal.jsx:218` renders champion as plain text:
```jsx
{participant.champion || '—'}
```

`ChampionBadge` is already used in `ScoreboardRow` for game history rows but has not been integrated into `MatchModal`.

## Design

Replace the plain text with `ChampionBadge` using the following props:

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

- **Size:** 22px — slightly larger than the 18px used in `ScoreboardRow` to suit the modal's more spacious card layout
- **Text style:** Matches the app-wide champion badge convention (`--fg` color, `--font-data` font)
- **Data:** `participant.champion` is already the display name (e.g. `"Ahri"`) — no data changes required
- **Fallback:** `ChampionBadge` already handles unknown champions gracefully via `resolveChampion()`, showing `—` if resolution fails

## Changes Required

1. Add `ChampionBadge` import to `MatchModal.jsx`
2. Replace `{participant.champion || '—'}` with the `<ChampionBadge>` element above

## Out of Scope

- No changes to data fetching, Firebase schema, or scraper
- No changes to other components
