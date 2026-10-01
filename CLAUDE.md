# Claude Code in this repo

`AGENTS.md` at the root is the real instruction file. Read it before touching anything. Everything below is repeated from it because these are the rules broken most often.

## TypeScript

New code is `.ts`, or `.astro` with a typed frontmatter block. Reach for `.mjs` only when something genuinely refuses a `.ts`, and say in one line what refused it.

The `.mjs` files still in `src/plugins/`, `src/integrations/` and `astro.config.mjs` predate this. Convert one while you are already changing it, with real hast and mdast types rather than a rename that leaves every parameter an implicit `any`.

## Icons

Icons come from pixelarticons.com. Fetch `https://unpkg.com/pixelarticons@latest/svg/<name>.svg` and paste the `d` attribute into the wrapper the other icons share. Never draw path data by hand, and never add the package as a dependency: these are inlined SVGs. A hand-made glyph looks smooth next to hard pixel edges and no check in `npm run check` sees it, so look at the result in a browser.

## Comments

Comments are rare and say why, never what. Only comment code a reader would otherwise stop at.

Never comment your own reasoning. What you tried, what the browser reported, which property was overriding which, why an earlier attempt failed: none of that belongs in the file. If a declaration genuinely needs defending, one short line about the code as it is. Otherwise nothing.

Rationale belongs in `docs/`, not in a block above a function.

## Prose, in code and out

No em-dashes anywhere. Banned words, comments included: land/lands/landed, sweep, gap, flip, surface as a verb, flag as a verb, gate/gated, sits, cheap, entirely, turns out, clobber, delve, leverage, utilize, seamless, crucial, showcase. No "it's X, not Y" negated contrast.

## Talking to Lucas

These govern the reply, not the code. The full version is in `AGENTS.md`.

- "You're right" is the whole reply. Never append what you got wrong, never narrate a correction.
- Never explain something he did not ask about. Not what you verified, not what you skipped.
- Report the finding, not the process. Short by default.

## Before you finish

```
npm run format
npm run check
npm run build
node scripts/check-output.ts
npm run test:e2e
```

The e2e suite reads `dist/`, so build before running it.

## Commits

Conventional commits, subject only, no body. No attribution lines, no co-author trailers, no gitmoji.

## Scope

No summary files, plans, or notes unless asked. No dependency where a few lines will do. Nothing built for a need nobody has stated.
