import type { APIRoute } from 'astro'
import { urlOf } from '../lib/posts'
import { getCategories } from '../lib/taxonomy'

export const GET: APIRoute = async ({ site }) => {
  const absolute = (path: string) => (site === undefined ? path : new URL(path, site).href)

  const byCategory = await getCategories()

  const lines: string[] = [
    '# lsantos.dev',
    '',
    '> Artigos sobre desenvolvimento de software, TypeScript, JavaScript, containers,',
    '> infraestrutura e carreira, escritos por Lucas Santos. A maior parte do conteúdo',
    '> está em português.',
    '',
    'Every link points at the markdown source, not the HTML page. Append `index.md` to',
    'any post URL on this site to get the same.',
    '',
  ]

  for (const [category, entries] of [...byCategory].sort((a, b) => b[1].length - a[1].length)) {
    lines.push(`## ${category}`, '')
    entries.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime())
    for (const post of entries) {
      lines.push(`- [${post.data.title}](${absolute(`${urlOf(post)}index.md`)}): ${post.data.description}`)
    }
    lines.push('')
  }

  return new Response(lines.join('\n'), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  })
}
