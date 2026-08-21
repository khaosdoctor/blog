# Working in this repo

Read `docs/architecture.md` before changing anything. It explains the content model, and most mistakes here come from not knowing it.

## The things that break if you do not know them

**Posts are `.mdx` files containing plain markdown.** Never an import. `remark-embeds`, `remark-figures` and `remark-lab-demos` turn ordinary markdown into components at build time, and the component set is injected into every post, so the handful of tags markdown has no syntax for (`<Video>`, `<Sidenote>`, `<MarginNote>`, `<LabDemo>`, `<HtmlLab>`) are written bare. This is deliberate: `content/` is an Obsidian vault, Obsidian renders almost none of that, and writing in Obsidian is the point of the whole rebuild. Do not "modernise" the rest of a post back into components.

**A `.md` post silently loses content.** The plugins emit MDX nodes, and the plain markdown pipeline drops them without an error. Posts must be `.mdx`, translations included. That is why the translation guard, not the file extension, is what stops model-written code.

**One folder is one article, in every language.** `content/blog/<folder>/index.mdx` is the source; any other `.mdx` in that folder is a translation, identified by its `lang` and given its own URL by `slug`. The folder is the pairing, which is where `hreflang` comes from, so there is no field to keep in sync. Images are `./image.png` from either file.

**Post URLs are frozen.** Every slug came from six years of Ghost and is linked from elsewhere. Route paths are English (`/search/`, `/tags/`, `/series/`), Portuguese post slugs are whatever was written. Never rename a post folder. English lives under `/en/` with an English slug.

**Never ask the clock twice.** `PUBLISH_CUTOFF` in `src/lib/posts.ts` is the one instant a build calls now. Astro settles the route table before rendering, so a second `new Date()` can list a post whose page was never generated.

**The build fetches only its own media.** `prebuild` runs `scripts/vendor-media.ts`, which downloads any remote image a post references into the post folder and rewrites the reference, so the site stops depending on other people's servers. It never fails the build. Nothing else in the build touches the network: bookmark and tweet metadata come from `content/bookmarks.json`.

**One line adds an embed host.** `src/lib/embed-hosts.ts` feeds both the CSP meta tag and the output guard. Never derive it from build output.

**A lab component's styles are CSS modules, never `scoped` or bare.** `<style module>` and `:class="$style.x"` in the template, nothing else: `astro.config.mjs` renames every class to `Component__class__hash`, so a `scoped` block keeps a literal name that is one dev-server leak away from styling the whole page. `scripts/check-component-css.ts`, part of `npm run check`, fails the build on a non-module style block, a selector with no class in it, and a static `class="x"` the renamer orphaned.

**`scripts/migrate/` and `.migration/` are untracked on purpose.** One-shot Ghost tooling. The MDX is the source of truth now.

**A retired lab candidate is archived, never deleted.** The labs at `/lab/` and `/theme-lab/` are the raw material for an article the owner intends to write about how the redesign was decided, so a candidate losing a decision is still worth keeping: the rejected options are the argument. When a decision is made, move the candidate's component and its explanatory prose into `content/blog/theme-lab-arquivo/`, a `noindex` post that exists to keep retired candidates rendering, and take it out of the live lab post so that page only shows what is still undecided. Move it there rather than copying it to an archive folder outside `content/`: a component under `content/blog/<post>/components/` still builds and still runs, while a copy parked outside `content/` is dead code that will rot without anyone noticing. Do not create that post until the first candidate actually retires.

## Before you finish

Run these, in order:

```
npm run check
npm run build
node scripts/check-output.ts
```

`npm run check` is `astro check`, `tsc -p worker`, `scripts/check-i18n.ts` and `scripts/check-component-css.ts`, in that order. The build strips types without checking them, so a wrong i18n key or prop ships as the literal string `undefined` in the page.

`check-output.ts` fails on a published post with no page, leftover Ghost markup, an unrendered component tag, a missing feed or manifest icon, an image that never reached the output, and any remote-script loader pattern. That last check exists because the old Ghost site served an injected script for a month before anyone noticed. Do not weaken it.

## Writing

The author is strict about prose, in code comments as much as anywhere else.

- **Comments are rare and say why, never what.** Only comment code a reader would otherwise stop at. Rationale belongs in `docs/`, not in a block above a function.
- **Never comment your own reasoning.** What you tried, what the browser reported, which property was overriding which, why the previous attempt failed: none of that belongs in the file. A comment that would read as a changelog entry, a debugging note, or an explanation addressed to the person who asked for the change is not a comment, it is a message in the wrong place. If a declaration genuinely needs defending, one short line about the code as it is. Otherwise nothing.
- **No em-dashes.** Anywhere. Use a comma, parentheses, or a new sentence.
- **Banned words**, in code and prose alike: land/lands/landed, sweep, gap, flip, surface as a verb, flag as a verb, gate/gated, sits, cheap, entirely, turns out, clobber, delve, leverage, utilize, seamless, crucial, showcase.
- **No "it's X, not Y"** negated contrast, and no setting up a wrong reading to knock it down.
- Plain and direct beats clever.

## Commits

Conventional commits. The subject can be descriptive, **the body must be under about 330 characters.**

`feat` bumps the minor version, `fix` the patch, `!` or `BREAKING CHANGE` the major. Use `content:` when publishing or editing posts, which is ignored by the release tooling so writing never moves the version.

Releases start by hand, from the Actions tab: release-please opens a release PR, and merging it cuts the tag. `release.yml` does carry a `push` trigger, but it only matches that merge commit. Do not widen it so an ordinary push cuts a release.

No attribution lines, no co-author trailers, no gitmoji.

## Scope

Do not create summary files, plans, or notes unless asked. Do not add a dependency where a few lines will do. Do not build for a need nobody has stated yet.
