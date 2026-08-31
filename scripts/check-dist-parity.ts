/**
 * Confirms a cache-enabled build and a from-scratch build produce the same
 * site. Used only by .github/workflows/verify.yml, which builds dist/ twice,
 * once with MDX_CACHE=0 and once with the cache warm, and diffs the two
 * trees: a real divergence means a cache hit returned something the real
 * transform would not have, the one failure the MDX transform cache must
 * never produce quietly.
 *
 *   node scripts/check-dist-parity.ts <dir-a> <dir-b>
 *
 * Some differences are expected and are not failures:
 *
 * - scheduled.json embeds the build timestamp by design and always differs.
 * - pagefind/pagefind-entry.json's language table can come out in a different
 *   key order between two independent `pagefind --site dist` runs, depending
 *   on which language pagefind's own directory walk reaches first; the
 *   per-language hashes inside are unaffected. Both sides are parsed and
 *   compared with object keys sorted, so the file is still really checked.
 *
 * Anything else that differs is a real divergence and fails.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fail, heading, list, ok } from './lib/cli.ts'

const [dirA, dirB] = process.argv.slice(2)
if (dirA === undefined || dirB === undefined) {
  fail('usage: node scripts/check-dist-parity.ts <dir-a> <dir-b>')
  process.exit(1)
}

heading(`check-dist-parity: comparing ${dirA} and ${dirB}`)

function walk(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...walk(full))
    else found.push(full)
  }
  return found
}

function sortedJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortedJson)
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(record).sort()) sorted[key] = sortedJson(record[key])
    return sorted
  }
  return value
}

function sameJsonIgnoringKeyOrder(a: Buffer, b: Buffer): boolean {
  try {
    return (
      JSON.stringify(sortedJson(JSON.parse(a.toString('utf8')))) ===
      JSON.stringify(sortedJson(JSON.parse(b.toString('utf8'))))
    )
  } catch {
    return false
  }
}

function acceptableDifference(relPath: string, a: Buffer, b: Buffer): boolean {
  if (relPath === 'scheduled.json') return true
  if (relPath === 'pagefind/pagefind-entry.json') return sameJsonIgnoringKeyOrder(a, b)
  return false
}

const filesA = new Set(walk(dirA).map((f) => relative(dirA, f)))
const filesB = new Set(walk(dirB).map((f) => relative(dirB, f)))

const onlyInA = [...filesA].filter((f) => !filesB.has(f)).sort()
const onlyInB = [...filesB].filter((f) => !filesA.has(f)).sort()

const diverged: string[] = []
for (const rel of [...filesA].filter((f) => filesB.has(f)).sort()) {
  const bytesA = readFileSync(join(dirA, rel))
  const bytesB = readFileSync(join(dirB, rel))
  if (bytesA.equals(bytesB)) continue
  if (acceptableDifference(rel, bytesA, bytesB)) continue
  diverged.push(rel)
}

const failures = [
  ...onlyInA.map((f) => `${f}: present in ${dirA}, missing in ${dirB}`),
  ...onlyInB.map((f) => `${f}: present in ${dirB}, missing in ${dirA}`),
  ...diverged.map((f) => `${f}: content differs between ${dirA} and ${dirB}`),
]

if (failures.length === 0) {
  ok(`${filesA.size} files, byte-identical (scheduled.json and pagefind's key order excepted)`)
  process.exit(0)
}

fail(`${failures.length} real divergence(s) between the cache-on and cache-off build`)
list(failures, { max: failures.length })
process.exit(1)
