const WORDS_PER_MINUTE = 200

// Node types whose raw `.value` is not prose: fenced/indented code, inline
// code spans, and raw HTML embeds. Counting these as words inflates reading
// time on technical posts full of code samples.
const NON_PROSE_TYPES = new Set(['code', 'inlineCode', 'html'])

/**
 * Walks an mdast node and concatenates its plain-text content, skipping code
 * and raw-HTML nodes. Hand-rolled instead of pulling in mdast-util-to-string:
 * that package has no option to exclude code nodes, and skipping it means one
 * fewer dependency (even a transitive one) to track.
 */
function textFrom(node) {
  if (NON_PROSE_TYPES.has(node.type)) return ''
  if (node.type === 'image') return node.alt ?? ''
  if (typeof node.value === 'string') return node.value
  if (Array.isArray(node.children)) return node.children.map(textFrom).join(' ')
  return ''
}

/**
 * Remark plugin: computes reading time from the post's prose (excluding code
 * blocks and raw HTML) and writes it into the frontmatter Astro exposes to
 * the page/layout, so posts can render `remarkPluginFrontmatter.readingTime`
 * without their own parsing.
 */
export function remarkReadingTime() {
  return (tree, file) => {
    const text = textFrom(tree)
    const words = text.split(/\s+/).filter(Boolean).length
    const minutes = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))

    file.data.astro ??= {}
    file.data.astro.frontmatter ??= {}
    file.data.astro.frontmatter.readingTime = minutes
    file.data.astro.frontmatter.readingWords = words
  }
}

export default remarkReadingTime
