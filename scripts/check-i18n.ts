/**
 * The localisation guard. Two languages ship from one codebase, and the ways
 * that goes wrong are quiet: a string that only exists in one table, a page
 * that asks for a language other than its own, a route that only one language
 * has, a post pair that resolves to one URL.
 *
 *   node scripts/check-i18n.ts
 *
 * Every language it knows about comes from LOCALES in src/i18n/ui.ts. This file
 * declares no language list of its own, so adding a third one is that array,
 * its table, and the entries this script then asks for by name.
 *
 * It reads source, never build output: it runs in `npm run check`, before a
 * build exists. Link targets and rendered markup are check-output.ts's half of
 * the job.
 *
 * Exits non-zero on anything that is unambiguously wrong. Anything arguable is
 * a warning instead.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { HREFLANG, LOCALES, SOURCE_LOCALE, ui, type Locale } from '../src/i18n/ui.ts'
import { count, field, frontmatterOf, heading, reportFailures, warn, walkFiles, type Failure } from './lib/cli.ts'

const PAGES = 'src/pages'
const CONTENT = 'content/blog'
const UI_FILE = 'src/i18n/ui.ts'

const failures: Failure[] = []
const warnings: string[] = []

function report(check: string, detail: string, file: string): void {
  failures.push({ check, detail, file })
}

/**
 * Strings that are the same in every language on purpose: the site's own name,
 * and words Portuguese borrowed whole. Anything else appearing identically in
 * two tables is a key somebody copied and never filled in.
 */
const LANGUAGE_NEUTRAL_KEYS = new Set([
  'appName',
  'appShortName',
  'tag',
  'tags',
  'navPosts',
  'navTags',
  'accentAuto',
  'copyright',
  'codeThemeNormal',
])

/**
 * Literal attribute text that is not prose: a brand, or a word spelled the same
 * everywhere. Every other literal in a user-visible attribute has to come from
 * t(), because the page it renders on can be in either language.
 */
const LANGUAGE_NEUTRAL_TEXT = new Set(['Lucas Santos', 'Spotify', 'Slides'])

/**
 * How each route relates to the languages.
 *
 * - `per-locale`: every language needs its own copy, at src/pages/<locale>/…
 * - `shared`: one copy answers for the whole site and says so in both
 *   languages, or carries no prose at all.
 * - `source-only`: exists in the source language alone, deliberately.
 *
 * A route missing from this table fails the check. That is the point: adding a
 * page is when somebody decides what it means for the other languages, and this
 * is where the decision gets recorded.
 */
const ROUTES: Record<string, 'per-locale' | 'shared' | 'source-only'> = {
  '404.astro': 'shared',
  '[category]/[...page].astro': 'per-locale',
  '[...slug].astro': 'per-locale',
  '[...slug]/index.md.ts': 'per-locale',
  '[...page].astro': 'per-locale',
  'lab-source/[...id].html.ts': 'shared',
  'link-metadata.json.ts': 'shared',
  'llms.txt.ts': 'source-only',
  'manifest.webmanifest.ts': 'per-locale',
  'offline.astro': 'shared',
  'oss.astro': 'per-locale',
  'robots.txt.ts': 'shared',
  'rss.xml.ts': 'per-locale',
  'scheduled.json.ts': 'shared',
  'search.astro': 'per-locale',
  'series/[name].astro': 'per-locale',
  'series/index.astro': 'per-locale',
  'tags/[tag]/[...page].astro': 'per-locale',
  'tags/index.astro': 'per-locale',
}

/** Pages that carry every language at once, so a t() call for another one is correct there. */
const BILINGUAL_PAGES = new Set(['404.astro', 'offline.astro'])

/**
 * Tables outside src/i18n/ui.ts that hold the same copy: the plugin layer
 * keeps its own copy rather than importing from that module. Each one has to
 * cover every language and match the key it mirrors, which is the part a
 * person forgets.
 */
const MIRRORED_TABLES = [
  { file: 'src/plugins/remark-wikilinks.mjs', constant: 'NOT_WRITTEN_YET', key: 'notWrittenYet' },
  { file: 'src/plugins/rehype-footnote-sidenotes.mjs', constant: 'FOOTNOTES_LABEL', key: 'footnotes' },
  // No `key`: these two say something the ui tables never needed a word for,
  // so only their language coverage can be checked.
  { file: 'src/plugins/rehype-footnote-sidenotes.mjs', constant: 'BACKREF_LABEL', key: undefined },
  { file: 'src/plugins/rehype-heading-anchors.mjs', constant: 'ANCHOR_LABEL', key: undefined },
] as const

