export interface Author {
  name: string
  url: string | null
}

const AUTHOR = /^\s*(.*?)\s*(?:<\s*([^>]+?)\s*>)?\s*$/

function parseAuthor(raw: string): Author {
  const match = AUTHOR.exec(raw)
  // Every group is optional, so the regex cannot fail. An entry that is only a
  // URL uses the URL as its name rather than rendering an empty link.
  const name = match?.[1]?.trim() ?? raw.trim()
  const url = match?.[2]?.trim() ?? ''

  if (name === '') return { name: url === '' ? raw.trim() : url, url: null }
  // Non-http(s) is dropped, so `javascript:` cannot become a link on the page.
  return { name, url: /^https?:\/\//i.test(url) ? url : null }
}

const SITE_AUTHOR = 'Lucas Santos <https://lsantos.dev>'

export function parseAuthors(raw: string[] | undefined): Author[] {
  const entries = raw === undefined || raw.length === 0 ? [SITE_AUTHOR] : raw
  return entries.map(parseAuthor).filter((author) => author.name !== '')
}
