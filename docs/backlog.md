# Backlog

**Date:** 2026-09-26. Derived from [`requirements.md`](./requirements.md) and [`design-system.html`](./design-system.html).

Milestone 1 has sixteen items: four enablers, nine user stories and three hardening items. Milestones 2 to 7 follow at the end of this file. Each item gets a separate branch and a separate review. No item assumes one large implementation pass.

Every item lists what blocks it, what it blocks, and how to know that it is done.

---

## How the work splits

Two tracks start at the same time. They do not touch each other.

- Track A is data: E1, then E2. It is the track with the risk, because it depends on an external API. It also depends on Vercel doing what its documentation says.
- Track B is the interface. E3 needs no data and no network. You can build it straight from the design system while Track A is still in progress.

The tracks meet at E2. After that, four stories run in parallel. Then the three charts run in parallel.

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

This item is not a user story. It exists only because the Endstep API refuses cross-origin requests (§4.1).

**Tasks**

1. Create `api/metagame/[...path].js` as a Vercel function.
2. Forward `GET` and `HEAD` to `https://endstep.cc/api/metagame/v1/...`. Keep the query string as it is.
3. Allow-list the upstream path prefix. If a path is outside the prefix, return 400. Then nobody can use the function as an open proxy.
4. Return 405 for every other method.
5. Set `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`.
6. Pass the upstream status codes through without change. This includes 429 and 5xx.
7. Do not send cookies, credentials or headers that identify the client to the upstream API.
8. First find out if the routing needs `vercel.json`. If it does, add the file. If it does not, do not add it.
9. Deploy the function. Make sure that it works at the real edge, not only locally.

**Done when**

- A request from an origin other than endstep.cc returns deck JSON with an `access-control-allow-origin` header.
- A repeat request within five minutes reports a hit in the Vercel edge cache.
- A path outside the allow-list returns 400.
- A `POST` returns 405.

**Blocked by** nothing. **Blocks** E2.

---

## E2. Application shell and data layer

**Tasks**

1. Create `index.html` with pinned script tags for React 18.3.1, ReactDOM 18.3.1, react-is 18.3.1, Recharts 3.10.1 and Babel Standalone. Give each tag Subresource Integrity and `defer`.
2. Paste the token block from part three of the design system.
3. Mount a React root and a top-level `App`.
4. Add a data hook that fetches `decks` at `pageSize=24` and `share-series` in parallel. Use the current window as the key.
5. Keep the window state in React, in sync with the URL query string. The default window is `30d`.
6. Normalise the errors into three kinds: a network failure, a 429, and any other non-2xx.
7. Retry at most two times, with backoff. Do not poll (NFR-4).
8. Add a temporary panel that prints the totals and the deck count, so that a reviewer can check this item. S1 deletes the panel.

**Done when**

- The page loads and makes exactly two API calls.
- The totals and the deck count render from live data.
- If you edit `?window=7d` in the address bar, the page fetches the data again and updates those numbers.
- If you cut the network, the page shows the error path, not a blank page.

**Blocked by** E1. **Blocks** S1, S2, S3, S7, E4.

---

## E3. Component primitives

This item builds the primitives from part two of the design system. It needs no data and no network, so it runs beside E1 and E2.

**Tasks**

1. Build the panel.
2. Build the buttons: primary, secondary and ghost, with the disabled and focus states.
3. Build the colour pips as SVG from the `colours` array. Give them the visually hidden group label.
4. Build the segmented control with `aria-pressed`.
5. Build the stat tile, with the hero variant.
6. Build the skeleton blocks with the pulse. Guard the pulse with `prefers-reduced-motion`.
7. Build the error panel and the empty panel.
8. Make sure that each one matches the design system. Do not judge by eye.

**Done when** a temporary section renders every primitive, and each one matches part two of the design system. This includes the focus rings and the disabled state.

**Blocked by** nothing. **Blocks** S1, S2, S3, S7, E4, H1.

---

## E4. Chart foundation

The three charts have more parts in common than different parts. This item builds the common parts once, so that the three charts do not get three inconsistent implementations.

**Tasks**

1. Wire Recharts from the `Recharts` UMD global. Make sure that `react-is` is present. Without it, the bundle breaks at load.
2. Assign the eight series colours to the decks by a stable key, not by rank. If the reader toggles a series, the other series must keep their colours.
3. Add a shared tooltip component. Order its rows by value.
4. Add a shared legend with a toggle. Show a hidden series with a strike-through.
5. Add shared styles for the axis, the grid and the baseline, from the tokens.
6. Add a `ResponsiveContainer` wrapper with a fixed aspect ratio, so that the charts do not jump on load.

**Done when** one throwaway line chart renders with our tooltip, our legend and our axis styles. Toggling a series leaves the other colours unchanged.

**Blocked by** E2, E3. **Blocks** S4, S5, S6.

---

# User stories

## S1. See how big the field is and what window I am looking at

As a Pauper player, I want to know how much play the numbers come from. Then I can judge how much to trust them.

This story covers FR-2 and NFR-5.

**Tasks**

1. Build the summary header. Registrations are the hero figure. After it come the players, the archetypes, the window dates and the population.
2. Format the dates from `provenance.window.from` and `to`.
3. Add the attribution line. It links to endstep.cc and states that this is not an official Endstep product.
4. Delete the temporary panel from E2.

**Done when** the header shows live figures for the selected window, and the debug panel from E2 is gone.

**Blocked by** E2, E3. **Blocks** nothing.

---

## S2. Browse the decks as a grid

As a Pauper player, I want to recognise decks by sight. Then I can scan the field faster than I can read a list.

This story covers FR-3.

**Tasks**

1. Build the `DeckCard` component as part two of the design system shows it.
2. Request the card art from `/api/cards/image?name=...&version=art_crop`. Request it directly from endstep.cc, not through the proxy (§3.4).
3. Set `loading="lazy"`. Set `width` and `height` to match the 626:300 crop, so that the page reserves the box before the image arrives.
4. Use the colour pips from E3.
5. Show the three stats in equal columns.
6. Push the key cards line to the bottom.
7. Make the whole card the link. Its target follows open item 1 in the requirements.
8. Lay out the grid at `auto-fill minmax(228px, 1fr)`.

**Done when** 24 cards render and the art loads. The stat rows line up across the cards, and nothing shifts when the images arrive.

**Blocked by** E2, E3. **Blocks** S8.

---

## S3. Read the decks as a sortable table

As a Pauper player, I want exact figures that I can sort. The grid shows me the shape, and the table shows me the numbers.

This story covers FR-4. The table is also the accessible alternative that NFR-6 depends on.

**Tasks**

1. Write the table markup with the eight columns from FR-4.
2. Make each header a button with `aria-sort`. Then the reader can sort with the keyboard, and screen readers announce the sort.
3. Sort on the client by deck, share, players, matches and win rate.
4. Use tabular numerals and right alignment in every numeric cell.
5. Put the table in a container that scrolls horizontally. The page itself must never scroll sideways.
6. Add a hover state to the rows.

**Done when** every column sorts in both directions with the keyboard alone. The table holds every value that appears in any chart.

**Blocked by** E2, E3. **Blocks** S8, H1.

---

## S4. See how the field moved over the window

As a Pauper player, I want to see which decks gain and which decks lose. Then I know what is trending, not only what is big today.

This story covers FR-5.

**Tasks**

1. Draw a line chart of the eight series that the API returns.
2. Render the days with `rate: null` as a gap, never as zero (§6.2). This part is the most likely to go wrong.
3. Label the endpoint of each series.
4. Use the legend toggle from E4.
5. Make the date axis span the full window.

**Done when** the eight lines render, and the region before 2026-09-05 is empty, not flat at zero. Toggling a series in the legend leaves the other colours unchanged.

**Blocked by** E4. **Blocks** nothing.

---

## S5. Compare every deck's share at once

As a Pauper player, I want to see the whole field in one view. This includes the part that is not a named deck.

This story covers FR-6.

**Tasks**

1. Draw ranked horizontal bars for the top 24, plus `Other`.
2. Compute `Other` as `1 − Σ(top 24 shares)`.
3. Label `Other` so that it reads as 240 archetypes plus unclassified registrations, never as one deck (§6.1).
4. Put a value label at the end of each bar.
5. Use one hue for the decks, and `--text-400` for `Other`.

**Done when** 25 bars render in share order, and the values sum to 100%. The `Other` label states what it contains.

**Blocked by** E4. **Blocks** nothing.

---

## S6. Tell a good deck from a popular one

As a Pauper player, I want to find the decks that win more than their share suggests. That is how I pick what to play.

This story covers FR-7.

**Tasks**

1. Draw a scatter with share on x and match win rate on y.
2. Set the bubble size from the player count, with `ZAxis`.
3. Add a reference line at 50%.
4. Use one hue for all markers. Give each marker a surface ring, so that overlapping bubbles stay readable.
5. Put direct labels on a selected few, not on all 24.
6. Show the confidence range in the tooltip, so that the reader does not take small differences as real (§6.5).

**Done when** 24 bubbles render and the 50% line has a label. The tooltip shows `low` and `high` beside the rate.

**Blocked by** E4. **Blocks** nothing.

---

## S7. Change the time window

As a Pauper player, I want to switch between a day and a season. A one-day field and a 30-day field are different questions.

This story covers FR-1.

**Tasks**

1. Use the segmented control from E3, wired to the window state in E2.
2. Keep the URL query string in sync, so that a reader can link to a view.
3. When the window changes, fetch and render every section again.
4. Show a busy state on the control while the new fetch is in progress.

**Done when** all five windows load and the URL updates. A reload restores the same view, and the control shows that it is working during the fetch.

**Blocked by** E2, E3. **Blocks** nothing, but do it before S4 to S6. Then you write the charts for a changing window from the start.

---

## S8. See whether a deck is rising or falling

As a Pauper player, I want to know which way a deck is moving, not only where it is now.

This story covers FR-8 and the awkward case in §6.3.

**Tasks**

