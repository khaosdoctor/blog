# Decisions

Two parts. **What needs you** is the list of things blocked on a decision only you can make — read that first and it
should be enough to pick the work back up cold. **What was decided** is the record of calls already made and why, so
nothing gets relitigated by accident.

Design decisions and their open questions live in `docs/design.md`, which is kept short deliberately. The long-form
reasoning behind the visual direction is in `docs/theming.md`.

---

## What needs you

Nothing here is blocking a build. Everything works today; these are choices that were made provisionally, or that
nobody but you can make.

### 1. Rewrite the section descriptions

`content/categories.json` describes each section, keyed by category then locale (`pt`, `en`). The text in there now is
**mine, written in an impression of your voice**, in both languages. It renders on every section page and becomes that
page's meta description, so it is public-facing prose with your name on it.

A category with no entry falls back to a generated line, so deleting an entry is safe.

### 2. Pick the purple

`--brand-purple` is `#6b4fbb`, invented because quotes needed a purple and the brand has none. Quotes are the only
thing using it. Candidates, if you want alternatives: `#8a63d2` reads better faded on a dark page, `#5b3e99` is safer
against light text. Deferred to the full design pass, noted here so it does not become permanent by silence.

### 3. Two font questions the theming lab will put in front of you

The display face, and whether body copy goes monospaced too. `/theme-lab/` renders the candidates as real headings and
real paragraphs, because the open question is whether a pixel face survives 3000 words, not whether it looks good in a
specimen line. `docs/theming.md` has the reasoning; the licences matter, since this repo goes public and a
share-alike face carries obligations that an OFL one does not.

### 4. Cover and OG image layout

Still unstarted. You bake the post's title into the cover image because it lifts read-through, so covers are per
locale: `cover.pt.png` and `cover.en.png`. What the card carries besides the title, and how a 90-character title
behaves, are open. The generator exists (`npm run cover`).

### 5. Where reader settings live

Two settings now exist with nowhere to sit: keeping pinned hover previews after the tab closes, and the code theme.
The code theme found a home on every code block. The pinned-preview toggle has not. It needs a settings surface, which
probably means the footer, which does not exist yet in the new design.

### 6. Small ones

- Should the code language chip still show when a filename tab is already present? Both currently render.
- Which of your other domains count as "internal" for the link icon. Only `lsantos.dev` is confirmed; everything else
  gets the external arrow.
- Monokai, Dracula and Snazzy ship only one variant each in Shiki's bundle. There is no light Dracula to pair with the
  dark one without adding a theme package.

### 7. Yours to do, not mine

- Test the Obsidian authoring flow end to end: write a post in the vault, publish it, confirm it lands.
- Standalone pages (about, uses, whatever else) and where the author link points. You decided the personal site lives
  outside this repo; the byline currently points at `lsantos.dev`.
- Seven media files in `.migration/unreachable-media.md` that no source still has. Two are genuinely gone (a
  memegenerator image, one HarperDB Studio screenshot); the rest may respond to a browser when they refused a script.

---

## What was decided

Newest first.

### Lazy-loading the code themes: planned, then dropped

All 14 themes cost 35.6 KB raw, **6.2 KB gzipped**, measured, not estimated. The plan — a build-time integration
emitting one stylesheet per theme, injected on demand, cached by the service worker — was proportionate against the
15–20 KB the list was assumed to cost, and is not proportionate against 6.2 KB. Dropped, with the reasoning in
`docs/design.md`. Revisit if the list grows several times over.

Also rejected on its own merits: holding the CSS in `localStorage`. Applying it means injecting a `<style>` from the
blocking head script, so every page load pays a synchronous read of tens of kilobytes before first paint, and the CSS
then sits outside normal cache invalidation with nothing to clear a stale copy. A `<link>` to a hashed asset already
serves from cache with no network on a repeat visit.

### Category descriptions: one file, category as the root key

`content/categories.json`, shaped `{ "javascript": { "pt": "…", "en": "…" } }`. A flat string still means Portuguese
only.

