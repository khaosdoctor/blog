import { execFileSync } from 'node:child_process'
import { version as packageVersion } from '../../package.json'

// Footer version: semver from the last tag plus posts published since.
// See docs/architecture.md.
function git(...args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
}

function postsSinceRelease(): number {
  // Posts added since the tag for the current version. A shallow clone or a
  // repo with no tags yet simply has no baseline, and the suffix is skipped.
  const tag = `v${packageVersion}`
  git('rev-parse', '--verify', `refs/tags/${tag}`)

  const added = git(
    'log',
    `${tag}..HEAD`,
    '--diff-filter=A',
    '--name-only',
    '--format=',
    '--',
    'content/blog/*/index.mdx',
    'content/blog/*/index.md',
  )

  return new Set(added.split('\n').filter((line) => line !== '')).size
}

function build(): string {
  try {
    const posts = postsSinceRelease()
    return posts > 0 ? `${packageVersion}-${posts}` : packageVersion
  } catch {
    // No git, no tags, or a shallow checkout: the semver alone is still true.
    return packageVersion
  }
}

const REPO = 'https://github.com/khaosdoctor/blog'

function currentSha(): string | null {
  try {
    // GitHub Actions checks out a detached head; the env var is the commit that
    // triggered the run, which is the one this build came from.
    return process.env.GITHUB_SHA ?? git('rev-parse', 'HEAD')
  } catch {
    return null
  }
}

export const siteVersion = build()

/** Full commit the site was built from, or null outside a git checkout. */
export const commitSha = currentSha()

/** Short form, used to bust the service worker cache once per deploy. */
export const commitShort = commitSha?.slice(0, 7) ?? siteVersion

/** The exact tree this build came from, so the footer version is verifiable. */
export const commitUrl = commitSha === null ? REPO : `${REPO}/tree/${commitSha}`
