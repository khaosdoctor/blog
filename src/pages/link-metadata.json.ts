import type { APIRoute } from 'astro'
import bookmarks from '../../content/bookmarks.json'

/** Metadata for external link previews: CORS stops the browser reading another origin. */
export const GET: APIRoute = () =>
  new Response(JSON.stringify(bookmarks), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Content only changes when a post does, and the file is tiny.
      'cache-control': 'public, max-age=3600',
    },
  })
