import { visit } from 'expressive-code/hast'

const TOKEN_PROPERTY = /^--\d+(bg|fs|fw|td)?$/

function tokenDeclarations(node) {
  if (node.tagName !== 'span' || node.properties?.className !== undefined) return undefined
  const style = node.properties?.style
  if (typeof style !== 'string') return undefined
  const properties = style.split(';').map((declaration) => declaration.split(':')[0])
  return properties.every((property) => TOKEN_PROPERTY.test(property)) ? style : undefined
}

function idFor(ids, declarations) {
  const known = ids.get(declarations)
  if (known !== undefined) return known
  const id = ids.size.toString(36)
  ids.set(declarations, id)
  return id
}

export function pluginTokenStyles() {
  const idsByDocument = new WeakMap()
  return {
    name: 'Token styles',
    hooks: {
      postprocessRenderedBlock: ({ codeBlock, renderData, addStyles }) => {
        const page = codeBlock.parentDocument?.documentRoot ?? codeBlock
        const ids = idsByDocument.get(page) ?? new Map()
        idsByDocument.set(page, ids)
        const used = new Set()
        visit(renderData.blockAst, 'element', (node) => {
          const declarations = tokenDeclarations(node)
          if (declarations === undefined) return
          // The engine's own per-theme rule reads `var(--<variant>)` off
          // `span[style^='--']:not([class])`, so the marker stays an inline property.
          node.properties.style = `--t:${idFor(ids, declarations)}`
          used.add(declarations)
        })
        for (const declarations of used) {
          addStyles(`.ec-line [style='--t:${ids.get(declarations)}']{${declarations}}`)
        }
      },
    },
  }
}
