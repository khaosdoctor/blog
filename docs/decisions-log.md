# Decisions log

The history of the choices already made and the reasoning behind each one, so nothing gets rediscussed by accident.
Newest first. Nothing here depends on you: whatever still does lives in `docs/decisions.md`, which stays short on
purpose.

In English, because these are settled decisions and the writing is better in English. `docs/decisions.md` stays in
Portuguese, since it holds only the open questions you still have to answer, and you read those faster in Portuguese.

---

## The palette: OLED black and NieR sepia

`--bg` is `light-dark(#f4efe0, #000000)`.

The dark mode is true `#000000`, not a very dark gray, because on an OLED panel those pixels turn off, and that is
the whole reason for asking for absolute black. You wanted a hint of purple in it; that hint went into `--rule`
(`#2b1f42`) and into the quote tones, because a page at `#05000b` reads as black on any screen and would give away
for free the one thing black buys. If you still want the purple in the page itself, it is a single value away.

The light mode is a faded sepia from the NieR Automata family, not paper white. Its ink is also warm (`#332d23`),
because a cold near-black on a warm background reads as a mistake. Worth knowing before copying the game's palette
directly: its actual background is roughly `#c8c3b4` with ink at `#4e4b42`, which is a HUD built to be read in
glances and is too dark to hold up over 3000 words. What was kept is the hue, lightened until it became a reading
surface.

All the values were measured, not eyeballed: `--fg` 11.9:1 in light mode and 15.4:1 in dark mode, `--muted` 5.2:1
and 8.3:1, `--accent` 6.1:1 and 10.8:1, and the two rules at 1.28 and 1.38.

Measuring caught a real problem: the brand blue at `#0578be` gives 4.12:1 against the sepia, below the minimum, so
light mode's `--accent` darkened to `#1a5c96`. A warmer background costs contrast against a cool accent, and the
math has to be redone rather than assumed whenever the background changes. `--table-edge` now points to `--fg`
instead of repeating two hex values that were the old `--fg`, and `--em-bold-fg` (the ink for the bold chip over
the yellow) became `#332d23`, the warm ink, for 7.30:1.

The two places that cannot read a token, and therefore need to be edited by hand on the next palette change: the
pair of `theme-color` meta tags in `BaseLayout.astro` and the `background_color`/`theme_color` in
`src/lib/manifest.ts`.

## The purple: the one from the old theme

`--brand-purple` is `#4b15a8`, pulled from the Ghost CSS that is still live, where it was the accent over a
near-black purple background (`#080016`, with `#160731`, `#210a47` and `#2f0f67` as the steps above it). The
invented `#6b4fbb` is gone.

It gives 9.3:1 on the sepia page and 1.97:1 on the black one, so nothing uses it pure in dark mode: the quote
tokens mix it with white first, which comes out to 3.96:1, above the 3:1 a border needs, without turning into a
neon that the rest of this palette does not have.

The old theme's entire ramp is recorded in `docs/theming.md`, because that site stops existing once the DNS
switches over, and after that there will be nowhere left to pull these values from.

## Heading font: Departure Mono. Subtitle font: PxPlus IBM VGA8

Both applied across the whole site, hosted here, declared in `src/styles/fonts.css`. That file has only the two
decided fonts; the lab's fonts file remains a menu of candidates and loads only on that page.

Headings use Departure Mono at weight 400, because the font has only one weight and asking for bold makes the
browser synthesize a blur. Being monospaced, a heading ends up wider than the same words in the body font, and a
long `h2` wraps sooner, which is a consequence of the choice and not something to fix.

The rule lives in exactly one place, global, in `BaseLayout.astro`. The first attempt scoped it to `article`, and
testing in the browser showed the home page and section pages still rendering in serif: their headings are not
inside any `article`, and the listing headings are not even a heading element, they are a bare `<a>`, so
`PostList.astro` sets the font on its own.

