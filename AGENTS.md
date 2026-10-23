# Working agreement

Instructions for any coding agent working in this repository.

## Code

Write simple, readable code. Prefer the clean solution over the clever one.

- Do not overengineer. Solve the problem in front of you, not the one you imagine next.
- Keep abstractions few. Do not add a layer until there are two real callers.
- Every `if`, `else`, `for` and `while` has braces, with its body on its own line. This includes a single `return`.
- No inline comments explaining what the code does. If a line needs a comment to be understood, rewrite the line.
- Comments are for the rare case where the reason is not visible in the code, such as a workaround for an external API.
- CSS follows NFR-11 in the requirements: every rule in a cascade layer, one stylesheet per component named after it, and each stylesheet styles only the elements its component renders.
- Every API function and every exported helper has a JSDoc block, as NFR-1 describes. That is documentation of a contract, not an inline comment.
- Helpers live in `src/helpers/` and are imported through its index, as NFR-1 describes. No helper module sits loose in `src/` or inside a page or component folder.
- Every new component and every new exported function comes with a spec in the same pull request, beside its module and named after it: `Card.tsx` and `Card.spec.tsx`. A function the module does not export is tested through the exports that use it. Specs query by role and visible text and never call Endstep.

## Prose

These rules apply to documents, PR descriptions, commit messages and UI copy. They follow the document rules of the SimpleEnglish skill in `.claude/skills/simple-english/`, Plain mode, with the project changes below.

- Write one idea in each sentence. Use at most 20 words in an instruction and 25 words in a description.
- Use active voice and simple tenses. Name the actor.
- Put the condition before the command: "If the build fails, read the log."
- Use "can", "will" and "must". Do not use "should", "would", "could" or "might". Use "may" only for a real possibility, not for permission.
- Use one word for one meaning in the whole document. For example, write "window" every time, not "window", "period" and "time span".
- Do not use em dashes or semicolons. Write two sentences.
- State the fact, not its importance. Delete words that carry no fact. `references/word-swaps.md` in the skill lists them.
- Use a vertical list for three or more steps or parallel items. Put one instruction in each item. A numbered step can hold one level of bullets for its parts.
- Do not use bold lead-ins or bold for emphasis. The backlog keeps its bold labels, because the issues copy them: "Date", "Tasks", "Done when", "Blocked by" and "Blocks".
- Keep British spelling, as the documents use it.
- Do not change code, identifiers, file paths, quoted text, numbers or facts when you rewrite.

## Commits

- Author is the repository's local git config, `Gabriele D'Arrigo <darrigo.g@gmail.com>`. Do not override it.
- No `Co-Authored-By` trailer. No attribution trailer of any kind.
- One sentence per message. No trailing full stop.
- Commit per logical step rather than one commit per issue.

Example:

```
Add the metagame proxy function
Allow-list the upstream path prefix
Set the edge cache headers
```

## Branches

`<issue-number>-<slug>`.

```
1-proxy
3-component-primitives
6-deck-grid
8-share-over-time
```

## Pull requests

Open one when an issue is done.

- Before every push, `npm run format:check`, `npm run lint`, `npm test` and `npm run build` pass. CI runs the same four checks on every pull request and on `main`.
- Title is the issue title, verbatim.
- No attribution footer.
- Link the issue with `Closes #N` so it closes on merge.
- Assign `gabrieledarrigo` as assignee. Do not request a reviewer, GitHub rejects a self-review request.
- Carry over the issue's labels, both the type label and the wave label.
- Do not merge. That is the reviewer's call.

The description is a reading guide for the human reviewer, who wants to understand the code without reading every line. It has two parts, each under its own heading:

1. `## What changed`: a short bullet list of what was done.
2. `## How to read it`:
   - The flow in a few sentences: what calls what, and where the data goes.
   - The files in the order to read them.
   - The decisions the reviewer does not expect, each with its reason.
   - What is safe to skim, such as mechanical moves and spec boilerplate.

Keep one concern per pull request. When work depends on an open pull request, stack it on that branch and say so in the description.

## Review loop

Every pull request gets an independent review before it reaches the human reviewer. The author does not review its own work from memory, because it already believes the code is right. The review talks to the author. Only its results and the open decisions reach the human reviewer.

