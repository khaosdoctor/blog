// Site-wide constants and typed JSON-LD builders for <SEO />. Kept as plain
// functions returning plain objects so they're easy to unit-test later and so
// SEO.astro can just JSON.stringify() the result.

import { parseAuthors } from './authors'

export const SITE_NAME = 'lsantos.dev'
export const AUTHOR_NAME = 'Lucas Santos'
const AUTHOR_GITHUB = 'https://github.com/khaosdoctor'
export const AUTHOR_TWITTER_HANDLE = '@khaosdoctor'
export const DEFAULT_LOCALE = 'pt'

/**
 * Profiles that are unambiguously the same person, for schema.org `sameAs`.
 * This is how a search engine ties the byline on 169 posts to one entity rather
 * than to a name that happens to recur.
 */
const AUTHOR_PROFILES = [
  AUTHOR_GITHUB,
  'https://x.com/khaosdoctor',
  'https://www.linkedin.com/in/khaosdoctor/',
]

export function buildPersonJsonLd(url: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: AUTHOR_NAME,
    url,
    sameAs: AUTHOR_PROFILES,
  }
}

// og:locale wants underscore-joined locale tags (pt_BR), not BCP-47 (pt-BR).
// Extend this map if more languages show up; unknown langs pass through as-is.
const OG_LOCALES: Record<string, string> = {
  pt: 'pt_BR',
  en: 'en_US',
}

export function toOgLocale(lang: string): string {
  return OG_LOCALES[lang] ?? lang
}

/**
 * Sections that have a card in `public/og/`. A section missing from this list
 * gets the default card, so writing a post in a brand new section never points
 * a share at a PNG nobody drew.
 *
 * One entry per file that actually exists, and nothing else: the list used to
 * carry `newsletter`, which is neither a category any post uses nor a drawn
 * card, and to omit `opinion`, which is both.
 */
const OG_SECTION_CARDS = [
  'career',
  'infra',
  'javascript',
  'meta',
  'opinion',
  'security',
  'typescript',
]

export const OG_CARD_WIDTH = 1200
export const OG_CARD_HEIGHT = 630

/**
 * Root-relative path of the card to share when a page has no image of its own.
 * Takes the section URL (`/infra/`) rather than its display name, because that
 * is the string the filename is built from.
 */
export function sectionOgImage(sectionUrl?: string): string {
  const section = sectionUrl?.replace(/^\/+|\/+$/g, '')
  if (section && OG_SECTION_CARDS.includes(section)) return `/og/${section}.png`
  return '/og/default.png'
}

export type PageType = 'website' | 'article'

export interface BreadcrumbItem {
  name: string
  url: string
}

export interface JsonLdInput {
  title: string
  description: string
  canonical: string
  lang: string
  image?: string
  publishedAt?: Date
  updatedAt?: Date
  tags?: string[]
  series?: string
  /** Raw `authors` frontmatter, git format. Absent means the site's owner. */
  authors?: string[]
}

export function buildArticleJsonLd(input: JsonLdInput): Record<string, unknown> {
  const { title, description, canonical, lang, image, publishedAt, updatedAt, tags, series, authors } =
    input
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    inLanguage: lang,
    url: canonical,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    ...(image ? { image: [image] } : {}),
    ...(publishedAt ? { datePublished: publishedAt.toISOString() } : {}),
    ...(updatedAt ? { dateModified: updatedAt.toISOString() } : {}),
    ...(tags && tags.length > 0 ? { keywords: tags.join(', ') } : {}),
    // Series only gets a name here, no @id, this component has no
    // series URL to point at. Wire a real series page in when one exists.
    ...(series ? { isPartOf: { '@type': 'CreativeWorkSeries', name: series } } : {}),
    // Who actually wrote it, not who owns the site. A guest post carried the
    // right visible byline and the wrong schema.org author, and the schema is
    // the half machines read. `publisher` stays the owner either way: the byline
    // says who wrote it, the publisher says whose site it appeared on.
    author: parseAuthors(authors).map((person) => ({
      '@type': 'Person',
      name: person.name,
      ...(person.url === null ? {} : { url: person.url }),
    })),
    publisher: { '@type': 'Person', name: AUTHOR_NAME, url: AUTHOR_GITHUB },
  }
}

function buildWebSiteJsonLd(input: JsonLdInput): Record<string, unknown> {
  const { title, description, canonical, lang } = input
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: title,
    description,
    url: canonical,
    inLanguage: lang,
  }
}

export function buildPrimaryJsonLd(type: PageType, input: JsonLdInput): Record<string, unknown> {
  switch (type) {
    case 'article':
      return buildArticleJsonLd(input)
    case 'website':
      return buildWebSiteJsonLd(input)
    default:
      return type satisfies never
  }
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

// JSON.stringify() never escapes `<`, so a raw result written into a
// <script> via set:html breaks the page if a value contains the literal
// substring `</script` (e.g. a post titled "Escaping </script> tags").
// < is valid inside a JSON string and decodes back to `<` for any
// consumer parsing the script body as JSON (Google's structured-data
// parser included), so this is a safe, lossless escape.
export function toJsonLdScript(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
