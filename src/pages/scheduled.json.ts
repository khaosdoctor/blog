import { getCollection } from 'astro:content'
import type { APIRoute } from 'astro'

/**
 * The manifest the scheduler Worker polls. It lists every post whose pubDate is
 * still in the future, so the Worker can fire a rebuild at the exact minute one
 * of them goes live. Published posts are irrelevant here and drafts never
 * appear, so nothing unpublished leaks beyond its title-free slug and date.
 */
export const GET: APIRoute = async () => {
  const now = new Date()
  const upcoming = await getCollection('blog', ({ data }) => !data.draft && data.pubDate > now)
  const posts = upcoming
    .sort((a, b) => a.data.pubDate.getTime() - b.data.pubDate.getTime())
    .map((post) => ({ slug: post.id, pubDate: post.data.pubDate.toISOString() }))

  return new Response(JSON.stringify({ generatedAt: now.toISOString(), posts }, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // The Worker checks this every minute; a stale copy would delay a post.
      'cache-control': 'public, max-age=30',
    },
  })
}
