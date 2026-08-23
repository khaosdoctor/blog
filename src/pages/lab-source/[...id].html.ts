import type { APIRoute, GetStaticPaths } from 'astro'
import { getCollection, type CollectionEntry } from 'astro:content'

type Source = CollectionEntry<'labSource'>

/**
 * The page the reveal links to and the script fetches. No layout: the only
 * reader who sees this document is one with no JavaScript, following the link.
 */
function page(source: Source): string {
  if (source.rendered === undefined) throw new Error(`lab source ${source.id} was not rendered`)

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, follow" />
    <title>${source.data.name}</title>
    <style>
      :root {
        color-scheme: light dark;
      }
      body {
        margin: 0 auto;
        padding: 1.5rem 1rem;
        max-width: 60rem;
        font-family: ui-monospace, monospace;
        font-size: 0.85rem;
      }
      p {
        margin-block: 0 1rem;
      }
    </style>
  </head>
  <body data-pagefind-ignore="all">
    <p><a href="${source.data.postUrl}">${source.data.postUrl}</a> ${source.data.name}</p>
    <div id="lab-source">${source.rendered.html}</div>
  </body>
</html>
`
}

export const getStaticPaths: GetStaticPaths = async () => {
  const sources = await getCollection('labSource')
  return sources.map((source) => ({ params: { id: source.id }, props: { source } }))
}

export const GET: APIRoute<{ source: Source }> = ({ props }) =>
  new Response(page(props.source), { headers: { 'content-type': 'text/html; charset=utf-8' } })
