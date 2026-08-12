import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Read from frontmatter, not the content collection: astro.config.mjs is evaluated
// before astro:content exists.
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
