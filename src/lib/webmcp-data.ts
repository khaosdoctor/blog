import { LOCALES, type Locale } from '../i18n/ui'
import { getPublishedPosts, type Post, slugOf, urlOf } from './posts'
import { getSeries, seriesTitle } from './taxonomy'

export interface WebmcpPost {
  title: string
  slug: string
  url: string
  date: string
  category: string
  tags: string[]
  series?: string
  seriesName?: string
  locale: Locale
  description: string
}

export interface WebmcpSeries {
  slug: string
  name: string
  locale: Locale
  postSlugs: string[]
}

export interface WebmcpData {
  posts: WebmcpPost[]
  series: WebmcpSeries[]
}

function toWebmcpPost(post: Post): WebmcpPost {
  return {
    title: post.data.title,
    slug: slugOf(post),
    url: urlOf(post),
    date: post.data.pubDate.toISOString().slice(0, 10),
    category: post.data.category,
    tags: post.data.tags,
    series: post.data.series,
    seriesName: post.data.seriesName,
    locale: post.data.lang,
    description: post.data.description,
  }
}

/**
 * Everything the client-side WebMCP tools need, inlined once at build time so
 * listPosts and getSeries never have to reach back into the content collection.
 */
export async function buildWebmcpData(): Promise<WebmcpData> {
  const posts: WebmcpPost[] = []
  const series: WebmcpSeries[] = []

  for (const locale of LOCALES) {
    for (const post of await getPublishedPosts(locale)) posts.push(toWebmcpPost(post))

    for (const [slug, members] of await getSeries(locale)) {
      series.push({
        slug,
        name: seriesTitle(slug, members),
        locale,
        postSlugs: members.map((post) => slugOf(post)),
      })
    }
  }

  return { posts, series }
}
