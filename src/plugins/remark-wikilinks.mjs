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
// that locale's title: the reader is going to land on a Portuguese article, so
// the link should say so.

import { readFileSync, readdirSync } from 'node:fs'
import GithubSlugger from 'github-slugger'
import { visit } from 'unist-util-visit'

const BASE = 'content/blog'
const PATTERN = /\[\[([^\]|#]+)(#[^\]|]+)?(?:\|([^\]]+))?\]\]/g

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
    lang: front.match(/^lang:\s*"?([a-z]{2})"?/m)?.[1] ?? 'pt',
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
  for (const folder of readdirSync(BASE).sort()) {
    const dir = `${BASE}/${folder}`
    for (const name of readdirSync(dir).sort()) {
      if (!/\.mdx?$/.test(name)) continue
      const front = read(`${dir}/${name}`)
      if (front === null) continue

      const isIndex = name === 'index.mdx' || name === 'index.md'
      // The file's own slug frontmatter wins, else index.* answers on the
      // folder name, else the filename itself is the slug.
      const urlSlug = front.slug ?? (isIndex ? folder : name.replace(/\.mdx?$/, ''))
      const url = front.lang === 'pt' ? `/${urlSlug}/` : `/${front.lang}/${urlSlug}/`
      record(folder, front.lang, { draft: front.draft, title: front.title ?? folder, url })
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
 * Same copy as the `notWrittenYet` key in src/i18n/ui.ts. It is duplicated here
 * because this is a build-time .mjs plugin and cannot import the TS module; keep
 * the two in step if the wording changes.
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
      if (!PATTERN.test(node.value)) return
      PATTERN.lastIndex = 0

      const children = []
      let cursor = 0
      // The locale of the page doing the linking, the same signal the draft marker
      // below uses.
      const locale = file.data?.astro?.frontmatter?.lang ?? 'pt'

      for (const match of node.value.matchAll(PATTERN)) {
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
        children.push({
          type: 'link',
          url: `${post.url}${anchor(fragment)}`,
          children: [{ type: 'text', value: text }],
        })

        // The link still works, it just says so: a draft has no page until it is
        // published. Marked in the language of the post doing the linking.
        if (post.draft) {
          const lang = locale in NOT_WRITTEN_YET ? locale : 'pt'
          children.push(
            { type: 'text', value: ' ' },
            {
              type: 'mdxJsxTextElement',
              name: 'span',
              attributes: [{ type: 'mdxJsxAttribute', name: 'class', value: 'draft-note' }],
              children: [{ type: 'text', value: `(${NOT_WRITTEN_YET[lang]})` }],
            },
          )
        }
      }

      if (cursor < node.value.length) {
        children.push({ type: 'text', value: node.value.slice(cursor) })
      }

      parent.children.splice(position, 1, ...children)
      return position + children.length
    })
  }
}
