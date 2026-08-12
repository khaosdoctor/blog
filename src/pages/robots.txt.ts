import type { APIRoute } from 'astro'

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
