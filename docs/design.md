# Design

The plan, the shortlist, and what has already been decided. Kept short on purpose: the code is the detail.

## Direction

ASCII/ANSI, 8-bit, pixelated, terminal. Box drawing instead of borders where it reads well, uppercase labels,
section markers like `SECTION 00 / INDEX`, dashed rules, information dense over decorated.

References: [unix.foo](https://unix.foo), [xn--gckvb8fzb.com](https://xn--gckvb8fzb.com/),
[tramoia.sh](https://tramoia.sh). Text animation via [textmode.js](https://code.textmode.art), WebGL2 to a canvas,
zero dependencies, so it bundles locally and needs no CSP change.

The same treatment covers the generated images: post covers, OG cards and any background art share the palette and
the pixel grid, so a share card looks like the site.

## Tokens

All of them live in `src/styles/theme.css`. Components reference roles (`--fg`, `--accent`, `--rule`), never the
brand hexes, and nothing else in the codebase hardcodes a colour, a font stack, a radius or a duration.

Palette, traced from the favicon: red `#e30613`, green `#45b384`, yellow `#f5b200`, blue `#0578be`. Those stay.
Purple is `#4b15a8`, taken from the old Ghost theme rather than the favicon, which never had one.
`--radius: 0` by default, because rounded corners fight a pixel grid.

The two page grounds are decided: **`#000000` in dark**, true black so OLED pixels switch off, with the hint of purple
in `--rule` instead of in the page; **`#f4efe0` in light**, a NieR Automata sepia with warm ink at `#332d23`. The brand
blue had to move for the sepia too: it measured 4.12:1 there, under the 4.5 minimum, so `--accent` in light mode is
`#1a5c96` instead of the raw brand hex. Full reasoning and the measured ratios are in `docs/theming.md`.

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

## Open decisions

- Which of the three cover candidates wins. All three are built in `/theme-lab/` section 04 as SVG at the real
  1200×630: a DOS window with a spaced double border, a full-bleed brand colour with a 75% rule, and a seeded plasma
  with shadowed letters. Covers stay per locale, `cover.pt.png` and `cover.en.png`, since the title is baked in. Colour
  and seed derive from the slug rather than being random, so a rebuild cannot change an existing cover.
- Whether the theme toggle becomes explicit. Today it is native `light-dark()` with no JS and no stored preference.
- Where the pinned-preview persistence checkbox lives. The code theme picker found its home on every code block, and
  the footer already exists (name, version, typeface credits), but a checkbox among those links reads oddly; it may
  want its own small settings popover, reusing the code-theme picker's pattern.
- Which body face wins. Everything else about the type system is settled.
- `--rule-core`: the lab page carries the colour and density options for the section break.
- Whether the code language chip should still show when a filename tab is already present.
- Which of his other domains count as internal for the link icon. `lsantos.dev` and `lsantos.me` are confirmed now;
  anything beyond those two is still open.
