/**
 * The path lists behind every route that exists in more than one language.
 *
 * Astro's routing is file-based and its rest params cannot hold a `/`, so a
 * single file cannot emit both `/deno/` and `/en/deno/`. The route files stay
 * mirrored because the router needs them to be; what they must not do is
 * mirror any logic. Each one is a two-line delegation naming its own locale,
 * and everything else is here.
 */

import type { GetStaticPaths } from 'astro'
import { LOCALES, type Locale, SOURCE_LOCALE } from '../i18n/ui'
import { categoryDescription } from './categories'
import {
  folderOf,
  getListedPosts,
  getPublishedByFolder,
  getPublishedPosts,
  LIST_PAGE_SIZE,
  slugOf,
  urlOf,
} from './posts'
import {
  buildSeriesMap,
  categoryLocales,
  getCategories,
  getSeries,
  getSeriesNavigation,
  getTags,
  seriesTitle,
  slugify,
} from './taxonomy'

export function postListPaths(locale: Locale): GetStaticPaths {
  // A rest param is required: paginate() only maps page 1 to an undefined param
  // for [...page], so a plain [page] would put the home page at /1/.
  return async ({ paginate }) => {
    // paginate() returns one page even for an empty array, which is what lets
    // the "no translated posts yet" notice render.
    const posts = await getListedPosts(locale)
    return paginate(posts, { pageSize: LIST_PAGE_SIZE, props: { locale } })
  }
}

export function categoryListPaths(locale: Locale): GetStaticPaths {
  return async ({ paginate }) => {
    const [byCategory, sectionsByLocale, posts] = await Promise.all([
      getCategories(locale),
      categoryLocales(),
      getPublishedPosts(locale),
    ])
    // Astro gives this route priority over [...slug], so a category named like
    // a post slug would shadow that article.
    const slugs = new Set(posts.map((post) => slugOf(post)))
    for (const category of byCategory.keys()) {
      if (slugs.has(category)) {
        throw new Error(
          `Category "${category}" collides with a post of the same slug. Rename the category or the post.`,
        )
      }
    }
    return [...byCategory.entries()].flatMap(([category, categoryPosts]) =>
      paginate(categoryPosts, {
        pageSize: LIST_PAGE_SIZE,
        params: { category },
        props: {
          locale,
          category,
          description: categoryDescription(category, locale),
          languages: sectionsByLocale.filter(([, names]) => names.has(category)).map(([entry]) => entry),
        },
      }),
    )
  }
}

export function tagListPaths(locale: Locale): GetStaticPaths {
  return async ({ paginate }) => {
    const [tags, byLocale] = await Promise.all([
      getTags(locale),
      Promise.all(LOCALES.map(async (entry) => [entry, await getTags(entry)] as const)),
    ])
    return [...tags.entries()].flatMap(([tag, posts]) =>
      paginate(posts, {
        pageSize: LIST_PAGE_SIZE,
        params: { tag: slugify(tag) },
        props: {
          locale,
          tag,
          // Only the locales that actually build a page for this tag: the
          // switcher must never offer a URL no route emits.
          languages: byLocale.filter(([, entries]) => entries.has(tag)).map(([entry]) => entry),
        },
      }),
    )
  }
}

export function seriesPaths(locale: Locale): GetStaticPaths {
  return async () => {
    const byLocale = await Promise.all(LOCALES.map(async (entry) => [entry, await getSeries(entry)] as const))
    const own = byLocale.find(([entry]) => entry === locale)?.[1] ?? new Map()
    return (
      [...own.entries()]
        // A series of one builds no page, so the index has to filter the same way.
        .filter(([, posts]) => posts.length > 1)
        .map(([slug, posts]) => ({
          params: { name: slug },
          props: {
            locale,
            slug,
            name: seriesTitle(slug, posts),
            posts,
            languages: byLocale.filter(([, entries]) => (entries.get(slug)?.length ?? 0) > 1).map(([entry]) => entry),
          },
        }))
    )
  }
}

export function postPaths(locale: Locale): GetStaticPaths {
  return async () => {
    const [posts, byFolder, listed] = await Promise.all([
      getPublishedPosts(locale),
      getPublishedByFolder(),
      getListedPosts(locale),
    ])
    // Built from the listed posts, so an unlisted one neither carries series
    // navigation nor appears in a sibling's.
    const seriesMap = buildSeriesMap(listed)
    return posts.map((post) => {
      const siblings = byFolder.get(folderOf(post)) ?? [post]
      const source = siblings.find((entry) => entry.data.lang === SOURCE_LOCALE)
      return {
        params: { slug: slugOf(post) },
        props: {
          locale,
          post,
          series: getSeriesNavigation(post, seriesMap),
          // A machine-translated page links back to what it was translated
          // from, which is the source-language sibling and never itself.
          sourcePath: source === undefined || source.id === post.id ? null : urlOf(source),
          alternates: siblings.map((entry) => ({ lang: entry.data.lang, path: urlOf(entry) })),
        },
      }
    })
  }
}

/** llms.txt advertises the `index.md` twin, so it must keep answering. */
export function markdownTwinPaths(locale: Locale): GetStaticPaths {
  return async () => {
    const posts = await getPublishedPosts(locale)
    return posts.map((post) => ({ params: { slug: slugOf(post) }, props: { post } }))
  }
}
