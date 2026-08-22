// Must stay in sync with remark-reading-time.mjs.
const WORDS_PER_MINUTE = 200

// A regex-only estimate for list pages, where calling render() per post would
// double the build's most expensive step. The post's own page is exact.
export function estimateReadingTime(markdown: string): number {
  const stripped = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/<[^>]*>/g, ' ')
  const words = stripped.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}
