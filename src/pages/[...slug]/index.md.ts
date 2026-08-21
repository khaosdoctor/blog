import type { GetStaticPaths } from 'astro'
import { getPublishedPosts, slugOf } from '../../lib/posts'
import { markdownTwinRoute } from '../../lib/markdown-twin'

export const getStaticPaths = (async () => {
  const posts = await getPublishedPosts()
  return posts.map((post) => ({ params: { slug: slugOf(post) }, props: { post } }))
}) satisfies GetStaticPaths

export const GET = markdownTwinRoute
