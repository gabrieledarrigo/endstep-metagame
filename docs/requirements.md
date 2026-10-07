# Endstep Pauper Metagame Viewer: Requirements

**Status:** Draft v3 · **Date:** 2026-10-03
**Scope:** three pages. The overview, a deck page with its numbers, a sample list and its matchups against the top 24, and a matchup table. Other deck page sections are out of scope, see §8.
**Visual design** is specified in [`design-system.html`](./design-system.html). This document covers structure, content and behaviour.

---

## 1. Purpose

A browser application that reads the public Endstep metagame API and shows the **Pauper** metagame. The overview reports which decks are played, how much of the field each one holds, how they perform, and how that has changed over time. A deck page gives one deck's numbers, a sample list, and its results against the rest of the top 24. A matchup table shows how the top decks do against each other.

The application is read-only. It stores nothing. It has no authentication and no user accounts. It is not affiliated with Endstep.

---

## 2. Decisions taken

| Area | Decision |
|---|---|
| Format coverage | Pauper only |
| Data access | Two Vercel functions: a proxy and a matchup aggregator. CORS workaround, see §4.1 |
| Cache policy | 5 minutes at the edge, with stale-while-revalidate |
| Front end | React 19 and TypeScript, built with Vite. See NFR-1 |
| Styling | Hand-written CSS in cascade layers, BEM, one stylesheet per component. No framework. Light-only theme. See NFR-11 |
| Charting | Recharts 3.x from npm |
| Pages | Overview, deck page, matchup table. React Router in declarative mode, see §4.5 |
| Quality gates | ESLint, Prettier and Vitest with React Testing Library, run by GitHub Actions on every pull request and every push to `main`. See NFR-1 |
| Release | Vercel deploys from Git. Production waits until CI passes, through Vercel Deployment Checks. See §4.7 |
| Grid size | Top 24 decks by share. The rest rolls into a single `Other` |
| Filters exposed | Time window only |
| Charts on the overview | Share over time, share composition, win rate against share |
| Deck page | Numbers, the sample list, and the deck's row of the matchup table. The full opponent list, card usage and ratings are deferred |
| Deck links | Our deck page. It links to the same deck on endstep.cc |
| Order of work | The Vite refactor first, then the deck page and the matchup table, so the new pages are written once |
| Matchup table | Its own page. Top 24 decks. Colour only clear pairs, FR-12 |

---

## 3. Data source

Base URL: `https://endstep.cc/api/metagame/v1`. All endpoints are public and require no authentication.

### 3.1 Endpoints used by this application

| Endpoint | Purpose | Parameters used |
|---|---|---|
| `/{format}/decks` | Deck list with share, players, win rate | `window`, `population`, `sort`, `dir`, `page`, `pageSize` |
| `/{format}/share-series` | Daily share per deck | `window`, `population` |
| `/{format}/decks/{slug}` | One deck: its row, games, toss, texture, daily share. See §3.6 | `window`, `population` |
| `/{format}/decks/{slug}/matchups` | One deck's results against each opponent. Called by the matchup function, not the browser. See §3.7 | `window`, `population`, `sort`, `dir`, `pageSize` |

### 3.2 Endpoints available but not used

`/formats`, `/visibility`, `/{format}/decks/{slug}/cards`, `/{format}/decks/{slug}/ratings`. The last two are reserved for the deferred deck page sections.

### 3.3 Parameter vocabulary

Extracted from the Endstep client bundle. These are the authoritative values, not inferred ones.

- **`window`**: `1d`, `7d`, `14d`, `30d`, `season`. Default `30d`.
- **`population`**: `rated`, `casual`. This application uses `rated` throughout and does not expose the choice.
- **`ratingBand`**: `q1` to `q4`, plus the ranges `q1-q2`, `q2-q3`, `q3-q4`, `q1-q3`, `q2-q4`. `q1-q4` is not a valid value. Not used. Endstep itself never passes it to the deck endpoints.
- **`minMatches`**: `0`, `20`, `50`, `100`. Not used, see §6.4.
- **`sort`**: `share`, `players`, `winRate`, `shareChange`, `name` on `/decks`. `matches`, `winRate`, `name` on `/matchups`, where `share` returns 400.
- **`pageSize`**: **maximum 50**. Larger values return HTTP 400. Default 25.
- **`decks`** (share-series only): comma-separated deck **UUIDs**, not slugs. When omitted, the API returns the top 8 series.
- **`v`**: cache-buster. The value is the `dataVersion` string from `/visibility`.

### 3.4 Card art

`https://endstep.cc/api/cards/image?name=<Card Name>&_v=2` returns a 302 redirect to the Scryfall CDN. Optional parameters: `version`, `face=back`, `set` with `cn`.

`<img>` tags are not CORS requests. Card art therefore loads directly from `endstep.cc` on any origin and **does not need the proxy**.

### 3.5 Measured characteristics

Measured 2026-09-20 against Pauper, `window=30d`, `population=rated`.

| Property | Value |
|---|---|
| Direct API latency | ~60 ms |
| Rate limit | 300 requests per 60 seconds, per IP. `x-ratelimit-*` headers are returned. Window length measured 2026-10-03 |
| Upstream cache header | `public, max-age=60, stale-while-revalidate=300` |
| Archetypes in Pauper | 264 |
| Registrations / players | 89,314 / 5,117 |
| Sum of all archetype shares | 94.1%. The rest is unclassified, see §6.1 |
| Machine-named archetypes | 230 of 264 |
| Earliest data | 2026-09-05 |

