import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export const field = (frontmatter, name) =>
  new RegExp(`^${name}:\\s*(.+)$`, 'm').exec(frontmatter)?.[1].trim().replace(/^["']|["']$/g, '')

/**
 * The post's own URL, by the same rule as `slugOf`/`urlOf` in src/lib/posts.ts:
 * an explicit `slug` wins, then the filename, and `index` means the folder.
 * Portuguese keeps the bare path, every other language gets a prefix.
 */
export function urlFor(folder, filename, frontmatter) {
  const name = filename.replace(/\.mdx?$/, '')
  const slug = field(frontmatter, 'slug') ?? (name === 'index' ? folder : name)
  const lang = field(frontmatter, 'lang') ?? 'pt'
  return lang === 'pt' ? `/${slug}/` : `/${lang}/${slug}/`
}

// Read from frontmatter, not the content collection: astro.config.mjs is evaluated
// before astro:content exists.
function collect() {
  const dates = new Map()
  const noindex = new Set()
  const dir = 'content/blog'
  if (!existsSync(dir)) return { dates, noindex }

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue

    for (const file of readdirSync(join(dir, entry.name))) {
      if (!/\.mdx?$/.test(file)) continue

      const frontmatter = /^---\n([\s\S]*?)\n---/.exec(readFileSync(join(dir, entry.name, file), 'utf8'))?.[1]
      if (frontmatter === undefined) continue
      if (/^draft:\s*true/m.test(frontmatter)) continue

      // A page that tells crawlers not to index it must not also be advertised in
      // the sitemap: the two would contradict each other, which is worse for the
      // rest of the site than either one alone.
      if (/^noindex:\s*true/m.test(frontmatter)) noindex.add(urlFor(entry.name, file, frontmatter))

      const raw = field(frontmatter, 'updatedDate') ?? field(frontmatter, 'pubDate')
      if (raw === undefined) continue

      const date = new Date(raw)
      if (Number.isNaN(date.getTime())) continue

      dates.set(urlFor(entry.name, file, frontmatter), date.toISOString())
    }
  }

  return { dates, noindex }
}

const collected = collect()

export const lastModified = collected.dates
export const noindexPaths = collected.noindex
