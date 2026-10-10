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
- An exported function with a consumer has a spec beside its module, named after it: `Card.tsx` and `Card.spec.tsx`. Specs query by role and visible text and never call Endstep.

## Prose

This applies to documents, PR descriptions, commit messages and UI copy.

- No em dashes.
- Short sentences. One idea each.
- Few adjectives. Cut any that carries no measurement.
- Neutral and technical.

## Commits

- Author is the repository's local git config, `Gabriele D'Arrigo <darrigo.g@gmail.com>`. Do not override it.
- **No `Co-Authored-By` trailer. No attribution trailer of any kind.**
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
- **No attribution footer.**
- Link the issue with `Closes #N` so it closes on merge.
- Assign `gabrieledarrigo` as assignee. Do not request a reviewer, GitHub rejects a self-review request.
- Carry over the issue's labels, both the type label and the wave label.
- Do not merge. That is the reviewer's call.

The description is a reading guide for the human reviewer, who wants to understand the code without reading every line. It has two parts.

1. **What changed.** A short bullet list of what was done.
2. **How to read it.**
   - The flow in a few sentences: what calls what, and where the data goes.
   - The files in the order to read them.
   - The decisions the reviewer might not expect, each with its reason.
   - What is safe to skim, such as mechanical moves and spec boilerplate.

Keep one concern per pull request. When work depends on an open pull request, stack it on that branch and say so in the description.

## Review loop

Every pull request gets an independent review before it reaches the human reviewer. The author does not review its own work from memory, because it already believes the code is right. The review talks to the author. Only its results and the open decisions reach the human reviewer.

1. Open the pull request.
2. Run `/code-review <pr-number>` without `--comment`. It runs in its own context and returns its findings to the author. Nothing is posted.
3. A finding counts only when it names a concrete failure: wrong behaviour, a regression, a spec that cannot fail, or a mismatch with the requirements, the design system or this agreement. The author may take or leave anything else without recording it.
4. Grade every finding that counts. Fix it, decline it, or hand it to the human reviewer when it is a trade-off only the owner can decide.
5. To fix: change the code, commit, and push to the same branch.
6. Run a second round on the commits pushed after the first, and on the code they touch. Skip it when the first round changed only docs. Two rounds is the cap, whatever the second round returns.
7. Post one comment on the pull request, headed **Review**:
   - how many findings each round returned, and how many were fixed, declined and handed over;
   - each fix in one line, with its commit;
   - each decline in one line, with its reason.
8. Post an inline comment for each decision handed to the human reviewer: the question, the options, and a recommendation. Leave these threads open. Nothing else gets a thread.

The loop runs unattended. Report once at the end, in the same shape as the **Review** comment.

The reviewer checks three things, and raises nothing listed under Settled decisions.

- **Correctness.** Bugs, edge cases, wrong behaviour.
- **This agreement.** Simple code, few abstractions, no explanatory inline comments.
- **Acceptance criteria.** Whether the issue's "Done when" list is actually met.

Never merge. That decision belongs to the human reviewer.

## Settled decisions

The owner has decided these. Reviews do not raise them again. A change goes to the owner first, and then into this list.

- Uppercase labels stay `--text-400`, at 3.5:1. The owner chose this over a darker colour.
- TypeScript stays on 6.0 until typescript-eslint supports 7, NFR-1.
- Data goes through TanStack Query, and the view state lives in the address, §4.5 and §4.8. Hidden series are kept by deck slug.
- The brand is a link, not a heading. Each page's h1 names the page, FR-10.
- Back and forward keep the scroll position the browser restores, §4.5.
- A parent may add its own class to a child's root, a BEM mix, and every block class sits on its component's root, NFR-11.
- Doc comments go on API functions and exported helpers only, never on types or their properties.
- Specs for modules that existed before E8 belong to E11, unless a pull request changes what they do.
- Vercel previews sit behind Vercel Authentication. Deploy checks run in an offline `vercel build` or on production after the merge.

## Project context

| File                      | What it holds                                                          |
| ------------------------- | ---------------------------------------------------------------------- |
| `docs/requirements.md`    | Functional and non-functional requirements. The authority on behaviour |
| `docs/design-system.html` | Tokens and components. The authority on appearance                     |
| `docs/backlog.md`         | Both milestones' items, their tasks and their dependencies             |

Issues #1 to #16 mirror milestone 1 of `docs/backlog.md`. Milestone 2's issues mirror the rest. Labels carry type (`enabler`, `story`, `hardening`) and wave (`wave-0` onwards). Items in the same wave have no dependency on each other and can run in parallel.

The data source is the public Endstep API. It refuses cross-origin requests, which is why the app proxies it. Read section 4.1 of the requirements before changing anything about data access.
