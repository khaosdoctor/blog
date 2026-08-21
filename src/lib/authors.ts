/**
 * Authors are written the way git writes them, `Name <https://site>`, because
 * that is a format worth not inventing: it is already in everyone's fingers, it
 * survives being pasted anywhere, and the angle brackets make the boundary
 * unambiguous even when a name contains punctuation.
 *
 * The site part is optional. `Lucas Santos` alone is a valid author.
 */
export interface Author {
  name: string
  /** Absolute URL, or null when the author is just a name. */
  url: string | null
}

const AUTHOR = /^\s*(.*?)\s*(?:<\s*([^>]+?)\s*>)?\s*$/

function parseAuthor(raw: string): Author {
  const match = AUTHOR.exec(raw)
  // The regex cannot fail (every part is optional), but a name is the one thing
  // that has to be there, so an entry that is only a URL keeps the URL as its
  // name rather than rendering an empty link.
  const name = match?.[1]?.trim() ?? raw.trim()
  const url = match?.[2]?.trim() ?? ''

  if (name === '') return { name: url === '' ? raw.trim() : url, url: null }
  // Anything that is not http(s) is dropped rather than rendered: a `mailto:` or
  // a `javascript:` in frontmatter should not become a link on the page.
  return { name, url: /^https?:\/\//i.test(url) ? url : null }
}

/**
 * Whose blog this is. A post with no `authors` was written by him, which is all
 * but a handful of them, so the byline shows without every file having to say so.
 * A guest post or a co-authored one overrides it by listing everyone.
 */
const SITE_AUTHOR = 'Lucas Santos <https://lsantos.dev>'

export function parseAuthors(raw: string[] | undefined): Author[] {
  const entries = raw === undefined || raw.length === 0 ? [SITE_AUTHOR] : raw
  return entries.map(parseAuthor).filter((author) => author.name !== '')
}
