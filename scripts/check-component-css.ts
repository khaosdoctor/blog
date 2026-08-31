/**
 * The style-isolation guard for post components. A Vue component living inside
 * a post shares its page with the whole site's CSS, and the dev server has
 * already leaked one component's styles unscoped once (a `.chip` rule in the
 * theme lab stretched every tag chip on its page). The cure is CSS modules:
 * class names are rewritten to Component__class__hash at build (see the
 * generateScopedName in astro.config.mjs), so a collision is impossible even
 * when a stylesheet escapes its scope.
 *
 *   node scripts/check-component-css.ts
 *
 * CSS modules only rename what stays inside their rules, so this guard fails
 * the build on the three ways a component can still leak or break:
 *
 *   1. A style block that is not `<style module>`, since `scoped` keeps the literal
 *      class name and relies on the very scoping that leaked, and a bare
 *      `<style>` is global by definition.
 *   2. A selector with no class in it (`button { ... }`): CSS modules leave
 *      element selectors untouched, so that rule styles every button on the
 *      page. It has to nest under a local class.
 *   3. A static `class="x"` in the template where `x` is defined in the same
 *      file's style block: the author meant `$style.x`, and without it the
 *      element gets a class no rule matches anymore.
 *
 * It reads source, never build output, so it runs in `npm run check` before a
 * build exists.
 */
import { readFileSync } from 'node:fs'
import { annotate, count, fail, heading, ok, walkFiles } from './lib/cli.ts'

const CONTENT = 'content/blog'

type Failure = { file: string; detail: string }
const failures: Failure[] = []

function report(file: string, detail: string): void {
  failures.push({ file, detail })
}

/**
 * Every selector in the block, at any nesting depth, split on commas. Whatever
 * text runs up to a `{` from the previous `{`, `}` or `;` is a selector list:
 * declarations end in `;` or `}` and never reach a `{`, and at-rule preludes
 * are filtered by their `@`.
 */
function selectorsOf(css: string): string[] {
  const flat = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const selectors: string[] = []
  for (const match of flat.matchAll(/[^{};]+\{/g)) {
    const text = match[0].slice(0, -1).trim()
    if (text === '' || text.startsWith('@')) continue
    selectors.push(...text.split(',').map((s) => s.trim()))
  }
  return selectors
}

/** The class names a style block defines, so template use of them is checked. */
function classesOf(css: string): Set<string> {
  const classes = new Set<string>()
  for (const match of css.matchAll(/\.([a-zA-Z_][\w-]*)/g)) classes.add(match[1])
  return classes
}

for (const file of walkFiles(CONTENT).filter((path) => path.endsWith('.vue'))) {
  const source = readFileSync(file, 'utf8')
  const blocks = [...source.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/g)]
  if (blocks.length === 0) continue

  const template = /<template>([\s\S]*)<\/template>/.exec(source)?.[1] ?? ''
  const localClasses = new Set<string>()

  for (const [, attrs, css] of blocks) {
    if (!/\bmodule\b/.test(attrs)) {
      report(
        file,
        `<style${attrs}> must be <style module>: only CSS modules rename classes, ` +
          `and a literal class name is one dev-server leak away from styling the whole page`,
      )
      continue
    }

    for (const cls of classesOf(css)) localClasses.add(cls)

    for (const selector of selectorsOf(css)) {
      // A selector with no class at all is global under CSS modules: element
      // and attribute selectors are left untouched by the renamer.
      if (!/\.[a-zA-Z_]/.test(selector) && !/^(from|to|\d+%)/.test(selector)) {
        report(file, `selector "${selector}" has no class, so CSS modules leave it global; nest it under a local class`)
      }
    }
  }

  // A static class="x" where x is a local class means the author forgot
  // $style: the rule was renamed, the attribute was not, so nothing matches.
  for (const match of template.matchAll(/(?<![:\w-])class="([^"]*)"/g)) {
    for (const token of match[1].split(/\s+/)) {
      if (localClasses.has(token)) {
        report(file, `class="${token}" is a local class and needs :class="$style.${token}"`)
      }
    }
  }
}

heading('component css')

if (failures.length > 0) {
  for (const { file, detail } of failures) {
    fail(`${file}: ${detail}`)
    annotate('error', { file, message: detail })
  }
  console.error()
  fail(count(failures.length, 'style isolation problem', 'style isolation problems'))
  process.exit(1)
}

ok('post component styles are all CSS modules, nothing leaks')
