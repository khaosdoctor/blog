import { execFileSync } from 'node:child_process'
import { version as packageVersion } from '../../package.json'

// Footer version: the semver of the last tag, plus the number of commits made
// since it. Every change moves the number with no extra step, and the tags stay
// hand-cut for releases that mean something. It used to count posts published
// since the tag, which left every change that was not a post invisible.
// See docs/architecture.md.
function git(...args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
}

function commitsSinceRelease(): number {
  const tag = `v${packageVersion}`
  try {
    git('rev-parse', '--verify', `refs/tags/${tag}`)
    return Number(git('rev-list', '--count', `${tag}..HEAD`))
  } catch {
    // No tag cut yet, which is where the repo is today. Counting from the root
    // commit still moves on every change, and the number becomes the count since
    // the tag the moment there is one.
    return Number(git('rev-list', '--count', 'HEAD'))
  }
}

function build(): string {
  try {
    const commits = commitsSinceRelease()
    // `+n` rather than `-n`: in semver a plus is build metadata, which is what
    // this is, while a dash would claim the release is a prerelease of the tag.
    return commits > 0 ? `${packageVersion}+${commits}` : packageVersion
  } catch {
    // No git, no tags, or a shallow checkout: the semver alone is still true.
    return packageVersion
  }
}

/** The repository itself, so anything that needs to point at it (the footer's
 *  GitHub link, the commit URL below) builds off one string rather than
 *  spelling the host out again. */
export const REPO = 'https://github.com/khaosdoctor/blog'

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
