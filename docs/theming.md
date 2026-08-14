# Theming

The long version. `docs/design.md` is the short one, kept skimmable on purpose; this file is the opposite. It records what was looked at, what was tried, what was thrown away and why, and where the reasoning is still incomplete. Every candidate named here exists and is interactive at `/theme-lab/`, and everything at `/theme-lab/` is explained here.

This started as a pure exploration with nothing applied to the site, and that is no longer true. The parts that have since been adopted are marked as decided where they appear, and the short list of them lives in `docs/design.md`: the two page grounds, the brand purple, and the display and subtitle faces. Everything else here is still a candidate.

---

## 1. The brief, as it arrived

> code.textmode.art. I want to use this look and feel, especially the animations on "What will you create". The look and feel I am after is the square fonts of the 80s, 90s and early 2000s, like Pokémon games back in Game Boy, Super Nintendo games, Doom, Wolfenstein. 8-bit and pixelated stuff like that. With a "hacker" look and feel but still modern enough so people can navigate.

Two later constraints, both of which changed the work:

- **No CRT curvature.** Not as an effect, not as a knob.
- **Scanlines are a maybe.** "Scanlines can look cool but it will probably not." So they had to be shown as one option among several, with an honest account of what they cost, and at least one strong candidate had to reach the same feeling without them.

The last clause of the original brief is the one that constrains everything else: *still modern enough so people can navigate*. That is the line between the references worth stealing from and the ones worth staying away from, and it comes up again in section 3.

---

## 2. The reference he sent, taken apart

The screenshot is the "What will you create?" section at the bottom of the textmode.js documentation home page. Rather than guess at it, the page source and its stylesheet were pulled and read.

The section is `.what-will-you-create`, and its whole anatomy is small:

```css
.title            { font-family: var(--textmode-font, "JetBrains Mono", "Courier New", monospace);
                    font-size: 1.75rem; font-weight: 600; letter-spacing: -.02em }
.title .highlight { color: var(--vp-c-brand-1) }
.terminal-box     { background: var(--vp-c-bg-soft); border: 1px solid var(--vp-c-divider);
                    border-radius: 8px; padding: 1rem 1.25rem; max-width: 600px }
.terminal-box:hover { border-color: var(--vp-c-brand-1); box-shadow: 0 0 0 1px var(--vp-c-brand-1) }
.terminal-prompt  { font-weight: 700; color: var(--vp-c-brand-1);
                    padding-right: 1rem; border-right: 2px solid var(--vp-c-divider) }
.cta-button::before { content: "[ " }
.cta-button::after  { content: " ]" }
.cta-button       { letter-spacing: .05em }
```

Resolved, in dark mode: background `#1b1b1f`, the box `#202127`, the accent `#a8b1ff` (VitePress `--vp-c-indigo-1`, which is the periwinkle on the word "you").

Three things are worth taking from this, and one is worth leaving.

**Worth taking.** The accent is a single word inside an otherwise plain heading. That is a very small amount of colour doing a very large amount of work, and it costs nothing. The brackets around the button label are pure `::before`/`::after`: the button is still a button, still focusable, still readable by a screen reader without the brackets being announced as content. And the terminal box is one rule, one background, one vertical divider after the prompt. There is no chrome pretending to be a window.

**Worth leaving.** The `border-radius: 8px` on the terminal box. The rest of the design is on a character grid and the rounded corner is the one thing fighting it. `docs/design.md` already sets `--radius: 0` for exactly this reason, and that decision holds.

**What the animation actually is.** The typed line and the block cursor are rendered by a client-side Vue component, so the built HTML only carries the `>_` prompt and an empty slot. It is a typewriter that types a phrase, holds, erases, and moves to the next. There is no canvas in that section at all. This matters more than it sounds: the effect he pointed at is achievable in about forty lines of plain JavaScript, and the WebGL library is a separate decision from it. That realisation is what produced candidate 4 in section 7.

The heading itself is `JetBrains Mono` at weight 600 with **negative** tracking (`-.02em`). Every retro-terminal reference below uses positive tracking on headings, some of them heavily. That is a real choice to make and it became a slider.

---

## 3. Everything else that was looked at

### The three already in `docs/design.md`

