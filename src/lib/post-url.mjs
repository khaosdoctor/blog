/**
 * The URL rule, in the one place all three builders can reach. `posts.ts` works
 * from the collection, `post-dates.mjs` from frontmatter before astro:content
 * exists, and `remark-wikilinks.mjs` from its own index, so none of them can
 * import another. They spelled the same rule out three times instead, with two
 * writing the source language as a literal where the third read a constant.
 *
 * A leaf module: importing nothing is what lets astro.config.mjs and the node
 * scripts use it.
 */
export const SOURCE_LANG = 'pt'

/** Source language bare at the root, every other language under its own prefix. */
export function postUrl(slug, lang) {
  return lang === SOURCE_LANG ? `/${slug}/` : `/${lang}/${slug}/`
}

/** The slug a file takes when its frontmatter overrides none. */
export function slugFrom(directory, filename) {
  const name = filename.replace(/\.mdx?$/, '')
  return name === 'index' ? directory : name
}

/** The frontmatter block of a raw post file, empty when there is none. */
export function frontmatterOf(raw) {
  return /^---\n([\s\S]*?)\n---/.exec(raw)?.[1] ?? ''
}