### 3.6 Deck detail

Measured 2026-10-03. About 9.7 KB, 2.7 KB compressed. It honours `window` and `population` and ignores `ratingBand`.

The response has `provenance` and `formatId` at the top level, then the fields below.

The win and loss figures in `gameResults`, `games`, `playDraw` and every `/matchups` row use one block: `{wins, losses, required, gate, rate, low, high, deff}`. `required` is 20. Below 20 decided matches, `gate` is `"too_few"` and `rate`, `low`, `high` and `deff` are null. `deck.matchWinRate` is the exception: it has no `required` and no `gate`, only `{wins, losses, rate, low, high, deff}`. See §6.8.

| Field | Contents | Used by |
|---|---|---|
| `deck` | The same object as a `/decks` row, including `art`, `colours`, `share`, `players`, `matchWinRate`, `shareChange` | FR-11 |
| `gameResults` | `rows[3]` for games 1 to 3, each with `onPlay`, `onDraw` and `total` blocks, plus a `total` row and `unknownPositionGames`. Endstep's client treats it as nullable | FR-11 |
| `games` | `game1`, `game2AfterWin`, `game2AfterLoss`, `game3` blocks. Its game 2 rows do not reconcile with `gameResults`: for Affinity at 30d, after a win plus after a loss is 8,401 to 7,866, against 8,522 to 7,964 for game 2 | Not used |
| `playDraw` | `tossWon`, `tossLost`, `onPlay`, `onDraw` blocks, and `choseToDraw {count, of, rate}` | FR-11 |
| `texture` | `averageTurns`, `averageOpeningHand`, `mulliganRate {count, of, rate}` | FR-11 |
| `shareSeries` | `days {from, to}`, `markedDay`, and `points[{day, registrations, totalRegistrations, rate}]` for this deck only. Share only, no win rate history | FR-11 |
| `sampleList` | The most common exact list for the deck. `state` is `shown`, `mainOnly` or `withheld`, with `minPlayers: 3` and a `reason`: `sideboard_below_player_floor`, `main_below_player_floor` or `no_registrations`. `players` brought this exact list. `similarity` measures it against the deck's average list. `distinctLists` counts the lists it was picked from. `main` and `side` are `{name, count, setCode, collectorNumber}`, and the set and number can be null | FR-11 |
| `cardTableWithheld` | Whether the card table is withheld | Deferred |

A UUID in place of the slug returns 404 `{"error": "Unknown deck"}`. A stale slug with the right 8-character suffix returns 307 with `canonicalSlug`. See §6.11.

### 3.7 Matchups

Measured 2026-10-03. About 15 KB at `pageSize=50`. The response has `provenance`, `formatId`, `deck`, `query`, `neverMet` and `matchups {items, total, page, pageSize}`. Each item is a win and loss block plus `matches` and `opponent {id, slug, name, machineNamed}`. Opponents carry no colours and no art. `neverMet` is the count of archetypes never faced. The mirror is not listed.

There is **no endpoint for a format-wide matrix**. Endstep's own client shows matchups only as a list on each deck's page. A 24 by 24 table therefore costs 24 calls. At 30d, every top-24 opponent of every top-24 deck was inside the first 50 rows sorted by `matches`.

---

## 4. Architecture

### 4.1 Why a proxy is required

The Endstep API returns `access-control-allow-origin` **only** when the request carries `Origin: https://endstep.cc`. Any other origin gets no such header, so the browser blocks the response. A page served from GitHub Pages, Vercel or `file://` cannot call the API directly.

Public CORS proxies were tested on 2026-09-20 and rejected. All six failed. allorigins and codetabs returned HTTP 522 after about 20 seconds. cors.lol returned HTTP 429 on the first request. whateverorigin returned HTTP 400. thingproxy refused the connection.

### 4.2 Components

1. **The front end**. A Vite application in `src/`, built to `dist/` on Vercel. It serves all three pages from one `index.html`.
2. **`api/metagame.ts`**. The proxy. It forwards `GET` requests to `https://endstep.cc/api/metagame/v1/...`, keeps the allow-listed query parameters, and returns the upstream body with CORS headers.
3. **`api/matchups.ts`**. The matchup aggregator. It builds the top-24 matrix on the server and returns it in one response. See §4.4. It is a separate function so the proxy stays a pass-through.

### 4.3 Proxy behaviour

- The endpoint path reaches the function through the rewrite in `vercel.json`, as the `path` query parameter: `/api/metagame/Pauper/decks` becomes `/api/metagame?path=Pauper/decks`.
- Accepts `GET` and `HEAD`. `OPTIONS` answers the CORS preflight with 204. Every other method returns 405.
- **Allow-lists** the upstream path prefix, so the function cannot be used as an open proxy to arbitrary hosts.
- Sets `Cache-Control` by status. A success gets `public, s-maxage=300, stale-while-revalidate=600`, so the Vercel edge serves repeat requests without calling Endstep. A 429 gets `public, s-maxage=10`. Any other error gets `no-store`.
- Passes upstream non-2xx status codes through unchanged, so the client can tell a rate limit from a server error.
- Sends no cookies, credentials or client identifying headers upstream.

### 4.4 Matchup function

