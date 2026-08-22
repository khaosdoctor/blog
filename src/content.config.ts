import { glob } from 'astro/loaders'
import { defineCollection, z } from 'astro:content'

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
      lang: z.enum(['pt', 'en']).default('pt'),
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
      // Non-public values are ignored; everything renders public.
      visibility: z.enum(['public', 'members', 'paid']).default('public'),
      noindex: z.boolean().default(false),
      machineTranslated: z.boolean().default(false),
      seoTitle: z.string().optional(),
      seoDescription: z.string().optional(),
    }),
})

export const collections = { blog }
