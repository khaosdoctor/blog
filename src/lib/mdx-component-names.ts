/**
 * Every component a post may write as a bare tag, in one place.
 *
 * These are injected into every post (see the `mdxComponents` object in both
 * `[...slug].astro` files), so content never imports them. Three separate
 * regexes used to hardcode their own copy of this list — the markdown twin's
 * stripper, the output guard's leaked-tag check and the translation guard's
 * allowlist — and all three had drifted: two still named `Epigraph` and `Figure`
 * months after both were deleted, and none knew about `LabDemo` or `HtmlLab`, so
 * a leaked `<LabDemo>` would have passed the output guard silently.
 *
 * A leaf module on purpose: it imports nothing, so the plain node scripts under
 * `scripts/` can read it without dragging in `astro:content`.
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
