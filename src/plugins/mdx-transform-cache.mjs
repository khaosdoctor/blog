// Wraps the vite plugin @astrojs/mdx registers under the name "@mdx-js/rolldown"
// (see node_modules/@astrojs/mdx/dist/vite-plugin-mdx.js) and short-circuits its
// transform on a content hash. The transform is deterministic and costs around
// 90ms per post with nothing remembering the result between builds, so a cache
// entry under .astro-cache/mdx, carried between CI runs by astro.config.mjs's cacheDir
// and .github/workflows/build.yml's actions/cache step, turns a cold rebuild into
// a lookup.
//
// The wrap is a monkeypatch rather than a plugin appended alongside the real one.
// Vite resolves the plugin list once before any transform runs, so configResolved
// here can find the "@mdx-js/rolldown" object in resolved.plugins and replace its
// transform.handler in place, whatever position either plugin holds in that list.
// scripts/check-mdx-cache.ts asserts that name and shape still hold.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, extname, join, resolve as resolvePath } from 'node:path'
import { frontmatterOf } from '../lib/post-file.ts'
import { PATTERN as WIKILINK_PATTERN } from './remark-wikilinks.mjs'

const TARGET_PLUGIN_NAME = '@mdx-js/rolldown'
const CACHE_SUBDIR = '.astro-cache/mdx'
const CONTENT_BASE = 'content/blog'
const RELATIVE_IMPORT_EXTENSIONS = ['.ts', '.mts', '.mjs', '.js', '.tsx', '.jsx']
const IMPORT_SPECIFIER =
  /(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\bfrom\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g
const LAB_TAG = /<(?:LabDemo|HtmlLab)\b([^>]*)>/g
const LAB_SRC = /\bsrc=["']([^"']+)["']/
const MAX_NAMED_MISSES = 5

function readTextOrNull(path) {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return null
  }
}

/** Every relative import a plugin file names, resolved to a file on disk. Bare
 * specifiers (npm packages) are skipped: those are covered by hashing
 * package-lock.json instead. */
function relativeImportsOf(file, text) {
  const dir = dirname(file)
  const found = []
  for (const match of text.matchAll(IMPORT_SPECIFIER)) {
    const specifier = match[1] ?? match[2]
    if (!specifier.startsWith('.')) continue
    const base = resolvePath(dir, specifier)
    const candidates = extname(base) !== '' ? [base] : RELATIVE_IMPORT_EXTENSIONS.map((ext) => base + ext)
    const resolved = candidates.find(existsSync)
    if (resolved !== undefined) found.push(resolved)
  }
  return found
}

/** Every file under src/plugins/**, plus every file they import, transitively.
 * Coarse on purpose: an edit to any plugin or anything it reads busts every
 * cache entry, rather than hand-listing which post depends on which plugin. */
function pluginsClosure(pluginsDir) {
  const visited = new Map()
  const queue = walkFiles(pluginsDir)
  while (queue.length > 0) {
    const file = queue.pop()
    if (visited.has(file)) continue
    const text = readTextOrNull(file)
    if (text === null) continue
    visited.set(file, text)
    for (const imported of relativeImportsOf(file, text)) {
      if (!visited.has(imported)) queue.push(imported)
    }
  }
  return visited
}

function walkFiles(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
}

/** Hashes everything that can change any file's transform output: the plugin
 * pipeline itself, the config that wires it together, and the two sidecar
 * files two of those plugins read regardless of which post is being built. */
function computeGlobalSalt(root) {
  const hash = createHash('sha256')
  const closure = pluginsClosure(join(root, 'src/plugins'))
  for (const file of [...closure.keys()].sort()) {
    hash.update(file)
    hash.update(closure.get(file))
  }
  for (const file of ['astro.config.mjs', 'package-lock.json', 'content/bookmarks.json', 'content/dead-images.json']) {
    hash.update(file)
    hash.update(readTextOrNull(join(root, file)) ?? '')
  }
  return hash.digest('hex')
}

/** The frontmatter of every post file (every locale) a slug resolves to, since
 * remark-wikilinks picks whichever locale is available and a retitled or newly
 * translated post changes what a wikilink to it renders. */
