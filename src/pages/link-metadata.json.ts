import type { APIRoute } from 'astro'
import bookmarks from '../../content/bookmarks.json'
import titles from '../../content/link-titles.json?raw'

interface Meta {
  title: string
  description?: string
  publisher?: string
}

// Read as text rather than imported as JSON: a thousand-odd entries typed key
// by key costs the type checker real time, and nothing here needs the keys.
const crawled = JSON.parse(titles) as Record<string, Meta | null>

/** Exists because CORS stops the browser fetching link previews itself. */
export const GET: APIRoute = () => {
  // The bookmarks are written by hand and win: a crawled <title> is whatever a
  // page calls itself, which for a book or a talk is rarely its useful name.
  const known = Object.fromEntries(Object.entries(crawled).filter(([, meta]) => meta !== null))

  return new Response(JSON.stringify({ ...known, ...bookmarks }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  })
}
