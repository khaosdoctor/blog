import { parseAuthors } from './authors'

export const SITE_NAME = 'lsantos.dev'
export const AUTHOR_NAME = 'Lucas Santos'
const AUTHOR_GITHUB = 'https://github.com/khaosdoctor'
export const AUTHOR_TWITTER_HANDLE = '@_staticvoid'

const AUTHOR_PROFILES = [AUTHOR_GITHUB, 'https://x.com/_staticvoid', 'https://www.linkedin.com/in/lsantosdev/']

export function buildPersonJsonLd(url: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: AUTHOR_NAME,
    url,
    sameAs: AUTHOR_PROFILES,
  }
}

// og:locale needs pt_BR style locale tags, not BCP-47 pt-BR.
const OG_LOCALES: Record<string, string> = {
  pt: 'pt_BR',
  en: 'en_US',
}

export function toOgLocale(lang: string): string {
  return OG_LOCALES[lang] ?? lang
}

// Must stay in sync with `public/og/`: one entry per card that exists
// unlisted category shares the default
const OG_CATEGORY_CARDS = ['career', 'infra', 'javascript', 'meta', 'opinion', 'security', 'typescript']

export const OG_CARD_WIDTH = 1200
export const OG_CARD_HEIGHT = 630

// Portuguese cards are the root of `public/og/`, every translated set a
// directory named after its language. Also in sync with `scripts/build-og.ts`.
const OG_CARD_LOCALES = ['en']

/**
 * Takes the category URL rather than its display name: the file is named after
 * the URL. The last segment is what names the card, because the English routes
 * pass a locale-prefixed path (`/en/infra/`) that the breadcrumb needs.
 */
export function categoryOgImage(lang: string, categoryUrl?: string): string {
  const dir = OG_CARD_LOCALES.includes(lang) ? `${lang}/` : ''
  const category = categoryUrl
    ?.replace(/^\/+|\/+$/g, '')
    .split('/')
    .at(-1)
  const card = category && OG_CATEGORY_CARDS.includes(category) ? category : 'default'
  return `/og/${dir}${card}.png`
}

type PageType = 'website' | 'article'

export interface BreadcrumbItem {
  name: string
  url: string
}

interface JsonLdInput {
  title: string
  description: string
  canonical: string
  lang: string
  image?: string
  publishedAt?: Date
  updatedAt?: Date
  tags?: string[]
  series?: string
  authors?: string[]
}

function buildArticleJsonLd(input: JsonLdInput): Record<string, unknown> {
  const { title, description, canonical, lang, image, publishedAt, updatedAt, tags, series, authors } = input
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
    ...(series ? { isPartOf: { '@type': 'CreativeWorkSeries', name: series } } : {}),
    // `author` is whoever wrote the post; `publisher` is always the site owner.
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

// JSON.stringify() never escapes `<`, so a value containing `</script` would
// close the tag it is written into.
export function toJsonLdScript(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
