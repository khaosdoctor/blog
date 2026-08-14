# CI

Three workflows and one Cloudflare Worker. Nothing is deployed yet: the deploy job in `build.yml` is commented out
and Pages is off until the DNS cutover.

Every `uses:` is pinned to a full commit SHA. A tag like `@v1` is a moving ref, so the action's owner decides what
runs on the runner, which is the same trust that cost the Ghost site a month of serving an injected script.
Dependabot watches the pins.

## Build

```mermaid
flowchart TD
  T1["push to main"] --> C
  T2["pull request"] --> C
  T3["repository_dispatch<br/>scheduled-publish, from the Worker"] --> C
  T4["workflow_dispatch"] --> C
  C["checkout, fetch-depth 0"] --> N["setup-node 24, npm cache"]
  N --> K["restore the Astro image cache"]
  K --> I["npm ci"]
  I --> CH["npm run check<br/>astro check + tsc -p worker + check-i18n + check-component-css"]
  CH --> B["npm run build<br/>prebuild vendors media, then astro, then pagefind"]
  B --> G["node scripts/check-output.ts"]
  G --> A["upload-pages-artifact"]
  A -.->|"commented out until cutover"| D["deploy-pages"]
  A --> S["job: seo-audit<br/>continue-on-error: true"]
```

`fetch-depth: 0` is required: the footer version is the semver plus the number of commits since that version's tag
(`0.0.1+42`), and a shallow clone can see neither the tag nor the history behind it. See `src/lib/version.ts`.

**seo-audit** runs after `build`, against the artifact `build` already produced (extracted from `artifact.tar`, not
rebuilt). It audits `dist/` with Lighthouse ([treosh/lighthouse-ci-action](https://github.com/treosh/lighthouse-ci-action),
config in `lighthouserc.json`) and checks links with [lychee](https://github.com/lycheeverse/lychee-action), internal
and external, `--root-dir dist` mapping the site's root-relative hrefs back to local files so no server has to run.
`continue-on-error: true` on the job means neither tool can ever fail the workflow or block a deploy: both reports are
advisory, one as a job summary (lychee) and one as an artifact plus a temporary public link (Lighthouse).

**Concurrency.** The group depends on the event, so a pull request can only ever cancel its own earlier runs:

```yaml
group: pages-${{ github.event_name == 'pull_request' && github.ref || 'main' }}
cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

A single constant group would let a PR push cancel an in-flight `repository_dispatch` publish, and the Worker's window
is 60 seconds with no persistence, so that post would never publish.

## Translate

Two jobs, because the model must never hold a token that can write.

```mermaid
flowchart TD
  P["push to main touching content/blog"] --> J1
  subgraph J1["job: translate, permissions contents: read"]
    S1["is CLAUDE_CODE_OAUTH_TOKEN set?"] -->|no| X["exit clean, nothing happens"]
    S1 -->|yes| S2["claude-code-action writes translations"]
    S2 --> S3["git status: what changed?"]
    S3 --> S4["refuse if any index.mdx was touched"]
    S4 --> S5["stage only the changed files, upload as an artifact"]
  end
  J1 --> J2
  subgraph J2["job: review, needs translate, contents+PR write"]
    R1["continue the existing branch, or create it"] --> R2["download the artifact"]
    R2 --> R3["node scripts/check-translations.ts"]
    R3 -->|fails| R4["job red, nothing committed"]
    R3 -->|passes| R5["commit, push without force"]
    R5 --> R6["open a PR if none is open"]
  end
```

Four things that matter here:

- **The artifact is the boundary.** Anything the model wrote outside the changed translation files dies with the
  runner.
- **The guard runs before the commit,** not after. `check-translations.ts` rejects script tags, event handlers,
  `javascript:` in an attribute, unknown elements, and MDX expressions or `import` lines, which execute during the
  build.
- **A source `index.mdx` may never be modified** by the model. The job fails loudly if one was.
- **No force push.** The commit is based on the remote tip, so the push is a fast-forward. If a human pushed to the
  branch in the meantime the push is rejected and the job goes red, saying nothing was overwritten.

Translations land as `content/blog/<folder>/<english-slug>.mdx` with `machineTranslated: true`, so each page carries
the banner offering the original until you edit it and set the flag to false.

## Scheduled publishing

```mermaid
sequenceDiagram
  participant Cron as Worker cron, every minute
  participant M as /scheduled.json
  participant API as GitHub API
  participant CI as Build workflow
  Cron->>M: fetch the manifest
  M-->>Cron: posts still waiting, slug and pubDate
  Cron->>Cron: dueNow(posts, controller.scheduledTime)
  Cron->>API: repository_dispatch, scheduled-publish
  API->>CI: run
  CI->>CI: the post is no longer in the future, so it builds
```

The window is anchored to `controller.scheduledTime`, not to the wall clock. A tick that Cloudflare runs late would
otherwise produce a window that steps over a whole-minute `pubDate`, and since the Worker keeps no state, that post
would never publish at all. `worker/src/schedule.test.ts` covers exactly that case.

## Release

Manual, from the Actions tab. release-please opens the PR, merging it cuts the tag. `feat` is a minor, `fix` a patch,
`!` or `BREAKING CHANGE` a major, and `content:` is ignored, so publishing never moves the version.

## Credentials

| Secret | Used by | Without it |
|---|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` | Translate | the job exits clean and nothing is translated |
| `PUBLIC_CF_ANALYTICS_TOKEN` | `BaseLayout.astro`, read at build time | no analytics beacon is rendered. `build.yml` does not pass it into the build yet, so setting the secret alone changes nothing |
| Cloudflare account + a GitHub PAT with `contents:write` | the Worker | scheduled posts appear on the next push instead of on time |
| `REPLICATE_API_TOKEN` | `scripts/cover.ts`, run by hand | no generated covers |

## Running the same checks locally

```
npm run check                      # astro check + tsc -p worker + check-i18n.ts + check-component-css.ts
npm run build                      # prebuild vendors media, astro, pagefind
node scripts/check-output.ts       # the artefact guard CI runs
node scripts/check-translations.ts # the translation guard CI runs
node scripts/clean-translations.ts # strips agent artefacts from translated files
```

Both guards emit GitHub Actions annotations when `GITHUB_ACTIONS` is set, so a failure lands on the file in the PR
diff rather than only in the log.
