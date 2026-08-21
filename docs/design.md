# Design

The plan, the shortlist, and what has already been decided. Kept short on purpose: the code is the detail.

## Direction

ASCII/ANSI, 8-bit, pixelated, terminal. Box drawing instead of borders where it reads well, uppercase labels,
section markers like `SECTION 00 / INDEX`, dashed rules, information dense over decorated.

References: [unix.foo](https://unix.foo), [xn--gckvb8fzb.com](https://xn--gckvb8fzb.com/),
[tramoia.sh](https://tramoia.sh). Motion was settled once as nearly absent, with the header logo mark as the only
exception; the Conway "game of life" background reopened that call rather than overriding it quietly (see Settled),
and kept the caution the original call was made with: reduced motion still freezes the field on one frame instead of
pausing it partway, a manual pause control still covers WCAG 2.2.2, and a reader can now push the OS preference in
either direction from the settings panel rather than only follow it. [textmode.js](https://code.textmode.art), the
WebGL2 library the original brief pointed at, lost the earlier, stricter version of this decision along with the
candidates that used it; it stays installed only because those retired candidates are kept working at
`/theme-lab-arquivo/`. Every live candidate, including the logo mark and the Conway background, is plain SVG, CSS,
canvas and DOM.

The same treatment covers the generated images: post covers, OG cards and any background art share the palette and
the pixel grid, so a share card looks like the site.

## Tokens

All of them live in `src/styles/theme.css`. Components reference roles (`--fg`, `--accent`, `--rule`), never the
brand hexes, and nothing else in the codebase hardcodes a colour, a font stack, a radius or a duration.

Palette, traced from the favicon: red, green, yellow, blue. Purple is taken from the old Ghost theme rather than the
favicon, which never had one. **Each colour now carries its own tone per ground rather than one hex shared by both**:
a single adjustment never held, since red needs about 6% darkening to clear 4.5:1 on the sepia ground and yellow needs
about 48%, eight times more. `--radius: 0` by default, because rounded corners fight a pixel grid.

The two page grounds are decided: **`#000000` in dark**, true black so OLED pixels switch off, with the hint of purple
in `--rule` instead of in the page; **`#f4efe0` in light**, a NieR Automata sepia with warm ink at `#332d23`.

| role | dark | ratio | light | ratio |
|---|---|---|---|---|
| red | `#e6242f` | 4.67 | `#d50612` | 4.72 |
| blue | `#1480c2` | 4.90 | `#0571b3` | 4.56 |
| purple | `#815bc2` | 4.22 | `#4b15a8` | 9.27 |
| green | `#45b384` | 8.03 | `#39936c` | 3.29 |
| yellow | `#f5b200` | 11.25 | `#ac7d00` | 3.23 |
| text | `#f3f1ee` | 18.61 | `#14120e` | 16.26 |
| muted | `#a8a29a` | 8.30 | `#6b6353` | 5.17 |
| link | `#7cc0ff` | 10.84 | `#1a5c96` | 6.06 |
| rule | `#6b627b` | 3.66 | `#736e62` | 4.41 |

Five of these sit under 4.5:1, on purpose: green light 3.29, yellow light 3.23, purple dark 4.22, rule dark 3.66, rule
light 4.41. The two rules are a border, where 3:1 is the bar, so they pass on their own terms. The other three were
chosen with the ratio on screen; what each of them paints on the live site is still open, to be recorded once the
styling pass applying this table is done. Full reasoning is in `docs/theming.md`.

## Fonts

Three stacks. A pixel face is right for chrome, labels and headings and punishing for a 3000 word article, so
`--font-body` stays readable while `--font-display` and `--font-subtitle` carry the pixel faces. All candidates below
are free and self-hosted (CSP is `font-src 'self'`).

Decided: **`--font-display` is Departure Mono** (headings, weight 400 only) and **`--font-subtitle` is PxPlus IBM VGA8**
(excerpts and section descriptions, flat 16px). `--font-body` is the one still open; the candidates now include five
non-pixel faces (Inter, Roboto, Source Serif 4, Literata, Atkinson Hyperlegible) alongside IBM Plex Mono and Handjet
at 22px.

| Face | Licence | Good for | Watch out |
|---|---|---|---|
| [Departure Mono](https://departuremono.com) | OFL | display, chrome, code | lowercase x-height is small at body sizes |
| [Silkscreen](https://fonts.google.com/specimen/Silkscreen) | OFL | tiny labels, badges | uppercase only in practice, no italics |
| [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans) | OFL | headings with more weight | four weights, no mono |
| [PxPlus IBM VGA8](https://int10h.org/oldschool-pc-fonts/) | CC BY-SA 4.0 | authentic DOS terminal | share-alike plus attribution, bitmap so it only looks right at exact multiples |
| [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) | OFL | body and code if a pixel face is too much | not pixelated, blocky rather than 8-bit |

Rendering: `image-rendering: pixelated` on raster art, and bitmap faces only at whole-pixel sizes or they blur.

## Icons

SVG only, no raster. Inline them in the component that uses them so they inherit `currentColor` and cost no request;
a sprite sheet only if the same icon appears on many pages.

Shortlist, all free: [Pixelarticons](https://pixelarticons.com) (MIT, 480 icons, drawn on a 24px grid, the closest
match to the direction), [Lucide](https://lucide.dev) (ISC, huge, clean, not pixelated),
[Feather](https://feathericons.com) (MIT, smaller and older). Box drawing characters cover rules, corners and
brackets without any icon at all.

Keep whatever we adopt in `src/components/icons/` as one small `.astro` per icon, and only the ones actually used.

Link icons (external-host vs. stays-on-the-blog) are already done this way: two data-URI SVG masks in
`src/styles/prose/links.css`, taking `currentColor`, costing no request.

## Settled

Decided and implemented. Kept short on purpose; the code is the detail.

- **Quotes.** One look, no variants. No background fill. Body always italic. Author bold and underlined, with a `»`
  prefix, under a dashed rule that runs from the left edge to halfway across the card and fades over its last third
  (`--qc-rule-extent` is the one value that changes its length). A `"` watermark at 240px, white 6% on dark and black
  3% on light, behind the text and clipped by the card on short quotes. Double frame, thick solid left edge.
- **Rule.** 150px, 1px, dotted at 2px on / 8px off, foreground at full strength, no glow. The colour options stay on the
  lab page until one is picked; `--rule-core` is the single value.
- **Headings.** `#` in the left margin on hover, no background tint. Glow on `h1` only.
- **Emphasis.** Bold is a solid brand-yellow chip with dark text in both themes. Italic is yellow text, dropping to
  `#8a6400` in light where the brand yellow cannot be read.
- **Footnotes.** Above 70rem the note is read in the margin, italic, muted, left edge only, with its `[1]` repeated at
  the start, and the section at the foot of the post is hidden. Below that width, and in print, the section is the
  reader's copy instead. Hidden, never removed, so the reference always has somewhere to resolve to. Hovering a
  reference raises the same card a link does, above the breakpoint only.
- **Captions.** From the markdown title only. Alt text is alt text and never becomes a caption.
- **Unwritten links.** Red, no marker text. The words live in a `title` attribute for anyone who cannot see the colour.
  Two code paths carried this: the wikilink plugin and `SeriesToc.astro`.
- **Cards.** Every card carries a thick solid left edge (`--border-card-edge`) and a double rule on the other three.
  `border-style: double` collapses to one line under 3px, so the thin edges are 3–4px.
- **Islands.** A post's own components live in a `components/` folder beside it, imported relatively. The content
  collection globs `*/*.{md,mdx}`, so that folder is invisible to it. `LabDemo` wraps an island and reveals its source
  through a `<details>`; `HtmlLab` embeds a whole HTML page from the same folder via `srcdoc`.
- **Version.** Commits since the last tag, as semver build metadata (`0.0.1+42`). No tag per change.
- **Code themes.** 14 Shiki themes, picked from an icon on every code block, stored in `localStorage`, applied by a
  blocking head script so a repeat visit never flashes the wrong one. `github-light` and `github-dark` stay first in
  the list, so an unset reader and a reader with JS off get exactly the old `prefers-color-scheme` behaviour.
  Monokai, Dracula and Snazzy ship only one variant each in Shiki's bundle, so they have no light/dark pair.
  **Lazy loading was planned and then dropped**: all 14 themes together cost 35.6 KB raw, **6.2 KB gzipped**, measured.
  The plan (a build-time integration emitting one stylesheet per theme, injected on demand, cached by the service
  worker) was worth it against the 15–20 KB the list was assumed to cost, and is not worth the moving parts against
  6.2 KB. Revisit only if the list grows several times over. Also rejected, on its own merits: keeping the CSS in
  `localStorage` — applying it means injecting a `<style>` from the blocking script, so every page load pays a
  synchronous read of tens of kilobytes before first paint, and the CSS then sits outside normal cache invalidation
  with nothing to clear a stale copy. A plain `<link>` to a hashed asset already serves from cache with no network.

- **Theme toggle.** Explicit now: a button beside `LangSwitcher` in the header opens a small menu of light, dark and
  system. The mechanism is one attribute, `data-theme` on `<html>`, narrowing `color-scheme` from `light dark` to one
  keyword in `theme.css`; every existing `light-dark()` token resolves against that without being rewritten. System is
  the default and means today's behaviour exactly: no attribute, nothing in `localStorage`. Stored under
  `color-scheme`, applied by a blocking head script the same shape as the code theme's, so a repeat visit never
  flashes the wrong ground. `ThemeToggle.astro` follows `CodeTheme.astro`'s progressive-enhancement precedent: the
  control renders `hidden` and only appears once `theme-toggle.ts` confirms it can run. `BaseLayout`'s two hardcoded
  `theme-color` meta tags cannot read a custom property, so an explicit choice would otherwise leave them disagreeing
  with the page; the script rewrites both to the resolved colour and restores their own per-scheme colour when the
  choice goes back to system. Placed next to `LangSwitcher` on purpose: that is also where the settings panel below
  grew into, so the two controls are neighbours rather than having been placed independently. Both icon buttons in
  that row share `--icon-btn-hit`, `--icon-btn-chip` and `--icon-btn-glyph` (`theme.css`): the button's own hit box
  stays at the WCAG 44px floor, but the border and background move to a `::before` sized at the smaller chip value,
  so what a reader sees can shrink without the target underneath it shrinking too.
- **Settings panel.** A cog button beside `ThemeToggle`, same shape: hidden until `settings-panel.ts` confirms
  it can run, a popover menu, `data-*` attributes carrying option labels a plain script has no `t()` for. Four
  things live in it. **Motion**, a light/dark/system-shaped three-way (`reduce` / `allow` / system, stored under
  `motion`) that overrides `prefers-reduced-motion` in either direction rather than only following it. **The Conway
  background**, on by default, stored under `background-life`. A disclosure revealing its reader-adjustable knobs:
  seed density, generations per second, the auto-feed interval, pause and reseed; cell size, the two per-ground
  fades, click-adds-a-glider and the bench's simulated column width stay fixed at the owner's own values and are
  not reader-adjustable. **The code theme picker**, moved in from every code block: `CodeTheme.astro` now renders
  once, inside this panel, still driving the same `code-theme` key and `data-code-theme` attribute. **The pinned-
  preview persistence checkbox**, moved in from `HoverPreviews.astro`'s footer-adjacent placement, reusing the same
  `hp-persist` key unchanged; it no longer hides itself until something is pinned, since a settings panel showing
  every control regardless of prior use is the point of moving it here. Everything that affects first paint
  (`motion`, `background-life`, `code-theme`, `color-scheme`) is applied by the blocking head script in
  `BaseLayout`, same as `color-scheme` and `code-theme` already were.
- **The Conway "game of life" background.** Settled off the bench (`GameOfLife.vue`, now
  `content/blog/theme-lab-arquivo/`): cell size
  12px, seed density 10%, 8 generations per second, click adds a glider, one glider fed automatically every 4
  seconds. Cell fade is per ground rather than one shared value, 11% on the dark page and 3% on the sepia one,
  reading as the same faint texture from opposite ends of the lightness scale; the site reads whichever value
  matches the active ground with no reader action. The bench's simulated reading-column knob does not travel to
  the real site, which already has a real column (`main`) to keep clear of instead. Measured lit-cell contrast
  against its own ground is 1.05:1, a deliberate failure of the 3:1 non-text-contrast criterion: it reads as
  texture rather than content, on purpose. `prefers-reduced-motion`, or an explicit "reduce" choice in the
  settings panel, freezes the field on one still frame and never starts the loop; the settings panel's pause
  control covers WCAG 2.2.2. On WCAG 2.3.1: at 8 generations per second the cells change faster than three times a
  second, so the bench's own "well below the threshold" framing does not hold up read literally, and the honest
  reading is different: 2.3.1 defines a flash by a paired luminance change of 10% or more over an area of roughly
  21,824px², and a single 12px cell at 3-11% alpha clears neither the luminance nor the area floor, and cells do
  not change in the same instant across the field, so no reader sees anything that meets the technical definition
  of a flash regardless of the generation rate. 8/s stays the shipped value on that basis. This reopens the
  "almost no animation" position from Direction above; see that paragraph for the reopened framing and
  `docs/decisions-log.md` for the fuller accounting, including what was not measured (battery cost, the effect on
  a long scroll) because this machine has no browser.
- **Language switcher.** A pixel on/off switch rather than two plain links, Português green and English red, both
  from `--brand-green`/`--brand-red` (`theme.css`), stepped rather than eased. Colour is never the only signal:
  the knob's position on the track and the always-visible PT/EN text are the two non-colour cues, on top of an
  accessible name that states the destination language in words. Sized to the same `--icon-btn-hit` row height as
  `ThemeToggle` and the settings button, its neighbours in the header.
- **Chip ink.** `--chip-ink` mixes each chip's own colour toward whichever end of the page is readable, black on the
  sepia page and white on the black one, instead of always toward black. The old dark-mode mix moved the ink toward
  the background it was supposed to stand out from: the brand red measured 2.82:1, unreadable. Measured in oklab,
  the same space the browser mixes in: dark blue 8.27, green 11.59, yellow 14.21, red 8.12, purple 5.19; light blue
  10.45, green 7.24, yellow 5.70, red 10.69, purple 15.12. The frame and the hover fill read the same token, which
  also fixes the purple chip's 1.97:1 border on black. The old light-mode mix was failing quietly too: green at
  4.23, yellow at 3.11, both under the 4.5 minimum.
- **No CRT scanline effect.** The bench (`CrtEffects.vue`, now `content/blog/theme-lab-arquivo/`) starts every knob at zero and
  prints the contrast cost next to each slider. The owner's own setting: ground light, scanline 0%, pitch 2px, glow
  0%, grain 0%, vignette 0%, flicker off, reading 16.79:1 with the effect off and 16.79:1 on the dark scanline row,
  AAA, cost 0.00, the same setting the bench opens on. The site carries none of this. `CrtEffects.vue` is archived to
  `content/blog/theme-lab-arquivo/`, kept rather than deleted because the rejected settings are the argument for the
  article the owner intends to write about how the redesign was decided.
- **The cover: candidate 4, wireframe 3D.** Settled off the bench (`CoverLab.vue`, now
  `content/blog/theme-lab-arquivo/`, which also still holds the DOS-window, fire and waves candidates it never chose
  between): category chip, a 90-character title, brand purple `#4b15a8` at 90% kept (not the full colour, which
  saturated too close to the title's fixed white), a solid cursor, seed 65. That seed is what produces the generated
  solid's own shape, 3 sides, 3 rings, both ends closed, plus wireframe density 6px and wireframe opacity 145%.
  Covers stay per locale, `cover.pt.png` and `cover.en.png`, since the title is baked in. Colour and seed derive from
  the slug rather than `Math.random()`, so a rebuild cannot change an existing cover. `scripts/cover.ts` and
  `src/lib/cover.ts` port this.
- **The header's wordmark animation: `decifra`.** Settled off the bench (`ChromeHeader.vue`, now
  `content/blog/theme-lab-arquivo/`): the *Sneakers*-style decrypt scramble, ticking at 530ms, the same rate as the
  cursor's "terminal" phase. The other four (`teletipo`, `pipboy`, `baud`, `falha`) stay as selectable options rather
  than retiring, since the bench never pitted them against `decifra` as a closed dispute. `prefers-reduced-motion`
  freezes on the final frame and the loop never starts; a manual pause control covers WCAG 2.2.2.

## Next up

The order the work goes in from here, Lucas's own list.

1. **Mobile design.** Nothing below 70rem has had a pass of its own. Every width decision so far was made at desktop
   and given a fallback rather than a design: the header row wraps, the outline becomes a drawer, the post list drops
   to the plain measure, and the cover overlay's own coordinates were reasoned about rather than seen. This is the one
   item that touches every surface already built.

   Three things were found at a narrow window and deliberately left for this pass rather than patched: the series card
   on a post overflows the frame, because its rows carry a fixed indent and the longest title then sets a minimum row
   width, and content wider than the viewport extends the document so the whole page scrolls sideways; the cover needs
   to resize rather than be cropped; and a pinned hover preview restored from a wider window can land off-screen. An
   attempt at collapsing the series card into a disclosure was built and reverted, it was not the behaviour wanted.
2. **Reading the existing posts.** A pass through what is already published to judge what reads well and what does
   not, now that the type, the rules, the code frames and the callouts are all decided. Content review feeding
   design rather than a code task: expect it to reopen a few settled values.
3. ~~**The series header.**~~ Done. The series index in both languages now renders through the same listing table
   the post list uses (`src/styles/listing.css`, shared by `PostList` and `SeriesList`), one row per series with its
   latest date, part count in the day colour and total reading time, and each row opens its parts in place through a
   native `<details>` instead of navigating. The per-series pages stay, since that is the URL worth sharing. The card
   on a post took the house double rule in the cover colour, a bigger title on its own line behind a shell prompt, the
   current part filled edge to edge in the day colour, and alignment with the frame the cover draws inside its own box.
4. **Individual page layouts.** `/about/` has no content and 404s from the nav. The tag, series and category index
   pages exist but were built to be correct rather than designed. Same for `/search/`, `/oss/`, 404 and offline.
5. **A pass over what already exists**, together, so Lucas sees the whole thing in one sitting rather than one
   screenshot at a time.

## Open decisions

- Which body face wins. Everything else about the type system is settled.
- `--rule-core`: the lab page carries the colour and density options for the section break.
- Whether the code language chip should still show when a filename tab is already present.
- Which of his other domains count as internal for the link icon. `lsantos.dev` and `lsantos.me` are confirmed now;
  anything beyond those two is still open.
