// A lone markdown image becomes a figure, and its markdown title becomes the
// caption. The image node is kept intact so astro:assets still produces srcset.
//
// Title, not alt. The two say different things: the caption is text everyone
// reads, the alt text describes the image for someone who cannot see it. Falling
// back to alt when there was no title meant every image with alt text and no
// caption grew a caption that was really a description, which is what the 191
// migrated posts carry.

import { readFileSync } from 'node:fs'
import { attribute, jsxElement, soleChild } from './mdx-util.mjs'

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
  const only = soleChild(node)
  return only?.type === 'image' ? only : null
}

function figureFor(image) {
  // The alt text stays on the image untouched: it is what a search engine and a
  // screen reader read when the file itself will not load.
  const caption = typeof image.title === 'string' ? image.title.trim() : ''
  // Otherwise the caption renders as a browser tooltip as well.
  image.title = null

  if (isDead(image.url)) {
    const attributes = [attribute('src', image.url)]
    if (image.alt) attributes.push(attribute('alt', image.alt))
    if (caption !== '') attributes.push(attribute('caption', caption))
    return jsxElement('MissingImage', attributes)
  }

  const children = [{ type: 'paragraph', children: [image] }]
  if (caption !== '') children.push(jsxElement('figcaption', [], [{ type: 'text', value: caption }]))
  return jsxElement('figure', [], children)
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
