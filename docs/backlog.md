# Backlog

**Date:** 2026-09-26. Derived from [`requirements.md`](./requirements.md) and [`design-system.html`](./design-system.html).

Milestone 1 has sixteen items: four enablers, nine user stories, three hardening items. Milestones 2, 3 and 4 follow at the end of this file. Each one is meant to be a separate branch and a separate review. Nothing here assumes a single large implementation pass.

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

Twelve items. Eight enablers, one design item, three user stories. The refactor comes first, so the new pages are written once, on the new structure. The quality gates come right after the move to Vite, so every later item is linted, formatted, tested and checked by CI.

| Wave | Items | Runs in parallel |
|---|---|---|
| 7 | E5, D1 | Yes, two ways |
| 8 | E10 | No |
| 9 | E6, E9 | Yes, two ways |
| 10 | E7 | No |
| 11 | E8 | No |
| 12 | E12 | No |
| 13 | E11, S10, S11 | Yes, three ways |
| 14 | S12 | No |

```
E5 vite ──► E10 checks and CI ─┬─► E6 modules ──► E7 typescript ──► E8 routing ──► E12 data and view ─┬─► S10 deck page
                               │                                                                       ├─► S11 matchup table
                               │                                                                       └─► E11 tests
                               └─► E9 matchup function ───────────────────────────────────────────────────► S11
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
3. Strict mode. Add the type check to the build script, so a type error fails the build. TypeScript stays on 6.0, NFR-1. Give `vite.config.ts` a tsconfig of its own, since the root one covers `api/` only.
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

**Blocked by** E7, D1. D1 designs the page header. **Blocks** E12.

---

## E12. Cache the data and keep the view in the address

Covers §4.5, §4.8, FR-4, FR-5, NFR-3 and NFR-4.

Back should return to a page as the reader left it, and a link should open it fresh. E8 already restores the scroll position and the window. This item restores the rest: the data, without a loading state, and the view.

**Tasks**

1. Add TanStack Query 5. One query client for the app, with the policy in §4.8: a response stays fresh for five minutes, nothing refetches when the browser window regains focus, and a network error, a 429 or a 5xx is retried at most twice, after 400 ms and then 800 ms.
2. Replace `useResource` with `useQuery`, keyed by what each request reads: `["decks", window]`, `["series", window]`, `["deck", slug, window]`. Pass the query's signal to `fetch`, so a request the page no longer needs is cancelled. Delete `useResource`.
3. Reduce `getJson` to one request. It turns a failed status into an `ApiError` with its kind and status, and leaves the retries to the query client.
4. `Section` reads the query result. A retry after an error shows the skeleton again.
5. The deck table's sort in `sort` and `dir`, and the share chart's hidden series in `hide`, one deck slug per parameter. A change replaces the history entry. The default view leaves the parameters out.
6. A test helper that renders with a fresh query client. Specs for the retry rule, and for the sort and the hidden series in the address. Update the smoke spec, since a window seen in the last five minutes now renders at once.

**Done when**

- Back from a deck page shows the overview at once, with no skeleton and no request, and with the sort and the hidden series the reader left.
- The header's Overview link opens the overview sorted by share, descending, with every series shown.
- Reloading keeps the sort and the hidden series.
- Sorting the table and then pressing Back leaves the page, rather than undoing the sort.

**Blocked by** E8. **Blocks** E11, S10, S11.

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

1. Read the deck detail through the deck page's query, which E8 added and E12 keys by slug and window.
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

**Blocked by** E12, D1. **Blocks** S12.

---

## S11. See how the top decks do against each other

As a Pauper player, I want to see which decks beat which, so I can pick a deck for the field I expect.

Covers FR-12 and §6.10.

**Tasks**

1. Serve `/api/matchups` from the Vite dev plugin, behind its memory cache. Forward the raw query string unchanged, because §4.4 matches it byte for byte.
2. Fetch the matrix with a query keyed by window, with its retries turned off, FR-12.
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

**Blocked by** E12, E9. **Blocks** S12.

---

## S12. See how one deck does against the top 24

As a Pauper player, I want a deck's results against each top deck on its own page, so I can judge it without reading the whole table.

Covers the matchups row in FR-11, and §4.4.

**Tasks**

1. Read `/api/matchups` on the deck page through the query S11 uses, keyed by window.
2. Render the deck's row with the matchup table's own components: the rotated names, the cells, the legend and the detail. Share them with S11 where they are not shared yet.
3. Find the row by `deck.id` from the deck detail, not by the slug in the address. Leave the deck itself out and keep share order.
4. Print the row's own dates when its window differs from the detail's.
5. Scroll sideways below the row's width, with the deck's name in view.
6. One tab stop, with arrow keys between cells and to the headers, as in FR-12.
7. Loading, error and 429 inside the section only. No automatic retry.
8. The note and link for a deck outside the top 24 in the selected window.
9. A spec beside each component and helper it adds or changes. A JSDoc block on each helper.

**Done when**

- Affinity's page shows 23 cells that match its row on the matchup page, also when opened through a stale slug.
- Changing the window refetches the row.
- A deck outside the top 24 in the selected window shows the note and the link.
- A failed `/api/matchups` request leaves the numbers and the sample list in place.
- At 360 px the page does not scroll sideways.

**Blocked by** S10, S11, D1. **Blocks** nothing.

---

## E11. Test every exported function

Covers NFR-1: an exported function with a consumer has a spec beside it. E10 set up the tools, and E8, E9, E12, S10 and S11 test what they add. This item covers everything that existed before them.

**Tasks**

1. A spec beside every component that exists after E12, in `src/components`, `src/charts`, `src/pages/overview` and the shell.
2. A spec beside every helper module: the hooks, with `renderHook`, and the formatting and data functions.
3. Query by role and visible text. No snapshots.
4. Cover the states each component has: loading, error, empty, and the 429 copy where it applies.
5. Give the charts a size in jsdom. Recharts' `ResponsiveContainer` measures its parent, which is 0 by 0 there, so without a `ResizeObserver` stub and a sized container the charts render no marks.

**Done when**

- Every module that exports a function with a consumer has a spec beside it.
- `ci` passes.

**Blocked by** E12. **Blocks** nothing.

---

## Notes on sequencing, milestone 2

**E5 first, and check a preview.** If Vercel skips the build, it serves the source `index.html` and the site goes blank. The framework pin prevents that. The preview proves it.

**E10 runs alone.** Prettier rewrites every file once, so anything running beside it conflicts everywhere. That is also why the reformat is a commit of its own.

**E6 and E7 touch every file in `src/`.** E9 runs beside E6 because it touches only `api/`. D1 runs beside E5 because it touches only `docs/`.

**S12 comes last.** It needs S10's page and the matchup table's components from S11, so it waits for both.

**E11 waits for E8 and E12.** E8 changes the deck card, the table and the shell, and E12 replaces the data hook, so specs written before them would be rewritten. After E12, E11 adds spec files only, so it runs beside S10 and S11, which add new components.

**E12 comes before the pages.** S10, S11 and S12 read their data through the queries it sets up, so they are written once, on the final data layer.

**E8 gives the stories empty pages.** S10 and S11 then fill a page each and never touch the router, so they can run in parallel.

---

# Milestone 3: connected pages

**Date:** 2026-10-13. Derived from Draft v4 of the requirements. D3 and S18 were added on 2026-10-14, from Draft v5. D4, S19, S20 and S21 were added on 2026-10-17, from Draft v6. D5, E13, S22, S23 and S24 were added the same day, from Draft v7, and E14 from Draft v8. H4 was added the same day, and H5 on 2026-10-18, from Draft v9.

Twenty items. Four design items, two enablers, twelve user stories and two hardening items. Two stories, the enablers and H4 need no design and start at once. H5's design is done, and it waits only for the footer's mark component, S24. The others wait for D2, D3, D4 or D5, because each changes how a page looks, and the owner chooses the design first.

| Wave | Items | Runs in parallel |
|---|---|---|
| 15 | D2, D3, S13, S14 | Yes, four ways |
| 16 | S16, S17, S18 | Yes, three ways |
| 17 | S15 | No |
| 18 | D4 | No |
| 19 | S19, S20, S21 | Yes, three ways |
| 20 | D5, E13, E14, H4 | Yes, four ways |
| 21 | S22, S23, S24 | Yes, three ways |
| 22 | H5 | No |

```
D2 design ─┬─► S16 find a deck in the matchup table ──► S15 matchup table on a phone
           ├─► S17 cards or table on the overview
           └─► S15
