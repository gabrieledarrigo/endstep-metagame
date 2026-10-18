# Endstep Pauper Metagame Viewer: Requirements

**Status:** Draft v10 · **Date:** 2026-10-18
**Scope:** four pages. The overview, a deck page with its numbers, a sample list and its matchups against the top 24, a matchup table, and a page that suggests which deck to play. Other deck page sections are out of scope, see §8.
**Visual design** is specified in [`design-system.html`](./design-system.html). This document covers structure, content and behaviour.

---

## 1. Purpose

A browser application that reads the public Endstep metagame API and shows the **Pauper** metagame. The overview reports which decks are played, how much of the field each one holds, how they perform, and how that has changed over time. A deck page gives one deck's numbers, a sample list, and its results against the rest of the top 24. A matchup table shows how the top decks do against each other. "What to play?" ranks the top decks against the metagame the reader expects, and names the best.

The application is read-only. It stores nothing but the reader's theme choice, FR-13. It has no authentication and no user accounts. It is not affiliated with Endstep.

---

## 2. Decisions taken

| Area | Decision |
|---|---|
| Format coverage | Pauper only |
| Data access | Two Vercel functions: a proxy and a matchup aggregator. CORS workaround, see §4.1 |
| Cache policy | 5 minutes at the edge, with stale-while-revalidate |
| Front end | React 19 and TypeScript, built with Vite. See NFR-1 |
| Data fetching | TanStack Query 5. A response stays fresh for five minutes. See §4.8 |
| Page state | The window and the view state live in the address. A link opens a page in its default view, except the deck page's link to its deck in the matchup table. See §4.5 |
| Styling | Hand-written CSS in cascade layers, BEM, one stylesheet per component. No framework. A light and a dark theme, FR-13. See NFR-11 |
| Charting | Recharts 3.x from npm |
| Pages | Overview, deck page, matchup table, What to play?. React Router in declarative mode, see §4.5 |
| Quality gates | ESLint, Prettier and Vitest with React Testing Library, run by GitHub Actions on every pull request and every push to `main`. See NFR-1 |
| Release | Vercel deploys from Git. Production waits until CI passes, through Vercel Deployment Checks. See §4.7 |
| Grid size | Top 24 decks by share. The rest rolls into a single `Other` |
| Filters exposed | The time window, and a deck search on the overview, FR-14 |
| Charts on the overview | Share over time, share composition, win rate against share |
| Deck page | Numbers, the sample list, and the deck's row of the matchup table. The full opponent list, card usage and ratings are deferred |
| Deck links | Our deck page. It links to the same deck on endstep.cc |
| Order of work | The Vite refactor first, then the deck page and the matchup table, so the new pages are written once |
| Matchup table | Its own page. Top 24 decks. Colour only clear pairs. One deck's list below 640px, FR-12 |
| Card art | From Scryfall by name, added by the metagame function. Endstep's image endpoint is the fallback, §3.4 |
| Install | Installable as an app, with no offline caching and no service worker, FR-16 |
| Sharing | Each deck page shares with its own title, figures and art. Every other page shares the site card, FR-15 |
| What to play? | The top 24 ranked by expected match win rate against a metagame the reader can change, from the matchup table's data. No new calls to Endstep, FR-17 |

---

## 3. Data source

Base URL: `https://endstep.cc/api/metagame/v1`. All endpoints are public and require no authentication.

### 3.1 Endpoints used by this application

| Endpoint | Purpose | Parameters used |
|---|---|---|
| `/{format}/decks` | Deck list with share, players, win rate, and the search results | `window`, `population`, `q`, `sort`, `dir`, `page`, `pageSize` |
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
- **`q`** (`/decks`): a search term. It matches deck names and every card in the decks' lists, and returns `total` with one page of matches. Endstep's own search uses it.
- **`sort`**: `share`, `players`, `winRate`, `shareChange`, `name` on `/decks`. `matches`, `winRate`, `name` on `/matchups`, where `share` returns 400.
- **`pageSize`**: **maximum 50**. Larger values return HTTP 400. Default 25.
- **`decks`** (share-series only): comma-separated deck **UUIDs**, not slugs. When omitted, the API returns the top 8 series.
- **`v`**: cache-buster. The value is the `dataVersion` string from `/visibility`.

### 3.4 Card art

`https://endstep.cc/api/cards/image?name=<Card Name>&_v=2` returns a 302 redirect to the Scryfall CDN. Optional parameters: `version`, `face=back`, `set` with `cn`.

`<img>` tags are not CORS requests, so card art loads on any origin with no proxy.

**The art comes from Scryfall by name.** The metagame function adds `art.imageUrl` to every deck in the deck list and the deck detail, §4.3. It is the `art_crop` address on Scryfall's CDN, `cards.scryfall.io`, which has no rate limit, so the browser loads the art with no redirect. Scryfall picks its default printing, which can differ from Endstep's choice. When `art.imageUrl` is missing, the browser falls back to Endstep's endpoint with `version=art_crop`, as before.

- The function sends one `POST https://api.scryfall.com/cards/collection` per response, with one `{ "name": … }` identifier per distinct key card name, at most 50, the deck list's largest page, under Scryfall's limit of 75. A deck with a blank name gets no identifier.
- It matches each returned card to a deck by name, ignoring case: the card's full name, or any of its faces' names. A double-faced card comes back as "Front // Back" while Endstep names its front face.
- A face's name takes that face's `image_uris.art_crop`, or the card's when the face has no image of its own, as on an adventure. The full name takes the card's `image_uris.art_crop`, or the first face's. The first match with an address on `cards.scryfall.io` wins.
- A 200 is a stable answer. Every name asked that matched no card is stored as not found, whether Scryfall lists it in `not_found` or answers with another spelling. So is every card found with no art crop on `cards.scryfall.io`. The deck falls back to Endstep's endpoint, and the response keeps its usual cache time.
- A 200 whose body the function cannot read, such as `data` that is not a list or a card without a string name, counts as a failed lookup, §4.3. Nothing is stored.
- Scryfall allows 2 requests per second on that endpoint and requires a `User-Agent` naming the application and an `Accept` header. A 429 limits access for 30 seconds.
- The function remembers each card's address, and each name Scryfall did not find, in memory for as long as its instance lives, so a warm instance asks Scryfall only for names it has not seen.
- Nothing shares a rate limit across instances or regions. After a 429, an instance sends Scryfall nothing for 30 seconds, Scryfall's own lockout, and its responses use the fallback.

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
| `sampleList` | The most common exact list for the deck. `state` is `shown`, `mainOnly` or `withheld`, with `minPlayers: 3` and a `reason`: `sideboard_below_player_floor`, `main_below_player_floor` or `no_registrations`. `players` brought this exact list. `similarity` measures it against the deck's average list. Both are null when the list is withheld. `distinctLists` counts the lists it was picked from. `main` and `side` are `{name, count, setCode, collectorNumber}`, and the set and number can be null | FR-11 |
| `cardTableWithheld` | `{reason, minPlayers}` when the card table is withheld, such as `below_player_floor` with 3, otherwise null | Deferred |

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
2. **`api/metagame.ts`**. The proxy. It forwards `GET` requests to `https://endstep.cc/api/metagame/v1/...`, keeps the allow-listed query parameters, and returns the upstream body with CORS headers. For the deck list and the deck detail it adds each deck's art address from Scryfall, §3.4, so it is no longer a pure pass-through.
3. **`api/matchups.ts`**. The matchup aggregator. It builds the top-24 matrix on the server and returns it in one response. See §4.4. It is a separate function so the proxy keeps to one upstream call per request.
4. **`api/_shared.ts`**. The code the functions share: the upstream address and timeout, the CORS headers, the method rules, the error responses and the cache rules. Vercel does not deploy a file in `api/` whose name starts with an underscore, so it is not a function of its own.
5. **`api/deck-page.ts`**. The deck page's HTML. It writes the deck's title, description and image into the built `index.html` for link previews, FR-15. `vercel.json` sends `/decks/:slug` to it in place of the static rewrite.

