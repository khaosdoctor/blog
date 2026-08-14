import { getCollection } from 'astro:content'
import type { APIRoute } from 'astro'
import { folderOf, PUBLISH_CUTOFF, slugOf } from '../lib/posts'

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
  const upcoming = await getCollection(
    'blog',
    ({ data }) => !data.draft && data.pubDate > PUBLISH_CUTOFF,
  )

  // One entry per folder, not per file: a translation publishes with its
  // original, so listing both would fire the same rebuild twice. Filtering on
  // the source language did that too, but it also dropped a folder whose only
  // file is English, and twelve drafts are already in that shape — one of those
  // scheduled would never have reached the Worker, and would never have gone
  // live on its own.
  const earliestByFolder = new Map<string, (typeof upcoming)[number]>()
  for (const post of upcoming) {
    const folder = folderOf(post)
    const seen = earliestByFolder.get(folder)
    if (seen === undefined || post.data.pubDate < seen.data.pubDate) earliestByFolder.set(folder, post)
  }

  const posts = [...earliestByFolder.values()]
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
