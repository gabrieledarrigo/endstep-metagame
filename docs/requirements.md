# Endstep Pauper Metagame Viewer: Requirements

**Status:** Draft v2 · **Date:** 2026-09-25
**Scope:** the overview page only. The per-deck page is out of scope and will be specified separately.
**Visual design** is specified in [`design-system.html`](./design-system.html). This document covers structure, content and behaviour.

---

## 1. Purpose

A browser application that reads the public Endstep metagame API and shows the **Pauper** metagame on one page. It reports which decks are played, how much of the field each one holds, how they perform, and how that has changed over time.

The application is read-only. It stores nothing. It has no authentication and no user accounts. It is not affiliated with Endstep.

---

## 2. Decisions taken

| Area | Decision |
|---|---|
| Format coverage | Pauper only |
| Data access | Vercel serverless proxy. CORS workaround, see §4.1 |
| Cache policy | 5 minutes at the edge, with stale-while-revalidate |
| Front end | React via CDN and in-browser Babel. **No build step** |
| Styling | Hand-written CSS, no framework. Light-only theme |
| Charting | Recharts 3.x via its UMD build |
| Grid size | Top 24 decks by share. The rest rolls into a single `Other` |
| Filters exposed | Time window only |
| Charts on page 1 | Share over time, share composition, win rate against share |
| Matchup matrix | **Excluded** from page 1. Deferred to the per-deck page |
| Per-deck page | Deferred |

---

## 3. Data source

Base URL: `https://endstep.cc/api/metagame/v1`. All endpoints are public and require no authentication.

### 3.1 Endpoints used by this application

| Endpoint | Purpose | Parameters used |
|---|---|---|
| `/{format}/decks` | Deck list with share, players, win rate | `window`, `population`, `sort`, `dir`, `page`, `pageSize` |
| `/{format}/share-series` | Daily share per deck | `window`, `population` |

### 3.2 Endpoints available but not used on page 1

`/formats`, `/visibility`, `/{format}/decks/{slug}`, `/{format}/decks/{slug}/matchups`, `/{format}/decks/{slug}/cards`, `/{format}/decks/{slug}/ratings`. These are reserved for the per-deck page.

### 3.3 Parameter vocabulary

Extracted from the Endstep client bundle. These are the authoritative values, not inferred ones.

- **`window`**: `1d`, `7d`, `14d`, `30d`, `season`. Default `30d`.
- **`population`**: `rated`, `casual`. This application uses `rated` throughout and does not expose the choice.
- **`ratingBand`**: `q1` to `q4`, plus the ranges `q1-q2`, `q2-q3`, `q3-q4`, `q1-q3`, `q2-q4`. `q1-q4` is not a valid value. Not used on page 1.
- **`minMatches`**: `0`, `20`, `50`, `100`. Not used on page 1, see §6.4.
- **`sort`**: `share`, `players`, `winRate`, `shareChange`, `name`.
- **`pageSize`**: **maximum 50**. Larger values return HTTP 400.
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
| Rate limit | 300 requests per window, per IP. `x-ratelimit-*` headers are returned |
| Upstream cache header | `public, max-age=60, stale-while-revalidate=300` |
| Archetypes in Pauper | 264 |
| Registrations / players | 89,314 / 5,117 |
| Sum of all archetype shares | 94.1%. The rest is unclassified, see §6.1 |
| Machine-named archetypes | 230 of 264 |
| Earliest data | 2026-09-05 |

---

## 4. Architecture

### 4.1 Why a proxy is required

The Endstep API returns `access-control-allow-origin` **only** when the request carries `Origin: https://endstep.cc`. Any other origin gets no such header, so the browser blocks the response. A page served from GitHub Pages, Vercel or `file://` cannot call the API directly.

Public CORS proxies were tested on 2026-09-20 and rejected. All six failed. allorigins and codetabs returned HTTP 522 after about 20 seconds. cors.lol returned HTTP 429 on the first request. whateverorigin returned HTTP 400. thingproxy refused the connection.

### 4.2 Components

1. **`index.html`**. The whole application in one file: markup, CSS, and React components transpiled in the browser by Babel Standalone. Deployed as a Vercel static asset.
2. **`/api/metagame/[...path].js`**. A Vercel serverless function. It forwards `GET` requests to `https://endstep.cc/api/metagame/v1/...`, preserves the query string, and returns the upstream body with CORS headers.

### 4.3 Proxy behaviour