D3 design ──► S18 light and dark theme ──┬─► S20 highlight a deck in Share over time
                                         └─► S21 show the pointed deck on the charts
D4 design ──┬─► S19 search for any deck
            ├─► S20
            └─► S21
D5 design ──┬─► S22 install as an app
            ├─► S23 a preview per deck
            └─► S24 the footer ──► H5 the mark in the header
E13 metadata and headers ──► S23
E14 art from Scryfall ──► S23
H4 the deck page's tables
S13 every page kept on a window change
S14 charts open the deck pages
```

---

## D2. Design the phone matchup view, the deck highlight and the overview's switch

Covers open items 7, 8 and 9 in the requirements. Changes `docs/design-system.html`, with the owner choosing between proposals, and then writes the chosen behaviour into `docs/requirements.md`. No code.

**Tasks**

1. The matchup table below 640px: one or more proposals, with their trade-offs, for reading it on a phone.
2. A deck named in the address on the matchup table: how its row and column stand out, and where the page scrolls. The hover crosshair on desktop.
3. The overview's switch between the cards and the table: where it sits, what it looks like, and what each view keeps.
4. Check any new colour for contrast and colour-vision deficiency against the surface.
5. Turn the chosen designs into FR-12, FR-3 and FR-4, and settle open items 7, 8 and 9.
6. Republish the artifact.

**Done when**

- Each chosen design has a specimen, with its states.
- FR-3, FR-4 and FR-12 describe the behaviour, and open items 7, 8 and 9 are settled.

**Blocked by** nothing. **Blocks** S15, S16, S17.

---

## D3. Design the dark theme and its toggle

Covers FR-13 and open item 10 in the requirements. Changes `docs/design-system.html`, with the owner choosing between palettes, and then writes the chosen values into NFR-1a. No code.

**Tasks**

1. Three dark palettes, none near black and none at the light theme's 19:1 text contrast. Each covers the neutrals, the primary blue and its wash, up and down, the matchup fills, the eight chart hues and the sequential blue.
2. Check each palette against its own surface: 4.5:1 for text, 3.5:1 for labels, 3:1 for every chart hue, and the chart hues' separation under protanopia, deuteranopia and normal vision. Re-check what fades by opacity on the dark surface: the spotlight's faded cells, NFR-6, and the dimmed loading states.
3. Name tokens for the colours that are literals today: the hover fills, the primary hover, the table row hover and the tooltip shadow.
4. The toggle: its icon, size and states, with a look that shows the current theme, and the site header at 360px, 640px and wide.
5. Specimens of the components in the chosen palette.
6. Write the chosen palette into NFR-1a, settle open item 10, and republish the artifact.

**Done when**

- The design system specifies both palettes and the toggle, with specimens.
- NFR-1a and open item 10 name the chosen palette.

**Blocked by** nothing. **Blocks** S18.

---

## D4. Design the deck search, the share chart's highlight and the chart hover

Covers FR-5, FR-6, FR-7 and FR-14 in the requirements. The owner chose the options on 2026-10-17: search as a filter on the overview, the legend's highlight in place of hiding, and the hover on both deck charts. Changes `docs/design-system.html` and `docs/requirements.md`. No code.

**Tasks**

1. Deck search: the field, its clear button, the result line, the "Show more" button and the no-results panel, with their states. A 14px gap between the field, the line and the decks.
2. Share over time: the legend's highlight, which replaces hiding. The highlighted line, the faded lines and labels, and the pressed legend entry.
3. Hover on the ranked bars and the scatter: the underlined name or label, and the `--seq-600` fill.
4. Check the faded lines' contrast in both themes, and record the exception under NFR-6.
5. Write FR-14 and the changes to FR-5, FR-6, FR-7, §3, §4.5, NFR-4 and §8.
6. Republish the artifact.

**Done when**

- Each design has a specimen with its states, in both themes.
- The requirements describe the search, the highlight and the hover.

**Blocked by** nothing. **Blocks** S19, S20, S21.

---

## D5. Design the site mark, the icon set, the site card and the footer

Covers FR-15, FR-16 and NFR-5. The owner chose on 2026-10-17: the ranked-bars mark, M1, which they are refining; the two-column footer, F1; and art-only deck previews. Changes `docs/design-system.html`. No code.

**Tasks**

1. The site mark from the owner's final SVG, in both themes, with its sizes and its clear space.
2. The icon set: the SVG favicon, the 32px ICO, the 180px Apple touch icon, and the 192px, 512px and maskable 512px app icons. The app's short name for the home screen.
3. The site card: the 1200 by 630 image shared by every page but the deck pages.
4. The footer, F1: the site and its author on one side, the notices on the other, stacked below 640px, in both themes.
5. Add the icons and the site card to the repository's `public/` folder, ready for S22 and S23.
6. Republish the artifact.

**Done when**

- The design system specifies the mark, the icons, the site card and the footer, with specimens in both themes.
- The icon files and the site card are in `public/`.

**Blocked by** nothing. **Blocks** S22, S23, S24.

---

## E13. Add the page description, the asset cache and the security headers

Covers FR-15's text tags and §4.7. Needs no design.

**Tasks**

1. In `index.html`: the description, and the Open Graph and `summary_large_image` Twitter card text tags, with no canonical link and no `og:url`. `robots.txt` in `public/`.
2. In `vercel.json`: `public, max-age=31536000, immutable` for `/assets/*`.
3. In `vercel.json`: the security headers of §4.7, with the inline theme script allowed by its hash.
4. Check on a production build that every page, chart, card image and the theme script still load with the policy on.

**Done when**

- A shared link to the site shows its title and description.
- A second visit loads the hashed files from the browser cache, with no request.
- The response headers carry the policy, and the browser console reports no violation on any page.

**Blocked by** nothing. **Blocks** S23.

---

## E14. Serve the card art straight from Scryfall

Covers §3.4, §4.3, FR-3, FR-11, NFR-4 and open item 11, settled by the owner on 2026-10-17. Needs no design.

**Tasks**

1. In `api/metagame.ts`, for a successful `GET` of a deck list or a deck detail: one `POST /cards/collection` to Scryfall with the key card names, a one-second bound, the `User-Agent` and `Accept` headers of §4.3, and `art.imageUrl` added to each deck it resolves, from `image_uris.art_crop` or the first face's. Match names ignoring case, against the full name or either face.
2. Remember each card's address, and each name not found, in the instance's memory. After a 429, send Scryfall nothing for 30 seconds.
3. On a failure, a timeout or a 429: send the response without the missing addresses, with `s-maxage=60`, and no retry. A name not found keeps the usual cache time.
4. In the client, `artSource` takes the deck's art: `art.imageUrl`, or Endstep's endpoint with `version=art_crop` when it is missing. The deck card, the deck hero and the search results use it.
5. A spec beside each function and helper it changes: the request, the name matching for both faces, a name not found, the fallback, the 429 and its pause, `HEAD`, and the cache header.

**Done when**

- Every top-24 card that Scryfall finds loads its art from `cards.scryfall.io`, and a card it doesn't find falls back to Endstep's endpoint.
- With Scryfall's API unreachable, every card still shows its art, through Endstep's endpoint. Scryfall's CDN being down is out of reach: Endstep's endpoint redirects there too.
- No response waits more than a second on Scryfall.

**Blocked by** nothing. **Blocks** S23.

---

## S13. Keep every page on screen while another window loads

As a Pauper player, I want to switch windows without a page going blank, so I can compare what changed.

Covers §4.8.

**Tasks**

1. Keep the previous window's data on screen while the new window loads, for the same queries only: the overview's decks and series, the deck page's matchups row, and the matchup table.
2. Dim the sections, mark them busy, mark the window selector busy, and keep the status line.
3. Hold back what names the window, such as the dates in the summary and on the matchup page, until the new data arrives.
4. Keep the empty window state from deciding on the previous window's data.
5. A spec beside each component and helper it changes.

**Done when**

- Switching windows never shows a skeleton once a window has loaded, on any page.
- No dates or empty state describe a window that has not loaded.

**Blocked by** nothing. **Blocks** nothing.

---

## S14. Open a deck from the charts

As a Pauper player, I want to click a deck in a chart, so I can read its page without looking it up.

Covers FR-6 and FR-7.

**Tasks**

1. Ranked bars: a click on a deck's bar or name opens its page in the current window. `Other` opens nothing.
2. Scatter: a click on a marker or its label opens the deck's page. The tooltip says so. On a touch screen the first tap shows the tooltip and a second tap opens the page.
3. A pointer cursor on what can be clicked.
4. A spec beside each component it changes.

**Done when**

- Every deck in both charts opens its page in the selected time window, and `Other` does not.
- The scatter's tooltip says a click opens the deck, and on a touch screen the first tap shows the tooltip.
- What can be clicked has a pointer cursor.

**Blocked by** nothing. **Blocks** nothing.

---

## S15. Read the matchup table on a phone

As a Pauper player on a phone, I want to read the matchups without scrolling across a 24-column table.

Covers FR-12, On a phone.

**Tasks**

1. Below 640px, show one deck's row as a list in place of the table. Each line holds the opponent's name, linking to its deck page, its matches, the verdict in words and the cell.
2. The deck picker without "All decks". With no deck in the address it shows the top deck by share and writes nothing.
3. A deck outside the window's top 24: the picker keeps it as an extra first option, and the list shows the top deck under the line "{name} isn't in the top 24 for the selected time window. The table shows {top deck} by default."
4. Reuse the cell states and the swatch from the table.
5. A spec beside each component it adds or changes.

**Done when**

- At 360px the matchup page lists one deck's 23 matchups, and nothing scrolls sideways.
- With no deck in the address the list shows the top deck by share. With one, it shows that deck.
- A deck outside the top 24 shows the top deck's list under the line.

**Blocked by** D2, S16. **Blocks** nothing.

---

## S16. Find a deck in the matchup table

As a Pauper player, I want to land on my deck's row of the matchup table, so I do not search for it.

Covers FR-11 and FR-12, A deck in the spotlight.

**Tasks**

1. A deck picker in the matchup page's controls: "All decks", then the 24 decks in share order. It reads and writes `?deck=` and replaces the history entry, §4.5.
2. The spotlight: every cell outside the deck's row and column fades to 25% opacity, and returns to full opacity under the pointer or keyboard focus. The deck's two headers turn `--primary` on a `--primary-wash` band.
3. When a link opens the page with a deck, and on a choice, scroll to the deck. From 1,100px, scroll its row into view under the sticky header row and move the grid's tab stop to its row header. From 640px to 1,099px, scroll the table's top into view and the band sideways to the deck's column, and move the tab stop to its column header. Back and forward keep the browser's scroll position.
4. Match the deck by the 8-character suffix of its slug, §6.11.
5. A window that drops the deck keeps `?deck=`, shows it in the picker as an extra first option, "{name} (not in the top 24)", and shows the line "{name} isn't in the top 24 for the selected time window." The name comes from the deck detail, and the line names "This deck" until it arrives or if it fails.
6. Under the deck page's row, the link "See {name} in the full table", with `?deck=`.
7. A spec beside each component, hook and helper it adds or changes.

**Done when**

- `/matchups?deck={slug}` opens with that deck in the spotlight: from 1,100px with its row in view, and from 640px to 1,099px with the table's top and the deck's column in view.
- "All decks" clears the spotlight and removes `deck` from the address.
- A deck outside the window's top 24 shows the line and no spotlight, and the address keeps it.
- The deck page's row links to its deck in the table.

**Blocked by** D2. **Blocks** S15.

---

## S17. Switch the overview between cards and a table

As a Pauper player, I want either the cards or the table, not both, so the overview is shorter.

Covers FR-3 and FR-4.

**Tasks**

1. A segmented control named View, with Cards and Table, after the window selector.
2. Cards by default, with no `view` in the address. Table writes `?view=table`, and Cards removes it. A change replaces the history entry, §4.5.
3. One view at a time. While the decks load, only the chosen view's skeleton shows.
4. The sort applies to the table only and stays in the address while the cards show.
5. A spec beside each component it adds or changes.

**Done when**

- The overview shows the cards or the table, never both.
- `?view=table` opens on the table, and switching back to the cards removes `view` from the address.
- Back leaves the page rather than undoing a switch.

**Blocked by** D2. **Blocks** nothing.

---

## S18. Switch between a light and a dark theme

As a Pauper player, I want the site dark when my device is, and a toggle to switch, so I can read it in any light.

Covers FR-13, NFR-1a and NFR-9.

**Tasks**

1. The dark tokens, applied under `prefers-color-scheme: dark` when the reader has not chosen, and under the reader's choice when they have. Set `color-scheme` with them, so native controls and scrollbars follow.
2. Tokens in place of the colour literals D3 names.
3. A script in `index.html` that applies a stored choice before the first paint.
4. The toggle at the right end of the site header. It writes the choice to local storage.
5. Charts recolour when the theme changes, including a change to the device setting before the reader chooses. Before S18 every chart read its tokens once, when its module loaded: `src/charts/theme.ts`, `DeckShare`, `RankedBars` and `WinRateScatter`. S18 gives the charts their colours as CSS variables instead, so the browser resolves them on every paint.
6. A spec beside each component, hook and helper it adds or changes.

**Done when**

- A device in dark mode opens the site dark, with no light flash.
- The toggle switches the theme on every page and at every width, and the choice survives a reload.
- Every chart recolours on a switch, without a reload.
- With no stored choice, a change to the device setting recolours the page and its charts and updates the toggle.
- Text, labels and chart marks meet the contrast NFR-1a gives for the dark palette.

**Blocked by** D3. **Blocks** nothing.

---

## S19. Search for any deck on the overview

As a Pauper player, I want to search the decks by name or by a card they play, so I can find a deck outside the top 24.

Covers FR-14 and NFR-4.

**Tasks**

1. The search field above the decks, with its visually hidden label and its clear button. Escape clears it.
2. From 2 characters and 300ms after the last keystroke, request `/decks` with `q`, in share order, 24 per page. Keep the query in `?q=`, replacing the history entry.
3. Show the results in the chosen view, cards or table, under the result line. The page's status line announces the count.
4. While results remain, "Show 24 more", or "Show {n} more" for fewer, loads the next page. In the table, the sort applies to the loaded results.
5. Send and keep the term trimmed, with its inner spaces collapsed and lowercased. Win rates under 20 decided matches read as too few to call, §6.8.
6. No results: the panel with "Clear the search", which returns focus to the field.
7. The summary and the charts stay on the top 24.
8. A spec beside each component, hook and helper it adds or changes.

**Done when**

- "altar" lists Altar Tron, outside the top 24, in both views, and its card opens its deck page.
- `?q=altar` on load shows the same results, and clearing the search removes `q`.
- A search with no match shows the panel, and its button clears the search.
- One character searches nothing.

**Blocked by** D4. **Blocks** nothing.

---

## S20. Highlight a deck in Share over time

As a Pauper player, I want to click a deck in the chart's legend to bring its line forward, so I can follow it among the others.

Covers FR-5.

**Tasks**

1. Each legend entry is a toggle button with `aria-pressed`. A click highlights that deck, a second click on it clears the highlight, and a click on another deck moves it.
2. The highlighted line draws at 3px, on top. Every other line, its end dot and its end label fade to `--line-fade`, 25% in light and 35% in dark.
3. Keep the highlighted deck's slug in `?highlight=`, replacing the history entry. A slug that is not in the chart shows no highlight.
4. Remove hiding and the `hide` parameter.
5. A spec beside each component it changes.

**Done when**

- A click highlights a deck, and a second click clears it.
- `?highlight=` survives a reload.
- No control hides a line.

**Blocked by** D4, S18. **Blocks** nothing.

---

## S21. Show the pointed deck on the deck charts

As a Pauper player, I want the deck charts to show which deck I am pointing at, so I can tell that it is a link.

Covers FR-6 and FR-7.

**Tasks**

1. Ranked bars: pointing at a deck's row underlines its name and fills its bar with `--seq-600`. `Other` does not react.
2. Scatter: pointing at a marker fills it with `--seq-600` at full opacity, and underlines its label when it has one.
3. A spec beside each component it changes, where the behaviour can be tested.

**Done when**

- In both themes, bars and markers react to the pointer as the design system shows.

**Blocked by** D4, S18. **Blocks** nothing.

---

## S22. Install the site as an app

As a Pauper player, I want to add the site to my home screen, so I can open it like an app.

Covers FR-16 and FR-15's icons.

**Tasks**

1. The web app manifest, with the name, the short name, the icons, the standalone display and `/` as the start address.
2. The icon links in `index.html`: the SVG favicon, the ICO and the Apple touch icon.
3. `theme-color` for each theme, updated by the theme toggle.
4. No service worker.
5. A spec beside each component it changes, such as the toggle updating `theme-color`.

**Done when**

- Chrome on Android and desktop offers to install the site, and Safari on iOS adds it to the home screen with its icon.
- The installed app opens in its own window on the overview.
- Browser tabs show the favicon in both themes.

**Blocked by** D5. **Blocks** nothing.

---

## S23. Share a deck with its own preview

As a Pauper player, I want a deck page's link to show that deck in a chat app, so the people I share it with see what it is.

Covers FR-15.

**Tasks**

1. `api/deck-page.ts`: for `/decks/:slug`, read `index.html` from the files deployed with the function, fetch the deck detail through our proxy at the deck page's own address, and write the deck's title, description, art-crop image, canonical link and `og:url` into the head, escaped. Accept only a valid slug and a known window. Return the page with the site card, sent with `no-store`, when the call fails or takes longer than two seconds. The image is `art.imageUrl`, or Endstep's art-crop endpoint when it is missing.
2. The site card's image tag in `index.html`, for every other page.
3. `vercel.json` sends `/decks/:slug` to the function, and the edge caches each page for five minutes.
4. Check the previews in Discord, Slack and WhatsApp, with an art address from Scryfall's CDN and with the fallback, which each must follow through its redirect.
5. A spec beside the function, on the injected tags, the escaping, a rejected slug, the fallback and its `no-store`, and the timeout.

**Done when**

- A shared deck link shows the deck's name, figures and art in Discord, Slack and WhatsApp.
- A shared link to the overview or the matchup table shows the site card.
- With Endstep unreachable, a deck page still loads, with the site card.

**Blocked by** D5, E13, E14. **Blocks** nothing.

---

## S24. Credit the data, the author and Wizards in the footer

As a Pauper player, I want to see where the data comes from and who made the site, and the site needs the notice Wizards asks of fan content.

Covers NFR-5.

**Tasks**

1. The footer, F1, as the design system shows: the site, the author and the source code link on one side; the data source, the independence from Endstep, the Scryfall credit and the Fan Content notice on the other. These are NFR-5's five items.
2. Stacked below 640px.
3. A spec beside the footer.

**Done when**

- Every page's footer carries NFR-5's five items, with working links, in both themes and at 360px.

**Blocked by** D5. **Blocks** H5.

---

## H4. Square the deck page's tables with the design system

Covers FR-11 and NFR-6. The owner found the gaps on 2026-10-17 and chose the column layout for the daily share. The design system already shows both.

**Tasks**

1. The Games table fills its panel's width, as the design system draws it.
2. "Daily share as a table" becomes "Daily share, day by day": a description list, one `div` per day holding its `dt` and `dd`, named "Meta share by day", flowing into columns at least 9.5em wide and 32px apart, with no pair split across columns. A day with no data reads "no data" in `--text-600`.
3. A spec beside each component it changes.

**Done when**

- On a desktop, the Games table spans its panel, and the daily share shows 30 days in four columns.
- At 360px the daily share is one column and the Games table fits its panel. At 390px the daily share is two columns.

**Blocked by** nothing. **Blocks** nothing.

---

## H5. Put the site mark in the header

Covers FR-10 and FR-16. The owner chose on 2026-10-18 to put the site mark in the header too. Today the mark appears only in the footer, the tab and the app icons, and the installed app has no tab. The design system's Page header shows it.

**Tasks**

1. The header's brand link holds the site mark, then the name. It reuses the footer's `SiteMark`, which gains a `className` prop, so the header sizes the mark from its own stylesheet with a `site-header__mark` mix, NFR-11. The footer keeps its 20px mark.
2. The mark is as tall as one line of the name: 28px, and 36px from 640px. It sits 10px from the name, 12px from 640px, and is aligned to the first line. The name's line height matches the mark: 28px, and 36px from 640px. Below 640px the link takes 4px of top padding, so the mark and the first line share the toggle's centre.
3. The link is no wider than the mark and the name on one line, so the free space beside a one-line name is not a link. A wrapped name fills its column.
4. The mark stays `aria-hidden`, so the link's name stays "Pauper Endstep metagame".
5. A spec beside each component it changes: the brand link holds the mark, and `SiteMark` passes its class on.

**Done when**

- Every page's header shows the mark beside the name, in both themes.
- At 360px and at 640px, where the name wraps to two lines, the mark sits on the first line and the toggle keeps its place.
- The brand link's accessible name is still "Pauper Endstep metagame".

**Blocked by** S24. **Blocks** S25.

---

## Notes on sequencing, milestone 3

**S13 and S14 need no design.** They change behaviour, not appearance, so they start beside D2. S13 reuses the deck page's dimmed, busy state.

**S16 comes before S15.** Both change the matchup page, and the phone view can open on the deck the address names.

**D3 does not wait for D2.** The theme changes colours, not layout. S18 and S14 both touch the chart code, so whichever lands second rebases onto the first.

**S20 and S21 wait for S18.** S18 turns the chart colours into CSS variables, and both stories change how the charts draw. S19 touches only the overview's deck list and can start as soon as D4 lands.

**E13 and E14 before S23.** The deck page's function writes into the head that E13 fills, and takes the art address that E14 adds. D5's mark is the owner's to finish, so S22 and S24 wait for it. H5 waits for S24, because it reuses the footer's `SiteMark`.

---

# Milestone 4: what to play

**Date:** 2026-10-18. Derived from Draft v10 of the requirements.

Three user stories, all for FR-17. The owner chose the design on 2026-10-18, from a working draft, and the design system's What to play? section already shows it, so there is no design item. The page reads only `/api/matchups`, so no enabler is needed either.

| Wave | Items | Runs in parallel |
|---|---|---|
| 23 | S25 | No |
| 24 | S26, S27 | Yes, two ways |

```
H5 the mark in the header ──► S25 which deck to play ──┬─► S26 the metagame you expect
                                                        └─► S27 beat a deck
```

---

## S25. See which deck to play

As a Pauper player, I want the site to tell me which deck wins most against the decks I will meet, so I can choose what to bring to a league.

Covers FR-17's page, pick and ranking, and FR-10's third link.

**Tasks**

1. The `/what-to-play` route, its rewrite in `vercel.json`, and the page heading and document title "What to play?", §4.5.
2. The header's third link, "What to play?". Below 1,100px the links keep their own row, and from 1,100px the name, the links and the toggle share one, as the design system's Page header shows. FR-13's layout line changes with it.
3. A helper that takes the matchup response and a metagame and returns each deck's expected match win rate, its range, its verdict and the pick, by FR-17's rules. Shares as the reader would set them, with no changes in this story.
4. The pick: "Our pick", "Play {deck}!" with up to three decks, the sentence with any decks just as close, and the basis line. Only the title is a polite live region.
5. The ranking: the 24 decks, the range bars on their shared scale, the 50% line, the legend and the note. Below 640px each line takes two rows.
6. The "How the numbers are made" panel, with the design system's words.
7. Loading, the error and the window change, as the matchup table: a skeleton per panel, the retry, no automatic retry, the previous window dimmed.
8. A spec beside each component it changes, and one for the helper with worked cases: the mirror, a gated pair, a pair with no entry, a deck at zero share, ties, and a pick of one, two and three decks.

**Done when**

- `/what-to-play` shows the pick and the 24 ranked decks for every window, in both themes, at 360px, 640px and 1,280px.
- One deck's expected rate at 30d matches a hand computation from the matchup response, to the decimal shown.
- Every deck name links to its deck page with the current window.
- The header shows three links at every width, with the name on one line from 640px.

**Blocked by** H5. Both change the site header. **Blocks** S26, S27.

---

## S26. Set the metagame I expect

As a Pauper player, I want to raise or lower how often I expect to meet each deck, so the suggestion fits the league I am going to.

Covers FR-17's metagame panel and its place in the address.

**Tasks**

1. The metagame panel: the 24 decks in share order, a stepper on each, "was {share}" on a changed deck, Reset, and the line on decks outside the top 24.
2. "Less" cannot act at 0.0% or on the last deck above zero. It carries `aria-disabled` rather than `disabled`, so focus stays on it.
3. Below 1,100px the panel renders first and folds into its heading, with "Change" and "Close", by a width check at 1,100px in script. From 1,100px it stands beside the ranking, always open. The render order follows the layout, with no CSS `order`.
4. The ranking's movement against the window's own metagame, and the pick's basis line for a changed metagame.
5. `meta` in the address, read and written by FR-17's rules: only changed decks, whole points, no `+` sign, written by the page so its colons and commas stay readable, matched by slug suffix, bad entries ignored, a change past zero counted as the share rounded up, changes that empty the metagame ignored, a change replacing the history entry, and a window change keeping it.
6. A spec beside each component it changes, and one for reading and writing `meta`.

**Done when**

- A press on a stepper updates the pick and the ranking at once, and focus stays on the pressed button.
- A copied address opens the same changes in another tab, and Reset removes them from the address.
- An address with a malformed entry, an unknown deck or a change of zero still opens, with the rest of its changes. An address that would empty the metagame opens the window's own.

**Blocked by** S25. **Blocks** nothing.

---

## S27. Find the decks that beat a deck

As a Pauper player, I want to see which decks clearly beat a deck I expect to meet often, and how they do against everything else.

Covers FR-17's Beat a deck panel.

**Tasks**

1. The deck picker, the top deck by default, kept in `beat` and matched by slug suffix.
2. The sentence, and the table of decks whose pair with the chosen deck is clear in their favour, FR-12's rule, by their rate against it.
3. The pair's range bar from 640px, on its own scale, and the deck's expected rate against the metagame.
4. The sentence for a deck nothing clearly beats, with no table.
5. A spec beside each component it changes.

**Done when**

- Choosing a deck updates the table, and a copied address opens the same deck.
- At 30d on the day of the check, the decks listed for Affinity are exactly those whose cell against Affinity is clearly blue in the matchup table.

**Blocked by** S25. **Blocks** nothing.

---

## Notes on sequencing, milestone 4

**S25 waits for H5.** Both change the site header: H5 adds the mark, and S25 adds the third link and moves the one-row layout to 1,100px.

**S26 and S27 run in parallel.** Both add a panel to the page S25 builds, and only S26 touches the ranking and the pick. Whichever lands second rebases onto the first. S27's expected-rate column reads the metagame S26 makes changeable, so if S27 lands first it shows the window's own metagame until S26 arrives.
