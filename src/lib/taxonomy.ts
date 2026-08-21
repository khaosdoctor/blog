import { getPublishedPosts, type Post } from './posts'

/** A section is the `category` field: exactly one per post. */
export async function getCategories(): Promise<Map<string, Post[]>> {
  const posts = await getPublishedPosts()
  const byCategory = new Map<string, Post[]>()
  for (const post of posts) {
    const current = byCategory.get(post.data.category) ?? []
    current.push(post)
    byCategory.set(post.data.category, current)
  }
  return byCategory
}

/**
 * Every tag in one language, mapped to the posts carrying it, newest first.
 *
 * One language at a time, defaulting to the source one, the same shape
 * getSeries() takes. A translation repeats its original's `tags:` line byte for
 * byte (scripts/translate.ts copies the field verbatim, and all 173 translated
 * pairs under content/blog/ agree today), so the tag string, and with it the
 * slug slugify() derives from it, is shared across languages: /tags/javascript/
 * and /en/tags/javascript/ are the same tag, and switching language is the
 * prefix change it is everywhere else on this site.
 *
 * What is not shared is the membership. Each language maps only its own posts,
 * so an English tag page lists English articles at English URLs, and a tag
 * whose posts are none of them translated yet (`design`, `escrita` and `meta`
 * today) has no entry here in English and therefore no English page at all,
 * the same rule a section with no translated post already follows.
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

export type Series = { name: string; posts: Post[] }

/**
 * The display title of a series: the first `seriesName` found among its parts,
 * in order. Write it once on the first post, every other part only carries the
 * slug, and the slug is the fallback if none of them set it.
 *
 * Once per language, though: the members handed in are all one language, so a
 * translated first part needs its own `seriesName` or the English pages fall
 * back to the bare slug. Nothing here reads across languages on purpose, since
 * borrowing the Portuguese name would put Portuguese in an English heading.
 */
/* The smallest and largest a tag chip is allowed to read in the cloud. The
   floor is 1, the chip's own size, so the cloud only ever grows a tag: with a
   floor below 1 the many one-post tags all shrank by a hair, which reads as
   nothing having happened. */
const TAG_SCALE_MIN = 1
const TAG_SCALE_MAX = 3

/**
 * How large a tag reads in the cloud on the tag index, as a multiplier on the
 * chip's own size. Shared so the two language trees cannot drift apart.
 *
 * A logarithm, not the raw count and not a square root. The counts here are
 * heavily skewed: most tags carry one or two posts and a few carry dozens. On a
 * linear scale the big ones flatten everything else into one size, and a square
 * root still puts one post and two within a hundredth of each other, which is
 * the difference nobody can see. A log spreads the crowded low end, which is
 * where nearly every tag actually is.
 *
 * log1p, so a count of 1 is not log(1) = 0 fighting a zero-width span.
 *
 * Returns the floor for every tag when they all have the same number of posts,
 * since there is nothing to compare and the range would divide by zero.
 */
export function tagCloudScale(count: number, min: number, max: number): number {
  if (max <= min) return TAG_SCALE_MIN
  const span = Math.log1p(max) - Math.log1p(min)
  const position = (Math.log1p(count) - Math.log1p(min)) / span
  return Math.round((TAG_SCALE_MIN + position * (TAG_SCALE_MAX - TAG_SCALE_MIN)) * 1000) / 1000
}

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
 * Series posts are ordered by seriesOrder, not by date.
 *
 * One language at a time, defaulting to the source one. A translation carries
 * its own `series` and `seriesOrder` in its own frontmatter, so each language
 * builds a complete map of its own and a series page never mixes the two: an
 * English series lists the English parts and links at English URLs. A series
 * whose parts are only half translated simply comes out shorter in the language
 * missing the rest, and drops out of the routes once it is down to a single
 * part, which is the same rule a one-post series has always followed.
 */
export async function getSeries(lang?: Post['data']['lang']): Promise<Map<string, Post[]>> {
  const posts = await getPublishedPosts(lang)
  return buildSeriesMap(posts)
}

/**
 * Previous/next within a series. Takes an already-built series map so callers
 * that need this for every post (e.g. one call per post page) can build the
 * map once instead of re-fetching and re-sorting the whole collection per call.
 *
 * The map decides the language of the answer: hand it the one built from this
 * post's own language (getSeries(lang)) and every neighbour it returns is a
 * post in that language, so the arrows at the foot of an English part can only
 * ever point at another English part.
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
