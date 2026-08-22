import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export const field = (frontmatter, name) =>
  new RegExp(`^${name}:\\s*(.+)$`, 'm').exec(frontmatter)?.[1].trim().replace(/^["']|["']$/g, '')

/** Must stay in sync with `slugOf`/`urlOf` in src/lib/posts.ts. */
export function urlFor(folder, filename, frontmatter) {
  const name = filename.replace(/\.mdx?$/, '')
  const slug = field(frontmatter, 'slug') ?? (name === 'index' ? folder : name)
  const lang = field(frontmatter, 'lang') ?? 'pt'
  return lang === 'pt' ? `/${slug}/` : `/${lang}/${slug}/`
}

// Frontmatter, not the collection: astro.config.mjs runs before astro:content.
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

      // A noindex page must not also appear in the sitemap; the two contradict.
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
