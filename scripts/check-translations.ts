/**
 * Rejects unsafe markup in machine-written translations.
 *
 * Translations are produced by a model reading posts that quote third-party
 * text, so the output is untrusted input that becomes site content. The old
 * script had a guard for this; the CI path that replaced it had none, and a
 * reviewer skimming a few hundred lines in a second language is exactly who
 * misses one added line.
 *
 * Code fences are stripped before checking, because posts legitimately contain
 * script tags as examples.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DIR = 'content/translated'

const BANNED: [RegExp, string][] = [
  [/<script\b/i, '<script> element'],
  [/<\/?(?:iframe|object|embed|form|base|meta|link)\b/i, 'raw HTML element that can load or send'],
  [/\son[a-z]+\s*=/i, 'inline event handler attribute'],
  [/javascript\s*:/i, 'javascript: URL'],
  [/data:text\/html/i, 'data: HTML URL'],
  [/srcdoc\s*=/i, 'srcdoc attribute'],
  // Component tags are injected by the page, and only a known set exists. A new
  // one means the model invented markup.
  [/<(?!\/)(?!Figure|Video|Vimeo|YouTube|Bookmark|Tweet|Sidenote|MarginNote|Epigraph|RawEmbed|MissingImage|br|hr|figure|figcaption|em|strong|code|pre|kbd|sup|sub|abbr|del|ins|mark|span|a|img|p|ul|ol|li|blockquote|table|thead|tbody|tr|th|td|h[1-6]|details|summary|div)[A-Za-z][A-Za-z0-9]*\b/, 'unknown element or component'],
]

function walk(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...walk(full))
    else if (/\.mdx?$/.test(entry.name)) found.push(full)
  }
  return found
}

function withoutCode(source: string): string {
  return source.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '')
}

try {
  statSync(DIR)
} catch {
  console.log(`${DIR} does not exist, nothing to check.`)
  process.exit(0)
}

const problems: string[] = []

for (const file of walk(DIR)) {
  const prose = withoutCode(readFileSync(file, 'utf8'))
  for (const [pattern, label] of BANNED) {
    const match = pattern.exec(prose)
    if (match !== null) problems.push(`${file}: ${label} (${match[0].trim().slice(0, 40)})`)
  }
}

if (problems.length === 0) {
  console.log('translations look clean')
  process.exit(0)
}

console.error(`\n${problems.length} problems in translated content:\n`)
for (const problem of problems) console.error(`  ${problem}`)
console.error('\nRefusing to commit. Model output is untrusted.')
process.exit(1)
