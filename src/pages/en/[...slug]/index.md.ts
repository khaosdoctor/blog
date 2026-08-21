import type { GetStaticPaths } from 'astro'
import { getPublishedPosts, slugOf } from '../../../lib/posts'
import { markdownTwinRoute } from '../../../lib/markdown-twin'

// The English half of the markdown twin: every post answers at its own URL
// plus `index.md`, which llms.txt promises for both languages.
export const getStaticPaths = (async () => {
  const posts = await getPublishedPosts('en')
  return posts.map((post) => ({ params: { slug: slugOf(post) }, props: { post } }))
}) satisfies GetStaticPaths

export const GET = markdownTwinRoute