1. Build a delta component with three states: up, down and unavailable.
2. Show the direction with the triangle, not with the colour.
3. Wire the component into the deck card and into the table.
4. Show the unavailable state for `reason: "previous_window_empty"` and `reason: "no_previous_window"`, never a zero.
5. Write the copy for the unavailable case. The default window shows this case today.

**Done when** 7d shows real deltas and 30d shows the unavailable state everywhere. No cell shows a zero or a blank.

**Blocked by** S2, S3. **Blocks** nothing.

---

## S9. Know when the page is loading, empty or broken

As a Pauper player, I want to see what the page is doing. Then I can tell a slow load from a failure, and I know whether to retry.

This story covers FR-9. E2 produces the error states and E3 builds the panels. This story wires them into each section.

**Tasks**

1. Add a skeleton state to each section: the deck grid, the table, and each of the three charts. Each skeleton matches its real content box for box, so nothing shifts when the data arrives.
2. Set `aria-busy="true"` on each loading container.
3. Add an error panel to each section, with a retry control.
4. Write separate copy for a 429. It names the rate limit, not a generic failure.
5. Add an empty state for a window that returns no decks. The state offers the action that resolves it.
6. Make sure that a failed chart fetch does not take down the rest of the page.

**Done when** you can see each section in all three states. A throttled network shows skeletons, not a blank page. A forced 429 produces the rate limit message, not a generic error.

**Blocked by** E3, S1, S2, S3, S4, S5, S6. **Blocks** H1.

---

# Hardening

## H1. Accessibility and responsive pass

