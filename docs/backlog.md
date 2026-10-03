# Backlog

**Date:** 2026-09-26. Derived from [`requirements.md`](./requirements.md) and [`design-system.html`](./design-system.html).

Sixteen items. Four enablers, nine user stories, three hardening items. Each one is meant to be a separate branch and a separate review. Nothing here assumes a single large implementation pass.

Every item lists what blocks it, what it blocks, and how to tell it is done.

---

## How the work splits

Two tracks start at the same time and do not touch each other.

- **Track A** is data. E1 then E2. It is the risky track, because it depends on an external API and on Vercel behaving as documented.
- **Track B** is interface. E3 needs no data and no network, so it can be built straight from the design system while Track A is still moving.

The tracks meet at E2. After that, four stories run in parallel, then the three charts run in parallel.

| Wave | Items | Runs in parallel |
|---|---|---|
| 0 | E1, E3 | Yes, two people or two sessions |
| 1 | E2 | No |
| 2 | S1, S2, S3, S7, E4 | Yes, five ways |
| 3 | S4, S5, S6 | Yes, three ways |
| 4 | S8, S9 | Yes, two ways |
| 5 | H1, H2 | Yes |
| 6 | H3 | No |

---

## Dependency map

```
E1 proxy ──► E2 shell ─┬─► S1 summary ─────────────┐
                       ├─► S2 deck grid ──┬─► S8 ──┤
                       ├─► S3 deck table ─┘        │
                       ├─► S7 window               │
                       └─► E4 charts ─┬─► S4 line  ├─► S9 states
                                      ├─► S5 bars  │
                                      └─► S6 scatter ──────┘

E3 primitives ──► feeds E2, S1, S2, S3, S7, E4, S9

S8 and S9 ──► H1 accessibility ─┐
          ──► H2 performance ───┴─► H3 ship
```

---

# Enablers

## E1. Reach the API from our own origin

Not a user story. It exists only because the Endstep API refuses cross-origin requests (§4.1).

**Tasks**

1. Create `api/metagame/[...path].js` as a Vercel function.
2. Forward `GET` and `HEAD` to `https://endstep.cc/api/metagame/v1/...`, preserving the query string.
3. Allow-list the upstream path prefix. Anything outside it returns 400, so the function cannot be used as an open proxy.
4. Return 405 for every other method.
5. Set `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`.
6. Pass upstream status codes through unchanged, including 429 and 5xx.
7. Send no cookies, credentials or client identifying headers upstream.
8. Add `vercel.json` only if routing needs it. Check first.
9. Deploy and verify against the real edge, not only locally.

**Done when**

- A request from an origin other than endstep.cc returns deck JSON with an `access-control-allow-origin` header.
- A repeat request inside five minutes reports a Vercel edge cache hit.
- A path outside the allow-list returns 400.
- A `POST` returns 405.

**Blocked by** nothing. **Blocks** E2.

---

## E2. Application shell and data layer

**Tasks**

1. `index.html` with pinned script tags for React 18.3.1, ReactDOM 18.3.1, react-is 18.3.1, Recharts 3.10.1 and Babel Standalone, with Subresource Integrity and `defer`.
2. Paste the token block from part three of the design system.
3. Mount a React root and a top-level `App`.
4. Data hook that fetches `decks` at `pageSize=24` and `share-series` in parallel, keyed by the current window.
5. Window state in React, synced to the URL query string, defaulting to `30d`.
6. Error normalisation that separates a network failure, a 429 and any other non-2xx.
7. Retry policy: at most two retries, with backoff, and no polling (NFR-4).
8. A temporary panel printing totals and deck count, to make this reviewable. S1 deletes it.

**Done when**

- The page loads and makes exactly two API calls.
- Totals and deck count render from live data.
- Editing `?window=7d` in the address bar refetches and updates those numbers.
- Killing the network shows the error path rather than a blank page.

**Blocked by** E1. **Blocks** S1, S2, S3, S7, E4.

---

## E3. Component primitives

Built from part two of the design system. Needs no data and no network, so it runs alongside E1 and E2.

**Tasks**

1. Panel.
2. Buttons: primary, secondary, ghost, plus disabled and focus states.
3. Colour pips as SVG, driven by the `colours` array, with the visually hidden group label.
4. Segmented control with `aria-pressed`.
5. Stat tile, including the hero variant.
6. Skeleton blocks with the pulse, guarded by `prefers-reduced-motion`.
7. Error panel and empty panel.
8. Check each one against the design system rather than by eye.

**Done when** a temporary section renders every primitive and matches part two of the design system, including focus rings and the disabled state.

**Blocked by** nothing. **Blocks** S1, S2, S3, S7, E4, H1.

---

## E4. Chart foundation