### 4.3 Proxy behaviour

- The endpoint path reaches the function through the rewrite in `vercel.json`, as the `path` query parameter: `/api/metagame/Pauper/decks` becomes `/api/metagame?path=Pauper/decks`.
- Accepts `GET` and `HEAD`. `OPTIONS` answers the CORS preflight with 204. Every other method returns 405.
- **Allow-lists** the upstream path prefix, so the function cannot be used as an open proxy to arbitrary hosts.
- Sets `Cache-Control` by status. A success gets `public, s-maxage=300, stale-while-revalidate=600`, so the Vercel edge serves repeat requests without calling Endstep. A 429 gets `public, s-maxage=10`. Any other error gets `no-store`. The art lookup's fallback is the one exception, below.
- Passes upstream non-2xx status codes through unchanged, so the client can tell a rate limit from a server error.
- **Adds the art.** For a successful `GET` of a deck list or a deck detail, it looks up the key cards on Scryfall, §3.4, and adds `art.imageUrl` to each deck it resolves. `HEAD` gets no lookup. The lookup has a one-second bound. When it fails, times out or meets a 429, the response goes out without the addresses it could not resolve, with `s-maxage=60` in place of the usual five minutes, so the art returns soon for the next reader. A reader who already holds that response keeps it for the client's five minutes, §4.8, and sees Endstep's art meanwhile. A lookup never fails the response and is never retried within it.
- The Scryfall request carries `User-Agent: PauperEndstepMetagame/1.0 (+https://github.com/gabrieledarrigo/pauper-endstep-metagame)`, `Accept: application/json` and `Content-Type: application/json`. The `User-Agent` is the only identifying header the functions send upstream.
- Sends no cookies, credentials or client identifying headers upstream.

### 4.4 Matchup function

`GET /api/matchups?window=30d`. Three pages read it: the matchup table, the deck page for one row, FR-11, and What to play?, FR-17. All request the same URL, so they share one edge cache entry per window. `window` is the only parameter, checked against the five values in §3.3. The raw query string must be exactly `?window=` followed by one of the five values, byte for byte. Anything else returns 400: a missing or repeated `window`, another parameter, an encoded or padded value. The edge caches by the raw query string, so any variant would otherwise force a cold build of 25 calls. The format is Pauper and the population is `rated`, both fixed.

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

- `window` holds `from` and `to` of `provenance.window` from step 1, unchanged. §6.7 applies when it is displayed.
- `decks` is in share order. `share` is `share.rate`.
- `cells[a][b]` is deck `a`'s record against deck `b`. A pair absent from both decks' first 50 rows has no entry. The mirror has no entry.
- About 88 KB uncompressed and 21 KB compressed, computed from the 30d data.

Behaviour:

- One cold build costs 25 upstream calls. `Cache-Control` follows the proxy's rules by status, with one difference: a 429 is held for 60 seconds, the length of Endstep's rate limit window, so a rate-limited build is not retried by the next visitor inside it. A success is held for 5 minutes and any other error is `no-store`. The edge holds one entry per window, in each region that has served one.
- If any upstream call fails, the whole request fails. No partial matrix. An upstream 429 returns 429. Anything else returns 502.
- Each upstream call has the same 8 second timeout as the proxy.
- Same method rules and CORS headers as the proxy, §4.3.

### 4.5 Routing

The front end uses **React Router 8 in declarative mode**: `BrowserRouter`, `Routes` and `Route`, `Link`, `useNavigate` and `useSearchParams`. No Vite plugin, no loaders, no data mode. It was chosen on the criteria that chose Recharts in NFR-2: it is the most used React router, and declarative mode is its simplest form. There are four routes.

| Path | Page |
|---|---|
| `/` | Overview |
| `/decks/{slug}` | Deck page |
| `/matchups` | Matchup table |
| `/what-to-play` | What to play?, FR-17 |

- `vercel.json` rewrites `/matchups` and `/what-to-play` to `/index.html`, and sends `/decks/:slug` to the deck page's HTML function, which serves the same `index.html` with the deck's link preview, FR-15. Vercel applies rewrites after it checks for real files, so built assets are not affected.
- `?window=` belongs to every page and carries across links. Pages read and write it with `useSearchParams`. See FR-1.
- The layout route replaces a missing or unknown window with the default, with a replace navigation, so the address always names the window on screen.
- The view state lives in the address too: the overview's view in `view` and the deck table's sort in `sort` and `dir`, FR-4, the overview's search in `q`, FR-14, the share chart's highlighted deck in `highlight`, FR-5, the matchup table's chosen deck in `deck`, FR-12, and What to play?'s changed metagame in `meta` and chosen deck in `beat`, FR-17. A change replaces the history entry, so Back leaves the page rather than undoing a sort. The default view leaves the parameters out.
- Back, forward and reload therefore return to a page as the reader left it. A link carries only `?window=`, so it opens a page in its default view. This is the browser's own rule: history returns to a page, a link is a new visit. The one exception is the deck page's link to the matchup table, which also carries `?deck=`, FR-11.
- The theme is not view state. It is the reader's preference, kept in local storage, so a link never carries it. See FR-13.
- Back and forward work. A route change does not reload the page.
- Any other path is a Vercel 404. A path that reaches the app without a route, such as `/index.html`, shows a Not found page.
- A route change moves focus to the new page's main heading, so keyboard and screen reader users know the page changed. A link scrolls the new page to the top, except a link to the matchup table that names a deck, which scrolls as FR-12 sets out. Back and forward keep the scroll position the browser restores. Declarative mode does none of this, because `ScrollRestoration` exists only in data mode, so the app does it when the path changes. A change to the query string alone is not a route change.

### 4.6 Local development

`npm run dev` starts Vite. A small Vite plugin serves `/api/metagame/*` and `/api/matchups` by calling the real handlers, and applies the same rewrite as `vercel.json`. It serves each response from memory for its `s-maxage`, the lifetime the edge uses too. It does not serve stale responses and does not evict expired entries, so it is simpler than the edge. Without that, every reload of the matchup page in development costs 25 upstream calls, and a dozen reloads in a minute reach the rate limit. It replaces `dev-server.js`, which is deleted. Vite's dev server already falls back to `index.html` for the page routes. `vite preview` also serves `/decks/:slug` through the deck page's function, with the rewrite from `vercel.json`, so a link preview can be checked on a local build. The dev server does not, because its `index.html` is the source file.

### 4.7 What deploys

Vercel runs `npm run build` and serves `dist/`. The functions in `api/` are built from source as before. `vercel.json` deploys `dist/index.html` with the deck page's function, through `includeFiles`, FR-15.

