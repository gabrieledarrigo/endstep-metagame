# Endstep Pauper Metagame Viewer: Requirements

Status: Draft v18 · Date: 2026-10-23

Scope: five pages.

- The overview.
- A deck page with its numbers, a sample list and its matchups against the top 24.
- A matchup table.
- A page that suggests which deck to play.
- A page with the format's staple cards.

Other deck page sections are out of scope, see §8.

[`design-system.html`](./design-system.html) specifies the visual design. This document covers structure, content and behaviour.

---

## 1. Purpose

This document describes a browser application. It reads the public Endstep metagame API and shows the Pauper metagame. It has these pages:

- The overview shows which decks players play, how much of the field each deck holds and how each deck performs. It also shows how these numbers change over time.
- A deck page gives the numbers of one deck, a sample list, and its results against the rest of the top 24.
- A matchup table shows how the top decks do against each other.
- "What to play?" ranks the top decks against the metagame that the reader expects. It names the best deck.
- Staples lists the cards that the top decks play most.

The application is read-only. It stores only three display preferences: the theme, FR-13, the sample list's currency, FR-19, and the language, FR-20. It has no authentication and no accounts. It has no affiliation with Endstep.

---

## 2. Decisions taken

| Area | Decision |
|---|---|
| Format coverage | Pauper only |
| Data access | Vercel functions: the proxy, the matchup function, the staples function, the sample cards function for the sample list's cards and prices, and the deck page's HTML function. They work around CORS, see §4.1 |
| Cache policy | 5 minutes at the edge, with stale-while-revalidate |
| Front end | React 19 and TypeScript, with Vite as the build tool. See NFR-1 |
| Data fetching | TanStack Query 5. A response stays fresh for five minutes. See §4.8 |
| Page state | The address holds the window and the view state. A link opens a page in its default view. The one exception is the deck page's link to its deck in the matchup table. See §4.5 |
| Styling | Hand-written CSS in cascade layers, with BEM and one stylesheet for each component. No framework. A light theme and a dark theme, FR-13. See NFR-11 |
| Charting | Recharts 3.x from npm |
| Pages | Overview, deck page, matchup table, What to play?, Staples. React Router in declarative mode, see §4.5 |
| Quality gates | ESLint, Prettier and Vitest with React Testing Library. GitHub Actions runs them on every pull request and every push to `main`. See NFR-1 |
| Release | Vercel deploys from Git. Vercel Deployment Checks hold the production deploy until CI passes. See §4.7 |
| Grid size | The top 24 decks by share. All other decks go into a single `Other` |
| Filters exposed | The window, and a deck search on the overview, FR-14 |
| Charts on the overview | Share over time, share composition, win rate against share |
| Deck page | Numbers, the sample list, and the deck's row of the matchup table. Deferred: the full opponent list, card usage and ratings |
| Deck links | Our deck page. It links to the same deck on endstep.cc |
| Order of work | The Vite refactor first, then the deck page and the matchup table. With this order, we write the new pages only once |
| Matchup table | A page of its own. The top 24 decks. Colour only the clear pairs. Below 640px, the list of one deck, FR-12 |
| Card art | From Scryfall by name. The proxy adds it. Endstep's image endpoint is the fallback, §3.4 |
| Install | The reader can install the site as an app. No offline caching and no service worker, FR-16 |
| Sharing | Each deck page shares with its own title, figures and art. The overview shares the site card. The other pages share their own title, description and page card, FR-15 |
| Analytics | Vercel Web Analytics counts the page views, with the full address. No cookies, NFR-9 |
| Logging | Each function logs every failed response with pino, as one JSON line in Vercel's runtime logs. No line for a success, NFR-12 |
| What to play? | The top 24, ranked by expected match win rate against a metagame that the reader can change. The data comes from the matchup table. No new calls to Endstep, FR-17 |
| Staples | The 50 cards that the top 24 play most, weighted by share, for the main deck and the sideboard. The staples function builds them, FR-18 and §4.9 |
| Languages | English, Italian, Spanish and Portuguese, through i18next. The page detects the language from the browser, and a switch in the header changes it, FR-20 |
| Sample list extras | Card images on hover or tap. The cost to build, at each card's cheapest printing. Both come from Scryfall through the sample cards function, FR-19 and §4.10 |

---

## 3. Data source

Base URL: `https://endstep.cc/api/metagame/v1`. All endpoints are public. They need no authentication.

### 3.1 Endpoints that this application uses

| Endpoint | Purpose | Parameters used |
|---|---|---|
| `/{format}/decks` | The deck list with share, players and win rate, and the search results | `window`, `population`, `q`, `sort`, `dir`, `page`, `pageSize` |
| `/{format}/share-series` | The daily share of each deck | `window`, `population` |
| `/{format}/decks/{slug}` | One deck: its row, games, toss, texture and daily share. See §3.6 | `window`, `population` |
| `/{format}/decks/{slug}/matchups` | The results of one deck against each opponent. The matchup function calls it, not the browser. See §3.7 | `window`, `population`, `sort`, `dir`, `pageSize` |
| `/{format}/decks/{slug}/cards` | The cards of one deck, with the play rate and the average copies of each card, for the main deck or the sideboard. The staples function calls it, not the browser. See §3.8 | `window`, `population`, `section`, `pageSize` |

### 3.2 Endpoints that this application does not use

This application does not use `/formats`, `/visibility` or `/{format}/decks/{slug}/ratings`. We keep the last one for the deferred deck page sections.

### 3.3 Parameter vocabulary

These values come from the Endstep client bundle. They are the authoritative values, not values that we inferred.

- `window`: `1d`, `7d`, `14d`, `30d`, `season`. The default is `30d`.
- `population`: `rated`, `casual`. This application uses `rated` everywhere, and the reader cannot change it.
- `ratingBand`: `q1` to `q4`, plus the ranges `q1-q2`, `q2-q3`, `q3-q4`, `q1-q3`, `q2-q4`. `q1-q4` is not a valid value. This application does not use it. Endstep itself never sends it to the deck endpoints.
- `minMatches`: `0`, `20`, `50`, `100`. This application does not use it, see §6.4.
- `q` (`/decks`): a search term. It matches deck names and every card in the decks' lists. It returns `total` with one page of matches. Endstep's own search uses it.
- `sort`: `share`, `players`, `winRate`, `shareChange`, `name` on `/decks`. `matches`, `winRate`, `name` on `/matchups`. There, `share` returns 400.
- `pageSize`: at most 50. A larger value returns HTTP 400. The default is 25.
- `decks` (share-series only): deck UUIDs separated by commas, not slugs. If the request leaves it out, the API returns the top 8 series.
- `v`: a cache-buster. Its value is the `dataVersion` string from `/visibility`.

### 3.4 Card art

`https://endstep.cc/api/cards/image?name=<Card Name>&_v=2` returns a 302 redirect to the Scryfall CDN. The optional parameters are `version`, `face=back`, and `set` with `cn`.

`<img>` tags do not make CORS requests. So card art loads on any origin with no proxy.

#### The art comes from Scryfall by name

The proxy adds `art.imageUrl` to every deck in the deck list and in the deck detail, §4.3. This value is the `art_crop` address on Scryfall's CDN, `cards.scryfall.io`. That CDN has no rate limit, and the browser loads the art with no redirect. Scryfall picks its default printing. This printing can differ from Endstep's choice. If `art.imageUrl` is missing, the browser falls back to Endstep's endpoint with `version=art_crop`, as before.

- The proxy sends one `POST https://api.scryfall.com/cards/collection` for each response. The request has one `{ "name": … }` identifier for each distinct key card name.
  - The request has at most 50 identifiers, the largest page of the deck list. This is under Scryfall's limit of 75.
  - A deck with a blank name gets no identifier.
- The staples function uses the same lookup, `findArt` in `server/scryfall.ts`, for its 50 cards, §4.9.
- The proxy matches each card that Scryfall returns to a deck by name, and ignores case. The name can be the card's full name or the name of any of its faces. A double-faced card comes back as "Front // Back", but Endstep names its front face.
- The lookup sends a name with two halves, "Front // Back", as its first half. It matches the answer by the full name. The collection does not find a split card by its full name, §4.10. Endstep's card tables name a card with two faces in full, §3.8.
- A face's name gets that face's `image_uris.art_crop`. If the face has no image of its own, as on an adventure, the face's name gets the card's art crop. The full name gets the card's `image_uris.art_crop`, or the first face's art crop. The first match with an address on `cards.scryfall.io` wins.
- A 200 is a stable answer:
  - The proxy stores every name that matched no card as not found. Scryfall shows such a name in one of two ways: it lists the name in `not_found`, or it answers with another spelling.
  - The proxy also stores as not found every card that Scryfall found with no art crop on `cards.scryfall.io`.
  - For these names, the deck falls back to Endstep's endpoint, and the response keeps its usual cache time.
- If the proxy cannot read the body of a 200, the lookup counts as failed, §4.3. For example, `data` is not a list, or a card has no string name. The proxy stores nothing.
- Scryfall allows 2 requests per second on that endpoint. It requires a `User-Agent` that names the application, and an `Accept` header. A 429 limits access for 30 seconds.
- The proxy keeps two things in memory for as long as its instance lives: each card's address, and each name that Scryfall did not find. So a warm instance asks Scryfall only for names that are new to it.
- Each caller sets the bound of the lookup. The proxy passes one second, and the staples function passes three seconds, §4.9.
- The functions keep no rate-limit state that instances or regions share. After a 429, an instance sends nothing to Scryfall for 30 seconds. This span is Scryfall's own lockout. During that time, the responses of that instance use the fallback.

### 3.5 Measured values

We measured these values on 2026-09-20, for Pauper, with `window=30d` and `population=rated`.

| Property | Value |
|---|---|
| Direct API latency | ~60 ms |
| Rate limit | 300 requests per 60 seconds, for each IP. The API returns `x-ratelimit-*` headers. We measured the duration of the limit on 2026-10-03 |
| Upstream cache header | `public, max-age=60, stale-while-revalidate=300` |
| Archetypes in Pauper | 264 |
| Registrations / players | 89,314 / 5,117 |
| Sum of all archetype shares | 94.1%. The rest is unclassified, see §6.1 |
| Machine-named archetypes | 230 of 264 |
| Earliest data | 2026-09-05 |

### 3.6 Deck detail

We measured the deck detail on 2026-10-03. It is about 9.7 KB, and 2.7 KB compressed. It applies `window` and `population`, and it ignores `ratingBand`.

The response has `provenance` and `formatId` at the top level, and then the fields in the table below.

The win and loss figures in `gameResults`, `games`, `playDraw` and every `/matchups` row use one block: `{wins, losses, required, gate, rate, low, high, deff}`. `required` is 20. Below 20 decided matches, `gate` is `"too_few"`, and `rate`, `low`, `high` and `deff` are null. `deck.matchWinRate` is the exception. It has no `required` and no `gate`, only `{wins, losses, rate, low, high, deff}`. See §6.8.

| Field | Contents | Used by |
|---|---|---|
| `deck` | The same object as a `/decks` row, with `art`, `colours`, `share`, `players`, `matchWinRate`, `shareChange` | FR-11 |
| `gameResults` | `rows[3]` for games 1 to 3, each with `onPlay`, `onDraw` and `total` blocks. Also a `total` row and `unknownPositionGames`. Endstep's client treats the field as nullable | FR-11 |
| `games` | `game1`, `game2AfterWin`, `game2AfterLoss`, `game3` blocks. Its game 2 rows do not agree with `gameResults`. For Affinity at 30d, after a win plus after a loss gives 8,401 to 7,866, against 8,522 to 7,964 for game 2 | Not used |
| `playDraw` | `tossWon`, `tossLost`, `onPlay`, `onDraw` blocks, and `choseToDraw {count, of, rate}` | FR-11 |
| `texture` | `averageTurns`, `averageOpeningHand`, `mulliganRate {count, of, rate}` | FR-11 |
| `shareSeries` | `days {from, to}`, `markedDay`, and `points[{day, registrations, totalRegistrations, rate}]` for this deck only. Share only, no win rate history | FR-11 |
| `sampleList` | The most common exact list for the deck. `state` is `shown`, `mainOnly` or `withheld`, with `minPlayers: 3` and a `reason`: `sideboard_below_player_floor`, `main_below_player_floor` or `no_registrations`. `players` counts the players who brought this exact list. `similarity` compares it with the deck's average list. If the list is withheld, both are null. `distinctLists` counts the lists that Endstep picked it from. `main` and `side` are `{name, count, setCode, collectorNumber}`. The set and the number can be null | FR-11 |
| `cardTableWithheld` | If the card table is withheld, `{reason, minPlayers}`, for example `below_player_floor` with 3. Otherwise null | Deferred |

A UUID in place of the slug returns 404 `{"error": "Unknown deck"}`. A stale slug with the right 8-character suffix returns 307 with `canonicalSlug`. See §6.11.

### 3.7 Matchups

We measured the matchups response on 2026-10-03. It is about 15 KB at `pageSize=50`. The response has `provenance`, `formatId`, `deck`, `query`, `neverMet` and `matchups {items, total, page, pageSize}`. Each item is a win and loss block, plus `matches` and `opponent {id, slug, name, machineNamed}`. An opponent has no colours and no art. `neverMet` counts the archetypes that the deck never faced. The list does not include the mirror.

No endpoint returns a matrix for the whole format. Endstep's own client shows matchups only as a list on each deck's page. So a 24 by 24 table needs 24 calls. At 30d, every top-24 opponent of every top-24 deck was in the first 50 rows, sorted by `matches`.

### 3.8 Card tables

We measured the card tables on 2026-10-18. `/{format}/decks/{slug}/cards` lists one deck's cards for one part of the deck: `section=main` or `section=side`. Any other `section` returns 400. The response has `provenance`, `formatId`, `deck`, `section`, `withheld` and `cards {items, total, page, pageSize}`.

- `pageSize` is at most 50. A larger value returns 400. `page` gives the rest of the cards. The cards come in order of play rate, highest first. The API ignores `sort`.
- Each item has these fields:
  - `name`.
  - `playRate {count, of, rate}`: the share of the deck's lists that hold the card.
  - `averageCopies`: the average copies of the card in those lists.
  - `contrast`: the win rate with the card against the win rate without it, with `withMatches`, `withoutMatches` and `required`.
- `withheld` was null for all 48 tables of the top 24 at 30d. A withheld table is a 200 with no items. Its `withheld` has the shape of the deck detail's `cardTableWithheld`, §3.6.
  - We measured a withheld table on 2026-10-20 at 7d, for a deck with one player. The response had `"withheld": {"reason": "below_player_floor", "minPlayers": 3}` and `"cards": {"items": [], "total": 0, "page": 1, "pageSize": 50}`.
  - The smallest top-24 deck at 7d had 94 players. So Endstep rarely withholds a top-24 table above 1d.
  - The staples function leaves out such a deck, §4.9.
- A card with two faces has its full name, "Front // Back". An example at 7d is "Tithing Blade // Consuming Sepulcher". A key card has only the name of its front face, §3.4.
- At 30d, a main table held 76 to 398 cards, and a sideboard table held 57 to 250 cards.

