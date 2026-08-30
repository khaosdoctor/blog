import { test, expect, type Page } from '@playwright/test'
import { POST, pickCodeTheme } from './helpers.ts'

/**
 * The language chip reads its ink off the block's own painted background, so a
 * dark code theme on a light page still gets white text. Deriving it per theme
 * instead does not work: all the light themes resolve to the same black, and
 * expressive-code omits a value that matches its base variant, which left them
 * with the dark default.
 */

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
    ['light', 'ayu-dark', 'oklch(1 0 0)'],
    ['dark', 'ayu-light', 'oklch(0 0 0)'],
  ] as const) {
    test(`is ${expected === 'oklch(1 0 0)' ? 'white' : 'black'} on ${codeTheme} over a ${pageTheme} page`, async ({
      page,
    }) => {
      await page.goto(POST)
      await page.evaluate((theme) => document.documentElement.setAttribute('data-theme', theme), pageTheme)
      await pickCodeTheme(page, codeTheme)

      const inks = await chipInk(page)
      expect(inks.length, 'no code blocks found').toBeGreaterThan(1)
      for (const ink of inks) expect(ink).toBe(expected)
    })
  }

  // Both widths, on one load each: the phone reserves less room and shrinks the
  // chip to match, so the tight case is only visible there.
  for (const viewport of [null, { width: 430, height: 932 }]) {
    test(`the chip is transparent, self-bordered and clear of the code${viewport === null ? '' : ' on a phone'}`, async ({
      page,
    }) => {
      if (viewport !== null) await page.setViewportSize(viewport)
      await page.goto(POST)

      const chip = await page.evaluate(() => {
        const pre = document.querySelector('.expressive-code figure pre')
        if (pre === null) throw new Error('no code block on the page')
        const code = pre.querySelector('code')
        if (code === null) throw new Error('the block has no code element')
        const style = getComputedStyle(pre, '::after')
        return {
          content: style.content,
          background: style.backgroundColor,
          borderStyle: style.borderTopStyle,
          borderColor: style.borderTopColor,
          ink: style.color,
          padding: parseFloat(getComputedStyle(code).paddingBlockEnd),
          needed: parseFloat(style.height) + parseFloat(style.bottom),
        }
      })

      expect(chip.content).toContain('bash')
      expect(chip.background).toBe('rgba(0, 0, 0, 0)')
      expect(chip.borderStyle).toBe('double')
      expect(chip.borderColor, 'the border does not follow the block').toBe(chip.ink)
      expect(chip.padding, 'the last line runs under the chip').toBeGreaterThan(chip.needed)
    })
  }

  /*
   * The chip and the copy button hold opposite corners of the same box, so the
   * shortest block on the page is where they meet.
   */
  test('the chip never reaches the copy button', async ({ page }) => {
    await page.goto(POST)

    const worst = await page.evaluate(() => {
      let smallest: number | null = null
      for (const figure of document.querySelectorAll('.expressive-code figure')) {
        const pre = figure.querySelector('pre')
        const button = figure.querySelector('.copy button')
        if (pre === null || button === null) continue
        const chip = getComputedStyle(pre, '::after')
        const chipTop =
          pre.getBoundingClientRect().height - parseFloat(chip.bottom) - parseFloat(chip.height)
        const room = chipTop - (button.getBoundingClientRect().bottom - pre.getBoundingClientRect().top)
        if (smallest === null || room < smallest) smallest = room
      }
      return smallest
    })

    expect(worst, 'no block with both a chip and a copy button').not.toBeNull()
    expect(worst, 'the chip runs into the copy button').toBeGreaterThan(0)
  })
})
