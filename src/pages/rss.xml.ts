import rss from '@astrojs/rss'
import type { APIRoute } from 'astro'
import { getPublishedPosts, urlOf } from '../lib/posts'
import { t } from '../i18n/ui'

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
      link: urlOf(post),
      categories: [post.data.category, ...post.data.tags],
    })),
    customData: '<language>pt-BR</language>',
  })
}
