import type { PaginateFunction } from 'astro'
import { hashString } from './chip-color'
import { getPublishedPosts, LIST_PAGE_SIZE, type Post } from './posts'
import { slugify } from './slugify'
import { LOCALES, type Locale } from '../i18n/ui'

/** A section is the `category` field: exactly one per post. One language at
    a time, defaulting to the source one, the same shape getTags() takes. */
export async function getCategories(lang?: Post['data']['lang']): Promise<Map<string, Post[]>> {
  const posts = await getPublishedPosts(lang)
  const byCategory = new Map<string, Post[]>()
  for (const post of posts) {
    const current = byCategory.get(post.data.category) ?? []
    current.push(post)
    byCategory.set(post.data.category, current)
  }
  return byCategory
}

/**
 * Which categories each locale has a section page for. A section page only
 * exists in a language that has a post in it, so the alternates (and the
 * language switcher) are built from this rather than assumed.
 */
export async function categoryLocales(): Promise<(readonly [Locale, Set<string>])[]> {
  const languages = await Promise.all(
    LOCALES.map(async (locale) => [locale, await getPublishedPosts(locale)] as const),
  )
  return languages.map(
    ([locale, localePosts]) => [locale, new Set(localePosts.map((post) => post.data.category))] as const,
  )
}

/**
 * Every tag in one language, mapped to the posts carrying it, newest first.
 * The tag string (and its slug) is shared across languages because a
 * translation repeats its original's `tags:` line verbatim; the membership is
 * not, so a tag with no translated post has no entry in that language at all.
 */
export async function getTags(lang?: Post['data']['lang']): Promise<Map<string, Post[]>> {
  const posts = await getPublishedPosts(lang)
  const byTag = new Map<string, Post[]>()
  for (const post of posts) {
    for (const tag of post.data.tags) {
      const current = byTag.get(tag) ?? []
      current.push(post)
      byTag.set(tag, current)
    }
  }
  return byTag
}

/**
 * The paginated routes for one language's per-tag pages, shared by
 * src/pages/tags/[tag]/[...page].astro and its /en/ twin so the two cannot
 * drift. `languages` names only the locales that actually build a page for
 * this tag: the switcher must never offer a URL no route emits.
 */
export async function tagListingRoutes(paginate: PaginateFunction, lang?: Locale) {
  const [tags, byLocale] = await Promise.all([
    getTags(lang),
    Promise.all(LOCALES.map(async (locale) => [locale, await getTags(locale)] as const)),
  ])
  return [...tags.entries()].flatMap(([tag, posts]) =>
    paginate(posts, {
      pageSize: LIST_PAGE_SIZE,
      params: { tag: slugify(tag) },
      props: {
        tag,
        languages: byLocale.filter(([, entries]) => entries.has(tag)).map(([locale]) => locale),
      },
    }),
  )
}

export type Series = { name: string; posts: Post[] }

/* The smallest and largest a tag chip is allowed to read in the cloud. The
   floor is 1, the chip's own size, so the cloud only ever grows a tag: with a
   floor below 1 the many one-post tags all shrank by a hair, which reads as
   nothing having happened. */
const TAG_SCALE_MIN = 1
const TAG_SCALE_MAX = 3

/**
 * How large a tag reads in the cloud, as a multiplier on the chip's own size.
 * Logarithmic because the counts are heavily skewed: a linear scale flattens
 * everything under the biggest tags, and a log spreads the crowded low end.
 * log1p so a count of 1 is not log(1) = 0 fighting a zero-width span; the
 * floor when max <= min avoids dividing by a zero range.
 */
export function tagCloudScale(count: number, min: number, max: number): number {
  if (max <= min) return TAG_SCALE_MIN
  const span = Math.log1p(max) - Math.log1p(min)
  const position = (Math.log1p(count) - Math.log1p(min)) / span
  return Math.round((TAG_SCALE_MIN + position * (TAG_SCALE_MAX - TAG_SCALE_MIN)) * 1000) / 1000
}

/* How far off the row's centre line a chip may be nudged, in em of its own
   size. Small: past about a third of a line the rows start colliding. */
const TAG_LIFT_STEPS = [-0.3, 0.15, -0.15, 0.3, 0, 0.22, -0.22]

/**
 * A small vertical offset per tag, so the cloud stops reading as text on
 * ruled lines. Hashed from the tag's own name so a rebuild never reshuffles
 * the page and the two language trees agree for one tag.
 */
export function tagCloudLift(tag: string): number {
  return TAG_LIFT_STEPS[hashString(tag) % TAG_LIFT_STEPS.length]
}

/**
 * The display title of a series: the first `seriesName` among its parts, the
 * slug as fallback. The members are all one language on purpose: borrowing
 * the Portuguese name would put Portuguese in an English heading.
 */
export function seriesTitle(slug: string, members: Post[]): string {
  for (const member of members) {
    const name = member.data.seriesName?.trim()
    if (name) return name
  }
  return slug
}

/** Groups already-fetched posts by series, ordered by seriesOrder (not date). */
export function buildSeriesMap(posts: Post[]): Map<string, Post[]> {
  const bySeries = new Map<string, Post[]>()
  for (const post of posts) {
    if (post.data.series === undefined) continue
    const current = bySeries.get(post.data.series) ?? []
    current.push(post)
    bySeries.set(post.data.series, current)
  }
  for (const [name, members] of bySeries) {
    bySeries.set(
      name,
      members.sort((a, b) => (a.data.seriesOrder ?? 0) - (b.data.seriesOrder ?? 0)),
    )
  }
  return bySeries
}

/**
 * Series posts ordered by seriesOrder, one language at a time: each language
 * builds a complete map of its own, so a series page never mixes languages
 * and a half-translated series just comes out shorter on the missing side.
 */
export async function getSeries(lang?: Post['data']['lang']): Promise<Map<string, Post[]>> {
  const posts = await getPublishedPosts(lang)
  return buildSeriesMap(posts)
}

/**
 * Previous/next within a series. Takes an already-built map so per-post
 * callers build it once instead of re-fetching per page, and the map decides
 * the language of every neighbour it returns.
 */
export function getSeriesNavigation(
  post: Post,
  seriesMap: Map<string, Post[]>,
): {
  /** The slug, shared by every language: /series/<name>/ and /en/series/<name>/. */
  name: string
  /** Derived from the first part's title. */
  title: string
  index: number
  total: number
  previous: Post | null
  next: Post | null
} | null {
  if (post.data.series === undefined) return null
  const members = seriesMap.get(post.data.series)
  if (members === undefined || members.length < 2) return null
  const index = members.findIndex((member) => member.id === post.id)
  if (index === -1) return null
  return {
    name: post.data.series,
    title: seriesTitle(post.data.series, members),
    index: index + 1,
    total: members.length,
    previous: index > 0 ? members[index - 1] : null,
    next: index < members.length - 1 ? members[index + 1] : null,
  }
}

/** Tags and series names become URL segments, so they need slugifying. */
// Re-exported so existing callers keep importing it from here, while the
// implementation stays reachable from a plain node script.
export { slugify } from './slugify'

// A chip's colour, derived from its own label. Re-exported so the pages that
// already import it from here keep working, while the implementation stays
// reachable from a client script: this file imports ./posts, which imports
// `astro:content`, and that module is server-only.
export { chipColor } from './chip-color'
