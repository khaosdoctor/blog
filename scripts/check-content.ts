/**
 * Catches footnotes that go missing between what an author writes and what the
 * page shows. GFM drops a definition nobody references without a word, so a
 * renumbering that orphans one deletes a paragraph and the build still passes;
 * a reference with no definition survives as the literal text `[^1]`. Both were
 * reproduced against this pipeline before this guard existed.
 *
 * Also rejects a markdown link to another post, which is written as a wikilink
 * so the link graph and Obsidian see every one, and any .mdx file.
 */
import { readFileSync } from 'node:fs'
import { basename, dirname } from 'node:path'
import { asLocale, postUrl } from '../src/i18n/locales.ts'
import { slugFrom } from '../src/lib/post-file.ts'
import { annotate, count, fail, field, frontmatterOf, heading, ok, postFiles } from './lib/cli.ts'

const CONTENT = 'content/blog'
const POST_LINK = /(?<!!)\[[^\]]*\]\((?:https?:\/\/blog\.lsantos\.dev)?(\/[^)\s#?]*)/g

type Failure = { file: string; detail: string }
const failures: Failure[] = []

/** Code is never markdown here, the same exclusion the wikilink plugin makes. */
function withoutCode(body: string): string {
  return body.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '')
}

function lineOf(body: string, index: number): number {
  return body.slice(0, index).split('\n').length
}

/** Post URL -> its folder, the name a wikilink takes. */
function postFolders(files: string[]): Map<string, string> {
  const folders = new Map<string, string>()
  for (const file of files) {
    const front = frontmatterOf(readFileSync(file, 'utf8'))
    const folder = basename(dirname(file))
    const slug = field(front, 'slug') ?? slugFrom(folder, basename(file))
    folders.set(postUrl(slug, asLocale(field(front, 'lang') ?? undefined)), folder)
  }
  return folders
}

function check(file: string, folders: Map<string, string>): void {
  const raw = readFileSync(file, 'utf8')
  const body = withoutCode(raw.replace(/^---\n[\s\S]*?\n---\n/, ''))

  if (file.endsWith('.mdx')) {
    failures.push({ file, detail: 'posts are .md, so Obsidian reads them; rename it' })
  }

  for (const match of body.matchAll(POST_LINK)) {
    const path = match[1].endsWith('/') ? match[1] : `${match[1]}/`
    const folder = folders.get(path)
    if (folder === undefined) continue
    failures.push({
      file: `${file}:${lineOf(body, match.index)}`,
      detail: `links ${path} with a markdown link, write [[${folder}]] instead`,
    })
  }

  const defined = new Map<string, number>()
  for (const match of body.matchAll(/^\[\^([^\]]+)\]:/gm)) {
    defined.set(match[1], lineOf(body, match.index))
  }

  const referenced = new Map<string, number>()
  for (const match of body.matchAll(/\[\^([^\]]+)\](?!:)/g)) {
    if (!referenced.has(match[1])) referenced.set(match[1], lineOf(body, match.index))
  }

  for (const [id, line] of defined) {
    if (!referenced.has(id)) {
      failures.push({
        file: `${file}:${line}`,
        detail: `[^${id}] is defined but never referenced, so it renders nowhere`,
      })
    }
  }
  for (const [id, line] of referenced) {
    if (!defined.has(id)) {
      failures.push({
        file: `${file}:${line}`,
        detail: `[^${id}] is referenced but never defined, so it shows as literal text`,
      })
    }
  }
}

heading('check-content: verifying footnotes resolve and posts link by wikilink')

const files = postFiles(CONTENT)
const folders = postFolders(files)
for (const file of files) check(file, folders)

if (failures.length > 0) {
  for (const { file, detail } of failures) {
    fail(`${file}: ${detail}`)
    annotate('error', { file: file.split(':')[0], message: detail })
  }
  console.error()
  fail(count(failures.length, 'content problem', 'content problems'))
  process.exit(1)
}

ok(`footnotes resolve and posts link by wikilink in all ${files.length} post files`)
