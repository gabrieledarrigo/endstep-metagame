# Backlog

**Date:** 2026-09-26. Derived from [`requirements.md`](./requirements.md) and [`design-system.html`](./design-system.html).

Milestone 1 has sixteen items: four enablers, nine user stories, three hardening items. Milestone 2, at the end of this file, has eight. Each one is meant to be a separate branch and a separate review. Nothing here assumes a single large implementation pass.

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

---

# Milestone 2: deck page and matchup table

**Date:** 2026-10-03. Derived from Draft v3 of the requirements.

Eleven items. Seven enablers, one design item, three user stories. The refactor comes first, so the new pages are written once, on the new structure. The quality gates come right after the move to Vite, so every later item is linted, formatted, tested and checked by CI.

| Wave | Items | Runs in parallel |
|---|---|---|
| 7 | E5, D1 | Yes, two ways |
| 8 | E10 | No |
| 9 | E6, E9 | Yes, two ways |
| 10 | E7 | No |
| 11 | E8 | No |
| 12 | E11, S10, S11 | Yes, three ways |
| 13 | S12 | No |

```
E5 vite ──► E10 checks and CI ─┬─► E6 modules ──► E7 typescript ──► E8 routing ─┬─► S10 deck page
                               │                                                 ├─► S11 matchup table
                               │                                                 └─► E11 tests
                               └─► E9 matchup function ─────────────────────────────► S11
D1 design ──► E8, S10, S12
S10, S11 ──► S12 deck matchups
```

---

## E5. Build with Vite

Covers NFR-1, §4.6 and §4.7. The riskiest item in the milestone.

**Tasks**

1. `package.json`, `vite.config.ts`, a root `tsconfig.json` and `tsconfig.app.json` as NFR-1 describes. React 19 and Recharts 3.10 from npm. The build script is `vite build` alone, since there is no TypeScript yet.
2. Move the CSS to one stylesheet and the script to `src/main.jsx`. Change only the imports and the mount call.
3. Remove the CDN script tags and Babel Standalone.
4. A Vite plugin that serves `/api/metagame/*` through `api/metagame.ts`, with the same rewrite as `vercel.json` and a 5-minute memory cache for successful responses, §4.6. Delete `dev-server.js`.
5. Pin `"framework": "vite"` in `vercel.json`. Keep the proxy rewrite.
6. Deploy a preview and check it before opening the pull request.

**Done when**

- `npm run dev` serves the page with live data, and `npm run build` succeeds.
- The Vercel preview shows what production shows today: 24 cards, 24 rows, three charts.
- The proxy answers on the preview.
- No CDN script tag and no `dev-server.js` remain.

**Blocked by** nothing. **Blocks** E10.

---

## E10. Lint, format, test, and gate the release

Covers NFR-1 and §4.7. Every later item runs against these checks.

**Tasks**

1. ESLint 10 with a flat config: `typescript-eslint` recommended rules, the React Hooks rules, `curly: all` and `eslint-config-prettier`. `npm run lint`.
2. Prettier 3 with its defaults, and a `.prettierignore` for `dist/`, `docs/` and the lockfile. `npm run format` and `npm run format:check`. Reformat the code base in a commit with nothing else in it.
3. Vitest 5, React Testing Library and jsdom. `npm test`.
4. `api/metagame.spec.ts`: the allow-list, the methods, the path parsing and the cache header for each status, with `fetch` stubbed.
5. A smoke spec that renders the app with `fetch` stubbed. The components still live in one module, so this is the only component spec until E11.
6. `.vercelignore` with `api/**/*.spec.ts`, so the specs are not deployed as functions.
7. `.github/workflows/ci.yml` with the `ci` job from NFR-1.
8. Add to `AGENTS.md`: the spec rule, and that `format:check`, `lint`, `test` and `build` pass before every push.
9. The owner adds `ci` as a Deployment Check in the Vercel project, and branch protection on `main` that requires it. Record the outcome in open item 6 of the requirements.