- Accepts `GET` and `HEAD` only. Every other method returns 405.
- **Allow-lists** the upstream path prefix, so the function cannot be used as an open proxy to arbitrary hosts.
- Sets `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`. The Vercel edge then serves repeat requests without calling Endstep.
- Passes upstream non-2xx status codes through unchanged, so the client can tell a rate limit from a server error.
- Sends no cookies, credentials or client identifying headers upstream.

### 4.4 What deploys

Zero-config. Vercel serves the repository root statically and treats `api/` as serverless functions, so there is no `vercel.json`.

`.vercelignore` keeps `dev-server.js`, `AGENTS.md`, `CLAUDE.md` and `.claude/` out of the deployment. They are development files and would otherwise be fetchable from the public site. The deployed set is `index.html`, the proxy function, `docs/` and `README.md`.

---

## 5. Functional requirements

### FR-1. Window selector
The page offers the five windows (`1d`, `7d`, `14d`, `30d`, `season`) and defaults to `30d`. Changing the window refetches and re-renders every section. The selected window is written to the URL query string, so a view can be linked and reloaded.

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

Each card links to the per-deck view. That page does not exist yet, so for now cards link to the matching page on endstep.cc and open in a new tab.

### FR-4. Deck table
The same 24 decks in tabular form: rank, name, colours, share, players, matches, win rate, share change. Columns sort client-side. Numbers use consistent precision: share and win rate to one decimal place, counts as integers with thousands separators.

The table is a peer of the grid, not a replacement. Both are visible on the page.

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
Every data-backed section has its own loading state. A failed fetch shows a readable error and a retry control. HTTP 429 is reported as a rate limit, not as a generic failure. A window that returns no decks renders an empty state rather than a broken chart.

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
`wins` and `losses` count matches, not games. Draws are not represented. Label the figure `match win rate`, not `win rate`.

### 6.7 The window end date is an exclusive bound
`provenance.window.to` is the day after the last day the window covers. Measured on 2026-10-01, every preset returned `to: 2026-10-02`, and the 30-day window ran from `2026-09-02`, which is 30 days ending 1 October.

Printing `to` as the end date names a day that has not happened, and makes the 1-day window read as three days. Subtract one day before displaying it. The field is still the right one to read, it just is not the last covered day.

Subtracting one day does not make `1d` cover a single day. The API's `1d` preset returns a two-day span, `from` two days before `to`, and the fix takes the label from three days to two. That remainder is upstream behaviour, not a display problem.

---

## 7. Non-functional requirements

### NFR-1. Single-file delivery, no build step
The application is one `index.html` file with all markup, styles and logic. Every dependency loads from jsDelivr at a pinned version, with Subresource Integrity. There is no npm install, no bundler and no transpile step. The file must be editable in a text editor.

| Dependency | Version | Global |
|---|---|---|
| React | 18.3.1 | `React` |
| ReactDOM | 18.3.1 | `ReactDOM` |
| react-is | 18.3.1 | `ReactIs` |
| Recharts | 3.10.1 | `Recharts` |
| Babel Standalone | 7.29.9 | n/a |

**React is pinned to 18, not 19, and this is forced.** React 19 ships no UMD build: `react@19/umd/*` returns 404. A no-build page cannot load it from a script tag. React 18.3.1 is the last version with UMD builds, and Recharts 3 supports it. Its peer range is `^16.8 || ^17 || ^18 || ^19`. Changing this means dropping either NFR-1 or the UMD approach in favour of ES modules and an import map.

Accepted trade-off: JSX is transpiled in the browser, which delays first paint and gives no type checking. If that becomes unacceptable, the escape hatch is a Vite build that inlines to one file. Write the component code so that migration needs no rewrite. That change would also remove Babel's 544 KB from the payload.

### NFR-1a. Design language
Colour, typography and the chart palette are specified in [`design-system.html`](./design-system.html), which is the authority for every token. In summary: a light-only theme on `#f9f9f7`, `system-ui` as the single typeface so no font is fetched and NFR-9 holds, `#1c5cab` for links and primary buttons at 6.46:1, and an eight-hue categorical palette validated for colour-vision deficiency against our own surface.

Three of the eight series hues fall below 3:1 against the surface. That triggers the relief rule: the chart must ship visible labels or a table view. FR-4's deck table covers this, and the line chart also labels its series ends. Do not drop either without re-checking the palette.

### NFR-2. Charting library: Recharts
Charts use **Recharts 3.10.1**, loaded from its UMD build. Two criteria decided the choice: simplicity and popularity.