/**
 * Files holding a case per language, which therefore have to name every one of
 * them. A language missing from any of these falls back to the source language
 * without saying so.
 *
 * The list is short on purpose. Anything that reads a locale-keyed table by
 * index rather than branching on the locale belongs nowhere near it: naming
 * such a file here fails code that is already right.
 */
const LOCALE_AWARE_FILES = [
  'src/i18n/ui.ts',
  'src/lib/seo.ts',
  'src/plugins/rehype-footnote-sidenotes.mjs',
  'src/components/LangSwitcher.astro',
]

heading('check-i18n: verifying the two language trees agree')

const OTHER_LOCALES = LOCALES.filter((locale) => locale !== SOURCE_LOCALE)

// 1. Every table holds every key, filled in, in its own language.
const sourceTable = ui[SOURCE_LOCALE]
const keys = Object.keys(sourceTable) as (keyof typeof sourceTable)[]

for (const locale of LOCALES) {
  const table = ui[locale]
  if (table === undefined) {
    report('missing ui table', locale, UI_FILE)
    continue
  }
  for (const key of keys) {
    const value = table[key]
    if (typeof value !== 'string' || value.trim() === '') {
      report('empty ui string', `${locale}.${key}`, UI_FILE)
      continue
    }
    if (locale === SOURCE_LOCALE) continue
    if (value === sourceTable[key] && !LANGUAGE_NEUTRAL_KEYS.has(key)) {
      report(
        'untranslated ui string',
        `${locale}.${key} is still the ${SOURCE_LOCALE} text. Translate it, or add the key to LANGUAGE_NEUTRAL_KEYS if it reads the same in every language`,
        UI_FILE,
      )
    }
  }
  for (const key of Object.keys(table)) {
    if (!keys.includes(key as keyof typeof sourceTable)) {
      report('ui key not in the source table', `${locale}.${key}`, UI_FILE)
    }
  }
}

// 2. The placeholders t() fills have to line up, or an argument ends up in the
// wrong slot or is dropped without a trace.
const placeholders = (value: string) => (value.match(/%[ds]/g) ?? []).join('')
for (const key of keys) {
  const expected = placeholders(sourceTable[key])
  for (const locale of OTHER_LOCALES) {
    const actual = placeholders(ui[locale]?.[key] ?? '')
    if (actual !== expected) {
      report(
        'placeholder mismatch',
        `${key}: ${SOURCE_LOCALE} has "${expected || 'none'}", ${locale} has "${actual || 'none'}"`,
        UI_FILE,
      )
    }
  }
}

// 3. Every language is announceable to a crawler.
const announced = new Set<string>()
for (const locale of LOCALES) {
  const value = HREFLANG[locale]
  if (typeof value !== 'string' || value.trim() === '') {
    report('missing hreflang', `HREFLANG has no entry for ${locale}`, UI_FILE)
    continue
  }
  if (announced.has(value)) report('duplicate hreflang', `${value} is claimed by more than one locale`, UI_FILE)
  announced.add(value)
}

// 4. The locale set and the source language are declared once, in a leaf module
// every builder can reach. Nothing else may state them.
const LEAF = 'src/i18n/locales.ts'
// A pair of bare locale codes side by side is the shape of a table or a union
// written out by hand. The i18n modules are where those belong.
const RESTATED = new RegExp(`(['"])(?:${LOCALES.join('|')})\\1\\s*[,|]\\s*(['"])(?:${LOCALES.join('|')})\\2`)
for (const dir of ['src/lib', 'src/scripts', 'src/plugins', 'src/components', 'src/layouts', 'scripts']) {
  for (const file of walkFiles(dir)) {
    if (!/\.(ts|mjs|astro)$/.test(file)) continue
    if (!RESTATED.test(readFileSync(file, 'utf8'))) continue
    warnings.push(`${file} lists the locales itself. Import LOCALES from ${LEAF}`)
  }
}

// 5. The copy duplicated into the build-time plugins still matches its key.
for (const { file, constant, key } of MIRRORED_TABLES) {
  const source = readFileSync(file, 'utf8')
  const table = new RegExp(`${constant}\\s*=\\s*\\{([^}]*)\\}`).exec(source)?.[1]
  if (table === undefined) {
    report('mirrored table not found', `${constant} in ${file}`, file)
    continue
  }
  for (const locale of LOCALES) {
    const value = new RegExp(`['"]?${locale}['"]?\\s*:\\s*'([^']*)'`).exec(table)?.[1]
    if (value === undefined) {
      report('mirrored table is missing a language', `${constant} has no ${locale} entry`, file)
      continue
    }
    if (key === undefined) continue
    const expected = ui[locale]?.[key as keyof typeof sourceTable]
    if (value !== expected) {
      report('mirrored copy drifted', `${constant}.${locale} is "${value}", ${UI_FILE} says "${expected}"`, file)
    }
  }
}

