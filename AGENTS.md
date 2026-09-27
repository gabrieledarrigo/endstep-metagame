# Working agreement

Instructions for any coding agent working in this repository.

## Code

Write simple, readable code. Prefer the clean solution over the clever one.

- Do not overengineer. Solve the problem in front of you, not the one you imagine next.
- Keep abstractions few. Do not add a layer until there are two real callers.
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

## Project context

| File | What it holds |
|---|---|
| `docs/requirements.md` | Functional and non-functional requirements. The authority on behaviour |
| `docs/design-system.html` | Tokens and components. The authority on appearance |
| `docs/backlog.md` | The sixteen items, their tasks and their dependencies |

Issues #1 to #16 mirror `docs/backlog.md`. Labels carry type (`enabler`, `story`, `hardening`) and wave (`wave-0` to `wave-6`). Items in the same wave have no dependency on each other and can run in parallel.

The data source is the public Endstep API. It refuses cross-origin requests, which is why the app proxies it. Read section 4.1 of the requirements before changing anything about data access.