> Dropped. Closed as not planned (#14). Hobby project. Each story did its own accessibility work, so no separate pass happened. The project skipped the end-to-end audit.

This item covers NFR-6 and NFR-7.

**Tasks**

1. Go through the whole page with the keyboard. Include the sorting and the legend toggles.
2. Make sure that every focus state is visible.
3. Audit `aria-sort`, `aria-pressed`, `aria-busy` and the hidden pip labels.
4. Make sure that every value in every chart also appears in the table. Because of this, the three series hues with low contrast can stay in the palette.
5. At 360px, make sure that the table scrolls inside its panel and that the page does not scroll sideways.
6. Spot-check the contrast against the figures in the design system.

**Blocked by** S1 to S9. **Blocks** H3.

---

## H2. Performance and budget check

> Dropped. Closed as not planned (#15). The NFR-3 budget stays in the requirements as a note, not as a gate.

This item covers NFR-3 and NFR-4.

**Tasks**

1. Measure the transfer size against the 743 KB budget.
2. Make sure that the first render makes exactly two API calls.
3. Make sure that no layout shift happens while the card art loads.
4. Make sure that every script has `defer`.
5. Make sure that repeat requests hit the Vercel edge, not Endstep.
6. Make sure that the page does not poll, and that it retries at most two times.

**Blocked by** S1 to S9. **Blocks** H3.

---

## H3. Ship

This item covers NFR-10 and NFR-5.

**Tasks**

1. Configure the Vercel project.
2. Deploy the proxy. Make sure that it works on the production domain.
3. Put the attribution copy in place.
4. Write a README. It covers what the app is, where the data comes from, and how to run it.

**Blocked by** nothing. H1 and H2 were dropped.

---

## Notes on sequencing

Do E1 first, and alone. It is the only item that can prove the architecture wrong. §4.3 assumes how the Vercel edge cache and the allow-list behave. If they behave differently, it is better to learn this before other items build on top.

E3 runs in parallel at no cost. It touches no network and no data. You can build all of it from the design system while E1 and E2 are in progress. If you want two items in progress at once, it is the natural second track.

S7 is small, but its place in the order matters. If you add the window selector after the charts, you must go back to all three charts. If you add it before, you write the charts for a changing window from the start.

S8 is last among the stories on purpose. It touches two surfaces that must exist first. Its most common state today is the unavailable one. When something already exists to put it beside, that state is easier to get right.

---

# Milestone 2: deck page and matchup table

**Date:** 2026-10-03. This milestone comes from Draft v3 of the requirements.

This milestone has twelve items: eight enablers, one design item and three user stories. The refactor comes first, so the new pages start on the new structure and need no rewrite. The quality gates come right after the move to Vite. So every later item goes through lint, formatting, tests and CI.

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

This item covers NFR-1, §4.6 and §4.7. It is the riskiest item in the milestone.

**Tasks**

1. Add `package.json`, `vite.config.ts`, a root `tsconfig.json` and `tsconfig.app.json`, as NFR-1 describes. Install React 19 and Recharts 3.10 from npm. Make the build script `vite build` alone, because the code has no TypeScript yet.
2. Move the CSS to one stylesheet and the script to `src/main.jsx`. Change only the imports and the mount call.
3. Remove the CDN script tags and Babel Standalone.
4. Add a Vite plugin that serves `/api/metagame/*` through `api/metagame.ts`, §4.6. Give it the same rewrite as `vercel.json`, and a 5-minute memory cache for successful responses. Delete `dev-server.js`.
5. Pin `"framework": "vite"` in `vercel.json`. Keep the proxy rewrite.
6. Before you open the pull request, deploy a preview and make sure that it works.

**Done when**

- `npm run dev` serves the page with live data. `npm run build` succeeds.
- The Vercel preview shows what production shows today: 24 cards, 24 rows and three charts.
- The proxy answers on the preview.
- No CDN script tag and no `dev-server.js` remain.

**Blocked by** nothing. **Blocks** E10.

---

## E10. Lint, format, test, and gate the release

This item covers NFR-1 and §4.7. Every later item runs against these checks.

**Tasks**

1. Set up ESLint 10 with a flat config. Use the `typescript-eslint` recommended rules, the React Hooks rules, `curly: all` and `eslint-config-prettier`. Add `npm run lint`.
2. Set up Prettier 3 with its defaults. Add a `.prettierignore` for `dist/`, `docs/` and the lockfile. Add `npm run format` and `npm run format:check`. Reformat the code base in a commit that has no other change.
3. Set up Vitest 5, React Testing Library and jsdom. Add `npm test`.
4. Add `api/metagame.spec.ts`, with `fetch` stubbed. It covers the allow-list, the methods, the path parsing and the cache header for each status.
5. Add a smoke spec that renders the app with `fetch` stubbed. This is the only component spec until E11, because the components are still in one module.
6. Add `.vercelignore` with `api/**/*.spec.ts`, so that Vercel does not deploy the specs as functions.
7. Add `.github/workflows/ci.yml` with the `ci` job from NFR-1.
8. Add two rules to `AGENTS.md`:
   - The spec rule.
   - `format:check`, `lint`, `test` and `build` pass before every push.
9. The owner adds `ci` as a Deployment Check in the Vercel project. The owner also adds branch protection on `main` that requires it. Record the outcome in open item 6 of the requirements.

**Done when**

- `ci` passes on the pull request.
- A push that breaks formatting, lint, a test or the build turns `ci` red. Show this once on a throwaway branch.
- After the merge, the production deployment waits for `ci` before it takes the domain.

**Blocked by** E5. **Blocks** E6, E9.

---

## E6. Split into modules

This item covers the agreed layout for the refactor, and NFR-11. The code stays in JavaScript. The behaviour does not change, apart from the breakpoints.

**Tasks**

1. Make one module for each concern: `src/config`, `src/api`, `src/hooks`, `src/format`, `src/components`, `src/charts`, `src/pages/overview`, `src/App`.
2. Add `src/styles/index.css` with the layer order from NFR-11. It imports `tokens.css`, `base.css` and `layout.css` into their layers. `main.jsx` imports it first.
3. Add a stylesheet beside each component, with the name of that component:
   - Wrap the stylesheet in `@layer components`.
   - Cover only the elements that the component renders.
   - Move every rule that more than one component needs to `base` or `layout`.
4. Put the page wrapper in `layout.css`. The full-width band comes later, with its first user, S11.
5. Reduce the media queries to the two boundaries in NFR-11, mobile first. Two current queries move:
   - The sideways scroll of the window selector, at 400px.
   - The scatter labels, hidden below 760px.

   Make sure that each one works at its new boundary. Record the boundary where it landed.
6. Move the shared helpers that are in the wrong block to a module that their callers import: `formatCount`, `MONTHS`, `axisShare`, `tooltipShare`.
7. Remove the duplicate `.chart-section` declaration.

**Done when**

- At 360px, 800px and 1280px, the page renders and behaves as it does after E5. Only the two moved queries differ.
- `src/main.jsx` only mounts `App`.
- No module holds more than one concern.
- Every rule is inside a layer.
- The code has no `!important`.
- Element selectors appear only in `base.css`.
- Media queries use only 640px and 1,100px.

**Blocked by** E10. **Blocks** E7.

---

## E7. Convert to TypeScript

This item covers NFR-1.

**Tasks**

1. In `src/api/types.ts`, add a type for every response. Take them from §3.6, §3.7 and the `/decks` and `/share-series` shapes. Include the gated win and loss block from §6.8.
2. Convert every module to `.ts` or `.tsx`. Start with the data layer.
3. Turn on strict mode. Add the type check to the build script, so that a type error fails the build. Keep TypeScript on 6.0, NFR-1. Give `vite.config.ts` a tsconfig of its own, because the root tsconfig covers only `api/`.
4. Fix the `<div>` inside a `<p>` in the deck card skeleton. The development build of React reports it.
5. When you type each helper, add a JSDoc block to it, NFR-1. The helpers are the hooks, and the formatting and data functions.

**Done when**

- `npm run build` passes in strict mode with no explicit `any` and no `@ts-ignore`.
- ESLint passes.
- Every helper has a JSDoc block.
- The page renders and behaves as it does after E6.

**Blocked by** E6. **Blocks** E8.

---

## E8. Route between pages

This item covers FR-1, FR-3, FR-4, FR-10 and §4.5.

**Tasks**

1. Add React Router 8 in declarative mode, §4.5:
   - Use `BrowserRouter`, `Routes` and `Link`.
   - Use `useNavigate` with `replace` for corrected URLs.
   - Use `useSearchParams` for `?window=`.
   - Make links keep `?window=`.
2. Add routes for `/`, `/decks/{slug}` and `/matchups`. The two new pages render a placeholder heading.
3. Add rewrites for `/decks/:slug` and `/matchups` to `vercel.json`.
4. Add a page header to every page, with navigation, `aria-current` and the attribution.
5. Make deck cards and table rows link to `/decks/{slug}`.
6. Keep one window state that every page shares.
7. On a route change, scroll to the top and move focus to the main heading of the page.
8. Add a spec beside each component and helper that this item adds. These are the page header, the two placeholder pages and any routing helper. Add a JSDoc block to each helper.

**Done when**

- A click on a deck opens its placeholder page with the same window.
- Back returns to the overview without a reload.
- On a Vercel preview, a reload of `/decks/affinity-e93f5f74` and of `/matchups` loads the page.

**Blocked by** E7, D1. D1 designs the page header. **Blocks** E12.

---

## E12. Cache the data and keep the view in the address

This item covers §4.5, §4.8, FR-4, FR-5, NFR-3 and NFR-4.

Back must return to a page as the reader left it. A link must open the page fresh. E8 already restores the scroll position and the window. This item restores the rest: the data, without a loading state, and the view.

**Tasks**

1. Add TanStack Query 5. Make one query client for the app, with the policy in §4.8:
   - A response stays fresh for five minutes.
   - When the browser regains focus, nothing refetches.
   - The client retries a network error, a 429 or a 5xx at most twice. It waits 400 ms before the first retry and 800 ms before the second.
2. Replace `useResource` with `useQuery`. Key each query by what its request reads: `["decks", window]`, `["series", window]`, `["deck", slug, window]`. Pass the query signal to `fetch`, so that the client cancels a request that the page no longer needs. Delete `useResource`.
3. Reduce `getJson` to one request. It turns a failed status into an `ApiError` with its kind and status. It leaves the retries to the query client.
4. Make `Section` read the query result. A retry after an error shows the skeleton again.
5. Keep the view in the address:
   - Put the sort of the deck table in `sort` and `dir`.
   - Put the hidden series of the share chart in `hide`, with one deck slug in each parameter.
   - Make a change replace the history entry.
   - Leave the parameters out of the default view.
6. Add a test helper that renders with a fresh query client. Add specs for the retry rule, and for the sort and the hidden series in the address. Update the smoke spec, because a window that the app loaded in the last five minutes now renders at once.

**Done when**

- Back from a deck page shows the overview at once, with no skeleton and no request. The overview has the sort and the hidden series that the reader left.
- The Overview link in the header opens the overview sorted by share, descending, with every series shown.
- A reload keeps the sort and the hidden series.
- If the reader sorts the table and then presses Back, the browser leaves the page. Back does not undo the sort.

**Blocked by** E8. **Blocks** E11, S10, S11.

---

## E9. Aggregate the matchups

This item covers §4.4. It is only server code, so it runs beside the refactor.

**Tasks**

1. In `api/matchups.ts`, do these steps:
   - Accept only the exact query strings in §4.4.
   - Fetch the top 24.
   - Fetch their matchups in parallel.
   - Keep the top-24 cells.
2. If a pair has a record in one direction only, fill it from the other direction, §4.4. A gated record gives a gated fill.
3. Return the response shape in §4.4.
4. If any upstream call fails, fail the whole request. An upstream 429 returns 429. Anything else returns 502. Set a timeout for each call.
5. Set `Cache-Control` by status, the method rules and the CORS headers as the proxy does. Cache a 429 for 60 seconds, not 10.
6. Put code that the proxy also uses in `api/_shared.ts`. Vercel does not deploy a file in `api/` whose name starts with an underscore. Give each helper there a JSDoc block and a spec in `api/_shared.spec.ts`.
7. Measure the coverage in all five windows, open item 4 in the requirements. Record the result there.
8. Add `api/matchups.spec.ts` beside the function. The spec calls the handler with a plain `Request` and a stubbed `fetch`. E5 adds the development plugin, and S11 connects this function to it.
9. Add a JSDoc block to the handler, as `api/metagame.ts` has.

**Done when**

- A preview returns 24 decks and a row of cells for each.
- A bad, repeated, encoded or padded `window`, or an extra parameter, returns 400. A `POST` returns 405.
- A repeat request within five minutes is a hit in the edge cache.
- The spec covers each rule in §4.4.

**Blocked by** E10, for Vitest. **Blocks** S11.

---

## D1. Design the deck page and the page header

This item covers the appearance of FR-10 and FR-11. It changes only `docs/design-system.html`. The design system already has the matchup table for FR-12, from a design session with the owner on 2026-10-03.

**Tasks**

1. Design the page header with navigation.
2. Design the layout of the deck page:
   - The header with art.
   - The stat tiles.
   - The share line with its details table.
   - The games table.
   - The toss.
   - The texture.
   - The sample list.
3. Design the sample list:
   - The main deck and the sideboard, with counts.
   - The line that tells where the list comes from.
   - The copy control.
   - The `mainOnly` and `withheld` states.
4. Design the matchups row. It is the row of the deck in the matchup table, below the numbers and the sample list. Include its gated cell, its loading state and its state for a deck outside the top 24.
5. Design a gated value, "too few to call", for tiles and table cells. Where the hatch from the matchup table fits, reuse it.
6. Test each new colour against the surface, for contrast and for colour-vision deficiency.
7. Republish the artifact.

**Done when**

- Every state in FR-10 and FR-11 has a specimen.
- Every new colour has its contrast figure.

**Blocked by** nothing. **Blocks** E8, S10, S12.

---

## S10. Read one deck's numbers

As a Pauper player, I want the numbers of one deck in one place. Then I can judge the deck beyond its share and win rate.

This story covers FR-11, §6.8 and §6.11.

**Tasks**

1. Read the deck detail through the query of the deck page. E8 added this query, and E12 keys it by slug and window.
2. Build these parts, as FR-11 describes:
   - The header.
   - The stat tiles.
   - The share line with its details table.
   - The games table.
   - The toss.
   - The texture.
   - The sample list with its copy control.
3. Add a helper that applies the 20-match rule to any win and loss block, §6.8. This includes `deck.matchWinRate`. Use the helper on the overview too.
4. For an unknown slug, show the not-found state after a 404 or a proxy 400. If `deck.slug` differs, replace the URL through the router.
5. For a deck with no matches in the window, show the empty state.
6. Show the loading, error and 429 states.
7. Before you label the toss blocks, find out what they count, open item 5.
8. Add a spec beside each component and helper that this story adds, the 20-match helper included. Add a JSDoc block to each helper.

**Done when**

- At 30d, the Affinity deck page shows every section, the sample list included. A change of the window refetches the deck detail.
- The copy control puts a list on the clipboard that MTGO imports.
- An unknown slug shows the not-found state.
- `/decks/renamed-e93f5f74` opens the Affinity deck page, and the router corrects the URL.
- No gated figure reads as 0%.

**Blocked by** E12, D1. **Blocks** S12.

---

## S11. See how the top decks do against each other

As a Pauper player, I want to see which decks beat which. Then I can pick a deck for the field that I expect.

This story covers FR-12 and §6.10.

**Tasks**

1. Serve `/api/matchups` from the Vite dev plugin, behind its memory cache. Forward the raw query string unchanged, because §4.4 matches it byte for byte.
2. Fetch the matrix with a query that the window keys. Turn off its retries, FR-12.
3. Build the table and its cell states, as FR-12 describes.
4. Show the detail on hover and on keyboard focus. Give the table one tab stop, with arrow keys between cells, FR-12.
5. Add the legend.
6. Build these parts, as the design system shows:
   - The full-width band with no scrollbar.
   - The header row that stays in view.
   - The sideways scroll below the width of the table.

   The band is a layout primitive, so put it in `layout.css`, NFR-11.
7. Make the headers link to the deck pages.
8. Add the window selector and the resolved window dates.
9. Show the loading, error and 429 states. Do not retry automatically, FR-12.
10. Add a spec beside each component and helper that this story adds. Add a JSDoc block to each helper.

**Done when**

- A 24 by 24 table renders at 30d.
- The coloured cells are exactly the cells of clear pairs, as FR-12 defines them.
- A gated pair reads as too few to call.
- Tab enters the table once. Arrow keys move between cells. Focus on a cell shows its detail.
- At 1280 px, the table has no scrollbar. At 360 px, the page does not scroll sideways.

**Blocked by** E12, E9. **Blocks** S12.

---

## S12. See how one deck does against the top 24

As a Pauper player, I want the results of a deck against each top deck on its own page. Then I can judge the deck without reading the whole table.

This story covers the matchups row in FR-11, and §4.4.

**Tasks**

1. On the deck page, read `/api/matchups` through the query that S11 uses, keyed by window.
2. Render the row of the deck with the components of the matchup table: the rotated names, the cells, the legend and the detail. If S11 does not share a component yet, make it shared.
3. Find the row by `deck.id` from the deck detail, not by the slug in the address. Leave the deck itself out of the row. Keep the share order.
4. If the window of the row differs from the window of the deck detail, show the dates of the row.
5. Below the width of the row, scroll sideways and keep the name of the deck in view.
6. Give the row one tab stop, with arrow keys between cells and to the headers, as in FR-12.
7. Show the loading, error and 429 states inside the section only. Do not retry automatically.
8. For a deck outside the top 24 in the selected window, show the note and the link.
9. Add a spec beside each component and helper that this story adds or changes. Add a JSDoc block to each helper.

**Done when**

- The Affinity deck page shows 23 cells that match its row on the matchup page. This is also true when the reader opens the page through a stale slug.
- A change of the window refetches the row.
- A deck outside the top 24 in the selected window shows the note and the link.
- A failed `/api/matchups` request leaves the numbers and the sample list in place.
- At 360 px, the page does not scroll sideways.

**Blocked by** S10, S11, D1. **Blocks** nothing.

---

## E11. Test every exported function

This item covers the rule in NFR-1 that an exported function with a consumer has a spec beside it. E10 set up the tools. E8, E9, E12, S10 and S11 test what they add. This item covers everything that existed before them.

**Tasks**

1. Add a spec beside every component that exists after E12, in `src/components`, `src/charts`, `src/pages/overview` and the shell.
2. Add a spec beside every helper module. This includes the hooks, with `renderHook`, and the formatting and data functions.
3. Query by role and by visible text. Do not use snapshots.
4. Cover the states that each component has: loading, error, empty, and the 429 copy where it applies.
5. Give the charts a size in jsdom. The Recharts `ResponsiveContainer` measures its parent, which is 0 by 0 in jsdom. Without a `ResizeObserver` stub and a sized container, the charts render no marks.

**Done when**

- Every module that exports a function with a consumer has a spec beside it.
- `ci` passes.

**Blocked by** E12. **Blocks** nothing.

---

## Notes on sequencing, milestone 2

E5 comes first, and a person looks at its preview. If Vercel skips the build, it serves the source `index.html`, and the site goes blank. The framework pin prevents that. The preview proves it.

E10 runs alone. Prettier rewrites every file once, so any item that runs beside it conflicts everywhere. For the same reason, the reformat is a commit of its own.

E6 and E7 touch every file in `src/`. E9 touches only `api/`, so it runs beside E6. D1 touches only `docs/`, so it runs beside E5.

S12 comes last. It needs the page from S10 and the components of the matchup table from S11, so it waits for both.

E11 waits for E8 and E12. E8 changes the deck card, the table and the shell. E12 replaces the data hook. So a spec written before them needs a rewrite. After E12, E11 adds only spec files. So it runs beside S10 and S11, which add new components.

E12 comes before the pages. S10, S11 and S12 read their data through the queries that it sets up. So the stories start on the final data layer and need no rewrite.

E8 gives the stories empty pages. Then S10 and S11 each fill one page and do not touch the router. So they can run in parallel.

---
# Milestone 3: connected pages

**Date:** 2026-10-13. This milestone comes from Draft v4 of the requirements. D3 and S18 were added on 2026-10-14, from Draft v5. D4, S19, S20 and S21 were added on 2026-10-17, from Draft v6. D5, E13, S22, S23 and S24 were added the same day, from Draft v7, and E14 from Draft v8. H4 was added the same day. H5 was added on 2026-10-18, from Draft v9.

This milestone has twenty items: four design items, two enablers, twelve user stories and two hardening items. Two stories, the enablers and H4 need no design, so they start at once. The design of H5 is done. It waits only for the mark component of the footer, S24. The other items wait for D2, D3, D4 or D5. Each of them changes how a page looks, and the owner chooses the design first.

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

This item covers open items 7, 8 and 9 in the requirements. It changes `docs/design-system.html`, and the owner chooses between the proposals. Then it writes the chosen behaviour into `docs/requirements.md`. It has no code.

**Tasks**

1. Make one or more proposals for reading the matchup table on a phone, below 640px. Give the trade-offs of each proposal.
2. Design these parts of the matchup table:
   - How the row and the column stand out for a deck named in the address.
   - Where the page scrolls.
   - The hover crosshair on desktop.
3. Design the switch on the overview between the cards and the table:
   - Where it sits.
   - What it looks like.
   - What each view keeps.
4. Check each new colour against the surface, for contrast and for colour-vision deficiency.
5. Write the chosen designs into FR-12, FR-3 and FR-4. Settle open items 7, 8 and 9.
6. Republish the artifact.

**Done when**

- Each chosen design has a specimen, with its states.
- FR-3, FR-4 and FR-12 describe the behaviour. Open items 7, 8 and 9 are settled.

**Blocked by** nothing. **Blocks** S15, S16, S17.

---

## D3. Design the dark theme and its toggle

This item covers FR-13 and open item 10 in the requirements. It changes `docs/design-system.html`, and the owner chooses between the palettes. Then it writes the chosen values into NFR-1a. It has no code.

**Tasks**

1. Make three dark palettes. No palette is near black, and none has the 19:1 text contrast of the light theme. Each palette covers these colours:
   - The neutrals.
   - The primary blue and its wash.
   - Up and down.
   - The matchup fills.
   - The eight chart hues.
   - The sequential blue.
2. Check each palette against its own surface:
   - 4.5:1 for text.
   - 3.5:1 for labels.
   - 3:1 for every chart hue.
   - The separation of the chart hues under protanopia, deuteranopia and normal vision.
   - On the dark surface, check again what fades by opacity: the faded cells of the spotlight, NFR-6, and the dimmed loading states.
3. Name tokens for the colours that are literals today:
   - The hover fills.
   - The primary hover.
   - The table row hover.
   - The tooltip shadow.
4. Design the toggle: its icon, its size and its states. Its look shows the current theme. Show the site header at 360px, at 640px and wide.
5. Make specimens of the components in the chosen palette.
6. Write the chosen palette into NFR-1a and settle open item 10. Then republish the artifact.

**Done when**

- The design system specifies both palettes and the toggle, with specimens.
- NFR-1a and open item 10 name the chosen palette.

**Blocked by** nothing. **Blocks** S18.

---

## D4. Design the deck search, the share chart's highlight and the chart hover

This item covers FR-5, FR-6, FR-7 and FR-14 in the requirements. On 2026-10-17 the owner chose these options:

- The search is a filter on the overview.
- The legend highlights a deck in place of hiding it.
- The hover works on both deck charts.

It changes `docs/design-system.html` and `docs/requirements.md`. It has no code.

**Tasks**

1. Design the deck search, with the states of each part:
   - The field.
   - Its clear button.
   - The result line.
   - The "Show more" button.
   - The no-results panel.
   - A 14px gap between the field, the line and the decks.
2. In Share over time, design the highlight from the legend. It replaces hiding. Design these parts:
   - The highlighted line.
   - The faded lines and labels.
   - The pressed legend entry.
3. Design the hover on the ranked bars and the scatter. It underlines the name or the label, and it uses the `--seq-600` fill.
4. Check the contrast of the faded lines in both themes. Record the exception under NFR-6.
5. Write FR-14 and the changes to FR-5, FR-6, FR-7, §3, §4.5, NFR-4 and §8.
6. Republish the artifact.

**Done when**

- Each design has a specimen with its states, in both themes.
- The requirements describe the search, the highlight and the hover.

**Blocked by** nothing. **Blocks** S19, S20, S21.

---

## D5. Design the site mark, the icon set, the site card and the footer

This item covers FR-15, FR-16 and NFR-5. On 2026-10-17 the owner chose these options:

- The ranked-bars mark, M1. The owner continues to refine it.
- The two-column footer, F1.
- Deck previews with only the art.

It changes `docs/design-system.html`. It has no code.

**Tasks**

1. Make the site mark from the final SVG of the owner. Show it in both themes, with its sizes and its clear space.
2. Make the icon set, and give the app a short name for the home screen. The icon set has these files:
   - The SVG favicon.
   - The 32px ICO.
   - The 180px Apple touch icon.
   - The 192px, 512px and maskable 512px app icons.
3. Make the site card. It is the 1200 by 630 image that every page shares, except the deck pages.
4. Design the footer, F1, in both themes:
   - The site and its author on one side.
   - The notices on the other side.
   - Below 640px, the two sides stack.
5. Add the icons and the site card to the `public/` folder of the repository, ready for S22 and S23.
6. Republish the artifact.

**Done when**

- The design system specifies the mark, the icons, the site card and the footer, with specimens in both themes.
- The icon files and the site card are in `public/`.

**Blocked by** nothing. **Blocks** S22, S23, S24.

---

## E13. Add the page description, the asset cache and the security headers

This item covers the text tags of FR-15, and §4.7. It needs no design.

**Tasks**

1. In `index.html`, add the description and the text tags for Open Graph and for the `summary_large_image` Twitter card. Do not add a canonical link or `og:url`. Add `robots.txt` to `public/`.
2. In `vercel.json`, set `public, max-age=31536000, immutable` for `/assets/*`.
3. In `vercel.json`, add the security headers of §4.7. Allow the inline theme script by its hash.
4. On a production build with the policy on, make sure that these parts still load:
   - Every page.
   - Every chart.
   - Every card image.
   - The theme script.

**Done when**

- A shared link to the site shows its title and description.
- A second visit loads the hashed files from the browser cache, with no request.
- The response headers carry the policy. The browser console reports no violation on any page.

**Blocked by** nothing. **Blocks** S23.

---

## E14. Serve the card art straight from Scryfall

This item covers §3.4, §4.3, FR-3, FR-11, NFR-4 and open item 11. The owner settled that item on 2026-10-17. It needs no design.

**Tasks**

1. In the proxy, `api/metagame.ts`, do these things for each successful `GET` of a deck list or a deck detail:
   - Send one `POST /cards/collection` to Scryfall with the key card names.
   - Give the request a bound of one second.
   - Send the `User-Agent` and `Accept` headers of §4.3.
   - Add `art.imageUrl` to each deck that the request resolves. Take it from `image_uris.art_crop`, or from the same field of the first face.
   - Match a name against the full name or either face. Ignore case.
2. Keep the address of each card in the memory of the instance. Also keep each name that Scryfall did not find. After a 429, send nothing to Scryfall for 30 seconds.
3. If the Scryfall request fails, times out or returns a 429, send the response without the missing addresses. Use `s-maxage=60`, and do not retry. A name that Scryfall did not find keeps the usual cache time.
4. In the client, make `artSource` take the art of the deck from `art.imageUrl`. If that field is missing, use the Endstep endpoint with `version=art_crop`. The deck card, the deck hero and the search results use that helper.
5. Add a spec beside each function and helper that this item changes. The specs cover these cases:
   - The request.
   - The name matching for both faces.
   - A name not found.
   - The fallback.
   - The 429 and its pause.
   - `HEAD`.
   - The cache header.

**Done when**

- Every top-24 card that Scryfall finds loads its art from `cards.scryfall.io`. If Scryfall does not find a card, the card falls back to the Endstep endpoint.
- If the API of Scryfall is unreachable, every card still shows its art through the Endstep endpoint. This item cannot cover a failure of the Scryfall CDN, because the Endstep endpoint also redirects there.
- No response waits more than a second for Scryfall.

**Blocked by** nothing. **Blocks** S23.

---

## S13. Keep every page on screen while another window loads

As a Pauper player, I want to switch windows, and no page goes blank. Then I can compare what changed.

This story covers §4.8.

**Tasks**

1. While the new window loads, keep the data of the previous window on the screen. Do this only for the same queries:
   - The decks and the series on the overview.
   - The matchups row on the deck page.
   - The matchup table.
2. While the new window loads, do these things:
   - Dim the sections.
   - Mark the sections busy.
   - Mark the window selector busy.
   - Keep the status line.
3. Until the new data arrives, hold back each part that names the window. For example, hold back the dates in the summary and on the matchup page.
4. Do not let the empty window state decide on the data of the previous window.
5. Add a spec beside each component and helper that this story changes.

**Done when**

- On any page, after a first window loads, a change of window never shows a skeleton.
- No date and no empty state describes a window before its data arrives.

**Blocked by** nothing. **Blocks** nothing.

---

## S14. Open a deck from the charts

As a Pauper player, I want to click a deck in a chart. Then I can read its page, and I do not look it up.

This story covers FR-6 and FR-7.

**Tasks**

1. In the ranked bars, make a click on the bar or the name of a deck open its page. Open the page in the current window. A click on `Other` opens nothing.
2. In the scatter, make a click on a marker or its label open the page of the deck. Say so in the tooltip. On a touch screen, the first tap shows the tooltip and a second tap opens the page.
3. Show a pointer cursor on each part that the reader can click.
4. Add a spec beside each component that this story changes.

**Done when**

- Every deck in both charts opens its page in the selected window. `Other` does not open a page.
- The tooltip of the scatter says that a click opens the deck. On a touch screen, the first tap shows the tooltip.
- Each part that the reader can click has a pointer cursor.

**Blocked by** nothing. **Blocks** nothing.

---

## S15. Read the matchup table on a phone

As a Pauper player on a phone, I want to read the matchups. I do not want to scroll across a table of 24 columns.

This story covers the part of FR-12 that is called On a phone.

**Tasks**

1. Below 640px, show the row of one deck as a list in place of the table. Each line holds these parts:
   - The name of the opponent, as a link to its deck page.
   - Its matches.
   - The verdict in words.
   - The cell.
2. Show the deck picker without "All decks". If the address has no deck, the picker shows the top deck by share and writes nothing to the address.
3. If the deck is outside the top 24 of the window, keep it in the picker as an extra first option. Then show the list of the top deck under the line "{name} isn't in the top 24 for the selected time window. The table shows {top deck} by default."
4. Reuse the cell states and the swatch from the table.
5. Add a spec beside each component that this story adds or changes.

**Done when**

- At 360px, the matchup page lists the 23 matchups of one deck. Nothing scrolls sideways.
- If the address has no deck, the list shows the top deck by share. If the address has a deck, the list shows that deck.
- For a deck outside the top 24, the page shows the list of the top deck under the line.

**Blocked by** D2, S16. **Blocks** nothing.

---

## S16. Find a deck in the matchup table

As a Pauper player, I want to land on the row of my deck in the matchup table. Then I do not search for it.

This story covers FR-11, and the part of FR-12 that is called A deck in the spotlight.

**Tasks**

1. Add a deck picker to the controls of the matchup page. It lists "All decks", then the 24 decks in share order. The picker reads and writes `?deck=` and replaces the history entry, §4.5.
2. Add the spotlight:
   - Fade every cell outside the row and the column of the deck to 25% opacity.
   - Under the pointer or keyboard focus, return a faded cell to full opacity.
   - Turn the two headers of the deck `--primary`, on a `--primary-wash` band.
3. Scroll to the deck in two cases: a link opens the page with a deck, or the reader chooses a deck.
   - From 1,100px, scroll the row of the deck into view under the sticky header row. Move the tab stop of the grid to its row header.
   - From 640px to 1,099px, scroll the top of the table into view. Scroll the band sideways to the column of the deck. Move the tab stop to its column header.
   - Back and forward keep the scroll position of the browser.
4. Match the deck by the 8-character suffix of its slug, §6.11.
5. If a window drops the deck, do these things:
   - Keep `?deck=`.
   - Show the deck in the picker as an extra first option, "{name} (not in the top 24)".
   - Show the line "{name} isn't in the top 24 for the selected time window."
   - Take the name from the deck detail. Until the deck detail arrives, or if it fails, the line names "This deck".
6. Under the row on the deck page, add the link "See {name} in the full table", with `?deck=`.
7. Add a spec beside each component, hook and helper that this story adds or changes.

**Done when**

- `/matchups?deck={slug}` opens with that deck in the spotlight:
  - From 1,100px, its row is in view.
  - From 640px to 1,099px, the top of the table and the column of the deck are in view.
- "All decks" clears the spotlight and removes `deck` from the address.
- A deck outside the top 24 of the window shows the line and no spotlight. The address keeps the deck.
- The row on the deck page links to its deck in the table.

**Blocked by** D2. **Blocks** S15.

---
## S17. Switch the overview between cards and a table

As a Pauper player, I want either the cards or the table, not both. Then the overview is shorter.

This story covers FR-3 and FR-4.

**Tasks**

1. After the window selector, add a segmented control named View, with Cards and Table.
2. Show the cards by default, with no `view` in the address. Table writes `?view=table`, and Cards removes it. A change replaces the history entry, §4.5.
3. Show one view at a time. While the decks load, show only the skeleton of the chosen view.
4. Apply the sort to the table only. Keep the sort in the address while the cards show.
5. Add a spec beside each component that the story adds or changes.

**Done when**

- The overview shows the cards or the table, never both.
- `?view=table` opens on the table. A switch back to the cards removes `view` from the address.
- Back leaves the page. It does not undo a switch.

**Blocked by** D2. **Blocks** nothing.

---

## S18. Switch between a light and a dark theme

As a Pauper player, I want the site dark when my device is dark, and a toggle to switch the theme. Then I can read the site in any light.

This story covers FR-13, NFR-1a and NFR-9.

**Tasks**

1. Add the dark tokens:
   - If the reader did not choose a theme, apply them under `prefers-color-scheme: dark`.
   - If the reader chose a theme, apply them under that choice.
   - Set `color-scheme` with them, so that native controls and scrollbars follow the theme.
2. Replace the colour literals that D3 names with tokens.
3. In `index.html`, add a script that applies a stored choice before the first paint.
4. Put the toggle at the right end of the site header. The toggle writes the choice to local storage.
5. When the theme changes, recolour the charts. This includes a change to the device setting before the reader chooses.
   - Before S18, every chart read its tokens once, when its module loaded: `src/charts/theme.ts`, `DeckShare`, `RankedBars` and `WinRateScatter`.
   - S18 gives the charts their colours as CSS variables instead. Then the browser resolves the colours on every paint.
6. Add a spec beside each component, hook and helper that the story adds or changes.

**Done when**

- A device in dark mode opens the site dark, with no light flash.
- The toggle switches the theme on every page and at every width. The choice survives a reload.
- Every chart recolours on a switch, without a reload.
- If no choice is stored, a change to the device setting recolours the page and its charts. The change also updates the toggle.
- Text, labels and chart marks meet the contrast that NFR-1a gives for the dark palette.

**Blocked by** D3. **Blocks** nothing.

---

## S19. Search for any deck on the overview

As a Pauper player, I want to search the decks by name or by a card that they play. Then I can find a deck outside the top 24.

This story covers FR-14 and NFR-4.

**Tasks**

1. Add the search field above the decks, with its visually hidden label and its clear button. Escape clears the field.
2. If the term has at least 2 characters, request `/decks` with `q` 300ms after the last keystroke.
   - Request the decks in share order, 24 per page.
   - Keep the query in `?q=`, and replace the history entry.
3. Show the results in the chosen view, cards or table, under the result line. The status line of the page announces the count.
4. While results remain, "Show 24 more" loads the next page. If fewer remain, the button reads "Show {n} more". In the table, apply the sort to the loaded results.
5. Trim the term, collapse its inner spaces and lowercase it. Send and keep the term in that form.
6. Show a win rate from under 20 decided matches as too few to call, §6.8.
7. If no results come back, show the panel with "Clear the search". That button returns focus to the field.
8. Keep the summary and the charts on the top 24.
9. Add a spec beside each component, hook and helper that the story adds or changes.

**Done when**

- "altar" lists Altar Tron in both views, and Altar Tron is outside the top 24. Its card opens its deck page.
- On load, `?q=altar` shows the same results. When the reader clears the search, the page removes `q`.
- A search with no match shows the panel. The button of the panel clears the search.
- One character searches nothing.

**Blocked by** D4. **Blocks** nothing.

---

## S20. Highlight a deck in Share over time

As a Pauper player, I want to click a deck in the legend of the chart to bring its line forward. Then I can follow the deck among the others.

This story covers FR-5.

**Tasks**

1. Make each legend entry a toggle button with `aria-pressed`:
   - A click highlights that deck.
   - A second click on the same deck clears the highlight.
   - A click on another deck moves the highlight to that deck.
2. Draw the highlighted line at 3px, on top. Fade every other line, its end dot and its end label to `--line-fade`: 25% in light and 35% in dark.
3. Keep the slug of the highlighted deck in `?highlight=`, and replace the history entry. If the slug is not in the chart, show no highlight.
4. Remove the hiding of lines and the `hide` parameter.
5. Add a spec beside each component that changes.

**Done when**

- A click highlights a deck, and a second click clears the highlight.
- `?highlight=` survives a reload.
- No control hides a line.

**Blocked by** D4, S18. **Blocks** nothing.

---

## S21. Show the deck under the pointer on the deck charts

As a Pauper player, I want the deck charts to show the deck that I point at. Then I can tell that it is a link.

This story covers FR-6 and FR-7.

**Tasks**

1. If the pointer is on the row of a deck in the ranked bars, underline the name of the deck. Also fill its bar with `--seq-600`. `Other` does not react.
2. If the pointer is on a marker in the scatter, fill the marker with `--seq-600` at full opacity. If the marker has a label, underline the label.
3. If a spec can test the behaviour of a component that changes, add a spec beside that component.

**Done when**

- In both themes, bars and markers react to the pointer as the design system shows.

**Blocked by** D4, S18. **Blocks** nothing.

---

## S22. Install the site as an app

As a Pauper player, I want to add the site to my home screen. Then I can open it like an app.

This story covers FR-16 and the icons of FR-15.

**Tasks**

1. Add the web app manifest, with these parts:
   - The name and the short name.
   - The icons.
   - The standalone display.
   - `/` as the start address.
2. Add the icon links to `index.html`: the SVG favicon, the ICO and the Apple touch icon.
3. Set `theme-color` for each theme. The theme toggle updates it.
4. Do not add a service worker.
5. Add a spec beside each component that changes. For example, the spec of the toggle covers the update of `theme-color`.

**Done when**

- Chrome on Android and on desktop offers to install the site. Safari on iOS adds the site to the home screen with its icon.
- The installed app opens on the overview, in standalone mode.
- Browser tabs show the favicon in both themes.

**Blocked by** D5. **Blocks** nothing.

---

## S23. Share a deck with its own preview

As a Pauper player, I want the link of a deck page to show that deck in a chat app. Then the people that I share it with see what it is.

This story covers FR-15.

**Tasks**

1. Write the deck page's HTML function, `api/deck-page.ts`, for `/decks/:slug`:
   - Read `index.html` from the files that deploy with the function.
   - Fetch the deck detail through our proxy, at the same address that the deck page uses.
   - Write the title, the description, the art-crop image, the canonical link and `og:url` of the deck into the head. Escape each value.
   - Accept only a valid slug and a known window.
   - If the call fails or takes longer than two seconds, return the page with the site card. Send it with `no-store`.
   - For the image, use `art.imageUrl`. If it is missing, use the art-crop endpoint of Endstep.
2. In `index.html`, add the image tag of the site card, for every other page.
3. In `vercel.json`, send `/decks/:slug` to the function. Cache each page at the edge for five minutes.
4. Make sure that the previews work in Discord, Slack and WhatsApp. Test an art address from the Scryfall CDN, and test the fallback. Each app must follow the fallback through its redirect.
5. Add a spec beside the function. The spec covers these cases:
   - The injected tags.
   - The escaping.
   - A rejected slug.
   - The fallback and its `no-store`.
   - The timeout.

**Done when**

- A shared deck link shows the name, the figures and the art of the deck in Discord, Slack and WhatsApp.
- A shared link to the overview or to the matchup table shows the site card.
- If Endstep is unreachable, a deck page still loads, with the site card.

**Blocked by** D5, E13, E14. **Blocks** nothing.

---

## S24. Credit the data, the author and Wizards in the footer

As a Pauper player, I want to see where the data comes from and who made the site. The site also needs the notice that Wizards asks of fan content.

This story covers NFR-5.

**Tasks**

1. Add the footer, F1, as the design system shows. Its parts are the five items of NFR-5:
   - On one side, put the site, the author and the link to the source code.
   - On the other side, put the data source, the independence from Endstep, the Scryfall credit and the Fan Content notice.
2. Below 640px, stack the parts of the footer.
3. Add a spec beside the footer.

**Done when**

- The footer of every page has the five items of NFR-5, with working links. This is true in both themes and at 360px.

**Blocked by** D5. **Blocks** H5.

---

## H4. Make the deck page's tables match the design system

This item covers FR-11 and NFR-6. On 2026-10-17 the owner found the gaps and chose the column layout for the daily share. The design system already shows both.

**Tasks**

1. Make the Games table fill the width of its panel, as the design system draws it.
2. Change "Daily share as a table" to "Daily share, day by day":
   - Make it a description list named "Meta share by day".
   - Use one `div` for each day, which holds its `dt` and `dd`.
   - Flow the list into columns at least 9.5em wide and 32px apart.
   - Do not split a pair across columns.
   - If a day has no data, show "no data" in `--text-600`.
3. Add a spec beside each component that changes.

**Done when**

- On a desktop, the Games table spans its panel, and the daily share shows 30 days in four columns.
- At 360px, the daily share is one column and the Games table fits its panel. At 390px, the daily share is two columns.

**Blocked by** nothing. **Blocks** nothing.

---

## H5. Put the site mark in the header

This item covers FR-10 and FR-16. On 2026-10-18 the owner chose to put the site mark in the header too. Today the mark appears only in the footer, the tab and the app icons. The installed app has no tab. The Page header in the design system shows the mark.

**Tasks**

1. Put the site mark in the brand link of the header, then the name.
   - Reuse `SiteMark` from the footer, and give it a `className` prop.
   - The header then sizes the mark from its own stylesheet with a `site-header__mark` mix, NFR-11.
   - The footer keeps its 20px mark.
2. Size and place the mark:
   - Make the mark as tall as one line of the name: 28px, and 36px from 640px.
   - Put the mark 10px from the name, and 12px from 640px. Align it to the first line.
   - Make the line height of the name match the mark: 28px, and 36px from 640px.
   - Below 640px, give the link 4px of top padding. Then the mark and the first line share the centre of the toggle.
3. Make the link no wider than the mark and the name on one line. Then the free space beside a one-line name is not a link. A wrapped name fills its column.
4. Keep `aria-hidden` on the mark. Then the name of the link stays "Pauper Endstep metagame".
5. Add a spec beside each component that changes. The specs cover two facts: the brand link holds the mark, and `SiteMark` passes its class on.

**Done when**

- The header of every page shows the mark beside the name, in both themes.
- At 360px and at 640px, the name wraps to two lines. At these widths, the mark sits on the first line and the toggle keeps its place.
- The accessible name of the brand link is still "Pauper Endstep metagame".

**Blocked by** S24. **Blocks** S25.

---

## Notes on sequencing, milestone 3

S13 and S14 need no design. They change behaviour, not appearance, so they start beside D2. S13 reuses the dimmed, busy state of the deck page.

S16 comes before S15. Both stories change the matchup page, and the phone view can open on the deck that the address names.

D3 does not wait for D2. The theme changes colours, not layout. S18 and S14 both change the chart code. The story that lands second rebases onto the first.

S20 and S21 wait for S18. S18 turns the chart colours into CSS variables, and both stories change how the charts draw. S19 changes only the deck list of the overview. It can start as soon as D4 lands.

E13 and E14 come before S23. The deck page's HTML function writes into the head that E13 fills. It also takes the art address that E14 adds. D5's mark is for the owner to finish, so S22 and S24 wait for it. H5 waits for S24, because it reuses `SiteMark` from the footer.

---

# Milestone 4: what to play

**Date:** 2026-10-18. This milestone comes from Draft v10 of the requirements.

This milestone has three user stories, all for FR-17. On 2026-10-18 the owner chose the design from a working draft. The What to play? section of the design system shows that design, so this milestone has no design item. The page reads only `/api/matchups`, so this milestone has no enabler either.

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

As a Pauper player, I want the site to tell me which deck wins most against the decks I will meet. Then I can choose what to bring to a league.

This story covers the page, the pick and the ranking in FR-17, and the third link in FR-10.

**Tasks**

1. Add the `/what-to-play` route and its rewrite in `vercel.json`. Give the page the heading and the document title "What to play?". Follow §4.5.
2. Add the third link to the header, "What to play?". Follow the Page header in the design system:
   - Below 1,100px, the links keep their own row.
   - From 1,100px, the name, the links and the toggle share one row.

   The layout line in FR-13 changes with this link.
3. Add a helper that takes the matchup response and a metagame. The helper follows the rules of FR-17. It returns these values:
   - The expected match win rate of each deck.
   - The range of that rate.
   - The verdict on each deck.
   - The pick.

   The metagame holds the shares in the form that the reader will set them. In this story, the shares have no changes.
4. Show the pick. Make only its title a polite live region. The pick has these parts:
   - "Our pick".
   - "Play {deck}!", with up to three decks.
   - The sentence about any decks that are just as close.
   - The basis line.
5. Show the ranking. Below 640px, each line takes two rows. The ranking has these parts:
   - The 24 decks.
   - The range bars, on their shared scale.
   - The 50% line.
   - The legend.
   - The note.
6. Add the "How the numbers are made" panel. Use the words from the design system.
7. Handle loading, the error and the window change as the matchup table does:
   - Show a skeleton for each panel.
   - Show the retry.
   - Do not retry automatically.
   - Show the previous window dimmed.
8. Add a spec beside each component that changes. Add a spec for the helper, with these worked cases:
   - The mirror.
   - A gated pair.
   - A pair with no entry.
   - A deck at zero share.
   - Ties.
   - A pick of one, two and three decks.

**Done when**

- `/what-to-play` shows the pick and the 24 ranked decks for every window, in both themes, at 360px, 640px and 1,280px.
- The expected rate of one deck at 30d agrees with a calculation by hand from the matchup response, to the decimal shown.
- Every deck name links to its deck page with the current window.
- The header shows three links at every width. From 640px, the name is on one line.

**Blocked by** H5. Both change the site header. **Blocks** S26, S27.

---

## S26. Set the metagame I expect

As a Pauper player, I want to raise or lower how often I expect to meet each deck. Then the suggestion fits the league that I am going to.

This story covers the metagame panel in FR-17 and its place in the address.

**Tasks**

1. Add the metagame panel with these parts:
   - The 24 decks, in order of share.
   - A stepper on each deck.
   - "was {share}" on a changed deck.
   - Reset.
   - The line about the decks outside the top 24.
2. Make "Less" do nothing at 0.0% and on the last deck above zero. Give it `aria-disabled`, not `disabled`, so that focus stays on it.
3. Place the panel with a width check at 1,100px in script:
   - Below 1,100px, render the panel first. Fold it into its heading, with "Change" and "Close".
   - From 1,100px, put the panel beside the ranking, always open.
   - Make the render order follow the layout. Do not use CSS `order`.
4. Show the movement of the ranking against the window's own metagame. Show the basis line of the pick for a changed metagame.
5. Read and write `meta` in the address by the rules of FR-17:
   - Write only the changed decks.
   - Write whole points, with no `+` sign.
   - Write the address from the page, so that its colons and commas stay readable.
   - Match a deck by slug suffix.
   - Ignore bad entries.
   - Count a change past zero as the share, rounded up.
   - Ignore changes that empty the metagame.
   - Let a change replace the history entry.
   - When the window changes, keep the changes in the address.
6. Add a spec beside each component that changes. Add a spec for reading and writing `meta`.

**Done when**

- A press on a stepper updates the pick and the ranking at once. Focus stays on the pressed button.
- A copied address opens the same changes in another tab. Reset removes the changes from the address.
- An address with a malformed entry, an unknown deck or a change of zero still opens, with the rest of its changes.
- An address whose changes empty the metagame opens the window's own metagame.

**Blocked by** S25. **Blocks** nothing.

---

## S27. Find the decks that beat a deck

As a Pauper player, I want to see which decks clearly beat a deck that I expect to meet often. I also want to see how those decks do against everything else.

This story covers the Beat a deck panel in FR-17.

**Tasks**

1. Add the deck picker. Select the top deck by default. Keep the choice in `beat`, and match it by slug suffix.
2. Show the sentence and the table. The table lists the decks whose pair with the chosen deck is clear in their favour, by the rule of FR-12. Order the decks by their rate against the chosen deck.
3. From 640px, show the range bar of the pair, on its own scale. Show the expected rate of the deck against the metagame.
4. If nothing clearly beats the chosen deck, show the sentence for that case, with no table.
5. Add a spec beside each component that changes.

**Done when**

- When the reader chooses a deck, the table updates. A copied address opens the same deck.
- At 30d on the day of the check, the list for Affinity has exactly the decks whose cell against Affinity is clearly blue in the matchup table.

**Blocked by** S25. **Blocks** nothing.

---

## Notes on sequencing, milestone 4

S25 waits for H5, because both items change the site header. H5 adds the mark. S25 adds the third link and moves the one-row layout to 1,100px.

S26 and S27 run in parallel. Both stories add a panel to the page that S25 builds. Only S26 changes the ranking and the pick. The story that merges second rebases onto the first. The expected-rate column of S27 reads the metagame that S26 makes changeable. If S27 merges first, the column shows the window's own metagame until S26 merges.

---

# Milestone 5: staples

**Date:** 2026-10-18. This milestone comes from Draft v11 of the requirements.

This milestone has one enabler, two user stories and one hardening item, for FR-18 and §4.9. H7 was added on 2026-10-20, from Draft v15. On 2026-10-18 the owner chose the design from a working draft. The Staples section of the design system shows that design, so this milestone has no design item.

| Wave | Items | Runs in parallel |
|---|---|---|
| 25 | E15 | Yes, beside milestone 4 |
| 26 | S28 | No |
| 27 | S29 | No |
| 33 | H7 | Yes, beside any other item |

```
E15 the staples function ──┐
S25 which deck to play ────┴─► S28 the staples page ──► S29 the decks behind a card
H7 ask once more for a slow table
```

---

## E15. Build the staples on the server

This item covers §4.9.

**Tasks**

1. In `api/staples.ts`, check the raw query string byte for byte, as the matchup function does. Then fetch the top 24 decks, and fetch their card tables for the requested section in parallel:
   - Fetch 50 cards a page.
   - While the last card of a deck is in at least 2% of its lists, fetch the next page of that deck.
   - Fetch up to 4 pages.
2. Aggregate the cards:
   - Leave out withheld decks and basic lands.
   - Weight the share and the copies of each card over the counted decks, as §4.9 sets out.
   - Keep the 50 largest. Order ties by name.
   - For each card, keep the decks that play it in at least 5% of their lists.
3. Get the art through the Scryfall lookup of the proxy. Share the lookup with the proxy, and do not copy it. Keep its fallback and its one-minute cache.
4. Set the cache rules:
   - A success: 30 minutes.
   - A response whose art lookup fell back: one minute.
   - A 429: 60 seconds.

   Use the failure rules and the timeout of the matchup function.
5. Check the shape of a withheld card table on a short window, where small decks are common. Record the shape in §3.8.
6. Add the route to `vercel.json` and to the development plugin, §4.6. Make sure that `.vercelignore` keeps the spec out of the deploy.
7. Add a spec beside the function. The spec covers these cases:
   - The query check.
   - The paging rule.
   - The weighting on a small fixture.
   - A withheld deck.
   - The basic lands.
   - The 5% floor.
   - The tie order.
   - An upstream 429 and 502.
   - An art lookup that fails.

**Done when**

- In production, `/api/staples?window=30d&section=main` returns 50 cards. The top five agree with a calculation by hand from the 24 card tables, to the decimal shown.
- A repeat request within 30 minutes is a cache hit.
- Any other query string returns 400.

**Blocked by** nothing. **Blocks** S28.

---

## S28. See the format's staples

As a Pauper player, I want to see the cards that the top decks play most. Then I know which cards are worth owning.

This story covers the page and the list in FR-18, and the fourth link in FR-10.

**Tasks**

1. Add the `/staples` route and its rewrite in `vercel.json`. Add the heading, the line under it and the document title.
2. Add the fourth link to the header, "Staples". If the links do not fit, wrap them onto a second line at their own size.
3. Add the panel with these parts:
   - The Main deck and Sideboard switch. Keep its value in `section`.
   - The sentence.
   - 30 cards, with "Show 20 more" up to 50.
4. Build each line. Below 640px, use the smaller art and put the share under the name. Each line has these parts:
   - The place.
   - The art, with its fallback.
   - The name.
   - "Core in".
   - The bar, from 640px.
   - The share and the copies.
5. If there are withheld decks, show the line for them.
6. Handle loading, the error and the window change as the matchup table does. When the reader switches to the other list, show the skeleton until that list arrives.
7. Add a spec beside each component that changes.

**Done when**

- `/staples` shows 30 cards for both lists in every window, in both themes, at 360px, 640px and 1,280px. "Show 20 more" shows 50.
- A copied address with `section=side` opens the sideboard.
- At 360px, the four links in the header fit or wrap, with no sideways scroll.

**Blocked by** E15, and S25 for the third link in the header and its layout. **Blocks** S29.

---

## S29. See the decks behind a staple

As a Pauper player, I want to open a staple and see which of the top decks play it, and how many copies they play. Then I know where it matters.

This story covers the decks behind a card in FR-18.

**Tasks**

1. Show the name of the card as a button. The reader can open several cards at once. A window change or a switch closes all of them. The button has these parts:
   - `aria-expanded`.
   - `aria-controls`, which names a panel. The panel is always in the page, and it is hidden while it is closed.
   - The chevron.
2. Fill the panel with these parts:
   - "Played in {n} of the top 24".
   - One line for each deck in the response. Each line holds the deck as a link to its deck page, with the window. Each line also shows the bar from 640px, the share of the deck's lists and its copies.
   - The closing sentence.
3. Show the decks in one column below 1,100px, and in two columns from 1,100px. From 640px to 1,099px, the one column keeps the bar.
4. Add a spec beside each component that changes. Include a case where focus stays on the button that opened the panel.

**Done when**

- When the reader opens Counterspell at 30d, the panel lists the same decks, shares and copies as the response. Each link opens its deck page.
- A reader with a keyboard opens and closes a card with Enter and Space. Focus stays on the name of the card.

**Blocked by** S28. **Blocks** nothing.

---

## H7. Ask once more for a card table that times out

This item covers the behaviour of §4.9. On 2026-10-20 the first build of a cold window at 7d or 14d still returned 502, after 20 to 22 seconds. The next build found every table ready.

**Tasks**

1. In `api/staples.ts`, if a card table request times out or fails with a network error, and the deadline leaves at least 20 seconds, send that page request once more.
2. Give each deck's table at most one second request, for the page that timed out. A second failure on that page fails the build, as today.
3. Send no second request after a 429 or a 5xx. Send none for a call that the deadline or a 429 aborts.
4. Update the JSDoc of the handler for the second request.
5. Add a spec beside the function for these cases:
   - A table that times out once and then answers.
   - A table that times out twice.
   - A table that fails with a network error once and then answers.
   - A table whose page 1 times out and answers, and then whose page 2 times out. Page 2 gets no second request.
   - A timeout with less than 20 seconds left before the deadline.
   - A 429 and a 5xx on a table, each with no second request.
   - A call that the deadline aborts, and a call that a 429 on another table aborts, each with no second request.

**Done when**

- With a fake Endstep that answers a table only on the second request, the function returns 200.
- The specs pass, and every other case of §4.9 behaves as before.
- The PR reports one build against live Endstep, from a local dev server. It gives the window, the calls, any timeouts and the result. If no table was cold, it says so.
- After the merge, a check in production records the first request on a cold window: its cache status, its result and its time.

**Blocked by** nothing. **Blocks** nothing.

---

## Notes on sequencing, milestone 5

E15 starts at once. It is only server code and changes no page, so it runs beside milestone 4.

S28 waits for E15 and S25. It reads the response of E15. Its fourth link goes into the header that S25 changes.

S29 is the last step. It opens a panel inside the lines of S28.

H7 changes only the staples function, so it runs beside any other item.

---
# Milestone 6: card previews and cost

**Date:** 2026-10-18. This milestone comes from Draft v12 of the requirements.

This milestone has one enabler and two user stories, for FR-19 and §4.10. On 2026-10-18 the owner chose the design from a working draft. The Card previews and cost section of the design system shows that design, so this milestone has no design item.

| Wave | Items | Runs in parallel |
|---|---|---|
| 28 | E16 | Yes, beside milestones 4 and 5 |
| 29 | S30, S31 | Yes, two ways |

```
E16 the sample cards function ──┬─► S30 the cost to build
                                └─► S31 card previews
```

---

## E16. Fetch a sample list's images and prices

This item covers §4.10.

**Tasks**

1. In `api/sample-cards.ts`, check the query byte for byte. Then fetch the deck detail through our own proxy, at the exact address that the deck page uses.
2. Get the images with one Scryfall collection request for the distinct names in the list. For each card, use its normal image. If the card has no image of its own, use the image of its front face.
3. Get the prices from Scryfall searches for every printing of the names:
   - Split the names so that each query has fewer than 1,000 characters.
   - Follow each page of results.
   - For each card, keep the lowest price in tix, in euros and in dollars.
   - If a search returns 404, its names have no price.
   - Do not search prices for the six basic lands. Give them a price of zero in the response. Search snow-covered basics like other cards.
4. In both lookups, match a card by its full name or by the name of any face. Ignore case, as §3.4 does.
5. Return a price for each card, not totals. Keep each card in memory for one hour in each instance.
6. Send the requests one after another, 500ms apart, and send at most five. All the requests share a bound of 6 seconds. Keep the answers that arrived before the bound.
7. Set the cache rules:
   - A success: one hour, with one day of stale-while-revalidate.
   - A lookup that failed or ran out of time: five minutes.
   - A 429: 60 seconds.
   - A 404, and any other failure: `no-store`.
8. Add the route to `vercel.json` and to the development plugin, §4.6. Make sure that `.vercelignore` keeps the spec out of the deploy.
9. Add a spec beside the function. The spec covers these cases:
   - The query check.
   - A withheld list.
   - A card with two faces.
   - The cheapest printing for each currency.
   - A missing price.
   - A 404 from a search.
   - Snow-covered basics.
   - The split of the query, and the pages.
   - The memory.
   - The spacing, and the limit of five requests.
   - The bound.
   - Each failure.

**Done when**

- In production, `/api/sample-cards` for Affinity at 30d returns an image for each card. Its prices agree with a check by hand of the printings on Scryfall that day.
- A second request within the hour is a cache hit.
- Any other query string returns 400.

**Blocked by** nothing. **Blocks** S30, S31.

---

## S30. See what a list costs to build

As a Pauper player, I want to see the cost of the sample list on MTGO or in paper. Then I know if I can pay for the deck.

This story covers the cost to build in FR-19 and the Scryfall credit in NFR-5.

**Tasks**

1. When the deck detail has a list to show, request `/api/sample-cards`. Use the deck and the window as the key. Do not retry the request.
2. After the lists, show a block with these parts:
   - The label "Cost to build".
   - A Currency switch with three options: MTGO, € and $.
   - The total cost, and the cost of the main deck and of the sideboard.
   - The sentence that names the source of the prices.
3. Calculate each cost from the price of each card in the response. Count only the cards in the list on the screen.
4. Keep the currency of the reader in local storage, as the page keeps the theme. If no currency is stored, use MTGO.
5. If a card has no price in the selected currency, show the line that counts the cards without a price.
6. If the list is `mainOnly`, show only the cost of the main deck.
7. If the request fails, do not show the block.
8. When the reader changes the window, follow §4.8.
9. Change the credit in the footer to "Card images and prices from Scryfall."
10. Add a spec beside each component that changes.

**Done when**

- On the Affinity deck page at 30d, the total cost and the two parts agree with the list on the screen. They also agree with the prices in the response. This is true for each currency, in the two themes, at 360px and at 1,280px.
- The currency that the reader selects on one deck page is selected on the next deck page.
- If `/api/sample-cards` fails, the page shows the sample list as before, without the block.

**Blocked by** E16. **Blocks** nothing.

---

## S31. Preview a card in the sample list

As a Pauper player, I want to point at the name of a card and see its image. Then I know the card, and I stay on the page.

This story covers the card previews in FR-19.

**Tasks**

1. If the image of a card came back, show its name as a button with the dotted underline.
2. On a device that can hover, show the preview beside the panel in two cases: the pointer is on the name, or the name has keyboard focus.
   - Put the preview on the side of the panel that has room, level with the name and inside the screen.
   - When the page scrolls, move the preview with its name.
   - Hide the preview in these cases: the name leaves the screen, the pointer leaves, the name loses focus, or the reader presses Escape.
   - Set `aria-hidden` on the preview.
3. On every device, if the reader activates a name with a tap, a click, Enter or Space, open the dialog. The dialog has the image, its `alt` and a Close button. Close, Escape or a tap outside the image closes the dialog. Then focus goes back to the name.
4. If the request fails or a card has no image, show the plain name.
5. Add a spec beside each component that changes.

**Done when**

- When the pointer is on a name in the Affinity list, or the name has keyboard focus, the page shows its card. The card stays inside the screen at 1,280px and at 1,024px.
- On a phone, a tap opens the card. With a keyboard, Enter opens the card. Close moves focus back to the name.
- If `/api/sample-cards` fails, the names are plain text.

**Blocked by** E16. **Blocks** nothing.

---

## Notes on sequencing, milestone 6

E16 starts at once. It is only server code, so it runs beside milestones 4 and 5.

S30 and S31 run in parallel. Both stories change the sample list. S30 adds a block after the lists, and S31 changes how the page renders a name. Both stories use the same request. The first story to merge adds the request, and the second story uses it.

---

# Milestone 7: languages

**Date:** 2026-10-20. This milestone comes from Draft v14 of the requirements.

This milestone has one hardening item, one enabler and two user stories, for FR-20. On 2026-10-20 the owner chose the switch from a working draft. The Page header section of the design system shows the switch, so this milestone has no design item.

| Wave | Items | Runs in parallel |
|---|---|---|
| 30 | H6, E17 | Yes, two ways |
| 31 | S32 | No |
| 32 | S33 | No |

```
H6 a plain day number
E17 the strings in one file ──► S32 choose the language ──► S33 Italian, Spanish and Portuguese
```

---

## H6. Show dates with a plain day number

This item covers the formats of FR-20. Today the site writes "05 Sept", and the design system writes "5 Sept".

**Tasks**

1. In the date helpers of `src/helpers/format.ts`, write the day as `"numeric"`, not `"2-digit"`.
2. Change the specs that expect a day with a leading zero, such as "05 Sept" and "06 Sept to 05 Oct 2026".
3. Make sure that the axis ticks, the window dates and the daily share list all show the plain day.

**Done when**

- The deck page at 30d shows its window dates as "5 Sept to 4 Oct 2026", without a leading zero, in en-GB.
- Every spec passes.

**Blocked by** nothing. **Blocks** nothing.

---

## E17. Move every string into one file

This item covers the strings of FR-20.

**Tasks**

1. Add i18next and react-i18next. Set them up with `src/locales/locales.json`, which holds English only, and with English as the fallback.
2. Move every UI string of `src/` into the file, under a key that names its place. Include these strings:
   - The text on the pages and in the panels.
   - The accessibility labels and the visually hidden text.
   - The document titles, the status lines and the error messages.
3. For each string that counts, use the plural endings of i18next: `_one` and `_other` in English.
4. Keep these strings out of the file: the names of decks and cards, the Fan Content notice and the name of the site.
5. Type the keys from the English strings, so that an unknown key fails the build. Make sure that the build also fails when a language in the file lacks a key of English.
6. Move the words of the formatting helpers into the file too, such as the "to" of a window range and "Not available". Leave the number and date formats as they are.
7. Leave the specs as they are. The specs render in English and keep their queries by the English text.
8. Add a spec for the setup and for the type check.

**Done when**

- Every page reads as before, and every spec passes without a change to its English text.
- A search of `src/` finds no UI string outside `locales.json`, apart from the strings that task 4 keeps out.
- A key that is missing from the file fails `npm run build`.

**Blocked by** nothing. **Blocks** S32.

---

## S32. Choose the language

As a Pauper player, I want to read the site in my own language. Then I understand the figures and the advice without a translator.

This story covers the first visit, the switch and the formats of FR-20.

**Tasks**

1. On the first visit, read `navigator.languages` in order. Use the first language whose primary code is in the file. If none matches, use English.
2. Add the switch before the theme toggle, as the design system shows. It is a pill with the code and a chevron. A native select named "Language" lies over it, invisible. Each option names the language in its own words.
3. Show the switch only when the file holds two or more languages.
4. When the reader chooses a language, change every text at once, with no reload. Keep the choice in local storage under `language`, inside a try and catch, as the theme does.
5. Set the `lang` attribute of the `html` element to the full tag of the formats, such as `pt-BR`.
6. Make the formatting helpers follow the current language. Take the region from the first entry of `navigator.languages` with the same primary code. If no entry has it, use `en-GB`, `it-IT`, `es-ES` or `pt-BR`.
7. Add a spec beside each component that changes. Use a second language in a test fixture, so that the switch shows.

**Done when**

- With a test language in the file, the switch shows on every page, at 360px, 640px and 1,280px, in both themes.
- A choice changes the text, the `lang` attribute and the formats at once. The choice is still there after a reload.
- A browser that prefers `pt-PT` opens the site in `pt` when the file holds `pt`. A browser that prefers `fr` opens it in English.

**Blocked by** E17. **Blocks** S33.

---

## S33. Read the site in Italian, Spanish or Portuguese

As an Italian, Spanish or Portuguese player, I want the site in my language.

This story covers the languages of FR-20.

**Tasks**

1. Add the translations that the owner writes to `locales.json`: `it`, `es` and `pt`. Add each language only when it holds every key, with the `_many` plural ending that each of these languages also needs.
2. Check each language on every page, at 360px, 640px and 1,280px, in both themes. Look for text that is too long, in the header links, the switches, the pick title and the table headers. Report each place that breaks, before you shorten any text.
3. Make sure that the plurals and the formats are right in each language.
4. Add a spec that renders one page in each language and finds one translated string.

**Done when**

- The switch lists English, Italiano, Español and Português.
- Every page reads in each language with no text cut off and no sideways scroll at 360px.
- The owner accepts each language on the production site.

**Blocked by** S32, and the translations from the owner. **Blocks** nothing.

---

## Notes on sequencing, milestone 7

H6 and E17 run in parallel. Both touch `src/helpers/format.ts`. H6 changes only the day option, so the second to merge rebases in a few lines.

E17 touches about 70 components, but each change is mechanical. It can go out as a stack of pull requests, one group of pages in each.

S33 waits for the owner. The owner writes the translations in `locales.json`, once E17 has made that file.
