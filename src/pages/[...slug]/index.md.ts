import type { APIRoute, GetStaticPaths } from 'astro'
import { getPublishedPosts } from '../../lib/posts'
import { toAgentMarkdown } from '../../lib/markdown-twin'

export const getStaticPaths = (async () => {
  const posts = await getPublishedPosts()
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }))
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
