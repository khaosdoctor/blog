/**
 * The OSS credits guard. src/lib/credits.ts generates its `dependencies` list
 * straight from package.json's runtime `dependencies`, reading each installed
 * package's own package.json under node_modules, so the flat list on /oss/
 * and /en/oss/ cannot drift from what is actually installed by construction.
 *
 *   node scripts/check-credits.ts
 *
 * This script exists for the ways that generator can still be wrong: a
 * dependency that somehow produced no credit, a credit that no longer
 * corresponds to an installed dependency, and a dependency whose own
 * package.json has neither `homepage` nor a usable `repository.url`, which is
 * a decision for a person rather than a fabricated link.
 *
 * `fonts` and `icons` in credits.ts are hand-maintained on purpose (neither is
 * an npm package) and this script never touches them: it only ever reads
 * `dependencies` and package.json's own dependency list.
 *
 * It reads source, never build output, so it runs in `npm run check` before a
 * build exists.
 */
import { readFileSync } from 'node:fs'
import { dependencies } from '../src/lib/credits.ts'
import { annotate, count, fail, heading, ok } from './lib/cli.ts'

heading('check-credits: verifying the oss page matches package.json')

// Read package.json directly, rather than importing credits.ts's own idea of
// which dependencies exist: that would just be checking the generator against
// itself. This is the independent half of the comparison.
const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { dependencies?: Record<string, string> }
const declared = new Set(Object.keys(pkg.dependencies ?? {}))
const credited = new Map(dependencies.map((credit) => [credit.name, credit.url]))

const failures: string[] = []

for (const name of declared) {
  if (!credited.has(name)) {
    failures.push(`${name} is a dependency in package.json but has no credit on /oss/`)
  }
}

for (const name of credited.keys()) {
  if (!declared.has(name)) {
    failures.push(`${name} is credited on /oss/ but is no longer a dependency in package.json`)
  }
}

for (const [name, url] of credited) {
  if (declared.has(name) && url === '') {
    failures.push(
      `${name} has neither a homepage nor a usable repository.url in its own package.json: needs a decision, not a guess`,
    )
  }
}

if (failures.length === 0) {
  ok(`${count(declared.size, 'dependency', 'dependencies')} all credited, all installed`)
  process.exit(0)
}

fail(`${count(failures.length, 'failure', 'failures')} found`)
for (const failure of failures) {
  console.error(`  ${failure}`)
  annotate('error', { file: 'src/lib/credits.ts', message: failure })
}
process.exit(1)
