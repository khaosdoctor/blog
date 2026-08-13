import { getCollection } from 'astro:content'
import type { APIRoute } from 'astro'
import { PUBLISH_CUTOFF, slugOf, SOURCE_LANG } from '../lib/posts'

/**
 * The manifest the scheduler Worker polls. It lists every post whose pubDate is
 * still in the future, so the Worker can fire a rebuild at the exact minute one
 * of them goes live. Published posts are irrelevant here and drafts never
 * appear, so nothing unpublished leaks beyond its title-free slug and date.
 *
 * The cutoff is the exact complement of getPublishedPosts, sharing its instant,
 * so every non-draft post is either on the site or in here and never both or
 * neither.
 */
export const GET: APIRoute = async () => {
  // Source language only: a translation publishes with its original, so listing
  // it too would fire the same rebuild twice.
  const upcoming = await getCollection(
    'blog',
    ({ data }) => !data.draft && data.lang === SOURCE_LANG && data.pubDate > PUBLISH_CUTOFF,
  )
  const posts = upcoming
    .sort((a, b) => a.data.pubDate.getTime() - b.data.pubDate.getTime())
    .map((post) => ({ slug: slugOf(post), pubDate: post.data.pubDate.toISOString() }))

  const body = { generatedAt: PUBLISH_CUTOFF.toISOString(), posts }
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // The Worker checks this every minute; a stale copy would delay a post.
      'cache-control': 'public, max-age=30',
    },
  })
}
