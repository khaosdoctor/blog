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
import { localeFromFile, walkElements } from './mdx-util.mjs'

const HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

/**
 * The label a screen reader announces. Kept here rather than in src/i18n/ui.ts:
 * the plugin layer keeps its own copy rather than importing from the app's i18n
 * module, the same choice rehype-footnote-sidenotes.mjs makes for its own table.
 */
const ANCHOR_LABEL = { pt: 'link para esta seção', en: 'link to this section' }

export function rehypeHeadingAnchors() {
  return (tree, file) => {
    const label = ANCHOR_LABEL[localeFromFile(file)]
    walkElements(tree, (node) => {
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
          'aria-label': label,
          'data-copy-link': '',
        },
        children: [{ type: 'text', value: '#' }],
      })
    })
  }
}
