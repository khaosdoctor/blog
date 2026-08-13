// A lone markdown image becomes a figure, and its alt text becomes the caption.
// The image node is kept intact so astro:assets still produces srcset.
//
// Alt, not title, because Obsidian is the editor: the Image Captions plugin
// renders alt text as the caption, so a post looks the same while it is being
// written as it does once published. A markdown title still wins when there is
// one, which is what the 191 migrated posts carry and what to reach for when the
// caption and the alt text genuinely need to say different things.

import { readFileSync } from 'node:fs'

/**
 * Remote images whose host stopped serving them. They stay in the markdown so
 * the caption and the surrounding sentence survive; only the rendering changes.
 */
let deadImages = null

function isDead(url) {
  if (deadImages === null) {
    try {
      deadImages = new Set(JSON.parse(readFileSync('content/dead-images.json', 'utf8')).urls ?? [])
    } catch {
      deadImages = new Set()
    }
  }
  return deadImages.has(url)
}

/** An image is "lone" when it is the only meaningful thing in its paragraph. */
function loneImage(node) {
  if (node.type !== 'paragraph') return null
  const meaningful = node.children.filter(
    (child) => !(child.type === 'text' && child.value.trim() === ''),
  )
  if (meaningful.length !== 1) return null
  return meaningful[0].type === 'image' ? meaningful[0] : null
}

function jsx(name, children, attributes = []) {
  return { type: 'mdxJsxFlowElement', name, attributes, children }
}

function attribute(name, value) {
  return { type: 'mdxJsxAttribute', name, value }
}

function figureFor(image) {
  const titled = typeof image.title === 'string' ? image.title.trim() : ''
  const described = typeof image.alt === 'string' ? image.alt.trim() : ''
  // The alt text stays on the image either way: it is what a search engine and a
  // screen reader read when the file itself will not load.
  const caption = titled === '' ? described : titled
  // Otherwise the caption renders as a browser tooltip as well.
  image.title = null

  if (isDead(image.url)) {
    const attributes = [attribute('src', image.url)]
    if (image.alt) attributes.push(attribute('alt', image.alt))
    if (caption !== '') attributes.push(attribute('caption', caption))
    return jsx('MissingImage', [], attributes)
  }

  const children = [{ type: 'paragraph', children: [image] }]
  if (caption !== '') children.push(jsx('figcaption', [{ type: 'text', value: caption }]))
  return jsx('figure', children)
}

export function remarkFigures() {
  return (tree) => {
    const walk = (parent) => {
      if (!Array.isArray(parent.children)) return
      for (let index = 0; index < parent.children.length; index += 1) {
        const image = loneImage(parent.children[index])
        if (image === null) {
          walk(parent.children[index])
          continue
        }
        parent.children[index] = figureFor(image)
      }
    }
    walk(tree)
  }
}