- `vercel.json` pins `"framework": "vite"`. The project was created with the "Other" preset. Without the pin, Vercel may skip the build and serve the source `index.html`, which renders a blank page.
- `vercel.json` also carries the proxy rewrite (§4.3) and the page rewrites (§4.5).
- `public/` holds the icons, the web app manifest, the site card image and `robots.txt`. Vite copies it into `dist/` as it is.
- Hashed files under `/assets/` are served with `public, max-age=31536000, immutable`, because their names change with every build. `index.html` keeps a short cache, so a deploy reaches readers at once.
- Every response carries security headers set in `vercel.json`: a Content Security Policy, `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin`. The policy forbids framing with `frame-ancestors 'none'`. It allows scripts from the site and the inline theme script by its hash, images from the site, `endstep.cc` and `cards.scryfall.io`, connections to the site only, and inline style attributes, which the charts set.
- Only `dist/` is served. Source files, `docs/` and the development files are no longer reachable from the public site.
- Vercel deploys every file in `api/` as a function. `.vercelignore` therefore excludes `api/**/*.spec.ts`, so the specs beside the functions are never deployed.
- **Production waits for CI.** The project's Deployment Checks require the `ci` job from NFR-1. Vercel still builds every push to `main`, but assigns the production domain only after `ci` passes on that commit. Preview deployments do not wait. The setting lives in the Vercel dashboard, not in `vercel.json`. See open item 6.

### 4.8 Data fetching

The pages read the API through **TanStack Query 5**. It was chosen over SWR on the criteria in NFR-2. It is the most used, and it has the two behaviours this application needs: a time a response stays fresh, and the cancellation of a request a page no longer needs. Measured on 2026-10-09: 67 million weekly downloads against 18.6 million for SWR, and 10.3 KB against 6.7 KB, minified and gzipped.

- One query client for the app. Each request is a query keyed by what it reads, such as `["decks", window]` or `["deck", slug, window]`.
- A response stays fresh for five minutes, the edge cache's `s-maxage`, §4.3. Within that time a page renders it from memory, with no request and no loading state. After it, the page shows it and refetches it in the background. Responses stay in memory for the rest of the visit, so that holds however long the reader was away.
- A section shows its data whenever it has some. A failed refetch keeps the data on screen. The error panel appears only when there is nothing to show, FR-9.
- **A window change keeps the page on screen.** While another window loads, a page keeps the previous window's data, dimmed and marked busy, its window selector marked busy, and a status line saying which window is loading. A pick made during the load replaces the history entry. Every page behaves this way: the overview, the deck page with its matchups row, and the matchup table. The previous window's data is never presented as the new one: the dates and anything else that names the window wait for the new data. A section whose previous window had nothing to show shows its skeleton instead, so an empty state never speaks for a window that has not loaded. The deck page's matchups row loads on its own, FR-11: it dims and marks itself busy, while the selector and the status line follow the deck's numbers.
- Requests run whether or not the browser reports itself online, so a reader without a connection sees the network error, not a page that waits.
- Nothing refetches when the browser window regains focus, NFR-4.
- A network error, a 429 or a 5xx is retried at most twice, after 400 ms and then 800 ms, NFR-4. Any other failure shows at once. In a background tab the retries wait until the tab is shown again. A query can turn retries off: the matchup table and the deck's matchups row do, FR-11 and FR-12.
- The query passes an abort signal to `fetch`, so a request for a window the reader has left is cancelled.
- `getJson` makes one request. It turns a failed status into an error that carries its kind and status, and the query client decides whether to retry.

---

## 5. Functional requirements

### FR-1. Window selector
Every page offers the five windows (`1d`, `7d`, `14d`, `30d`, `season`) and defaults to `30d`. Changing the window refetches and re-renders every section. The selected window is written to the URL query string and carries across links between pages, so a view can be linked and reloaded.

### FR-2. Header summary
Shows the format, the resolved window dates, total registrations and total players. The dates run from `provenance.window.from` to the last day the window actually covers, which is `provenance.window.to` minus one. See §6.7. It states the population in use (`rated`). It attributes the data to Endstep and links to the source page.

### FR-3. Deck grid
The top 24 decks by share, each as a card showing:

- the archetype's key card art, from `art.imageUrl`, or Endstep's image endpoint for `art.cardName` when it is missing, §3.4
- deck name
- colour identity, from the `colours` array, as WUBRG pips
- **meta share** as a percentage
- **players**
- **match win rate** as a percentage
- the three key cards from `keyCards`

Each card links to the deck's page, FR-11.

The grid and the table are two views of the same decks, FR-4. The grid is the default.

### FR-4. Deck table
The same 24 decks in tabular form: rank, name, colours, share, players, matches, win rate, share change. Columns sort client-side, and the sort is kept in the address, so Back and reload restore it, §4.5. Numbers use consistent precision: share and win rate to one decimal place, counts as integers with thousands separators. A share above zero but below the shown precision reads as "<0.1%" in the table and "<0.01%" on the cards, never as zero.

The overview shows the table or the grid, one at a time. A second segmented control, named View, with Cards and Table, sits beside the window selector. Cards is the default and leaves `view` out of the address. Table writes `?view=table`, and Cards removes it, §4.5. While the decks load, only the chosen view's skeleton shows.

The sort applies to the table only. It stays in the address while the cards show, so the table returns in the same order. The cards keep share order. Each deck name links to the deck's page, FR-11.

### FR-5. Share over time
A multi-series line chart of daily meta share. It uses the API's default top 8 series. The x-axis covers the full date range of the window.

A click on a deck in the legend highlights it: its line draws at 3px on top, and the other lines, their end dots and their end labels fade, to 25% opacity in the light theme and 35% in the dark one, so no series fades further in dark. A second click clears the highlight, and a click on another deck moves it. One deck at a time. Each legend entry is a toggle button with `aria-pressed`. The highlighted deck's slug is kept in `highlight`, §4.5, and a slug that is not in the chart shows no highlight. Nothing hides a line. The highlight replaced hiding on 2026-10-17, and the `hide` parameter is gone.

Days before 2026-09-05 return `rate: null`. **Render them as a gap, not as zero.** See §6.2.

### FR-6. Share composition
A **ranked horizontal bar chart**. The top 24 decks plus an **`Other`** bar, sorted by share, each bar labelled with its value. See §6.1 for how `Other` is derived and labelled.

This is not a pie. Twenty-five categories exceed the eight-hue ceiling of a categorical palette, and a pie with 25 slices cannot be read at any size. Bars encode magnitude by length, so they use one hue, sequential blue. The `Other` bar uses `--text-400` to mark it as a residual rather than a deck.

A click on a deck's bar or its name opens the deck's page, FR-11, keeping the selected time window as every deck link does, FR-10. `Other` is not a deck and opens nothing. Pointing at a deck's row underlines its name, in `--text-900`, and fills its bar with `--seq-600`, one step darker, so the row reads as a link. `Other` does not react. The deck grid and the deck table stay the keyboard path to the same pages, NFR-6.

### FR-7. Win rate against share
A scatter plot. Meta share on the x-axis, match win rate on the y-axis, marker size proportional to player count. A reference line at 50% win rate separates decks above the field from decks below it. This is the main analytical view on the page. It shows which decks are good and which are only popular.

All markers use **one hue**. A scatter invites comparison between any two points, and under all-pairs comparison only three hues stay separable. Colouring 24 decks individually is therefore not available. Identity comes from position, from labels on selected decks, and from hover.

A click on a marker or its label opens the deck's page, FR-11, keeping the selected time window as every deck link does, FR-10. The tooltip says so. On a touch screen the first tap on a marker shows its tooltip, and a second tap on the same marker opens the page, so the tooltip still identifies unlabelled markers. Pointing at a marker fills it with `--seq-600` at full opacity and underlines its label, which stays in `--text-900`, when it has one. A marker armed by a first tap looks the same. A mouse or pen moving over the chart disarms it. The deck grid and the deck table stay the keyboard path to the same pages, NFR-6.

### FR-8. Share change
Where `shareChange.points` is present, the grid and table show the movement against the previous window, with its direction. Where it is `null`, the UI states that no comparison is available. It must not show a zero or a blank. See §6.3.

