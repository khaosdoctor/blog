import { defineCollection, z } from 'astro:content'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { glob, type Loader } from 'astro/loaders'
import { LOCALES, SOURCE_LOCALE } from './i18n/locales.ts'
import { labSources } from './lib/lab-sources'

// Exactly one level deep, so a stray note anywhere else cannot fail the build.
// The dev server also reads drafts, so they can be checked before they ship.
const POSTS = import.meta.env.DEV ? ['blog/*/*.md', 'internal/draft ideas/*/*.md'] : 'blog/*/*.md'

type Entry = { data: Record<string, unknown>; filePath?: string }

// A heroImage pointing at a missing file runs the dev server out of memory
// rather than failing, and a draft never reaches the build that would catch it.
// The page cover is generated either way; only og:image falls back to the category card.
function dropMissingHero<T extends Entry>(entry: T): T {
  const hero = entry.data.heroImage
  if (typeof hero !== 'string' || entry.filePath === undefined) return entry
  if (existsSync(join(dirname(entry.filePath), hero))) return entry
  console.warn(`${entry.filePath}: heroImage ${hero} does not exist, ignored on the dev server`)
  const { heroImage: _missing, ...data } = entry.data
  return { ...entry, data }
}

function devSafe(loader: Loader): Loader {
  if (!import.meta.env.DEV) return loader
  return {
    ...loader,
    load: (context) => loader.load({ ...context, parseData: (props) => context.parseData(dropMissingHero(props)) }),
  }
}

const blog = defineCollection({
  loader: devSafe(
    glob({
      pattern: POSTS,
      base: './content',
      // The default id honours a frontmatter `slug`, so a translation whose slug
      // equals its directory name would claim the same id and replace the other.
      // The lang prefix is what stops a source and a translation that slugify
      // alike from claiming one id: array-groupby-stage-3 is titled the same in
      // both languages, and its filenames are identical.
      // Only folder/file, so a draft keeps the id it will have once published.
      generateId: ({ entry, data }) =>
        `${data.lang ?? SOURCE_LOCALE}/${entry.split('/').slice(-2).join('/').replace(/\.md$/, '')}`,
    }),
  ),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      // A future pubDate means scheduled: the build hides it until its time.
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      lang: z.enum(LOCALES).default(SOURCE_LOCALE),
      slug: z.string().optional(),
      category: z.string(),
      tags: z.array(z.string()).default([]),
      // Doubles as the series URL.
      series: z.string().optional(),
      seriesName: z.string().optional(),
      seriesOrder: z.number().optional(),
      description: z.string(),
      heroImage: image().optional(),
      heroImageAlt: z.string().optional(),
      authors: z.array(z.string()).optional(),
      draft: z.boolean().default(true),
      noindex: z.boolean().default(false),
      // Absent means a person owns the file, so translate.ts may only rewrite
      // a translation that says true here.
      machineOwnedTranslation: z.boolean().default(false),
      seoTitle: z.string().optional(),
      seoDescription: z.string().optional(),
    }),
})

// A lab demo's source, one entry per file under a post's components/, so the
// demo can link to it instead of carrying it.
const labSource = defineCollection({
  loader: labSources(),
  schema: z.object({ name: z.string(), postUrl: z.string() }),
})

export const collections = { blog, labSource }