**Done when**

- `ci` passes on the pull request.
- A push that breaks formatting, lint, a test or the build turns `ci` red. Show it once on a throwaway branch.
- After the merge, the production deployment waits for `ci` before it takes the domain.

**Blocked by** E5. **Blocks** E6, E9.

---

## E6. Split into modules

Covers the layout agreed for the refactor and NFR-11. Still JavaScript. No behaviour change beyond the breakpoints.

**Tasks**

1. One module per concern: `src/config`, `src/api`, `src/hooks`, `src/format`, `src/components`, `src/charts`, `src/pages/overview`, `src/App`.
2. `src/styles/index.css` with the layer order from NFR-11, importing `tokens.css`, `base.css` and `layout.css` into their layers. `main.jsx` imports it first.
3. A stylesheet beside each component, named after it, wrapped in `@layer components`, covering only the elements that component renders. Move every rule that more than one component needs to `base` or `layout`.
4. The page wrapper in `layout.css`. The full-width band arrives with its first user, S11.
5. Reduce the media queries to the two boundaries in NFR-11, mobile first. Today's two queries move: the window selector's sideways scroll at 400px, and the scatter labels hidden below 760px. Check each one at its new boundary and record where it landed.
6. Move the shared helpers that sit in the wrong block to a module their callers import: `formatCount`, `MONTHS`, `axisShare`, `tooltipShare`.
7. Remove the duplicate `.chart-section` declaration.

**Done when**

- The page renders and behaves as it does after E5 at 360px, 800px and 1280px, apart from the two moved queries.
- `src/main.jsx` only mounts `App`.
- No module holds more than one concern.
- No rule sits outside a layer, there is no `!important`, element selectors appear only in `base.css`, and media queries use only 640px and 1,100px.

**Blocked by** E10. **Blocks** E7.

---

## E7. Convert to TypeScript

Covers NFR-1.

**Tasks**

1. Types for every response in `src/api/types.ts`, from §3.6, §3.7 and the `/decks` and `/share-series` shapes. Include the gated win and loss block from §6.8.
2. Convert every module to `.ts` or `.tsx`, starting with the data layer.
3. Strict mode. Add the type check to the build script, so a type error fails the build.
4. Fix the `<div>` inside a `<p>` in the deck card skeleton. React's development build reports it.
5. A JSDoc block on every helper as it is typed: hooks, and the formatting and data functions, NFR-1.

**Done when**

- `npm run build` passes in strict mode with no explicit `any` and no `@ts-ignore`.
- ESLint passes.
- Every helper has a JSDoc block.
- The page renders and behaves as it does after E6.

**Blocked by** E6. **Blocks** E8.

---

## E8. Route between pages

Covers FR-1, FR-3, FR-4, FR-10 and §4.5.

**Tasks**

1. React Router 8 in declarative mode, §4.5: `BrowserRouter`, `Routes`, `Link`, `useNavigate` with `replace` for corrected URLs, and `useSearchParams` for `?window=`. Links keep `?window=`.
2. Routes for `/`, `/decks/{slug}` and `/matchups`. The two new pages render a placeholder heading.
3. Rewrites for `/decks/:slug` and `/matchups` in `vercel.json`.
4. Page header with navigation, `aria-current` and the attribution, on every page.
5. Deck cards and table rows link to `/decks/{slug}`.
6. One window state shared by every page.
7. On a route change, scroll to the top and move focus to the page's main heading.
8. A spec beside each component and helper it adds: the page header, the two placeholder pages, and any routing helper. A JSDoc block on each helper.

**Done when**

- Clicking a deck opens its placeholder page with the same window.
- Back returns to the overview without a reload.
- Reloading `/decks/affinity-e93f5f74` and `/matchups` on a Vercel preview loads the page.

**Blocked by** E7, D1. D1 designs the page header. **Blocks** S10, S11, E11.

---

## E9. Aggregate the matchups

Covers §4.4. Server side only, so it runs alongside the refactor.

