import type { CollectionEntry } from 'astro:content'
import type { APIRoute } from 'astro'
import { MDX_COMPONENT_PATTERN, RETIRED_COMPONENT_PATTERN } from './mdx-component-names'
import { urlOf } from './posts'

type Post = CollectionEntry<'blog'>

export const markdownTwinRoute: APIRoute = ({ props, site }) => {
  const { post } = props as { post: Post }
  return new Response(toAgentMarkdown(post, site), {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  })
}

// By name, never by shape: a catch-all `<[A-Z]...>` would also eat `Promise<T>`.
const COMPONENT = new RegExp(`</?(?:${MDX_COMPONENT_PATTERN}|${RETIRED_COMPONENT_PATTERN})\\b[^>]*>`, 'g')

const CODE = /(^```[\s\S]*?^```[^\n]*|`[^`\n]+`)/gm

function componentsToText(body: string): string {
  // Odd chunks are code: a component name in a snippet is a quotation.
  return body
    .split(CODE)
    .map((chunk, index) => (index % 2 === 1 ? chunk : replaceComponents(chunk)))
    .join('')
}

function replaceComponents(prose: string): string {
  return (
    prose
      .replace(/<Video\b[^>]*src="([^"]*)"[^>]*\/>/g, (_match, src) => `[Video: ${src}]`)
      // Lazy to `/>`: a RawEmbed's html attribute holds a whole iframe.
      .replace(/<RawEmbed\b[\s\S]*?\/>/g, '[Embedded content]')
      .replace(/<MissingImage\b[^>]*\/>/g, '[Image no longer available]')
      .replace(COMPONENT, '')
  )
}

function toAgentMarkdown(post: Post, site: URL | undefined): string {
  const path = urlOf(post)
  const url = site === undefined ? path : new URL(path, site).href
  const { title, description, pubDate, updatedDate, category, tags, series, lang } = post.data

  const header = [
    `# ${title}`,
    '',
    description,
    '',
    `- URL: ${url}`,
    `- Published: ${pubDate.toISOString().slice(0, 10)}`,
    ...(updatedDate ? [`- Updated: ${updatedDate.toISOString().slice(0, 10)}`] : []),
    `- Category: ${category}`,
    ...(series ? [`- Series: ${series}`] : []),
    ...(tags.length > 0 ? [`- Tags: ${tags.join(', ')}`] : []),
    `- Language: ${lang}`,
    '- Author: Lucas Santos',
    '',
    '---',
    '',
  ].join('\n')

  return `${header + componentsToText(post.body ?? '').trim()}\n`
}
