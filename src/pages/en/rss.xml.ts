import rss from '@astrojs/rss'
import type { APIRoute } from 'astro'
import { t } from '../../i18n/ui'
import { getPublishedPosts, urlOf } from '../../lib/posts'

export const GET: APIRoute = async (context) => {
  const posts = await getPublishedPosts('en')

  return rss({
    title: 'Lucas Santos',
    description: t('en', 'homeDescription'),
    // Only the channel link uses this; item links are already root-relative.
    site: new URL('/en/', context.site ?? 'https://blog.lsantos.dev'),
    trailingSlash: true,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: urlOf(post),
      categories: [post.data.category, ...post.data.tags],
    })),
    customData: '<language>en</language>',
  })
}