// 6. Route parity. A reader who clicks something must not fall out of their own
// language because the page they wanted only exists in the other one.
const routeFiles = walkFiles(PAGES).map((file) => file.slice(PAGES.length + 1))
const sourceRoutes = new Set<string>()
for (const route of routeFiles) {
  const locale = OTHER_LOCALES.find((entry) => route.startsWith(`${entry}/`))
  if (locale === undefined) sourceRoutes.add(route)
}

for (const route of sourceRoutes) {
  const kind = ROUTES[route]
  if (kind === undefined) {
    report(
      'route not classified',
      `${route} is new. Add it to ROUTES in scripts/check-i18n.ts as per-locale, shared or source-only`,
      join(PAGES, route),
    )
    continue
  }
  if (kind !== 'per-locale') continue
  for (const locale of OTHER_LOCALES) {
    if (!existsSync(join(PAGES, locale, route))) {
      report('route missing a language', `${route} has no ${locale} copy`, join(PAGES, locale, route))
    }
  }
}

for (const route of routeFiles) {
  const locale = OTHER_LOCALES.find((entry) => route.startsWith(`${entry}/`))
  if (locale === undefined) continue
  const shared = route.slice(locale.length + 1)
  if (!sourceRoutes.has(shared)) {
    report('route exists only outside the source language', `${route} has no ${SOURCE_LOCALE} counterpart`, join(PAGES, route))
  }
}

for (const route of Object.keys(ROUTES)) {
  if (!sourceRoutes.has(route)) warnings.push(`ROUTES lists ${route}, which no longer exists in ${PAGES}`)
}

// 7. A page asking for a language other than its own. The tree a page lives in
// is what it renders as, so any other locale in a t() call is a page pulling
// copy out of the wrong table.
function localeOfRoute(route: string): Locale {
  return OTHER_LOCALES.find((locale) => route.startsWith(`${locale}/`)) ?? SOURCE_LOCALE
}

