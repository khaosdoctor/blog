/** Must stay in sync with lib/mdx-components.ts. */
const MDX_COMPONENT_NAMES = [
  'Bookmark',
  'Emphasis',
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

/** Longest first, so a shorter name cannot match the prefix of a longer one. */
export const MDX_COMPONENT_PATTERN = [...MDX_COMPONENT_NAMES].sort((a, b) => b.length - a.length).join('|')

/** Removed components the guards still watch for, so a post using one fails loudly. */
const RETIRED_COMPONENT_NAMES = ['Epigraph', 'Figure', 'CourseCTA'] as const

export const RETIRED_COMPONENT_PATTERN = [...RETIRED_COMPONENT_NAMES]
  .sort((a, b) => b.length - a.length)
  .join('|')
