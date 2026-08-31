import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Shared terminal output for the build scripts. Plain ANSI, no dependency: this
 * is a formatting helper, not a logging framework.
 */

// CI logs render ANSI fine even though they are not a TTY, so CI earns colour on
// its own. NO_COLOR always wins, and a plain pipe (e.g. `npm run build | tee`)
// stays clean because neither isTTY nor CI is true there.
export const COLOR = !process.env.NO_COLOR && (process.stdout.isTTY === true || Boolean(process.env.CI))

export function paint(code: string, text: string): string {
  return COLOR ? `\x1b[${code}m${text}\x1b[0m` : text
}

export function heading(text: string): void {
  console.log(paint('1;36', text))
}

export function ok(text: string): void {
  console.log(paint('32', `+ ${text}`))
}

export function warn(text: string): void {
  console.log(paint('33', `! ${text}`))
}

export function fail(text: string): void {
  console.error(paint('31', `x ${text}`))
}

export function dim(text: string): string {
  return paint('2', text)
}

export function bold(text: string): string {
  return paint('1', text)
}

export function count(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`
}

/** Truncated in the middle: for a URL the tail (path, filename) is what identifies it. */
function truncateMiddle(text: string, width = 90): string {
  if (text.length <= width) return text
  const half = Math.floor((width - 3) / 2)
  return `${text.slice(0, half)}...${text.slice(text.length - half)}`
}

export function list(items: string[], options: { indent?: number; max?: number } = {}): void {
  const indent = options.indent ?? 2
  const max = options.max ?? 10
  const pad = ' '.repeat(indent)
  for (const item of items.slice(0, max)) console.log(`${pad}${truncateMiddle(item)}`)
  if (items.length > max) console.log(`${pad}${dim(`... and ${items.length - max} more`)}`)
}

/**
 * A GitHub Actions annotation, so a CI failure shows up on the file in the PR
 * diff instead of only in the log. Silent outside GITHUB_ACTIONS.
 */
export function annotate(level: 'error' | 'warning', target: { file: string; line?: number; message: string }): void {
  if (!process.env.GITHUB_ACTIONS) return
  const location = target.line === undefined ? `file=${target.file}` : `file=${target.file},line=${target.line}`
  console.log(`::${level} ${location}::${target.message}`)
}

/** Every file under `dir`, recursively. Node has done this natively since 20.1. */
export function walkFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
}

/** One post is one folder, so its source is the index file inside it. */
export function postIndex(dir: string): string | undefined {
  return ['index.mdx', 'index.md'].map((name) => join(dir, name)).find(existsSync)
}

/**
 * Every .md/.mdx file one level under `root`: a post folder's own index plus the
 * translations beside it. `index: false` keeps only the translations.
 */
export function postFiles(root: string, options: { index?: boolean } = {}): string[] {
  const keepIndex = options.index ?? true
  const found: string[] = []
  if (!existsSync(root)) return found
  for (const folder of readdirSync(root, { withFileTypes: true })) {
    if (!folder.isDirectory()) continue
    const dir = join(root, folder.name)
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() || !/\.mdx?$/.test(entry.name)) continue
      if (!keepIndex && /^index\.mdx?$/.test(entry.name)) continue
      found.push(join(dir, entry.name))
    }
  }
  return found
}

export function frontmatterOf(raw: string): string {
  return /^---\n([\s\S]*?)\n---/.exec(raw)?.[1] ?? ''
}

/** One scalar frontmatter line. Quotes come off only when both ends carry one. */
export function field(frontmatter: string, key: string): string | null {
  const match = new RegExp(`^${key}:\\s*(.*)$`, 'm').exec(frontmatter)
  if (match === null) return null
  return match[1].trim().replace(/^["'](.*)["']$/, '$1')
}

export type Failure = { check: string; detail: string; file: string }

/** Prints the failures grouped by check, annotates each one, and exits. */
export function reportFailures(failures: Failure[], clean: string): never {
  if (failures.length === 0) {
    ok(clean)
    process.exit(0)
  }

  fail(`${count(failures.length, 'failure', 'failures')} found`)

  const grouped = new Map<string, Failure[]>()
  for (const failure of failures) {
    const current = grouped.get(failure.check) ?? []
    current.push(failure)
    grouped.set(failure.check, current)
  }
  for (const [check, group] of grouped) {
    console.error(`\n${bold(check)} ${dim(`(${group.length})`)}:`)
    for (const failure of group.slice(0, 10)) console.error(`  ${failure.detail}`)
    if (group.length > 10) console.error(`  ${dim(`...and ${group.length - 10} more`)}`)
  }
  for (const failure of failures)
    annotate('error', { file: failure.file, message: `${failure.check}: ${failure.detail}` })
  process.exit(1)
}
