import type { APIRoute } from 'astro'
import { noindexPaths } from '../lib/post-dates.mjs'

// Shell, not content: these never carry a `noindex` frontmatter field, so
// they can't come from noindexPaths and have to stay listed by hand.
const CHROME_PATHS = ['/search/', '/en/search/', '/offline/']

export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('sitemap-index.xml', site).href
  const disallow = [...CHROME_PATHS, ...noindexPaths].sort()

  const body = `User-agent: *
Allow: /
${disallow.map((path) => `Disallow: ${path}`).join('\n')}

Sitemap: ${sitemap}
`

  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}
