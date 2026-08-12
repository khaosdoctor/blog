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
 * srcset — replacing it with raw HTML or a plain string src drops both silently.
 *
 * The image stays inside a paragraph because mdast images are phrasing content
 * and the MDX compiler expects flow children here; `figure > p` is zeroed out in
 * BaseLayout so it costs nothing visually. `figure`/`figcaption` are lowercase,
 * so MDX treats them as plain HTML and needs no component in scope.
 */

/** An image is "lone" when it is the only meaningful thing in its paragraph. */
function loneImage(node) {
  if (node.type !== 'paragraph') return null
  const meaningful = node.children.filter(
    (child) => !(child.type === 'text' && child.value.trim() === ''),
  )
  if (meaningful.length !== 1) return null
  return meaningful[0].type === 'image' ? meaningful[0] : null
}

function jsx(name, children) {
  return { type: 'mdxJsxFlowElement', name, attributes: [], children }
}

function figureFor(image) {
  const caption = typeof image.title === 'string' ? image.title.trim() : ''
  // Otherwise the caption renders as a browser tooltip as well.
  image.title = null

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
