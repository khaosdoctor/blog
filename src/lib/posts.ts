import { getCollection, type CollectionEntry } from 'astro:content'

export type Post = CollectionEntry<'blog'>

/** The language posts are written in. Everything else is a translation. */
export const SOURCE_LANG = 'pt'

/**
 * The one instant this build calls "now", evaluated once per process.
 *
 * Astro settles the route table before it renders any page, so a build that
 * straddles a pubDate and asks the clock twice disagrees with itself: the
 * homepage or the RSS feed can list a post whose page was never generated, or
 * a post can end up with neither a page nor a line in scheduled.json. Every
 * publication cutoff has to be compared against this, not against `new Date()`.
 */
export const PUBLISH_CUTOFF = new Date()

/**
 * The post folder, which is what pairs an article with its translations: every
 * markdown file in content/blog/<folder>/ is the same article in a different
 * language. Read from filePath rather than from the entry id, because the id
 * follows a `slug` override in the frontmatter and so loses the folder.
 */
export function folderOf(post: Post): string {
  return post.filePath?.split('/').at(-2) ?? post.id
}

/**
 * The URL slug: the frontmatter override wins, then the file name, and an
 * `index` file takes the folder name. That last case is the Ghost contract:
 * content/blog/error-cause/index.mdx has to stay at /error-cause/ forever.
 */
export function slugOf(post: Post): string {
  if (post.data.slug !== undefined) return post.data.slug
  const name = post.filePath?.split('/').at(-1)?.replace(/\.mdx?$/, '')
  if (name === undefined || name === 'index') return folderOf(post)
  return name
}

/** Portuguese keeps the bare Ghost path; every other language gets a prefix. */
export function urlOf(post: Post): string {
  const slug = slugOf(post)
  if (post.data.lang === SOURCE_LANG) return `/${slug}/`
  return `/${post.data.lang}/${slug}/`
}

/**
 * Every post visible in this build, in any language: not a draft, and already
 * past its pubDate. A future pubDate is how scheduling works, the Cloudflare
 * Worker rebuilds the site at the exact minute so the post appears on time.
 */
async function getPublished(): Promise<Post[]> {
  const posts = await getCollection(
    'blog',
    ({ data }) => !data.draft && data.pubDate <= PUBLISH_CUTOFF,
  )
  return posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime())
}

/** Published posts in one language, newest first. Defaults to the source one. */
export async function getPublishedPosts(lang: Post['data']['lang'] = SOURCE_LANG): Promise<Post[]> {
  return (await getPublished()).filter((post) => post.data.lang === lang)
}

/**
 * Published posts grouped by folder, so a page can list the languages its own
 * article exists in and emit one hreflang per language. A post with no
 * translation gets a group of one, which is exactly its own alternate.
 */
export async function getPublishedByFolder(): Promise<Map<string, Post[]>> {
  const byFolder = new Map<string, Post[]>()
  for (const post of await getPublished()) {
    const folder = folderOf(post)
    const current = byFolder.get(folder) ?? []
    current.push(post)
    byFolder.set(folder, current)
  }
  return byFolder
}

export function formatDate(date: Date, lang: string): string {
  return date.toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** How many posts a list page (the archive, a section, a tag) holds before it pages. */
export const LIST_PAGE_SIZE = 20

/**
 * Moved to ./reading-time, whole and unchanged, so scripts/cover.ts can have
 * it: this file imports `astro:content`, which does not exist outside Astro,
 * and a plain node script importing through here dies on that import alone.
 * Same move chip-color.ts made, for the same reason. Re-exported here so
 * every page that already reads it from posts.ts keeps working.
 */
export { estimateReadingTime } from './reading-time'