`GET /api/matchups?window=30d`. Two pages read it: the matchup table, and the deck page for one row, FR-11. Both request the same URL, so they share one edge cache entry per window. `window` is the only parameter, checked against the five values in §3.3. The raw query string must be exactly `?window=` followed by one of the five values, byte for byte. Anything else returns 400: a missing or repeated `window`, another parameter, an encoded or padded value. The edge caches by the raw query string, so any variant would otherwise force a cold build of 25 calls. The format is Pauper and the population is `rated`, both fixed.

1. Fetch the top 24 decks: `/Pauper/decks?window=…&population=rated&sort=share&dir=desc&pageSize=24`.
2. Fetch `/Pauper/decks/{slug}/matchups?window=…&population=rated&sort=matches&dir=desc&pageSize=50` for each of the 24, in parallel.
3. Keep only the rows whose opponent is one of the 24. Drop everything else.
4. Where a pair has a record in one direction only, fill the other direction from it: wins and losses swap, `rate` becomes 1 minus `rate`, and the range becomes 1 minus `high` to 1 minus `low`. Counts are exact. The range is close, see §6.10. If the recorded direction is gated, the filled one is gated too, with null `rate`, `low` and `high`.

Response:

```
{
  window: { from, to },
  decks: [{ id, slug, name, colours, share }],
  cells: { [rowSlug]: { [columnSlug]: { wins, losses, matches, rate, low, high, gate } } }
}
```

- `window` is `provenance.window` from step 1, unchanged. §6.7 applies when it is displayed.
- `decks` is in share order. `share` is `share.rate`.
- `cells[a][b]` is deck `a`'s record against deck `b`. A pair absent from both decks' first 50 rows has no entry. The mirror has no entry.
- About 88 KB uncompressed and 21 KB compressed, computed from the 30d data.

Behaviour:

- One cold build costs 25 upstream calls. `Cache-Control` follows the proxy's rules by status, with one difference: a 429 is held for 60 seconds, the length of Endstep's rate limit window, so a rate-limited build is not retried by the next visitor inside it. A success is held for 5 minutes and any other error is `no-store`. The edge holds one entry per window, in each region that has served one.
- If any upstream call fails, the whole request fails. No partial matrix. An upstream 429 returns 429. Anything else returns 502.
- Each upstream call has the same 8 second timeout as the proxy.
- Same method rules and CORS headers as the proxy, §4.3.

### 4.5 Routing

The front end uses **React Router 8 in declarative mode**: `BrowserRouter`, `Routes` and `Route`, `Link`, `useNavigate` and `useSearchParams`. No Vite plugin, no loaders, no data mode. It was chosen on the criteria that chose Recharts in NFR-2: it is the most used React router, and declarative mode is its simplest form. There are three routes.

| Path | Page |
|---|---|
| `/` | Overview |
| `/decks/{slug}` | Deck page |
| `/matchups` | Matchup table |

- `vercel.json` rewrites `/decks/:slug` and `/matchups` to `/index.html`. Vercel applies rewrites after it checks for real files, so built assets are not affected.
- `?window=` belongs to every page and carries across links. Pages read and write it with `useSearchParams`. See FR-1.
- Back and forward work. A route change does not reload the page.
- Any other path is a Vercel 404.
- A route change scrolls to the top and moves focus to the new page's main heading, so keyboard and screen reader users know the page changed. Declarative mode does not do this, because `ScrollRestoration` exists only in data mode, so the app does it on location change.

### 4.6 Local development

`npm run dev` starts Vite. A small Vite plugin serves `/api/metagame/*` and `/api/matchups` by calling the real handlers, and applies the same rewrite as `vercel.json`. It serves each response from memory for its `s-maxage`, the lifetime the edge uses too. It does not serve stale responses and does not evict expired entries, so it is simpler than the edge. Without that, every reload of the matchup page in development costs 25 upstream calls, and a dozen reloads in a minute reach the rate limit. It replaces `dev-server.js`, which is deleted. Vite's dev server already falls back to `index.html` for the page routes.

### 4.7 What deploys

Vercel runs `npm run build` and serves `dist/`. The functions in `api/` are built from source as before.

- `vercel.json` pins `"framework": "vite"`. The project was created with the "Other" preset. Without the pin, Vercel may skip the build and serve the source `index.html`, which renders a blank page.
- `vercel.json` also carries the proxy rewrite (§4.3) and the page rewrites (§4.5).
- Only `dist/` is served. Source files, `docs/` and the development files are no longer reachable from the public site.
- Vercel deploys every file in `api/` as a function. `.vercelignore` therefore excludes `api/**/*.spec.ts`, so the specs beside the functions are never deployed.
- **Production waits for CI.** The project's Deployment Checks require the `ci` job from NFR-1. Vercel still builds every push to `main`, but assigns the production domain only after `ci` passes on that commit. Preview deployments do not wait. The setting lives in the Vercel dashboard, not in `vercel.json`. See open item 6.

---

## 5. Functional requirements

### FR-1. Window selector
Every page offers the five windows (`1d`, `7d`, `14d`, `30d`, `season`) and defaults to `30d`. Changing the window refetches and re-renders every section. The selected window is written to the URL query string and carries across links between pages, so a view can be linked and reloaded.

### FR-2. Header summary
Shows the format, the resolved window dates, total registrations and total players. The dates run from `provenance.window.from` to the last day the window actually covers, which is `provenance.window.to` minus one. See §6.7. It states the population in use (`rated`). It attributes the data to Endstep and links to the source page.

### FR-3. Deck grid
The top 24 decks by share, each as a card showing:

- the archetype's key card art, from `art.cardName` via the image endpoint
- deck name
- colour identity, from the `colours` array, as WUBRG pips
- **meta share** as a percentage
- **players**
- **match win rate** as a percentage
- the three key cards from `keyCards`

Each card links to the deck's page, FR-11.

### FR-4. Deck table
The same 24 decks in tabular form: rank, name, colours, share, players, matches, win rate, share change. Columns sort client-side. Numbers use consistent precision: share and win rate to one decimal place, counts as integers with thousands separators.

The table is a peer of the grid, not a replacement. Both are visible on the page. Each deck name links to the deck's page, FR-11.

### FR-5. Share over time
A multi-series line chart of daily meta share. It uses the API's default top 8 series. Each series toggles from the legend. The x-axis covers the full date range of the window.

Days before 2026-09-05 return `rate: null`. **Render them as a gap, not as zero.** See §6.2.

### FR-6. Share composition
A **ranked horizontal bar chart**. The top 24 decks plus an **`Other`** bar, sorted by share, each bar labelled with its value. See §6.1 for how `Other` is derived and labelled.

This is not a pie. Twenty-five categories exceed the eight-hue ceiling of a categorical palette, and a pie with 25 slices cannot be read at any size. Bars encode magnitude by length, so they use one hue, sequential blue. The `Other` bar uses `--text-400` to mark it as a residual rather than a deck.

### FR-7. Win rate against share
A scatter plot. Meta share on the x-axis, match win rate on the y-axis, marker size proportional to player count. A reference line at 50% win rate separates decks above the field from decks below it. This is the main analytical view on the page. It shows which decks are good and which are only popular.

All markers use **one hue**. A scatter invites comparison between any two points, and under all-pairs comparison only three hues stay separable. Colouring 24 decks individually is therefore not available. Identity comes from position, from labels on selected decks, and from hover.

### FR-8. Share change
Where `shareChange.points` is present, the grid and table show the movement against the previous window, with its direction. Where it is `null`, the UI states that no comparison is available. It must not show a zero or a blank. See §6.3.

### FR-9. Loading, error and empty states
Every data-backed section has its own loading state. A failed fetch shows a readable error and a retry control. HTTP 429 is reported as a rate limit, not as a generic failure. A window that returns no decks renders an empty state rather than a broken chart. This applies on every page.

### FR-10. Navigation
Every page has a header with links to the overview and the matchup table. The current page is marked with `aria-current`. Every page carries the attribution required by NFR-5.

Deck names link to `/decks/{slug}` wherever a deck is listed: grid cards, table rows, matrix headers. Links keep the current `?window=`.

### FR-11. Deck page
Two calls. `/{format}/decks/{slug}` feeds every section except the matchups row, see §3.6. `/api/matchups` feeds the matchups row, §4.4.

**Header.** Deck name, colour pips, key card art and the three key cards. The window selector and the resolved window dates (§6.7). A link to the same deck on endstep.cc, in a new tab.

**Stat tiles.** Meta share, players, matches, match win rate with its range, and share change under the rules of FR-8.

**Share over time.** One line, from `shareSeries.points`. Days with `rate: null` are a gap, as in FR-5. Under the chart, a collapsed details element lists the same days and shares as a table, so the chart is not the only carrier, NFR-6.

**Games.** A table from `gameResults`. Rows are game 1, game 2, game 3 and all games. Columns are on the play, on the draw and total. Each cell shows a game win rate. Its range and decided count show on hover and on keyboard focus. A note under the table gives `unknownPositionGames`. If `gameResults` is null, the table shows the unavailable state. `games` is not used, §3.6.

**Toss.** Win rate after winning the toss and after losing it, from `playDraw.tossWon` and `tossLost`. How often players chose to draw, from `choseToDraw`. Endstep presents these as game 1 results, open item 5.

**Texture.** Average turns, average opening hand, mulligan rate.

**Sample list.** From `sampleList`, in the same response. It is the most common exact list registered for the deck, not a recommended one.

- The main deck and the sideboard as two lists, each with its card count. Each card shows its count and name, sorted by count and then by name.
- One line says where the list comes from: how many players brought it, how close it is to the deck's average list, and how many distinct lists it was the most common of.
- A copy control puts the list on the clipboard as plain text: one `count name` line per card, and a blank line before the sideboard. That is the format MTGO imports. If the clipboard is refused or missing, the control says so and shows the same text, selected, ready to copy by keyboard.
- `mainOnly` shows the main deck. The sideboard is replaced by a note: fewer than `minPlayers` players, 3 today, brought this exact 75. The control copies the main deck only.
- When `side` is empty, the sideboard heading and the blank line before it are left out.
- `withheld` shows no list and no control. A note gives the reason: no main deck was brought by `minPlayers` or more players, or no list was registered in this window. Never an empty list.

**Matchups against the top 24.** The deck's own row of the matchup table, from `/api/matchups`.

- The other 23 decks of the top 24, in share order. The deck itself is left out. The rotated names, cells, colour rule, gated and no-data states, legend and detail are the ones FR-12 defines.
- It spans the page width below the numbers and the sample list. Where the window is narrower than the row, about 870px, it scrolls sideways and the deck's name stays in view. The page itself does not scroll sideways, NFR-7.
- One tab stop, with arrow keys between cells, as in FR-12.
- It loads and fails on its own. A failed request shows the error panel inside this section, and the rest of the page stays. As in FR-12, there is no automatic retry.
- The page finds its row by `deck.id` from the deck detail, matched against `decks[].id` in the response, never by the slug in the address. A stale slug therefore still finds its row.
- When the deck is not in the top 24 for the selected window, the section says so in place of the row and links to the matchup table. The note takes the deck's name from the detail.
- The two responses are cached apart, so near the daily rollover they can cover different windows. When the row's window differs from the detail's, the section prints the row's own dates.

