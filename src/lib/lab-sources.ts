import { readdir, readFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import type { Loader } from 'astro/loaders'
import { labSourceId } from './lab-source.mjs'
import { urlFor } from './post-dates.mjs'

const POSTS = 'content/blog'
const SOURCES = 'components'

async function paths(dir: string): Promise<string[]> {
  const found: string[] = []
  for (const entry of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (entry.isDirectory()) continue
    found.push(join(entry.parentPath, entry.name))
  }
  return found
}

async function postDirs(): Promise<string[]> {
  const dirs: string[] = []
  for (const entry of await readdir(POSTS, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const files = await readdir(join(POSTS, entry.name))
    if (files.includes(SOURCES)) dirs.push(entry.name)
  }
  return dirs
}

async function postUrl(post: string): Promise<string> {
  const files = await readdir(join(POSTS, post))
  const index = ['index.mdx', 'index.md'].find((name) => files.includes(name))
  if (index === undefined) throw new Error(`${join(POSTS, post)} holds lab sources but has no index.mdx.`)
  const frontmatter = /^---\n([\s\S]*?)\n---/.exec(await readFile(join(POSTS, post, index), 'utf8'))?.[1] ?? ''
  return urlFor(post, index, frontmatter)
}

/** A fence long enough to survive a source file that contains one itself. */
function fence(path: string, code: string): string {
  const runs = [...code.matchAll(/^`{3,}/gm)].map((match) => match[0].length + 1)
  const ticks = '`'.repeat(Math.max(3, ...runs))
  return `${ticks}${extname(path).slice(1) || 'text'}\n${code}\n${ticks}\n`
}

/**
 * Every file a lab demo can reveal, one entry each. A loader is the one place
 * outside a post that can reach the configured markdown processor, so the source
 * is highlighted by the same expressive-code pass a fenced block goes through.
 */
export function labSources(): Loader {
  return {
    name: 'lab-sources',
    load: async ({ store, renderMarkdown, generateDigest, parseData }) => {
      const seen = new Set<string>()

      for (const post of await postDirs()) {
        const url = await postUrl(post)
        for (const path of await paths(join(POSTS, post, SOURCES))) {
          const id = labSourceId(join(POSTS, post), path)
          seen.add(id)

          const code = await readFile(path, 'utf8')
          const digest = generateDigest(code)
          if (store.get(id)?.digest === digest) continue

          const body = fence(path, code)
          store.set({
            id,
            data: await parseData({ id, data: { name: basename(path), postUrl: url }, filePath: path }),
            body,
            filePath: path,
            digest,
            rendered: await renderMarkdown(body),
          })
        }
      }

      for (const id of store.keys()) {
        if (!seen.has(id)) store.delete(id)
      }
    },
  }
}
