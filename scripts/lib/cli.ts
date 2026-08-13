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
 * A GitHub Actions annotation, so a CI failure lands on the file in the PR diff
 * instead of only in the log. Silent outside GITHUB_ACTIONS.
 */
export function annotate(level: 'error' | 'warning', target: { file: string; line?: number; message: string }): void {
  if (!process.env.GITHUB_ACTIONS) return
  const location = target.line === undefined ? `file=${target.file}` : `file=${target.file},line=${target.line}`
  console.log(`::${level} ${location}::${target.message}`)
}