---
## 4. Architecture

### 4.1 Why a proxy is required

The Endstep API returns `access-control-allow-origin` only when the request carries `Origin: https://endstep.cc`. For any other origin, the API sends no such header, and the browser blocks the response. So a page from GitHub Pages, Vercel or `file://` cannot call the API directly.

On 2026-09-20, the project tested public CORS proxies and rejected them. All six failed. allorigins and codetabs returned HTTP 522 after about 20 seconds. cors.lol returned HTTP 429 on the first request. whateverorigin returned HTTP 400. thingproxy refused the connection.

### 4.2 Components

1. The front end is a Vite application in `src/`. Vercel builds it to `dist/`. It serves the overview from `index.html`. The matchup table, What to play? and Staples each have a copy of that file with their own title and description, §4.7.
2. `api/metagame.ts` is the proxy. It forwards `GET` requests to `https://endstep.cc/api/metagame/v1/...`. It keeps the allow-listed query parameters and returns the upstream body with CORS headers. For the deck list and the deck detail, it also adds the art address of each deck from Scryfall, §3.4. So the proxy is no longer a pure pass-through.
3. `api/matchups.ts` is the matchup function. It builds the top-24 matrix on the server and returns it in one response. See §4.4. It is a separate function, so that the proxy keeps to one upstream call per request.
4. `server/` holds the code that the functions and the build share. Vercel deploys only the files in `api/` as functions, so no file here is a function. The functions import the code through `server/index.ts`, with the path `../server/index.js`. Node does not load a folder as an ES module, so the path names the file. A file in `server/` imports its siblings directly. Each function bundles every file in `server/`. Each file covers one subject:
   - `endstep.ts`: the upstream address, its timeout and the fetch of an Endstep endpoint. It also holds the windows, the slug rule and the address of a deck detail.
   - `scryfall.ts`: the art lookup on Scryfall, §3.4, with its memory and its pause. It also holds the Scryfall addresses, the request headers and the length of the pause. The sample cards function uses them too.
   - `cards.ts`: the rules for card names, the six basic lands and their snow-covered versions.
   - `http.ts`: the CORS headers, the method rules, the error responses, the cache rules and the check of a JSON object.
   - `log.ts`: the pino logger, the log of each response's calls, and the wrapper that logs a failed response, NFR-12.
   - `head.ts`: the code that writes a title, a description, a canonical link and `og:url` into the HTML, and the list of page previews. The deck page's function and the build plugin both use it, FR-15.
5. `api/deck-page.ts` is the deck page's HTML function. It writes the title, the description and the image of the deck into the built `index.html` for link previews, FR-15. `vercel.json` sends `/decks/:slug` to this function in place of the static rewrite.
6. `api/staples.ts` is the staples function. It builds the 50 most played cards of the top 24 decks on the server, with their art. It returns them in one response. See §4.9.
7. `api/sample-cards.ts` is the sample cards function. It gets the card images and prices of the sample list from Scryfall, for one deck and window. See §4.10.

### 4.3 Proxy behaviour

- The endpoint path reaches the function as the `path` query parameter, through the rewrite in `vercel.json`. For example, `/api/metagame/Pauper/decks` becomes `/api/metagame?path=Pauper/decks`.
- The proxy accepts `GET` and `HEAD`. An `OPTIONS` request gets 204, as the answer to the CORS preflight. Every other method returns 405.
- The proxy allow-lists the upstream path prefix. So nobody can use the function as an open proxy to arbitrary hosts.
- The proxy sets `Cache-Control` by status. A success gets `public, s-maxage=300, stale-while-revalidate=600`. Then the edge serves repeat requests without a call to Endstep. A 429 gets `public, s-maxage=10`. Any other error gets `no-store`. The fallback of the art lookup is the one exception, below.
- The proxy passes upstream non-2xx status codes through unchanged. Then the client can tell a rate limit from a server error.
- The proxy sends no cookies, credentials or client identifying headers upstream.

#### Adding the art

For a successful `GET` of a deck list or a deck detail, the proxy looks up the key cards on Scryfall, §3.4. It adds `art.imageUrl` to each deck that it resolves. A `HEAD` request gets no lookup.

The lookup has a one-second bound. If the lookup fails, times out or meets a 429, the response goes out without the addresses that it did not resolve. That response gets `s-maxage=60` in place of the usual five minutes, so the art returns soon for the next reader. A reader who already holds that response keeps it for the five minutes of the client, §4.8. Meanwhile, that reader sees the art from Endstep. A lookup never fails the response, and the proxy never retries a lookup within the same response.

The Scryfall request carries `User-Agent: PauperEndstepMetagame/1.0 (+https://github.com/gabrieledarrigo/pauper-endstep-metagame)`, `Accept: application/json` and `Content-Type: application/json`. The `User-Agent` is the only identifying header that the functions send upstream.

### 4.4 Matchup function

`GET /api/matchups?window=30d`. Three pages read it:

- The matchup table.
- The deck page, for one row, FR-11.
- What to play?, FR-17.

All three pages request the same URL. So they share one entry in the edge cache for each window.

`window` is the only parameter. The function checks it against the five values in §3.3. The raw query string must be exactly `?window=` followed by one of the five values, byte for byte. Anything else returns 400. This includes a missing or repeated `window`, another parameter, and an encoded or padded value. The edge caches by the raw query string. Without this rule, any variant forces a cold build of 25 calls.

The format is always Pauper, and the population is always `rated`.

1. Fetch the top 24 decks: `/Pauper/decks?window=…&population=rated&sort=share&dir=desc&pageSize=24`.
2. Fetch `/Pauper/decks/{slug}/matchups?window=…&population=rated&sort=matches&dir=desc&pageSize=50` for each of the 24 decks, in parallel.
3. Keep only the rows whose opponent is one of the 24. Drop all other rows.
4. If a pair has a record in one direction only, fill the other direction from it. The counts are exact. The range is close, see §6.10.
   - Swap the wins and the losses.
   - Set `rate` to 1 minus `rate`.
   - Set the range to 1 minus `high` through 1 minus `low`.
   - If the recorded direction is gated, gate the filled direction too, with null `rate`, `low` and `high`.

#### Response

```
{
  window: { from, to },
  decks: [{ id, slug, name, colours, share }],
  cells: { [rowSlug]: { [columnSlug]: { wins, losses, matches, rate, low, high, gate } } }
}
```

- `window` holds `from` and `to` of `provenance.window` from step 1, unchanged. §6.7 applies when the page displays it.
- `decks` is in share order. `share` is `share.rate`.
- `cells[a][b]` is the record of deck `a` against deck `b`. If a pair is absent from the first 50 rows of both decks, it has no entry. The mirror has no entry.
- The response is about 88 KB uncompressed and 21 KB compressed. These sizes come from the 30d data.

#### Behaviour

- One cold build costs 25 upstream calls.
- `Cache-Control` follows the rules of the proxy by status, with one difference. The function holds a 429 for 60 seconds, the length of the Endstep rate limit. So the next reader does not retry a rate-limited build within that time.
- The function holds a success for 5 minutes. Any other error gets `no-store`.
- The edge holds one entry for each window, in each region that served one.
- If any upstream call fails, the whole request fails. The function returns no partial matrix. An upstream 429 returns 429. Anything else returns 502.
- Each upstream call has the same 8 second timeout as the proxy.
- The function uses the same method rules and CORS headers as the proxy, §4.3.

### 4.5 Routing

The front end uses React Router 8 in declarative mode, with `BrowserRouter`, `Routes` and `Route`, `Link`, `useNavigate` and `useSearchParams`. It uses no Vite plugin, no loaders and no data mode. The project chose it on the criteria that chose Recharts in NFR-2. It is the most used React router, and declarative mode is its simplest form. The app has five routes.

| Path | Page |
|---|---|
| `/` | Overview |
| `/decks/{slug}` | Deck page |
| `/matchups` | Matchup table |
| `/what-to-play` | What to play?, FR-17 |
| `/staples` | Staples, FR-18 |

- `vercel.json` sets `cleanUrls`. So Vercel serves each of the three pages from its copy of `index.html`, §4.7. It serves `/staples` from `staples.html`, for example. A request for `/staples.html` gets a 308 redirect to `/staples`, and `/index.html` one to `/`. It sends `/decks/:slug` to the deck page's HTML function. That function serves the same `index.html` with the link preview of the deck, FR-15. Vercel applies rewrites after it checks for real files, so the rewrites do not affect built assets.
- `?window=` belongs to every page, and links carry it from page to page. Pages read and write it with `useSearchParams`. See FR-1.
- If the window is missing or unknown, the layout route replaces it with the default, with a replace navigation. So the address always names the window on the screen.
- The view state also lives in the address:
  - The view of the overview in `view`, and the sort of the deck table in `sort` and `dir`, FR-4.
  - The search of the overview in `q`, FR-14.
  - The highlighted deck of the share chart in `highlight`, FR-5.
  - The chosen deck of the matchup table in `deck`, FR-12.
  - The changed metagame of What to play? in `meta`, and its chosen deck in `beat`, FR-17.
  - The section of the staples list in `section`, FR-18.
- A change to the view state replaces the history entry. So Back leaves the page, and does not undo a sort. The default view leaves the parameters out.
- So Back, forward and reload return to a page as the reader left it. A link carries only `?window=`, so it opens a page in its default view. This is the rule of the browser itself. History returns to a page, and a link is a new visit. The one exception is the link from the deck page to the matchup table. That link also carries `?deck=`, FR-11.
- The theme is not view state. It is a preference of the reader, kept in local storage, so a link never carries it. See FR-13. The currency of the sample list, FR-19, and the language, FR-20, are the same kind of preference.
- Back and forward work. A route change does not reload the page.
- `BrowserRouter` sets `useTransitions={false}`. So each navigation renders at once, not as a React transition. With transitions, quick presses of Enter on a stepper button read the address before the last press rendered. The app then lost some presses, FR-17.
- Any other path is a Vercel 404. If a path reaches the app without a route, the app shows a Not found page.
- On each route change, the app sets the canonical link and `og:url` to the new path, FR-15.
- A route change moves focus to the main heading of the new page. Then readers who use a keyboard or a screen reader know that the page changed.
- A link scrolls the new page to the top. The exception is a link to the matchup table that names a deck. That link scrolls as FR-12 sets out. Back and forward keep the scroll position that the browser restores. Declarative mode does none of this, because `ScrollRestoration` exists only in data mode. So the app does it on each change of the path. A change to the query string alone is not a route change.

### 4.6 Local development

`npm run dev` starts Vite. A small Vite plugin serves `/api/metagame/*`, `/api/matchups`, `/api/staples` and `/api/sample-cards` through calls to the real handlers. It applies the same rewrite as `vercel.json`.

The plugin serves each response from memory for its `s-maxage`, the same lifetime that the edge uses. It does not serve stale responses and does not evict expired entries, so it is simpler than the edge. Without this memory, every reload of the matchup page in development costs 25 upstream calls. Then a dozen reloads in a minute reach the rate limit.

The plugin replaces `dev-server.js`, which the project deletes. For the page routes, the Vite dev server already falls back to `index.html`. `vite preview` also serves `/decks/:slug` through the deck page's HTML function, with the rewrite from `vercel.json`. Vite's own fallback serves `staples.html` for `/staples`, as Vercel does with `cleanUrls`. The same holds for the other two copies. Only Vercel redirects `/staples.html` to `/staples`. `vite preview` serves the file at that path, and the app shows Not found. So a developer can check a link preview on a local build. The dev server does not do this, because its `index.html` is the source file.

### 4.7 What deploys

Vercel runs `npm run build` and serves `dist/`. Vercel builds the functions in `api/` from source, as before. Through `includeFiles`, `vercel.json` deploys `dist/index.html` with the deck page's HTML function, FR-15.

- `vercel.json` pins `"framework": "vite"`. The Vercel project started with the "Other" preset. Without the pin, Vercel may skip the build and serve the source `index.html`. That file renders a blank page.
- `vercel.json` also carries the proxy rewrite (§4.3), the deck page rewrite and `cleanUrls` (§4.5).
- After Vite writes `dist/index.html`, a small Vite plugin writes `matchups.html`, `what-to-play.html` and `staples.html` beside it. Each is a copy of `index.html` with the title, the description, the card, the canonical link and the `og:url` of its page, FR-15. Nothing runs for each request.
- The copies keep the inline theme script unchanged. So its hash in the security policy stays the same.
- `public/` holds the icons, the web app manifest, the site card, the three page cards and `robots.txt`. Vite copies it into `dist/` unchanged.
- Vercel serves the hashed files under `/assets/` with `public, max-age=31536000, immutable`, because their names change with every build. The HTML files keep a short cache, so a deploy reaches readers at once.
- Every response carries the security headers that `vercel.json` sets: a Content Security Policy, `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin`. The policy forbids framing with `frame-ancestors 'none'`. The policy allows these:
  - Scripts from the site, and the inline theme script by its hash.
  - Images from the site, `endstep.cc` and `cards.scryfall.io`.
  - Connections to the site only.
  - Inline style attributes, which the charts set.
- Vercel serves only `dist/`. Nobody can reach the source files, `docs/` or the development files from the public site any more.
- Vercel deploys every file in `api/` as a function. So `.vercelignore` excludes `api/**/*.spec.ts`, and Vercel never deploys the specs beside the functions.

#### Production waits for CI

The Deployment Checks of the project require the `ci` job from NFR-1. Vercel still builds every push to `main`. But Vercel assigns the production domain only after `ci` passes on that commit. Preview deployments do not wait. This setting is in the Vercel dashboard, not in `vercel.json`. See open item 6.

### 4.8 Data fetching

The pages read the API through TanStack Query 5. The project chose it over SWR on the criteria in NFR-2. It is the most used, and it has the two behaviours that this application needs. These are a time that a response stays fresh, and the cancellation of a request that a page no longer needs. On 2026-10-09, TanStack Query had 67 million weekly downloads against 18.6 million for SWR. Minified and gzipped, it was 10.3 KB against 6.7 KB.

- The app has one query client. Each request is a query, keyed by what it reads, such as `["decks", window]` or `["deck", slug, window]`.
- A response stays fresh for five minutes, the `s-maxage` of the edge cache, §4.3. Within that time, a page renders it from memory, with no request and no loading state. After that time, the page shows it and refetches it in the background. Responses stay in memory for the rest of the visit. So this holds, however long the reader was away.
- A section shows its data whenever it has some. If a refetch fails, the data stays on the screen. The error panel appears only when there is nothing to show, FR-9.
- Requests run whether or not the browser reports itself online. So a reader without a connection sees the network error, not a page that waits.
- Nothing refetches when the browser regains focus, NFR-4.
- If a request fails with a network error, a 429 or a 5xx, the query client retries it. It retries at most twice, after 400 ms and then 800 ms, NFR-4. Any other failure shows at once. In a background tab, the retries wait until the tab is shown again.
- A query can turn retries off. These queries do: the matchup table, the matchups row of the deck page, What to play?, Staples and the cards of the sample list. See FR-11, FR-12, FR-17, FR-18 and FR-19.
- The query passes an abort signal to `fetch`. So the query cancels a request for a window that the reader left.
- `getJson` makes one request. It turns a failed status into an error that carries its kind and status. The query client decides whether to retry.

