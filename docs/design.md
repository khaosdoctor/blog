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
`--radius: 0` by default, because rounded corners fight a pixel grid.

## Fonts

Two stacks on purpose. A pixel face is right for chrome, labels and headings and punishing for a 3000 word article,
so `--font-body` stays readable and `--font-display` is where the 8-bit face goes. All candidates below are free and
self-hosted (CSP is `font-src 'self'`).

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

Link icons (external-host vs. stays-on-the-blog) are inlined as data-URI SVG masks, not fetched — same shortlist
as above, see [Link icons](#7-link-icons) below.

## Settled

Decided and implemented. Kept short on purpose; the code is the detail.

- **Quotes.** One look, no variants. No background fill. Body always italic. Author bold and underlined, with a `»`
  prefix, on a dashed rule that starts halfway across the card and fades out to the right (`--qc-rule-start` is the one
  value that changes its length). A `"` watermark at 160px, white 10% on dark and black 5% on light, behind the text and
  clipped by the card on short quotes. Double frame, thick solid left edge.
- **Rule.** 150px, 1px, dotted at 2px on / 8px off, foreground at full strength, no glow. The colour options stay on the
  lab page until one is picked; `--rule-core` is the single value.
- **Headings.** `#` in the left margin on hover, no background tint. Glow on `h1` only.
- **Emphasis.** Bold is a solid brand-yellow chip with dark text in both themes. Italic is yellow text, dropping to
  `#8a6400` in light where the brand yellow cannot be read.
- **Footnotes.** No section at the foot of the post. The note is read in the margin, italic, muted, left edge only, with
  its `[1]` repeated at the start. Hovering a reference raises the same card a link does.
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

- Display face, and whether body copy goes mono too.
- Cover and OG layout: flat brand background or generated art, what the card carries besides the title, how a
  90 character title behaves. Covers are per locale, `cover.pt.png` and `cover.en.png`, since the title is baked in.
- Whether the theme toggle becomes explicit. Today it is native `light-dark()` with no JS and no stored preference.
- Where the reader settings live once there is a footer. Two already exist and have nowhere to sit: the
  pinned-preview persistence checkbox and the code theme picker.
- `--brand-purple` is provisional at `#6b4fbb`. Quotes are the only thing using it. Candidates: `#8a63d2` reads better
  faded on a dark page, `#5b3e99` is the safest against light text.
- `--rule-core`: the lab page carries the colour and density options for the section break.
- Whether the code language chip should still show when a filename tab is already present.
- Which of his other domains count as internal for the link icon. `lsantos.dev` is the only one confirmed.
