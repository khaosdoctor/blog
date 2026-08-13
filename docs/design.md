# Design

Nothing here is applied yet beyond the tokens. This is the plan and the shortlist, kept short on purpose.

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

## Lab feedback

Owner review of the `/lab/` showcase. Per item: what he asked for, the decision being implemented now, and any
open question left for him.

### 1. Epigraphs

- Ask: an epigraph reads identically to a blockquote today, needs a look of its own.
- Status: undecided, 3 options below, his pick.
- **A. Box-drawing frame** — `┌─┐│└─┘` border via CSS `border-image` (SVG), not literal Unicode text (would leak
  into the accessible tree). Token: `--epigraph-border`. A11y: none.
- **B. ANSI bracket** — large `❯`/`❮` glyphs flanking the text in accent colour, like a prompt marker. Token:
  `--epigraph-bracket`. A11y: decorative, needs `aria-hidden`.
- **C. Oversized pixel glyph + dither** — big pixelated `"` mask behind the text at low opacity, optional dithered
  SVG tile backdrop. Tokens: `--epigraph-glyph-opacity`, `--epigraph-dither-opacity`. A11y: opacity must stay low
  enough that text keeps WCAG AA contrast.
- OPEN QUESTION: pick A, B, or C (or a mix).

### 2. Code block language chip

- Ask: every code block shows its language in a small chip — top-left, top-right or bottom-right.
- Decision: top-right, hidden when expressive-code's frame plugin already renders a filename/title bar (two
  labels would collide).
- OPEN QUESTION: should the chip show even when a title bar is present?

### 3. Heading anchors

- Ask: hovering a heading reveals a clickable `#`; clicking jumps to the anchor, copies the full URL, and
  confirms with a toast.
- Decision: implementing as described.
- OPEN QUESTION: toast position and auto-dismiss (default: bottom-centre, 2s).

### 4. Heading rules

- Ask: h1–h3 get a rule underneath that fades out (gradient, not solid); h4 and deeper get nothing.
- Decision: implementing as described.

### 5. Heading glow

- Ask: h1/h2 get a faint glow behind the text.
- Decision: `--glow-color` token, so the colour is a one-line change later.
- OPEN QUESTION: which colour — brand red (CRT-phosphor), brand green (terminal), or a neutral white/black glow
  that just lifts the text. Recommendation: green — it reinforces the terminal direction, and its mid luminance
  reads as a soft lift in both themes without the alarm connotation red carries.

### 6. Emphasis colours

- Ask: bold gets a background chip wrapping the word (small padding), brand colours, both themes, like the old
  blog. Italic is open to suggestions, wants it reading as more clearly italic than plain slant.
- Bold decision: tinted background chip. Token pair per theme via `light-dark()`: `--em-bold-bg` / `--em-bold-fg`.
- Italic, 3 options: (a) distinct brand-coloured text, (b) weight bump to 500, (c) dotted/dashed underline.
  Default: **dotted underline** — reads as "italic plus" without fighting the slant, leaves colour free for
  links and bold.

### 7. Link icons

- Ask: every link gets an inline icon — "open external" if the host differs from the blog, a curved
  left-to-right arrow (rotated footnote-backref shape) if it stays on the blog or another of his domains.
- Decision: CSS-only, inline SVG as a `mask-image: url(data:...)` so it inherits `currentColor`, no extra
  request, no JS.
- OPEN QUESTION: internal-domain list. `lsantos.dev` confirmed, needs the rest.

### 8. Quotes vs. citations

- Ask: quotes and citations are different things; he rarely writes bibliographic/scientific citations, so no
  citation styling for now. A quote should be a card with its own background (not a padded block), a very large
  faded quote glyph watermarked top-left behind the text, the author at the bottom when there is one, the body
  in italic, and a drop-cap first letter.
- Markup decision: reuse the Obsidian callout he already writes — `> [!quote] Author Name` + body. `rehype-callouts`
  already understands `quote`, it renders natively in Obsidian, no new syntax or component. Callout title → author
  row, callout body → quote text. A plain `>` blockquote with no callout gets the same card minus the author row.