The alternative — language as the root key, or one file per language — loses on the failure mode that actually
happens: you rewrite one language and the other quietly rots. With the category as root, both sit on adjacent lines,
so editing one puts the other in your eye. Language-root wins when you add languages often; you have two. Seven
categories means adding a third language is seven small edits, once.

Not i18n keys either: these are prose you write and rewrite, and prose belongs in `content/` where you edit it, not in
a TypeScript table of interface labels.

### Epigraphs removed entirely

They were quotes under another name. A quote with an author is now `> [!quote] Author Name`, an Obsidian callout, which
renders natively in the vault and needs no component. The `Epigraph` component, both frontmatter fields and their
styles are gone. Nothing in the content used them except the lab page.

### Captions come from the markdown title only

Never from alt text. The two say different things: a caption is text everyone reads, alt text describes the image for
someone who cannot see it. Falling back to alt when there was no title gave every image with alt text a caption that
was really a description.

### Version: commits since the last tag

`0.0.1+42`, as semver build metadata. It used to count posts published since the tag, which left every change that was
not a post invisible. Tags stay hand-cut for releases that mean something. With no tag yet, it counts from the root
commit so the number moves immediately.

### Footnotes: margin on wide screens, foot of the post on narrow ones and on paper

Above 70rem the note is read in the margin and the foot-of-post section is hidden; hovering the reference raises a
card. Below that, no aside and no card — the ordinary numbered list at the foot of the post, which is the boring thing
that always works, especially on a touch screen. Printing gets the same list and hides the aside, so paper carries
exactly one copy. The breakpoint lives in one custom property that the script reads at runtime, so the CSS and the JS
cannot drift.

### Interactive demos are automatic

`<LabDemo src="./components/Counter.vue" client:visible />` and `<HtmlLab src="./components/x.html" title="…" />`. The
component lives in a `components/` folder beside the post. A remark plugin resolves the path, reads the file, injects
the import the client directive needs, and emits the source as an ordinary code block — so it is highlighted by the
same pass as every other block on the site and follows the reader's theme choice. A typo in `src` fails the build.

### Astro 7 deprecation of `markdown.remarkPlugins`: deliberately not migrated

Every build warns that `remarkPlugins`, `rehypePlugins` and `remarkRehype` should move to `unified({...})`. The whole
content pipeline rides on those arrays.

Not migrated, because `astro-mermaid` appends its own rehype plugin to `markdown.rehypePlugins` from inside its
integration hook. Moving our side to `unified()` risks its plugin landing in an array nothing reads any more, which
fails as a diagram silently rendering as a code block rather than as an error. The deprecated form still works in 7.x.

Do it when `astro-mermaid` supports `unified()`, or when Astro 8 forces it. The check afterwards is the lab page: it
has a mermaid diagram and LaTeX, so a broken pipeline is visible in one screenshot.

### Callouts had no stylesheet

`rehype-callouts` emits the markup and the icons but ships its themes as opt-in CSS that nothing imported. All five
callout types rendered as plain paragraphs with a stray title line, in every post, since the day the plugin went in.
Found by building the lab page, which is the argument for having it. Now on the Obsidian theme, matching the
vocabulary the posts are written in — the GitHub theme only knows five types.

### Canonical URLs point here

Every post is canonical to `blog.lsantos.dev`, including the ones that appeared on Medium or dev.to first. The traffic
stays here.

### Translation layout: the folder is the pairing

A translation lives in its source post's folder, named after its own slug, with `lang` deciding the language and an
optional `slug` overriding the URL. `content/translated/` is gone, and so is `translationOf`. One collection, one
schema. Images are `./image.png` for both languages because they are in the same folder.

### Eight posts already had an English original

Eight posts were written in English first and translated to Portuguese, not the other way round. Those use your own
English text rather than a machine translation of the Portuguese, and are marked `machineTranslated: false`.

### Theme tokens

Every colour, font stack, size and duration lives in `src/styles/theme.css`. Two font stacks on purpose:
`--font-display` is where an 8-bit face goes, `--font-body` stays readable for a 3000-word article.