function wikilinkTargetsSalt(root, code) {
  const slugs = new Set()
  for (const match of code.matchAll(WIKILINK_PATTERN)) slugs.add(match[1].trim())

  const parts = []
  for (const slug of [...slugs].sort()) {
    const dir = join(root, CONTENT_BASE, slug)
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries
      .filter((e) => e.isFile() && /\.mdx?$/.test(e.name))
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const raw = readTextOrNull(join(dir, entry.name))
      if (raw !== null) parts.push(`${slug}/${entry.name}:${frontmatterOf(raw)}`)
    }
  }
  return parts.join('\0')
}

/** The bytes of every lab demo file a post's own <LabDemo>/<HtmlLab> tags name,
 * since remark-lab-demos inlines that file's source into the compiled output. */
function labDemoSalt(postDir, code) {
  const parts = []
  for (const tagMatch of code.matchAll(LAB_TAG)) {
    const src = LAB_SRC.exec(tagMatch[1])?.[1]
    if (src === undefined) continue
    const raw = readTextOrNull(resolvePath(postDir, src))
    if (raw !== null) parts.push(`${src}:${raw}`)
  }
  return parts.join('\0')
}

function keyFor(root, salt, id, code) {
  const hash = createHash('sha256')
  hash.update(salt)
  hash.update(id)
  hash.update(code)
  hash.update(wikilinkTargetsSalt(root, code))
  hash.update(labDemoSalt(dirname(id), code))
  return hash.digest('hex')
}

function slugOf(id) {
  const match = /content\/blog\/([^/]+)\//.exec(id)
  return match?.[1] ?? id.split('/').pop()
}