### FR-9. Loading, error and empty states
Every data-backed section has its own loading state. A failed fetch shows a readable error and a retry control. HTTP 429 is reported as a rate limit, not as a generic failure. A window that returns no decks renders an empty state rather than a broken chart. This applies on every page.

### FR-10. Navigation
Every page has a header with links to the overview, the matchup table and What to play?, FR-17. The current page is marked with `aria-current`. Every page carries the attribution required by NFR-5.

The header names the site, "Pauper Endstep metagame", beside the site mark from the design system, in one link to the overview. The mark is decorative, so the link's name is the site's name. It is not a heading. Every page opens with its main heading, which names the page: "Overview", "Matchups", "What to play?", or the deck's name on a deck page. The document title repeats it, such as "Overview · Pauper Endstep metagame". The heading therefore names the page when focus moves to it, §4.5.

Deck names link to `/decks/{slug}` wherever a deck is listed: grid cards, table rows, matrix headers, the decks in the ranked bars and the scatter, FR-6 and FR-7, and every deck on What to play?, FR-17. Links keep the current `?window=`.

### FR-11. Deck page
Two calls. `/{format}/decks/{slug}` feeds every section except the matchups row, see §3.6. `/api/matchups` feeds the matchups row, §4.4.

**Header.** Deck name, colour pips, key card art and the three key cards. The window selector and the resolved window dates (§6.7). A link to the same deck on endstep.cc, in a new tab.

**Stat tiles.** Meta share, players, matches, match win rate with its range, and share change under the rules of FR-8.

**Share over time.** One line, from `shareSeries.points`. Days with `rate: null` are a gap, as in FR-5. Under the chart, a collapsed details element, "Daily share, day by day", lists the same days and shares as a description list whose pairs flow into columns on wider screens, so the chart is not the only carrier, NFR-6.

**Games.** A table from `gameResults`. Rows are game 1, game 2, game 3 and all games. Columns are on the play, on the draw and total. Each cell shows a game win rate. Its range and decided count show on hover and on keyboard focus. A note under the table gives `unknownPositionGames`. If `gameResults` is null, the table shows the unavailable state. `games` is not used, §3.6.

**Toss.** Win rate after winning the toss and after losing it, from `playDraw.tossWon` and `tossLost`. How often players chose to draw, from `choseToDraw`. The toss blocks count game 1 only, open item 5, so the section says game 1 win rate.

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
- Under the legend, a link reads "See {name} in the full table". It opens the matchup table with this deck in the spotlight: it keeps `?window=` and adds `?deck=`, FR-12.
- When the deck is not in the top 24 for the selected window, the section says so in place of the row and links to the matchup table, without `?deck=`. The note takes the deck's name from the detail.
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
- The cells grow with the window, from 32px wide up to 44px, and the numbers and deck names grow with them. The design system gives the rule.
- Where the window is narrower than the table plus the band's padding, about 1,080px, the band scrolls sideways and the first column stays in view. The page itself does not scroll sideways, NFR-7. A box that scrolls sideways also holds its sticky header, so below 1,100px the header row scrolls away with the table.
- The page has the window selector, the resolved window dates and a deck picker.

**A deck in the spotlight.** `?deck=` names one deck by its slug. Every cell outside its row and column fades, so the deck reads at a glance against the field.

- The picker is a native select named Deck. It lists "All decks", then the 24 decks in share order. "All decks" is the default: no spotlight, and no `deck` in the address. Choosing a deck writes its slug, and choosing "All decks" removes it, §4.5.
- The other cells fade to a quarter of their opacity. Their numbers fall below WCAG AA, which NFR-6 accepts for this case only. A faded cell returns to full opacity while it has the pointer or keyboard focus, so its focus indicator keeps its contrast. The detail works on every cell.
- The deck's row and column headers turn `--primary` on a `--primary-wash` band, so the spotlight does not rest on the fade alone.
- When a link opens the page with a deck, or the picker chooses one, the page scrolls to the deck in place of the top. Back and forward keep the scroll position the browser restores, §4.5. Focus stays where §4.5 puts it.
  - From 1,100px the header row is sticky. The deck's row scrolls into view just under it, and the table's tab stop moves to the deck's row header.
  - From 640px to 1,099px the header row is not sticky. The page scrolls the table's top into view, so the column names stay on screen, and the band scrolls sideways to bring the deck's column next to the first column. The tab stop moves to the deck's column header, which is on screen. The deck's row can sit below the window, marked by its band.
  - Below 640px the page shows the one-deck list, which opens on the deck, and has nothing to scroll to.
- The deck is matched by the 8-character suffix of its slug, so a slug under an old name still finds it, §6.11.
- A window change keeps `deck` in the address. When the deck is not in the new window's top 24, the table shows no spotlight. The picker shows the deck as an extra first option, "{name} (not in the top 24)", so any choice replaces it, "All decks" included. A line above the table reads "{name} isn't in the top 24 for the selected time window." A window where the deck is in the top 24 brings the spotlight back. The name comes from the deck detail, §3.6, requested only in this case. Until it arrives, or if the request fails, the line names "This deck".
- The deck page's row links here with its deck named, FR-11.

**On a phone.** Below 640px the page shows one deck's row as a list, in place of the table.

- The picker lists the 24 decks, without "All decks". With no deck in the address it shows the top deck by share, and `deck` stays out of the address. Choosing a deck writes its slug, as on the desktop, so a link opens the same deck at either width.
- Each of the other 23 decks is one line, in share order: the opponent's name, linking to its deck page, its matches under the name, the verdict in words, and the cell. The verdicts are favoured, unfavoured, within chance, too few to call and no data. They say what the colour means, so the list has no legend.
- The cells, the colour rule and the gated and no-data states are the table's.
- When the deck in the address is not in the window's top 24, the picker shows it as on the desktop, and the list shows the top deck under a line that reads "{name} isn't in the top 24 for the selected time window. The table shows {top deck} by default."

### FR-13. Theme
Every page comes in a light theme and a dark theme. The design system specifies both palettes, NFR-1a.

- On a first visit the page follows the device's setting, `prefers-color-scheme`. A device with no setting gets the light theme. Until the reader chooses, the page also follows a change to the device setting while it is open, and so do the toggle and the charts.
- A 36px round button at the top right of the site header switches between the two themes, on every page and at every width. It is a toggle button named Dark theme, with `aria-pressed`. Its icon shows the current theme, a sun or a moon, so it agrees with `aria-pressed`.
- Below 1,100px the button shares the first row with the site name, and the links take the second. From 1,100px they share one row. With three links, one row at 640px would squeeze the name into three lines. When the name runs out of room, it wraps to two lines and the button stays at the top right.
- The reader's choice is kept in local storage and wins over the device setting from then on. It is not in the address, §4.5.
- The theme applies before the page first paints, so a dark page never flashes light.
- A switch recolours the charts at once, with no reload. Native controls and scrollbars follow the theme through `color-scheme`.
- Card art and colour pips look the same in both themes. They are the cards' own colours.

### FR-14. Deck search
The overview finds any deck in the window, by its name or by a card in its lists, through `/decks` with `q`, §3.3. The design system's Deck search section is the visual specification.

