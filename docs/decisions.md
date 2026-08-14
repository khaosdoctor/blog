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

### 1. Pick the body face

The only type question left. Display and subtitle are decided and already applied site-wide (see **What was decided**);
body copy is still the placeholder serif stack.

`/theme-lab/`, section 01, renders every candidate as a real multi-paragraph Portuguese passage at the actual body size,
because the question is whether a face survives 3000 words rather than whether it looks good in a specimen line. What is
on the table:

- **IBM Plex Mono** reads well but is monospaced, and you flagged the real risk yourself: on a blog about code, a
  monospaced body face and inline code stop being distinguishable.
- **Handjet at 22px with ~0.03em extra letter-spacing**, which is the only size it works at. Below that it closes up.
- **Five non-pixel faces**, newly vendored so there is a normal book face to compare against: Inter, Roboto,
  Source Serif 4, Literata, Atkinson Hyperlegible. All OFL or Apache-2.0, all self-hosted, all with full accent
  coverage for Portuguese.

The rejected pixel faces keep their names in `docs/theming.md` because you said you want them for something else.

### 2. Pick a cover candidate

Three candidates are built, in `/theme-lab/` section 04, from your three descriptions:

1. **Janela DOS.** Black ground, double ANSI inset border with real space between the two frames, brand colour picked
   per post, kicker and byline in that same colour, title ending in `.` plus a solid block cursor.
2. **Sem moldura.** No border, the whole card in one brand colour, one thin rule from the left edge to about 75% of the
   width between kicker and title.
3. **Plasma.** A seeded field, unique per post, with a hard offset shadow behind the letters so the art never eats the
   title.

Each is an SVG at the real 1200×630, so whichever you pick ports into the generator without being redrawn. One thing
was decided for you: the "random" colour and seed are derived from the post slug rather than being actually random,
because a cover that changes on every build churns git and breaks social-card caches. Same post, same cover, forever.

The existing `scripts/cover.ts` is the old path: it calls Replicate for an AI background and hands off to an external
Deno service. All three candidates are drawn locally from geometry and text, so picking any of them retires that
script, the API token and the external dependency, and makes covers work offline like the rest of the build.

### 3. Where the pinned-preview toggle lives

The footer does exist, contrary to what this file said before: it carries your name, the version link, and now the
typeface credits. So the only thing still homeless is the **pinned-hover-preview toggle**. The code theme found its home
on every code block; this one has nowhere to go, and a footer full of links is not obviously the right place for a
checkbox. It may want a small settings popover of its own, reusing the pattern the code-theme picker already uses.

The PxPlus attribution that was listed here is done, in the footer, in both languages.

### 4. Small ones

- Should the code language chip still show when a filename tab is already present? Both currently render.
- Which of your other domains count as "internal" for the link icon. Only `lsantos.dev` is confirmed; everything else
  gets the external arrow.
- Monokai, Dracula and Snazzy ship only one variant each in Shiki's bundle. There is no light Dracula to pair with the
  dark one without adding a theme package.

### 5. Yours to do, not mine

- Test the Obsidian authoring flow end to end: write a post in the vault, publish it, confirm it lands.
- Standalone pages (about, uses, whatever else) and where the author link points. You decided the personal site lives
  outside this repo; the byline currently points at `lsantos.dev`.
- Seven media files in `.migration/unreachable-media.md` that no source still has. Two are genuinely gone (a
  memegenerator image, one HarperDB Studio screenshot); the rest may respond to a browser when they refused a script.

---

## What was decided

Newest first.

### The palette: OLED black and NieR sepia

`--bg` is `light-dark(#f4efe0, #000000)`.

Dark is true `#000000`, not a very dark grey, because on an OLED panel those pixels are switched off and that is the
whole reason to ask for pitch black. You wanted a hint of purple in it; that hint went into `--rule` (`#2b1f42`) and
into the quote tints instead, because a `#05000b` page reads as black on every screen while giving up the one thing
black buys. Moving it into the page itself is one value if you want it there anyway.

Light is a faded sepia from NieR Automata's family rather than paper white. Its own ink is warm (`#332d23`) because a
cool near-black on a warm ground reads as a mistake. NieR's real background is `#c8c3b4`, which is a game HUD and too
dark to hold 3000 words, so this is that hue lightened until it works as a reading surface.

Every value was measured rather than eyeballed: `--fg` 11.9:1 light and 15.4:1 dark, `--muted` 5.2:1 and 8.3:1,
`--accent` 6.1:1 and 10.8:1, both rules at 1.28 and 1.38. `--accent` deepened to `#1a5c96` in light mode because the
brand blue at `#0578be` was 4.12:1 on the sepia, under the minimum. `--table-edge` now points at `--fg` rather than
repeating two hexes that were `--fg` before this change.

The two places that cannot read a token, and so have to be edited by hand next time: the `theme-color` meta pair in
`BaseLayout.astro` and `background_color`/`theme_color` in `src/lib/manifest.ts`.

### The purple: the old theme's own

`--brand-purple` is `#4b15a8`, lifted from the live Ghost site, where it was the accent over a near-black purple
background (`#080016`, with `#210a47` and `#2f0f67` as the steps above it). The invented `#6b4fbb` is gone.

It is 9.3:1 on the sepia page and 1.97:1 on the black one, so nothing uses it raw on dark: the quote tokens mix it
toward white first, which comes out at 3.96:1, over the 3:1 a border needs and without becoming a neon the rest of
this palette does not have.

### Display face: Departure Mono. Subtitle face: PxPlus IBM VGA8

Both applied site-wide, self-hosted, declared in `src/styles/fonts.css` (the site's own two faces) rather than in the
lab's font file, which stays a menu of candidates and loads on that page alone.

Headings are Departure Mono at weight 400, because the face ships one weight and asking for bold gets a synthesised
smear. Being monospaced, a heading is wider than the same words in the body face and a long `h2` wraps sooner, which is
a consequence of the choice rather than something to correct.

Post excerpts and section descriptions are PxPlus IBM VGA8 at a flat `16px`, not a rem step. It is a 9×16 bitmap traced
to outlines, so it is crisp at 16px and whole multiples of it, and muddy at 14px or 18px where its pixels straddle
device pixels.

**One obligation came with that second choice, and it is handled.** PxPlus IBM VGA 9x16 is **CC BY-SA 4.0** (VileR, The
Oldschool PC Font Resource), unlike every other face here, so a credit line has to be reachable from the site. It is now
in the footer on every page in both languages, crediting Departure Mono alongside it even though OFL asks for nothing.

The other half of that licence is a standing constraint rather than a task: **the file must never be subset or re-hinted
by a build step**, because a modified copy inherits the same share-alike terms. Anything added later to shrink the font
payload automatically has to skip this one file.

### Post component styles: CSS modules, enforced

Every Vue component inside a post uses `<style module>` and `:class="$style.x"`. The build renames each class to
`Component__class__hash` (the `generateScopedName` in `astro.config.mjs`), so a component class can never collide
with a global one — which `scoped` cannot promise: it keeps the literal class name and only appends an attribute
selector, and the dev server once injected one of those sheets unscoped, stretching every tag chip on the theme lab
page. `scripts/check-component-css.ts` runs in `npm run check` and fails on a non-module style block, a selector
with no class in it (CSS modules leave those global), or a static `class="x"` the renamer orphaned.

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
