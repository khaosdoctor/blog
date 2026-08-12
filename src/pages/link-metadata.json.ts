import type { APIRoute } from 'astro'
import bookmarks from '../../content/bookmarks.json'

/**
 * Title and description for external links, so a hover preview can show
 * something for a link the browser is not allowed to fetch.
 *
 * A page on another origin cannot be read from JavaScript — CORS forbids it —
 * and fetching it at build time would put the whole open web in the build's
 * critical path. This is the metadata Ghost already captured for its bookmark
 * cards, served as a small static file the preview script loads once.
 *
 * Links that are not in here still get a card, built from the link's own text
 * and its hostname. Something beats nothing.
 */
export const GET: APIRoute = () =>
  new Response(JSON.stringify(bookmarks), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Content only changes when a post does, and the file is tiny.
      'cache-control': 'public, max-age=3600',
    },
  })
