# Decisions

Dated, newest first. What was decided, why, and what the alternative was. Anything still open lives in
`QUESTIONS.md`, not here.

## 2026-08-13, overnight

### Clutter audit: what I applied and what I rejected

An Opus critic reviewed the whole repo under a "delete first" stance. Its two largest recommendations are rejected,
because they are features you asked for in the same session it was reviewing. Its smaller findings are real and are
being applied.

**Rejected**

- **Delete hover previews (~755 lines).** You asked for the pin button, the drag hint and the persistence setting
  today, and asked where the checkbox should live once there is a footer. Requested feature, stays.
- **Delete the wikilink plugin (~145 lines).** Zero uses in content, but you asked for the cross-locale resolution
  rule tonight. Stays.
- **Delete `MissingImage` and `dead-images.json` (~95 lines).** The `urls` array is empty, but 7 remote files are
  already unreachable and listed in `.migration/unreachable-media.md`. This is the component that renders them when
  one is finally declared dead. Stays.
- **Delete the markdown twins and `llms.txt` (~120 lines).** You approved these as a feature. Stays.
- **Take `vendor-media.ts` out of `prebuild`.** You asked for exactly a build step that vendors media before static
  generation. Stays in `prebuild`. The critic's objection (a network call in the build path) is answered by the
  script never failing the build and being a no-op once files are committed.
- **Translations as plain `.md`.** A previous agent switched the collection to `.md` so model output could never be
  MDX. Overruled: figures, embeds and the wikilink marker are produced by remark plugins that emit MDX nodes, and in
  a `.md` file they vanish silently, which would strip every caption and video from a translation. The guard is the
  defence instead, and it now rejects `{expressions}`, `import` and `export` lines.

**Applied**

- `LEAKED_TAG` in `check-output.ts` was missing `Spotify`, `SpeakerDeck`, `MissingImage`, `Tweet` and `Epigraph`, so
  the check that exists to catch a leaked component tag could not see five of them. Real hole.
- One exported component list, so `mdxComponents` in both page trees and the three regexes that name components stop
  drifting. Two of those lists still named `CourseCTA`, deleted weeks ago.
- `slugify` was duplicated byte for byte in `src/lib/taxonomy.ts` and `scripts/build-redirects.ts`. If they drift,
  generated redirects point at tag pages that do not exist.
- `.visually-hidden` was copied into two scoped stylesheets. Moved to the global block.
- The "Part N of M" paragraph sat directly under the full series table of contents. Redundant, removed.
- Comment trimming: the `embed-hosts.ts` header essay, the `PUBLISH_CUTOFF` paragraph repeated in three files, and
  six comments that argue with a previous review pass. Those belong in commit messages.
- `build-redirects.ts` reads slug lists from `.migration/`, which is gitignored, so a fresh clone silently produces a
  redirect file with ~48 fewer rules. Inlined the lists.

**Open, for you**

- `Figure.astro`, `Epigraph.astro`, `Sidenote.astro`, `MarginNote.astro` and `sidenotes.css` (~490 lines) have zero
  uses in 191 posts. `remark-figures` supersedes `Figure` entirely. They are documented in `WRITING.md` as available,
  so deleting them removes authoring options you may want. Left in place, your call.
- Two translation implementations exist: `scripts/translate.ts` (394 lines) and the `claude-code-action` prompt in
  the workflow. The workflow is the live path. The script is now the dead one and should probably go.

### Eight posts already have an English original

You wrote them yourself on dev.to, so a machine translation of the Portuguese would be strictly worse than your own
text. Confirmed matches, all high confidence, one by identical publish timestamp:

| dev.to | post folder |
|---|---|
| Cryptography #0 - Essential Concepts | `criptografia-essencial` |
| Understanding Async Iterators in JavaScript | `async-iterators-js` |
| Defining Static Methods in Interfaces with TypeScript | `interfaces-estaticas-typescript` |
| Why Devs Should Write Articles | `por-que-devs-deveriam-escrever-artigos` |
| Using HarperDB with Kubernetes | `harperdb-kubernetes` |
| How to Run TypeScript Natively in Node.js with TSX | `tsx-loader` |
| Accessing .env Files Natively with Node.js | `dotenv-nodejs` |
| Docker Image Deploy: from VSCode to Azure in a Click | `deploy-de-imagens-docker-do-vscode-para-a-azure` |

Plan: let the machine translation land first, then replace the body and title of those eight with the dev.to text,
keeping this repo's frontmatter contract and local image paths. Four more dev.to posts have no Portuguese counterpart
at all (JavaScript Maps, and three HarperDB pieces), so they are candidates for importing as new posts, your call.

`docs/translation-voice.md` holds the extracted rules, from five of his English posts read in full. One useful
finding: he never uses em-dashes in English either, so the blog's ban matches his own habit.

### Canonical URLs

Every page self-canonicalises. The `canonicalUrl` field is deleted from the schema, the posts, the layout and
`SEO.astro`. Three posts were on Medium first, and a canonical pointing there would hand Google the other domain.
Your call, recorded: the traffic stays here.

### Translation layout

A translation lives in its source post's folder, named after its own slug, with `lang` deciding the language and an
optional `slug` overriding the URL. `content/translated/` is gone, and so is `translationOf`: the folder is the
pairing. One collection, one schema. Images are `./image.png` for both languages because they are in the same folder.

### Theme tokens

Every colour, font stack, size and duration now lives in `src/styles/theme.css`. Two font stacks on purpose:
`--font-display` is where an 8-bit face goes, `--font-body` stays readable for a 3000 word article. See
`docs/design.md`.