Figures in the games and toss sections count games, not matches. Label them game win rate, never match win rate. §6.6 covers the match-level figures.

A gated block renders as too few to call, never as a zero or a blank. See §6.8.

A deck with no matches in the selected window shows the empty state from FR-9, with the window selector to widen it.

An unknown slug shows a not-found state with a link to the overview. That covers both a 404 from Endstep and a 400 from the proxy for a slug it rejects, and neither offers a retry. A stale slug resolves to the current deck, and the page replaces the URL with `deck.slug` through the router, so back and forward stay correct. The data is keyed by slug, so the replacement costs one more fetch. Stale links are rare, and that is accepted. See §6.11.

### FR-12. Matchup table
A page with one table: the top 24 decks by share, against each other. One call to `/api/matchups`, §4.4. The design system's Matchup table section is the visual specification.

- Rows and columns are the same 24 decks in share order. A cell is the row deck's match win rate against the column deck, as a whole percentage. The table reads by row.
- Row headers are the deck names. Column headers are the same names in full, rotated. Neither carries a rank number.
- **Colour only clear results.** A pair is clear when it has at least one range and every range present for it excludes 50%. Both cells of a clear pair get the colour for their side of 50%: one shade of blue when the row deck is favoured, one shade of red when it is not. There is no intensity scale, because the number already carries the size. Every other cell stays neutral and still shows its number. Clear cells also use a heavier weight, so colour is never the only cue. Measured 2026-10-03 at 30d, 96 pairs qualify, 192 cells. See §6.10.
- A gated cell shows no number. It reads as too few to call, with the decided count against the 20 required on hover. See §6.8.
- A pair with no entry reads as no data. The diagonal is the mirror. It is muted and labelled for assistive technology.
- Hover or keyboard focus on a cell shows both deck names, the match win rate to one decimal place, the range, wins, losses and matches.
- The table is one tab stop. Arrow keys move between cells, following the ARIA grid pattern with a roving `tabindex`. 576 cells must not mean 576 tab stops.
- The page does not retry `/api/matchups` on its own. A failed build already cost up to 25 upstream calls. The retry control is the only retry.
- A legend states the colour rule in words.
- Row and column headers link to the deck pages, FR-10.
- Each deck page shows its own row of this table, FR-11.
- The table sits in a full-width band that breaks out of the page column, centred, with no fixed height and no scrollbar. The header row stays at the top of the window while the page scrolls past the table.
- Where the window is narrower than the table, about 1,010px, the band scrolls sideways and the first column stays in view. The page itself does not scroll sideways, NFR-7.
- The page has the window selector and the resolved window dates.

---

## 6. Data caveats the UI must handle

These are properties of the source data, found by inspection. Ignoring any of them produces wrong or misleading output.

### 6.1 Shares do not sum to 100%
Across all 264 Pauper archetypes, shares total **94.1%**. About 5.9% of registrations are unclassified. The top 24 decks account for **78.4%**. Figures measured 2026-09-20.

`Other` is computed as `1 − Σ(top 24 shares)`, which was **21.6%** at that measurement. It covers the 240 tail archetypes and the unclassified registrations. Label it so this is clear, for example `Other (240 archetypes and unclassified decks)`. Do not present it as a single archetype.

### 6.2 History is shorter than the window
Endstep's data begins **2026-09-05**. A 30-day window returns 30 daily points and only 16 carry data. The earlier points have `registrations: 0` and `rate: null`. Plotting them as zero draws a false collapse in every deck's share. Omit them from the line path.

### 6.3 `shareChange` is unavailable on the default window
`shareChange.points` is populated for `1d`, `7d` and `14d`. On `30d` it is `null` with `reason: "previous_window_empty"`. On `season` it is `null` with `reason: "no_previous_window"`. There is not yet enough history to form a previous window. `30d` is the default, so the share-change column is empty on first load and the UI must say why. This resolves itself as Endstep accumulates history.

### 6.4 The long tail is noise, the top 24 is not
230 of 264 archetypes have `machineNamed: true`. These are generated names, mostly for single-player decks whose win rates are 0% or 100%. All 24 decks in the grid are human-named. The smallest has 114 players and 805 matches, and none is sample-gated. No noise filtering is needed inside the grid, which is why `minMatches` is not exposed. Any feature that widens the list beyond the top 24 has to handle this again.

### 6.5 Win rates carry uncertainty
`matchWinRate` includes `low` and `high` confidence bounds and a design effect, `deff`. A player's repeated matches are not independent samples. A bare percentage overstates its own precision. Show the bounds on hover at minimum. The scatter plot must not invite reading small differences as real.

### 6.6 Win rate is match-level
`wins` and `losses` count matches, not games. Draws are not represented. Label the figure `match win rate`, not `win rate`. The exceptions are `gameResults` and `playDraw` on the deck detail, which count games, FR-11.

### 6.7 The window end date is an exclusive bound
`provenance.window.to` is the day after the last day the window covers. Measured on 2026-10-01, every preset returned `to: 2026-10-02`, and the 30-day window ran from `2026-09-02`, which is 30 days ending 1 October.

