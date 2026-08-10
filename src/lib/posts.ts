import { getCollection, type CollectionEntry } from 'astro:content'

export type Post = CollectionEntry<'blog'>

/**
 * Every post that should be visible in this build: not a draft, and already
 * past its pubDate. A future pubDate is how scheduling works — the Cloudflare
 * Worker rebuilds the site at the exact minute so the post appears on time.
 */
export async function getPublishedPosts(): Promise<Post[]> {
  const now = new Date()
  const posts = await getCollection('blog', ({ data }) => !data.draft && data.pubDate <= now)
  return posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime())
}

export function formatDate(date: Date, lang: string): string {
  return date.toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