Post and section descriptions use PxPlus IBM VGA8 at a fixed `16px`, not a rem step. It is a 9x16 bitmap traced
into outlines, so it stays sharp at 16px and at whole multiples of it, and blurs at 14px or 18px, where its pixels
land on fractions of a screen pixel.

**This second choice came with an obligation, and it is already fulfilled.** PxPlus IBM VGA 9x16 is **CC BY-SA
4.0** (VileR, The Oldschool PC Font Resource), unlike every other font here, so the attribution has to be reachable
from the site. It is in the footer of every page, in both languages, with a real i18n key, and it credits
Departure Mono alongside it even though the OFL requires nothing.

The other half of that license is a permanent restriction, not a task: **the file can never be subsetted or
re-hinted by a build step**, because a modified copy inherits the same share-alike terms. Anything added later to
automatically shrink font weight has to skip this file.

## Cover images: seed derived from the slug

This applies to whichever candidate wins. The color and pattern of each cover come from a hash of the post's slug,
never from `Math.random()`, so the same post generates the same cover forever. The opposite would dirty git on
every build and invalidate social platforms' card caches, which keep the image by URL.

## Small ones, all answered

- **Language label on code blocks**: keeps showing up always, even when the block also shows the tab with the file
  name, for consistency. The repetition of `server.ts` plus `ts` is acceptable.
- **Internal domains** for the link icon: `lsantos.dev` and `lsantos.me`, both yours, in
  `src/styles/prose/links.css`.
- **Dark-only code themes**: Monokai, Dracula and Snazzy can stay dark-only. The selector already handles it.
- **Author page and external links**: out of scope for now. The byline shows the name without a link. The parser
  in `src/lib/authors.ts` still understands `Name <https://site>`, so linking it again later requires no rewrite.

## Post component styling: CSS modules, with a guard

Every Vue component inside a post uses `<style module>` and `:class="$style.x"`. The build renames every class to
`Component__class__hash` (`generateScopedName` in `astro.config.mjs`), so a component class cannot collide with a
global one. `scoped` does not give that guarantee: it keeps the class's literal name and only adds an attribute
selector, and the dev server once injected one of those sheets without scoping, stretching every tag chip on the
lab page.

`scripts/check-component-css.ts` runs in `npm run check` and fails on three cases: a style block that is not
`module`, a selector with no class at all (CSS modules leaves those global, which is worse than `scoped`), and a
static `class="x"` that the renamer left orphaned.

A related trap, found afterward: a component that overrides the color of a `strong` inherits the bold chip's
yellow background and loses its dark ink. On the lab page this produced near-white text on yellow, 1.37:1. The
rule is to never touch `strong`'s color inside a post.

## Loading code themes on demand: planned and dropped

The 14 themes cost 35.6 KB raw and **6.2 KB compressed**, measured and not estimated. The plan, a build
integration emitting one sheet per theme, injected on demand and cached by the service worker, was proportionate
against the 15 to 20 KB the list supposedly cost, and is not proportionate against 6.2 KB. Dropped, with the
reasoning in `docs/design.md`. Revisit if the list grows several times over.

Also rejected, on its own merits: storing the CSS in `localStorage`. Applying it means injecting a `<style>` from
the header's blocking script, so every load pays for a synchronous read of tens of kilobytes before first paint,
and the CSS falls outside normal cache invalidation, with nothing to clear a stale copy. A `<link>` to a hashed
file is already served from cache with no network on a second visit.

## Category descriptions: one file, category as the root key

`content/categories.json`, shaped as `{ "javascript": { "pt": "…", "en": "…" } }`. A bare string still counts as
Portuguese only.

The alternative, language as the root key or one file per language, loses on the failure mode that actually
happens: you rewrite one language and the other rots silently. With the category at the root, the two sit on
neighboring lines, so editing one puts the other in view. Language at the root wins when you add languages all the
time; you have two. With seven categories, adding a third language is seven small edits, once.

