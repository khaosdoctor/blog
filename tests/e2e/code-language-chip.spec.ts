import { test, expect, type Page } from '@playwright/test'

/**
 * The language chip reads its ink off the block's own painted background, so a
 * dark code theme on a light page still gets white text. Deriving it per theme
 * instead does not work: all the light themes resolve to the same black, and
 * expressive-code omits a value that matches its base variant, which left them
 * with the dark default.
 */

const POST = '/en/everything-about-node-running-typescript-natively/'

async function pickCodeTheme(page: Page, theme: string): Promise<void> {
  await page.evaluate((name) => {
    const select = document.querySelector<HTMLSelectElement>('#ct-theme')
    if (select === null) throw new Error('the code theme picker is not on the page')
    select.value = name
    select.dispatchEvent(new Event('change', { bubbles: true }))
  }, theme)
  await expect(page.locator('html')).toHaveAttribute('data-code-theme', theme)
}

async function chipInk(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    ['.frame.is-terminal', '.frame:not(.is-terminal)']
      .map((kind) => document.querySelector(`.expressive-code ${kind} pre`))
      .filter((pre): pre is Element => pre !== null)
      .map((pre) => getComputedStyle(pre, '::after').color),
  )
}

test.describe('the code language chip', () => {
  // The page theme is deliberately the opposite of the code theme in each case:
  // the two are separate choices and the chip must follow the block.
  for (const [pageTheme, codeTheme, expected] of [
    ['light', 'dracula', 'oklch(1 0 0)'],
    ['dark', 'github-light', 'oklch(0 0 0)'],
  ] as const) {
    test(`is ${expected === 'oklch(1 0 0)' ? 'white' : 'black'} on ${codeTheme} over a ${pageTheme} page`, async ({
      page,
    }) => {
      await page.goto(POST, { waitUntil: 'networkidle' })
      await page.evaluate((theme) => document.documentElement.setAttribute('data-theme', theme), pageTheme)
      await pickCodeTheme(page, codeTheme)

      const inks = await chipInk(page)
      expect(inks.length, 'no code blocks found').toBeGreaterThan(1)
      for (const ink of inks) expect(ink).toBe(expected)
    })
  }

  test('the chip is transparent and bordered in the post colour', async ({ page }) => {
    await page.goto(POST, { waitUntil: 'networkidle' })

    const chip = await page.evaluate(() => {
      const pre = document.querySelector('.expressive-code figure pre')
      if (pre === null) throw new Error('no code block on the page')
      const style = getComputedStyle(pre, '::after')
      return {
        content: style.content,
        background: style.backgroundColor,
        borderStyle: style.borderTopStyle,
        borderColor: style.borderTopColor,
        accent: getComputedStyle(document.body).getPropertyValue('--post-accent').trim(),
      }
    })

    expect(chip.content).toContain('bash')
    expect(chip.background).toBe('rgba(0, 0, 0, 0)')
    expect(chip.borderStyle).toBe('double')
    expect(chip.accent, 'the post sets no cover colour').not.toBe('')
    expect(chip.borderColor).toBe(await page.evaluate((value) => {
      const probe = document.createElement('span')
      probe.style.color = value
      document.body.append(probe)
      const resolved = getComputedStyle(probe).color
      probe.remove()
      return resolved
    }, chip.accent))
  })
})
