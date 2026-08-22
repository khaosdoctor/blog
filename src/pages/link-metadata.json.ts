import type { APIRoute } from 'astro'
import bookmarks from '../../content/bookmarks.json'

/** Exists because CORS stops the browser fetching link previews itself. */
export const GET: APIRoute = () =>
  new Response(JSON.stringify(bookmarks), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  })