**Tasks**

1. `api/matchups.ts`: accept only the exact query strings in §4.4, fetch the top 24, fetch their matchups in parallel, keep the top-24 cells.
2. Fill a pair recorded in one direction only from the other direction, §4.4. A gated record gives a gated fill.
3. The response shape in §4.4.
4. Fail the whole request on any upstream failure. 429 returns 429, anything else 502. Timeout per call.
5. `Cache-Control` by status, method rules and CORS headers as the proxy. A 429 is held for 60 seconds, not 10.
6. Put code shared with the proxy in `api/_shared.ts`. Vercel does not deploy a file in `api/` whose name starts with an underscore. Each helper there gets a JSDoc block and a spec in `api/_shared.spec.ts`.
7. Check coverage on all five windows, open item 4 in the requirements. Record the result there.
8. `api/matchups.spec.ts` beside the function: it calls the handler with a plain `Request` and stubbed `fetch`. The dev plugin comes in E5 and is wired up in S11.
9. A JSDoc block on the handler, as `api/metagame.ts` has.

**Done when**

- A preview returns 24 decks and a row of cells for each.
- A bad, repeated, encoded or padded `window`, or an extra parameter, returns 400. A `POST` returns 405.
- A repeat request inside five minutes is an edge cache hit.
- The spec covers each rule in §4.4.

**Blocked by** E10, for Vitest. **Blocks** S11.

---

## D1. Design the deck page and the page header

Covers the appearance of FR-10 and FR-11. Changes `docs/design-system.html` only. The matchup table for FR-12 was designed with the owner on 2026-10-03 and is already in the design system.

**Tasks**

1. Page header with navigation.
2. Deck page layout: header with art, stat tiles, share line with its details table, games table, toss, texture, sample list.
3. The sample list: main deck and sideboard with counts, the line on where it comes from, the copy control, and the `mainOnly` and `withheld` states.
4. The matchups row: the deck's row of the matchup table, below the numbers and the sample list, with its gated cell, loading, and outside-the-top-24 states.
5. A gated value, "too few to call", for tiles and table cells. Reuse the hatch from the matchup table where it fits.
6. Check any new colour for contrast and colour-vision deficiency against the surface.
7. Republish the artifact.

**Done when**

- Every state in FR-10 and FR-11 has a specimen.
- Every new colour has its contrast figure.

**Blocked by** nothing. **Blocks** E8, S10, S12.

---

## S10. Read one deck's numbers

As a Pauper player, I want one deck's numbers in one place, so I can judge it beyond its share and win rate.

Covers FR-11, §6.8 and §6.11.

**Tasks**

1. Fetch `/{format}/decks/{slug}` through the proxy, keyed by slug and window.
2. Header, stat tiles, share line with its details table, games table, toss, texture and the sample list with its copy control, as FR-11 describes.
3. A helper that applies the 20-match rule to any win and loss block, including `deck.matchWinRate`, §6.8. Use it on the overview too.
4. Not-found state for an unknown slug, from a 404 or a proxy 400. Replace the URL through the router when `deck.slug` differs.
5. Empty state for a deck with no matches in the window.
6. Loading, error and 429 states.
7. Confirm what the toss blocks count, open item 5, before labelling them.
8. A spec beside each component and helper it adds, including the 20-match helper. A JSDoc block on each helper.

**Done when**

- Affinity's page shows every section at 30d, the sample list included, and changing the window refetches it.
- The copy control puts a list on the clipboard that MTGO imports.
- An unknown slug shows the not-found state.
- `/decks/renamed-e93f5f74` lands on Affinity with the URL corrected.
- No gated figure reads as 0%.

**Blocked by** E8, D1. **Blocks** S12.

---

## S11. See how the top decks do against each other

As a Pauper player, I want to see which decks beat which, so I can pick a deck for the field I expect.

Covers FR-12 and §6.10.

**Tasks**

