import { getCollection } from 'astro:content'
import type { APIRoute } from 'astro'
import { localePath } from '../i18n/ui'
import { folderOf, PUBLISH_CUTOFF, slugOf, urlOf } from '../lib/posts'
import { categoryOgImage } from '../lib/seo'

const WINDOW_DAYS = 14

/**
 * Everything a social announcement needs, per article, in every language it
 * exists in. Scheduled posts are listed before their pages exist, which is
 * what lets the copy be drafted and approved ahead of publication.
 */
export const GET: APIRoute = async ({ site }) => {
  const since = PUBLISH_CUTOFF.getTime() - WINDOW_DAYS * 86_400_000
  const recent = await getCollection('blog', ({ data }) => !data.draft && data.pubDate.getTime() >= since)
  const absolute = (path: string) => (site === undefined ? path : new URL(path, site).href)

  const entries = [...Map.groupBy(recent, folderOf)]
    .map(([folder, posts]) => {
      const source = posts.find((post) => post.filePath?.endsWith('/index.mdx')) ?? posts[0]
      return {
        folder,
        pubDate: source.data.pubDate.toISOString(),
        category: source.data.category,
        tags: source.data.tags,
        posts: posts.map((post) => {
          const { lang, category } = post.data
          const image = post.data.heroImage?.src ?? categoryOgImage(lang, localePath(lang, `/${category}/`))
          return {
            lang,
            slug: slugOf(post),
            url: absolute(urlOf(post)),
            markdown: absolute(`${urlOf(post)}index.md`),
            title: post.data.title,
            description: post.data.seoDescription ?? post.data.description,
            image: absolute(image),
          }
        }),
      }
    })
    .sort((a, b) => b.pubDate.localeCompare(a.pubDate))

  return new Response(JSON.stringify({ generatedAt: PUBLISH_CUTOFF.toISOString(), posts: entries }, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=30',
    },
  })
}