It is also not an i18n key: this is prose you write and rewrite, and prose lives in `content/`, where you edit it,
not in a TypeScript table of interface labels.

## Epigraphs removed for good

They were quotes under another name. A quote with an author is now `> [!quote] Author Name`, an Obsidian callout,
which renders natively in the vault and needs no component. The `Epigraph` component, its two frontmatter fields,
and their styles are gone. Nothing in the content used them, other than the lab page.

The name survives on purpose in one place: the `RETIRED_COMPONENT_NAMES` list in `src/lib/mdx-component-names.ts`,
next to `Figure` and `CourseCTA`. It is the guard reminding that these names were retired, so one of them
reappearing in a post becomes a build error instead of a silently ignored tag.

## Dead image becomes a card, not a broken `<img>`

Two images from the migration do not exist anywhere, and an `<img>` tag pointing at them would show the browser's
broken-image icon on published posts. Instead: the dead URLs are listed in `content/dead-images.json`,
`remark-figures.mjs` checks each image against that list, and the ones that match render `MissingImage.astro`, a
card that keeps the caption, states in the post's language that the image was lost, and preserves the original URL
as text.

The point is that the post stays readable and honest about what is missing, instead of looking broken. If the
image is ever recovered, deleting the line from the JSON is enough.

## One place for the MDX component names

`src/lib/mdx-component-names.ts` is the single source for two lists: the components a post can use and the ones
that were retired (`Epigraph`, `Figure`, `CourseCTA`).

This exists because of a real bug: three different places had their own regular expression with the list of names
(`markdown-twin.ts`, `check-output.ts` and `check-translations.ts`), and the three had already diverged. Two still
cited components that no longer existed and none knew about all the ones that did, so a `<LabDemo>` tag leaked
into the generated markdown with no guard complaining. Now all three import from the same file, and adding a
component means editing one array.

## Caption comes only from the markdown title

Never from the alt text. The two say different things: the caption is text everyone reads, and the alt describes
the image for whoever cannot see it. Falling back to alt when there was no title gave every image with alt text a
caption that was actually a description.

## Version: commits since the last tag

`0.0.1+42`, as semver build metadata. Before, it counted published posts since the tag, which kept every change
that was not a post invisible. Tags are still cut by hand, for releases that mean something. With no tag yet, the
count starts from the root commit, so the number is already moving.

## Footnotes: in the margin on wide screens, at the bottom of the post on narrow ones and on paper

Above 70rem the note is read in the margin and the footer section of the post stays hidden; hovering the reference
raises a card. Below that, no aside and no card: the ordinary numbered list at the bottom of the post, which is
the plain thing that always works, especially on touch screens. Print gets the same list and hides the aside, so
the paper copy carries exactly one version. The breakpoint lives in a single custom property that the script reads
at runtime, so the CSS and the JS cannot diverge.

## Interactive demos are automatic

`<LabDemo src="./components/Counter.vue" client:visible />` and `<HtmlLab src="./components/x.html" title="…" />`.
The component lives in a `components/` folder next to the post. A remark plugin resolves the path, reads the file,
injects the import the client directive needs, and emits the source code as an ordinary code block, so it gets
highlighted by the same step as every other block on the site and follows whichever theme the reader picked. A
wrong `src` breaks the build.

## Deprecation of `markdown.remarkPlugins`: migrated, and an earlier version of this entry named the wrong target

**Done.** `astro.config.mjs` now passes both plugin arrays into `unified({ remarkPlugins, rehypePlugins })` from
`@astrojs/markdown-remark`, set as `markdown.processor`. Every plugin kept its order and its own options; nothing
in `src/lib/` or `content/` changed.

