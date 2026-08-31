/**
 * Adds a small copy-as-text button to every display equation ($$...$$,
 * which rehype-katex renders into <span class="katex-display">). Inline
 * math ($...$) gets nothing: the button rides on that class distinction,
 * so it never has to guess which formulas are which.
 *
 * rehype-katex leaves the original LaTeX behind inside
 * <annotation encoding="application/x-tex">, deep in the MathML half of its
 * own output. That is read once, at build time, and written to a data
 * attribute, so the click handler in MathCopy.astro does no work at runtime.
 * What gets copied is the LaTeX exactly as it was written, which is what the
 * author typed and what any other renderer will accept.
 */

import { localeFromFile, walkElements } from './mdx-util.mjs'

function findAnnotationText(node) {
  if (node.type === 'element' && node.tagName === 'annotation') {
    if (node.properties?.encoding === 'application/x-tex') {
      return (node.children ?? []).map((child) => (child.type === 'text' ? child.value : '')).join('')
    }
    return null
  }

  if (!Array.isArray(node.children)) return null

  for (const child of node.children) {
    const found = findAnnotationText(child)
    if (found !== null) return found
  }

  return null
}

function isKatexDisplay(node) {
  if (node.type !== 'element' || node.tagName !== 'span') return false
  const classes = node.properties?.className
  return Array.isArray(classes) && classes.includes('katex-display')
}

/**
 * Both strings a reader can perceive. Kept here rather than in src/i18n/ui.ts:
 * the plugin layer keeps its own copy rather than importing from the app's
 * i18n module, the same choice rehype-footnote-asides.mjs makes for its own
 * table.
 */
const COPY_LABEL = { pt: 'copiar a fórmula como texto', en: 'copy formula as text' }
const COPY_TEXT = { pt: 'copiar', en: 'copy' }

function makeCopyButton(ascii, locale) {
  return {
    type: 'element',
    tagName: 'button',
    properties: {
      type: 'button',
      className: ['math-copy'],
      'aria-label': COPY_LABEL[locale],
      'data-math-copy': '',
      'data-ascii': ascii,
    },
    children: [{ type: 'text', value: COPY_TEXT[locale] }],
  }
}

export function rehypeMathCopy() {
  return (tree, file) => {
    const locale = localeFromFile(file)
    walkElements(tree, (node) => {
      if (!isKatexDisplay(node)) return

      const tex = findAnnotationText(node)
      if (tex === null || tex.trim() === '') return

      node.children.push(makeCopyButton(tex.trim(), locale))
    })
  }
}
