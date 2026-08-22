import type { GetStaticPaths } from 'astro'
import { getPublishedPosts, slugOf } from '../../../lib/posts'
import { markdownTwinRoute } from '../../../lib/markdown-twin'

// llms.txt advertises this `index.md` route, so it must keep answering.
export const getStaticPaths = (async () => {
  const posts = await getPublishedPosts('en')
  return posts.map((post) => ({ params: { slug: slugOf(post) }, props: { post } }))
}) satisfies GetStaticPaths

export const GET = markdownTwinRoute