**A previous version of this entry said Astro 7 wants `satteri()`. That was wrong**, and it is worth correcting here
rather than leaving it to be rediscovered. Astro's own deprecation notice (the `@deprecated` tag on both
`markdown.remarkPlugins` and `markdown.rehypePlugins` in `node_modules/astro/dist/types/public/config.d.ts`) says to
pass the plugins to `unified({ ... })` from `@astrojs/markdown-remark` and set that as `markdown.processor`, not to
`@astrojs/markdown-satteri`. Sätteri's processor takes `mdastPlugins` / `hastPlugins`, typed against its own plugin
shape, a different API from remark/rehype's `remarkPlugins` / `rehypePlugins`. Moving to it would mean rewriting
every one of this repo's remark and rehype plugins, not reusing them as-is.

`astro-mermaid@2.1.0` proves the two processors are not interchangeable, not just differently named: it ships a
`remarkMermaidPlugin` / `rehypeMermaidPlugin` pair for the `unified()` branch and a separate `satteriMermaidPlugin`
for the Sätteri branch (`node_modules/astro-mermaid/astro-mermaid-integration.js`), and reads
`config.markdown.processor.name` to decide which pair to add its own plugin to.

The original reason not to migrate was real at the time, then stopped applying: astro-mermaid added its rehype
plugin to `markdown.rehypePlugins` from inside its own integration hook, and moving our side risked its plugin
falling into an array nobody reads anymore, a failure that shows up as a diagram silently rendering as a code
block, not as an error. Once astro-mermaid started reading `processor.name` itself and supporting `unified()`
directly, that risk was gone, which is what made this migration safe to do.

**Verified**: `npm run check` clean. Page output for `/theme-lab/`, `/lab/` and `/error-cause/` compared before and
after the change, with identical counts for katex (6, 8, 6), callouts (184), footnote sidenotes (108), heading
anchors (72), figures (74), and a byte-identical `<pre class="mermaid">graph TD` marker. Not verified: that mermaid
actually renders as an SVG in a real browser, since that happens client-side.

## The callouts had no stylesheet

`rehype-callouts` emits the markup and the icons, but ships its themes as optional CSS that nobody imported. Every
callout type rendered as a plain paragraph with a stray title line, in every post, since the day the plugin was
added. Discovered while building the lab page, which is exactly the argument for it existing. Now on the Obsidian
theme, which matches the vocabulary the posts are written in; the GitHub theme knows only five types, and anything
else would go back to a blockquote with a stray line.

## Canonical URL points here

Every post is canonical to `blog.lsantos.dev`, including the ones that first appeared on Medium or dev.to. The
traffic stays here.

## Translation layout: the folder is the pairing

A translation lives in the original post's folder, named with its own slug, with `lang` deciding the language and
an optional `slug` overriding the URL. `content/translated/` is gone, and so is `translationOf`. One collection,
one schema. Images are `./image.png` for both languages, because they are in the same folder.

## Twelve posts already had an English original

It was eight when this was written and is twelve today: the four imported from dev.to were also born in English.
These posts were written in English first and translated into Portuguese, not the other way around, so they use
your own English text instead of a machine translation of the Portuguese, and are marked with
`machineTranslated: false`.

The correct number comes from `grep -rl 'machineTranslated: false' content/blog/ | wc -l`, which is more reliable
than this paragraph if you import more posts later.

## Theme tokens

Every color, font stack, size and duration lives in `src/styles/theme.css`. Three purposeful font stacks:
`--font-display` (Departure Mono, decided), `--font-subtitle` (PxPlus IBM VGA8, decided) and `--font-body`, which
just needs to stay legible for a 3000-word article and is the only one still open.

The fonts are all hosted here, in `public/fonts/`, because the site's CSP is `font-src 'self'` and a link to
Google Fonts gets blocked outright. The licenses are in `public/fonts/LICENSES.txt`.

## The outline is a pinned panel in the left margin