- A search field sits directly above the decks, after the summary. Its placeholder and visually hidden label read "Search decks or cards". With text in it, a clear button named "Clear the search" appears, and Escape clears too. Clearing keeps focus in the field.
- The search runs 300ms after the last keystroke, from 2 characters. The term is trimmed, its inner spaces collapsed and its letters lowercased before it is sent and written to the address, so variants share one cache entry. One character searches nothing and shows the top 24.
- The results take the top 24's place in the chosen view, cards or table, FR-3 and FR-4, in share order. The field, a result line and the decks stand 14px apart. The line reads "{n} decks match "{q}". Search covers deck names and every card in their lists.", or "1 deck matches". The page's status line announces it.
- Results come 24 at a time. While more remain, a button loads the next page: "Show 24 more", or "Show {n} more" for fewer. A next page that fails reads "The next decks could not be loaded." with the reason, and the button stays as the retry. Paging stops on an empty page, an NFR-4 guard. When paging stops before the count, the line "Endstep returned {n} of the {total} decks it counted." is shown and announced, and focus moves to the last result card.
- Results reach the long tail, §6.4. Their cards and rows follow the same rules as the top 24's, and a win rate under 20 decided matches reads as too few to call, §6.8. A share below the shown precision reads as FR-4 sets out.
- In the table, the sort applies to the results loaded so far, and "Show more" adds the next page in share order before the table sorts again. The rank column gives each result's place by share among the results.
- A search with no match shows the empty panel, "No deck or card matches "{q}"", with a "Clear the search" button that returns focus to the field.
- The query is kept in `q`, §4.5, and a change replaces the history entry. A link carries only `?window=`, so it opens the overview with no search.
- The summary and the charts stay on the top 24.
- A window change keeps the query and searches the new window, under the loading rules of §4.8.
- Every result links to its deck page, FR-10, which works for a deck outside the top 24.

### FR-15. Page metadata and link previews
Every page carries what browsers, search engines and chat apps read without running the script.

- `index.html` has a description, "Which Pauper decks are played, how they perform, and how they do against each other.", Open Graph tags, a `summary_large_image` Twitter card, the icon set, FR-16, and `theme-color` for each theme. The theme toggle updates `theme-color` with the theme, FR-13. `robots.txt` allows every page. `index.html` carries no canonical link and no `og:url`, because the same file serves every path.
- The overview and the matchup table share the site card: the site's name, the description, and a 1200 by 630 image with the site mark, from the design system.
- A deck page shares its own preview. Its title reads "{deck} · Pauper Endstep metagame". Its description reads "{share} of the Pauper field {period}, {win rate} match win rate, {players} players.", where the period follows the link's window: "over the last day", "over the last 7 days", "over the last 14 days", "over the last 30 days" or "this season", and 30 days by default. The win rate reads as too few to call whenever the deck page calls it so, §6.8: a gate, fewer than 20 decided matches, or a null rate, low or high. The description then reads "{share} of the Pauper field {period}, match win rate too few to call, {players} players." Its image is the deck's art crop: `art.imageUrl` from the deck detail, or Endstep's image endpoint with `version=art_crop` when it is missing, §3.4. Its canonical link and `og:url` are `/decks/{slug}`, with no query string, so every window of one deck counts as one page.
- A server function, §4.2, writes these into `index.html` for `/decks/:slug`:
  - It reads `index.html` from the files deployed with it, never over HTTP, so a protected preview deployment does not break it.
  - It accepts only a slug the proxy would accept, §4.3, and only a known window. Anything else gets the page with the site card.
  - It fetches the deck detail through our own proxy, at the exact address the deck page requests: `/api/metagame/Pauper/decks/{slug}` with the window and the population. The browser's later request then hits the same edge cache entry, and upstream calls stay one per deck and window.
  - It escapes every value it writes into the HTML, and URL-encodes the card name in the image address.
  - When the call fails, or takes longer than two seconds, it returns the page with the site card, so a reader never waits long on it. Two seconds leave room for the proxy's own one-second art lookup. That fallback is sent with `no-store`, so a slow moment is never cached. A preview is cached at the edge for five minutes when the deck's art resolved, and for one minute when it did not, which covers the art lookup's fallback and a card Scryfall does not find. The function sets that header itself. Vercel's edge strips `s-maxage` from the responses it serves, the proxy's included, so copying the inner response's header would leave the preview uncached.
- The page then loads as before. The function changes nothing a reader sees.

### FR-16. Installable app
The site installs as an app on phones and desktops, from the browser's own install prompt or "Add to Home Screen".

- A web app manifest names the app "Pauper Endstep metagame", with a short name from the design system for the home screen. It opens `/` in a standalone window and carries the icons at 192px and 512px, with a maskable 512px version.
- The icon set comes from the site mark, the design system's: an SVG favicon, a 32px ICO for older browsers, a 180px Apple touch icon, and the app icons.
- There is no service worker and no offline caching. The installed app needs the network, as the site does, and always shows current data.

### FR-17. What to play?
A page that answers the question a player asks before a league or a tournament: which deck should I play? It ranks the top 24 by their expected match win rate against the metagame the reader expects, and names the best. One call to `/api/matchups`, §4.4, the matchup table's own, so the two pages share one edge cache entry and the page asks nothing new of Endstep, NFR-4. The design system's What to play? section is the visual specification.

The page lives at `/what-to-play`. Its heading and the header link read "What to play?", and the document title "What to play? · Pauper Endstep metagame", FR-10. It has the window selector and the resolved window dates, as the matchup table does. Its words are short and plain, for readers whose first language is not English.

**The expected match win rate.**

- The metagame is each top-24 deck's share from the matchup response, plus the reader's changes, below. A share never goes below zero. If the changes would leave every share at zero, the page ignores them and uses the window's own metagame.
- A deck's expected match win rate is its match win rate against each of the 24, weighted by that deck's part of the 24's total share, and added up. The mirror counts as 50%. So do a gated pair, §6.8, and a pair with no entry.
- Its range comes from the cells' ranges. Each cell gives a standard error of (`high` − `low`) / 3.92. The expected rate's range is 1.96 times the square root of the sum of (weight × standard error)². A gated pair or a pair with no entry adds an error of 0.25, as a rate anywhere from 0% to 100% would. The mirror adds none. This treats the 23 pairs as independent, which is close enough: each pair is its own set of matches.
- A rate is clearly above 50% when its whole range is above 50%, clearly below when the whole range is below, and too close to call otherwise.
- Rates show to one decimal place.
- Decks outside the top 24, about a quarter of registrations, are left out, because the matchup table has no data for them, §4.4. The page says so. The expected rates therefore run a little below each deck's own match win rate, by about two points at 30d on 2026-10-18, because the top 24 beat the long tail.

**The pick.** A panel under the window selector gives the answer first.

- It reads "Our pick", then "Play {deck}!", the deck a link to its page.
- When other decks are too close to tell apart from the best, the pick names them too, up to three decks in rate order: "Play {a} or {b}!", or "Play {a}, {b} or {c}!". A deck is too close when the top of its range is above the bottom of the best deck's range. The pick takes such decks in rate order from second place, and stops at the first deck that is not too close.
- One sentence follows. For one deck: "{deck} wins {rate} of its matches against the metagame you expect." For several: "They win the most matches against the metagame you expect: {rate}, {rate} and {rate}. The gap between them is too small to call." When more than three decks are too close, the sentence ends ", and 1 more deck is just as close." or ", and {n} more decks are just as close."
- A last line gives the basis. With no changes it reads "Based on {period}. Change the metagame to match what you expect.", where the period is "the last day", "the last 7 days", "the last 14 days", "the last 30 days" or "this season", as the window says. With changes it reads "Based on the metagame you set."
- Only the title is a polite live region, so a screen reader hears a new pick, not every changed rate.

**The ranking.** A panel named "Expected match win rate".

