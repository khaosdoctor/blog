// Small helpers shared by the remark/rehype plugins here, which each carried
// their own identical copy.

/**
 * The page's locale, for a build-time plugin: Astro attaches the frontmatter
 * it already parsed to the VFile every remark/rehype plugin receives, so the
 * URL never has to be reverse-engineered.
 */
export function localeFromFile(file) {
  return file?.data?.astro?.frontmatter?.lang === 'en' ? 'en' : 'pt'
}

/** The one meaningful child of a paragraph, or null if there is more than one. */
export function soleChild(node) {
  if (node.type !== 'paragraph') return null
  const meaningful = node.children.filter(
    (child) => !(child.type === 'text' && child.value.trim() === ''),
  )
  return meaningful.length === 1 ? meaningful[0] : null
}

export function attribute(name, value) {
  return { type: 'mdxJsxAttribute', name, value }
}

export function jsxElement(name, attributes = [], children = []) {
  return { type: 'mdxJsxFlowElement', name, attributes, children }
}

export function walkElements(node, visitor) {
  if (Array.isArray(node.children)) {
    for (const child of node.children) walkElements(child, visitor)
  }
  visitor(node)
}
