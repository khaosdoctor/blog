/**
 * The data behind /oss/ and /en/oss/. The page credits what the site actually
 * ships: no descriptions, no per-item prose, just a name and a link, with
 * exactly two exceptions.
 *
 * `fonts` and `icons` are hand-maintained. Neither is an npm package (the
 * fonts are vendored files under public/fonts/, the icon pack is Pixelarticons
 * kept as plain SVG in src/components/icons/), and both carry licences naming
 * specific attribution: PxPlus IBM VGA 9x16 is CC BY-SA 4.0, which requires
 * attribution reachable from the site, and this page is that attribution. See
 * docs/theming.md and the footer in BaseLayout.astro. A future change to the
 * generator below must not start producing entries for these two arrays.
 *
 * `dependencies` is the flat list of everything else: every runtime dependency
 * in package.json, generated from each installed package's own package.json
 * under node_modules (`homepage`, falling back to `repository.url`), so a name
 * or a link here is never a guess and never drifts from what is actually
 * installed. devDependencies are excluded on purpose: build tools, type
 * checkers, the translation script never reach a reader.
 * scripts/check-credits.ts fails `npm run check` the moment this list and
 * package.json disagree in either direction.
 */
import { readFileSync } from 'node:fs'

export interface Credit {
  name: string
  url: string
}

export interface AttributedCredit extends Credit {
  license: string
  /** Set only where the licence text itself has to stay reachable, not just named. */
  licenseUrl?: string
  author?: string
}

export const fonts: AttributedCredit[] = [
  {
    name: 'Departure Mono',
    url: 'https://departuremono.com',
    license: 'OFL 1.1',
    author: 'Helena Zhang',
  },
  {
    name: 'Literata',
    url: 'https://fonts.google.com/specimen/Literata',
    license: 'OFL 1.1',
    author: 'Font Bureau and TypeTogether',
  },
  {
    name: 'Atkinson Hyperlegible',
    url: 'https://fonts.google.com/specimen/Atkinson+Hyperlegible',
    license: 'OFL 1.1',
    author: 'Braille Institute of America',
  },
  {
    name: 'PxPlus IBM VGA 9x16',
    url: 'https://int10h.org/oldschool-pc-fonts/',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    author: 'VileR, The Oldschool PC Font Resource',
  },
]

export const icons: AttributedCredit[] = [
  {
    name: 'Pixelarticons',
    url: 'https://pixelarticons.com',
    license: 'MIT',
    author: 'halfmage',
  },
]

/** A package.json `repository` field, in either shape. */
type Repository = string | { url?: string } | undefined

/**
 * `homepage`, falling back to `repository.url` turned into something a browser
 * can open: strip the `git+` prefix and `.git` suffix npm adds, turn a bare
 * `git://` scheme into `https://`, and expand the `github:owner/repo` shorthand.
 * Returns undefined when neither field yields anything usable.
 */
export function resolvePackageUrl(homepage: unknown, repository: Repository): string | undefined {
  if (typeof homepage === 'string' && homepage.trim() !== '') return homepage

  const repoUrl = typeof repository === 'string' ? repository : repository?.url
  if (typeof repoUrl !== 'string' || repoUrl.trim() === '') return undefined

  return repoUrl
    .replace(/^git\+/, '')
    .replace(/^git:\/\//, 'https://')
    .replace(/\.git$/, '')
    .replace(/^github:(.+)$/, 'https://github.com/$1')
}

/** The name and resolved URL of one installed package, read from its own package.json. */
export function readPackageCredit(name: string): Credit {
  const raw = readFileSync(`node_modules/${name}/package.json`, 'utf8')
  const meta = JSON.parse(raw) as { homepage?: string; repository?: Repository }
  return { name, url: resolvePackageUrl(meta.homepage, meta.repository) ?? '' }
}

/** The runtime dependency names declared in package.json, alphabetised. */
export function dependencyNames(): string[] {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { dependencies?: Record<string, string> }
  return Object.keys(pkg.dependencies ?? {}).sort((a, b) => a.localeCompare(b))
}

function generateDependencyCredits(): Credit[] {
  return dependencyNames().map((name) => {
    try {
      return readPackageCredit(name)
    } catch {
      // Not installed under node_modules right now. Render the name rather
      // than crash the page; scripts/check-credits.ts is what turns this into
      // a build failure.
      return { name, url: '' }
    }
  })
}

export const dependencies: Credit[] = generateDependencyCredits()
