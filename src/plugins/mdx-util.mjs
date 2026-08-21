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

export function attribute(name, value) {
  return { type: 'mdxJsxAttribute', name, value }
}

export function jsxElement(name, attributes = [], children = []) {
  return { type: 'mdxJsxFlowElement', name, attributes, children }
}
