/**
 * Astro's GFM footnotes put the footnote body once, at the foot of the post,
 * and the reader has to jump there and back to read it. This plugin does not
 * move or remove that list (it must stay reachable at its own anchor, and is
 * the only copy a reader with CSS off or an RSS reader ever sees), it copies
 * each footnote body into an `<aside class="footnote-aside">` right after the
 * paragraph that references it, so src/styles/footnotes.css can float it into
 * the margin on a wide viewport. Which copy a reader meets is a viewport
 * question src/styles/footnotes.css answers on its own.
 *
 * The copy is build-time only, no client fetch, and works with JS disabled.
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
import { localeFromFile, walkElements } from './mdx-util.mjs'

const BLOCK_TAGS = new Set(['p', 'li', 'td', 'th', 'dd'])

/**
 * Same copy as the `footnotes` key in src/i18n/ui.ts. The plugin layer
 * keeps its own copy here rather than importing from that module; keep the
 * two in step if the wording changes.
 */
const FOOTNOTES_LABEL = { pt: 'Notas de rodapé', en: 'Footnotes' }

/**
 * GFM writes the back-arrow's label itself, in English, on every page. `%s` is
 * the reference number, which the original carries as "Back to reference 1".
 */
const BACKREF_LABEL = { pt: 'Voltar para a referência %s', en: 'Back to reference %s' }

export function rehypeFootnoteAsides() {
  return (tree, file) => {
    const section = findFootnoteSection(tree)
    if (!section) return

    const locale = localeFromFile(file)
    relabelHeading(section, locale)
    relabelBackrefs(section, locale)

    const definitions = new Map()
    for (const li of findListItems(section)) {
      definitions.set(li.properties.id, li.children)
    }
    if (definitions.size === 0) return

    insertAsides(tree.children, definitions, new Set())
  }
}

function relabelHeading(section, locale) {
  const heading = section.children.find((child) => child.type === 'element' && child.tagName === 'h2')
  const label = heading?.children.find((child) => child.type === 'text')
  if (label) label.value = FOOTNOTES_LABEL[locale]
}

/**
 * Rewrites every back-arrow's aria-label in the page's own language, keeping
 * whatever reference number GFM already put in it.
 */
function relabelBackrefs(section, locale) {
  walkElements(section, (node) => {
    if (node.type !== 'element' || node.properties?.dataFootnoteBackref === undefined) return

    const current = node.properties['ariaLabel']
    if (typeof current !== 'string') return
    // The number is the only part worth keeping: everything else is English GFM
    // hardcodes and cannot be configured.
    const reference = /(\d+(?:[-:]\d+)*)\s*$/.exec(current)?.[1] ?? ''
    node.properties['ariaLabel'] = BACKREF_LABEL[locale].replace('%s', reference)
  })
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
 * getting a second aside if it falls inside more than one BLOCK_TAGS ancestor
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

    const asides = []
    for (const ref of refs) {
      const aside = buildAside(ref, definitions)
      if (aside === null) continue
      makeTrigger(ref, aside.properties.id)
      asides.push(aside)
    }
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

  const clonedBody = cloneFootnoteBody(body)
  // The reference number is already known at build time (it is the text GFM
  // put inside the <a data-footnote-ref> itself), so it is written here as
  // real text rather than a CSS counter, which has no way to guarantee it
  // matches the reference's own numbering. Same bracket shape the reference
  // renders (see the sup ::before/::after in footnotes.css).
  const number = textContent(ref).trim()
  const head = {
    type: 'element',
    tagName: 'span',
    properties: { className: ['footnote-aside-head'] },
    children: [{ type: 'text', value: `[${number}]` }],
  }

  return {
    type: 'element',
    tagName: 'aside',
    // The hook src/components/Footnotes.astro needs to pair this
    // aside with its reference for the hover/focus highlight-and-grow: the
    // reference's own id, not a fresh one, so the script resolves it with a
    // plain getElementById instead of parsing anything at runtime.
    //
    // `popover` is what makes this one element serve both layouts: the browser
    // keeps it hidden and opens it in the top layer below the margin
    // breakpoint, and footnotes.css overrides that display back to a float
    // above it, where the note is already on screen.
    properties: {
      className: ['footnote-aside'],
      id: `${refId}-margin`,
      dataFootnoteRefId: refId,
      popover: '',
    },
    children: number ? [head, ...clonedBody] : clonedBody,
  }
}

/**
 * Turns GFM's reference link into the popover's trigger, in place. A button
 * rather than an anchor because the note now opens where the reader is
 * standing instead of sending them to the foot of the post, and `popovertarget`
 * only acts on a button. The reference keeps its own id, so the back-arrow in
 * the foot-of-post copy still has somewhere to return to.
 */
function makeTrigger(ref, asideId) {
  const id = typeof ref.properties?.id === 'string' ? ref.properties.id : undefined
  ref.tagName = 'button'
  ref.properties = {
    type: 'button',
    id,
    className: ['footnote-ref'],
    popovertarget: asideId,
    dataFootnoteRef: '',
  }
}

/** Flattens an element's text content, the way `ref` (an `<a
 * data-footnote-ref>` whose only child is the counter GFM assigned it, see
 * mdast-util-to-hast's footnote-reference handler) needs to be read as a
 * plain string. */
function textContent(node) {
  if (node.type === 'text') return node.value
  if (!Array.isArray(node.children)) return ''
  return node.children.map(textContent).join('')
}

/** Deep-clones the footnote body, drops the backref arrow (meaningless in
 * the margin) and the whitespace it leaves behind, and drops every `id`
 * (a straight copy would duplicate one, which is invalid regardless of
 * whether the clone is hidden from assistive tech). */
function cloneFootnoteBody(nodes) {
  return dropBackref(nodes.map(cloneNode))
}

function cloneNode(node) {
  if (node.type === 'text') return { type: 'text', value: node.value }
  if (node.type !== 'element') return { ...node }

  const { id: _id, ...properties } = node.properties ?? {}
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
