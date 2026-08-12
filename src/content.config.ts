import { glob } from 'astro/loaders'
import { defineCollection, z } from 'astro:content'

// The folder Obsidian opens directly. Generated translations go in a
// separate build-managed folder later, kept out of the writing view.
//
// One post is one folder: content/blog/<slug>/index.md(x) plus its images, so a
// post and its assets live together and image paths are just ./image.png.
// Matching only `index` files also means a stray note Obsidian creates with
// Ctrl+N is not a post, instead of failing the build on a missing title.
const blog = defineCollection({
  loader: glob({ pattern: '**/index.{md,mdx}', base: './content/blog' }),
  schema: z.object({
    title: z.string(),
    // A future pubDate means scheduled: the build hides it until its time.
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    // The language this article was WRITTEN in; the other one is generated.
    lang: z.enum(['pt', 'en']).default('pt'),
    // THE SECTION, exactly one per post. Tags stay separate and many.
    category: z.string(),
    tags: z.array(z.string()).default([]),
    series: z.string().optional(),
    seriesOrder: z.number().optional(),
    // Doubles as the hover-preview excerpt and the meta description.
    description: z.string(),
    heroImage: z.string().optional(),
    heroImageAlt: z.string().optional(),
    epigraph: z.string().optional(),
    epigraphCite: z.string().optional(),
    draft: z.boolean().default(true),
    // Preserved from Ghost; everything renders public for now.
    visibility: z.enum(['public', 'members', 'paid']).default('public'),
    canonicalUrl: z.string().url().optional(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
  }),
})

/**
 * Machine translations, written by scripts/translate.ts and committed by CI.
 * Deliberately a separate collection in a separate folder: Obsidian only ever
 * opens content/blog, so the writing view shows source-language posts only.
 */
const translated = defineCollection({
  loader: glob({ pattern: '**/index.{md,mdx}', base: './content/translated' }),
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    lang: z.enum(['pt', 'en']),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    series: z.string().optional(),
    seriesOrder: z.number().optional(),
    description: z.string(),
    heroImage: z.string().optional(),
    heroImageAlt: z.string().optional(),
    epigraph: z.string().optional(),
    epigraphCite: z.string().optional(),
    draft: z.boolean().default(false),
    visibility: z.enum(['public', 'members', 'paid']).default('public'),
    canonicalUrl: z.string().url().optional(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    /** False once a human edits the file: their version wins and the banner goes. */
    machineTranslated: z.boolean().default(true),
    /** Slug of the source post this was translated from. */
    translationOf: z.string(),
  }),
})

export const collections = { blog, translated }
