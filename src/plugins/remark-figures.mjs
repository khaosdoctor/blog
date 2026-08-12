/**
 * Turns a lone markdown image into a real <figure>, using the image's title as
 * the caption:
 *
 *   ![alt text](./screenshot.png "the caption")
 *
 * The point is that posts stay plain markdown that Obsidian renders natively,
 * instead of carrying a <Figure> component plus an import for every image.
 *
 * This runs on mdast and keeps the `image` node itself in place, wrapped rather
 * than replaced. Astro resolves relative image paths through astro:assets later
 * in the pipeline, so leaving the node intact is what preserves optimisation and
 * srcset, replacing it with raw HTML or a plain string src drops both silently.
 *
 * The image stays inside a paragraph because mdast images are phrasing content
 * and the MDX compiler expects flow children here; `figure > p` is zeroed out in
 * BaseLayout so it costs nothing visually. `figure`/`figcaption` are lowercase,
 * so MDX treats them as plain HTML and needs no component in scope.
 */

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
  const caption = typeof image.title === 'string' ? image.title.trim() : ''
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
