// `[[slug]]` becomes a real link, so Obsidian's autocomplete and graph view work
// while writing and the reader still gets an ordinary <a href="/slug/">.
//
// Forms: [[slug]], [[slug|label]], [[slug#heading]], [[slug#heading|label]].
// A link to a draft still links, and carries the same "not written yet" marker
// the series table of contents uses, so the two agree. A link to a slug that does
// not exist at all fails the build, which is the only way a typo gets caught.
//
// A wikilink is always written as [[folder-name]], the Portuguese slug, because
// that is the one Obsidian autocompletes. A translation lives beside its source
// in the same folder, named after its own slug (content/blog/<folder>/<file>.mdx),
// with its own `lang` frontmatter. A wikilink resolves in the locale of the page
// it is written on, so an English page links the English file in that folder.
// When that file does not exist yet the link falls back to another locale, with
// that locale's title: the reader is going to arrive at a Portuguese article, so
// the link should say so.

import { readdirSync, readFileSync } from 'node:fs'
import GithubSlugger from 'github-slugger'
import { visit } from 'unist-util-visit'
import { asLocale, postUrl } from '../i18n/locales.ts'
import { slugFrom } from '../lib/post-file.mjs'
import { localeFromFile } from './mdx-util.mjs'

const BASE = 'content/blog'
// Exported so the MDX transform cache can scan a post's raw text for the same
// targets this plugin resolves, without keeping a second copy of the syntax.
export const PATTERN = /\[\[([^\]|#]+)(#[^\]|]+)?(?:\|([^\]]+))?\]\]/g

/** folder name (the pt slug) -> locale -> { draft, title, url }, read once per build. */
let posts = null

/** null when the file has no frontmatter, e.g. a stray note Obsidian created. */
function read(path) {
  const text = readFileSync(path, 'utf8')
  if (!text.startsWith('---')) return null
  const front = text.split('---')[1] ?? ''
  return {
    draft: /^draft:\s*true/m.test(front),
    title: front.match(/^title:\s*"?(.*?)"?\s*$/m)?.[1],
    lang: asLocale(front.match(/^lang:\s*"?([a-z]{2})"?/m)?.[1]),
    slug: front.match(/^slug:\s*"?([^"\s]+)"?\s*$/m)?.[1],
  }
}

function record(folder, locale, entry) {
  const byLocale = posts.get(folder) ?? new Map()
  // First writer wins, which is why files within a folder are read in sorted order.
  if (!byLocale.has(locale)) byLocale.set(locale, entry)
  posts.set(folder, byLocale)
}

function index() {
  if (posts !== null) return posts
  posts = new Map()

  // Sorted, so the fallback a page gets never depends on directory order.
  const dirs = readdirSync(BASE, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
  for (const dirEntry of dirs) {
    const dir = `${BASE}/${dirEntry}`
    for (const name of readdirSync(dir).sort()) {
      if (!/\.mdx?$/.test(name)) continue
      const front = read(`${dir}/${name}`)
      if (front === null) continue

      const url = postUrl(front.slug ?? slugFrom(dirEntry, name), front.lang)
      record(dirEntry, front.lang, { draft: front.draft, title: front.title ?? dirEntry, url })
    }
  }
  return posts
}

/**
 * The reader's own locale first, then whatever else has the post. Insertion order
 * makes that fallback the source-language post whenever one exists, since files
 * are read in sorted order and index.mdx sorts before any translation's filename.
 */
function resolve(slug, locale) {
  const byLocale = index().get(slug)
  if (byLocale === undefined) return undefined
  return byLocale.get(locale) ?? byLocale.values().next().value
}

/**
 * Same copy as the `notWrittenYet` key in src/i18n/ui.ts. The plugin layer
 * keeps its own copy here rather than importing from that module; keep the two
 * in step if the wording changes.
 */
const NOT_WRITTEN_YET = { pt: 'ainda não escrito', en: 'not written yet' }

/**
 * An anchor is written as the heading text, so it has to slugify exactly the way
 * the heading ids do. github-slugger is what Astro itself uses, and it keeps
 * accents: `## Conclusão` becomes `#conclusão`, not `#conclusao`. Imitating that
 * by hand produced anchors that silently pointed at nothing.
 */
function anchor(fragment) {
  if (fragment === undefined) return ''
  return `#${new GithubSlugger().slug(fragment.slice(1).trim())}`
}

export function remarkWikilinks() {
  return (tree, file) => {
    visit(tree, 'text', (node, position, parent) => {
      if (parent === undefined || position === undefined) return
      // Code spans and fenced blocks are separate node types, so nested JS
      // arrays like [['a']] inside a snippet are never touched here.
      const matches = [...node.value.matchAll(PATTERN)]
      if (matches.length === 0) return

      const children = []
      let cursor = 0
      // The locale of the page doing the linking, the same signal the draft marker
      // below uses.
      const locale = localeFromFile(file)

      for (const match of matches) {
        const [raw, target, fragment, label] = match
        const slug = target.trim()
        const post = resolve(slug, locale)

        if (post === undefined) {
          throw new Error(
            `${file.path ?? 'a post'}: [[${slug}]] points at no post, in any locale. ` +
              `Expected ${BASE}/${slug}/index.mdx. Fix the link or create the post.`,
          )
        }

        if (match.index > cursor) {
          children.push({ type: 'text', value: node.value.slice(cursor, match.index) })
        }
        cursor = match.index + raw.length

        // The title comes from the post that was resolved, not from the source
        // language: an English page linking a post nobody has translated yet shows
        // the Portuguese title, which is what the reader will find on arrival.
        const text = (label ?? post.title).trim()
        // Wikipedia's convention for a page that does not exist yet: the link is a
        // different colour and nothing else. The note goes in the title attribute so
        // a reader who cannot see the colour is told on hover and through a screen
        // reader, without a parenthesis interrupting the sentence.
        children.push({
          type: 'link',
          url: `${post.url}${anchor(fragment)}`,
          title: post.draft ? NOT_WRITTEN_YET[locale] : null,
          data: post.draft ? { hProperties: { className: ['link-unwritten'] } } : undefined,
          children: [{ type: 'text', value: text }],
        })
      }

      if (cursor < node.value.length) {
        children.push({ type: 'text', value: node.value.slice(cursor) })
      }

      parent.children.splice(position, 1, ...children)
      return position + children.length
    })
  }
}