Printing `to` as the end date names a day that has not happened, and makes the 1-day window read as three days. Subtract one day before displaying it. The field is still the right one to read, it just is not the last covered day.

Subtracting one day does not make `1d` cover a single day. The API's `1d` preset returns a two-day span, `from` two days before `to`, and the fix takes the label from three days to two. That remainder is upstream behaviour, not a display problem.

### 6.8 Win rates below 20 decided matches are gated
Win and loss blocks carry `required: 20`. Below that, `gate` is `"too_few"` and `rate`, `low`, `high` and `deff` are null, while `wins` and `losses` are still present. `deck.matchWinRate`, on `/decks` and on the deck detail, has no `gate` field and returns a rate from any number of matches. Apply the same threshold to it: fewer than 20 decided matches reads as too few to call, whatever `rate` says. Show it as too few to call, with the count against the 20 required. A null rate plotted or printed as 0% is a false statement.

No top-24 deck is gated at deck level today. The smallest on `1d` had 95 decided matches, measured 2026-10-03. Matchup cells and game splits are gated more often: one top-24 pair was gated at 30d.

### 6.9 Matchup rows do not add up to the deck total
Measured 2026-10-03: Izzet Control's matchup rows sum to 1,976 matches against a deck total of 2,122. The mirror is not listed, and the gap splits 90 wins to 56 losses, so it is not only the mirror. It is most likely matches against unclassified decks. Do not present a matchup row as a share of the deck's matches, and do not derive a deck's win rate from its rows.

### 6.10 Most matchup cells are within noise
Measured 2026-10-03 at 30d for the top 24: the median pair has 152 matches. 90 of 276 pairs have fewer than 100 and 25 have fewer than 50. The median range is 19 points wide. 193 of the 550 ungated cells have a range that excludes 50%. Colouring every cell by its rate would mostly display noise. That is why FR-12 colours only clear results.

The two directions of a pair agree exactly: equal match counts, wins and losses swapped, rates adding to 1. The ranges differ slightly, because each direction uses its own deck's `deff`. That is enough to split one pair: Elves against Spy Combo excludes 50%, Spy Combo against Elves does not. FR-12 therefore decides per pair, not per cell. The same closeness is why §4.4 may fill a missing direction from the other one.

### 6.11 Slugs change
A deck's slug is a name part and an 8-character suffix, such as `affinity-e93f5f74`. Any name part with the right suffix, such as `renamed-e93f5f74`, returns 307 with `canonicalSlug`. The proxy's `fetch` follows the redirect, so the page receives the current deck. Verified through the production proxy on 2026-10-03. A deck page linked under an old name therefore still loads, and FR-11 corrects the URL.

---

## 7. Non-functional requirements

### NFR-1. Build and toolchain
The front end is a Vite application in TypeScript with React 19. `npm run build` type-checks it and bundles it into `dist/`. `package-lock.json` pins every dependency.

| Dependency | Version |
|---|---|
| React, ReactDOM | 19 |
| React Router | 8, declarative mode |
| Recharts | 3.10 |
| Vite | 8 |
| TypeScript | 6.0, strict mode. See below |

- TypeScript stays on 6.0, the last release with the JavaScript compiler API. TypeScript 7.0 ships without one, so typescript-eslint refuses it and Vercel's install fails on the peer conflict. Measured on this repo on 2026-10-06. typescript-eslint tracks support for 7.1 in issue #10940. When it lands, move to 7, either outright or with TypeScript's documented side-by-side setup. 6.0 already warns about everything 7 removes.
- TypeScript runs in strict mode. Once the code is TypeScript, a type error fails the build. Until then, the build is `vite build` alone, because `tsc` fails on a project with no TypeScript files.
- The root `tsconfig.json` is read by Vercel's function build. Vite's client types belong in `tsconfig.app.json`. Putting them in the root config breaks the function build.

**Scripts.**

| Script | What it does |
|---|---|
| `npm run dev` | Vite with the API plugin, §4.6 |
| `npm run build` | The type check, then `vite build` |
| `npm run lint` | ESLint over the repository |
| `npm run format` | Prettier rewrites every covered file |
| `npm run format:check` | Prettier checks without writing. CI runs this one |
| `npm test` | Vitest, one run, no watch mode |

**Lint and format.** ESLint and Prettier are explicit dev dependencies, pinned in the lockfile.

| Tool | Version | Configuration |
|---|---|---|
| ESLint | 10 | Flat config. `typescript-eslint` recommended rules, the React Hooks rules, `curly: all`, and `eslint-config-prettier`, so ESLint never disputes a formatting choice |
| Prettier | 3 | Its defaults. `.prettierignore` excludes `dist/`, `docs/` and the lockfile. The documents in `docs/` are written by hand |

`curly: all` requires the braces. Prettier always puts a block's body on its own line. Together they enforce the brace rule in `AGENTS.md`.

**Tests.** Vitest 5 with React Testing Library 16 and jsdom. Vitest runs on the Vite configuration, so TypeScript, JSX, CSS imports and ES modules need no setup of their own. Its API matches Jest's.

- **The rule of thumb: an exported function with a consumer has a spec.** That covers components, hooks, helpers and the API functions.
- The spec sits beside its module and is named after it: `components/Card.tsx` and `components/Card.spec.tsx`, `format.ts` and `format.spec.ts`.
- The API functions are plain `Request` to `Response` handlers, so their specs, `api/metagame.spec.ts` and `api/matchups.spec.ts`, call them directly with `fetch` stubbed.
- Vitest runs two projects: `api` in Node for the specs in `api/`, and `app` in jsdom with the Testing Library setup for the specs in `src/`. A spec needs no per-file setup. Shared test helpers and fixtures live in `test/`, outside `src/`.
- Specs query by role and by visible text, the way a user finds things. No snapshot tests.
- Specs never call Endstep. Every request is stubbed.

