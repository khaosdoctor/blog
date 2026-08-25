/**
 * Strips agent artefacts out of translated posts.
 *
 *   node scripts/clean-translations.ts
 *   node scripts/clean-translations.ts --check   # exit 1 if anything is dirty
 *
 * Translations are written by agents, and an agent can leak its own tool-call
 * closing tags into the file it wrote. Three of the first sixty-two carried a
 * trailing `</content>`, which fails the MDX parse and takes the whole build
 * with it. Cheaper to strip them here than to re-run a translation.
 *
 * Only non-index files one level under content/blog are touched, so a source
 * post is never modified.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { postFiles } from './lib/cli.ts'

const ROOT = 'content/blog'
const CHECK_ONLY = process.argv.includes('--check')

/** A line that is nothing but a tool-call tag. Never legitimate prose. */
const ARTEFACT_LINE = /^\s*<\/?(?:content|invoke|function_calls|function_results|antml:[a-z_]+)\b[^>]*>\s*$/

const dirty: { file: string; removed: string[] }[] = []

for (const file of postFiles(ROOT, { index: false })) {
  const lines = readFileSync(file, 'utf8').split('\n')
  const removed = lines.filter((line) => ARTEFACT_LINE.test(line)).map((line) => line.trim())
  if (removed.length === 0) continue

  dirty.push({ file, removed })
  if (CHECK_ONLY) continue

  // Trailing blank lines go with them, so the file ends on real content.
  const kept = lines.filter((line) => !ARTEFACT_LINE.test(line))
  while (kept.length > 0 && kept[kept.length - 1].trim() === '') kept.pop()
  writeFileSync(file, `${kept.join('\n')}\n`)
}

if (dirty.length === 0) {
  console.log('translations are clean')
  process.exit(0)
}

for (const entry of dirty) {
  console.log(`${CHECK_ONLY ? 'DIRTY' : 'cleaned'} ${entry.file}: ${entry.removed.join(' ')}`)
}
console.log(`${dirty.length} file(s)`)
process.exit(CHECK_ONLY ? 1 : 0)