- Card colour: faded purple in dark theme, solid purple in light theme. **Flag: no purple exists in the brand
  palette** (red `#e30613`, green `#45b384`, yellow `#f5b200`, blue `#0578be`) — a `--brand-purple` hex needs
  picking. Candidates: `#6b4fbb` (muted violet, sits closest in saturation to the existing set, works solid on
  light), `#8a63d2` (brighter, more legible faded at low opacity on dark), `#5b3e99` (deep plum, safest contrast
  for a solid light-theme card since it's dark enough to pair with light text).
- OPEN QUESTION: which purple, and does it double as one hex used at different opacity per theme, or two hexes.
- OPEN QUESTION: on a solid purple light-theme card, body text needs to invert to stay readable — solid purple
  with inverted text, or a tinted/lighter purple that keeps normal text colour? Contrast risk either way.
- OPEN QUESTION: author position — he said both "below the box" and "bottom of the card." Default being
  implemented: inside the card, bottom row, right-aligned. Confirm.
- Note: drop cap + italic + watermark glyph is three effects stacked at once; the `/lab/` page will render
  several combinations side by side so he can cut what's too much, and the variant he picks is what gets
  promoted into the default stylesheet.

## Lab feedback, round 2

Second pass over `/lab/`, after the first round shipped. Not implemented yet, listed in his order. Anything here
overrides the round 1 note above it.

**Headings**

- Hover shows only the `#`, on the **left** of the heading, fading in. Nothing else.
- No background tint on hover. Remove it.

**Side notes and margin notes**

- Hovering the note highlights the **background of the text it is bound to**, not just the reference number.
- While hovering, a second `#` appears: **top left** for a margin note, **top right** for a side note. It links to
  that note's own anchor.

**Horizontal rule**

- 150px is the right length.
- No glow at all. Remove it.
- 1px, dotted.
- Fainter, around 80% alpha.
- Render the lab variants in several colours and several alpha levels so the colour can be picked.

**Footnotes**

- Hovering a footnote reference shows the footnote in a popover, with **exactly** the behaviour the link hover
  previews already have. Same component, not a second implementation.
- No "Footnotes" block heading at the bottom. Just the notes.
- The notes at the bottom render small, the way a footnote should, but still comfortably readable: small enough to
  read as a different register from the body, not smaller.

**Emphasis**

- Bold: solid background colour, not a faded one.
- Italic: the treatment is right, but use the same yellow the bold uses. Watch light mode, where that yellow will not
  read, and switch to something legible there, probably blue.

**Quotes**

- The card background is still too present. Either fainter again, or a darker shade of purple.

**Code blocks**

- A filename tab appears only when the first line is a comment **that looks like a filename**. If there is no comment,
  or the comment is not a filename, no tab. A shebang in a bash block is the example of a first-line comment that must
  not become a tab.
- Question: can the syntax highlighting theme be changed, and better, can the reader choose between a few?

**LaTeX**

- The copy button works, but Greek letters come out as their names (`lambda`). They should come out as the letters
  themselves, using whatever ASCII or Unicode representation reads correctly when pasted.

**Side notes and margin notes, continued**

- Side notes (the numbered ones) get a full border: the thick solid left edge stays as it is, and the other three sides
  get a thin border.
- Margin notes are right as they are.
- The copy-link control is far too small in both. Use a normal-sized link icon, clickable. Clicking it copies the
  anchor URL, it does **not** navigate there.
- A blue outline is stuck around the reference number and will not go away (screenshot). That is the `:target` ring
  added in round 1. The numbers must carry no special treatment at all: remove it.
- The hover highlight over the bound text uses the **faded yellow from the bold treatment**, not blue.

**Quotes, continued**

- With an author: the rule dividing the quote from the author line fades out at **both** ends.
- Both forms, with and without an author, are still missing the `"` watermark: upper left, roughly 48px, white at
  about 30% alpha, behind the text.
- The double-ANSI treatment is the one he likes: monospaced body, dotted rule. Build a test matrix of it:
  - dotted, faded at both ends
  - dotted, faded on the right only
  - dotted, faded on the left only
  - dotted, no fade
  - and the same four again with a solid rule instead of dotted.

**The double-ANSI border becomes the house style**

- Apply the same double-ANSI border to callouts, side notes and margin notes.
- In every case the left border stays thicker than the others, and stays solid, exactly as it is now.

**Unwritten links**

- The superscript marker on a link to a post that does not exist yet is **still rendering**. It must not.

**Footnotes at the foot of the post**

- The heading is gone, but the notes themselves are still full body size. Make them smaller and fainter than the body,
  while staying comfortably readable.

**Interactive components**

- Each interactive island gets a small "code" button beside it. Clicking it reveals that component's own source.
- Add a second interactive example to `/lab/` that is a plain HTML page and nothing else, alongside the Vue one.

**Process**

- Every change from now on bumps the version, so each change is traceable. See `src/lib/version.ts` and the release
  workflow for how the version is currently derived.

**Images: settled, no change**

Obsidian does support the title form after all. So what shipped stays: the caption is the markdown title when there is
one, otherwise the alt text, and the alt attribute is always the alt text. Both channels exist, both render in Obsidian.

**Answers given on the round 2 questions**

- Italic: yellow *text*, `#f5b200` in dark, dropping to an amber that passes 4.5:1 on a near-white page in light. One
  colour family, no blue.
- Versioning: the patch number comes from the commit count since the last tag, computed at build time. No manual bump,
  no tag per change. Minor and major tags stay hand-cut when something meaningful ships.
- Code theme: a reader-facing picker with a handful of themes, remembered in `localStorage`, sharing whatever settings
  surface the pinned-preview toggle ends up in.

## Open decisions

- Display face, and whether body copy goes mono too.
- Cover and OG layout: flat brand background or generated art, what the card carries besides the title, how a
  90 character title behaves. Covers are per locale, `cover.pt.png` and `cover.en.png`, since the title is baked in.
- Whether the theme toggle becomes explicit. Today it is native `light-dark()` with no JS and no stored preference.
- Where the reader settings live once there is a footer, starting with the pinned-preview persistence checkbox.
- Per-component open questions from the `/lab/` review: see "Lab feedback" above.