The three charts share more than they differ. Building that shared part once avoids three inconsistent chart implementations.

**Tasks**

1. Wire Recharts from the `Recharts` UMD global and confirm `react-is` is present, since omitting it breaks the bundle at load.
2. Assign the eight series colours to decks by a stable key, not by rank. Toggling a series must not repaint the others.
3. Shared tooltip component, with rows ordered by value.
4. Shared legend with toggle, including the strike-through for a hidden series.
5. Shared axis, grid and baseline styling from the tokens.
6. A `ResponsiveContainer` wrapper with a fixed aspect ratio, so charts do not jump on load.

**Done when** one throwaway line chart renders using our tooltip, our legend and our axis styling, and toggling a series leaves the other colours unchanged.

**Blocked by** E2, E3. **Blocks** S4, S5, S6.

---

# User stories

## S1. See how big the field is and what window I am looking at

As a Pauper player, I want to know how much play the numbers are based on, so I can judge how much to trust them.

Covers FR-2 and NFR-5.

**Tasks**

1. Summary header with registrations as the hero figure, then players, archetypes, window dates and population.
2. Format the dates from `provenance.window.from` and `to`.
3. Attribution line linking to endstep.cc, stating this is not an official Endstep product.
4. Delete the temporary panel from E2.

**Done when** the header shows live figures for the selected window and the E2 debug panel is gone.

**Blocked by** E2, E3. **Blocks** nothing.

---

## S2. Browse the decks as a grid

As a Pauper player, I want to recognise decks visually, so I can scan the field faster than by reading a list.

Covers FR-3.

**Tasks**

1. `DeckCard` component per part two of the design system.
2. Card art from `/api/cards/image?name=...&version=art_crop`, requested directly from endstep.cc and not through the proxy (§3.4).
3. `loading="lazy"` plus `width` and `height` matching the 626:300 crop, so the box is reserved before the image arrives.
4. Colour pips from E3.
5. The three stats in equal columns.
6. Key cards line, pushed to the bottom.
7. Whole card is the link. Target per open item 1 in the requirements.
8. Grid at `auto-fill minmax(228px, 1fr)`.

**Done when** 24 cards render, art loads, the stat rows line up across cards, and nothing shifts as images arrive.

**Blocked by** E2, E3. **Blocks** S8.

---

## S3. Read the decks as a sortable table

As a Pauper player, I want exact figures I can sort, because the grid shows me shape and the table shows me numbers.

Covers FR-4. Also the accessible alternative that NFR-6 depends on.

**Tasks**

1. Table markup with the eight columns from FR-4.
2. Header buttons with `aria-sort`, so sorting is keyboard operable and announced.
3. Client-side sort on deck, share, players, matches and win rate.
4. Tabular numerals and right alignment on every numeric cell.
5. Horizontal scroll container so the page itself never scrolls sideways.
6. Row hover.

**Done when** every column sorts both directions by keyboard alone, and the table holds every value that appears in any chart.

**Blocked by** E2, E3. **Blocks** S8, H1.

---

## S4. See how the field moved over the window

As a Pauper player, I want to see which decks are gaining and losing, so I know what is trending rather than only what is big today.

Covers FR-5.

**Tasks**

1. Line chart over the eight series the API returns.
2. Render `rate: null` days as a gap, never as zero (§6.2). This is the part most likely to be got wrong.
3. Labelled endpoint per series.
4. Legend toggle from E4.
5. Date axis across the full window range.

**Done when** the eight lines render, the pre-2026-09-05 region is empty rather than flat at zero, and toggling a series in the legend leaves the other colours unchanged.

**Blocked by** E4. **Blocks** nothing.

---

## S5. Compare every deck's share at once

As a Pauper player, I want the whole field in one view, including the part that is not a named deck.

Covers FR-6.

**Tasks**

1. Ranked horizontal bars, top 24 plus `Other`.
2. Compute `Other` as `1 − Σ(top 24 shares)`.
3. Label `Other` so it reads as 240 archetypes plus unclassified registrations, never as one deck (§6.1).
4. Value label at the end of each bar.
5. One hue for decks, `--text-400` for `Other`.

**Done when** 25 bars render in share order, the values sum to 100%, and the `Other` label states what it contains.

**Blocked by** E4. **Blocks** nothing.

---

## S6. Tell a good deck from a popular one

As a Pauper player, I want to find decks that win more than their share suggests, because that is how I pick what to play.

Covers FR-7.

**Tasks**

1. Scatter with share on x, match win rate on y.
2. Bubble size from player count, via `ZAxis`.
3. Reference line at 50%.
4. One hue for all markers, with a surface ring so overlapping bubbles stay readable.
5. Direct labels on a selected few, not on all 24.
6. Tooltip showing the confidence bounds, so small differences are not read as real (§6.5).

