import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * URL path -> last modification date, for the sitemap's lastmod.
 *
 * Read straight from frontmatter rather than from the content collection: the
 * sitemap integration is configured in astro.config.mjs, which is evaluated
 * before astro:content exists. Frontmatter is the same source of truth either
 * way, and a few hundred small files parse in milliseconds.
 *
 * updatedDate wins where present, the migration only wrote it when Ghost's
 * updated_at was more than a day after publication, so it means a real edit
 * rather than bookkeeping.
 */
function collect() {
  const dates = new Map()
  const dir = 'content/blog'
  if (!existsSync(dir)) return dates

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const file = ['index.mdx', 'index.md'].map((name) => join(dir, entry.name, name)).find(existsSync)
    if (file === undefined) continue

    const frontmatter = /^---\n([\s\S]*?)\n---/.exec(readFileSync(file, 'utf8'))?.[1]
    if (frontmatter === undefined) continue
    if (/^draft:\s*true/m.test(frontmatter)) continue

    const raw =
      /^updatedDate:\s*(.+)$/m.exec(frontmatter)?.[1] ?? /^pubDate:\s*(.+)$/m.exec(frontmatter)?.[1]
    if (raw === undefined) continue

    const date = new Date(raw.trim().replace(/^["']|["']$/g, ''))
    if (Number.isNaN(date.getTime())) continue

    dates.set(`/${entry.name}/`, date.toISOString())
  }

  return dates
}

export const lastModified = collect()
