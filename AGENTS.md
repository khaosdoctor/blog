# Working in this repo

Read `docs/architecture.md` before changing anything. It explains the content model, and most mistakes here come from not knowing it.

## The things that break if you do not know them

**Posts are `.mdx` files containing plain markdown.** No imports, no component tags. Two remark plugins turn markdown into components at build time. This is deliberate: `content/` is an Obsidian vault, Obsidian cannot render component tags, and writing in Obsidian is the point of the whole rebuild. Do not "modernise" posts back into components.

**A `.md` post silently loses content.** The plugins emit MDX nodes, and the plain markdown pipeline drops them without an error. Posts must be `.mdx`.

**Post URLs are frozen.** Every slug came from six years of Ghost and is linked from elsewhere. Route paths are English (`/search/`, `/tags/`, `/series/`), post slugs and titles are whatever was written, mostly Portuguese. Never rename a post folder.

**The build makes no network requests.** Bookmark and tweet metadata come from `content/bookmarks.json`. Anything needing a fetch goes in an explicit script that a human runs, never in the build. A build that depends on someone else's uptime fails for reasons nobody can fix.

**`scripts/migrate/` and `.migration/` are untracked on purpose.** One-shot Ghost tooling. The MDX is the source of truth now.

## Before you finish

Run these, in order:

```
npm run build
node scripts/check-output.ts
```

`check-output.ts` fails on a published post with no page, leftover Ghost markup, an unrendered component tag, a missing feed or manifest icon, an image that never reached the output, and any remote-script loader pattern. That last check exists because the old Ghost site served an injected script for a month before anyone noticed. Do not weaken it.

## Writing

The author is strict about prose, in code comments as much as anywhere else.

- **Comments are rare and say why, never what.** Only comment code a reader would otherwise stop at. Rationale belongs in `docs/`, not in a block above a function.
- **No em-dashes.** Anywhere. Use a comma, parentheses, or a new sentence.
- **Banned words**, in code and prose alike: land/lands/landed, sweep, gap, flip, surface as a verb, flag as a verb, gate/gated, sits, cheap, entirely, turns out, clobber, delve, leverage, utilize, seamless, crucial, showcase. The full list is at `~/.claude/skills/voice/references/banned-words.md`.
- **No "it's X, not Y"** negated contrast, and no setting up a wrong reading to knock it down.
- Plain and direct beats clever.

## Commits

Conventional commits. The subject can be descriptive, **the body must be under about 330 characters.**

`feat` bumps the minor version, `fix` the patch, `!` or `BREAKING CHANGE` the major. Use `content:` when publishing or editing posts, which is ignored by the release tooling so writing never moves the version.

Releases are manual, triggered from the Actions tab. Do not add automation that cuts a release on push.

No attribution lines, no co-author trailers, no gitmoji.

## Scope

Do not create summary files, plans, or notes unless asked. Do not add a dependency where a few lines will do. Do not build for a need nobody has stated yet.
