/**
 * Rejects unsafe markup in machine-written translations.
 *
 * Translations are produced by a model reading posts that quote third-party
 * text, so the output is untrusted input that becomes site content. The old
 * script had a guard for this; the CI path that replaced it had none, and a
 * reviewer skimming a few hundred lines in a second language is exactly who
 * misses one added line.
 *
 * A translation now lives in the same folder as its source post, named after
 * its own slug: content/blog/<slug>/index.mdx is the source, and
 * content/blog/<slug>/<translated-slug>.mdx is the translation. The folder is
 * the pairing, so every non-index .md/.mdx file one level under content/blog
 * is a translation and gets scanned.
 *
 * Code fences are stripped before checking, because posts legitimately contain
 * script tags as examples.
 *
 * Translations are .mdx like everything else now, so the real protection is
 * this guard, not the extension.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { annotate, bold, count, dim, fail, heading, ok } from './lib/cli.ts'

const DIR = 'content/blog'

const BANNED: [RegExp, string][] = [
  [/<script\b/i, '<script> element'],
  [/<\/?(?:iframe|object|embed|form|base|meta|link)\b/i, 'raw HTML element that can load or send'],
  // A `/` opens a new attribute for the tokenizer just like whitespace does, so
  // `<img src=x/onerror=1>` needs both boundaries to be caught.
  [/[\s/]+on[a-z0-9_:.-]+\s*=/i, 'inline event handler attribute'],
  // An MDX expression executes during the build, so any `{...}` a model wrote is
  // rejected outright rather than trusted to be inert.
  [/\{[\s\S]*?\}/, 'MDX expression'],
  [/^import\s/m, 'import statement'],
  [/^export\s/m, 'export statement'],
  // Only where a scheme can actually navigate: an attribute value, or a markdown
  // link destination. Prose ends a sentence with "JavaScript:" all the time, and
  // rejecting that trains everyone to ignore this script.
  [/(?:href|src|action|formaction)\s*=\s*["']?\s*javascript\s*:/i, 'javascript: URL in an attribute'],
  [/\]\(\s*<?\s*javascript\s*:/i, 'javascript: URL in a link'],
  [/(?:href|src)\s*=\s*["']?\s*data:text\/html/i, 'data: HTML URL'],
  [/srcdoc\s*=/i, 'srcdoc attribute'],
  // Component tags are injected by the page, and only a known set exists. A new
  // one means the model invented markup.
  [/<(?!\/)(?!Figure|Video|Vimeo|YouTube|Bookmark|Tweet|Sidenote|MarginNote|Epigraph|RawEmbed|MissingImage|br|hr|figure|figcaption|em|strong|code|pre|kbd|sup|sub|abbr|del|ins|mark|span|a|img|p|ul|ol|li|blockquote|table|thead|tbody|tr|th|td|h[1-6]|details|summary|div)[A-Za-z][A-Za-z0-9]*\b/, 'unknown element or component'],
]

/** Every non-index .md/.mdx file one level under content/blog is a translation. */
function walk(dir: string): string[] {
  const found: string[] = []
  for (const postDir of readdirSync(dir, { withFileTypes: true })) {
    if (!postDir.isDirectory()) continue
    const full = join(dir, postDir.name)
    for (const entry of readdirSync(full, { withFileTypes: true })) {
      if (entry.isDirectory()) continue
      if (!/\.mdx?$/.test(entry.name)) continue
      if (/^index\.mdx?$/.test(entry.name)) continue
      found.push(join(full, entry.name))
    }
  }
  return found
}

/**
 * What is left after removing everything that cannot execute: fenced and inline
 * code, an escaped `\<` (which markdown renders as text, so `\<T>` and
 * `\<leader>` are prose), a markdown link destination in angle brackets, and the
 * attribute values of the components the page injects. That last one matters
 * because RawEmbed carries a whole iframe inside its `html` attribute, which is
 * the component's entire purpose and is checked by RawEmbed itself.
 */
function withoutCode(source: string): string {
  return source
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '')
    // Maths is raw to MDX: remark-math's tokenizer claims the whole span, so
    // \frac{a}{b} inside $...$ is LaTeX, never an expression to execute.
    .replace(/\$\$[\s\S]*?\$\$/g, '')
    .replace(/\$[^$\n]+\$/g, '')
    .replace(/\\[<{}]/g, '')
    .replace(/\]\(<[^>]*>\)/g, ']()')
    .replace(/<(?:RawEmbed|Video|MissingImage|Tweet|Bookmark)\b[\s\S]*?\/>/g, '')
}

function frontmatterOf(source: string): string {
  const match = /^---\n([\s\S]*?)\n---/.exec(source)
  return match === null ? '' : match[1]
}

heading('check-translations: scanning machine-written translations for unsafe markup')

try {
  statSync(DIR)
} catch {
  console.log(`${DIR} does not exist, nothing to check.`)
  process.exit(0)
}

const problems: { file: string; message: string }[] = []

for (const file of walk(DIR)) {
  const raw = readFileSync(file, 'utf8')
  const frontmatter = frontmatterOf(raw)

  // The folder is the pairing now: a translation must say which language it
  // is, and must not carry the old cross-collection key.
  if (!/^lang:\s*\S/m.test(frontmatter)) problems.push({ file, message: 'translation is missing the lang frontmatter key' })
  if (/^translationOf:\s*\S/m.test(frontmatter)) problems.push({ file, message: 'translationOf is gone from the schema, remove it' })

  const prose = withoutCode(raw)
  for (const [pattern, label] of BANNED) {
    const match = pattern.exec(prose)
    if (match !== null) problems.push({ file, message: `${label} (${match[0].trim().slice(0, 40)})` })
  }
}

if (problems.length === 0) {
  ok('translations look clean')
  process.exit(0)
}

fail(`${count(problems.length, 'problem', 'problems')} in translated content`)
for (const problem of problems) console.error(`  ${bold(problem.file)}${dim(':')} ${problem.message}`)
for (const problem of problems) annotate('error', { file: problem.file, message: problem.message })
console.error(`\n${dim('Refusing to commit. Model output is untrusted.')}`)
process.exit(1)
