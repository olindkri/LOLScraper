# Cow Icon Design

**Date:** 2026-04-09
**Status:** Approved

## Problem

The frontend currently uses a single decorative SVG linked from [`frontend/index.html`](../../frontend/index.html). That does not establish a clear brand mark for the app, and it does not cover the browser-specific icon cases the project needs:

- Browser tabs
- Chrome and Firefox bookmarks
- Safari pinned tabs
- Apple saved-site contexts that look for `apple-touch-icon.png`

## Goal

Replace the default favicon with a simple black-and-white cow icon that reads clearly at very small sizes and is delivered in the formats/names browsers expect.

## Chosen Direction

Use a front-facing cow-head silhouette as the primary mark.

Why this direction:

- It is the strongest option at 16px and 32px.
- It reads as "cow" without needing interior detail.
- It can be reused cleanly across SVG, ICO, and PNG outputs.
- It satisfies Safari pinned-tab constraints because it can be rendered as a single-layer monochrome SVG.

## Visual Design

The icon should be intentionally minimal:

- Solid black cow-head silhouette
- Symmetrical or near-symmetrical front view
- Horn and ear outline doing most of the recognition work
- No facial features required in the smallest versions
- White or transparent negative space only

The shape should be optimized for legibility, not realism. If realism competes with clarity at favicon sizes, clarity wins.

## Asset Set

The implementation should produce these files in `frontend/public/`:

- `favicon.svg`
- `favicon.ico`
- `apple-touch-icon.png`
- `safari-pinned-tab.svg`

### `favicon.svg`

Primary scalable icon for modern browsers. This will be the default tab and bookmark asset when SVG favicons are supported.

### `favicon.ico`

Fallback favicon for older browsers and default favicon discovery. The ICO should include at least `16x16`, `32x32`, and `48x48` rasters derived from the same cow-head mark.

### `apple-touch-icon.png`

`180x180` PNG containing the same black cow-head glyph on a plain white background. The filename matters: Apple documents `apple-touch-icon.png` in the site root as the site-wide icon naming convention, and linking it explicitly in the document head removes ambiguity.

### `safari-pinned-tab.svg`

Dedicated monochrome SVG for Safari pinned tabs. This file must follow Safari's archived pinned-tab requirements:

- 100% black vector artwork
- Transparent background
- Single layer
- `viewBox="0 0 16 16"`

## Browser Coverage

### Chrome and Firefox

Use the standard favicon assets:

- `favicon.svg` via `<link rel="icon" type="image/svg+xml" ...>`
- `favicon.ico` as fallback

These cover tab icons and bookmark/favorites usage in the normal desktop browser flow.

### Safari pinned tabs

Add a dedicated mask icon:

```html
<link rel="mask-icon" href="/safari-pinned-tab.svg" color="#111111" />
```

The `color` attribute controls the rendered pin color. A near-black value keeps the appearance aligned with the black-and-white icon direction while avoiding a bright or low-contrast pin color.

### Apple saved-site contexts

Add an Apple touch icon:

```html
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
```

This aligns with Apple's documented root naming convention for a site-wide icon and gives the project the expected Apple-specific icon asset even if the app later gets saved to a Home Screen or similar Apple-managed surface.

## HTML Changes

Update `frontend/index.html` so the head includes:

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="icon" href="/favicon.ico" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="mask-icon" href="/safari-pinned-tab.svg" color="#111111" />
```

The existing favicon line should be replaced rather than duplicated.

## Implementation Approach

Create one master vector cow-head drawing first, then export or derive every output from that source. The preferred workflow is:

1. Draw the icon as a clean monochrome SVG with favicon-scale simplicity.
2. Reuse that geometry for the Safari pinned-tab SVG, adjusted to a `0 0 16 16` viewBox if needed.
3. Rasterize from the same vector source to generate the Apple touch PNG and ICO sizes.
4. Update the document head links in `frontend/index.html`.

This keeps every browser asset visually consistent and avoids the drift that happens when separate icons are designed independently.

## Asset Creation Method

Use a vector-first approach, not an AI-first approach.

Reasoning:

- Tiny browser icons need deliberate shape control.
- The Safari pinned-tab asset has strict monochrome/vector constraints.
- A hand-built silhouette is faster to refine than cleaning up an AI-generated illustration into favicon-safe geometry.

AI can still be used for rough ideation if needed, but the final production assets should be authored as clean vectors.

## Files To Change

- `frontend/index.html`
- `frontend/public/favicon.svg`
- `frontend/public/favicon.ico`
- `frontend/public/apple-touch-icon.png`
- `frontend/public/safari-pinned-tab.svg`

## Verification

Implementation will be considered complete when:

- The app head links point to the new assets.
- `npm` build for the frontend still succeeds.
- The icon appears in a browser tab using the new cow-head mark.
- The Apple touch icon file is present at `/apple-touch-icon.png`.
- The Safari pinned-tab asset is a valid single-layer black SVG with `viewBox="0 0 16 16"`.

## Sources

- Apple Safari Web Content Guide, "Creating Pinned Tab Icons"
- Apple Safari Web Content Guide, "Configuring Web Applications"
- MDN and web.dev guidance on favicon and icon link metadata