#### A window change keeps the page on screen

While another window loads, a page keeps the data of the previous window on the screen:

- The page dims the data and marks it busy.
- The page marks its window selector busy.
- The page shows a status line that says which window is loading.

If the reader picks a window during the load, the pick replaces the history entry. Every page behaves this way: the overview, the deck page with its matchups row, the matchup table, What to play? and Staples.

The page never presents the data of the previous window as the data of the new one. The dates, and anything else that names the window, wait for the new data. A section can have nothing to show for the previous window. If so, the section shows its skeleton instead. So an empty state never speaks for a window that is still loading.

The matchups row of the deck page loads on its own, FR-11. It dims itself and marks itself busy. The selector and the status line follow the numbers of the deck.

### 4.9 Staples function

`GET /api/staples?window=30d&section=main`. The staples page reads it, FR-18. `window` is one of the five values in §3.3, and `section` is `main` or `side`. As with the matchup function, §4.4, the raw query string must be exactly `?window=` and a value, then `&section=` and a value, byte for byte. Anything else returns 400, so every variant shares one cache entry. The format is always Pauper, and the population is always `rated`.

1. Fetch the top 24 decks: `/Pauper/decks?window=…&population=rated&sort=share&dir=desc&pageSize=24`.
2. Fetch `/Pauper/decks/{slug}/cards?window=…&population=rated&section=…&pageSize=50&page=1` for each of the 24 decks, in parallel, §3.8.
   - If the table goes on, and the last card of a page is in at least 5% of the deck's lists, fetch the next page.
   - Fetch up to 4 pages for each deck. Fetch the pages of one deck one after another.
   - On 2026-10-20, 4 decks needed a second page for the main deck at 30d and at 7d. No deck needed one for the sideboard.
   - A card that a deck's pages cut off is under 5% of that deck's lists. This holds unless the deck reaches the 4-page cap. Then the decks behind a card, at 5% and up, are complete.
   - The share of a staple is short by under 5% of the part of the share that comes from each deck that cuts the card.
   - If a card is on two pages of one deck, count it once, with its first row. Endstep's data can change between two requests.
3. If the card table of a deck is withheld, leave out the deck. A withheld table is a 200 whose `withheld` is a plain object, not null and not an array, §3.8. A missing or null `withheld` counts the deck. If a table has no list of cards, the build fails with 502. Also leave out the basic lands: Plains, Island, Swamp, Mountain, Forest, Wastes and their snow-covered versions.
4. Across the counted decks, calculate two numbers for each card:
   - For the share, multiply the share of each deck by the card's `playRate.rate` in that deck. The share of the card is the sum of these products, divided by the total share of the counted decks.
   - The copies of the card are the weighted average of `averageCopies`. The weight of each deck is its share times the play rate of the card in that deck.
   - Leave out a card whose total weight is zero. Its share and copies have no value.
5. Keep the 50 cards with the largest share. Break ties by name.
6. Add the art of each card with `findArt`, the lookup that the proxy uses for the key card of a deck, §3.4 and §4.3. Use one Scryfall collection request for the 50 names, with the same matching, memory and fallback. The bound is 3 seconds, and the proxy's bound is one second. If Scryfall does not find a card, its `art` is null.

#### Response

```
{
  window: { from, to },
  section: "main" | "side",
  withheld: number,
  cards: [{ name, share, copies, art: { imageUrl } | null,
            decks: [{ slug, name, playRate, copies }] }]
}
```

- `window` holds `from` and `to` of `provenance.window` from step 1, unchanged. §6.7 applies when the page displays it.
- `withheld` counts the decks that step 3 leaves out.
- `decks` lists the decks that play the card in at least 5% of their lists. They are in order of play rate, highest first. `playRate` is the deck's `playRate.rate`, and `copies` is its `averageCopies`.
- We measured the response on 2026-10-20. For the main deck at 30d, it is about 29 KB uncompressed and 7 KB compressed. For the sideboard at 7d, it is 42 KB.

#### Behaviour

- One cold build costs one Endstep call for the deck list and one for each page. This is at most 97 calls: the deck list, and 4 pages for each of the 24 decks. A second request for a slow table, below, adds at most 24. So the limit is 121 calls. The build also sends one Scryfall request.
- On 2026-10-20 at 30d and 7d, a build cost 29 calls for the main deck and 25 for the sideboard. At 1d, the deck list ran past its 8 second timeout on every try that day. So 1d has no count.
- The deck list has the 8 second timeout of the proxy. Each card table request, one page, has 20 seconds. Endstep is slow on a table that it has not built yet.
- We measured cold builds on 2026-10-20, with an 8 second timeout on each table:
  - At 30d, 12 of the 24 main deck tables timed out. At 7d, 22 of 24 timed out. These first builds returned 502.
  - Builds a few minutes later found the tables in Endstep's cache. They took 1.9 to 2.8 seconds.
- A deadline of 50 seconds covers the deck list and the card tables. When it passes, the function aborts the open calls and returns 502 with `no-store`.
- If a card table request times out or fails with a network error, and the deadline leaves at least 20 seconds, the function sends that page request once more. Endstep keeps building a table after our request stops waiting, so the second request is usually fast. On a cold build, some tables also fail at once with a network error.
- Each deck's table gets at most one second request, for the page that failed. A second failure on that page is final.
- Only a timeout or a network error gets a second request. A 429 or a 5xx gets none. A call that the deadline or a 429 aborts gets none.
- Once any table has failed for good, no table gets a second request or asks for a further page. The build can then only return 502. Calls already open still finish, so a 429 among them still shows.
- Checks on 2026-10-20 showed the need. Cold builds at 7d and 14d still returned 502 after 20 to 22 seconds, and the next build found every table ready.
- On 2026-10-20 we measured a cold build of the main deck at season with the second requests, from a local dev server. It cost 48 calls. 21 of the 24 tables ran past their 20 second timeout. Each of their second requests answered 200, in 13.5 to 15.9 seconds. 3 other tables failed at once with a network error. That build gave a network error no second request, so it returned 502 after 39 seconds.
- After the Endstep calls, the art lookup has up to 3 seconds. The second requests stay inside the deadline. So the worst case is about 53 seconds. This is under the function's `maxDuration` of 60 seconds.
- A 429 on a card table aborts the other open requests. So no further page goes to Endstep, NFR-4.
- After a 500 or a final timeout, the other tables finish, so a 429 among them still shows. The function returns 429 if any call returned 429.
- We measured the collection request for 50 names at 2 seconds. With a one-second bound, it ran out of time in 3 of 4 builds. That is why the bound is 3 seconds.
- With the 3 second bound, a 30d main deck build took 1.8 seconds on 2026-10-20. Its collection request took 1 second and found art for all 50 cards.
- Card usage changes slowly. So the function holds a success for 30 minutes, with 30 more of stale-while-revalidate.
- If the art lookup fell back, the function holds the success for five minutes, with `public, s-maxage=300, stale-while-revalidate=600`. A rebuild costs up to 121 Endstep calls.
- The function holds a 429 for 60 seconds. Any other error gets `no-store`. These two rules are the same as in the matchup function.
- If any Endstep call fails, the whole request fails. A timeout or a network error that a second request recovers is not a failure. It returns 429 for an upstream 429, and 502 for any other failure. A failed art lookup never fails the request.
- The function uses the same method rules and CORS headers as the proxy, §4.3.

### 4.10 Sample cards function

`GET /api/sample-cards?deck={slug}&window=30d`. The deck page reads it for its sample list, FR-19. The query check works as in the matchup function, §4.4. The raw query string must be exactly `?deck=` and a slug, then `&window=` and one of the five windows, byte for byte. The proxy must accept the slug, §4.3. Anything else returns 400.

1. Fetch the deck detail through our own proxy, at the exact address that the deck page requests. The deck page's HTML function does the same, FR-15.
   - The two then share one edge cache entry, and Endstep sees one call for each deck and window.
   - On a protected preview deployment, the deployment refuses this fetch. So previews there show no card images and no cost. The project accepts this.
2. Take the distinct card names of `sampleList.main` and `sampleList.side`.
   - A withheld list has no names, and the function answers with no cards.
   - The six basic lands, Plains, Island, Swamp, Mountain, Forest and Wastes, are free. Do not price them.
   - Their snow-covered versions are real cards with a price. Price them.
3. Get the images with one Scryfall collection request for the names, at most 75.
   - Each card takes its `image_uris.normal`. A card with two faces takes the image of its front face.
   - The six basic lands are in this request for their image, but not in the searches.
   - The collection does not find a split card by its full name. On 2026-10-18, "Fire // Ice" came back not found, and "Fire" found the card.
   - So the request names a split card by its first half. The function matches the answer by the full name.
4. Get the prices from Scryfall searches for every printing of the names.
   - Each search uses `unique=prints`, `order=name`, and a query that joins `!"{name}"` terms with `or` in parentheses. The query ends with `(usd>0 or eur>0 or tix>0)`.
   - A printing with no price changes no lowest price. So the filter only saves pages.
   - Split the names so that each whole query, with the filter, stays under 1,000 characters.
   - Each search follows `next_page` while `has_more` is true.
   - For each card and each currency, `tix`, `eur` and `usd`, the price is the lowest across the printings that have one.
   - If a search answers 404 on its first page, it matched none of its names. Those names then have no price. This covers a name with no priced printing.
   - On 2026-10-18, six top lists needed one to three search pages each. The cheapest printing priced them about a quarter below the default printing on Scryfall. Affinity read 238 tix against 299.
5. In both steps, match a Scryfall card to a name as §3.4 does. Match by the full name of the card or by the name of any face, and ignore case. Endstep names a card with two faces by its front face, and Scryfall answers "Front // Back".
6. Keep the image and the prices of each card in memory for an hour, for as long as the instance lives. Ask Scryfall only for the names that the function did not see in that hour.
7. Pace the requests. Scryfall allows 2 requests a second on these endpoints.
   - Send the requests one after another, at least 500ms apart, and at most five for each call.
   - All the requests share a bound of 6 seconds. Keep what arrived by then.
   - The price of a name is complete in two cases: a printing of another name follows its printings, or the last page of its search arrived.
   - The faces of a card count as one name.
   - If the cap or the bound cuts a search off, the name at the cut and the names after it have no price. The edge then holds the response for five minutes.
   - The next call asks only for the names that are still missing. So each call makes progress.
   - If the image lookup for a card never ran, the card has no image.

#### Response

```
{
  cards: { [name]: { imageUrl, tix, eur, usd } }
}
```

- Each value is a number, or null if Scryfall had none. A basic land carries prices of 0.
- The page adds up the list that it shows, FR-19. So a cost always matches the list on the screen, even if this response is older than the deck detail.
- The response is about 4 KB for a list of 30 distinct cards.

#### Behaviour

- The edge holds a success for an hour, with a day of stale-while-revalidate, because Scryfall updates prices once a day.
- If any lookup failed or ran out of time, the edge holds the response for five minutes.
- If the deck detail answers 404, the function returns 404 with `no-store`.
- A 429 returns 429, and the edge holds it for 60 seconds.
- Any other failure returns 502 with `no-store`.
- The User-Agent and the other rules of the proxy's Scryfall requests apply, §4.3. The function uses the same method rules and CORS headers as the proxy.

---

## 5. Functional requirements

### FR-1. Window selector
Every page offers the five windows (`1d`, `7d`, `14d`, `30d`, `season`). The default is `30d`. When the reader changes the window, the page fetches and renders every section again. The page writes the selected window to the URL query string. The window carries over on links between pages, so the reader can link to a view and reload it.

### FR-2. Header summary
The summary shows the format, the resolved window dates, the total registrations and the total players. The dates run from `provenance.window.from` to the last day that the window covers. That day is `provenance.window.to` minus one. See §6.7. The summary states the population in use (`rated`). It names Endstep as the source of the data and links to the source page.

### FR-3. Deck grid
The grid shows the top 24 decks by share. Each deck is a card that shows these parts:

- The key card art of the archetype, from `art.imageUrl`. If it is missing, the card uses the image endpoint of Endstep for `art.cardName`, §3.4.
- The deck name.
- The colour identity, from the `colours` array, as WUBRG pips.
- The meta share, as a percentage.
- The number of players.
- The match win rate, as a percentage.
- The three key cards, from `keyCards`.

Each card links to its deck page, FR-11.

The grid and the table are two views of the same decks, FR-4. The grid is the default.

### FR-4. Deck table
The table shows the same 24 decks in rows. Its columns are rank, name, colours, share, players, matches, win rate and share change. The reader can sort the columns in the browser. The page keeps the sort in the address, so Back and reload restore it, §4.5. Numbers use a consistent precision. Share and win rate show one decimal place. Counts show as integers with thousands separators. If a share is above zero but below the shown precision, it reads as "<0.1%" in the table and "<0.01%" on the cards. It never reads as zero.

The overview shows the table or the grid, one at a time. A second segmented control, named View, sits beside the window selector. It has two options, Cards and Table. Cards is the default and leaves `view` out of the address. Table writes `?view=table`, and Cards removes it, §4.5. While the decks load, the page shows only the skeleton of the chosen view.

The sort applies only to the table. While the cards show, the sort stays in the address, so the table comes back in the same order. The cards keep share order. Each deck name links to its deck page, FR-11.

### FR-5. Share over time
This section is a line chart of daily meta share, with several series. It uses the default of the API, the top 8 series. The x-axis covers the full date range of the window.

A click on a deck in the legend highlights that deck. Its line draws at 3px, on top of the other lines. The other lines, their end dots and their end labels fade. They fade to 25% opacity in the light theme and to 35% in the dark theme. Thus no series fades further in the dark theme. A second click clears the highlight. A click on another deck moves the highlight to that deck. Only one deck at a time has the highlight. Each legend entry is a toggle button with `aria-pressed`. The page keeps the slug of the highlighted deck in `highlight`, §4.5. If that slug is not in the chart, the chart shows no highlight. Nothing hides a line. On 2026-10-17 the highlight replaced hiding, and the `hide` parameter is gone.

Days before 2026-09-05 return `rate: null`. Render these days as a gap, not as zero. See §6.2.

### FR-6. Share composition
This section is a ranked horizontal bar chart. It shows the top 24 decks and an `Other` bar, sorted by share. Each bar has a label with its value. See §6.1 for how the chart derives `Other` and its label.

This chart is not a pie. Twenty-five categories exceed the limit of eight hues in a categorical palette. Also, nobody can read a pie with 25 slices at any size. Bars show size by their length, so they use one hue, sequential blue. The `Other` bar uses `--text-400`. This colour marks the bar as a remainder, not a deck.

A click on the bar of a deck, or on its name, opens its deck page, FR-11. The link keeps the selected window, as every deck link does, FR-10. `Other` is not a deck, so it opens nothing. If the pointer is on the row of a deck, its name gets an underline, in `--text-900`. Its bar fills with `--seq-600`, one step darker. So the row reads as a link. `Other` does not react. The deck grid and the deck table stay the keyboard path to the same pages, NFR-6.

