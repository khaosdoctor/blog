/**
 * Astro's GFM footnotes put the footnote body once, at the foot of the post,
 * and the reader has to jump there and back to read it. This plugin does not
 * move or remove that list (it must stay reachable at its own anchor), it
 * copies each footnote body into an `<aside class="footnote-aside">` right
 * after the paragraph that references it, so src/styles/footnotes.css can
 * float it into the margin on a wide viewport or reveal it on hover/focus on
 * a narrow one. See that file for the two layouts.
 *
 * The copy is build-time only, no client fetch, and works with JS disabled.
 * It is also why the copy carries `aria-hidden="true"`: the accessible
 * footnote is the one at the foot of the page, and a screen reader should
 * never meet the same text twice.
 *
 * It also relabels the section's own `<h2>`: GFM hardcodes the English word
 * "Footnotes" in every locale.
 *
 * Expected input shape (astro build with a footnote in the post):
 *   <p>text<sup><a href="#user-content-fn-1" id="user-content-fnref-1"
 *        data-footnote-ref>1</a></sup></p>
 *   ...
 *   <section data-footnotes>
 *     <h2 id="footnote-label" class="sr-only">Footnotes</h2>
 *     <ol><li id="user-content-fn-1"><p>the note <a data-footnote-backref
 *       href="#user-content-fnref-1">↩</a></p></li></ol>
 *   </section>
 */

// Where a footnote reference can sit without a wrapping <p> (a tight list
// item, a table cell). The aside goes right after whichever of these is the
// nearest ancestor, so nested cases (a footnote inside a blockquote's <p>)
// are handled by recursing into children before checking the node itself.
const BLOCK_TAGS = new Set(['p', 'li', 'td', 'th', 'dd'])

/**
 * Same copy as the `footnotes` key in src/i18n/ui.ts. Duplicated here
 * because this is a build-time .mjs plugin and cannot import the TS module;
 * keep the two in step if the wording changes.
 */
const FOOTNOTES_LABEL = { pt: 'Notas de rodapé', en: 'Footnotes' }

export function rehypeFootnoteSidenotes() {
  return (tree, file) => {
    const section = findFootnoteSection(tree)
    if (!section) return

    relabelHeading(section, localeFromFile(file))

    const definitions = new Map()
    for (const li of findListItems(section)) {
      definitions.set(li.properties.id, li.children)
    }
    if (definitions.size === 0) return

    insertAsides(tree.children, definitions, new Set())
  }
}

// Mirrors remarkWikilinks (src/plugins/remark-wikilinks.mjs), the other
// build-time plugin that needs the page's locale: Astro attaches the
// frontmatter it already parsed to the same VFile every remark/rehype
// plugin receives, so the URL does not have to be reverse-engineered here.
function localeFromFile(file) {
  return file?.data?.astro?.frontmatter?.lang === 'en' ? 'en' : 'pt'
}

function relabelHeading(section, locale) {
  const heading = section.children.find((child) => child.type === 'element' && child.tagName === 'h2')
  const label = heading?.children.find((child) => child.type === 'text')
  if (label) label.value = FOOTNOTES_LABEL[locale]
}

function findFootnoteSection(node) {
  if (node.type === 'element' && node.tagName === 'section' && hasProperty(node, 'dataFootnotes')) {
    return node
  }
  if (!Array.isArray(node.children)) return null
  for (const child of node.children) {
    const found = findFootnoteSection(child)
    if (found) return found
  }
  return null
}

function findListItems(node, out = []) {
  if (node.type === 'element' && node.tagName === 'li' && typeof node.properties?.id === 'string') {
    out.push(node)
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) findListItems(child, out)
  }
  return out
}

/**
 * Walks a children array in place, splicing a footnote-aside after every
 * block element that contains a reference. `handled` stops a reference from
 * getting a second aside if it sits inside more than one BLOCK_TAGS ancestor
 * (a footnote in a list item's own paragraph: both the `<p>` and the `<li>`
 * qualify, and the `<p>` should win since it is the closer match).
 */
function insertAsides(children, definitions, handled) {
  for (let i = 0; i < children.length; i++) {
    const node = children[i]
    if (node.type !== 'element') continue

    if (Array.isArray(node.children)) {
      insertAsides(node.children, definitions, handled)
    }

    if (!BLOCK_TAGS.has(node.tagName)) continue

    const refs = findFootnoteRefs(node).filter((ref) => !handled.has(ref))
    if (refs.length === 0) continue
    for (const ref of refs) handled.add(ref)

    const asides = refs.map((ref) => buildAside(ref, definitions)).filter(Boolean)
    if (asides.length === 0) continue

    if (node.tagName === 'p') {
      children.splice(i + 1, 0, ...asides)
      i += asides.length
    } else {
      // <li>/<td>/<th>/<dd> can hold block content directly, but their own
      // parent (<ul>/<ol>/<tr>) cannot: a tight list item or a table cell
      // with no wrapping <p> gets the aside appended inside itself instead
      // of spliced in next to it, which would be invalid there.
      node.children.push(...asides)
    }
  }
}

function findFootnoteRefs(node, out = []) {
  if (node.type === 'element') {
    if (hasProperty(node, 'dataFootnoteRef')) out.push(node)
    if (Array.isArray(node.children)) {
      for (const child of node.children) findFootnoteRefs(child, out)
    }
  }
  return out
}

function buildAside(ref, definitions) {
  const href = ref.properties?.href
  if (typeof href !== 'string' || !href.startsWith('#')) return null

  const body = definitions.get(href.slice(1))
  if (!body) return null

  // Falls back to the target id on the rare footnote whose reference link
  // carries no id of its own, so the aside still gets something unique.
  const refId = typeof ref.properties?.id === 'string' ? ref.properties.id : href.slice(1)

  return {
    type: 'element',
    tagName: 'aside',
    properties: { className: ['footnote-aside'], id: `${refId}-margin`, 'aria-hidden': 'true' },
    children: cloneFootnoteBody(body),
  }
}

/** Deep-clones the footnote body, drops the backref arrow (meaningless in
 * the margin) and the whitespace it leaves behind, and drops every `id`
 * (a straight copy would duplicate one, an accessibility-tree ghost since
 * the clone is aria-hidden but still a DOM validity problem). */
function cloneFootnoteBody(nodes) {
  return dropBackref(nodes.map(cloneNode))
}

function cloneNode(node) {
  if (node.type === 'text') return { type: 'text', value: node.value }
  if (node.type !== 'element') return { ...node }

  const { id, ...properties } = node.properties ?? {}
  return {
    type: 'element',
    tagName: node.tagName,
    properties,
    children: (node.children ?? []).map(cloneNode),
  }
}

function dropBackref(nodes) {
  const out = []
  for (const node of nodes) {
    if (node.type === 'element' && hasProperty(node, 'dataFootnoteBackref')) continue
    if (node.type === 'element') node.children = dropBackref(node.children)
    out.push(node)
  }

  const last = out.at(-1)
  if (last?.type === 'text' && /^\s+$/.test(last.value)) out.pop()
  return out
}

// mdast-util-to-hast (node_modules/mdast-util-to-hast/lib/{footer,handlers/
// footnote-reference}.js) hardcodes these hast property keys as camelCase,
// not the hyphenated `data-footnote-ref` attribute name that ends up in the
// rendered HTML, so checks here have to match the camelCase form.
function hasProperty(node, name) {
  return Object.hasOwn(node.properties ?? {}, name)
}
