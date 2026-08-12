import rss from '@astrojs/rss'
import type { APIRoute } from 'astro'
import { getPublishedPosts } from '../lib/posts'
import { t } from '../i18n/ui'

/**
 * The Portuguese feed at the same path Ghost used, so existing subscribers keep
 * working after the cutover. The English feed lives at /en/rss.xml.
 */
export const GET: APIRoute = async (context) => {
  const posts = await getPublishedPosts()
  return rss({
    title: 'Lucas Santos',
    description: t('pt', 'homeDescription'),
    site: context.site ?? 'https://blog.lsantos.dev',
    trailingSlash: true,
    stylesheet: false,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/${post.id}/`,
      categories: [post.data.category, ...post.data.tags],
    })),
    customData: '<language>pt-BR</language>',
  })
}
