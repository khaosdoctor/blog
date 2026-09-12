// Routes .md files in content/blog/ through the MDX pipeline instead of
// Astro's plain markdown renderer. The remark chain emits mdxJsxFlowElement
// nodes (for embeds, figures, emphasis blocks), which only the MDX compiler
// understands, so .md content files need the same treatment as .mdx ones.
//
// Patches two Vite plugins in configResolved:
// 1. "@mdx-js/rolldown" — widens its transform filter to also match .md
// 2. "astro:markdown" — narrows its load filter to skip .md in content/blog/
//
// This replaces the `extensions` option that older @astrojs/mdx versions had.

const MDX_PLUGIN = '@mdx-js/rolldown'
const MD_PLUGIN = 'astro:markdown'
const CONTENT_MD = /content\/blog\/[^/]+\/[^/]+\.md$/

export function mdAsMdx() {
  return {
    name: 'md-as-mdx',
    enforce: 'pre',
    configResolved(resolved) {
      const mdxPlugin = resolved.plugins.find((p) => p.name === MDX_PLUGIN)
      const mdPlugin = resolved.plugins.find((p) => p.name === MD_PLUGIN)

      if (mdxPlugin?.transform?.filter?.id instanceof RegExp) {
        mdxPlugin.transform.filter.id = /\.mdx?$/
      }

      if (mdxPlugin?.resolveId?.handler) {
        const originalResolveId = mdxPlugin.resolveId.handler
        mdxPlugin.resolveId.handler = async function (source, importer, options) {
          if (importer?.endsWith('.md') || importer?.endsWith('.mdx')) {
            let resolved = await this.resolve(source, importer, options)
            if (!resolved) resolved = await this.resolve('./' + source, importer, options)
            return resolved
          }
          return originalResolveId.call(this, source, importer, options)
        }
      }

      if (mdPlugin?.load?.handler) {
        const originalLoad = mdPlugin.load.handler
        mdPlugin.load.handler = async function (id) {
          if (CONTENT_MD.test(id)) return undefined
          return originalLoad.call(this, id)
        }
      }
    },
  }
}