for (const route of routeFiles) {
  if (BILINGUAL_PAGES.has(route)) continue
  const file = join(PAGES, route)
  const source = readFileSync(file, 'utf8')
  const own = localeOfRoute(route)
  for (const match of source.matchAll(/\bt\(\s*['"]([a-z-]+)['"]/g)) {
    if (match[1] === own) continue
    report(
      'page reads another language',
      `${route} calls t('${match[1]}', …) but renders in ${own}`,
      file,
    )
  }
}

// A component renders inside every tree, so it can never name a language: it
// takes one, from a prop or from the path.
for (const file of walkFiles('src/components').concat(walkFiles('src/layouts'))) {
  if (!file.endsWith('.astro')) continue
  const source = readFileSync(file, 'utf8')
  for (const match of source.matchAll(/\bt\(\s*['"]([a-z-]+)['"]/g)) {
    report(
      'component names a language',
      `${file} calls t('${match[1]}', …). Take the locale as a prop, or read it with localeFromPath`,
      file,
    )
  }
}

// 8. User-visible text written straight into markup, where t() can never reach
// it. Only the attributes a reader actually hears or sees, only the markup half
// of a component (the frontmatter is comments and code), and only literals: an
// expression is already going through t() or a prop.
const TEXT_ATTRIBUTES = /\s(aria-label|alt|placeholder|title)="([^"{}]+)"/g
for (const file of [...walkFiles('src/components'), ...walkFiles('src/layouts'), ...walkFiles(PAGES)]) {
  if (!file.endsWith('.astro')) continue
  const source = readFileSync(file, 'utf8')
  // Everything after the component script fence. A doc comment above the markup
  // often shows example markup, and that is not what ships.
  const markup = source.startsWith('---') ? source.slice(source.indexOf('\n---', 3)) : source
  for (const match of markup.matchAll(TEXT_ATTRIBUTES)) {
    const value = match[2].trim()
    if (value === '' || LANGUAGE_NEUTRAL_TEXT.has(value)) continue
    report(
      'hardcoded text in markup',
      `${file}: ${match[1]}="${value}". Move it to ${UI_FILE} and call t(), or add it to LANGUAGE_NEUTRAL_TEXT if it is a brand`,
      file,
    )
  }
}

// 9. Every file that branches on the language knows about every language.
for (const file of LOCALE_AWARE_FILES) {
  if (!existsSync(file)) {
    warnings.push(`LOCALE_AWARE_FILES lists ${file}, which no longer exists`)
    continue
  }
  const source = readFileSync(file, 'utf8')
  for (const locale of LOCALES) {
    if (!new RegExp(`\\b${locale}\\b`).test(source)) {
      report(
        'language-aware file has no case for a language',
        `${file} never mentions ${locale}, so it falls back to ${SOURCE_LOCALE} without saying so`,
        file,
      )
    }
  }
}

// 10. The content pairing. One folder is one article in every language, so the
// folder is what makes two files translations of each other.
type Entry = { file: string; folder: string; isIndex: boolean; lang: string; url: string; draft: boolean }
const posts: Entry[] = []

for (const folder of readdirSync(CONTENT, { withFileTypes: true })) {
  if (!folder.isDirectory()) continue
  for (const name of readdirSync(join(CONTENT, folder.name))) {
    if (!/\.mdx?$/.test(name)) continue
    const file = join(CONTENT, folder.name, name)
    const frontmatter = frontmatterOf(readFileSync(file, 'utf8'))
    if (frontmatter === '') continue
    const base = name.replace(/\.mdx?$/, '')
    const isIndex = base === 'index'
    const lang = field(frontmatter, 'lang') ?? SOURCE_LOCALE
    const slug = field(frontmatter, 'slug') ?? (isIndex ? folder.name : base)
    posts.push({
      file,
      folder: folder.name,
      isIndex,
      lang,
      url: lang === SOURCE_LOCALE ? `/${slug}/` : `/${lang}/${slug}/`,
      draft: field(frontmatter, 'draft') === 'true',
    })
  }
}

const known = new Set<string>(LOCALES)
const sourceless: string[] = []
const byFolder = new Map<string, Entry[]>()
for (const post of posts) {
  if (!known.has(post.lang)) {
    report('unknown language in a post', `${post.file} says lang: ${post.lang}`, post.file)
  }
  const current = byFolder.get(post.folder) ?? []
  current.push(post)
  byFolder.set(post.folder, current)
}

for (const [folder, entries] of byFolder) {
  const seen = new Map<string, string>()
  for (const entry of entries) {
    const first = seen.get(entry.lang)
    if (first !== undefined) {
      report(
        'two files in one language in one folder',
        `${folder} has ${first} and ${entry.file}, both lang: ${entry.lang}. One would shadow the other in every alternate`,
        entry.file,
      )
      continue
    }
    seen.set(entry.lang, entry.file)
  }

  // check-output.ts asserts a page at /<folder>/ for every published folder, and
  // scheduled.json only carries source-language posts, so a folder whose index
  // is written in another language breaks both the moment it publishes.
  const index = entries.find((entry) => entry.isIndex)
  if (index !== undefined && index.lang !== SOURCE_LOCALE) {
    const detail = `${index.file} is the folder's index but is lang: ${index.lang}, so its page is at ${index.url}, not /${folder}/`
    if (index.draft) sourceless.push(folder)
    else report('folder index is not in the source language', detail, index.file)
  }
}

if (sourceless.length > 0) {
  warnings.push(
    `${count(sourceless.length, 'draft folder', 'draft folders')} whose index is not in ${SOURCE_LOCALE}: they publish at /<lang>/<slug>/, which check-output.ts and the scheduler both handle. (${sourceless.slice(0, 3).join(', ')}${sourceless.length > 3 ? ', …' : ''})`,
  )
}

const byUrl = new Map<string, Entry[]>()
for (const post of posts) {
  if (post.draft) continue
  const current = byUrl.get(post.url) ?? []
  current.push(post)
  byUrl.set(post.url, current)
}
for (const [url, entries] of byUrl) {
  if (entries.length < 2) continue
  report('two posts claim one URL', `${url}: ${entries.map((entry) => entry.file).join(', ')}`, entries[1].file)
}

console.log(
  `checked ${count(LOCALES.length, 'language', 'languages')}, ${count(keys.length, 'ui key', 'ui keys')}, ${count(sourceRoutes.size, 'route', 'routes')}, ${count(posts.length, 'post file', 'post files')}`,
)
for (const warning of warnings) warn(warning)

reportFailures(failures, 'the language trees agree')