**Documentation.** Every API function and every helper has a JSDoc block. A helper is any exported function that is not a component: hooks, and the formatting and data functions.

- One sentence on what it does, a `@param` for each parameter, `@returns`, and `@throws` when it throws.
- TypeScript carries the types, so the tags do not repeat them.
- Components and specs need no JSDoc.
- A JSDoc block documents a contract. It is not one of the inline comments `AGENTS.md` rules out.

**Continuous integration.** One GitHub Actions workflow, `.github/workflows/ci.yml`.

- It runs on every pull request and on every push to `main`.
- It has one job, named `ci`. The Deployment Check in §4.7 refers to that name, so renaming the job breaks the release gate.
- Steps: check out, set up Node 24 with the npm cache, `npm ci`, `npm run format:check`, `npm run lint`, `npm test`, `npm run build`. The first failure stops the job.
- Branch protection on `main` requires `ci` to pass before a pull request merges.

Every commit that reaches `main` therefore compiles, lints, is formatted, and passes the suite, and only such a commit reaches production.

This replaces the no-build decision of Draft v2. That decision pinned React to 18, because React 19 ships no UMD build, and named Vite as the escape hatch. The owner took it on 2026-10-03, for modules, type checking and room for more pages. A mechanical port of the v2 page to Vite and React 19 rendered every section with live data, and an offline `vercel build` kept the function and the rewrite.

### NFR-1a. Design language
Colour, typography and the chart palette are specified in [`design-system.html`](./design-system.html), which is the authority for every token. In summary: a light-only theme on `#f9f9f7`, `system-ui` as the single typeface so no font is fetched and NFR-9 holds, `#1c5cab` for links and primary buttons at 6.46:1, and an eight-hue categorical palette validated for colour-vision deficiency against our own surface.

Three of the eight series hues fall below 3:1 against the surface. That triggers the relief rule: the chart must ship visible labels or a table view. FR-4's deck table covers this, and the line chart also labels its series ends. Do not drop either without re-checking the palette.

### NFR-2. Charting library: Recharts
Charts use **Recharts 3.10**, installed from npm. Two criteria decided the choice: simplicity and popularity. The comparison below was made under the no-build constraint of Draft v2. The move to a build removes the UMD argument against the others, and the simplicity argument still stands.

**Popularity.** Recharts is the most downloaded charting library on npm, about 4.8 times Chart.js and 11 times ECharts.

| Library | npm downloads/week | Transfer size (brotli) | React integration |
|---|---:|---:|---|
| **Recharts** | **43.0 M** | 150 KB | Native, declarative components |
| Chart.js | 9.0 M | 72 KB | Imperative. `react-chartjs-2` has no UMD build |
| ECharts | 3.7 M | 367 KB | Imperative wrapper required |
| ApexCharts | 1.6 M | 267 KB | Imperative wrapper required |
| Observable Plot | 0.5 M | 69 KB plus 92 KB d3 | Imperative wrapper required |

**Simplicity.** Recharts is the only candidate that is a React library rather than a JavaScript library with a React adapter. Charts are written as JSX, for example `<LineChart><Line/><XAxis/></LineChart>`. There are no refs, no lifecycle management, no `update()` or `destroy()` calls, and no wrapper component to write. Chart.js is half the size, but the saving is paid for in imperative code, which works against the stated criterion.

Recharts renders SVG rather than canvas, so chart content stays in the DOM. That helps NFR-6.

Recharts covers the overview's three charts: `LineChart` for FR-5, a horizontal `BarChart` with `LabelList` for FR-6, and `ScatterChart` with `ZAxis` for the bubble sizing in FR-7. The deck page's share line in FR-11 is a `LineChart`. The matchup table in FR-12 is an HTML table, not a chart.

### NFR-3. Performance
- Page interactive within 3 seconds on a normal broadband connection.
- Initial render API calls: exactly **two** on the overview, `decks` at `pageSize=24` and `share-series`. **Two** on the deck page: the deck detail and `/api/matchups`. The second is the matchup table's own request, so it shares that page's edge cache entry. **One** on the matchup table.
- Script payload is a reference, not a gate. Draft v2 shipped about 743 KB brotli, 544 KB of it Babel Standalone. The mechanical Vite port measured 156 KB of script and 2 KB of CSS, brotli, on 2026-10-03.
- Card art is lazy-loaded with `loading="lazy"` and sized to prevent layout shift.

### NFR-4. Respecting the upstream service
The application must not put meaningful load on Endstep. Edge caching (§4.3) means repeat visits and repeated window switches cost no upstream requests. The client must not poll. It must not retry more than twice. It must back off on 429. Total upstream traffic should stay well below the limit of 300 per 60 seconds. The matchup function costs 25 upstream calls per cold window, so warming all five windows costs 125 in each edge region that serves a request. The deck page's matchups row requests the same URL, so it adds no upstream calls once a window is warm. Several regions warming every window inside one minute would pass the limit. At this site's traffic that is unlikely, and §4.4 holds a 429 at the edge for the full minute when it happens.

### NFR-5. Attribution
The page states that the data comes from Endstep and links to `https://endstep.cc/metagame`. It does not present itself as an official Endstep product.

