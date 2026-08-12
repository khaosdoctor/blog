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

export async function getTags(): Promise<Map<string, Post[]>> {
  const posts = await getPublishedPosts()
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

/** Series posts are ordered by seriesOrder, not by date. */
export async function getSeries(): Promise<Map<string, Post[]>> {
  const posts = await getPublishedPosts()
  return buildSeriesMap(posts)
}

/**
 * Previous/next within a series. Takes an already-built series map so callers
 * that need this for every post (e.g. one call per post page) can build the
 * map once instead of re-fetching and re-sorting the whole collection per call.
 */
export function getSeriesNavigation(
  post: Post,
  seriesMap: Map<string, Post[]>,
): {
  /** The slug, which is also the URL. */
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
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