### FR-7. Win rate against share
This section is a scatter plot. Meta share is on the x-axis, and match win rate is on the y-axis. The size of a marker is proportional to the player count. A reference line at 50% win rate separates the decks above the field from the decks below it. This is the main view for analysis on the page. It shows which decks are good and which are only popular.

All markers use one hue. A scatter plot invites a comparison between any two points. For a comparison of all pairs, only three hues stay separable. So a different colour for each of the 24 decks is not available. The reader identifies a deck by its position, by the labels on selected decks, and by hover.

A click on a marker or its label opens its deck page, FR-11. The link keeps the selected window, as every deck link does, FR-10. The tooltip says so. On a touch screen, the first tap on a marker shows its tooltip. A second tap on the same marker opens the page. So the tooltip still identifies the markers without a label. If the pointer is on a marker, the marker fills with `--seq-600` at full opacity. If the marker has a label, the label gets an underline and stays in `--text-900`. A marker that a first tap armed looks the same. A mouse or pen that moves over the chart disarms the marker. The deck grid and the deck table stay the keyboard path to the same pages, NFR-6.

### FR-8. Share change
If `shareChange.points` is present, the grid and the table show the movement against the previous window, with its direction. If it is `null`, the UI states that no comparison is available. It must not show a zero or a blank. See §6.3.

### FR-9. Loading, error and empty states
Every section with data has its own loading state. If a fetch fails, the section shows a readable error and a retry control. The section reports HTTP 429 as a rate limit, not as a generic failure. If a window returns no decks, the section shows an empty state, not a broken chart. These rules apply on every page.

### FR-10. Navigation
Every page has a header with links to the overview, the matchup table, What to play?, FR-17, and Staples, FR-18. If the links do not fit, they wrap onto a second line at their own size. `aria-current` marks the current page. Every page carries the attribution that NFR-5 requires.

The header names the site, "Pauper Endstep metagame", beside the site mark from the design system. The name and the mark are one link to the overview. The mark is decorative, so the name of the link is the name of the site. It is not a heading. Every page opens with its main heading, which names the page. The headings are "Overview", "Matchups", "What to play?", "Staples", or the name of the deck on a deck page. The document title repeats the heading, for example "Overview · Pauper Endstep metagame". When focus moves to the heading, the heading thus names the page, §4.5.

Deck names link to `/decks/{slug}` in every place that lists a deck:

- The grid cards.
- The table rows.
- The matrix headers.
- The decks in the ranked bars and in the scatter plot, FR-6 and FR-7.
- Every deck on What to play?, FR-17.
- Every deck behind a staple, FR-18.

The links keep the current `?window=`.

### FR-11. Deck page
The deck page makes three calls:

- `/{format}/decks/{slug}` feeds every section except the matchups row. See §3.6.
- `/api/matchups` feeds the matchups row, §4.4.
- When the sample list is known, `/api/sample-cards` adds the previews and the cost of the list, FR-19 and §4.10.

#### Header and stat tiles

The header shows the deck name, the colour pips, the key card art and the three key cards. It also has the window selector and the resolved window dates (§6.7). A link opens the same deck on endstep.cc, in a new tab.

The stat tiles show meta share, players, matches, match win rate with its range, and share change under the rules of FR-8.

#### Share over time

The chart has one line, from `shareSeries.points`. Days with `rate: null` are a gap, as in FR-5. Under the chart, a collapsed details element, "Daily share, day by day", lists the same days and shares. It is a description list. On wider screens, its pairs flow into columns. So the chart is not the only carrier of the data, NFR-6.

#### Games

This section is a table from `gameResults`. The rows are game 1, game 2, game 3 and all games. The columns are on the play, on the draw and total. Each cell shows a game win rate. On hover and on keyboard focus, the cell also shows its range and its decided count. A note under the table gives `unknownPositionGames`. If `gameResults` is null, the table shows the unavailable state. The page does not use `games`, §3.6.

#### Toss and texture

The toss section shows the win rate after a won toss and after a lost toss, from `playDraw.tossWon` and `tossLost`. It also shows how often players chose to draw, from `choseToDraw`. The toss blocks count only game 1, open item 5. So the section says game 1 win rate.

The texture section shows the average turns, the average opening hand and the mulligan rate.

#### Sample list

The sample list comes from `sampleList`, in the same response. It is the most common exact list that players registered for the deck. It is not a recommended list.

- The main deck and the sideboard show as two lists, each with its card count. Each card shows its count and its name. The cards sort by count and then by name.
- One line says where the list comes from. It gives the number of players that brought it, and how close it is to the average list of the deck. It also gives the number of distinct lists that it was the most common of.
- A copy control puts the list on the clipboard as plain text. The text has one `count name` line for each card, and a blank line before the sideboard. MTGO imports this format. If the clipboard is refused or missing, the control says so. Then it shows the same text, selected, ready for the reader to copy with the keyboard.
- `mainOnly` shows the main deck. A note replaces the sideboard. The note says that fewer than `minPlayers` players, 3 today, brought this exact 75. The control copies only the main deck.
- If `side` is empty, the list leaves out the sideboard heading and the blank line before it.
- `withheld` shows no list and no control. A note gives the reason. Either no main deck was brought by `minPlayers` or more players, or nobody registered a list in this window. The page never shows an empty list.
- Each card shows its image on hover or tap. The cost to build shows after the lists, FR-19.

#### Matchups against the top 24

This section shows the row of the deck in the matchup table, from `/api/matchups`.

- The row has the other 23 decks of the top 24, in share order. It leaves out the deck itself. FR-12 defines the rotated names, the cells, the colour rule, the gated and no-data states, the legend and the detail.
- The row spans the page width below the numbers and the sample list. If the screen is narrower than the row, about 870px, the row scrolls sideways. The name of the deck stays in view. The page itself does not scroll sideways, NFR-7.
- The row is one tab stop, and arrow keys move between cells, as in FR-12.
- The section loads and fails on its own. If the request fails, the error panel shows inside this section, and the rest of the page stays. As in FR-12, there is no automatic retry.
- The page finds its row by `deck.id` from the deck detail. It matches that id against `decks[].id` in the response. It never uses the slug in the address. So a stale slug still finds its row.
- Under the legend, a link reads "See {name} in the full table". It opens the matchup table with this deck in the spotlight. The link keeps `?window=` and adds `?deck=`, FR-12.
- If the deck is not in the top 24 for the selected window, the section says so in place of the row. It links to the matchup table, without `?deck=`. The note takes the name of the deck from the deck detail.
- The two responses are cached apart, so near the daily rollover they can cover different windows. If the window of the row differs from the window of the deck detail, the section prints the dates of the row.

#### Game figures and page states

The figures in the games and toss sections count games, not matches. Label them game win rate, never match win rate. §6.6 covers the figures at match level.

A gated block shows as too few to call, never as a zero or a blank. See §6.8.

If a deck has no matches in the selected window, the page shows the empty state from FR-9. The window selector stays, so the reader can widen the window.

If the slug is unknown, the page shows a not-found state with a link to the overview. That state covers a 404 from Endstep and a 400 from the proxy for a slug that it rejects. Neither offers a retry. A stale slug resolves to the current deck. The page then replaces the URL with `deck.slug` through the router, so back and forward stay correct. The data is keyed by slug, so the replacement costs one more fetch. Stale links are rare, so this cost is accepted. See §6.11.

### FR-12. Matchup table
This page has one table. The table shows the top 24 decks by share, against each other. The page makes one call to `/api/matchups`, §4.4. The Matchup table section of the design system is the visual specification.

A line under the heading reads "How the top 24 decks do against each other.", as on Staples, FR-18.

- The rows and the columns are the same 24 decks in share order. A cell is the match win rate of the row deck against the column deck, as a whole percentage. The table reads by row.
- The row headers are the deck names. The column headers are the same names in full, rotated. Neither carries a rank number.
- The table colours only clear results. A clear pair has at least one range, and every range present for it excludes 50%. Both cells of a clear pair get the colour for their side of 50%. If the row deck is favoured, the cell is one shade of blue. If it is not, the cell is one shade of red. There is no intensity scale, because the number already carries the size. Every other cell stays neutral and still shows its number. Clear cells also use a heavier weight, so colour is never the only cue. On 2026-10-03 at 30d, 96 pairs qualified, which is 192 cells. See §6.10.
- A gated cell shows no number. It reads as too few to call. On hover, it shows the decided count against the 20 required. See §6.8.
- A pair with no entry reads as no data. The diagonal is the mirror. It is muted and labelled for assistive technology.
- On hover or keyboard focus, a cell shows both deck names, the match win rate to one decimal place, the range, wins, losses and matches.
- The table is one tab stop. Arrow keys move between cells. They follow the ARIA grid pattern, with a roving `tabindex`. 576 cells must not mean 576 tab stops.
- The page does not retry `/api/matchups` on its own. A failed build already cost up to 25 upstream calls. The retry control is the only retry.
- A legend states the colour rule in words.
- The row and column headers link to the deck pages, FR-10.
- Each deck page shows its own row of this table, FR-11.
- The table sits in a full-width band that breaks out of the page column. The band is centred, with no fixed height and no scrollbar. While the page scrolls past the table, the header row stays at the top of the screen.
- The cells grow with the screen, from 32px wide up to 44px. The numbers and the deck names grow with them. The design system gives the rule.
- If the screen is narrower than the table and the padding of the band, about 1,080px, the band scrolls sideways. The first column stays in view. The page itself does not scroll sideways, NFR-7. A box that scrolls sideways also holds its sticky header. So below 1,100px, the header row scrolls away with the table.
- The page has the window selector, the resolved window dates and a deck picker.

#### A deck in the spotlight

`?deck=` names one deck by its slug. Every cell outside its row and its column fades, so the deck reads at a glance against the field.

- The picker is a native select named Deck. It lists "All decks", then the 24 decks in share order. "All decks" is the default. It means no spotlight, and no `deck` in the address. If the reader chooses a deck, the page writes its slug. If the reader chooses "All decks", the page removes the slug, §4.5.
- The other cells fade to a quarter of their opacity. Their numbers fall below WCAG AA. NFR-6 accepts this for this case only. While a faded cell has the pointer or keyboard focus, it returns to full opacity. So its focus indicator keeps its contrast. The detail works on every cell.
- The row header and the column header of the deck turn `--primary` on a `--primary-wash` band. So the spotlight does not rest on the fade alone.
- If a link opens the page with a deck, the page scrolls to the deck, not to the top. A choice of a deck in the picker does the same. Back and forward keep the scroll position that the browser restores, §4.5. Focus stays where §4.5 puts it.
  - From 1,100px, the header row is sticky. The row of the deck scrolls into view just under it. The tab stop of the table moves to the row header of the deck.
  - From 640px to 1,099px, the header row is not sticky. The page scrolls the top of the table into view, so the column names stay on the screen. The band scrolls sideways to bring the column of the deck beside the first column. The tab stop moves to the column header of the deck, which is on the screen. The row of the deck can sit below the screen, marked by its band.
  - Below 640px, the page shows the one-deck list, which opens on the deck. The page has nothing to scroll to.
- The page matches the deck by the 8-character suffix of its slug. So a slug under an old name still finds the deck, §6.11.
- A window change keeps `deck` in the address. If the deck is not in the top 24 of the new window, the table shows no spotlight. The picker shows the deck as an extra first option, "{name} (not in the top 24)". So any choice replaces it, "All decks" included. A line above the table reads "{name} isn't in the top 24 for the selected time window." If the reader selects a window where the deck is in the top 24, the spotlight comes back. The name comes from the deck detail, §3.6. The page requests the deck detail only in this case. Until it arrives, or if the request fails, the line names "This deck".
- The row on the deck page links here, with its deck named, FR-11.

#### On a phone

Below 640px, the page shows the row of one deck as a list, in place of the table.

- The picker lists the 24 decks, without "All decks". If the address has no deck, the picker shows the top deck by share, and `deck` stays out of the address. If the reader chooses a deck, the page writes its slug, as on the desktop. So a link opens the same deck at either width.
- Each of the other 23 decks is one line, in share order. The line shows the name of the opponent, which links to its deck page, and its matches under the name. It also shows the verdict in words, and the cell. The verdicts are favoured, unfavoured, within chance, too few to call and no data. They say what the colour means, so the list has no legend.
- The cells, the colour rule and the gated and no-data states are the same as in the table.
- If the deck in the address is not in the top 24 of the window, the picker shows it as on the desktop. The list shows the top deck under a line that reads "{name} isn't in the top 24 for the selected time window. The table shows {top deck} by default."
### FR-13. Theme
Every page has a light theme and a dark theme. The design system specifies both palettes, NFR-1a.

- On a first visit, the page follows the setting of the device, `prefers-color-scheme`. If the device has no setting, the page uses the light theme. Until the reader chooses, the page also follows a change to the device setting while the page is open. The toggle and the charts also follow that change.
- A 36px round button at the top right of the site header switches between the two themes. The language switch sits before it, FR-20. It is on every page and at every width. It is a toggle button named Dark theme, with `aria-pressed`. Its icon shows the current theme, a sun or a moon, so the icon agrees with `aria-pressed`.
- Below 1,100px, the language switch and the button share the first row with the site name, and the links take the second row. On a 360px phone, the name then takes three lines. From 1,100px, they share one row. If the three links share one row at 640px, the name wraps to three lines. If the name runs out of room, it wraps onto more lines, and the button stays at the top right.
- The page keeps the choice of the reader in local storage. From then on, the choice wins over the device setting. The choice is not in the address, §4.5.
- The page applies the theme before its first paint, so a dark page never flashes light.
- A switch recolours the charts at once, with no reload. Native controls and scrollbars follow the theme through `color-scheme`.
- Card art and colour pips look the same in both themes. They are the cards' own colours.

### FR-14. Deck search
The overview finds any deck in the window, by its name or by a card in its lists. It uses `/decks` with `q`, §3.3. The Deck search section of the design system is the visual specification.

- A search field sits directly above the decks, after the summary. Its placeholder and its visually hidden label read "Search decks or cards". When the field has text, a clear button named "Clear the search" appears. Escape also clears the field. After a clear, focus stays in the field.
- The search runs 300ms after the last keystroke, from 2 characters. Before the page sends the term and writes it to the address, it trims the term, collapses its inner spaces and lowercases its letters. So the variants of a term share one cache entry. One character searches nothing and shows the top 24.
- The results take the place of the top 24 in the chosen view, cards or table, FR-3 and FR-4, in share order. The field, a result line and the decks stand 14px apart. The line reads "{n} decks match "{q}". Search covers deck names and every card in their lists.", or "1 deck matches". The status line of the page announces the line.
- Results come 24 at a time. While more results remain, a button loads the next page: "Show 24 more", or "Show {n} more" for fewer. If a next page fails, the page shows "The next decks could not be loaded." with the reason, and the button stays as the retry. Paging stops on an empty page, an NFR-4 guard. If paging stops before the count, the page shows and announces the line "Endstep returned {n} of the {total} decks it counted." Focus then moves to the last result card.
- Results reach the long tail, §6.4. Their cards and rows follow the same rules as the cards and rows of the top 24. A win rate under 20 decided matches reads as too few to call, §6.8. A share below the shown precision reads as FR-4 sets out.
- In the table, the sort applies to the results that the page loaded so far. "Show more" adds the next page in share order, and then the table sorts again. The rank column gives the place of each result by share among the results.
- If a search has no match, the page shows the empty panel, "No deck or card matches "{q}"". The panel has a "Clear the search" button that returns focus to the field.
- The page keeps the query in `q`, §4.5. A change replaces the history entry. A link carries only `?window=`, so it opens the overview with no search.
- The summary and the charts stay on the top 24.
- A window change keeps the query and searches the new window, under the loading rules of §4.8.
- Every result links to its deck page, FR-10. The deck page works for a deck outside the top 24.