Every post carries `PostToc`, built from the headings Astro already collected while rendering, so it cannot
disagree with the ids the heading anchors use. h1 is out (it is the page, not a section), anything below h4 is out,
and the generated footnotes heading is out. A post with fewer than two headings shows nothing.

The frame is a 3px `double` border rather than box-drawing characters: the ANSI look without a monospace grid to
maintain, which also survives a font change. Full black on the sepia page and full white on the dark one, which is
the one place on this site that ignores the muted greys, because chrome that fades into the page is chrome the
reader has to hunt for. The line the reader is inside is painted edge to edge in the inverse.

Where the reader is comes from the last heading above a 120px line, not an `IntersectionObserver`: a long section
whose heading has scrolled far off the top intersects nothing while still being the section the reader is in.

Below 78rem there is no free margin to pin anything to, so the panel becomes a handle at the bottom left and opens
over the corner. Section jumps ease (`scroll-behavior: smooth` on `:root`), but only for readers who have not asked
for reduced motion.

## Body copy is two faces, and the column follows the face

Literata is the default (18px, 163% leading, 0.05em letter spacing, 0.15em word spacing) and Atkinson Hyperlegible is
the sans (20px, 153% leading, no letter spacing). Both were chosen against a real post inside the lab panel, not against
clean sample paragraphs, and each keeps the measurements it was chosen with: switching family alone would compare them
wrongly, because Atkinson at 18px reads smaller than Literata at 18px.

The sizes are written in rem (1.125rem, 1.25rem), not the 18px and 20px that were picked. An absolute body size
overrides the reader's own browser font setting, and at the default 16px root these rem values are exactly the numbers
chosen.

`--font-body` is whichever face is active, so no rule on the site had to change. `data-body-face="sans"` on `<html>`
switches; the preferences menu will be what writes it.

Antialiasing was off (`-webkit-font-smoothing: none`), on the argument that smoothed type beside a traced bitmap
heading reads as two different eras. **That was reversed after reading the site on a 1x monitor**, and the token is
`antialiased` now. With smoothing off every stem rounds up to a whole device pixel, so the same page that looks pixel
sharp at 2x comes out heavy and blocky at 1x, and which monitor the reader owns is not something this design gets to
pick. Grayscale rather than the platform default, which keeps the type lighter than subpixel rendering does.

A resolution query was tried first, keeping `none` above 1.5dppx and smoothing only the 1x case. It was dropped: two
different renderings of the same page is a harder thing to reason about than one, and the pixel era is already carried
by the faces themselves.

The lab also used `filter: contrast(100.00001%)` to force the unsmoothed effect in more engines, and that must never
reach the site: a filter makes its element the containing block for every fixed descendant, which would unpin the
outline panel, the progress bar and the sidenotes at once.

The column is 78ch. In `ch`, not pixels, so it follows the active face, and the two differ more than they look:
Literata's zero is 0.578em and Atkinson's is 0.648em, so 78ch is about 812px in the serif at 18px and about 1010px in
the sans at 20px. That is exactly why `PostToc` measures the room left of the article instead of using a width
breakpoint. A breakpoint would be right for one face and would put the panel on top of the text in the other.

The thirteen rejected faces live in `content/blog/theme-lab-arquivo/`, each with the reason it lost. The one that
matters: IBM Plex Mono was the favourite and lost on the first inline code span, because in a monospaced body a code
span stops being distinguishable from the prose around it.

## The outline is placed from the article's box, never from `--measure`

Worth writing down because it cost two rounds of verification. `--measure` is in `ch`, and `ch` resolves against the
font of whatever element reads it, so the same `78ch` is 936px inside the monospace outline panel and 1014px on the
article in the sans body face. Positioning the panel from its own reading of the token put it 39px too far right and
printed the frame over the first characters of the text for anyone using the sans. In the serif the identical mistake
ran the other way and handed out 39px of accidental clearance, which is why it looked correct.

The panel now takes its position from `article.getBoundingClientRect().left`, which is the only number that is right in
both faces, and `--measure` appears nowhere in its CSS.

