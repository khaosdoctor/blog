import type { APIRoute } from 'astro'
import type { CollectionEntry } from 'astro:content'
import { MDX_COMPONENT_PATTERN, RETIRED_COMPONENT_PATTERN } from './mdx-component-names'
import { urlOf } from './posts'

type Post = CollectionEntry<'blog'>

/** The GET both markdown-twin routes re-export; each route's own
    getStaticPaths decides which language's posts feed it. */
export const markdownTwinRoute: APIRoute = ({ props, site }) => {
  const { post } = props as { post: Post }
  return new Response(toAgentMarkdown(post, site), {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  })
}

/**
 * By name, never by shape: a catch-all `<[A-Z]...>` also eats `Promise<T>`
 * and `<Home />` quoted in prose. Names come from mdx-component-names.ts,
 * shared with both guards so the lists cannot drift; retired components are
 * stripped too rather than printed as literal tag text.
 */
const COMPONENT = new RegExp(
  `</?(?:${MDX_COMPONENT_PATTERN}|${RETIRED_COMPONENT_PATTERN})\\b[^>]*>`,
  'g',
)

/** Fenced blocks and inline spans, as one capture so split() hands them back. */
const CODE = /(^```[\s\S]*?^```[^\n]*|`[^`\n]+`)/gm

/** Components are replaced rather than dropped: a summariser should know a video was there. */
function componentsToText(body: string): string {
  // Code is copied through untouched: a component name inside a snippet is a
  // quotation, not markup, and nothing in a code block ever renders.
  return body
    .split(CODE)
    .map((chunk, index) => (index % 2 === 1 ? chunk : replaceComponents(chunk)))
    .join('')
}

function replaceComponents(prose: string): string {
  return prose
    .replace(/<Video\b[^>]*src="([^"]*)"[^>]*\/>/g, (_match, src) => `[Video: ${src}]`)
    // Lazy up to `/>` rather than `[^>]*`: the html attribute of a RawEmbed holds
    // a whole iframe, so the first `>` is in the middle of the tag, not its end.
    .replace(/<RawEmbed\b[\s\S]*?\/>/g, '[Embedded content]')
    .replace(/<MissingImage\b[^>]*\/>/g, '[Image no longer available]')
    .replace(COMPONENT, '')
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
