import { readFileSync } from 'node:fs'

export interface Credit {
  name: string
  url: string
}

export interface AttributedCredit extends Credit {
  license: string
  /** Set only where the licence text itself must stay reachable. */
  licenseUrl?: string
  author?: string
}

// Hand-maintained: WebPlus IBM VGA 9x16 is CC BY-SA 4.0, which requires
// attribution reachable from the site. Its name has to match the cut named in
// public/fonts/LICENSES.txt, since that is the file being attributed.
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
    name: 'WebPlus IBM VGA 9x16',
    url: 'https://int10h.org/oldschool-pc-fonts/',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    author: 'VileR, The Oldschool PC Font Resource',
  },
  {
    name: 'Cascadia Code',
    url: 'https://github.com/microsoft/cascadia-code',
    license: 'OFL 1.1',
    author: 'Microsoft',
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

type Repository = string | { url?: string } | undefined

function resolvePackageUrl(homepage: unknown, repository: Repository): string | undefined {
  if (typeof homepage === 'string' && homepage.trim() !== '') return homepage

  const repoUrl = typeof repository === 'string' ? repository : repository?.url
  if (typeof repoUrl !== 'string' || repoUrl.trim() === '') return undefined

  return repoUrl
    .replace(/^git\+/, '')
    .replace(/^git:\/\//, 'https://')
    .replace(/\.git$/, '')
    .replace(/^github:(.+)$/, 'https://github.com/$1')
}

function readPackageCredit(name: string): Credit {
  const raw = readFileSync(`node_modules/${name}/package.json`, 'utf8')
  const meta = JSON.parse(raw) as { homepage?: string; repository?: Repository }
  return { name, url: resolvePackageUrl(meta.homepage, meta.repository) ?? '' }
}

function dependencyNames(): string[] {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { dependencies?: Record<string, string> }
  return Object.keys(pkg.dependencies ?? {}).sort((a, b) => a.localeCompare(b))
}

function generateDependencyCredits(): Credit[] {
  return dependencyNames().map((name) => {
    try {
      return readPackageCredit(name)
    } catch {
      return { name, url: '' }
    }
  })
}

export const dependencies: Credit[] = generateDependencyCredits()
