import { execFileSync } from 'node:child_process'
import { version as packageVersion } from '../../package.json'

function git(...args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
}

function commitsSinceRelease(): number {
  const tag = `v${packageVersion}`
  try {
    git('rev-parse', '--verify', `refs/tags/${tag}`)
    return Number(git('rev-list', '--count', `${tag}..HEAD`))
  } catch {
    // No tag yet: counting from the root commit still moves on every change.
    return Number(git('rev-list', '--count', 'HEAD'))
  }
}

function build(): string {
  try {
    const commits = commitsSinceRelease()
    // `+n` not `-n`: semver reads a plus as build metadata, a dash as a prerelease.
    return commits > 0 ? `${packageVersion}+${commits}` : packageVersion
  } catch {
    return packageVersion
  }
}

export const REPO = 'https://github.com/khaosdoctor/blog'

function currentSha(): string | null {
  try {
    // GitHub Actions checks out a detached head, so HEAD is not the triggering commit.
    return process.env.GITHUB_SHA ?? git('rev-parse', 'HEAD')
  } catch {
    return null
  }
}

export const siteVersion = build()

const commitSha = currentSha()

/** Busts the service worker cache once per deploy. */
export const commitShort = commitSha?.slice(0, 7) ?? siteVersion

export const commitUrl = commitSha === null ? REPO : `${REPO}/tree/${commitSha}`
