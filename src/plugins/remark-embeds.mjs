/**
 * A bare URL on its own line becomes the right thing, decided by host:
 *
 *   https://www.youtube.com/watch?v=abc123   -> <YouTube id="abc123" />
 *   https://vimeo.com/476516779              -> <Vimeo id="476516779" />
 *   https://example.com/some-article         -> <Bookmark ... /> if we have
 *                                               metadata for it, else untouched
 *
 * Written this way so posts contain no embed syntax to remember: paste a link on
 * its own line and it upgrades itself. Obsidian shows a plain link, which is the
 * correct fallback everywhere the plugin does not run.
 *
 * Bookmark metadata comes from content/bookmarks.json, captured out of Ghost's
 * own cached card data during migration. A URL that is not in there stays a
 * plain link rather than triggering a build-time fetch — the build makes no
 * network requests at all, which is what keeps it deterministic and offline.
 */
import { readFileSync } from 'node:fs'

/** Read once per process, not per file. */
let bookmarks = null

function bookmarkMetadata() {
  if (bookmarks !== null) return bookmarks
  try {
    bookmarks = JSON.parse(readFileSync('content/bookmarks.json', 'utf8'))
  } catch {
    // No sidecar yet: every URL simply stays a plain link.
    bookmarks = {}
  }
  return bookmarks
}

function youTubeId(url) {
  if (/^(www\.)?youtube\.com$/.test(url.hostname)) {
    return url.searchParams.get('v') ?? (url.pathname.startsWith('/embed/') ? url.pathname.slice(7) : null)
  }
  if (url.hostname === 'youtu.be') return url.pathname.slice(1) || null
  return null
}

function vimeoId(url) {
  if (!/^(www\.|player\.)?vimeo\.com$/.test(url.hostname)) return null
  const id = url.pathname.split('/').filter(Boolean).pop()
  return id !== undefined && /^\d+$/.test(id) ? id : null
}

/**
 * A paragraph counts as a bare link when its only content is one link whose
 * visible text is the URL itself. A link with real link text is prose and is
 * left alone.
 */
function bareLink(node) {
  if (node.type !== 'paragraph') return null
  const meaningful = node.children.filter(
    (child) => !(child.type === 'text' && child.value.trim() === ''),
  )
  if (meaningful.length !== 1) return null
  const [only] = meaningful
  if (only.type !== 'link') return null
  if (only.children.length !== 1 || only.children[0].type !== 'text') return null
  const text = only.children[0].value.trim()
  if (text !== only.url && text !== only.url.replace(/\/$/, '')) return null
  return only.url
}

function attribute(name, value) {
  return { type: 'mdxJsxAttribute', name, value }
}

function component(name, attributes) {
  return { type: 'mdxJsxFlowElement', name, attributes, children: [] }
}

function embedFor(href) {
  let url
  try {
    url = new URL(href)
  } catch {
    return null
  }

  const youtube = youTubeId(url)
  if (youtube !== null) return component('YouTube', [attribute('id', youtube)])

  const vimeo = vimeoId(url)
  if (vimeo !== null) return component('Vimeo', [attribute('id', vimeo)])

  const meta = bookmarkMetadata()[href] ?? bookmarkMetadata()[href.replace(/\/$/, '')]
  if (meta === undefined) return null

  const attributes = [attribute('url', href)]
  for (const key of ['title', 'description', 'publisher']) {
    if (typeof meta[key] === 'string' && meta[key] !== '') attributes.push(attribute(key, meta[key]))
  }
  return component('Bookmark', attributes)
}

export function remarkEmbeds() {
  return (tree) => {
    const walk = (parent) => {
      if (!Array.isArray(parent.children)) return
      for (let index = 0; index < parent.children.length; index += 1) {
        const href = bareLink(parent.children[index])
        if (href === null) {
          walk(parent.children[index])
          continue
        }
        const embed = embedFor(href)
        if (embed !== null) parent.children[index] = embed
      }
    }
    walk(tree)
  }
}
