import { test, expect, type Page } from '@playwright/test'

/**
 * The token-styles plugin rewrites every syntax token's inline colours to a
 * `--t:<id>` marker and moves the declarations into a stylesheet rule. It works
 * because expressive-code's own per-theme rule selects
 * `span[style^='--']:not([class])`. If an upgrade changes that selector the
 * markers stop resolving and every token silently falls back to the plain
 * foreground, which looks like a theme choice rather than a break.
 */

const POST = '/en/everything-about-node-running-typescript-natively/'

async function tokenColours(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('.expressive-code .ec-line span[style]')]
      .slice(0, 120)
      .map((el) => getComputedStyle(el).color),
  )
}

test('every syntax token resolves to a declared colour', async ({ page }) => {
  await page.goto(POST)
  await expect(page.locator('.expressive-code').first()).toBeVisible()

  const colours = await tokenColours(page)
  expect(colours.length, 'no token spans found at all').toBeGreaterThan(20)

  // The failure this guards against is every token collapsing to one colour.
  expect(new Set(colours).size, 'tokens are all one colour').toBeGreaterThan(2)

  // Asks the marker what it resolves to rather than reading the stylesheet
  // text, which the CSS minifier is free to rewrite.
  const unresolved = await page.evaluate(() => {
    // A token can differ in only some themes, and can be styled by weight or
    // slant rather than colour, so any one of these resolving proves the rule
    // reached it.
    const properties = Array.from({ length: 14 }, (_, index) => index).flatMap((index) => [
      `--${index}`,
      `--${index}bg`,
      `--${index}fs`,
      `--${index}fw`,
      `--${index}td`,
    ])
    const bad: string[] = []
    const seen = new Set<string>()
    for (const el of document.querySelectorAll('.ec-line span[style*="--t:"]')) {
      const marker = el.getAttribute('style') ?? ''
      if (seen.has(marker)) continue
      seen.add(marker)
      const style = getComputedStyle(el)
      if (!properties.some((property) => style.getPropertyValue(property).trim() !== '')) {
        bad.push(marker)
      }
    }
    return bad
  })

  expect(unresolved, 'markers whose rule never applied').toEqual([])
})

test('the code theme picker repaints the tokens', async ({ page }) => {
  await page.goto(POST)
  const before = await tokenColours(page)

  await page.evaluate(() => {
    const select = document.querySelector<HTMLSelectElement>('#ct-theme')
    if (select === null) throw new Error('the code theme picker is not on the page')
    select.value = 'dracula'
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await expect(page.locator('html')).toHaveAttribute('data-code-theme', 'dracula')

  expect(await tokenColours(page), 'picking a theme changed nothing').not.toEqual(before)
})