**[unix.foo](https://unix.foo)**. Essay index with a light/dark/auto toggle exposed as text (`AUTO LIGHT DARK`), dates in `YYYY MON DD` uppercase, dashed rules between entries, `READ ESSAY` as the call to action. No animation, no scanlines, no CRT anything. What it takes from the terminal is the *information density and the labelling convention*, not the screen. This is the closest thing to the target register in the whole reference set: it reads as a Unix person's page without a single costume element.

**[xn--gckvb8fzb.com](https://xn--gckvb8fzb.com/)** and **[tramoia.sh](https://tramoia.sh)**. Both were in the shortlist already and both failed to load from the machine this work was done on; the network in this environment stalled repeatedly on several hosts (see section 10). They were not dropped on merit, they were not seen. Worth a second pass.

### The one that mattered most

**[The Monospace Web](https://owickstrom.github.io/the-monospace-web/)** by Oskar Wickström. This is the most directly applicable thing found in the whole search, and it is not a retro pastiche at all. The whole page is laid out on a real character grid: cell width is `1ch` (the advance width of `0`), cell height is `--line-height: 1.2rem`, and every block element's height is required to divide evenly by the cell height so that nothing ever falls off the grid. Rules are drawn with `border-top-style: double` on an absolutely positioned pseudo-element sitting at the vertical centre of a cell. The page reflows in whole-character steps rather than fluidly.

Two details from his [build writeup](https://wickstrom.tech/2024-09-26-how-i-built-the-monospace-web.html) are directly useful here. First, he chose JetBrains Mono specifically because most monospace faces break box-drawing glyph alignment above about 110% line height, and JetBrains Mono tolerates 120%. If this site adopts box drawing for rules and frames, that constraint becomes ours, and it interacts with the line-height slider in the specimen. Second, images cannot be grid-aligned in CSS alone, so he computes `padding-bottom` from an aspect ratio in JavaScript. That is a real cost of committing to a strict grid, and it is worth knowing before committing.

The lesson taken: the grid discipline is what makes a monospace page read as designed rather than as a theme. It is also achievable without any pixel font at all.

### Terminal-adjacent sites that read as modern

- **[Charm](https://charm.land)** (Bubble Tea, Lip Gloss, Gum, Glow). Dark background, **sans-serif for marketing prose**, monospace reserved for code and product blocks. Mascot illustrations instead of a wall of screenshots. No CRT effects anywhere. Their [terminal.shop](https://www.terminal.shop) sells coffee over SSH, which is the joke taken further than anyone else has taken it.
- **[Ghostty](https://ghostty.org)**. GPU-rendered terminal, bundles JetBrains Mono, site is Next.js and MDX and fully open source. Notably: a CRT scanline and vignette shader exists in Ghostty, as a **user setting inside the terminal**, and is deliberately absent from the marketing site. A terminal company decided scanlines were an opt-in toy and not their identity.
- **[Warp](https://www.warp.dev)**. Inter for copy, DM Mono at a single weight for command snippets, Instrument Serif for editorial italics. Uppercase labels tracked out at 1.4 to 2.4px. Warm near-monochrome rather than true black: background around `#2b2622`, text `#faf9f6`. Zero weights above 600. Scanlines deliberately avoided.
- **[Textual](https://textual.textualize.io)**. Python TUI framework whose modern feel comes from rounded borders, shadows simulated with block characters, and 24-bit colour gradients, all inside a terminal.
- **[Starship](https://starship.rs)** and **[oh-my-posh](https://ohmyposh.dev)**. Segmented powerline prompts. Both need a Nerd Font, which is the practical argument against building anything here on glyphs outside the basic sets.

The pattern across all five: **they distil two or three cues and drop the rest.** Dark background, one accent, a monospace face, generous tracking on labels. None of them draws a screen.

### The counter-example, and the line it draws

**[98.css](https://jdan.github.io/98.css/)** and **[XP.css](https://botoxparty.github.io/XP.css/)** reproduce a historical UI faithfully, down to the bevels. They are wonderful and they are cosplay. The distinction that matters for this site: the references above take *cues* from the terminal, and these take *chrome* from it. "Modern enough so people can navigate" belongs on the first side of that line. Anything that reproduces a Game Boy screen or a DOS window frame is on the second, and that is the reason the Game Boy menu candidates in section 7 are marked as the least scalable option rather than the most attractive one.

One more piece of context worth knowing before committing hard: trend data has retro-brutalist UI peaking around March 2026 and declining since. That is not an argument against the direction, it is an argument for the distilled version of it rather than the maximal version, because the distilled version ages into "a monospace site" and the maximal version ages into "a 2026 site".

### The machines and the games

Researched for exact numbers rather than vibes, because the palettes are where the accessibility arithmetic gets decided.

**CGA/EGA, the canonical 16.** 4-bit RGBI, channels only ever at `0x00`, `0x55`, `0xAA`, `0xFF`. `#000000 #0000AA #00AA00 #00AAAA #AA0000 #AA00AA #AA5500 #AAAAAA` then the same with the intensity bit. Index 6 should be dark yellow `#AAAA00`; it is brown `#AA5500` because the IBM 5153 monitor halved the green signal for that one code. That is a hardware bug that became an aesthetic, which is a good story and also the exact colour that fails contrast (see section 8).

VileR [measured the actual 5153 output](https://int10h.org/blog/2022/06/ibm-5153-color-true-cga-palette/) and got a warmer set that disagrees with the canonical table: `#0000C4 #00C400 #00C4C4 #C40000 #C400C4 #C47E00 #C4C4C4 / #4E4E4E #4E4EDC #4EDC4E #4EF3F3 #DC4E4E #F34EF3 #F3F34E`. Both are in the palette lab so the difference can be seen rather than argued about.

**The VGA text grid.** 80x25 at a **9x16** glyph cell, 720x400 signal. For code points `0xC0` to `0xDF` the hardware replicated the glyph's 8th pixel column into the 9th so that box drawing connected. This is why the font vendored here is the 9x16 and not the 8x16: it is the one where `═` actually joins.

**Phosphors.** No authoritative CIE table exists for P1/P3/P39/P4, and any hex you see quoted is convention. What is real: P39 is the long-persistence green of the **IBM 5151**, and amber terminals sat around 590 to 594 nm with no EIA standard behind them. The values used in the lab are `#20C20E` for the 5151 green and `#FFB000` for amber. **`#00FF41` was rejected**: it comes from The Matrix's 1999 colour grading and has nothing to do with any monitor. `#33FF33` is likewise pop culture.

**Game Boy DMG.** `#0F380F #306230 #8BAC0F #9BBC0F` is the most-cited set, and it is an eyeball, not a spec: the DMG was a passive-matrix STN LCD whose appearance moved with backlight, ambient light, the contrast dial, and battery voltage. Screen is 160x144, which is 20x18 tiles of 8x8.

**Pokémon Gen 1, from the disassembly.** `TextBoxBorder` in `pret/pokered/home/text.asm` draws every box in the game from **exactly six tiles**: four corners, one horizontal, one vertical. The font sheet `gfx/font/font.png` is 128x64 pixels, 1-bit, a 16x8 grid of 8x8 cells. Strictly monospaced, no kerning. Selection is a `▶` cursor glyph, not a row inversion. Gen 2 added a FRAME option in the menu with **eight selectable border styles**, which is a nice piece of evidence that even Nintendo treated the frame as a preference rather than an identity.

Six tiles is the whole idea worth stealing. A frame made of a corner and an edge is a frame you can build in CSS with four `border` values or with six characters, and it will never be more than six things.

**SNES.** Windows are 8x8 tilemap constructions. The translucent blue dialogue box is not an alpha channel: it is the PPU's Window masks plus Color Math (`CGADSUB`) doing a half-subtract of the subscreen against 50% black. FFVI stores **8 RGB colours per window** at `0x2d1c00 + (windowid * 0x20)` and paints them as a top-to-bottom gradient. The eight default presets' hex values are not published anywhere reachable. The structural finding, an eight-stop vertical gradient inside a tiled frame, is the transferable part.

Also worth knowing: the Japanese FF6 and Chrono Trigger used a fixed 12x16 font, and the **English localisations switched to a software variable-width font** because the SNES background layer is only 32 tiles wide and 28 of them are safe. The 16-bit RPG look that people remember is, in English, already proportional. That undercuts the assumption that this aesthetic requires monospace.

**Doom.** The menu font is not a font: it is individual graphic lumps named `STCFN033` through `STCFN126` by decimal ASCII code, and the big titles are whole-word images. The skull cursor alternates `M_SKULL1`/`M_SKULL2` every **8 tics** at 35 tics per second, so **228.6ms**. Status bar is 320x32 on a 320x200 screen. The engine swaps the whole 256-colour palette for damage and pickup tints rather than blending, which it inherited from Wolfenstein.

228.6ms is a usable number. It is roughly twice as fast as a terminal cursor blink and it is the reason a Doom menu feels urgent where a terminal feels patient.

**Wolfenstein 3D, and a correction to the brief.** From `WOLFSRC/WL_MENU.H` mapped against the VGA palette, base Wolfenstein 3D menus are **dark red and maroon**: `BORDCOLOR #880000`, `BORD2COLOR #d40000`, `DEACTIVE #700000`, `BKGDCOLOR #580000`. The blue everyone remembers (`#000088`, `#0000d4`, `#000070`, `#000058`) is **Spear of Destiny**. Shared between them: `READHCOLOR #fcf400`, `TEXTCOLOR #8c8c8c`, `HIGHLIGHT #c0c0c0`. The bevelled look comes from that grey pair, `#c0c0c0` against `#8c8c8c`, on opposite edges.

**BBS and ANSI.** CP437 has three shades (`░▒▓`, U+2591-2593), one full block (`█`), and four half blocks (`▄▌▐▀`). It does **not** have the eighth-block series or the quadrant blocks; those are modern Unicode with no DOS byte behind them. Gradients were built two ways: shade dithering, which optically blends two of the 16 palette colours, and the half-block trick, where `▀` with independent foreground and background turns one cell into two stacked colour pixels and makes the effective canvas 80x50. The attribute byte is 4 bits foreground, 3 bits background, and **bit 7 is blink**, which is why DOS only ever had 8 background colours. iCE colours reinterpret that bit as a fourth background bit and lose blinking.

The half-block trick is the single most useful technique in this whole section, because it is exactly what `cellColor` plus `charColor` do in textmode.js, and it is what the cover generator candidate uses.

---

## 4. The constraints, and how each one changed the result

### The CSP blocks CDN scripts

`src/lib/embed-hosts.ts` generates one policy for the meta tag and for the output guard. The relevant lines:

```
script-src 'self' 'unsafe-inline' <a short host allowlist>
font-src   'self'
```

textmode.js documents itself with a jsDelivr UMD tag. That tag would be blocked, and the failure mode is the worst kind: the demo renders an empty canvas and says nothing. So the library had to be local. Three ways were considered.

**Rejected: inline the UMD into an `HtmlLab` page.** `HtmlLab` embeds a whole HTML file from the post's folder into a sandboxed `srcdoc` iframe, which is the natural vehicle for a demo that needs to contradict the site's CSS. The library's UMD build is 194KB minified. That alone is survivable, but `remark-lab-demos.mjs` reads the same file **twice**: once for the iframe and once to build a real markdown code block that expressive-code then highlights. Three demos would mean roughly 580KB of minified JavaScript going through the syntax highlighter and into the page as visible source. That is not a weight problem, it is an absurdity problem.

**Rejected: copy the dist into `public/`.** Would work, and would have been the smallest change. `public/labs/` is even anticipated in a comment in `embed-hosts.ts`. It was not done because `public/` outside `public/fonts/` is not this task's to write, and because the npm route is better maintained anyway.

**Chosen: `npm install textmode.js` and a Vue island.** `package.json` gains one dependency, `textmode.js@^0.17.1`. Each demo is a `.vue` file loaded through `LabDemo` with `client:visible`, and the import is dynamic inside `onMounted` so the module never touches `document` during the server render. Vite bundles it to `/_astro/textmode.esm.*.js`, which is same-origin, which passes `script-src 'self'` with nothing added to the allowlist. **Verified in the built output**, not assumed: the island chunk contains `import("./textmode.esm.NBk_uEYA.js")` and that chunk contains the library.

The cost of this choice: the demos are no longer inside an iframe, so the site's `prose.css` is in scope. In practice every rule there is `.prose <element>` at specificity 0,1,1 and a Vue scoped class selector beats it, so it was manageable, but it is a real constraint on how the demos are written and it is worth knowing if more are added.

### `font-src 'self'` and a spec detail worth writing down

`font-src 'self'` means a Google Fonts link is blocked, so every face is self-hosted in `public/fonts/`. That part was already known.

The part that was not obvious: **had the demos gone into `HtmlLab`'s `srcdoc` iframe, would `/fonts/x.woff2` have loaded?** The iframe is `sandbox="allow-scripts"` with no `allow-same-origin`, so the document is in an opaque origin, and a `srcdoc` document inherits its parent's CSP. If `'self'` were evaluated against the document's own origin, an opaque origin matches nothing and every font would be blocked.

CSP3 answers this directly. A CSP list carries a **`self-origin`** field, and the spec says why in as many words:

> This is needed to facilitate the 'self' checks of local scheme documents/workers that have inherited their policy but have an opaque origin.

So `'self'` inside the sandboxed `srcdoc` still resolves to the embedding page's origin, and both fonts and same-origin scripts would have worked there. This did not change the decision, because the 194KB source-display problem is what killed that route, but it is worth having recorded: **`HtmlLab` demos can load site assets from `/`**. That is not obvious from reading the component.

None of this was verifiable in a browser. See section 10.

### Licences, because the repo goes public

Seventeen faces are vendored: the original twelve, plus five non-pixel body candidates added once the body question narrowed (see the end of section 6). Fifteen are **OFL 1.1**, which permits serving a woff2 from a website with no attribution required on the page, as long as the licence text travels with the file and the font is not sold on its own. Roboto is **Apache-2.0**, which is equally permissive for this purpose. Full list with authors in `public/fonts/LICENSES.txt`.

One is different and is called out separately in that file. **PxPlus IBM VGA 9x16 is CC BY-SA 4.0** (VileR, [The Oldschool PC Font Resource](https://int10h.org/oldschool-pc-fonts/)). That means attribution is required and reachable from the site, and any modified version of the font has to be released under the same licence. Practically: if this face is adopted, a credit line has to exist somewhere permanent, and nobody can subset or re-hint it without inheriting the obligation. Departure Mono carries none of that. If the two are close on merit, the licence is the tiebreaker.

**This is no longer hypothetical.** PxPlus was adopted as the subtitle face, so the credit line is owed, and it is now in the site footer in both languages, naming Departure Mono beside it. The "do not subset" half is a standing constraint on anything added later to shrink the font payload automatically: this one file has to be excluded from it.

A trap worth recording: **the `LICENSE` file at the root of the Departure Mono repository is MIT and covers the website code.** The font's own licence is the OFL 1.1 at `public/assets/LICENSE`. Anyone auditing this later will find the MIT file first.

Faces deliberately excluded on licence grounds: **Berkeley Mono** (commercial; the $75 Developer tier is personal use only), **Perfect DOS VGA 437** (informal "free to use", no formal grant), **Half Bold Pixel-7** and **Minecraftia** (personal use only), **Pixel Operator** (conflicting OFL and CC0 claims across mirrors, source repo returns 404).

### The brand palette is fixed

Red `#e30613`, green `#45b384`, yellow `#f5b200`, blue `#0578be`. These stay, so the colour question is never "what palette" and always "what happens to this palette in a terminal register". That is what the palette lab is: the brand colours are one of seven registers, and the same live contrast arithmetic runs on all of them, so the brand can be compared to CGA and to phosphor on identical terms.

Purple was the exception, since the brand never had one and quotes needed it. It now comes from the old Ghost theme, which painted its whole page in purple without ever putting one in the icon: `#4b15a8`, the accent it used over a ramp of `#080016`, `#160731`, `#210a47` and `#2f0f67`. Recorded here because the source is a site that will stop existing at the DNS cutover.

### The two page grounds, and why neither is grey

Decided after the lab: **`#000000` in dark, a NieR Automata sepia in light.**

The dark ground is true black rather than the near-black `#14161a` it replaced, because on an OLED panel a `#000000` pixel is switched off. That is the entire reason to ask for pitch black, and any lift, however small, gives it up. So when a hint of purple was wanted in the page, it went into `--rule` (`#2b1f42`) and into the quote tints instead of into `--bg`: at the lightness a "hint" implies, roughly `#05000b`, the page reads as black on every display anyway, so the token would have cost the OLED benefit and returned nothing visible. The hint belongs where a few points of lightness are actually perceivable, which is the chrome.

The light ground is `#f4efe0`, warm and slightly down from white. Worth knowing before copying NieR's palette directly: its real background is about `#c8c3b4` with ink near `#4e4b42`, which is a game HUD designed to be read in glances and is too dark to hold 3000 words. What was taken is the hue, lightened until it works as a reading surface. Its ink is warm too (`#332d23`), because a cool near-black on a warm ground is the specific error that makes a sepia page look like a white page with a filter over it.

One knock-on worth recording: the brand blue at `#0578be` measures 4.12:1 on that sepia, under the 4.5 minimum, so `--accent` deepens to `#1a5c96` (6.06:1) in light mode. A warmer ground costs contrast against a cool accent, and the arithmetic has to be redone rather than assumed when the ground moves.

---

## 5. How the demos are built

Twelve Vue islands in `content/blog/theme-lab/components/`, plus five shared files:

- `Knob.vue`, `Pick.vue`, `Toggle.vue`, `Panel.vue`. A slider, a select, a checkbox and a bordered control strip, styled in the site's own tokens.
- `DecisionCopy.vue`. One button, wired into most of the demos above (`ChromeButton.vue` and `CoverLab.vue` do not have it yet). It copies a self-contained prompt to the clipboard: the candidate's name, its component file, every knob's resolved label and value, and the measured contrast for whatever is on screen, plus a line telling whoever pastes it to archive the candidates that lost rather than delete them. It exists because describing a decision from memory kept losing the exact numbers.
- `contrast.ts`. WCAG 2.1 relative luminance and ratio, plus `composite()` for alpha-blending an overlay over a colour, which is what makes the scanline arithmetic honest.
- `faces.ts`. Every vendored face with its licence, its role, whether it is monospaced, and `pixelStep`, which is `0` for an outline face and `16` for the traced bitmap.
- `copy.ts`. Four paragraphs of real Portuguese, a line with every diacritic the language uses, and a code sample with the characters a mono face has to distinguish (`0O 1lI 5S 8B`).
- `fonts.css`. Every `@font-face`, pointing at `/fonts/`.

Retiring a candidate does not delete it. `AGENTS.md` has the rule: the losing component and its prose move into `content/blog/theme-lab-arquivo/`, a `noindex` post, because the rejected options are the argument for an article the owner intends to write about how this redesign was decided. That post does not exist yet, on purpose: nothing has retired yet, and building it before the first candidate actually loses would mean an empty archive with nothing to explain.

Each demo states its own contrast numbers, computed live from whatever the knobs are set to, rather than quoting a number measured once at default settings. That was deliberate: a static number is a claim, and a number that moves while you drag is an argument.

---

## 6. The typography finding, which is the one that matters

The open question in `docs/design.md` is whether body copy can go pixel over 3000 words. Here is what came out of building the specimen.

**The literature, briefly, because it is less ambiguous than expected.** Buchner and Baumgartner (2007, *Ergonomics* 50(7)) found proofreading consistently better with dark text on light, independent of ambient illumination. Piepenbrock et al. (2013, 2014) replicated it across 169 participants, showed pupils measurably smaller under positive polarity, and found the advantage is **largest at small character sizes**. Against that, Nielsen Norman's dark-mode study (n=115) found roughly a third of users prefer dark, a third light, a third switch by context, and concluded dark mode is mostly aesthetic.

On typeface shape: the dyslexia-specific font literature is null or negative. Kuster et al. (2018, n=170 children) found Dyslexie no better than Arial. Wery and Diliberto (2017) found OpenDyslexic **worse** than both Arial and Times on every measure. The one positive result in the whole area, Rello and Baeza-Yates (2013, ASSETS, n=48 with eye tracking), found that **sans-serif, monospaced and roman styles significantly improved reading speed** over serif, proportional and italic. Where any of this literature shows a benefit, it tracks to letter and word spacing rather than to letterform, and the same benefit is reproducible by adding spacing to an ordinary face.

That last point is why the specimen has three spacing sliders rather than one, and why it shows whether the current settings clear WCAG 1.4.12 (line height 1.5, letter spacing 0.12em, word spacing 0.16em). 1.4.12 does not require text to ship at those values; it requires text not to break when a reader forces them. A pixel face with tight default tracking is the most likely thing on this site to break under that, and now it can be tested by dragging.

**The bitmap problem, demonstrated rather than asserted.** PxPlus IBM VGA 9x16 is a traced bitmap and is only crisp at whole multiples of 16px. At 17px or 20px it is interpolated, and interpolating a one-pixel stroke produces grey mush. The `WholePixel` demo renders the same word at fifteen sizes from 8 to 32 and marks which ones close on the grid, with a `zoom` magnifier (integer, so it stays crisp; `transform: scale` would blur and prove the wrong thing).

The demo also carries the anti-aliasing recipe (`-webkit-font-smoothing: none` plus `filter: contrast(100.00001%)` to defeat subpixel rendering) as a toggle, and says the thing that recipe implies: **it depends on behaviour no browser guarantees.** It works on Chrome and Firefox on Linux and Windows, works on macOS, and is unreliable on Safari, which reports a constant device pixel ratio regardless of page zoom. A theme built on a bitmap face is a theme with a rendering dependency in it.

**Where that leaves the twelve faces.**

Genuinely viable for 3000 words of Portuguese:

- **IBM Plex Mono** (OFL). Not pixelated, blocky and industrial. Designed for reading. The answer if the pixel face proves tiring, and the one with no risk attached.
- **Departure Mono** (OFL). A real pixel face and a real outline face at the same time, so it scales to any size and degrades gracefully off-grid. Low x-height, so it reads smaller than its px value suggests, which the size slider makes obvious. **This is the only face in the set that satisfies both halves of the brief without a caveat.**
- **Share Tech Mono** (OFL). Terminal-flavoured without being pixel, narrower than Plex so more characters fit the same measure.
- **VT323** (OFL). Traced from the DEC VT320. Thin strokes, tall, needs 20px and up and needs high contrast to hold.
- **DotGothic16** (OFL). Dot-matrix, proportional, and the closest thing here to a Game Boy that stays readable in running text.

Headings and chrome only:

- **Pixelify Sans** (variable weight, rare in a pixel face), **Jersey 10** (condensed, scoreboard, good for a very large title on one line), **PxPlus IBM VGA** (the literal DOS, with the grid and licence caveats above).

Labels only, and honest about it:

- **Silkscreen** (designed for 8 to 10px, its lowercase behaves as small caps), **Press Start 2P** (roughly double width per character; four words are gorgeous and forty are impossible), **Micro 5** (five pixels tall, ornament only), **Handjet** (variable with element-grid and element-shape axes, which makes it the most tweakable thing in the set and not a reading face).

**The verdict.** Body copy in a pixel face is viable, but only for outline pixel faces and only with the spacing pushed up. It is not viable for a traced bitmap unless the site pins its body size to 16px forever and accepts that Safari may not cooperate. The two-stack plan already in `docs/design.md` survives contact with the evidence, and the interesting question shifts from "pixel or not" to "how far apart the two stacks should be": Departure Mono for both is a coherent site, Departure Mono for display over IBM Plex Mono for body is a safer site, and the specimen lets both be read side by side.

### What the owner decided after reading the specimen

**Display: Departure Mono.** Which is what section 6 argued for, and it is now applied to every heading site-wide at weight 400 (the face ships one weight; asking for bold synthesises a smear).

**Subtitle: PxPlus IBM VGA8**, for post excerpts and section descriptions, at a flat `16px` rather than a rem step. This adopts the traced bitmap deliberately, in the one role where the grid warning above does not bite: a fixed 16px never leaves the whole-pixel grid. It does mean the CC BY-SA attribution obligation from the licence section is now live rather than hypothetical, and that the file must never be subset or re-hinted by a build step.

**Body: still open**, and the shape of the question changed. The stated worry was not legibility but ambiguity: on a blog about code, a monospaced body face and inline code stop being distinguishable, which rules IBM Plex Mono out on a ground the specimen could not measure. Handjet was the next preference but only at 22px with roughly 0.03em added tracking, which is consistent with the spacing literature above and with its own description here as "not a reading face" at default settings.

So five non-pixel faces were vendored to give the specimen a normal book face to argue against: **Inter**, **Roboto** (Apache-2.0), **Source Serif 4**, **Literata** and **Atkinson Hyperlegible** (the rest OFL). Atkinson is worth singling out: it was designed by the Braille Institute specifically to disambiguate confusable letterforms, which is the one accessibility claim in this area with a design rationale rather than a null result behind it.

The pixel faces rejected for body keep their entries above on purpose, because the owner intends to use them for something else.

---

## 7. The candidates, one by one

Each of these is at `/theme-lab/`. What follows is what it is, what its knobs do, and what it costs.

**1. Textmode heading (`TmHeading.vue`).** The screenshot, with a WebGL2 character field behind it. The heading text is real HTML on top of the canvas, which keeps it selectable, in the accessibility tree, and present if WebGL fails; the canvas is `aria-hidden`. Knobs: four movements (concentric wave, column rain, Perlin noise, crossed grid), five character ramps (`░▒▓█`, `.·:•`, `─│┼╬`, `01`, `.-+=*#`), cell size 6-32px, speed 0-200%, density 0-100%, freeze, field colour across the four brand colours plus phosphor and amber, accent word colour, heading face, tracking. Density at 0 removes the field completely, which is a legitimate answer.
Cost: one WebGL2 context and a `requestAnimationFrame` loop for a decoration.

**2. Generated cover (`TmCover.vue`).** Same library, different half of it. Paints cell backgrounds (`cellColor`), which is the ANSI shade-dither technique from section 3, and draws a `╔═╗` frame in characters. Starts frozen, because a cover is a still image and the animation only exists to choose a frame. Knobs: four patterns, seven palettes, cell size, seed, an **art ceiling** that caps how close the shading gets to full brightness, frame on/off, and a title length selector at 23, 58 and 90 characters. That last one answers the open cover question in `docs/design.md` directly.
The art ceiling is the interesting control: it is the single value that trades atmosphere against the legibility of the title sitting on top.

**3. ASCII solid (`TmSolid.vue`).** Torus, box, sphere, cone or cylinder, rotating, resolved into characters by the library's 3D pipeline with ambient and point lighting. For a 404, an about page, or the only ornament in a footer. Knobs: shape, glyph, colour, cell size, radius, rotation speed, lighting on/off, spinning on/off.
Cost: the most expensive of the three, and the readout says so.

**4. CSS heading (`CssHeading.vue`).** The same screenshot with no WebGL at all. Kicker, heading with an accent word, terminal box with a `>_` prompt and a typewriter with a block cursor, tagline, bracketed button. Knobs: six faces, five accents including the reference's own periwinkle `#a8b1ff`, title size, tracking, glow, four border treatments, typing speed, brackets on/off, animation on/off.
This exists so the 194KB of library has to justify itself against something that costs nothing. It is also the only one of the four that would work identically on a phone with a weak GPU.

**5. Type specimen (`TypeSpecimen.vue`).** Now that display and subtitle are decided, this demo picks up where section 6 below leaves off: the title renders in Departure Mono and the deck in PxPlus IBM VGA8, both fixed and labelled as already decided, and the one picker left chooses the body face, from the seven candidates still in play (IBM Plex Mono, Handjet, Inter, Roboto, Source Serif 4, Literata, Atkinson Hyperlegible). Four real paragraphs, a diacritics line, a code sample, four backgrounds (site dark, site light, phosphor, amber). Sliders for size, line height, letter spacing, word spacing and measure, with a live WCAG 1.4.12 verdict. Shows the chosen face's licence, role and width.

**6. Whole-pixel ladder (`WholePixel.vue`).** Fifteen sizes from 8 to 32px, on-grid ones marked. Integer `zoom` magnifier, anti-aliasing kill switch, dark/light background.

**7. Palette lab (`PaletteLab.vue`).** Eight registers: the brand as it is, the site's own ink roles (`--fg`, `--muted`, `--accent` and `--rule`, light and dark, plus the brand purple), canonical CGA, VileR's measured 5153 CGA, P39 phosphor, amber, Game Boy DMG, and Campbell (the Windows Terminal default). Every swatch renders as actual text with its hex, its live contrast ratio and its WCAG grade. The background picker's first two options are the site's real grounds, `#000000` and `#f4efe0`, not an approximation of either, and dark is the default; choosing one of the two hides the background-lightness knob, since it has nothing left to adjust. Remaining knobs: background tint (neutral, cool, warm, green) for the other four backgrounds, a "lighten the colours" mix towards white, and a toggle to measure against the large-text threshold of 3:1 instead of 4.5:1. A counter says how many colours in the current register fail.

**8. CRT effects (`CrtEffects.vue`).** Scanlines with a separate pitch control, glow, grain, vignette, flicker. **Everything starts at zero.** The readout shows the base contrast, the contrast on the dark scanline row, and the difference, recomputed as you drag. There is no curvature and there will not be. The grain is an inline `feTurbulence` SVG rather than a `data:` URI, which keeps it clear of the CSP with nothing to configure.

**9, 10, 11. Chrome (`ChromeHeader.vue`, `ChromeList.vue`, `ChromeButton.vue`).** Five headers (box-drawing bar, inverted DOS status line, minimal dotted rule, Game Boy menu with a `▸` cursor, dense ledger with `SEÇÃO 00 / ÍNDICE` and a version string), four post lists (dense four-column table, ledger with dotted leaders, Game Boy menu, cards with the site's existing thick-left-edge idiom), five buttons (brackets, solid block, double frame, prompt prefix, menu cursor on hover). All character-only: no image, no icon, no request. Every one carries face, tracking, density and colour knobs, and the button demo reports the touch target height against the 44px minimum.

**12. Cover candidates (`CoverLab.vue`).** Section 04, and a different problem from candidate 2 above: this is the actual OG/social card, 1200×630, that ships in `og:image`. Three real `<svg viewBox="0 0 1200 630">` elements, not canvas, because the real generator rasterises that same markup with `sharp` at build time, so what renders here matches exactly what the build will output. The first is a DOS window: black background, a double rectangle frame with the space between the two lines widened after an earlier pass came back too tight to read as a frame rather than a doubled line. The second drops the frame and floods the card in the brand colour at full strength, with a rule at 75% of the card's width under the kicker, and the ink changes to a dark colour only for the one brand hue, yellow, where light text on light would fail. The third is a plasma field from three summed sine waves, unique per post, with the title carrying a hard 3px shadow because the field underneath it can turn light enough to erase plain text. Nothing here calls `Math.random()`: a small string hash of the post's slug picks both the brand colour and the plasma's phase, so a rebuild of an existing post never changes its cover; the lab's own seed knob only adds to that hash so the five brand colours can be cycled through without touching code. Each candidate prints its own live title contrast, and the plasma's is marked as a worst case, since the background underneath it is the one card here that is not a flat colour.

**13. Real text (Section 05, no component).** Not a knobbed candidate: a full post body written as plain markdown, run through the same remark and rehype pipeline as any published post. It exists because judging a body face or a palette against a specimen's isolated paragraphs hides what a real post actually asks of it. The page covers bold, italic, strikethrough and underline (the one emphasis with no markdown syntax of its own, written as a raw `<u>` tag rather than passing through remark like the rest); inline code and two fenced code blocks, one with a filename comment that becomes its tab and one without; a bare blockquote next to a `[!quote]` callout with an author, so both quote treatments render side by side; all seven callout types (`NOTE`, `TIP`, `WARNING`, `CAUTION`, `IMPORTANT`, `QUESTION`, `EXAMPLE`); a footnote, a sidenote and a margin note, through the same `Sidenote.astro` and `MarginNote.astro` used on real posts; both list kinds, including a task list; a horizontal rule; and an image whose caption comes from the markdown title rather than its alt text, backed by a `placeholder.png` generated locally with `sharp` at the real 1200×630. Nothing here has a slider, because the question it answers, whether the winning choices survive an actual post, is not something a knob can answer.

---

## 8. Colour and contrast, with the numbers

All computed rather than quoted, using WCAG 2.1 relative luminance.

The palette lab shows these live, but the ones worth having written down:

| Pair | Ratio | Verdict |
|---|---|---|
| `#FFB000` amber on `#000000` | 11.46:1 | AAA |
| `#20C20E` IBM 5151 green on `#000000` | 8.78:1 | AAA |
| `#FFFFFF` on CGA blue `#0000AA` | 13.29:1 | AAA |
| CGA yellow `#FFFF55` on CGA blue | 12.46:1 | AAA |
| DMG `#9BBC0F` on `#0F380F` | 6.02:1 | AA |
| **CGA brown `#AA5500` on black** | **4.01:1** | **fails body text** |
| **CGA red `#AA0000` on black** | **2.71:1** | **fails everything** |
| **DMG `#8BAC0F` on `#306230`** | **2.75:1** | **fails** |

The authentic DOS palette contains colours that cannot legally carry body text. That is not an argument against the aesthetic, it is a constraint on which two or three of those sixteen colours are allowed to be text and which are allowed only to be decoration. The brand palette has the same shape of problem: green and yellow clear the bar comfortably on the site's dark background, and the brand red does not, which is already true today and is why red is reserved for the unwritten-link marker.

### Scanlines, and why the honest answer is no

Black scanline rows at alpha A, with the loss falling on both text and background:

| Pair | Base | A=0.10 | A=0.15 | A=0.25 | A=0.35 | A=0.50 |
|---|---|---|---|---|---|---|
| `#FFB000` on `#000000` | 11.46 | 9.27 | 8.28 | 6.52 | 5.04 | **3.31** |
| `#33FF33` on `#000000` | 15.49 | 12.42 | 11.04 | 8.59 | 6.52 | 4.12 |
| `#E8E8E8` on `#0D0D0D` | 15.86 | 12.81 | 11.42 | 8.94 | 6.82 | 4.32 |
| `#FFB000` on `#1A1A1A` | 9.50 | 7.88 | 7.13 | 5.75 | 4.54 | **3.06** |

On a pure black background the background cannot get darker, so the whole loss falls on the text. The canonical CSS recipe everyone copies uses `rgba(0,0,0,0.25)` at a 2px pitch, which puts amber on black at 6.52:1. A 2026 style guide recommends 0.06. At 0.06 the effect is barely visible.

That is the whole argument in one sentence: **scanlines are only safe in a range where they are not doing any work.** Above that range they eat contrast; inside it they are indistinguishable from nothing. They are in the lab, at zero, with the arithmetic printed next to the slider, so the conclusion can be reached rather than announced.

There is a second reason, unrelated to contrast. Of the five modern terminal-aesthetic products looked at, **none uses scanlines**, and Ghostty, which literally ships a scanline shader, keeps it out of its own marketing site. Scanlines are the single element that reads as costume rather than design, which is the exact line the brief drew.

If the CRT texture is wanted anyway, the better route is **Workbench**, a Google Fonts face with a `SCAN` variable axis that builds the scanline into the letterforms themselves. That puts the effect inside the glyph, where it is part of the type design and is not an overlay reducing the contrast of everything underneath it. It is not vendored yet (section 10).

### Motion

The relevant rules, exactly:

- **SC 2.3.1**: no more than 3 general flashes in any 1-second period, where a general flash is a pair of opposing luminance changes of 10% or more of maximum, with the darker image below 0.80 relative luminance. Area exemption at 0.006 steradians in any 10-degree field, roughly 21,824 square pixels on a 1024x768 display.
- **SC 2.2.2 (Level A)**: anything moving that starts automatically, lasts more than five seconds, and is presented alongside other content needs a mechanism to pause, stop or hide it.
- **SC 1.4.12**: line height 1.5, paragraph spacing 2x, letter spacing 0.12em, word spacing 0.16em.

What that means here. Every animated candidate has an explicit stop control, which is the 2.2.2 mechanism. The flicker in the CRT demo runs at 0.25Hz, twelve times under the 2.3.1 threshold, and still starts off. And the rule followed for `prefers-reduced-motion: reduce` is the strong one: **do not start the loop at all**, render one static frame, rather than starting and then offering a pause. A canvas that auto-started for more than five seconds and then paused still owes the reader a stop control under 2.2.2, so starting stopped is simpler as well as kinder.

One thing the lab does not yet handle and the real site will have to: `forced-colors: active` (Windows High Contrast) replaces author colours with system colours wholesale. It would strip a phosphor palette, a scanline overlay and a glow in one go. Any of this that ships needs a `forced-colors` branch, and that is a note for implementation rather than a decision to make now.

---

## 9. What was tried and rejected

**Inlining the library into an `HtmlLab` page.** Killed by the double read in `remark-lab-demos.mjs`: 194KB of minified JavaScript would go through expressive-code and into the page as visible source, per demo. Reasoning in section 4.

**Using `HtmlLab` at all.** The iframe is the better vehicle for looks that contradict the site's CSS, and it was the obvious first choice. Giving it up meant accepting that `prose.css` is in scope for every demo. That proved manageable (every rule there is specificity 0,1,1 and loses to a Vue scoped class), but it is a real constraint and the demos are written around it.

**Drawing the heading text into the canvas.** The library has `print` and `printAlign`, and drawing the heading in textmode would have been the more faithful version of the effect. It was not done because a heading that exists only as pixels in a canvas is invisible to search, to a screen reader, and to selection, and because it disappears if WebGL2 is unavailable. The compromise, real HTML on top of a decorative canvas, gives up some fidelity and keeps the page working. If the canvas-drawn version is wanted, it needs a visually-hidden real heading behind it, and that is worth saying out loud rather than discovering later.

**CRT curvature.** Ruled out by the owner. Would have been rejected anyway: barrel distortion on a text page moves the text away from the grid that the rest of the direction depends on.

**A separate type-pairing demo.** Planned, then dropped as redundant: the specimen already has independent display and body face pickers, which is the same thing with fewer moving parts.

**`#00FF41` as "the terminal green".** It is The Matrix, not a phosphor. Replaced with `#20C20E`, which is the IBM 5151's actual P39. Same for `#33FF33`, which is kept only in the contrast table above because it is the value everyone copies.

**Assuming Wolfenstein's menus were blue.** They are dark red. The blue is Spear of Destiny. Corrected in section 3.

**`transform: scale` for the pixel magnifier.** Would have interpolated and demonstrated the exact artefact the demo exists to warn about. Replaced with `zoom`, which multiplies the px size by an integer and stays crisp.

---

## 10. What could not be verified, and what would settle it

**No browser was available in this environment.** No Chromium, no Firefox, no Playwright, no Puppeteer. So what is verified is: the build succeeds, `astro check` reports zero errors, `check-output.ts` passes, all eleven islands appear in `dist/theme-lab/index.html` with same-origin `component-url`s, the textmode chunk is present at `/_astro/textmode.esm.*.js` and is imported by the island chunks, and every `@font-face` in the built CSS points at `/fonts/`. What is **not** verified is that anything renders. Specifically:

- Whether textmode.js's coordinate origin for `translate` is the grid centre. The official example implies it is (`for (let x = -halfCols; x < halfCols; x++)`), and all three canvas demos assume it. If it is top-left instead, the field will be offset rather than absent.
- Whether the 3D primitives shade usefully with `ambientLight` plus `pointLight`, or render as a flat silhouette. Either way something appears.
- Whether passing an external `canvas` plus `ResizeObserver` sizes correctly on first paint. The library only appends its own canvas to `document.body` when it creates one, and it does not when given one, which was read out of the dist source.
- Whether any pixel face has bad diacritics. `copy.ts` has a line with every accent Portuguese uses precisely so this is visible on first load, but nobody has looked at it yet.

**The network in this environment stalled repeatedly.** `curl` to jsDelivr, GitHub and Google Fonts worked; `curl` to `unix.foo`, `tramoia.sh` and `xn--gckvb8fzb.com` hung past a 15-second timeout, and Google Fonts stopped responding partway through a second batch of downloads. Four faces worth testing are therefore listed on the page but not vendored: **Geist Pixel** (Vercel, added 2026-06-10, OFL, with a variable element-shape axis of five shapes), **Bitcount** (Petr van Blokland, 2025, OFL, five axes including a cursive one, built on a 5x7 dot cell), **Doto** (OFL, roundness and weight axes), and **Workbench** (OFL, with the `SCAN` axis discussed in section 8). All four are on Google Fonts and fetchable with `https://fonts.googleapis.com/css2?family=<Name>` and a modern user agent.

**Two more sources worth a second look, also unreachable:** `xn--gckvb8fzb.com` and `tramoia.sh`, both already in `docs/design.md`.

**Things that need a real device, not a browser.** Whether Departure Mono at 17px is comfortable over 3000 words on a phone. Whether the dense four-column post list survives 360px width. Whether the ASCII solid drains a battery noticeably. Whether the whole-pixel behaviour actually holds on a 2x and 3x display, which is the case where the anti-aliasing recipe is most likely to disagree with itself.

---

## 11. Recommendation

**This is mine, and it is a recommendation rather than a decision.**

**Type: Departure Mono for everything, with IBM Plex Mono held in reserve for body.** It is the only face in the set that is a real pixel face and a real outline face at once, so it scales to any size, has no grid dependency, has no Safari dependency, has lowercase, is monospaced, and is OFL with no obligations. Set body at 17 to 18px with line height at least 1.6 and letter spacing around 0.02em, because its x-height is low and it reads smaller than its size suggests. Read three paragraphs of it in the specimen at those settings before committing; if the third paragraph is tiring, keep Departure Mono for display and move body to IBM Plex Mono, and the site loses very little.

**Skip PxPlus IBM VGA.** It is the most authentic thing in the set and it is the wrong trade. Sixteen-pixel multiples only, a rendering behaviour Safari does not guarantee, and a share-alike licence on a repository that goes public. If the DOS register is wanted for one specific element, use it for one specific element and record the credit.

**Animation: candidate 4, the CSS heading, as the default. Candidate 1, the textmode heading, on the home page only.** The typewriter and block cursor are the part of the reference that carries the feeling, and they cost nothing, work everywhere, and stop instantly for reduced motion. The WebGL character field is genuinely better looking and is worth one WebGL2 context on one page. Putting it on every post header means every article page carries 194KB and a render loop for an ornament above the title. Candidate 2, the cover generator, is the one that earns its weight outright, because it runs at build time and ships a PNG.

**Since this was written, the cover question moved on from candidate 2.** The real generator does not use textmode.js at all: it draws the card as plain `<svg>` and rasterises it with `sharp` at build time, so the 194KB library argument above no longer applies to covers, only to the header animation. The three shapes that approach actually produces are section 04's `CoverLab.vue`, covered in section 7, and which of the three wins is still open in `docs/design.md`.

**Scanlines: no.** Section 8 has the arithmetic. They are only safe where they are invisible, none of the modern references use them, and they are the fastest way to make this read as costume. If the texture is wanted, try Workbench's `SCAN` axis instead, which puts it in the letterform where it belongs.

**Colour: the brand palette, unchanged, with the terminal register expressed through background and tracking rather than through hue.** The palette lab makes the case for itself: green and yellow already clear AAA on the site's dark background, and swapping to phosphor green or amber buys atmosphere at the cost of the site no longer looking like this site. This recommendation first pointed at a near-black background; the dark ground decided in section 4 went further, to true `#000000` for the OLED benefit, which only strengthens the point. Brand green as the single accent, and everything else in the neutral ramp gets to the same place without spending the brand.

**Chrome: the ledger header and the ledger post list.** `SEÇÃO 00 / ÍNDICE`, dotted leaders, a version string, uppercase labels tracked to about 0.12em. It is the densest of the options and the only one that still works with a hundred posts in the list. The Game Boy menu is the prettiest thing on the page and it is the one that stops scaling first; it would be a good treatment for a small fixed menu, like reader settings in a footer, and a bad one for an index. Buttons: brackets, with the block-fill reserved for the one primary action per page.

**And one structural suggestion that is not about looks.** The single most valuable idea found in the whole search is The Monospace Web's grid: cell width `1ch`, cell height as a token, every block's height a whole multiple of it. That discipline is what separates a monospace site from a site that uses a monospace font, it is compatible with every candidate above, and it can be adopted independently of which face and which animation win.
