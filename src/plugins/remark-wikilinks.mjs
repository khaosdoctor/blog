// `[[slug]]` becomes a real link, so Obsidian's autocomplete and graph view work
// while writing and the reader still gets an ordinary <a href="/slug/">.
//
// Forms: [[slug]], [[slug|label]], [[slug#heading]], [[slug#heading|label]].
// A link to a draft still links, and carries the same "not written yet" marker
// the series table of contents uses, so the two agree. A link to a slug that does
// not exist at all fails the build, which is the only way a typo gets caught.

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import GithubSlugger from 'github-slugger'
import { visit } from 'unist-util-visit'

const BASE = 'content/blog'
const PATTERN = /\[\[([^\]|#]+)(#[^\]|]+)?(?:\|([^\]]+))?\]\]/g

/** slug -> { draft, title }, read once per build. */
let posts = null

function index() {
  if (posts !== null) return posts
  posts = new Map()
  for (const slug of readdirSync(BASE)) {
    const file = ['index.mdx', 'index.md']
      .map((name) => `${BASE}/${slug}/${name}`)
      .find((path) => existsSync(path))
    if (file === undefined) continue
    const front = readFileSync(file, 'utf8').split('---')[1] ?? ''
    posts.set(slug, {
      draft: /^draft:\s*true/m.test(front),
      title: front.match(/^title:\s*"?(.*?)"?\s*$/m)?.[1] ?? slug,
    })
  }
  return posts
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

      for (const match of node.value.matchAll(PATTERN)) {
        const [raw, target, fragment, label] = match
        const slug = target.trim()
        const post = index().get(slug)

        if (post === undefined) {
          throw new Error(
            `${file.path ?? 'a post'}: [[${slug}]] points at no post. ` +
              `Expected ${BASE}/${slug}/index.mdx. Fix the link or create the post.`,
          )
        }

        if (match.index > cursor) {
          children.push({ type: 'text', value: node.value.slice(cursor, match.index) })
        }
        cursor = match.index + raw.length

        const text = (label ?? post.title).trim()
        children.push({
          type: 'link',
          url: `/${slug}/${anchor(fragment)}`,
          children: [{ type: 'text', value: text }],
        })

        // The link still works, it just says so: a draft has no page until it is
        // published. Marked in the language of the post doing the linking.
        if (post.draft) {
          const lang = file.data?.astro?.frontmatter?.lang === 'en' ? 'en' : 'pt'
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
