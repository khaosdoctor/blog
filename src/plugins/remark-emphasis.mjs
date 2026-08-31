// A paragraph made only of `==text==` becomes an emphasis block: a passage that
// carries weight without claiming to be a citation. It is Obsidian's own
// highlight mark, so the same paragraph reads as emphasis in the vault.
//
// Deliberately not the lone bold paragraph, which was the other candidate: a
// bold-only paragraph already means "a subheading" or "the line that opens this
// list" in these posts, and turning it into a block changed 16 pages that had
// asked for nothing.
//
// See src/styles/variants/emphasis.css. Delete both files and drop this from
// astro.config.mjs to remove the feature.

import { visit } from 'unist-util-visit'

const WHOLE = /^==([\s\S]+)==$/

/**
 * Splits the opening letter into its own inline element. The block is
 * underlined, and an underline propagates through every inline descendant
 * except an atomic one, so the drop cap has to be an inline-block to escape it.
 * ::first-letter cannot: `display` does not apply to it.
 */
function withCap(children) {
  const first = children[0]
  if (first?.type !== 'text') return children
  const [cap] = Array.from(first.value)
  if (cap === undefined || cap.trim() === '') return children

  return [
    {
      type: 'mdxJsxTextElement',
      name: 'span',
      attributes: [{ type: 'mdxJsxAttribute', name: 'class', value: 'em-cap' }],
      children: [{ type: 'text', value: cap }],
    },
    { ...first, value: first.value.slice(cap.length) },
    ...children.slice(1),
  ]
}

/**
 * The children of a paragraph written wholly as `==...==`, or null. Remark has
 * no mark node, so the markers arrive as literal text on the edges.
 */
function loneHighlight(node) {
  const children = node.children.filter((child) => !(child.type === 'text' && child.value.trim() === ''))
  const first = children[0]
  const last = children[children.length - 1]
  if (first?.type !== 'text' || last?.type !== 'text') return null

  // One child holding the whole thing, or a run that opens and closes on the edges.
  if (children.length === 1) {
    const match = WHOLE.exec(first.value.trim())
    return match === null ? null : [{ type: 'text', value: match[1] }]
  }
  if (!first.value.startsWith('==') || !last.value.endsWith('==')) return null
  const inner = structuredClone(children)
  inner[0] = { ...inner[0], value: inner[0].value.slice(2) }
  inner[inner.length - 1] = {
    ...inner[inner.length - 1],
    value: inner[inner.length - 1].value.slice(0, -2),
  }
  return inner
}

export function remarkEmphasis() {
  return (tree) => {
    visit(tree, 'paragraph', (node, index, parent) => {
      if (parent === undefined || index === undefined) return
      const highlight = loneHighlight(node)
      if (highlight === null) return
      parent.children[index] = {
        type: 'mdxJsxFlowElement',
        name: 'div',
        attributes: [{ type: 'mdxJsxAttribute', name: 'class', value: 'emphasis' }],
        children: [{ type: 'paragraph', children: withCap(highlight) }],
      }
    })
  }
}
