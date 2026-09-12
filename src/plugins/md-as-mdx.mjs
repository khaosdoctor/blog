// Routes .md files in content/blog/ through the MDX pipeline instead of
// Astro's plain markdown renderer. The remark chain emits mdxJsxFlowElement
// nodes (for embeds, figures, emphasis blocks), which only the MDX compiler
// understands, so .md content files need the same treatment as .mdx ones.
//
// An Astro integration with two jobs:
//
// 1. Registers a content entry type for .md with `contentModuleTypes`, which
//    overrides the built-in markdownContentEntryType and causes the glob
//    loader to set deferredRender: true. At render time the file is imported
//    through Vite, where the MDX transform compiles it.
//
// 2. Adds a Vite plugin that patches three other plugins in configResolved:
//    a. "@mdx-js/rolldown" -- widens its transform filter to also match .md
//    b. "@astrojs/mdx-postprocess" -- same (adds the Content export the
//       runtime expects; without it the compiled module only has MDXContent)
//    c. "astro:markdown" -- narrows its load handler to skip content .md files

import { fileURLToPath } from 'node:url'
import { parseFrontmatter } from '@astrojs/internal-helpers/frontmatter'

const MDX_PLUGIN = '@mdx-js/rolldown'
const MDX_POSTPROCESS = '@astrojs/mdx-postprocess'
const MD_PLUGIN = 'astro:markdown'
const CONTENT_MD = /content\/blog\/[^/]+\/[^/]+\.md$/

function safeParseFrontmatter(code, id) {
  try {
    return parseFrontmatter(code, { frontmatter: 'empty-with-spaces' })
  } catch (e) {
    if (e.name === 'YAMLException') {
      e.id = id
      e.loc = { file: e.id, line: e.mark.line + 1, column: e.mark.column }
      e.message = e.reason
    }
    throw e
  }
}

/** @returns {import('astro').AstroIntegration} */
export function mdAsMdx() {
  return {
    name: 'md-as-mdx',
    hooks: {
      'astro:config:setup': ({ addContentEntryType, updateConfig }) => {
        // Overrides the built-in .md entry type (last registered wins).
        addContentEntryType({
          extensions: ['.md'],
          async getEntryInfo({ fileUrl, contents }) {
            const parsed = safeParseFrontmatter(contents, fileURLToPath(fileUrl))
            return {
              data: parsed.frontmatter,
              body: parsed.content.trim(),
              slug: parsed.frontmatter.slug,
              rawData: parsed.rawFrontmatter,
            }
          },
          // Presence of this key tells the glob loader to defer rendering
          // through Vite instead of pre-rendering with the markdown processor.
          contentModuleTypes: `declare module 'astro:content' {
  interface Render {
    '.md': Promise<{
      Content: import('astro').MDXContent;
      headings: import('astro').MarkdownHeading[];
      remarkPluginFrontmatter: Record<string, any>;
      components: import('astro').MDXInstance<{}>['components'];
    }>;
  }
}`,
          handlePropagation: true,
        })

        updateConfig({
          vite: {
            plugins: [mdAsVitePlugin()],
          },
        })
      },
    },
  }
}

function mdAsVitePlugin() {
  return {
    name: 'md-as-mdx',
    enforce: 'pre',
    configResolved(resolved) {
      const mdxPlugin = resolved.plugins.find((p) => p.name === MDX_PLUGIN)
      const postprocessPlugin = resolved.plugins.find((p) => p.name === MDX_POSTPROCESS)
      const mdPlugin = resolved.plugins.find((p) => p.name === MD_PLUGIN)

      if (mdxPlugin?.transform?.filter?.id instanceof RegExp) {
        mdxPlugin.transform.filter.id = /\.mdx?$/
      }

      if (postprocessPlugin?.transform?.filter?.id instanceof RegExp) {
        postprocessPlugin.transform.filter.id = /\.mdx?$/
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