function formatDuration(ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1).replace(/\.0$/, '')}s`
}

function reasonFor(missNames, cold, saltChanged) {
  if (cold) return 'cold cache'
  if (saltChanged) return 'plugin or config changed'
  if (missNames.length <= MAX_NAMED_MISSES) return `${missNames.join(', ')} changed`
  return `${missNames.length} files changed`
}

function report({ hits, missNames, cold, saltChanged, savedMs }) {
  const misses = missNames.length
  const detail = misses === 0 ? '' : ` (${reasonFor(missNames, cold, saltChanged)})`
  console.log(
    `mdx-cache: ${hits} hits, ${misses} ${misses === 1 ? 'miss' : 'misses'}${detail}, saved ~${formatDuration(savedMs)}`,
  )
}

export function mdxTransformCache() {
  if (process.env.MDX_CACHE === '0') {
    let reported = false
    return {
      name: 'mdx-transform-cache',
      buildEnd() {
        if (reported) return
        reported = true
        console.log('mdx-cache: disabled (MDX_CACHE=0)')
      },
    }
  }

  let root = process.cwd()
  let cacheDir = join(root, CACHE_SUBDIR)
  let statsFile = join(cacheDir, '.stats.json')
  let patched = false
  let salt = ''
  let saltChanged = false
  let cold = false
  let previousColdPhaseMs = null

  let hits = 0
  const missNames = []
  const pendingWrites = []
  // Wall-clock span from the first transform call to the last, across however
  // many vite passes carry a patched plugin. Transforms run concurrently enough
  // that a per-file duration includes whatever interleaved into its own await
  // gaps, so the saving is measured as a whole-phase span against a stored span
  // from a run where every file missed.
  let phaseStart = null
  let phaseEnd = null

  function entryPath(key) {
    return join(cacheDir, `${key}.json`)
  }

  async function readEntry(key) {
    try {
      const raw = await readFile(entryPath(key), 'utf8')
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  async function writeEntry(key, result) {
    mkdirSync(cacheDir, { recursive: true })
    const path = entryPath(key)
    const tmp = `${path}.${process.pid}.tmp`
    await writeFile(tmp, JSON.stringify({ code: result.code, map: result.map ?? null, meta: result.meta ?? null }))
    await rename(tmp, path)
  }

  let warnedMissing = false
  let exitReportRegistered = false

  function finalReport() {
    // Anything that resolves the vite config touches this plugin, `astro
    // check` among them, but not every such pass ever calls the wrapped
    // transform (no .mdx file was in play). Nothing to report there.
    if (hits === 0 && missNames.length === 0) return

    const thisPhaseMs = phaseStart === null ? 0 : phaseEnd - phaseStart
    const fullyCold = cold || saltChanged
    const baseline = fullyCold ? thisPhaseMs : previousColdPhaseMs
    const savedMs = baseline === null ? 0 : Math.max(0, baseline - thisPhaseMs)
    report({ hits, missNames, cold, saltChanged, savedMs })
  }

  return {
    name: 'mdx-transform-cache',
    enforce: 'pre',
    // Astro resolves more than one vite config per `astro build` (a content-sync
    // pass ahead of the actual page build among them), each handing @astrojs/mdx
    // a freshly constructed "@mdx-js/rolldown" plugin object to register. Every
    // pass that carries one gets patched; only the pass(es) that actually
    // transform .mdx files add to the hit/miss counts. The report line has to
    // wait for process exit, since whichever pass does the real work is not
    // necessarily the last one to reach buildEnd.
    configResolved(resolved) {
      if (!exitReportRegistered) {
        exitReportRegistered = true
        process.once('exit', finalReport)
      }

      root = resolved.root ?? root
      cacheDir = join(root, CACHE_SUBDIR)
      statsFile = join(cacheDir, '.stats.json')

      const target = resolved.plugins.find((plugin) => plugin.name === TARGET_PLUGIN_NAME)
      if (
        target === undefined ||
        typeof target.transform !== 'object' ||
        typeof target.transform.handler !== 'function'
      ) {
        if (!warnedMissing) {
          warnedMissing = true
          console.warn(
            `\nmdx-cache: WARNING, no vite plugin named "${TARGET_PLUGIN_NAME}" with a transform.handler was found. ` +
              'The MDX transform cache cannot wrap anything and every build will recompile every file. ' +
              'Run `node scripts/check-mdx-cache.ts` to confirm.\n',
          )
        }
        return
      }
      if (target.transform.handler.mdxCacheWrapped === true) return

      if (!patched) {
        cold = !existsSync(cacheDir)
        const previousStats = JSON.parse(readTextOrNull(statsFile) ?? 'null')
        salt = computeGlobalSalt(root)
        saltChanged = !cold && previousStats?.salt !== salt
        previousColdPhaseMs = previousStats?.coldPhaseMs ?? null
      }
      patched = true

      const original = target.transform.handler
      const wrapped = async function (code, id) {
        const now = performance.now()
        if (phaseStart === null) phaseStart = now

        const key = keyFor(root, salt, id, code)
        const cached = await readEntry(key)
        if (cached !== null) {
          hits += 1
          phaseEnd = performance.now()
          return cached
        }

        const result = await original.call(this, code, id)
        missNames.push(slugOf(id))
        pendingWrites.push(
          writeEntry(key, result).catch((error) => {
            console.warn(`mdx-cache: failed to write a cache entry for ${id}: ${error.message}`)
          }),
        )
        phaseEnd = performance.now()
        return result
      }
      wrapped.mdxCacheWrapped = true
      target.transform.handler = wrapped
    },
    async buildEnd() {
      // Nothing to persist from a pass that never called the wrapped
      // transform (e.g. `astro check`'s own vite instance): writing a stats
      // file here would create the cache directory with no real entries in
      // it, which a later process would then read as "the cache exists" and
      // skip recomputing its cold-build baseline from.
      if (!patched || (hits === 0 && missNames.length === 0)) return
      await Promise.allSettled(pendingWrites)

      const thisPhaseMs = phaseStart === null ? 0 : phaseEnd - phaseStart
      const fullyCold = cold || saltChanged
      const coldPhaseMs = fullyCold ? thisPhaseMs : (previousColdPhaseMs ?? thisPhaseMs)

      mkdirSync(cacheDir, { recursive: true })
      await writeFile(statsFile, JSON.stringify({ salt, coldPhaseMs })).catch(() => {})
    },
  }
}