- The 24 decks by expected rate, highest first, ties in share order. Each line holds the place, the deck as a link, its range bar, the rate and its movement.
- A note beside the title reads "Metagame of {period}", with the basis line's period, or "The metagame you set".
- The range bar draws the range on a scale shared by the 24 lines, with a line at 50% and a tick at the rate. It is blue when the rate is clearly above 50%, red when clearly below, and neutral when too close to call, the matchup table's colours, FR-12. A legend says the rule in words. The scale runs from the lowest bound to the highest, rounded out to 5 points and always holding 50%.
- Movement is the number of places a deck rose or fell against the window's own metagame, with no changes: "↑2" or "↓1". A deck that has not moved shows nothing. Assistive technology hears "up 2" or "down 1".
- Each line is read as the place, the deck, the rate, "likely between {low} and {high}", and the movement.
- Below 640px the bar takes its own row under the deck and the rate.

**The metagame you expect.** A panel where the reader changes the metagame.

- A note reads "How often you expect to meet each deck. Each step is one point."
- The 24 decks in the window's share order, which a change does not reorder. Each line holds the deck's name and a stepper: a button named "Less {deck}", the share to one decimal place, and a button named "More {deck}". A press moves the share by one point.
- "Less" cannot act at 0.0%, or on the last deck above zero, so the metagame is never empty. It carries `aria-disabled` and ignores presses, rather than `disabled`, so a keyboard user's focus stays on it.
- A changed deck shows "was {share}" after its name.
- Reset appears once anything has changed. It returns every share and removes `meta` from the address.
- A line under the list reads "The top 24 hold {share} of registrations. The other {share} are left out of the sum."
- From 1,100px the ranking and the metagame stand side by side. Below 1,100px they stack, the metagame first, folded into its heading with "Change" to open it and "Close" to fold it. It starts folded, so the ranking is one tap away rather than 24 lines down. A width check at 1,100px in script picks the layout, as the matchup table's check at 640px picks its phone list, FR-12. The page renders the two panels in the order they appear, so the reading and focus order match the screen.

**In the address.** The changes are view state, §4.5, so a copied address shares them.

- `meta` lists only the changed decks, as `{slug}:{change}`, joined by commas, in share order. The change is a whole number of points, with a minus sign when it lowers the share and no sign when it raises it, because a `+` in a typed address reads as a space: `meta=affinity-e93f5f74:-4,elves-262fdcbd:3`.
- The page writes `meta` itself, so its colons and commas stay readable, where `URLSearchParams` would write `%3A` and `%2C`. It reads both forms.
- Decks are matched by the 8-character suffix of their slug, §6.11. An entry that cannot be read, has a change of zero or outside −100 to 100, names a deck outside the window's top 24, or repeats a deck already read is ignored. The page still opens.
- A change that lowers a share past zero counts as the smallest change that reaches zero, the share rounded up, so one press of "More" always moves it off 0.0%. The next write puts the counted change in the address.
- A change replaces the history entry, and no change leaves `meta` out.
- A window change keeps `meta` and applies it to the new window's shares. An entry for a deck outside the new top 24 is ignored but stays in the address until the reader's next change, which writes the address again from the changes that apply.
- The header's link to the page carries only `?window=`, so it opens the window's own metagame.

**Beat a deck.** A panel for a reader who expects to meet one deck often.

- A deck picker, the matchup table's native select named Deck, lists the 24 decks in share order. The top deck by share is the default. A choice is kept in `beat` as the deck's slug, matched by its suffix, and the default leaves it out. A `beat` that names no top-24 deck falls back to the default.
- One sentence: "These decks clearly beat {deck}."
- A table of the decks whose pair with the chosen deck is clear, FR-12's rule, and in their favour, by their rate against it, highest first. Its columns: the deck as a link, its rate against the chosen deck with that pair's range bar from 640px, and its expected rate against the metagame.
- When no deck qualifies, the sentence reads "No deck in the top 24 clearly beats {deck} in this window." and there is no table.

**How the numbers are made.** A last panel says in four short paragraphs how the rate is counted, what the bars mean, how the pick is chosen, and why decks outside the top 24 are left out. The design system gives the words.

**States.** As the matchup table, FR-12: one skeleton per panel while loading, the error panel with its retry, no automatic retry, because one cold build costs 25 upstream calls, and the previous window dimmed while the next loads, §4.8. The page shares the site card, FR-15.

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
230 of 264 archetypes have `machineNamed: true`. These are generated names, mostly for single-player decks whose win rates are 0% or 100%. All 24 decks in the grid are human-named. The smallest has 114 players and 805 matches, and none is sample-gated. No noise filtering is needed inside the grid, which is why `minMatches` is not exposed. Any feature that widens the list beyond the top 24 has to handle this again. The deck search does, FR-14: it shows these decks as Endstep returns them, and a win rate under 20 decided matches reads as too few to call, §6.8.

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
| TanStack Query | 5. See §4.8 |
| Recharts | 3.10 |
| Vite | 8 |
| TypeScript | 6.0, strict mode. See below |

- TypeScript stays on 6.0, the last release with the JavaScript compiler API. TypeScript 7.0 ships without one, so typescript-eslint refuses it and Vercel's install fails on the peer conflict. Measured on this repo on 2026-10-06. typescript-eslint tracks support for 7.1 in issue #10940. When it lands, move to 7, either outright or with TypeScript's documented side-by-side setup. 6.0 already warns about everything 7 removes.
- TypeScript runs in strict mode, and a type error fails the build.
- Three configs cover the repository. The type check runs `tsc` on each.

  | Config | Covers |
  |---|---|
  | `api/tsconfig.json` | `api/`. It is the config nearest the function, so Vercel's function build reads it |
  | `tsconfig.app.json` | `src/` and `test/`, with Vite's client types |
  | `tsconfig.node.json` | `vite.config.ts` and `eslint.config.ts`, with Node's types. The Vite config imports the functions, so this config also checks `api/metagame.ts`, `api/matchups.ts` and `api/deck-page.ts` without the DOM lib, as the dev server runs them |

- The root `tsconfig.json` lists the three as references and covers no file itself. An editor opens a file, finds the root config, and follows the references to the config that covers the file. Without them, an editor checks `src/` with default options and reports false errors.
- Vite's client types stay out of `api/tsconfig.json`. Putting them there breaks the function build. Moving the config from the root to `api/` left the compiled function byte for byte the same, measured with an offline `vercel build` on 2026-10-09.
- The response types live in `src/api/types.ts`, one per endpoint in §3.1. They are written from measured responses, not from a published schema.

**Scripts.**

| Script | What it does |
|---|---|
| `npm run dev` | Vite with the API plugin, §4.6 |
| `npm run typecheck` | `tsc` on each of the three configs |
| `npm run build` | The type check, then `vite build` |
| `npm run lint` | ESLint over the repository |
| `npm run format` | Prettier rewrites every covered file |
| `npm run format:check` | Prettier checks without writing. CI runs this one |
| `npm test` | Vitest, one run, no watch mode |

**Lint and format.** ESLint and Prettier are explicit dev dependencies, pinned in the lockfile.

| Tool | Version | Configuration |
|---|---|---|
| ESLint | 10 | Flat config. `typescript-eslint` recommended rules, the React Hooks rules, `curly: all`, explicit return types on functions and methods, and `eslint-config-prettier`, so ESLint never disputes a formatting choice |
| Prettier | 3 | Its defaults. `.prettierignore` excludes `dist/`, `docs/` and the lockfile. The documents in `docs/` are written by hand |

`curly: all` requires the braces. Prettier always puts a block's body on its own line. Together they enforce the brace rule in `AGENTS.md`.

`explicit-function-return-type` applies to the TypeScript files, with its default options. A callback whose type is already known, such as an argument to a typed function, needs no return type. In `.tsx` files, a wrapper in `eslint.config.ts` skips React components: a function declaration whose name starts with a capital letter, or a function assigned to a variable whose name does. JavaScript files are left out, since they cannot declare a return type.