### FR-15. Page metadata and link previews
Every page carries the data that browsers, search engines and chat apps read without running the script.

- `index.html` has a description, "Which Pauper decks are played, how they perform, and how they do against each other." It also has Open Graph tags, a `summary_large_image` Twitter card, the icon set, FR-16, and `theme-color` for each theme. The theme toggle updates `theme-color` with the theme, FR-13. `robots.txt` allows every page. `index.html` carries no canonical link and no `og:url`, because it is also the template of the deck pages and of the three copies.
- The overview shares the site card. The site card has the name of the site, the description, and a 1200 by 630 image with the site mark, from the design system.
- The matchup table, What to play? and Staples each share their own title, description and page card. A page card is a 1200 by 630 image in the layout of the site card, with the name of its page, from the design system.

  | Page | Title | Description |
  |---|---|---|
  | Matchups | Matchups · Pauper Endstep metagame | How the top 24 Pauper decks do against each other. |
  | What to play? | What to play? · Pauper Endstep metagame | The Pauper deck that does the best against the metagame you expect. |
  | Staples | Staples · Pauper Endstep metagame | The cards the top 24 Pauper decks play most. |

  - The titles repeat the document titles of FR-10.
  - The line under the heading of each page repeats its description without the word "Pauper", FR-12, FR-17 and FR-18. A spec checks the English line against the description.
  - The `og:image` of each page names its card in `public/`, such as `https://pauper-endstep-metagame.vercel.app/staples-card.png`.
  - The `og:title` and `og:description` repeat the title and the description.
  - The canonical link and `og:url` of each page are its full address with no query string, such as `https://pauper-endstep-metagame.vercel.app/staples`. So every window of a page counts as one page.
  - The build writes these values into the copies of `index.html`, §4.7.
  - One list in `server/head.ts` holds the path, the title, the description and the card of each page. The plugin reads it, and a spec checks the built files against it.
  - A spec checks each title against the English heading of its page. So the preview and the page do not drift apart.
  - These words stay in English, FR-20.
- The app keeps the canonical link and `og:url` in step with the page on the screen:
  - The HTML sets them for the first page only. Without this rule, they still name that page after the reader moves on. Chrome on Android then shares the wrong page.
  - So on each route change, the app sets both to the full address of the new path, with no query string and no trailing slash, §4.5. If the HTML has none, the app adds them.
  - A deck page names the deck's own slug once the deck has loaded, as the deck page's function does. So an old slug in the address does not become the canonical link.
  - The full address starts with the production origin, `SITE_ORIGIN` in `src/config.ts`. A spec checks that it equals the origin in `server/head.ts`.
  - On a Not found page, the app removes both. So does a deck page whose slug Endstep does not know. A path that does not exist must not name itself as a page.
  - This covers the deck pages and the overview too.
  - The app does not change the description or the `og:` words. Chat apps and search engines read them from the HTML, not from the running app.
- A deck page shares its own preview:
  - Its title reads "{deck} · Pauper Endstep metagame".
  - Its description reads "{share} of the Pauper field {period}, {win rate} match win rate, {players} players." Here, {period} follows the window of the link: "over the last day", "over the last 7 days", "over the last 14 days", "over the last 30 days" or "this season". The default is 30 days.
  - The win rate reads as too few to call whenever the deck page calls it so, §6.8. This happens in four cases: a gate, fewer than 20 decided matches, a null rate, or a null low or high. The description then reads "{share} of the Pauper field {period}, match win rate too few to call, {players} players."
  - Its image is the art crop of the deck, `art.imageUrl` from the deck detail. If that is missing, the image is Endstep's image endpoint with `version=art_crop`, §3.4.
  - Its canonical link and `og:url` are `/decks/{slug}`, with no query string, so every window of one deck counts as one page.
- A server function, §4.2, writes these values into `index.html` for `/decks/:slug`:
  - It reads `index.html` from the files deployed with it, never over HTTP, so a protected preview deployment does not break it.
  - It accepts only a slug that the proxy accepts, §4.3, and only a known window. For anything else, it returns the page with the site card.
  - It fetches the deck detail through our own proxy, at the exact address that the deck page requests: `/api/metagame/Pauper/decks/{slug}` with the window and the population. The later request of the browser then hits the same edge cache entry. So the upstream calls stay at one for each deck and window.
  - It escapes every value that it writes into the HTML. It URL-encodes the card name in the image address.
  - If the call fails, or takes longer than two seconds, it returns the page with the site card. So a reader never waits long for it. Two seconds leave room for the proxy's own one-second art lookup.
  - It sends that fallback with `no-store`, so the edge never caches a slow moment.
  - If the art of the deck resolved, the edge caches a preview for five minutes. If the art did not resolve, the edge caches it for one minute. This covers the fallback of the art lookup and a card that Scryfall does not find.
  - The function sets that header itself. Vercel's edge strips `s-maxage` from the responses that it serves, the responses of the proxy included. If the function copies the header of the inner response, the edge does not cache the preview.
- The page then loads as before. The function changes nothing that a reader sees.

### FR-16. Installable app
The site installs as an app on phones and desktops. The reader installs it from the install prompt of the browser or from "Add to Home Screen".

- A web app manifest names the app "Pauper Endstep metagame". It gives a short name from the design system for the home screen. It opens `/` in standalone mode. It carries the icons at 192px and 512px, with a maskable 512px version.
- The icon set comes from the site mark of the design system. It has these icons:
  - An SVG favicon.
  - A 32px ICO for older browsers.
  - A 180px Apple touch icon.
  - The app icons.
- The site has no service worker and no offline caching. The installed app needs the network, as the site does, and always shows current data.

### FR-17. What to play?
This page answers a question that a player has before a league or a tournament: which deck to play. It ranks the top 24 by their expected match win rate against the metagame that the reader expects. It names the best deck. It makes one call to `/api/matchups`, §4.4. This is the same call that the matchup table makes, so the two pages share one edge cache entry. The page asks nothing new of Endstep, NFR-4. The What to play? section of the design system is the visual specification.

The page lives at `/what-to-play`. Its heading and the header link read "What to play?". The document title reads "What to play? · Pauper Endstep metagame", FR-10. A line under the heading reads "The deck that does the best against the metagame you expect.", as on Staples, FR-18. The page has the window selector and the resolved dates of the window, as the matchup table does. Its words are short and plain, for readers whose first language is not English.

#### The expected match win rate

- The metagame is the share of each top-24 deck from the matchup response, plus the changes of the reader, below. A share never goes below zero. If the changes leave every share at zero, the page ignores all of them and uses the window's own metagame.
- The expected match win rate of a deck is a weighted sum over the 24 decks. Each term is the deck's match win rate against one opponent, times a weight. The weight is the share of that opponent divided by the total share of the 24. The mirror, a gated pair, §6.8, and a pair with no entry each count as 50%.
- The range of the expected rate comes from the ranges of the cells:
  - Each cell gives a standard error of (`high` − `low`) / 3.92.
  - The range of the expected rate is 1.96 times the square root of the sum of (weight × standard error)².
  - A gated pair or a pair with no entry adds an error of 0.25. This is the error of a rate that can be anywhere from 0% to 100%.
  - The mirror adds no error.
  - This treats the 23 pairs as independent. That is close enough, because each pair is its own set of matches.
- If the whole range of a rate is above 50%, the rate is clearly above 50%. If the whole range is below, the rate is clearly below. Otherwise, the rate is too close to call.
- Rates show to one decimal place.
- The page leaves out the decks outside the top 24, about a quarter of registrations. The matchup table has no data for them, §4.4. The page says that it leaves them out. So the expected rates are a little below the own match win rate of each deck. The gap was about two points at 30d on 2026-10-18. The cause is that the top 24 beat the long tail.

#### The pick

A panel under the window selector gives the answer first.

- The panel reads "Our pick", then "Play {deck}!". The deck is a link to its page.
- If other decks are too close to tell apart from the best deck, the pick names them too. It names up to three decks in rate order: "Play {a} or {b}!", or "Play {a}, {b} or {c}!".
- If the top of the range of a deck is above the bottom of the range of the best deck, that deck is too close. The pick takes such decks in rate order from second place. It stops at the first deck that is not too close.
- One sentence follows. For one deck: "{deck} wins {rate} of its matches against the metagame you expect." For several decks: "They win the most matches against the metagame you expect: {rate}, {rate} and {rate}. The gap between them is too small to call." If more than three decks are too close, the sentence ends ", and 1 more deck is just as close." or ", and {n} more decks are just as close."
- A last line gives the basis. With no changes, it reads "Based on {period}. Change the metagame to match what you expect." Here, {period} is "the last day", "the last 7 days", "the last 14 days", "the last 30 days" or "this season", as the window says. With changes, it reads "Based on the metagame you set." It also reads so while another window loads, because it names no window.
- Only the title is a polite live region. So a screen reader hears a new pick, not every changed rate.

#### The ranking

A panel named "Expected match win rate" holds the ranking.

- The panel lists the 24 decks by expected rate, highest first. Ties go in share order. Each line holds the place, the deck as a link, its range bar, the rate and its movement.
- A note beside the title reads "Metagame of {period}", with the same {period} as the basis line. With changes, it reads "The metagame you set". That note also shows while another window loads.
- The range bar draws the range on a scale that the 24 lines share. It has a line at 50% and a tick at the rate.
- If the rate is clearly above 50%, the bar is blue. If the rate is clearly below, the bar is red. If the rate is too close to call, the bar is neutral. These are the colours of the matchup table, FR-12. A legend says the rule in words.
- The scale runs from the lowest end of the ranges to the highest end, rounded out to 5 points. It always holds 50%, and it is always at least 5 points wide.
- Movement is the number of places that a deck rose or fell against the window's own metagame with no changes: "↑2" or "↓1". A deck that did not move shows nothing. Assistive technology hears "up 2" or "down 1".
- Assistive technology reads each line as the place, the deck, the rate, "likely between {low} and {high}", and the movement.
- Below 640px, the bar takes its own row under the deck and the rate.

#### The metagame you expect

In this panel, the reader changes the metagame.

- A note reads "How often you expect to meet each deck. Each step is one point."
- The panel lists the 24 decks in the share order of the window. A change does not reorder them.
- Each line holds the name of the deck and a stepper. The stepper has a button named "Less {deck}", the share to one decimal place, and a button named "More {deck}".
- The share describes both buttons, so a screen reader reads the share with the name of the button. A press moves the share by one point, and focus stays on the button. If the share is above zero but rounds to 0.0%, it reads "<0.1%".
- "Less" cannot act at 0.0%, or on the last deck above zero, so the metagame is never empty. "More" cannot act once the change is 100 points, the most that the address holds.
- A button that cannot act carries `aria-disabled` and ignores presses. It does not use `disabled`, so the focus of a reader who uses a keyboard stays on it.
- A changed deck shows "was {share}" after its name.
- Reset appears after the reader changes anything. It returns every share and removes `meta` from the address. Reset then goes away, so a press moves focus to the title of the panel.
- A line under the list reads "The top 24 hold {share} of registrations. The other {share} are left out of the sum." It sums the window's own shares, not the changed shares. It names the number of decks that the window has, which can be fewer than 24. The other share is 100% less the share of the top as shown, so the two add up to 100.0%.
- From 1,100px, the ranking and the metagame stand side by side. Below 1,100px, they stack, with the metagame first. The metagame is then folded into its heading, with "Change" to open it and "Close" to fold it.
- The toggle is a button with `aria-expanded`. The list stays in the page and is hidden while folded, so the toggle's `aria-controls` always names it.
- The panel starts folded, so the ranking is one tap away, not 24 lines down. When the screen width crosses 1,100px, the panel keeps the choice of the reader.
- A width check at 1,100px in script picks the layout. In the same way, the check at 640px of the matchup table picks its phone list, FR-12.
- The page renders the two panels in the order they appear, so the reading order and the focus order match the screen.

#### In the address

The changes are view state, §4.5, so a copied address shares them.

- `meta` lists only the changed decks, as `{slug}:{change}`, joined by commas, in share order.
- The change is a whole number of points. If the change lowers the share, it has a minus sign. If it raises the share, it has no sign. The page does not use a sign to raise, because a `+` in a typed address reads as a space. For example: `meta=affinity-e93f5f74:-4,elves-262fdcbd:3`.
- The page writes `meta` itself, so its colons and commas stay readable. `URLSearchParams` writes `%3A` and `%2C` instead. The page reads both forms. A window change keeps them readable too. So does the window that the app adds to an address that has none, §4.5.
- The page matches decks by the 8-character suffix of their slug, §6.11.
- In these cases, the page ignores an entry and still opens:
  - The entry cannot be read.
  - It has a change of zero or outside −100 to 100.
  - It names a deck outside the top 24 of the window.
  - It repeats a deck that the page already read.
- A change that lowers a share past zero counts as the smallest change that reaches zero, the share rounded up. So one press of "More" always moves the share off 0.0%. The next write puts the counted change in the address.
- A change replaces the history entry. If nothing changed, the address leaves `meta` out.
- A window change keeps `meta` and applies it to the shares of the new window. The page ignores an entry for a deck outside the new top 24. That entry stays in the address until the next change of the reader. That change writes the address again from the changes that apply.
- The header's link to the page carries only `?window=`, so it opens the window's own metagame.

#### Beat a deck

This panel is for a reader who expects to meet one deck often.

- A deck picker lists the 24 decks in share order. It is the native select of the matchup table, named Deck. The default is the top deck by share.
- The page keeps a choice in `beat` as the slug of the deck, and matches it by its suffix. It keeps a choice of the top deck too, so a copied address keeps its deck after the top deck changes. Only a page where the reader chose nothing leaves `beat` out.
- If `beat` names no top-24 deck, the picker falls back to the default. The value stays in the address until the next choice.
- A window change keeps `beat`. If the deck is not in the top 24 of the new window, the panel shows the top deck. A window where the deck is in the top 24 brings it back.
- One sentence reads "These decks clearly beat {deck}." If one deck qualifies, it reads "This deck clearly beats {deck}."
- A table lists the decks whose pair with the chosen deck is clear, by the rule of FR-12, and in their favour. It sorts them by their rate against the chosen deck, highest first. Its columns are these:
  - The deck, as a link.
  - Its rate against the chosen deck, with the range bar of that pair from 640px.
  - Its expected rate against the metagame.
