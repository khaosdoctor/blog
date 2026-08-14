import type { CollectionEntry } from 'astro:content'
import { MDX_COMPONENT_PATTERN, RETIRED_COMPONENT_PATTERN } from './mdx-component-names'
import { urlOf } from './posts'

type Post = CollectionEntry<'blog'>

/**
 * By name, never by shape. A catch-all `<[A-Z]...>` also eats `Promise<T>`,
 * `<C-l>` and `<Home />` quoted in prose, and its `[^>]*` crosses newlines, so a
 * multi-line generic argument took the rest of the snippet with it.
 * The names come from src/lib/mdx-component-names.ts, shared with both guards,
 * so the three lists cannot drift apart again. Retired components are included:
 * one resurrected by a migration or a translation should be stripped here rather
 * than printed as literal tag text into the markdown twin.
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

export function toAgentMarkdown(post: Post, site: URL | undefined): string {
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