**Tests.** Vitest 5 with React Testing Library 16 and jsdom. Vitest runs on the Vite configuration, so TypeScript, JSX, CSS imports and ES modules need no setup of their own. Its API matches Jest's.

- **The rule: every component and every exported function has a spec, added in the same pull request as the code.** That covers components, hooks, helpers and the API functions. A function the module does not export is tested through the exports that use it. The helpers in `test/` are exercised by the specs that use them.
- The spec sits beside its module and is named after it: `components/Card.tsx` and `components/Card.spec.tsx`, `helpers/format.ts` and `helpers/format.spec.ts`.
- The API functions are plain `Request` to `Response` handlers, so their specs, `api/metagame.spec.ts` and `api/matchups.spec.ts`, call them directly with `fetch` stubbed.
- Vitest runs two projects: `api` in Node for the specs in `api/`, and `app` in jsdom with the Testing Library setup for the specs in `src/`. A spec needs no per-file setup. Shared test helpers and fixtures live in `test/`, outside `src/`.
- Specs query by role and by visible text, the way a user finds things. No snapshot tests. Where nothing reaches assistive technology, such as a skeleton or a chart's marks, a spec reads the DOM.
- jsdom lays nothing out, so Recharts' `ResponsiveContainer` would measure 0 by 0 and draw nothing. A chart spec calls `sizeCharts` from `test/` first, which gives every element a size.
- Specs never call Endstep. Every request is stubbed.

**Documentation.** Every API function and every helper has a JSDoc block. A helper is any exported function that is not a component: hooks, and the formatting and data functions.

- One sentence on what it does, a `@param` for each parameter, `@returns`, and `@throws` when it throws.
- TypeScript carries the types, so the tags do not repeat them.
- Components and specs need no JSDoc.
- A JSDoc block documents a contract. It is not one of the inline comments `AGENTS.md` rules out.

**Where helpers live.** The formatting and data helpers live in `src/helpers/`, one module per concern, and the rest of the app imports them through `src/helpers/index.ts`. A helper imports its siblings directly, not through the index. Hooks live in `src/hooks/`, the API layer in `src/api/`, and chart code in `src/charts/`, including the series palette. The charts take their colours as CSS variables, such as `var(--s1)`, so the browser resolves them on every paint and a change of theme recolours them without a re-render, FR-13. Keeping chart code out of the index means a formatter can be imported without a page.

**Continuous integration.** One GitHub Actions workflow, `.github/workflows/ci.yml`.

- It runs on every pull request and on every push to `main`.
- It has one job, named `ci`. The Deployment Check in §4.7 refers to that name, so renaming the job breaks the release gate.
- Steps: check out, set up Node 24 with the npm cache, `npm ci`, `npm run format:check`, `npm run lint`, `npm test`, `npm run build`. The first failure stops the job.
- Branch protection on `main` requires `ci` to pass before a pull request merges.

Every commit that reaches `main` therefore compiles, lints, is formatted, and passes the suite, and only such a commit reaches production.

This replaces the no-build decision of Draft v2. That decision pinned React to 18, because React 19 ships no UMD build, and named Vite as the escape hatch. The owner took it on 2026-10-03, for modules, type checking and room for more pages. A mechanical port of the v2 page to Vite and React 19 rendered every section with live data, and an offline `vercel build` kept the function and the rewrite.

### NFR-1a. Design language
Colour, typography and the chart palette are specified in [`design-system.html`](./design-system.html), which is the authority for every token. In summary: a light theme on `#f9f9f7` and a dark theme, Soft graphite, on `#353537`, FR-13, `system-ui` as the single typeface so no font is fetched and NFR-9 holds, `#1c5cab` for links and primary buttons at 6.46:1 on the light surface, and an eight-hue categorical palette validated for colour-vision deficiency against our own surface.

Three of the eight series hues fall below 3:1 against the light surface. That triggers the relief rule: the chart must ship visible labels or a table view. The line chart labels its series ends, and FR-4's deck table, one choice away on the overview, gives the figures as text. Do not drop either without re-checking the palette.

The dark theme is a second palette, validated against its own surface, `#3c3d3f`, never an automatic inversion. Headings and values read at 9.05:1, body text at 6.56:1 and labels at 3.63:1. Links and primary buttons use `#8fbefa` at 5.65:1. The eight series hues are the light hues lifted in lightness, each between 3.20:1 and 3.42:1, so the relief rule does not trigger there. Their worst adjacent pair keeps ΔE 8.2 under colour-vision deficiency and 16.1 under normal vision. What fades by opacity, such as the matchup spotlight, fades no further than in the light theme. The scatter's marks therefore fill at 63% in the dark theme, against 55% in the light one, `--mark-opacity`.

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
- Page interactive within 3 seconds on a normal broadband connection. The art lookup adds at most one second to an uncached deck list, §4.3.
- Initial render API calls: exactly **two** on the overview, `decks` at `pageSize=24` and `share-series`, and a third when the address restores a search, FR-14. **Two** on the deck page: the deck detail and `/api/matchups`. The second is the matchup table's own request, so it shares that page's edge cache entry. **One** on the matchup table.
- Script payload is a reference, not a gate. Draft v2 shipped about 743 KB brotli, 544 KB of it Babel Standalone. The mechanical Vite port measured 156 KB of script and 2 KB of CSS, brotli, on 2026-10-03.
- Card art is lazy-loaded with `loading="lazy"` and sized to prevent layout shift.
- Back, forward or a window switch to data fetched in the last five minutes renders from memory, with no request and no loading state, §4.8.

### NFR-4. Respecting the upstream service
The application must not put meaningful load on Endstep. Edge caching (§4.3) means repeat visits and repeated window switches cost no upstream requests. Within five minutes, the client's own cache (§4.8) sends no request at all. The client must not poll. It must not retry more than twice. It must back off on 429. Total upstream traffic should stay well below the limit of 300 per 60 seconds. The matchup function costs 25 upstream calls per cold window, so warming all five windows costs 125 in each edge region that serves a request. The deck page's matchups row requests the same URL, so it adds no upstream calls once a window is warm. The deck page's HTML function, FR-15, adds one deck detail call per deck and window on an edge cache miss, the same call the page itself makes. A search costs one upstream call for each distinct normalised query, window and page. It runs 300ms after typing stops, from 2 characters, and the edge caches each query like any other deck list. Several regions warming every window inside one minute would pass the limit. At this site's traffic that is unlikely, and §4.4 holds a 429 at the edge for the full minute when it happens.

The same care applies to Scryfall, §3.4. The metagame function sends one collection request per uncached deck list or deck detail, within Scryfall's 2 per second, and fewer once an instance has seen the cards. Each distinct search query is its own deck list, so the search's 300ms pause and its two-character floor, FR-14, also bound the Scryfall requests. A 429 is never retried, and the response goes out without the art.

### NFR-5. Attribution
The page states that the data comes from Endstep and links to `https://endstep.cc/metagame`. It does not present itself as an official Endstep product. The footer, laid out as the design system shows, carries:

1. the data source, linking to Endstep;
2. that the site is not affiliated with Endstep;
3. the Fan Content notice in the policy's own words: "Pauper Endstep metagame is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.", with a link to the policy;
4. the author, Gabriele D'Arrigo, linking to `https://github.com/gabrieledarrigo`, beside a link to the source code;
5. a credit to Scryfall for the card images, which reach the browser from Scryfall's servers, §3.4.

