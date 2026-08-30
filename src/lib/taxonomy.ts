import type { PaginateFunction } from 'astro'
import { hashString } from './chip-color'
import { getListedPosts, getPublishedPosts, LIST_PAGE_SIZE, type Post } from './posts'
import { slugify } from './slugify'
import { LOCALES, type Locale } from '../i18n/ui'

export async function getCategories(lang?: Post['data']['lang']): Promise<Map<string, Post[]>> {
  return Map.groupBy(await getListedPosts(lang), (post) => post.data.category)
}

// A section page only exists in a language that has a post in it, so the
// language switcher must be built from this rather than assuming both locales.
export async function categoryLocales(): Promise<(readonly [Locale, Set<string>])[]> {
  return Promise.all(
    LOCALES.map(async (locale) => [locale, new Set((await getCategories(locale)).keys())] as const),
  )
}

export async function getTags(lang?: Post['data']['lang']): Promise<Map<string, Post[]>> {
  const posts = await getListedPosts(lang)
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

// `languages` names only the locales that actually build a page for this tag:
// the switcher must never offer a URL no route emits.
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

// Multipliers on the chip's own size. The floor must stay at 1 so the cloud
// only ever grows a tag.
const TAG_SCALE_MIN = 1
const TAG_SCALE_MAX = 3

// Logarithmic because tag counts are heavily skewed and a linear scale would flatten everything below
// the biggest tags; log1p keeps a count of 1 from mapping to log(1) = 0.
export function tagCloudScale(count: number, min: number, max: number): number {
  if (max <= min) return TAG_SCALE_MIN
  const span = Math.log1p(max) - Math.log1p(min)
  const position = (Math.log1p(count) - Math.log1p(min)) / span
  return Math.round((TAG_SCALE_MIN + position * (TAG_SCALE_MAX - TAG_SCALE_MIN)) * 1000) / 1000
}

// Offsets in em of the chip's own size. Past about a third of a line the rows
// start colliding.
const TAG_LIFT_STEPS = [-0.3, 0.15, -0.15, 0.3, 0, 0.22, -0.22]

// Hashed from the tag name so a rebuild never reshuffles the cloud and both
// language trees place the same tag identically.
export function tagCloudLift(tag: string): number {
  return TAG_LIFT_STEPS[hashString(tag) % TAG_LIFT_STEPS.length]
}

// `members` must be one language: borrowing the Portuguese name would put
// Portuguese in an English heading.
export function seriesTitle(slug: string, members: Post[]): string {
  for (const member of members) {
    const name = member.data.seriesName?.trim()
    if (name) return name
  }
  return slug
}

export function buildSeriesMap(posts: Post[]): Map<string, Post[]> {
  const bySeries = Map.groupBy(
    posts.filter((post) => post.data.series !== undefined),
    (post) => post.data.series as string,
  )
  for (const members of bySeries.values()) {
    members.sort((a, b) => (a.data.seriesOrder ?? 0) - (b.data.seriesOrder ?? 0))
  }
  return bySeries
}

// One language at a time, so a series page never mixes languages and a
// half-translated series comes out shorter rather than mixed.
export async function getSeries(lang?: Post['data']['lang']): Promise<Map<string, Post[]>> {
  const posts = await getListedPosts(lang)
  return buildSeriesMap(posts)
}

export function getSeriesNavigation(
  post: Post,
  seriesMap: Map<string, Post[]>,
): {
  name: string
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

export { slugify } from './slugify'
export { chipColor } from './chip-color'