The second half of the same bug: a face switch reflows the column in two passes about 100ms apart, the new size first
and the new font's metrics second. Anything that counts frames reads the intermediate width (858px on the way from
780px to 1014px) and keeps it. A `ResizeObserver` on the article fires on each settled pass instead, so the last thing
it sees is the final layout. The window `resize` listener stays alongside it: past the measure the column stops growing
while the room beside it keeps shrinking, and the observer never fires for that.

## Chip ink mixes toward the readable end of the page, not always toward black

`--chip-ink` in `src/styles/chips.css` is each chip's own colour carried toward whichever end of the page is
readable: black on the sepia page, white on the black one. Both directions used to mix toward black, so on the dark
page the ink moved toward the background instead of away from it. The brand red chip is where this showed: 2.71:1
against black to start, 2.82:1 after the old mix, a red outline with something unreadable inside it. The frame and
the hover fill now read `--chip-ink` too, rather than the raw brand colour, which is also why the purple chip stops
drawing a 1.97:1 border on black.

Measured in oklab, the same space the browser mixes in. Dark: blue 8.27, green 11.59, yellow 14.21, red 8.12,
purple 5.19. Light: blue 10.45, green 7.24, yellow 5.70, red 10.69, purple 15.12. Worth noting: the old light mix,
at 78% toward black, left green at 4.23 and yellow at 3.11, both under the 4.5 minimum, so light mode was quietly
failing the same test, just less visibly than dark.

## The outline's title reads at full ink, and its last section claims the highlight at the end of a post

Two fixes to `PostToc.astro`, both found by reading the built page rather than the code.

The title was 0.66rem at 75% opacity. Departure Mono ships one weight only, so alpha was the only thing making the
label read lighter than the rest of the panel, and the result was a ghost of the title rather than a lighter
version of it. It is now 0.75rem at full ink, matching the panel's own inverse-video convention (full black on
sepia, full white on dark).

Second: `update()` picks the current section by testing each heading's position against a 120px reading line, the
last heading whose top has crossed that line. A post whose final section is shorter than the remaining scroll room
finishes the page before that heading ever crosses the line, so the outline stayed on an earlier section for the
rest of the article. `update()` now also checks whether the document is scrolled to its end
(`scrollHeight - innerHeight - scrollY <= 2`) and, when it is, forces the last section current regardless of where
its heading falls.

## Theme toggle: an explicit light, dark or system choice, stored as one attribute

New `ThemeToggle.astro` plus `src/scripts/theme-toggle.ts`, placed in the header next to `LangSwitcher`, where the
planned preferences popover (see `docs/design.md`) will also go.

Three choices: light, dark, system. System is the default and means exactly today's behaviour: no attribute on
`<html>`, nothing in `localStorage`. An explicit choice is stored under the `color-scheme` key and applied before
first paint by a blocking script in `BaseLayout`'s `<head>`, the same shape as the code-theme picker's; the script
sets `data-theme` on `<html>`, and `theme.css` narrows the `color-scheme` property from `light dark` down to one
keyword. Every existing `light-dark()` token keeps resolving against that same property, unmodified, so no palette
value changed for this feature.

`BaseLayout` ships two hardcoded `<meta name="theme-color">` tags, one per `prefers-color-scheme` value, because a
meta tag cannot read a CSS custom property. Those two tags cannot agree with an explicit override on their own, so
`theme-toggle.ts`'s `syncThemeColor()` rewrites both to the resolved colour whenever the choice is explicit, and
restores their own per-scheme colour once the choice goes back to system.

The control renders `hidden` and is revealed only once `theme-toggle.ts` confirms it can run, the same
progressive-enhancement precedent `CodeTheme.astro` set first.

Four new i18n keys (`themeToggle`, `themeLight`, `themeDark`, `themeSystem`) in both language tables.
