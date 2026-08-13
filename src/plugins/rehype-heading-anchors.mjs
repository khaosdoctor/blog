/**
 * Appends a `#` link to every heading that already has an id, so a reader can
 * link to a section without hunting for one.
 *
 * Astro generates the ids itself (github-slugger, same as src/lib/taxonomy.ts),
 * so this plugin only adds the link and never invents an id: a heading with no id
 * is left alone rather than given one that nothing else in the site agrees with.
 *
 * The click handler that copies the URL and shows the toast lives in
 * src/layouts/BaseLayout.astro, because it is one listener for the whole page.
 */

const HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

export function rehypeHeadingAnchors() {
  return (tree) => {
    visit(tree)
  }
}

function visit(node) {
  if (Array.isArray(node.children)) {
    for (const child of node.children) visit(child)
  }

  if (node.type !== 'element' || !HEADINGS.has(node.tagName)) return

  const id = node.properties?.id
  if (typeof id !== 'string' || id === '') return

  node.children.push({
    type: 'element',
    tagName: 'a',
    properties: {
      className: ['heading-anchor'],
      href: `#${id}`,
      // The label has to be readable on its own: a screen reader announcing
      // "hash, link" six times a page is noise.
      'aria-label': 'link to this section',
      'data-copy-link': '',
    },
    children: [{ type: 'text', value: '#' }],
  })
}
