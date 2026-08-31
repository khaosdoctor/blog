/**
 * Catches footnotes that go missing between what an author writes and what the
 * page shows. GFM drops a definition nobody references without a word, so a
 * renumbering that orphans one deletes a paragraph and the build still passes;
 * a reference with no definition survives as the literal text `[^1]`. Both were
 * reproduced against this pipeline before this guard existed.
 */
import { readFileSync } from 'node:fs'
import { annotate, count, fail, heading, ok, postFiles } from './lib/cli.ts'

const CONTENT = 'content/blog'

type Failure = { file: string; detail: string }
const failures: Failure[] = []

/** Code is never markdown here, the same exclusion the wikilink plugin makes. */
function withoutCode(body: string): string {
  return body.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '')
}

function lineOf(body: string, index: number): number {
  return body.slice(0, index).split('\n').length
}

function check(file: string): void {
  const raw = readFileSync(file, 'utf8')
  const body = withoutCode(raw.replace(/^---\n[\s\S]*?\n---\n/, ''))

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

heading('check-content: verifying footnotes resolve')

const files = postFiles(CONTENT)
for (const file of files) check(file)

if (failures.length > 0) {
  for (const { file, detail } of failures) {
    fail(`${file}: ${detail}`)
    annotate('error', { file: file.split(':')[0], message: detail })
  }
  console.error()
  fail(count(failures.length, 'orphaned footnote', 'orphaned footnotes'))
  process.exit(1)
}

ok(`footnotes resolve in all ${files.length} post files`)