1. Serve `/api/matchups` from the Vite dev plugin, behind its memory cache.
2. Fetch the matrix, keyed by window.
3. The table and its cell states, as FR-12 describes.
4. Detail on hover and on keyboard focus. One tab stop for the table, with arrow keys between cells, FR-12.
5. The legend.
6. The full-width band with no scrollbar, the header row that stays in view, and the sideways scroll below the table's width, as the design system shows. The band is a layout primitive, so it goes in `layout.css`, NFR-11.
7. Headers link to the deck pages.
8. The window selector and the resolved window dates.
9. Loading, error and 429 states. No automatic retry, FR-12.
10. A spec beside each component and helper it adds. A JSDoc block on each helper.

**Done when**

- A 24 by 24 table renders at 30d.
- The coloured cells are exactly the cells of clear pairs, as FR-12 defines them.
- A gated pair reads as too few to call.
- Tab enters the table once, arrow keys move between cells, and focus on a cell shows its detail.
- At 1280 px the table has no scrollbar. At 360 px the page does not scroll sideways.

**Blocked by** E8, E9. **Blocks** S12.

---

## S12. See how one deck does against the top 24

As a Pauper player, I want a deck's results against each top deck on its own page, so I can judge it without reading the whole table.

Covers the matchups row in FR-11, and §4.4.

**Tasks**

1. Read `/api/matchups` on the deck page through the hook S11 uses, keyed by window.
2. Render the deck's row with the matchup table's own components: the rotated names, the cells, the legend and the detail. Share them with S11 where they are not shared yet.
3. Leave the deck itself out and keep share order.
4. Scroll sideways below the row's width, with the deck's name in view.
5. One tab stop, with arrow keys between cells, as in FR-12.
6. Loading, error and 429 inside the section only. No automatic retry.
7. The note and link for a deck outside the top 24 in the selected window.
8. A spec beside each component and helper it adds or changes. A JSDoc block on each helper.

**Done when**

- Affinity's page shows 23 cells that match its row on the matchup page.
- Changing the window refetches the row.
- A deck outside the top 24 in the selected window shows the note and the link.
- A failed `/api/matchups` request leaves the numbers and the sample list in place.
- At 360 px the page does not scroll sideways.

**Blocked by** S10, S11, D1. **Blocks** nothing.

---

## E11. Test every exported function

Covers NFR-1: an exported function with a consumer has a spec beside it. E10 set up the tools, and E8, E9, S10 and S11 test what they add. This item covers everything that existed before them.

**Tasks**

1. A spec beside every component that exists after E8, in `src/components`, `src/charts`, `src/pages/overview` and the shell.
2. A spec beside every helper module: the hooks, with `renderHook`, and the formatting and data functions.
3. Query by role and visible text. No snapshots.
4. Cover the states each component has: loading, error, empty, and the 429 copy where it applies.
5. Give the charts a size in jsdom. Recharts' `ResponsiveContainer` measures its parent, which is 0 by 0 there, so without a `ResizeObserver` stub and a sized container the charts render no marks.

**Done when**

- Every module that exports a function with a consumer has a spec beside it.
- `ci` passes.

**Blocked by** E8. **Blocks** nothing.

---

## Notes on sequencing, milestone 2

**E5 first, and check a preview.** If Vercel skips the build, it serves the source `index.html` and the site goes blank. The framework pin prevents that. The preview proves it.

**E10 runs alone.** Prettier rewrites every file once, so anything running beside it conflicts everywhere. That is also why the reformat is a commit of its own.

**E6 and E7 touch every file in `src/`.** E9 runs beside E6 because it touches only `api/`. D1 runs beside E5 because it touches only `docs/`.

**S12 comes last.** It needs S10's page and the matchup table's components from S11, so it waits for both.

**E11 waits for E8.** E8 changes the deck card, the table and the shell, so specs written before it would be rewritten. After E8, E11 adds spec files only, so it runs beside S10 and S11, which add new components.

**E8 gives the stories empty pages.** S10 and S11 then fill a page each and never touch the router, so they can run in parallel.
