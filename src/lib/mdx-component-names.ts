/**
 * Every component a post may write as a bare tag (injected by
 * lib/mdx-components.ts, so content never imports them). Kept in one place
 * because three separate regexes used to hardcode their own copies and all
 * three had drifted. A leaf module on purpose: it imports nothing, so plain
 * node scripts can read it without dragging in `astro:content`.
 */
const MDX_COMPONENT_NAMES = [
  'Bookmark',
  'HtmlLab',
  'LabDemo',
  'MarginNote',
  'MissingImage',
  'RawEmbed',
  'Sidenote',
  'SpeakerDeck',
  'Spotify',
  'Tweet',
  'Video',
  'Vimeo',
  'YouTube',
] as const

/** Alternation for a regex, longest first so `Video` cannot shadow nothing. */
export const MDX_COMPONENT_PATTERN = [...MDX_COMPONENT_NAMES].sort((a, b) => b.length - a.length).join('|')

/**
 * Components that were removed. The guards still watch for them: a migrated post
 * or a machine translation that resurrects one should fail loudly rather than
 * render the literal tag text into the page.
 */
const RETIRED_COMPONENT_NAMES = ['Epigraph', 'Figure', 'CourseCTA'] as const

export const RETIRED_COMPONENT_PATTERN = [...RETIRED_COMPONENT_NAMES]
  .sort((a, b) => b.length - a.length)
  .join('|')
