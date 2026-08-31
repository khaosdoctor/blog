import { getCollection } from 'astro:content'
import type { APIRoute } from 'astro'
import { folderOf, PUBLISH_CUTOFF, slugOf } from '../lib/posts'

export const GET: APIRoute = async () => {
  const upcoming = await getCollection('blog', ({ data }) => !data.draft && data.pubDate > PUBLISH_CUTOFF)

  // Deduped by directory, not language, so an English-only post stays listed.
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
      'cache-control': 'public, max-age=30',
    },
  })
}
