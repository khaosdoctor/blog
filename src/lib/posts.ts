import { getCollection, type CollectionEntry } from 'astro:content'

export type Post = CollectionEntry<'blog'>

export const SOURCE_LANG = 'pt'

export const PUBLISH_CUTOFF = new Date()

// Read from filePath, never from the entry id: the id follows a frontmatter
// `slug` override and loses the directory name.
export function folderOf(post: Post): string {
  return post.filePath?.split('/').at(-2) ?? post.id
}

export function slugOf(post: Post): string {
  if (post.data.slug !== undefined) return post.data.slug
  const name = post.filePath?.split('/').at(-1)?.replace(/\.mdx?$/, '')
  if (name === undefined || name === 'index') return folderOf(post)
  return name
}

export function urlOf(post: Post): string {
  const slug = slugOf(post)
  if (post.data.lang === SOURCE_LANG) return `/${slug}/`
  return `/${post.data.lang}/${slug}/`
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

export async function getPublishedPosts(lang: Post['data']['lang'] = SOURCE_LANG): Promise<Post[]> {
  return (await getPublished()).filter((post) => post.data.lang === lang)
}

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

export const LIST_PAGE_SIZE = 20

export { estimateReadingTime } from './reading-time'