**Popularity.** Recharts is the most downloaded charting library on npm, about 4.8 times Chart.js and 11 times ECharts.

| Library | npm downloads/week | Transfer size (brotli) | React integration |
|---|---:|---:|---|
| **Recharts** | **43.0 M** | 150 KB | Native, declarative components |
| Chart.js | 9.0 M | 72 KB | Imperative. `react-chartjs-2` has no UMD build |
| ECharts | 3.7 M | 367 KB | Imperative wrapper required |
| ApexCharts | 1.6 M | 267 KB | Imperative wrapper required |
| Observable Plot | 0.5 M | 69 KB plus 92 KB d3 | Imperative wrapper required |

**Simplicity.** Recharts is the only candidate that is a React library rather than a JavaScript library with a React adapter. Charts are written as JSX, for example `<LineChart><Line/><XAxis/></LineChart>`. There are no refs, no lifecycle management, no `update()` or `destroy()` calls, and no wrapper component to write. Every other option needs that wrapper, because their React bindings ship no UMD build and cannot be used under NFR-1. Chart.js is half the size, but the saving is paid for in imperative code, which works against the stated criterion.

Recharts renders SVG rather than canvas, so chart content stays in the DOM. That helps NFR-6.

**Verified, not assumed.** Recharts 3.10.1 ships `umd/Recharts.js`. Its UMD wrapper resolves three globals: `React`, `ReactDOM` and `ReactIs`. The full chain of React 18.3.1, ReactDOM 18.3.1, react-is 18.3.1 and Recharts 3.10.1 was loaded and exposed all sixteen components this application needs: `LineChart`, `Line`, `BarChart`, `Bar`, `LabelList`, `Cell`, `ScatterChart`, `Scatter`, `ZAxis`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `Legend`, `ReferenceLine`, `ResponsiveContainer`. Note the `react-is` dependency. It is 0.9 KB, and omitting it breaks the bundle at load time.

Recharts covers all three charts on page 1: `LineChart` for FR-5, a horizontal `BarChart` with `LabelList` for FR-6, and `ScatterChart` with `ZAxis` for the bubble sizing in FR-7.

**Cost in context.** Recharts adds 150 KB. Babel Standalone adds 544 KB, which is 3.6 times as much. The dominant cost of this page is the no-build decision in NFR-1, not the charting library. Trading Recharts for Chart.js would save 80 KB and would not address the real cost.

### NFR-3. Performance
- Page interactive within 3 seconds on a normal broadband connection.
- Initial render requires exactly **two** API calls: `decks` at `pageSize=24`, and `share-series`.
- Total script payload is about **743 KB** brotli-compressed: Babel 544, Recharts 150, ReactDOM 44, React 4.4, react-is 0.9. This is the budget. Anything that pushes it materially higher has to be justified against the Vite escape hatch in NFR-1.
- Scripts load with `defer`, so parsing does not block the initial paint.
- Card art is lazy-loaded with `loading="lazy"` and sized to prevent layout shift.

### NFR-4. Respecting the upstream service
The application must not put meaningful load on Endstep. Edge caching (§4.3) means repeat visits and repeated window switches cost no upstream requests. The client must not poll. It must not retry more than twice. It must back off on 429. Total upstream traffic should stay well below the 300-per-window limit.

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
No analytics, no cookies, no local storage of personal data, no third-party requests beyond the pinned CDN and the card-art host.

### NFR-10. Deployment
Deployed on Vercel from the Git repository. One static asset and one serverless function. No environment variables and no secrets. See §4.4 for what is excluded.

---

## 8. Out of scope

- The per-deck page, and with it the matchup matrix, card-usage table, rating distribution, play/draw splits and sample decklists.
- Formats other than Pauper.
- The `casual` population and rating-band filtering.
- Deck search, `minMatches` filtering, and pagination beyond the top 24.
- Dark mode. The theme is light-only by decision. Adding dark mode means a second palette validated against a dark surface. It is never an automatic inversion.

---

## 9. Open items

1. **Deck card link target.** Assumed to be endstep.cc in a new tab until the per-deck page exists. Confirm.
2. ~~Share composition chart form.~~ Settled: ranked horizontal bars, FR-6.
3. **Series count on the time chart.** Currently the API default of 8. Charting more than 8 of the 24 grid decks is possible by passing deck UUIDs to `share-series`, at no extra request cost.
