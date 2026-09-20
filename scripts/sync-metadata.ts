/**
 * Copies category and tags from every source post into the translations beside
 * it, then drops tags nothing uses any more from src/i18n/tags.ts.
 *
 *   node scripts/sync-metadata.ts
 *
 * translate.ts copies both fields when it writes a translation, so editing them
 * on the source afterwards leaves the English copy behind and the English
 * section and tag pages drift. Re-translating for that would spend a model call
 * on prose that did not move, so this copies the two lines instead. It ignores
 * machineOwnedTranslation on purpose: neither field is prose, so a translation a
 * person owns has nothing to lose.
 *
 * The cache hashes only what gets translated, so a metadata edit never
 * invalidates it. An entry that still mismatches is checked against git: when
 * the revision it points at translates to the same text as the working copy,
 * only metadata moved and the entry is bumped. Otherwise translate.ts still owes
 * that post a run.
 *
 * KNOWN_TAGS and TAG_LABELS only shrink here. A new tag needs a decision about
 * its Portuguese label, which is check-tags.ts's job to demand.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import {
  count,
  field,
  frontmatterLine,
  frontmatterOf,
  hash,
  heading,
  list,
  ok,
  postFiles,
  postIndex,
  tagsOf,
  translatableOf,
  warn,
} from './lib/cli.ts'

const DIR = 'content/blog'
const CACHE_FILE = join(DIR, '.translation-cache.json')
const TAGS_FILE = 'src/i18n/tags.ts'
const FIELDS = ['category', 'tags']

type Cache = Record<string, { sourceHash: string; translatedAt: string }>

function git(...args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
}

/**
 * Whether the text the cache remembers translating is the text the working copy
 * would translate now. The working copy is tried first: an entry written before
 * the hash covered only translatable text matches the raw file and nothing in git.
 */
function sameTranslatable(file: string, source: string, cachedHash: string): boolean {
  if (hash(source) === cachedHash) return true
  const revisions = git('log', '--format=%H', '--', file).trim().split('\n').filter(Boolean)
  for (const revision of revisions) {
    const then = git('show', `${revision}:${file}`)
    if (hash(then) !== cachedHash && hash(translatableOf(then)) !== cachedHash) continue
    return translatableOf(then) === translatableOf(source)
  }
  return false
}

/** Removes list entries and label lines for tags no post uses. Returns what went. */
function pruneKnownTags(used: Set<string>): string[] {
  const lines = readFileSync(TAGS_FILE, 'utf8').split('\n')
  const pruned: string[] = []
  const kept = lines.filter((line) => {
    const entry = /^ {2}'([^']+)',$/.exec(line) ?? /^ {2}(?:'([^']+)'|([\w-]+)): \{.*\},$/.exec(line)
    if (entry === null) return true
    const tag = entry[1] ?? entry[2]
    if (used.has(tag)) return true
    pruned.push(tag)
    return false
  })
  if (pruned.length > 0) writeFileSync(TAGS_FILE, kept.join('\n'))
  return [...new Set(pruned)].sort()
}

heading('sync-metadata: copying category and tags into translations')

const cache = JSON.parse(readFileSync(CACHE_FILE, 'utf8')) as Cache
const used = new Set<string>()
let synced = 0
let bumped = 0
const stale: string[] = []

for (const file of postFiles(DIR)) {
  const dir = dirname(file)
  const sourceFile = postIndex(dir)
  if (sourceFile === undefined) continue

  const source = readFileSync(sourceFile, 'utf8')
  const sourceFrontmatter = frontmatterOf(source)
  for (const tag of tagsOf(sourceFrontmatter)) used.add(tag)
  if (file === sourceFile) continue

  const raw = readFileSync(file, 'utf8')
  let out = raw
  for (const key of FIELDS) {
    const wanted = frontmatterLine(sourceFrontmatter, key)
    const current = frontmatterLine(frontmatterOf(out), key)
    if (wanted === null || current === null || wanted === current) continue
    out = out.replace(current, wanted)
  }
  if (out !== raw) {
    writeFileSync(file, out)
    synced += 1
  }

  // translate.ts never touches a translation a person owns, so its cache entry
  // is never read either.
  if (field(frontmatterOf(out), 'machineOwnedTranslation') !== 'true') continue

  const slug = basename(dir)
  const entry = cache[slug]
  if (entry === undefined) continue
  const sourceHash = hash(translatableOf(source))
  if (entry.sourceHash === sourceHash) continue
  if (!sameTranslatable(sourceFile, source, entry.sourceHash)) {
    stale.push(slug)
    continue
  }
  entry.sourceHash = sourceHash
  bumped += 1
}

writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2))
const pruned = pruneKnownTags(used)

if (synced === 0 && bumped === 0 && pruned.length === 0) {
  ok('translations and known tags already match the posts')
} else {
  ok(
    `synced ${count(synced, 'translation', 'translations')}, cache bumped for ${count(bumped, 'post', 'posts')}, pruned ${count(pruned.length, 'unused tag', 'unused tags')}`,
  )
  if (pruned.length > 0) list(pruned, { max: 30 })
}
if (stale.length > 0) {
  warn(`${count(stale.length, 'post', 'posts')} changed beyond metadata, translate.ts will still re-run them:`)
  list(stale, { max: 30 })
}
