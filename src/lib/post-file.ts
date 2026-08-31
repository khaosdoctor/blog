/**
 * Reading a post file without astro:content, for the builders that run before
 * the collection exists. A leaf module, like `src/i18n/locales.ts`.
 */

/** The slug a file takes when its frontmatter overrides none. */
export function slugFrom(directory: string, filename: string): string {
  const name = filename.replace(/\.mdx?$/, '')
  return name === 'index' ? directory : name
}

/** The frontmatter block of a raw post file, empty when there is none. */
export function frontmatterOf(raw: string): string {
  return /^---\n([\s\S]*?)\n---/.exec(raw)?.[1] ?? ''
}
