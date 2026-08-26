/**
 * The locale set and the URL rule, in the one place every builder can reach.
 * `posts.ts` works from the collection, `post-dates.mjs` from frontmatter
 * before astro:content exists, `remark-wikilinks.mjs` from its own index, and
 * the node scripts from neither, so none of them can import another.
 *
 * A leaf module: importing nothing is what lets astro.config.mjs, the remark
 * plugins and the node scripts all use it.
 */

export const LOCALES = ['pt', 'en'] as const

export type Locale = (typeof LOCALES)[number]

export const SOURCE_LOCALE: Locale = 'pt'

/** Narrows anything read from frontmatter, a filename or `<html lang>`. */
export function asLocale(value: unknown): Locale {
  return LOCALES.find((locale) => locale === value) ?? SOURCE_LOCALE
}

/** Source language bare at the root, every other language under its own prefix. */
export function localePath(locale: Locale, path: string): string {
  return locale === SOURCE_LOCALE ? path : `/${locale}${path}`
}

export function postUrl(slug: string, lang: Locale): string {
  return localePath(lang, `/${slug}/`)
}