- If no deck qualifies, the sentence reads "No deck in the top {n} clearly beats {deck} in this window." and the page shows no table. {n} is the number of decks in the table of the window, at most 24.

#### How the numbers are made

A last panel has four short paragraphs. The design system gives their words. The paragraphs say these things:

- How the page counts the rate.
- What the bars mean.
- How the page chooses the pick.
- Why the page leaves out the decks outside the top 24.

#### States

The states follow the matchup table, FR-12:

- While the page loads, each panel shows one skeleton.
- If loading fails, the page shows the error panel with its retry.
- The page does not retry on its own, because one cold build costs 25 upstream calls.
- While the next window loads, the page dims the previous window, §4.8.

The page shares its own title and description, with the site card, FR-15.

### FR-18. Staples
This page shows the cards that the top 24 decks play most, weighted by the share of each deck. It makes one call to `/api/staples`, §4.9. The Staples section of the design system is the visual specification.

The page lives at `/staples`. Its heading and the header link read "Staples". The document title reads "Staples · Pauper Endstep metagame", FR-10. A line under the heading reads "The cards the top 24 decks play most." The page has the window selector and the resolved dates of the window, as the matchup table does.

#### The list

A panel named "Most played cards" holds the list.

- A switch with two options, "Main deck" and "Sideboard", chooses the list. Main deck is the default. The page keeps the choice in `section`, as `side` for the sideboard. The default leaves it out, §4.5.
- One sentence under the title reads "The percentage is the share of the top 24's decks that play the card."
- The cards come in the order that `/api/staples` returns them, by share. The list shows 30. Then a button, "Show 20 more", shows the rest, up to 50. The button goes away once the list shows all the cards. A window change, or a switch to the other list, shows 30 again.
  - If fewer than 20 cards remain, the button reads "Show {n} more".
  - After a press of the button, focus moves to the first new card. So a reader with a keyboard keeps their place.
  - While the next window loads, the page hides the button on the dimmed list. If more cards remain, the button comes back with the new cards.
- Each line holds these parts:
  - The place.
  - The art of the card.
  - Its name.
  - Where it is core.
  - A bar for its share.
  - The share, to one decimal place.
  - Its average copies, to one decimal place: "3.9 copies".
- The art is the art crop of the card, `art.imageUrl`. If that is missing, the art is Endstep's image endpoint with `version=art_crop`, §3.4. The art is decorative, with an empty `alt`, because the name is beside it. It is 120 by 88px, and 96 by 70px below 640px.
- "Core in" names the decks where at least half the lists play the card, ordered by that share. It reads "Core in {a}", "Core in {a} and {b}", or "Core in {a}, {b} and {c}". For more than three decks, it reads "Core in {a}, {b} and {n} more". A card that is core nowhere reads "Not core in any deck".
- The bar uses the blue of the share chart. It scales to the share of the top card, so the bar of the first card is full. The bar shows from 640px. Below 640px, the share and the copies sit under the name.

#### The decks behind a card

The name of the card is a button. It opens the decks that play the card, under the line of the card.

- The button carries `aria-expanded`, and `aria-controls` names its panel. The panel is always in the page, and it is hidden while closed. When the panel is open, a chevron turns. Several cards can be open at once.
- The address does not hold which cards are open. A window change or a switch closes them.
- The panel reads "Played in {n} of the top 24". Then it has one line for each deck that plays the card in at least 5% of its lists, ordered by that share. Each line holds these parts:
  - The deck, as a link to its page.
  - A bar for the share, from 640px.
  - The share, as a whole percentage.
  - The average copies of the deck.
- One sentence closes the panel: "The share of each deck's lists that play it."
- If no deck plays the card in at least 5% of its lists, the panel holds only one sentence: "No deck plays it in 5% of its lists or more."
- The panel leaves out the decks below 5%. Those are a few unusual lists, not the choice of the deck itself.

#### States

The states follow the matchup table, FR-12:

- While the page loads, it shows a skeleton.
- If loading fails, the page shows the error panel with its retry.
- The page does not retry on its own, because one cold build costs up to 121 upstream calls.
- While the next window loads, the page dims the previous window, §4.8.
- A switch to the other list shows the skeleton until that list arrives. The cards on the screen belong to the other list, and they must not stand under its name.
- If Endstep withholds the card table of a deck, §3.6, the page leaves that deck out. A line under the list then reads "1 deck is left out because Endstep withholds its cards.", or "{n} decks are left out because Endstep withholds their cards."
- If Endstep withholds the card table of every deck, the list has no cards. The page then shows the empty state "No cards in this window", with that line as its detail.
- While a list loads, the status line names it and the window: "Loading the main deck for the 7d window." or "Loading the sideboard for the 7d window."

The page shares its own title and description, with the site card, FR-15.

### FR-19. Card previews and cost to build
The sample list of the deck page, FR-11, shows the image of each card on demand and what the list costs to build. It makes one call to `/api/sample-cards`, §4.10. The Card previews and cost section of the design system is the visual specification.

- The page sends the request once the deck detail has a list to show, `shown` or `mainOnly`. The key of the request is the deck and the window. The list shows at once, and the previews and the cost arrive after it. The page does not retry the request, §4.8. If the request fails, the names stay plain text and the cost does not show. So the list reads as before.
- The page prices the list that it shows from the prices for each card in the response. A card that the response lacks has no image and no price.

#### Card previews

- If the image of a card came back, its name is a button. The button has a dotted underline that turns solid on hover and focus. A card without an image keeps its plain name.
- On a device that can hover, the image of the card shows in two cases: the pointer is on the name, or the name has keyboard focus.
  - The image shows beside the sample list panel, 244px wide, level with the name and kept inside the screen.
  - It goes on the side of the panel that has room. Otherwise, it goes on the side of the name that has room. Otherwise, it goes as close to the right of the name as the screen allows.
  - When the page scrolls, it follows its name.
  - It hides in these cases: the name leaves the screen, the pointer leaves, focus moves on, or the reader presses Escape.
  - It is decorative, `aria-hidden`, because assistive technology already reads the name.
- If the reader activates a name by a tap, a click, Enter or Space, the card opens in a dialog. The dialog holds the image, up to 300px wide, with the name of the card as its `alt`, and a Close button.
- Close, Escape or a tap outside the image closes the dialog, and focus returns to the name.
- On a touch screen, the dialog is how the reader sees a card. With a mouse, hovering is quicker. The dialog serves readers who use a keyboard or a screen reader, and readers on touch laptops.
- If the image does not load, the dialog shows "The card's image could not be loaded." in its place.
- The preview is a manual popover, and the dialog is a modal `<dialog>`. Both sit in the top layer of the browser, so no part of the page covers or dims them.

#### Cost to build

A block after the lists shows the cost to build.

- The block has a label, "Cost to build", and a switch named Currency with three options: MTGO, € and $. MTGO is the default.
- The page keeps the choice of the reader in local storage, as it keeps the theme, FR-13. So the choice carries across decks and visits. It is not in the address.
- The total is in tickets, "238.41 tix", or in euros or dollars, "€194.00" or "$173.64". It is the count of each card times its price, added up, to two decimal places.
- A line under the total splits it: "Main deck {cost} · Sideboard {cost}". For a `mainOnly` list, it reads "Main deck {cost}".
- One sentence reads "Prices from Scryfall, at each card's cheapest printing."
- If some cards have no price in the chosen currency, the total covers the other cards. A line then reads "No price for 1 card." or "No price for {n} cards."
- The six basic lands cost nothing. Snow-covered basics get a price.
- During a window change, the block follows §4.8. It never shows the cost of one window under the list of another window.

### FR-20. Languages

The site reads in English, Italian, Spanish and Portuguese, and the reader can choose the language. The design system's Page header section shows the language switch.

#### The languages

- `en`, English. English is the source of every string.
- `it`, Italian.
- `es`, Spanish, in a neutral form for Spain and Latin America.
- `pt`, Portuguese, in its Brazilian form.

Each language needs a translation of every string before it enters the site. Until then, the switch does not list it. With only one language, the site shows no switch.

#### The first visit

- The page reads the preferred languages of the browser, `navigator.languages`, in order. It takes the first language whose primary code is one of the four. For example, `pt-PT` and `pt-BR` both give `pt`.
- If no language matches, the page uses English.

#### The switch

- A pill sits at the top right of the site header, before the theme toggle, FR-13. It is on every page and at every width, once the site has two or more languages. It shows the code of the current language, such as "EN", and a chevron.
- A native select lies over the pill, invisible, so a tap or a click opens it. It is named "Language" in the current language. Each option names the language in its own words: "English", "Italiano", "Español", "Português".
- A choice changes every text on the page at once, with no reload.
- The page keeps the choice of the reader in local storage, as it keeps the theme. From then on, the choice wins over the browser. The choice is not in the address, §4.5.
- The `lang` attribute of the `html` element holds the full tag of the formats below, such as `pt-BR`. A screen reader then uses the right voice.

#### Formats

- Numbers, percentages and dates follow the current language, through `Intl`. English shows "57.5%" and "5 Sept". Italian shows "57,5%" and "5 set".
- The page takes the region from the first entry of `navigator.languages` whose primary code is the current language. For example, `en-US` shows "Sep 5". If no entry has that code, the page uses `en-GB`, `it-IT`, `es-ES` or `pt-BR`.
- A date shows its day as a plain number, "5", not "05".

#### What stays in English

- The names of decks, which come from Endstep.
- The names of cards. MTGO runs in English, and players use the English names.
- The Fan Content notice, NFR-5, in the policy's own words.
- The name of the site, "Pauper Endstep metagame".
- The HTML that chat apps and search engines read, FR-15. §8 keeps link previews in other languages out of scope.

#### The strings

- One file, `src/locales/locales.json`, holds every string. Each language is a top-level key. Its strings sit under `translation`, the default namespace of i18next.
- `src/locales/i18n.ts` sets up i18next and types the keys from the English strings. `main.tsx` and the setup of the specs import it.
- A key names the place of its string, such as `pick.title`. A placeholder uses double braces, such as `{{deck}}`.
- A plural uses the endings that i18next asks for each language, through `Intl.PluralRules`. English needs `_one` and `_other`. Italian, Spanish and Portuguese also need `_many`, which they use for large round numbers such as a million.
- TypeScript makes sure that each language in the file holds every key of English, and every plural ending of its own language. A missing key fails the build.
- If a string is missing when the page runs, the page shows the English string.
- The words that the formatting helpers add, such as the "to" in a window range and "Not available", are strings in the file too.
- The labels of the window buttons are strings too, such as "30d" and "season". The address keeps the codes, §4.5.
- The quoted UI text in this document is the English text. Each language translates it.
- Specs render in English, so they keep their queries by the English text.

---

## 6. Data caveats the UI must handle

An inspection of the source data found the properties in this section. If the UI ignores one of them, it shows wrong or misleading output.

### 6.1 Shares do not sum to 100%
Across all 264 Pauper archetypes, shares total 94.1%. About 5.9% of registrations are unclassified. The top 24 decks account for 78.4%. The measurement date for these figures is 2026-09-20.

The UI computes `Other` as `1 − Σ(top 24 shares)`. At that measurement, it was 21.6%. It covers the 240 tail archetypes and the unclassified registrations. Give it a label that makes this clear, for example `Other (240 archetypes and unclassified decks)`. Do not show it as a single archetype.

### 6.2 History is shorter than the window
Endstep's data begins on 2026-09-05. A 30-day window returns 30 daily points, and only 16 of them carry data. The earlier points have `registrations: 0` and `rate: null`. If the chart plots them as zero, it draws a false collapse in the share of every deck. Omit them from the line path.

### 6.3 `shareChange` is not available on the default window
`shareChange.points` has data for `1d`, `7d` and `14d`. On `30d`, it is `null` with `reason: "previous_window_empty"`. On `season`, it is `null` with `reason: "no_previous_window"`. Endstep does not yet have enough history to form a previous window. `30d` is the default window. So the share-change column is empty on the first load, and the UI must say why. When Endstep has more history, this problem goes away.

### 6.4 The long tail is noise, but the top 24 is not
230 of 264 archetypes have `machineNamed: true`. These archetypes carry generated names. Most of them are single-player decks whose win rates are 0% or 100%. All 24 decks in the grid have names that a person chose. The smallest has 114 players and 805 matches, and none of them is sample-gated.

The grid needs no noise filter. That is why the UI does not expose `minMatches`. If a feature widens the list beyond the top 24, that feature must handle this noise again. The deck search does this, FR-14. It shows these decks as Endstep returns them. A win rate under 20 decided matches reads as too few to call, §6.8.

### 6.5 Win rates carry uncertainty
`matchWinRate` includes a confidence range, `low` and `high`, and a design effect, `deff`. The repeated matches of one player are not independent samples. A percentage alone shows more precision than the data has. At minimum, show the range on hover. The scatter plot must not lead the reader to read small differences as real.

### 6.6 The win rate counts matches
`wins` and `losses` count matches, not games. The data does not count draws. Label the figure `match win rate`, not `win rate`. The exceptions are `gameResults` and `playDraw` on the deck detail. They count games, FR-11.

### 6.7 The end date of the window is an exclusive bound
`provenance.window.to` is the day after the last day that the window covers. In a measurement on 2026-10-01, every preset returned `to: 2026-10-02`. The 30-day window ran from `2026-09-02`. That is 30 days that end on 1 October.

If the UI prints `to` as the end date, it names a day that is still in the future. It also makes the 1-day window read as three days. Subtract one day before you display it. The field is still the right one to read, but it is not the last day that the window covers.

Subtracting one day does not make `1d` cover a single day. The API's `1d` preset returns a span of two days, with `from` two days before `to`. The fix changes the label from three days to two days. That remainder is upstream behaviour, not a display problem.

### 6.8 Win rates below 20 decided matches are gated
Win and loss blocks carry `required: 20`. Below that number, `gate` is `"too_few"`. Then `rate`, `low`, `high` and `deff` are null, but `wins` and `losses` are still present.

`deck.matchWinRate`, on `/decks` and on the deck detail, has no `gate` field. It returns a rate from any number of matches. Apply the same threshold to it. Fewer than 20 decided matches reads as too few to call, whatever `rate` says. Show it as too few to call, with the count against the 20 required. If the UI plots or prints a null rate as 0%, it makes a false statement.

No top-24 deck is gated at deck level today. In a measurement on 2026-10-03, the smallest deck on `1d` had 95 decided matches. Matchup cells and game splits are gated more often. One top-24 pair was gated at 30d.

### 6.9 Matchup rows do not add up to the deck total
On 2026-10-03, the matchup rows of Izzet Control added up to 1,976 matches. The deck total was 2,122. The mirror is not listed. The gap splits 90 wins to 56 losses, so the gap is not only the mirror. It is most likely matches against unclassified decks. Do not show a matchup row as a share of the matches of the deck. Do not calculate the win rate of a deck from its rows.

### 6.10 Most matchup cells are within noise
A measurement on 2026-10-03 at 30d for the top 24 found these numbers:

