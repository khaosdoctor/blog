/**
 * The reading-time estimate, on its own so a plain node script can have it.
 *
 * This lives here, rather than in posts.ts where it used to, for the same
 * reason chip-color.ts does: posts.ts imports `astro:content`, a module that
 * only exists inside Astro, so anything importing this through posts.ts from
 * scripts/ fails before it runs. scripts/cover.ts needs the number to draw a
 * post's reading time onto its og:image, and nothing here imports anything, so
 * a build script, a server page and a client script can all read it.
 *
 * posts.ts re-exports it, so the pages that already import it from there keep
 * working unchanged.
 */

// Mirrors remark-reading-time.mjs's own rate, so the number a list shows and
// the number the post's own page shows are computed from the same assumption.
const WORDS_PER_MINUTE = 200

/**
 * A fast reading-time estimate straight from a post's raw markdown/MDX
 * (`post.body`), not from render(). The post's own page calls render() once,
 * already, to get its Content and its real remark-computed readingTime
 * (remark-reading-time.mjs, which walks the parsed mdast and excludes code
 * and raw HTML precisely). A list page potentially shows every post in the
 * collection, so calling render() again per post just to read one number off
 * its frontmatter would double the site's most expensive build step (syntax
 * highlighting, KaTeX, MDX compilation) across the whole archive.
 *
 * This strips fenced/inline code and tag-like markup with regular
 * expressions instead of parsing anything, which is why it can disagree with
 * the post page's own number by a minute on an MDX-heavy post (an imported
 * component's multi-line props are not valid mdast and can leak a stray word
 * or two past the strip). That trade, an approximate number everywhere
 * instead of an exact one bought at double the build cost, is the one this
 * list makes; the post's own page keeps showing the exact figure.
 */
export function estimateReadingTime(markdown: string): number {
  const stripped = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/<[^>]*>/g, ' ')
  const words = stripped.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}
