// `<LabDemo src="./components/Counter.vue" client:visible />` and
// `<HtmlLab src="./components/counter.html" title="..." />` are one line naming a
// file next to the post. This plugin resolves that path against the post's own
// folder, reads the file at build time, and rewrites the tag into what the two
// components actually need:
//
// - `name` (the filename) is derived from `src`, so it is never typed twice.
// - `source` is the URL of the page that file is highlighted on, built by the
//   `labSource` collection. The source is never inlined here: a post carrying a
//   folder of demos, all highlighted into one page, reaches many megabytes of HTML
//   that a reader who opens no demo pays for in full.
// - `<LabDemo>` needs a real component reference for its client directive, not
//   a string, so this also synthesises the `import Counter from
//   './components/Counter.vue'` line as an `mdxjsEsm` node at the top of the
//   file. MDX only records that import in the compiled output if the node
//   carries a parsed `data.estree`, the same field the original parser fills
//   in for an import a person types by hand, so the string is parsed with the
//   `acorn` MDX itself depends on to produce it.
//
// A typo in `src` throws here, naming the file and the path it resolved to,
// the same treatment a broken wikilink gets.

import { existsSync, readFileSync } from 'node:fs'
import { basename, extname, resolve } from 'node:path'
import { Parser } from 'acorn'
import { labSourceId, labSourceUrl } from '../lib/lab-source.ts'
import { attribute, jsxElement } from './mdx-util.mjs'

function plainAttributes(node) {
  return node.attributes.filter((attr) => attr.type === 'mdxJsxAttribute')
}

function attributeValue(node, name) {
  return plainAttributes(node).find((attr) => attr.name === name)?.value ?? null
}

/** Every attribute except the named plain ones. A `{...spread}` is left alone. */
function withoutAttributes(node, names) {
  return node.attributes.filter((attr) => attr.type !== 'mdxJsxAttribute' || !names.includes(attr.name))
}

function readSource(file, src) {
  const path = resolve(file.dirname, src)
  if (!existsSync(path)) {
    throw new Error(`${file.path}: src="${src}" does not exist. Expected ${path}.`)
  }
  return { path, contents: readFileSync(path, 'utf8') }
}

function requireSrc(node, file) {
  const src = attributeValue(node, 'src')
  if (src === null) {
    throw new Error(`${file.path}: <${node.name}> has no src="..." attribute.`)
  }
  return src
}

/** A valid identifier for the synthesised import, derived from the file's own
 * name: Counter.vue -> Counter. Every src in a post is a flat sibling file, so
 * two different files can never share one. */
function identifierFor(src, identifiers) {
  const stem = basename(src, extname(src)).replace(/[^a-zA-Z0-9_$]/g, '_') || 'Component'
  const identifier = /^[0-9]/.test(stem) ? `_${stem}` : stem.charAt(0).toUpperCase() + stem.slice(1)
  identifiers.set(identifier, src)
  return identifier
}

export function remarkLabDemos() {
  return (tree, file) => {
    const identifiers = new Map()

    const walk = (parent) => {
      if (!Array.isArray(parent.children)) return
      for (const node of parent.children) {
        if (node.type !== 'mdxJsxFlowElement' || (node.name !== 'LabDemo' && node.name !== 'HtmlLab')) {
          walk(node)
          continue
        }

        const src = requireSrc(node, file)
        const { path, contents } = readSource(file, src)
        const name = basename(src)
        const source = attribute('source', labSourceUrl(labSourceId(file.dirname, path)))

        if (node.name === 'LabDemo') {
          const clientAttrs = plainAttributes(node).filter((attr) => attr.name.startsWith('client:'))
          const identifier = identifierFor(src, identifiers)

          node.attributes = [
            ...withoutAttributes(node, ['src', ...clientAttrs.map((attr) => attr.name)]),
            attribute('name', name),
            source,
          ]
          // Anything the post wrote inside the tag is kept, after the island.
          // That is what lets a demo carry sample content in the same panel as
          // its controls: the type specimen drives a real post rendered by this
          // same markdown pipeline, and the post has to be inside the panel for
          // the two to read as one thing.
          node.children = [jsxElement(identifier, clientAttrs), ...node.children]
        } else {
          node.attributes = [
            ...withoutAttributes(node, ['src']),
            attribute('name', name),
            attribute('html', contents),
            source,
          ]
          node.children = []
        }
      }
    }
    walk(tree)

    if (identifiers.size === 0) return
    const esmNodes = [...identifiers].map(([identifier, src]) => {
      const code = `import ${identifier} from ${JSON.stringify(src)}`
      return {
        type: 'mdxjsEsm',
        value: code,
        data: { estree: Parser.parse(code, { sourceType: 'module', ecmaVersion: 'latest' }) },
      }
    })
    tree.children.unshift(...esmNodes)
  }
}
