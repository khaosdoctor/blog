import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { asLocale, postUrl } from '../i18n/locales.ts'
import { frontmatterOf, slugFrom } from './post-file.mjs'

export const field = (frontmatter, name) =>
  new RegExp(`^${name}:\\s*(.+)$`, 'm').exec(frontmatter)?.[1].trim().replace(/^["']|["']$/g, '')

export function urlFor(directory, filename, frontmatter) {
  const slug = field(frontmatter, 'slug') ?? slugFrom(directory, filename)
  return postUrl(slug, asLocale(field(frontmatter, 'lang')))
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

      const frontmatter = frontmatterOf(readFileSync(join(dir, entry.name, file), 'utf8'))
      if (frontmatter === '') continue
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
