import { glob } from 'astro/loaders'
import { defineCollection, z } from 'astro:content'
import { LOCALES, SOURCE_LOCALE } from './i18n/locales.ts'
import { labSources } from './lib/lab-sources'

// Exactly one level deep, so a stray note anywhere else cannot fail the build.
const blog = defineCollection({
  loader: glob({
    pattern: '*/*.{md,mdx}',
    base: './content/blog',
    // The default id honours a frontmatter `slug`, so a translation whose slug
    // equals its directory name would claim the same id and replace the other.
    generateId: ({ entry }) => entry.replace(/\.mdx?$/, '').replace(/\/index$/, ''),
  }),
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
      machineTranslated: z.boolean().default(false),
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
