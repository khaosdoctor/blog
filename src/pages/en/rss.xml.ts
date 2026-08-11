import rss from '@astrojs/rss'
import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'

/** The English feed. The Portuguese one stays at /rss.xml, where it always was. */
export const GET: APIRoute = async (context) => {
  const now = new Date()
  const posts = (
    await getCollection('translated', ({ data }) => data.lang === 'en' && !data.draft && data.pubDate <= now)
  ).sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime())

  return rss({
    title: 'Lucas Santos',
    description: 'Articles about software development, technology and opinion.',
    site: context.site ?? 'https://blog.lsantos.dev',
    trailingSlash: true,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/en/${post.id.replace(/^en\//, '')}/`,
      categories: [post.data.category, ...post.data.tags],
    })),
    customData: '<language>en</language>',
  })
}