**Done when** 24 bubbles render, the 50% line is labelled, and the tooltip shows `low` and `high` alongside the rate.

**Blocked by** E4. **Blocks** nothing.

---

## S7. Change the time window

As a Pauper player, I want to switch between a day and a season, because a one-day field and a 30-day field are different questions.

Covers FR-1.

**Tasks**

1. Segmented control from E3, wired to the window state in E2.
2. Keep the URL query string in sync, so a view can be linked.
3. Refetch and re-render every section on change.
4. Busy state on the control while the refetch is in flight.

**Done when** all five windows load, the URL updates, a reload restores the same view, and the control shows it is working during the fetch.

**Blocked by** E2, E3. **Blocks** nothing, but do it before S4 to S6 so the charts are written against a changing window from the start.

---

## S8. See whether a deck is rising or falling

As a Pauper player, I want to know which way a deck is moving, not only where it is now.

Covers FR-8 and the awkward case in §6.3.

**Tasks**

1. Delta component with up, down and unavailable states.
2. Direction carried by the triangle, not the colour.
3. Wire into both the deck card and the table.
4. Handle `reason: "previous_window_empty"` and `reason: "no_previous_window"` with the unavailable state, never a zero.
5. Write the copy for the unavailable case. It is what shows on the default window today.

**Done when** 7d shows real deltas, 30d shows the unavailable state everywhere, and no cell shows a zero or a blank.

**Blocked by** S2, S3. **Blocks** nothing.

---

## S9. Know when the page is loading, empty or broken

As a Pauper player, I want to see what the page is doing, so I can tell a slow load from a failure and know whether to retry.

Covers FR-9. E2 produces the error states and E3 builds the panels. This story is where they get wired into each section.

**Tasks**

1. Skeleton state per section: deck grid, table, and each of the three charts. Each skeleton matches its real content box for box, so nothing shifts when data arrives.
2. `aria-busy="true"` on each loading container.
3. Error panel per section, with a retry control.
4. Distinct copy for a 429, naming the rate limit rather than showing a generic failure.
5. Empty state for a window that returns no decks, offering the action that resolves it.
6. Confirm a failed chart fetch does not take down the rest of the page.

**Done when** each section can be seen in all three states, a throttled network shows skeletons rather than a blank page, and a forced 429 produces the rate limit message rather than a generic error.

**Blocked by** E3, S1, S2, S3, S4, S5, S6. **Blocks** H1.

---

# Hardening

## H1. Accessibility and responsive pass

> **Dropped.** Closed as not planned (#14). Hobby project. The accessibility work was done per story rather than as a pass; the end-to-end audit is what was skipped.

Covers NFR-6 and NFR-7.

**Tasks**

1. Traverse the whole page by keyboard, including sorting and the legend toggles.
2. Confirm every focus state is visible.
3. Audit `aria-sort`, `aria-pressed`, `aria-busy` and the hidden pip labels.
4. Confirm every value in every chart also appears in the table. This is what lets the three low-contrast series hues stay in the palette.
5. Check the layout at 360px. The table scrolls inside its panel, the page does not scroll sideways.
6. Contrast spot-check against the figures in the design system.

**Blocked by** S1 to S9. **Blocks** H3.

---

## H2. Performance and budget check

> **Dropped.** Closed as not planned (#15). The NFR-3 budget stays in the requirements as a note rather than a gate.

Covers NFR-3 and NFR-4.

**Tasks**

1. Measure the transfer size against the 743 KB budget.
2. Confirm the first render makes exactly two API calls.
3. Confirm no layout shift as card art loads.
4. Confirm `defer` on every script.
5. Confirm repeat requests hit the Vercel edge rather than Endstep.
6. Confirm no polling and at most two retries.

**Blocked by** S1 to S9. **Blocks** H3.

---

## H3. Ship

Covers NFR-10 and NFR-5.

**Tasks**

1. Vercel project configuration.
2. Deploy and verify the proxy on the production domain.
3. Attribution copy in place.
4. README covering what the app is, where the data comes from, and how to run it.

**Blocked by** nothing. H1 and H2 were dropped.

---

## Notes on sequencing

**Do E1 first, alone.** It is the only item that can invalidate the architecture. If Vercel's edge cache or the allow-list does not behave as §4.3 assumes, that is better known before anything is built on top.

**E3 is free parallelism.** It touches no network and no data, so it can be built entirely from the design system while E1 and E2 are in progress. It is the natural second track if you want two things moving at once.

**S7 is small but ordering-sensitive.** Adding the window selector after the charts means revisiting all three. Adding it before means they are written against a changing window from the start.

**S8 is deliberately last among the stories.** It touches two surfaces that must exist first, and its most common state today is the unavailable one, which is easier to get right once there is something to put it next to.
