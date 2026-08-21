# Claude Code in this repo

`AGENTS.md` at the root is the real instruction file. Read it before touching anything. Everything below is repeated from it because these are the rules broken most often.

## Comments

Comments are rare and say why, never what. Only comment code a reader would otherwise stop at.

Never comment your own reasoning. What you tried, what the browser reported, which property was overriding which, why an earlier attempt failed: none of that belongs in the file. If a declaration genuinely needs defending, one short line about the code as it is. Otherwise nothing.

Rationale belongs in `docs/`, not in a block above a function.

## Prose, in code and out

No em-dashes anywhere. Banned words, comments included: land/lands/landed, sweep, gap, flip, surface as a verb, flag as a verb, gate/gated, sits, cheap, entirely, turns out, clobber, delve, leverage, utilize, seamless, crucial, showcase. No "it's X, not Y" negated contrast.

## Before you finish

```
npm run check
npm run build
node scripts/check-output.ts
```

## Commits

Conventional commits, body under about 330 characters. No attribution lines, no co-author trailers, no gitmoji.

## Scope

No summary files, plans, or notes unless asked. No dependency where a few lines will do. Nothing built for a need nobody has stated.