- The median pair has 152 matches.
- 90 of 276 pairs have fewer than 100, and 25 have fewer than 50.
- The median range is 19 points wide.
- 193 of the 550 ungated cells have a range that excludes 50%.

If the UI colours every cell by its rate, the colours mostly show noise. For this reason, FR-12 colours only clear results.

The two directions of a pair agree exactly. They have equal match counts, their wins and losses are swapped, and their rates add up to 1. The ranges differ slightly, because each direction uses the `deff` of its own deck. That difference is enough to split one pair. Elves against Spy Combo excludes 50%, but Spy Combo against Elves does not. For this reason, FR-12 decides per pair, not per cell. The same closeness is why §4.4 can fill a missing direction from the other direction.

### 6.11 Slugs change
The slug of a deck has a name part and an 8-character suffix, such as `affinity-e93f5f74`. A slug with any name part and the right suffix, such as `renamed-e93f5f74`, returns 307 with `canonicalSlug`. The proxy's `fetch` follows the redirect, so the page receives the current deck. A check through the production proxy on 2026-10-03 showed this behaviour. So a deck page that a link opens under an old name still loads, and FR-11 corrects the URL.

---

## 7. Non-functional requirements

### NFR-1. Build and toolchain
The front end is a Vite application in TypeScript with React 19. `npm run build` type-checks it and bundles it into `dist/`. `package-lock.json` pins every dependency.

| Dependency | Version |
|---|---|
| React, ReactDOM | 19 |
| React Router | 8, declarative mode |
| TanStack Query | 5. See §4.8 |
| i18next, react-i18next | 26 and 17. See FR-20 |
| Recharts | 3.10 |
| Vite | 8 |
| TypeScript | 6.0, strict mode. See below |
| pino | 10, in the functions only. See NFR-12 |

- TypeScript stays on 6.0, the last release with the JavaScript compiler API. TypeScript 7.0 has no such API. So typescript-eslint refuses it, and the install on Vercel fails on the peer conflict. A measurement on this repository on 2026-10-06 showed this. typescript-eslint tracks support for 7.1 in issue #10940. When that support is released, move to 7. Move directly, or use the side-by-side setup that TypeScript documents. 6.0 already warns about everything that 7 removes.
- TypeScript runs in strict mode, and a type error fails the build.
- Four configs cover the repository. The type check runs `tsc` on each config.

  | Config | Covers |
  |---|---|
  | `api/tsconfig.json` | `api/`. It is the config nearest to the function, so the function build on Vercel reads it |
  | `server/tsconfig.json` | `server/`. It extends `api/tsconfig.json`, so the shared files build with the options of the functions |
  | `tsconfig.app.json` | `src/` and `test/`, with the client types of Vite |
  | `tsconfig.node.json` | `vite.config.ts` and `eslint.config.ts`, with the types of Node. The Vite config imports the functions. So this config also checks the five functions and the `server/` files they import, without the DOM lib, as the dev server runs them. Code in `server/` must therefore pass both configs |

- The root `tsconfig.json` lists the four configs as references. It covers no file itself. When an editor opens a file, it finds the root config. Then it follows the references to the config that covers the file. Without the references, an editor checks `src/` with default options and reports false errors.
- Vite's client types stay out of `api/tsconfig.json`, because they break the function build there. The config moved from the root to `api/`. An offline `vercel build` on 2026-10-09 showed that the compiled function stayed the same, byte for byte.
- The response types live in `src/api/types.ts`, one type for each endpoint in §3.1. Their source is measured responses, not a published schema.

#### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite with the API plugin, §4.6 |
| `npm run typecheck` | `tsc` on each of the four configs |
| `npm run build` | The type check, then `vite build` |
| `npm run lint` | ESLint over the repository |
| `npm run format` | Prettier rewrites every covered file |
| `npm run format:check` | Prettier checks the files without writing. CI runs this script |
| `npm test` | Vitest, one run, no watch mode |

#### Lint and format
ESLint and Prettier are explicit dev dependencies. The lockfile pins them.

| Tool | Version | Configuration |
|---|---|---|
| ESLint | 10 | Flat config. It has the recommended rules of `typescript-eslint`, the React Hooks rules, `curly: all`, and explicit return types on functions and methods. It also has `eslint-config-prettier`, so ESLint never disputes a formatting choice |
| Prettier | 3 | Its defaults. `.prettierignore` excludes `dist/`, `docs/` and the lockfile. People write the documents in `docs/` by hand |

`curly: all` requires the braces. Prettier always puts the body of a block on its own line. Together, the two tools enforce the brace rule in `AGENTS.md`.

`explicit-function-return-type` applies to the TypeScript files, with its default options. A callback whose type is already known needs no return type. An example is an argument to a typed function. In `.tsx` files, a wrapper in `eslint.config.ts` skips React components. For the wrapper, a component is a function declaration whose name starts with a capital letter. A function assigned to a variable whose name starts with a capital letter is also a component. The rule does not apply to JavaScript files, because they cannot declare a return type.

#### Tests
The tests use Vitest 5 with React Testing Library 16 and jsdom. Vitest runs on the Vite config, so TypeScript, JSX, CSS imports and ES modules need no setup of their own. Its API matches the API of Jest.

- Every component and every exported function must have a spec. Add the spec in the same pull request as the code. This rule covers components, hooks, helpers and the API functions. If the module does not export a function, the specs test that function through the exports that use it. The specs that use the helpers in `test/` also test those helpers.
- The spec sits beside its module and takes its name from the module. For example: `components/Card.tsx` and `components/Card.spec.tsx`, `helpers/format.ts` and `helpers/format.spec.ts`.
- The API functions are plain `Request` to `Response` handlers. So their specs, `api/metagame.spec.ts` and `api/matchups.spec.ts`, call them directly with `fetch` stubbed.
- Vitest runs two projects. The `api` project runs the specs in `api/` in Node. The `app` project runs the specs in `src/` in jsdom, with the Testing Library setup. A spec needs no setup in its own file. Shared test helpers and fixtures live in `test/`, outside `src/`.
- Specs query by role and by visible text, the way a reader finds things. The project has no snapshot tests. If nothing reaches assistive technology, a spec reads the DOM. Examples are a skeleton and the marks of a chart.
- jsdom does no layout. Without help, the Recharts `ResponsiveContainer` measures 0 by 0 and draws nothing. So a chart spec first calls `sizeCharts` from `test/`. That helper gives every element a size.
- Specs never call Endstep. They stub every request.

#### Documentation
Every API function and every helper has a JSDoc block. A helper is any exported function that is not a component. Helpers include hooks and the formatting and data functions.

- The block has one sentence on what the function does, a `@param` for each parameter, and `@returns`. If the function throws, the block also has `@throws`.
- TypeScript carries the types, so the tags do not repeat them.
- Components and specs need no JSDoc.
- A JSDoc block documents a contract. It is not one of the inline comments that `AGENTS.md` rules out.

#### Where helpers live
The formatting and data helpers live in `src/helpers/`, one module for each concern. The rest of the app imports them through `src/helpers/index.ts`. A helper imports its siblings directly, not through the index. Hooks live in `src/hooks/`, and the API layer lives in `src/api/`. Chart code lives in `src/charts/`, and that includes the series palette.

The charts take their colours as CSS variables, such as `var(--s1)`. So the browser resolves them on every paint, and a change of theme recolours them without a re-render, FR-13. Chart code stays out of the index, so code can import a formatter without a page.

#### Continuous integration
The project has one GitHub Actions workflow, `.github/workflows/ci.yml`.

- It runs on every pull request and on every push to `main`.
- It has one job, named `ci`. The Deployment Check in §4.7 refers to that name. If someone renames the job, the release gate breaks.
- The job runs these steps in order: check out, set up Node 24 with the npm cache, `npm ci`, `npm run format:check`, `npm run lint`, `npm test`, `npm run build`. The first failure stops the job.
- Branch protection on `main` requires `ci` to pass before a pull request merges.

So every commit that reaches `main` compiles, passes the lint, is formatted and passes the suite. Only such a commit reaches production.

This setup replaces the no-build decision of Draft v2. That decision pinned React to 18, because React 19 ships no UMD build. It named Vite as the escape hatch. The owner took the new decision on 2026-10-03, for modules, type checking and room for more pages. A mechanical port of the v2 page to Vite and React 19 rendered every section with live data. An offline `vercel build` kept the function and the rewrite.

### NFR-1a. Design language
[`design-system.html`](./design-system.html) specifies colour, typography and the chart palette. It is the authority for every token. In short, it sets these choices:

- A light theme on `#f9f9f7`.
- A dark theme, Soft graphite, on `#353537`, FR-13.
- `system-ui` as the single typeface. The site fetches no font, so NFR-9 holds.
- `#1c5cab` for links and primary buttons, at 6.46:1 on the light surface.
- An eight-hue categorical palette, tested for colour-vision deficiency against our own surface.

Three of the eight series hues fall below 3:1 against the light surface. That triggers the relief rule. Under that rule, the chart must ship visible labels or a table view. The line chart labels the ends of its series. The deck table of FR-4 is one choice away on the overview, and it gives the figures as text. Before you remove either one, check the palette again.

The dark theme is a second palette, tested against its own surface, `#3c3d3f`. It is never an automatic inversion. Headings and values read at 9.05:1, body text at 6.56:1 and labels at 3.63:1. Links and primary buttons use `#8fbefa` at 5.65:1. The eight series hues are the light hues with more lightness. Each one is between 3.20:1 and 3.42:1, so the relief rule does not trigger in the dark theme. Their worst adjacent pair keeps ΔE 8.2 under colour-vision deficiency and 16.1 under normal vision. An element that fades by opacity, such as the matchup spotlight, fades no further than in the light theme. So the marks of the scatter plot fill at 63% in the dark theme, against 55% in the light theme, `--mark-opacity`.
### NFR-2. Charting library: Recharts
The charts use Recharts 3.10, installed from npm. Two criteria decided the choice: simplicity and popularity. The comparison below dates from Draft v2, under its no-build constraint. The move to a build removes the UMD argument against the other libraries. The simplicity argument still stands.

#### Popularity

Recharts is the most downloaded charting library on npm, with about 4.8 times the downloads of Chart.js and 11 times those of ECharts.

| Library | npm downloads/week | Transfer size (brotli) | React integration |
|---|---:|---:|---|
| Recharts | 43.0 M | 150 KB | Native, declarative components |
| Chart.js | 9.0 M | 72 KB | Imperative. `react-chartjs-2` has no UMD build |
| ECharts | 3.7 M | 367 KB | Imperative wrapper required |
| ApexCharts | 1.6 M | 267 KB | Imperative wrapper required |
| Observable Plot | 0.5 M | 69 KB plus 92 KB d3 | Imperative wrapper required |

#### Simplicity

Recharts is the only candidate that is a React library, not a JavaScript library with a React adapter. You write each chart as JSX, for example `<LineChart><Line/><XAxis/></LineChart>`. The code has no refs, no lifecycle management, no `update()` or `destroy()` calls and no wrapper component. Chart.js is half the size. But it needs imperative code for that saving, and imperative code works against the simplicity criterion.

Recharts renders SVG, not canvas, so the content of a chart stays in the DOM. This helps NFR-6.

Recharts covers the three charts of the overview:

- `LineChart` for FR-5.
- A horizontal `BarChart` with `LabelList` for FR-6.
- `ScatterChart` with `ZAxis` for the bubble sizes in FR-7.

The share line of the deck page in FR-11 is a `LineChart`. The matchup table in FR-12 is an HTML table, not a chart.

### NFR-3. Performance
- The page is interactive within 3 seconds on a normal broadband connection. The art lookup adds at most one second to an uncached deck list, §4.3.
- The first render makes these API calls:
  - The overview makes exactly two: `decks` at `pageSize=24` and `share-series`. When the address restores a search, it makes a third, FR-14.
  - The deck page makes two: the deck detail and `/api/matchups`. The second call is the same request that the matchup table makes, so it shares the edge cache entry of that page.
  - The matchup table makes one. What to play? makes one, and shares it with the matchup table. Staples makes one.
  - When the deck detail has a list to show, the deck page also requests `/api/sample-cards`, FR-19.
- The size of the script payload is a reference, not a gate. Draft v2 shipped about 743 KB brotli, and 544 KB of that was Babel Standalone. The mechanical Vite port measured 156 KB of script and 2 KB of CSS, brotli, on 2026-10-03.
- The page lazy-loads the card art with `loading="lazy"`. It sizes the art to prevent layout shift.
- If back, forward or a window switch leads to data fetched in the last five minutes, the page renders that data from memory. It sends no request and shows no loading state, §4.8.

### NFR-4. Respecting the upstream service
The application must not put meaningful load on Endstep. The edge cache (§4.3) means that repeat visits and repeated window switches cost no upstream requests. Within five minutes, the cache of the client (§4.8) sends no request. The client must follow these rules:

- It must not poll.
- It must not retry more than twice.
- It must back off on 429.

The goal is that total upstream traffic stays well below the limit of 300 per 60 seconds. The matchup function costs 25 upstream calls for each cold window. To warm all five windows costs 125 calls in each edge region that serves a request. The matchups row of the deck page requests the same URL. When a window is warm, the row adds no upstream calls. On an edge cache miss, the deck page's HTML function, FR-15, adds one deck detail call for each deck and window. It is the same call that the page makes.

A search costs one upstream call for each distinct normalised query, window and page. The search runs 300ms after the reader stops typing, from 2 characters. The edge caches each query like any other deck list. If several regions warm every window inside one minute, they will pass the limit. At the traffic of this site, that is unlikely. If it happens, §4.4 holds a 429 at the edge for the full minute.

The staples function costs at most 121 calls for each cold window and section, §4.9. On 2026-10-20 we measured 29 calls for the main deck and 25 for the sideboard, at 30d and 7d. If the other windows follow the same pattern, to warm all ten costs about 270 calls. This figure is an estimate. On a cold window, the second requests of §4.9 add up to 24 calls. But they save the rebuild that a 502 used to need. A reader can open every window and both sections on a cold region in one minute, and then open the matchup table. That walk may pass the limit. After it, the 30-minute cache of the staples function makes the same walk free. A 429 from the staples function is held for the minute, as it is for the matchup function.

The same care applies to Scryfall, §3.4. Each function sends fewer requests after an instance sees the cards:

- The proxy sends one collection request for each uncached deck list or deck detail.
- The staples function sends one for each uncached window and section.
- The sample cards function sends at most five for each uncached deck and window, 500ms apart, §4.10. The spacing keeps it within the Scryfall limit of 2 per second.

Each distinct search query is its own deck list. The 300ms pause of the search and its two-character floor, FR-14, therefore also limit the Scryfall requests. If Scryfall returns 429, the function does not retry. The response goes out without the art.

### NFR-5. Attribution
The page states that the data comes from Endstep, and links to `https://endstep.cc/metagame`. It does not present itself as an official Endstep product. The footer has the layout that the design system shows. It carries these items:

