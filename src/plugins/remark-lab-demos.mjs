// `<LabDemo src="./components/Counter.vue" client:visible />` and
// `<HtmlLab src="./components/counter.html" title="..." />` are one line naming a
// file next to the post. This plugin resolves that path against the post's own
// folder, reads the file at build time, and rewrites the tag into what the two
// components actually need:
//
// - `name` (the filename) is derived from `src`, so it is never typed twice.
// - The revealed source becomes a real mdast `code` node, slotted into the
//   component as `slot="source"`, so expressive-code highlights it on its
//   normal pass exactly like any other fenced block in the post. Remark
//   plugins all run before any rehype plugin regardless of where they sit in
//   the `remarkPlugins` array, so this is unaffected by plugin order.
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

function attribute(name, value) {
  return { type: 'mdxJsxAttribute', name, value }
}

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

function jsxElement(name, attributes, children = []) {
  return { type: 'mdxJsxFlowElement', name, attributes, children }
}

/** The lang comes from the file's own extension, so a future third component
 * (a `.ts` playground, say) needs no change here. */
function codeNode(path, value) {
  const lang = extname(path).slice(1)
  return { type: 'code', lang: lang === '' ? 'text' : lang, meta: null, value }
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

/** A valid, unique-per-file identifier for the synthesised import, derived from
 * the file's own name: Counter.vue -> Counter. Two demos that happen to import
 * files with the same basename get suffixed so neither import shadows the other. */
function identifierFor(src, seen) {
  const stem = basename(src, extname(src)).replace(/[^a-zA-Z0-9_$]/g, '_') || 'Component'
  const base = /^[0-9]/.test(stem) ? `_${stem}` : stem.charAt(0).toUpperCase() + stem.slice(1)

  let candidate = base
  let suffix = 2
  while (seen.has(candidate) && seen.get(candidate) !== src) {
    candidate = `${base}${suffix}`
    suffix += 1
  }
  seen.set(candidate, src)
  return candidate
}

function sourceSlot(path, contents) {
  return jsxElement('div', [attribute('slot', 'source')], [codeNode(path, contents)])
}

export function remarkLabDemos() {
  return (tree, file) => {
    const imports = []
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

        if (node.name === 'LabDemo') {
          const clientAttrs = plainAttributes(node).filter((attr) => attr.name.startsWith('client:'))
          const identifier = identifierFor(src, identifiers)
          imports.push({ identifier, src })

          node.attributes = [
            ...withoutAttributes(node, ['src', ...clientAttrs.map((attr) => attr.name)]),
            attribute('name', name),
          ]
          // Anything the post wrote inside the tag is kept, between the island
          // and the source toggle. That is what lets a demo carry sample content
          // in the same panel as its controls: the type specimen drives a real
          // post rendered by this same markdown pipeline, and the post has to be
          // inside the panel for the two to read as one thing.
          node.children = [jsxElement(identifier, clientAttrs), ...node.children, sourceSlot(path, contents)]
        } else {
          node.attributes = [...withoutAttributes(node, ['src']), attribute('name', name), attribute('html', contents)]
          node.children = [sourceSlot(path, contents)]
        }
      }
    }
    walk(tree)

    if (imports.length === 0) return
    const esmNodes = imports.map(({ identifier, src }) => {
      const code = `import ${identifier} from ${JSON.stringify(src)}`
      return { type: 'mdxjsEsm', value: code, data: { estree: Parser.parse(code, { sourceType: 'module', ecmaVersion: 'latest' }) } }
    })
    tree.children.unshift(...esmNodes)
  }
}
