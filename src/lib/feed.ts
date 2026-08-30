import rss from '@astrojs/rss'
import type { APIContext } from 'astro'
import { HREFLANG, localePath, t, type Locale } from '../i18n/ui'
import { getListedPosts, urlOf } from './posts'

const FALLBACK_SITE = 'https://blog.lsantos.dev'

export function feedRoute(locale: Locale) {
  return async (context: APIContext) => {
    const posts = await getListedPosts(locale)
    const site = context.site ?? new URL(FALLBACK_SITE)
    return rss({
      title: 'Lucas Santos',
      description: t(locale, 'homeDescription'),
      // Only the channel link uses this; item links are already root-relative.
      site: new URL(localePath(locale, '/'), site),
      trailingSlash: true,
      items: posts.map((post) => ({
        title: post.data.title,
        description: post.data.description,
        pubDate: post.data.pubDate,
        link: urlOf(post),
        categories: [post.data.category, ...post.data.tags],
      })),
      customData: `<language>${HREFLANG[locale]}</language>`,
    })
  }
}
