import type { APIRoute } from 'astro'

/**
 * Ghost served a robots.txt and the new site had none, which meant no crawl
 * policy and no Sitemap line.
 *
 * Search and AI crawlers are both allowed: the point of writing this is being
 * read, and the markdown twins exist precisely so an agent can read a post
 * cleanly. What is disallowed is chrome, the search page and the offline
 * fallback are not content and only waste crawl budget.
 */
export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('sitemap-index.xml', site).href

  const body = `User-agent: *
Allow: /
Disallow: /search/
Disallow: /en/search/
Disallow: /offline/

Sitemap: ${sitemap}
`

  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}
