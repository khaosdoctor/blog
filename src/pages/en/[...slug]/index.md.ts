import type { APIRoute, GetStaticPaths } from 'astro'
import { getPublishedPosts, slugOf } from '../../../lib/posts'
import { toAgentMarkdown } from '../../../lib/markdown-twin'

/**
 * The English half of the markdown twin. Every post answers at its own URL plus
 * `index.md`, and llms.txt says so, which was only true of the Portuguese tree
 * until this route existed.
 */
export const getStaticPaths = (async () => {
  const posts = await getPublishedPosts('en')
  return posts.map((post) => ({ params: { slug: slugOf(post) }, props: { post } }))
}) satisfies GetStaticPaths

export const GET: APIRoute = ({ props, site }) => {
  const { post } = props as { post: Awaited<ReturnType<typeof getPublishedPosts>>[number] }

  return new Response(toAgentMarkdown(post, site), {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  })
}
