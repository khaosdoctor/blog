import { type CollectionEntry, getCollection } from 'astro:content'
import { DATE_LOCALE, type Locale, postUrl, SOURCE_LOCALE } from '../i18n/ui'

export type Post = CollectionEntry<'blog'>

export const PUBLISH_CUTOFF = new Date()

// Read from filePath, never from the entry id: the id follows a frontmatter
// `slug` override and loses the directory name.
export function folderOf(post: Post): string {
  return post.filePath?.split('/').at(-2) ?? post.id
}

export function slugOf(post: Post): string {
  if (post.data.slug !== undefined) return post.data.slug
  const name = post.filePath
    ?.split('/')
    .at(-1)
    ?.replace(/\.mdx?$/, '')
  if (name === undefined || name === 'index') return folderOf(post)
  return name
}

export function urlOf(post: Post): string {
  return postUrl(slugOf(post), post.data.lang)
}

export function isScheduled(post: Post): boolean {
  return post.data.pubDate > PUBLISH_CUTOFF
}

async function getPublished(): Promise<Post[]> {
  // A scheduled post is held back from the build and listed in scheduled.json
  // instead. The dev server keeps it so it can be read before it is due, which
  // is the only difference between the two and must stay behind this flag:
  // check-output.ts asserts a post is either on the built site or in that
  // manifest, never both.
  const posts = await getCollection(
    'blog',
    ({ data }) => !data.draft && (import.meta.env.DEV || data.pubDate <= PUBLISH_CUTOFF),
  )
  return posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime())
}

export async function getPublishedPosts(lang: Locale = SOURCE_LOCALE): Promise<Post[]> {
  return (await getPublished()).filter((post) => post.data.lang === lang)
}

/**
 * Everything a reader can arrive at without being handed the URL. A `noindex`
 * post keeps its page and its markdown twin, and leaves every listing, the
 * feeds, llms.txt and the search index, so the only way in is the link itself.
 */
export async function getListedPosts(lang: Locale = SOURCE_LOCALE): Promise<Post[]> {
  return (await getPublishedPosts(lang)).filter((post) => !post.data.noindex)
}

export async function getPublishedByFolder(): Promise<Map<string, Post[]>> {
  return Map.groupBy(await getPublished(), folderOf)
}

export function formatDate(date: Date, lang: Locale): string {
  return date.toLocaleDateString(DATE_LOCALE[lang], {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export const LIST_PAGE_SIZE = 20

export { estimateReadingTime } from './reading-time'
