import { glob } from 'astro/loaders'
import { defineCollection, z } from 'astro:content'

/**
 * One collection, one folder per post: content/blog/<folder>/index.md(x) is the
 * post, and every other markdown file in that same folder is a translation of
 * it. The folder IS the pairing, which is why no frontmatter field points at a
 * source post: two files in one folder are the same article, and `lang` says
 * which language each one is.
 *
 * The pattern matches exactly one level deep instead of recursing, because a
 * post file always lives directly inside its post folder. A note Obsidian
 * creates with Ctrl+N anywhere else is not a post, so it cannot fail the build
 * on a missing title.
 */
const blog = defineCollection({
  loader: glob({
    pattern: '*/*.{md,mdx}',
    base: './content/blog',
    // The default would use a `slug` in the frontmatter as the entry id, which
    // collides the moment a translation's English slug matches its folder name:
    // both entries claim the same id and one silently replaces the other, so a
    // published Portuguese post loses its page. The id is the file's path, and
    // the URL slug is computed separately in src/lib/posts.ts.
    generateId: ({ entry }) => entry.replace(/\.mdx?$/, '').replace(/\/index$/, ''),
  }),
  // image() resolves the relative path to a real built asset, which is what
  // makes heroImage usable as og:image. A wrong path now fails the build.
  // Translations share the folder, so they share those relative paths too.
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      // A future pubDate means scheduled: the build hides it until its time.
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      // The language of THIS file. Posts are written in Portuguese by default;
      // a translation says so here and gets its own /<lang>/ URL.
      lang: z.enum(['pt', 'en']).default('pt'),
      /**
       * Overrides the URL slug, so an English translation reads as English in
       * the address bar instead of inheriting the Portuguese folder name. When
       * absent the slug is the folder name (index files) or the file name.
       */
      slug: z.string().optional(),
      // THE SECTION, exactly one per post. Tags stay separate and many.
      category: z.string(),
      tags: z.array(z.string()).default([]),
      // A short slug you can remember, e.g. `grpc`. It is also the series URL.
      series: z.string().optional(),
      // The display title. Write it on the first part only.
      seriesName: z.string().optional(),
      seriesOrder: z.number().optional(),
      // Doubles as the hover-preview excerpt and the meta description.
      description: z.string(),
      heroImage: image().optional(),
      heroImageAlt: z.string().optional(),
      /**
       * Written the way git writes an author: `Lucas <https://lsantos.dev>`, the
       * site part optional. Omitted means the blog's owner, so the migrated posts
       * need no edit; it is only worth writing for a guest post or a co-author.
       */
      authors: z.array(z.string()).optional(),
      draft: z.boolean().default(true),
      // Preserved from Ghost; everything renders public for now.
      visibility: z.enum(['public', 'members', 'paid']).default('public'),
      /** Thin or placeholder pages: keep the URL working, keep it out of search. */
      noindex: z.boolean().default(false),
      /** Drives the translation banner. False once a human edits the file. */
      machineTranslated: z.boolean().default(false),
      seoTitle: z.string().optional(),
      seoDescription: z.string().optional(),
    }),
})

export const collections = { blog }