### NFR-6. Accessibility
- All content reachable and operable by keyboard.
- Charts are never the only carrier of information. Everything in a chart is also in the table.
- Colour is never the only means of conveying meaning. Contrast targets WCAG AA.
- Card art carries meaningful `alt` text. Decorative elements are hidden from assistive technology.

### NFR-7. Responsive
Usable from 360 px to wide desktop. The table scrolls horizontally rather than reflowing. The page itself never scrolls horizontally.

### NFR-8. Browser support
Current versions of Chrome, Firefox, Safari and Edge. No IE, no polyfills.

### NFR-9. Privacy
No analytics, no cookies, no local storage of personal data, no third-party requests beyond the card-art host.

### NFR-10. Deployment
Deployed on Vercel from the Git repository. A Vite build and two serverless functions. No environment variables and no secrets. Production waits until CI passes, §4.7.

### NFR-11. CSS architecture
Plain CSS files, processed by Vite. No CSS Modules, no CSS-in-JS and no framework, so class names ship exactly as the design system documents them.

**Cascade layers.** `src/styles/index.css` is the one global entry. `main.tsx` imports it first. It declares the layer order once:

```css
@layer tokens, base, layout, components;
```

A later layer overrides an earlier one, whatever the selectors' specificity and whatever order Vite emits the files in.

| Layer | Owns | Example |
|---|---|---|
| `tokens` | The design system's tokens: custom properties on `:root`, from part three of `design-system.html`. Nothing else | `--text-900`, `--win` |
| `base` | The browser reset and the default rules for elements: text, headings, links, lists, tables, the focus ring. The one shared class, `.visually-hidden` | `body`, `h1`, `a`, `:focus-visible` |
| `layout` | The layout primitives the pages are built from: the page wrapper, the full-width band that breaks out of it, the spacing between sections | `.page`, `.bleed` |
| `components` | The UI components, one BEM block each | `.stat-tile`, `.deck`, `.matchup__cell` |

- Every rule sits in a layer. A rule outside any layer overrides every layer, so an unlayered rule is a defect.
- No `!important`. It reverses the layer order.
- Element selectors appear only in `base`.

**Component stylesheets.** Each component imports its own stylesheet, named after it: `StatTile.tsx` imports `./StatTile.css`, and the file wraps its rules in `@layer components`.

- BEM is the naming convention: `.stat-tile`, `.stat-tile__label`, `.stat-tile--hero`.
- A component's stylesheet styles only the elements that component renders. It does not reach into a child component, and it does not style anything outside its own markup. `.stat-list` belongs to `Summary.css`, because the summary renders the list. `.stat-tile` belongs to `StatTile.css`.
- A parent changes a child only through a modifier the child defines, such as `--hero`. It never selects into the child's classes.
- A rule that more than one component needs belongs in `base` or `layout`, not in a component's file.

**Breakpoints.** Three ranges, and only their two boundaries appear in media queries.

| Range | Width |
|---|---|
| Mobile | Below 640px |
| Tablet | 640px to 1,099px |
| Large desktop | 1,100px and up |

- Styles are written for mobile first. `@media (min-width: 640px)` and `@media (min-width: 1100px)` add to them.
- 640px is where the design system already switches. 1,100px is where the matchup table fits without scrolling, FR-12.
- Custom properties do not work in media queries, so the two values are written as numbers. This section is their reference.
- The window selector scrolls sideways below 640px. It used to below 400px. It is 307px wide, so it only scrolls below about 347px. Between 400px and 639px the one visible change is that the scroll box clips the outer pixel of the focus ring, as it already did below 400px.
- The win rate scatter shows its point labels from 640px. It used to from 761px. Between 640px and 760px the labels behave as they did at 761px: no label overlaps another, and a bubble can cover part of a label.

**No CSS linter for now.** Prettier formats the CSS. Review enforces the rules above.

---

## 8. Out of scope

- Deck page sections beyond the numbers, the sample list and the matchups row: the deck's full list of opponents, card usage and the rating distribution.
- A matchup table beyond the top 24 decks.
- Formats other than Pauper.
- The `casual` population and rating-band filtering.
- Deck search, `minMatches` filtering, and pagination beyond the top 24.
- Dark mode. The theme is light-only by decision. Adding dark mode means a second palette validated against a dark surface. It is never an automatic inversion.

---

## 9. Open items

1. ~~Deck card link target.~~ Settled: our deck page, which links to endstep.cc. FR-10.
2. ~~Share composition chart form.~~ Settled: ranked horizontal bars, FR-6.
3. **Series count on the time chart.** Currently the API default of 8. Charting more than 8 of the 24 grid decks is possible by passing deck UUIDs to `share-series`, at no extra request cost.
4. **Matchup coverage on other windows.** At 30d, every top-24 opponent was inside the first 50 matchup rows. Not yet checked on `1d`, `7d`, `14d` and `season`. §4.4 fills a pair found in one direction only. A pair outside both decks' first 50 rows reads as no data.
5. **What the toss blocks count.** Endstep presents `playDraw` as game 1 results. Confirm against the numbers before FR-11 labels them.
6. **Deployment Checks on this plan.** Vercel's documentation does not say which plans offer Deployment Checks. If this project's plan lacks them, the fallback is to turn off Vercel's Git deploys and deploy from the `ci` workflow with the Vercel CLI, which needs a `VERCEL_TOKEN` secret and the project IDs in GitHub.
