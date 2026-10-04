# Working agreement

Instructions for any coding agent working in this repository.

## Code

Write simple, readable code. Prefer the clean solution over the clever one.

- Do not overengineer. Solve the problem in front of you, not the one you imagine next.
- Keep abstractions few. Do not add a layer until there are two real callers.
- Every `if`, `else`, `for` and `while` has braces, with its body on its own line. This includes a single `return`.
- No inline comments explaining what the code does. If a line needs a comment to be understood, rewrite the line.
- Comments are for the rare case where the reason is not visible in the code, such as a workaround for an external API.

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

- Title is the issue title, verbatim.
- Description is a short bullet list of what was done. Nothing else.
- **No attribution footer.**
- Link the issue with `Closes #N` so it closes on merge.
- Assign `gabrieledarrigo` as assignee. Do not request a reviewer, GitHub rejects a self-review request.
- Carry over the issue's labels, both the type label and the wave label.
- Do not merge. That is the reviewer's call.

## Review loop

Every pull request gets an independent review before it reaches the human reviewer. The author does not review its own work from memory, because it already believes the code is right.

1. Open the pull request.
2. Run `/code-review <pr-number> --comment`. It runs in its own context and posts findings as inline comments on the pull request.
3. Grade every finding. Either fix it or decline it.
4. To fix: change the code, commit, and push to the same branch. Then reply on the thread with `Fixed by <sha>` and resolve it.
5. To decline: reply on the thread with a one sentence reason and leave the thread unresolved, so the human reviewer sees it as an open item.

Only a thread that is actually fixed gets resolved. If a later round reverses an earlier fix, say so on the original thread and leave it open. An open thread is the record that something is unsettled.
6. Run the review once more after the fixes.
7. Stop there. Two rounds is the cap, whatever the second round returns.

The loop runs unattended. Report once at the end: what was found, what was fixed, what was declined and why, and what is still open.

The reviewer checks three things.

- **Correctness.** Bugs, edge cases, wrong behaviour.
- **This agreement.** Simple code, few abstractions, no explanatory inline comments.
- **Acceptance criteria.** Whether the issue's "Done when" list is actually met.

Never merge. That decision belongs to the human reviewer.

## Project context

| File | What it holds |
|---|---|
| `docs/requirements.md` | Functional and non-functional requirements. The authority on behaviour |
| `docs/design-system.html` | Tokens and components. The authority on appearance |
| `docs/backlog.md` | The sixteen items, their tasks and their dependencies |

Issues #1 to #16 mirror `docs/backlog.md`. Labels carry type (`enabler`, `story`, `hardening`) and wave (`wave-0` to `wave-6`). Items in the same wave have no dependency on each other and can run in parallel.

The data source is the public Endstep API. It refuses cross-origin requests, which is why the app proxies it. Read section 4.1 of the requirements before changing anything about data access.