### NFR-6. Accessibility
- All content reachable and operable by keyboard. A chart's bars and markers open deck pages on a click, but are not tab stops: every page they open is reachable by keyboard through the deck grid or the deck table, whichever view the overview shows.
- Charts are never the only carrier of information. Everything in a chart is also in a table or a list. On the overview that is the deck table, one choice away in the view switch, FR-4. On the deck page it is the daily share list, FR-11.
- Colour is never the only means of conveying meaning. Contrast targets WCAG AA. Two exceptions are accepted. The first is the cells the matchup table's spotlight fades, FR-12. They are context for the deck in the spotlight, which keeps full contrast, and the detail on hover or focus gives their figures in full. The second is the lines, end dots and end labels that Share over time fades around a highlighted deck, FR-5. The highlighted line and its label keep full contrast, and the legend and the tooltip name every deck at full contrast.
- Card art carries meaningful `alt` text. Decorative elements are hidden from assistive technology.

### NFR-7. Responsive
Usable from 360 px to wide desktop. Tables scroll horizontally rather than reflowing. The matchup table is the exception: below 640px it becomes one deck's list, FR-12. The page itself never scrolls horizontally.

### NFR-8. Browser support
Current versions of Chrome, Firefox, Safari and Edge. No IE, no polyfills.

The code targets ES2025: `target` and `lib` in the three TypeScript configs, and Vite's `build.target`. Older browser versions are not supported.

### NFR-9. Privacy
No analytics, no cookies, no local storage of personal data, no third-party requests beyond the card-art hosts: Scryfall's CDN, and Endstep's image endpoint as the fallback. The theme choice, FR-13, is the one value the app keeps in local storage. It is a display preference, not personal data, and it never leaves the browser.

### NFR-10. Deployment
Deployed on Vercel from the Git repository. A Vite build and three serverless functions. No environment variables and no secrets. Production waits until CI passes, §4.7.

### NFR-11. CSS architecture
Plain CSS files, processed by Vite. No CSS Modules, no CSS-in-JS and no framework, so class names ship exactly as the design system documents them.

**Cascade layers.** `src/styles/index.css` is the one global entry. `main.tsx` imports it first. It declares the layer order once:

```css
@layer tokens, base, layout, components;
```

A later layer overrides an earlier one, whatever the selectors' specificity and whatever order Vite emits the files in.

| Layer | Owns | Example |
|---|---|---|
| `tokens` | The design system's tokens: custom properties on `:root`, from part three of `design-system.html`, in the light theme and the dark one, and the `color-scheme` that goes with each theme. Nothing else | `--text-900`, `--win`, `color-scheme` |
| `base` | The browser reset and the default rules for elements: text, headings, links, lists, tables, the focus ring. The one shared class, `.visually-hidden` | `body`, `h1`, `a`, `:focus-visible` |
| `layout` | The layout primitives the pages are built from: the page wrapper, the full-width band that breaks out of it, the spacing between sections | `.page`, `.bleed` |
| `components` | The UI components, one BEM block each | `.stat-tile`, `.deck`, `.matchup__cell` |

- Every rule sits in a layer. A rule outside any layer overrides every layer, so an unlayered rule is a defect.
- No `!important`. It reverses the layer order.
- Element selectors appear only in `base`.

**Component stylesheets.** Each component imports its own stylesheet, named after it: `StatTile.tsx` imports `./StatTile.css`, and the file wraps its rules in `@layer components`.

- BEM is the naming convention: `.stat-tile`, `.stat-tile__label`, `.stat-tile--hero`.
- An element's block class sits on the component's root, even when the block has no rules of its own. `.win-rate__frame` sits inside `.win-rate`.
- A component's stylesheet styles only the elements that component renders. It does not reach into a child component, and it does not style anything outside its own markup. `.stat-list` belongs to `Summary.css`, because the summary renders the list. `.stat-tile` belongs to `StatTile.css`.
- A parent changes a child in two ways only. It sets a modifier the child defines, such as `--hero`. Or it adds one of its own classes to the child's root, a BEM mix: `<Panel className="deck-table__scroll">`. The parent's stylesheet styles that class. It never selects into the child's classes.
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
- The window selector scrolls sideways below 640px. It used to scroll below 400px. It is 307px wide, so it only scrolls below about 347px. Between 400px and 639px the one visible change is that the scroll box clips the outer pixel of the focus ring, as it already did below 400px.
- The win rate scatter shows its point labels from 640px. It used to show them from 761px. The label spacing assumes a 590px plot, which the chart reaches at about 770px, so narrower plots can crowd the labels. With the data of 7 October 2026, no label overlapped another at 640px, 700px or 759px, and a bubble covered part of one label, as it did at 761px.

**No CSS linter for now.** Prettier formats the CSS. Review enforces the rules above.

---

## 8. Out of scope

- Deck page sections beyond the numbers, the sample list and the matchups row: the deck's full list of opponents, card usage and the rating distribution.
- A matchup table beyond the top 24 decks.
- Formats other than Pauper.
- The `casual` population and rating-band filtering.
- `minMatches` filtering, and paging the overview's top list beyond 24. Search results page, FR-14.

---

## 9. Open items

1. ~~Deck card link target.~~ Settled: our deck page, which links to endstep.cc. FR-10.
2. ~~Share composition chart form.~~ Settled: ranked horizontal bars, FR-6.
3. **Series count on the time chart.** Currently the API default of 8. Charting more than 8 of the 24 grid decks is possible by passing deck UUIDs to `share-series`, at no extra request cost.
4. ~~Matchup coverage on other windows.~~ Settled: checked on all five windows on 2026-10-10. At `7d`, `14d`, `30d` and `season`, all 276 pairs of the top 24 appear in both directions. At `1d`, 270 appear in both directions and 3 in one direction only, which §4.4 fills. The other 3 never met: one deck of each pair has all its opponents inside its first 50 rows. No pair was lost to the 50-row limit.
5. ~~What the toss blocks count.~~ Settled: game 1. For Affinity at 30d on 2026-10-10, `tossWon` and `tossLost` hold 12,623 and 12,951 games, 25,574 in all, exactly the decided games in `games.game1`. `choseToDraw` counts 47 of the same 12,623 tosses won. FR-11 labels them game 1 win rates.
6. **Deployment Checks on this plan.** Vercel's documentation does not say which plans offer Deployment Checks. If this project's plan lacks them, the fallback is to turn off Vercel's Git deploys and deploy from the `ci` workflow with the Vercel CLI, which needs a `VERCEL_TOKEN` secret and the project IDs in GitHub.
7. ~~The matchup table on a phone.~~ Settled: below 640px, one deck's row as a list, opening on the top deck by share. FR-12.
8. ~~Finding a deck in the matchup table.~~ Settled: `?deck=` puts one deck in the spotlight and fades the other cells. A picker chooses it, and the deck page's row links to it. No hover crosshair. FR-11 and FR-12.
9. ~~Cards or a table on the overview.~~ Settled: one view at a time, chosen with a switch kept in `view`. Cards by default. FR-3 and FR-4.
10. ~~The dark palette.~~ Settled: Soft graphite, chosen by the owner on 2026-10-16 over warm stone. NFR-1a gives its figures and the design system its tokens.
11. ~~Card art from our server.~~ Settled on 2026-10-17: Scryfall, by name. The owner accepted that the art may differ from Endstep's, for 11 of the 24 decks when measured, because the site presents its own view of the data. §3.4 and §4.3 give the rules, E14 builds it.
12. ~~A page that suggests a deck.~~ Settled on 2026-10-18: What to play?, FR-17. The owner chose the answer first, "Play {deck}!", the metagame as the reader's to change, kept in the address as changes rather than shares, and plain words for readers whose first language is not English.
