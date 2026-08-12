import type { CollectionEntry } from 'astro:content'

type Post = CollectionEntry<'blog'>

/** Components are replaced rather than dropped: a summariser should know a video was there. */
function componentsToText(body: string): string {
  return body
    .replace(/<Video\b[^>]*src="([^"]*)"[^>]*\/>/g, (_match, src) => `[Video: ${src}]`)
    .replace(/<RawEmbed\b[^>]*\/>/g, '[Embedded content]')
    .replace(/<MissingImage\b[^>]*\/>/g, '[Image no longer available]')
    .replace(/<\/?[A-Z][A-Za-z0-9]*\b[^>]*>/g, '')
}

export function toAgentMarkdown(post: Post, site: URL | undefined): string {
  const url = site === undefined ? `/${post.id}/` : new URL(`/${post.id}/`, site).href
  const { title, description, pubDate, updatedDate, category, tags, series, lang } = post.data

  const header = [
    `# ${title}`,
    '',
    description,
    '',
    `- URL: ${url}`,
    `- Published: ${pubDate.toISOString().slice(0, 10)}`,
    ...(updatedDate ? [`- Updated: ${updatedDate.toISOString().slice(0, 10)}`] : []),
    `- Section: ${category}`,
    ...(series ? [`- Series: ${series}`] : []),
    ...(tags.length > 0 ? [`- Tags: ${tags.join(', ')}`] : []),
    `- Language: ${lang}`,
    '- Author: Lucas Santos',
    '',
    '---',
    '',
  ].join('\n')

  return header + componentsToText(post.body ?? '').trim() + '\n'
}