1. Open the pull request.
2. Run `/code-review <pr-number>` without `--comment`. It runs in its own context and returns its findings to the author. Nothing is posted.
3. A finding counts only when it names a concrete failure: wrong behaviour, a regression, a spec that cannot fail, or a mismatch with the requirements, the design system or this agreement. The author can take or leave anything else without recording it.
4. Grade every finding that counts. Fix it, decline it, or hand it to the human reviewer when it is a trade-off only the owner can decide.
5. To fix: change the code, commit, and push to the same branch.
6. Run a second round on `git diff <first-round-head>..HEAD`, the commits pushed after the first round, and on the code they touch. Name that range in the reviewer's brief, so it does not review the whole pull request again. Skip the round when the first one pushed no commits, or only docs. Two rounds is the cap, whatever the second round returns.
7. Post one comment on the pull request. Start it with the heading `## Review`. It holds:
   - how many findings each round returned, and how many were fixed, declined and handed over;
   - each fix in one line, with its commit;
   - each decline in one line, with its reason.
8. Post an inline comment for each decision handed to the human reviewer: the question, the options, and a recommendation. Leave these threads open. Nothing else gets a thread. When the owner settles one, the author adds the answer to Settled decisions.

The loop runs unattended. Report once at the end, in the same shape as the Review comment.

The reviewer checks three things, and raises nothing listed under Settled decisions.

- Correctness: bugs, edge cases and wrong behaviour.
- This agreement: simple code, few abstractions and no explanatory inline comments.
- Acceptance criteria: whether the issue's "Done when" list is met.

Never merge. That decision belongs to the human reviewer.

## Settled decisions

The owner has decided these. Reviews do not raise them again. A change goes to the owner first, and then into this list.

- Uppercase labels stay `--text-400`, at 3.5:1. The owner chose this over a darker colour.
- TypeScript stays on 6.0 until typescript-eslint supports 7, NFR-1.
- Data goes through TanStack Query, and the view state lives in the address, §4.5 and §4.8. The share chart's highlighted deck is kept by its slug.
- The brand is a link, not a heading. Each page's h1 names the page, FR-10.
- Back and forward keep the scroll position the browser restores, §4.5.
- A parent can add its own class to a child's root, a BEM mix, and every block class sits on its component's root, NFR-11.
- Doc comments go on API functions and exported helpers only, never on types or their properties.
- Vercel previews sit behind Vercel Authentication. A "Done when" that names a preview is met by an offline `vercel build`, or by production after the merge.
- Below 1,100px the matchup table's header row scrolls away with the table. Only from 1,100px up does it stay at the top of the window, FR-12.
- When the matchup table opens on a deck from 640px to 1,099px, the page scrolls the table's top into view and the band sideways to the deck's column, not to the deck's row, FR-12. The column names stay on screen.
- Share over time highlights one deck from its legend and fades the other lines, below WCAG AA, NFR-6. The highlight replaced hiding, FR-5.
- The matchup function caches a 429 for 60 seconds, §4.4, even when a background revalidation could leave a stale matrix in its place.
- The matchup table's spotlight fades the other cells to 25% opacity, below WCAG AA, NFR-6. The owner chose it over a fade that keeps the numbers at AA.
- While a deck page loads, or after a server error, its canonical link and `og:url` name the address's path, FR-15. Only a loaded deck names its own slug. So an old slug can name itself for a moment, or after an error. The owner chose this over leaving the tags of the previous page in place.

## Project context

| File                      | What it holds                                                          |
| ------------------------- | ---------------------------------------------------------------------- |
| `docs/requirements.md`    | Functional and non-functional requirements. The authority on behaviour |
| `docs/design-system.html` | Tokens and components. The authority on appearance                     |
| `docs/backlog.md`         | Every milestone's items, their tasks and their dependencies            |

Each item of `docs/backlog.md` has a GitHub issue, and the issue body copies the item. The issue number is the item's only identifier. The item's heading starts with it, such as `## #166 Share a page with its own preview`. "Blocked by" and "Blocks" use it too. Other issues track one-off work, such as the review loop in #61.

- Each backlog milestone has a GitHub milestone. Its title is the backlog name with a capital and no number, such as "Languages" for "Milestone 7: languages". Milestone 1 is "Pauper metagame overview".
- Every item's issue sits in its milestone. A one-off issue sits in no milestone.
- Every issue is on [Project 2](https://github.com/users/gabrieledarrigo/projects/2).
- Labels carry type (`enabler`, `story`, `hardening`, `design`) and wave (`wave-0` onwards). Items in the same wave have no dependency on each other and can run in parallel.

To plan a milestone:

1. Write its items in the backlog.
2. Create an issue for each item, with its labels, its milestone and Project 2.
3. Put the issue numbers in the headings and in every reference.
4. Copy each finished item into its issue body.

In messages to the owner and between sessions, name an issue by its number and its title: "#168 Split the shared server code by subject is ready for review".

The data source is the public Endstep API. It refuses cross-origin requests, which is why the app proxies it. Read section 4.1 of the requirements before changing anything about data access.
