import { execFileSync } from 'node:child_process'
import { version as packageVersion } from '../../package.json'

function git(...args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
}

export const REPO = 'https://github.com/khaosdoctor/blog'

function currentSha(): string | null {
  try {
    return process.env.GITHUB_SHA ?? git('rev-parse', 'HEAD')
  } catch {
    return null
  }
}

export const siteVersion = packageVersion

const commitSha = currentSha()

/** Busts the service worker cache once per deploy. */
export const commitShort = commitSha?.slice(0, 7) ?? siteVersion

export const commitUrl = commitSha === null ? REPO : `${REPO}/tree/${commitSha}`