1. The data source, with a link to Endstep.
2. A statement that the site is not affiliated with Endstep.
3. The Fan Content notice in the words of the policy, with a link to the policy: "Pauper Endstep metagame is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC."
4. The author, Gabriele D'Arrigo, with a link to `https://github.com/gabrieledarrigo`, beside a link to the source code.
5. A credit to Scryfall for the card images and prices: "Card images and prices from Scryfall." The images reach the browser from the Scryfall servers, §3.4. The prices come through the sample cards function, §4.10.

### NFR-6. Accessibility
- The reader can reach and operate all content by keyboard. A click on a bar or a marker of a chart opens a deck page. The bars and markers are not tab stops. The reader can reach each of those pages by keyboard through the deck grid or the deck table, in whichever view the overview shows.
- A chart is never the only carrier of information. Everything in a chart is also in a table or a list. On the overview, that is the deck table, one choice away in the view switch, FR-4. On the deck page, it is the daily share list, FR-11.
- Colour is never the only carrier of meaning. The contrast target is WCAG AA. The requirements accept two exceptions. The first exception is the cells that the spotlight of the matchup table fades, FR-12. They are context for the deck in the spotlight, which keeps full contrast. The detail on hover or focus gives their figures in full. The second exception is the lines, end dots and end labels that Share over time fades around a highlighted deck, FR-5. The highlighted line and its label keep full contrast. The legend and the tooltip name every deck at full contrast.
- Card art carries meaningful `alt` text. The page hides decorative elements from assistive technology.

### NFR-7. Responsive
The site is usable from 360 px to a wide desktop. Tables scroll horizontally. They do not reflow. The matchup table is the exception. Below 640px, it becomes the list of one deck, FR-12. The page itself never scrolls horizontally.

### NFR-8. Browser support
The site supports the current versions of Chrome, Firefox, Safari and Edge. It does not support IE, and it uses no polyfills.

The code targets ES2025 in these places: `target` and `lib` in the three TypeScript configuration files, and `build.target` in Vite. The site does not support older browser versions.

### NFR-9. Privacy
The site counts its page views with Vercel Web Analytics, and nothing else. It sets no cookies.

- The `Analytics` component of `@vercel/analytics/react` sits once at the root of the app. It counts the first page and each route change.
- Each page view sends the full address, with its query string, so the owner sees which windows, decks and searches people open. A search term of FR-14 is part of the address.
- The script and its requests stay on the site's own origin, at `/_vercel/insights`. So the security policy of §4.7 does not change.
- The owner turns on Web Analytics in the Vercel dashboard. The plan of the Vercel project sets a monthly limit of events.

It keeps no personal data in local storage. It sends no third-party requests beyond the card-art hosts: the Scryfall CDN, and the Endstep image endpoint as the fallback. The app keeps three values in local storage: the theme choice, FR-13, the currency of the sample list, FR-19, and the language, FR-20. All three are display preferences, not personal data. They never leave the browser.

### NFR-10. Deployment
Vercel deploys the site from the Git repository. The deploy is a Vite build and five serverless functions. It uses no environment variables and no secrets. Production waits until CI passes, §4.7.

### NFR-11. CSS architecture
The styles are plain CSS files, and Vite processes them. The site uses no CSS Modules, no CSS-in-JS and no framework. As a result, the class names ship exactly as the design system documents them.

#### Cascade layers

`src/styles/index.css` is the one global entry. `main.tsx` imports it first. The file declares the layer order once:

```css
@layer tokens, base, layout, components;
```

A later layer overrides an earlier one. The specificity of the selectors does not change this, and the order in which Vite emits the files does not change it.

| Layer | Owns | Example |
|---|---|---|
| `tokens` | The tokens of the design system: custom properties on `:root`, from part three of `design-system.html`, in the light theme and the dark one, and the `color-scheme` that goes with each theme. Nothing else | `--text-900`, `--win`, `color-scheme` |
| `base` | The browser reset and the default rules for elements: text, headings, links, lists, tables, the focus ring. The one shared class, `.visually-hidden` | `body`, `h1`, `a`, `:focus-visible` |
| `layout` | The layout primitives that the pages use: the page wrapper, the full-width band that breaks out of it, the spacing between sections | `.page`, `.bleed` |
| `components` | The UI components, one BEM block each | `.stat-tile`, `.deck`, `.matchup__cell` |

- Every rule sits in a layer. A rule outside any layer overrides every layer, so an unlayered rule is a defect.
- Do not use `!important`. It reverses the layer order.
- Element selectors appear only in `base`.

#### Component stylesheets

Each component imports its own stylesheet, which has the name of the component. For example, `StatTile.tsx` imports `./StatTile.css`. The stylesheet wraps its rules in `@layer components`.

- BEM is the naming convention: `.stat-tile`, `.stat-tile__label`, `.stat-tile--hero`.
- The block class of an element sits on the root of the component, even when the block has no rules of its own. For example, `.win-rate__frame` sits inside `.win-rate`.
- The stylesheet of a component styles only the elements that the component renders. It does not reach into a child component. It does not style anything outside its own markup. For example, `.stat-list` belongs to `Summary.css`, because the summary renders the list. `.stat-tile` belongs to `StatTile.css`.
- A parent changes a child in two ways only. It sets a modifier that the child defines, such as `--hero`. Or it adds one of its own classes to the root of the child, a BEM mix: `<Panel className="deck-table__scroll">`. The stylesheet of the parent styles that class. It never selects into the classes of the child.
- If more than one component needs a rule, the rule belongs in `base` or `layout`, not in the file of a component.

#### Breakpoints

Three ranges, and only their two boundaries appear in media queries.

| Range | Width |
|---|---|
| Mobile | Below 640px |
| Tablet | 640px to 1,099px |
| Large desktop | 1,100px and up |

- Write styles for mobile first. `@media (min-width: 640px)` and `@media (min-width: 1100px)` add to them.
- The design system already switches at 640px. At 1,100px the matchup table fits without scrolling, FR-12.
- Custom properties do not work in media queries. The two values are therefore written as numbers, and this section is their reference.
- The window selector scrolls sideways below 640px. Before, it scrolled below 400px. It is 307px wide, so it only scrolls below about 347px. Between 400px and 639px, one change shows: the scroll box clips the outer pixel of the focus ring. It already did that below 400px.
- The win rate scatter shows its point labels from 640px. Before, it showed them from 761px. The label spacing assumes a plot 590px wide, which the chart reaches at about 770px. Narrower plots can crowd the labels. With the data of 7 October 2026, no label overlapped another at 640px, 700px or 759px. A bubble covered part of one label, as it did at 761px.

The project has no CSS linter for now. Prettier formats the CSS, and review enforces the rules above.


### NFR-12. Logging
The functions log every response that fails. So the owner can see how often each page fails to load, and why. Each function uses pino, with no transport. Pino writes one JSON line to standard output, and Vercel keeps the line in the runtime logs of the function. The `LOG_LEVEL` variable sets the level, `info` by default. The specs set it to `silent`.

- A function logs one line for each response with a status of 429, or of 500 and above. It logs nothing for a response that succeeds. Vercel already counts the responses by status.
- The deck page's function also logs when it falls back to the site card after a failed call, FR-15. It logs this at the `warn` level, because the reader still gets the page. A deck that Endstep does not know, a 404, is not a failure, so it gets no line.
- A function that throws answers 500 and logs one `error` line. The line has `upstream` set to `null`, and the message of the error in a field named `error`. One wrapper in `server/log.ts` does this for the five functions.
- Each line has a summary message and an object of fields. The summary reads, for example, "matchups 1d: 502, 3 of 25 Endstep calls failed (2 timeout, 1 503)". When the function aborted calls, it adds their count, such as ", 21 aborted". `upstream`, `calls` and `failures` name only the service whose failures caused the status. They are `null` when no call failed.

  | Field | Holds |
  |---|---|
  | `page` | The path of the page that made the request, such as `/matchups`, from the `Referer` header. The path only, without the query string. `null` when the request has no `Referer`. The deck page's function serves the page itself, so its `page` is the path of its own request |
  | `function` | `metagame`, `matchups`, `staples`, `sample-cards` or `deck-page` |
  | `window` | The window of the request, or `null`. The deck page's function names the window it used, 30 days when the link names none |
  | `status` | The status that the function returned |
  | `upstream` | The service whose failures caused the status. Only Endstep's failures fail a response, since a failed Scryfall lookup only shortens the cache. So it is `endstep`, or `null` when no call failed |
  | `calls` | The calls of this response to that service: `total`, `succeeded`, `failed` and `aborted`. A call is aborted when the function stops it itself, such as the other card tables after a 429 on Staples. So `succeeded`, `failed` and `aborted` add up to `total` |
  | `failures` | The count of each reason for a failed call. A reason is the status of the service, such as `503`, or one of `timeout`, `network` and `body`. An aborted call has no reason |
  | `durationMs` | How long the function ran, in milliseconds |

- The `Referer` header carries the page, because every call of the app goes to its own origin and the policy is `strict-origin-when-cross-origin`, §4.7.
- A line holds no personal data and no IP address, NFR-9.
- The logs do not see everything:
  - The edge cache answers most requests, and then no function runs. A 429 stays cached for 60 seconds, §4.4. So one line can stand for many failed page loads.
  - A failure in the browser, such as a dropped connection, never reaches a function.
  - The project is on the Hobby plan of Vercel. It keeps runtime logs for a short time and has no log drain. So the owner reads the logs soon after a failure. On 2026-10-23 the owner chose this over a paid plan.

---

## 8. Out of scope

- Deck page sections beyond the numbers, the sample list and the matchups row. These are the full list of opponents of the deck, card usage and the rating distribution. Staples, FR-18, shows card usage across the top 24, not the card table of one deck.
- A matchup table beyond the top 24 decks.
- Formats other than Pauper.
- Languages beyond the four of FR-20. A language in the address, such as `/it/` paths. Link previews in other languages.
- The `casual` population and rating-band filtering.
- `minMatches` filtering, and pages of the top list of the overview beyond 24. Search results have pages, FR-14.

---

## 9. Open items

1. ~~Deck card link target.~~ Settled: our deck page, which links to endstep.cc. FR-10.
2. ~~Share composition chart form.~~ Settled: ranked horizontal bars, FR-6.
3. Series count on the time chart. The count is now the API default of 8. If the page passes deck UUIDs to `share-series`, the chart can show more than 8 of the 24 grid decks. This costs no extra request.
4. ~~Matchup coverage on other windows.~~ Settled: a check on 2026-10-10 covered all five windows. At `7d`, `14d`, `30d` and `season`, all 276 pairs of the top 24 appear in both directions. At `1d`, 270 pairs appear in both directions, and 3 appear in one direction only. §4.4 fills the missing direction. The other 3 pairs never met. In each of them, one deck has all its opponents inside its first 50 rows. The 50-row limit lost no pair.
5. ~~What the toss blocks count.~~ Settled: game 1. For Affinity at 30d on 2026-10-10, `tossWon` and `tossLost` hold 12,623 and 12,951 games. That is 25,574 in all, exactly the decided games in `games.game1`. `choseToDraw` counts 47 of the same 12,623 tosses won. FR-11 labels them game 1 win rates.
6. Deployment Checks on this plan. The Vercel documentation does not say which plans offer Deployment Checks. If the plan of this project does not have them, the fallback is to turn off the Git deploys of Vercel. The site then deploys from the `ci` workflow with the Vercel CLI. That needs a `VERCEL_TOKEN` secret and the project IDs in GitHub.
7. ~~The matchup table on a phone.~~ Settled: below 640px, the table shows the row of one deck as a list. It opens on the top deck by share. FR-12.
8. ~~Finding a deck in the matchup table.~~ Settled: `?deck=` puts one deck in the spotlight and fades the other cells. A picker chooses the deck, and the matchups row of the deck page links to it. The table has no hover crosshair. FR-11 and FR-12.
9. ~~Cards or a table on the overview.~~ Settled: the overview shows one view at a time. The reader chooses it with a switch, kept in `view`. The default is cards. FR-3 and FR-4.
10. ~~The dark palette.~~ Settled: Soft graphite. The owner chose it over warm stone on 2026-10-16. NFR-1a gives its figures, and the design system gives its tokens.
11. ~~Card art from our server.~~ Settled on 2026-10-17: Scryfall, by name. The owner accepted that the art may differ from the Endstep art. When measured, it differed for 11 of the 24 decks. The owner accepted this because the site presents its own view of the data. §3.4 and §4.3 give the rules, and #112 builds it.
12. ~~A page that suggests a deck.~~ Settled on 2026-10-18: What to play?, FR-17. The owner chose these points:
    - The answer first, "Play {deck}!".
    - A metagame that the reader can change, kept in the address as changes, not as shares.
    - Plain words for readers whose first language is not English.
13. ~~The format's staple cards.~~ Settled on 2026-10-18: Staples, FR-18, on its own page. The owner chose these points:
    - A list with large art, not tiles.
    - A card that opens the top-24 decks behind it, not the deck search. The deck search matched 80 decks for Counterspell.
    - 30 cards, with more up to 50.
    - The main deck or the sideboard, kept in the address.
14. ~~A title and description for each page.~~ Settled on 2026-10-20: FR-15 and §4.7. The owner raised it on 2026-10-18 and parked it. On 2026-10-20 the owner chose copies of `index.html`, written at build time. The owner set aside two other ways:
    - The deck page's HTML function for every page. It adds a function to the path of every page, for words that never change.
    - A move to Next.js. It has page metadata built in, but it means rewriting the routes, the data loading, the build and most specs.
15. ~~Card previews and the cost of a list.~~ Settled on 2026-10-18: FR-19. The owner chose previews on hover and focus, with a tap on touch screens. The owner also chose prices at the cheapest printing of each card, and accepted the extra Scryfall requests for accuracy. The cost is a block after the lists. It shows no price for each card. It has these parts:
    - A switch for MTGO, € and $.
    - The split between the main deck and the sideboard.
    - One sentence about the source.
16. ~~More languages.~~ Settled on 2026-10-20: FR-20. The owner chose:
    - English, Italian, Spanish and Portuguese.
    - A switch beside the theme toggle that shows the code and a chevron, with a native select over it.
    - One file for all the strings, and i18next.
    - Translations that the owner writes.
17. ~~Lines under the headings, page cards, analytics and logs.~~ Settled on 2026-10-23. The owner chose:
    - A line under the heading of the matchup table and of What to play?, as on Staples. Each line is the page's description without "Pauper". The description of What to play? changes to match its line, FR-15.
    - A page card for each of the three pages, in place of the site card, FR-15.
    - Vercel Web Analytics with the full address, query string included, NFR-9. This replaced "no analytics".
    - A log line for every failed response of the functions, with pino, NFR-12. No line for a success. The owner accepted the short log retention of the Hobby plan.
18. The `1d` window. On 2026-10-23, Endstep answered the `1d` deck list with a 503 after 27 seconds. The proxy stops at 8 seconds and returns a 502, so `1d` fails on every page. A cold `7d`, `14d` or `season` call also passed 8 seconds once, then answered in under half a second. The owner reports it to the maintainer of Endstep. Nothing changes here until Endstep answers.
