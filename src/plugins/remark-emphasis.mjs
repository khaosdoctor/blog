// Routes 2 and 3 of the emphasis experiment, both authored in plain markdown.
//
//   Route 2, the lone bold paragraph: a paragraph whose whole content is one
//   **bold** run. Costs no new syntax and is what the hand already types, but
//   it takes a shape that currently means "a bold sentence" away from the
//   author, so a paragraph that is bold for any other reason becomes a block.
//
//   Route 3, the lone highlight: a paragraph made only of one ==highlight==
//   run, Obsidian's own mark syntax. Nothing else in these posts uses it, so it
//   cannot collide, but it does not render as emphasis in a plain markdown
//   viewer.
//
// Both emit the same markup as src/components/Emphasis.astro. Delete this file
// and drop it from astro.config.mjs to remove them.

import { visit } from 'unist-util-visit'
import { soleChild } from './mdx-util.mjs'

const HIGHLIGHT = /^==([\s\S]+)==$/

/** The single strong node filling a paragraph, or null. */
function loneStrong(node) {
  const only = soleChild(node)
  return only?.type === 'strong' ? only : null
}

/**
 * The children of a paragraph written wholly as `==...==`, or null. Remark has
 * no mark node, so the markers arrive as literal text on the edges.
 */
function loneHighlight(node) {
  if (node.type !== 'paragraph') return null
  const children = node.children.filter(
    (child) => !(child.type === 'text' && child.value.trim() === ''),
  )
  const first = children[0]
  const last = children[children.length - 1]
  if (first?.type !== 'text' || last?.type !== 'text') return null

  // One child holding the whole thing, or a run that opens and closes on the edges.
  if (children.length === 1) {
    const match = HIGHLIGHT.exec(first.value.trim())
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

function emphasisBlock(children, variant) {
  return {
    type: 'mdxJsxFlowElement',
    name: 'div',
    attributes: [
      { type: 'mdxJsxAttribute', name: 'class', value: 'emphasis' },
      { type: 'mdxJsxAttribute', name: 'data-emphasis', value: variant },
    ],
    children: [{ type: 'paragraph', children }],
  }
}

export function remarkEmphasis() {
  return (tree) => {
    visit(tree, 'paragraph', (node, index, parent) => {
      if (parent === undefined || index === undefined) return

      const strong = loneStrong(node)
      if (strong !== null) {
        parent.children[index] = emphasisBlock(strong.children, 'strong')
        return
      }

      const highlight = loneHighlight(node)
      if (highlight !== null) {
        parent.children[index] = emphasisBlock(highlight, 'highlight')
      }
    })
  }
}
