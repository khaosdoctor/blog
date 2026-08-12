/**
 * Writes a stub page for every entry in src/data/redirects.ts.
 *
 * Static hosting has no server, so there is no way to answer an old URL with a
 * real 301: GitHub Pages has no redirect config, no _redirects file, nothing.
 * A stub is the working substitute — a meta-refresh, a canonical pointing at the
 * target, and a visible link for anyone whose browser ignores the refresh.
 * Google treats meta-refresh as a redirect and passes the ranking through.
 *
 * ponytail: an integration rather than a route, because the stubs live at paths
 * a second catch-all route would fight [...slug].astro over, and because they
 * must stay out of the sitemap — a redirect is not a page worth indexing.
 *
 * The build fails if a target does not exist in the output. A redirect into a
 * 404 is worse than no redirect: it wastes crawl budget and strands the reader.
 */
import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { redirects } from '../data/redirects.ts'

function page(target, site) {
  const absolute = new URL(target, site).href
  return `<!doctype html>
<html lang="pt">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Redirecionando…</title>
    <meta http-equiv="refresh" content="0; url=${target}" />
    <link rel="canonical" href="${absolute}" />
    <meta name="robots" content="noindex, follow" />
  </head>
  <body>
    <p>Esta página mudou de endereço. <a href="${target}">Continuar</a>.</p>
  </body>
</html>
`
}

/** dist-relative path a URL resolves to: a directory index, or the file itself. */
function outputPath(url) {
  const clean = url.replace(/^\//, '')
  return clean.endsWith('/') || clean === '' ? join(clean, 'index.html') : clean
}

/**
 * Output-relative paths of every built file. Uses relative() rather than
 * slicing: fileURLToPath on a directory URL keeps its trailing slash, and
 * slicing by length then eats the first character of every name.
 */
async function listFiles(dir, base = dir) {
  const found = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...(await listFiles(full, base)))
    else found.push(relative(base, full))
  }
  return found
}

export function redirectStubs() {
  // build:done is not given the resolved config, and the canonical has to be an
  // absolute URL on the real domain — the output directory URL is a file://
  // path and produces a canonical no crawler can follow.
  let site

  return {
    name: 'redirect-stubs',
    hooks: {
      'astro:config:done': ({ config }) => {
        site = config.site
      },
      'astro:build:done': async ({ dir, logger }) => {
        if (site === undefined) throw new Error('redirect stubs need `site` set in astro.config.mjs')
        const root = fileURLToPath(dir)
        const existing = new Set(await listFiles(root))

        const missing = new Set()
        for (const { to } of redirects) {
          // Off-site targets are somebody else's problem.
          if (to.startsWith('http')) continue
          if (!existing.has(outputPath(to))) missing.add(to)
        }
        if (missing.size > 0) {
          throw new Error(
            `redirect targets that do not exist in the build: ${[...missing].join(', ')}. ` +
              'Fix the target in scripts/build-redirects.ts and re-run it.',
          )
        }

        let written = 0
        for (const { from, to } of redirects) {
          const path = join(root, outputPath(from))
          // Never shadow a real page: a slug that came back to life wins.
          if (existing.has(outputPath(from))) continue
          await mkdir(dirname(path), { recursive: true })
          await writeFile(path, page(to, site))
          written += 1
        }
        logger.info(`wrote ${written} redirect stubs`)
      },
    },
  }
}
