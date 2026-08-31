/**
 * The MDX transform cache guard. src/plugins/mdx-transform-cache.mjs works by
 * monkeypatching a vite plugin object it finds by name, "@mdx-js/rolldown",
 * replacing its transform.handler with a caching wrapper. That name and shape
 * come from @astrojs/mdx's own dist/vite-plugin-mdx.js, not from any public
 * export, so a future @astrojs/mdx release can rename or reshape it with no
 * type error anywhere: the cache plugin would just find nothing to wrap and
 * silently stop caching, and every build would go cold again with no error.
 *
 *   node scripts/check-mdx-cache.ts
 *
 * This calls the real @astrojs/mdx integration the same way astro.config.mjs
 * does and asserts the plugin the cache depends on is still there, under the
 * name and shape the wrapper expects.
 */

import { unified } from '@astrojs/markdown-remark'
import mdx from '@astrojs/mdx'
import { fail, heading, ok } from './lib/cli.ts'

const EXPECTED_NAME = '@mdx-js/rolldown'

heading('check-mdx-cache: verifying the vite plugin the MDX cache wraps')

const integration = mdx()
const setup = integration.hooks?.['astro:config:setup']
if (setup === undefined) {
  fail('@astrojs/mdx no longer exposes an "astro:config:setup" hook')
  process.exit(1)
}

type VitePlugin = { name?: string; transform?: { handler?: unknown } }

let plugins: VitePlugin[] = []
const params = {
  config: {
    srcDir: new URL('file:///dev/null/'),
    markdown: { processor: unified({ remarkPlugins: [], rehypePlugins: [] }) },
  },
  updateConfig: (patch: { vite?: { plugins?: VitePlugin[] } }) => {
    plugins = patch.vite?.plugins ?? []
  },
  addPageExtension: () => {},
  addContentEntryType: () => {},
  addRenderer: () => {},
}
// The real hook type expects the full AstroConfig and every other setup param;
// this supplies only what mdx()'s own "astro:config:setup" handler reads.
await setup(params as unknown as Parameters<NonNullable<typeof setup>>[0])

const target = plugins.find((plugin) => plugin.name === EXPECTED_NAME)

if (target === undefined) {
  const found = plugins.map((plugin) => plugin.name ?? '(unnamed)').join(', ') || 'none'
  fail(`expected a vite plugin named "${EXPECTED_NAME}", found: ${found}`)
  process.exit(1)
}

if (
  typeof target.transform !== 'object' ||
  target.transform === null ||
  typeof target.transform.handler !== 'function'
) {
  fail(`"${EXPECTED_NAME}" no longer exposes transform.handler as a function (found ${typeof target.transform})`)
  process.exit(1)
}

ok(`"${EXPECTED_NAME}" still exposes transform.handler; the MDX cache can still wrap it`)
