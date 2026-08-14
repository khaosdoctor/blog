import rss from '@astrojs/rss'
import type { APIRoute } from 'astro'
import { t } from '../../i18n/ui'
import { getPublishedPosts, urlOf } from '../../lib/posts'

/** The English feed. The Portuguese one stays at /rss.xml, where it always was. */
export const GET: APIRoute = async (context) => {
  const posts = await getPublishedPosts('en')

  return rss({
    title: 'Lucas Santos',
    description: t('en', 'homeDescription'),
    // The English home, so the channel link takes a subscriber to the tree the
    // feed is actually about. Item links are root-relative and resolve to the
    // same absolute URLs either way.
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
