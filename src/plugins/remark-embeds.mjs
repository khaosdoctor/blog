// A bare URL or `![](url)` on its own line becomes an embed, decided by host.
// See docs/architecture.md.
import { readFileSync } from 'node:fs'
import { attribute, jsxElement, soleChild } from './mdx-util.mjs'

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

/** Both the deck page and the player URL Ghost used carry the id. */
function speakerDeckId(url) {
  if (!/^(www\.)?speakerdeck\.com$/.test(url.hostname)) return null
  const id = url.pathname.match(/\/player\/(\w+)/)?.[1]
  return id ?? null
}

/** Episode, track, album or playlist: the embed URL only differs by that word. */
function spotifyEmbed(url) {
  if (url.hostname !== 'open.spotify.com') return null
  const match = url.pathname.match(/^\/(?:embed\/)?(episode|track|album|playlist|show)\/(\w+)/)
  return match === null ? null : { kind: match[1], id: match[2] }
}

/**
 * The URL of a paragraph that is nothing but one embeddable reference.
 *
 * Two spellings are accepted, because both are useful in different places.
 * `![](url)` is what Obsidian renders as a live embed while writing, so posts
 * show the actual video or tweet in the editor; a bare `url` on its own line is
 * what you get from pasting, and still upgrades on the site. Either way the
 * markdown stays readable everywhere, which is the point.
 */
function embeddableUrl(node) {
  const only = soleChild(node)
  if (only === null) return null

  if (only.type === 'image') return only.url

  if (only.type !== 'link') return null
  if (only.children.length !== 1 || only.children[0].type !== 'text') return null
  // A link with real link text is prose, not an embed.
  const text = only.children[0].value.trim()
  if (text !== only.url && text !== only.url.replace(/\/$/, '')) return null
  return only.url
}

function statusUrl(href) {
  try {
    const url = new URL(href)
    if (!/(^|\.)(twitter\.com|x\.com)$/.test(url.hostname)) return null
    return /\/status(es)?\/\d+/.test(url.pathname) ? href : null
  } catch {
    return null
  }
}

/**
 * The migration rendered every Ghost tweet card as a blockquote whose last line
 * is the attribution link. That blockquote becomes the <Tweet> fallback, and its
 * status URL is what widgets.js needs to find the live tweet, so the quote is
 * kept and the attribution paragraph is dropped, since the component renders its
 * own link.
 */
function tweetQuote(node) {
  if (node.type !== 'blockquote' || node.children.length === 0) return null
  const last = node.children[node.children.length - 1]
  if (last.type !== 'paragraph') return null

  // The attribution is written either as a link or, so Obsidian renders the
  // live tweet while editing, as an image.
  let href = null
  const walkRefs = (parent) => {
    for (const child of parent.children ?? []) {
      if (child.type === 'link' || child.type === 'image') href = statusUrl(child.url) ?? href
      walkRefs(child)
    }
  }
  walkRefs(last)
  if (href === null) return null

  return { href, children: node.children.slice(0, -1) }
}

function embedFor(href) {
  let url
  try {
    url = new URL(href)
  } catch {
    return null
  }

  const youtube = youTubeId(url)
  if (youtube !== null) return jsxElement('YouTube', [attribute('id', youtube)])

  const vimeo = vimeoId(url)
  if (vimeo !== null) return jsxElement('Vimeo', [attribute('id', vimeo)])

  // A bare status URL in a new post: no cached text to fall back to, so the
  // widget either expands it or the reader gets the link.
  if (statusUrl(href) !== null) return jsxElement('Tweet', [attribute('url', href)])

  const deck = speakerDeckId(url)
  if (deck !== null) return jsxElement('SpeakerDeck', [attribute('id', deck)])

  const spotify = spotifyEmbed(url)
  if (spotify !== null) {
    return jsxElement('Spotify', [attribute('kind', spotify.kind), attribute('id', spotify.id)])
  }

  const meta = bookmarkMetadata()[href] ?? bookmarkMetadata()[href.replace(/\/$/, '')]
  if (meta === undefined) return null

  const attributes = [attribute('url', href)]
  for (const key of ['title', 'description', 'publisher']) {
    if (typeof meta[key] === 'string' && meta[key] !== '') attributes.push(attribute(key, meta[key]))
  }
  return jsxElement('Bookmark', attributes)
}

export function remarkEmbeds() {
  return (tree) => {
    const walk = (parent) => {
      if (!Array.isArray(parent.children)) return
      for (let index = 0; index < parent.children.length; index += 1) {
        const quoted = tweetQuote(parent.children[index])
        if (quoted !== null) {
          parent.children[index] = jsxElement('Tweet', [attribute('url', quoted.href)], quoted.children)
          continue
        }

        const href = embeddableUrl(parent.children[index])
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
