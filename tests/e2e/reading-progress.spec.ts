import { test, expect, type Page } from '@playwright/test'

/**
 * The desktop meter is a run of dashes with a head that writes along it; the
 * phone hides the run and fills the header background from the same position.
 */

const POST = '/en/a-deep-dive-into-container-images-part-1/'

async function cursorX(page: Page): Promise<string> {
  return page.evaluate(
    () => document.querySelector('.shell .cursor')?.style.getPropertyValue('--cursor-x') ?? '',
  )
}

/** The head is eased over frames, so a reading taken right after a scroll is mid-flight. */
async function settled(page: Page, read: () => Promise<string>): Promise<string> {
  let previous = ''
  await expect
    .poll(
      async () => {
        const now = await read()
        const same = now !== '' && now === previous
        previous = now
        return same
      },
      { timeout: 5000, intervals: [60] },
    )
    .toBe(true)
  return previous
}

test('the reading head glides rather than hopping dash to dash', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(POST)
  await expect(page.locator('.shell .cursor')).toHaveCount(1)

  // Under one dash of travel. Counting every dash rather than the cropped run
  // makes this smaller than a real slot, so the step can only be too small.
  const scroll = await page.evaluate(() => {
    const max = document.documentElement.scrollHeight - innerHeight
    const dashes = document.querySelectorAll('.shell .fill .dash').length
    return { middle: max / 2, nudge: max / dashes / 3 }
  })
  expect(scroll.nudge, 'the post is too short to have a meter').toBeGreaterThan(0)

  await page.evaluate((y) => scrollTo(0, y), scroll.middle)
  const before = await settled(page, () => cursorX(page))

  await page.evaluate((y) => scrollTo(0, y), scroll.middle + scroll.nudge)
  const after = await settled(page, () => cursorX(page))

  expect(after, 'the head only moves once a whole dash is crossed').not.toBe(before)
})

test('the phone header fills as the post is read', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 850 })
  await page.goto(POST)

  const read = (): Promise<string> =>
    page.evaluate(
      () => document.querySelector<HTMLElement>('.shell')?.style.getPropertyValue('--read-progress') ?? '',
    )

  await page.evaluate(() => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) / 2))
  const middle = parseFloat(await settled(page, read))

  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
  const end = parseFloat(await settled(page, read))

  expect(middle, 'the header never filled').toBeGreaterThan(0)
  expect(end, 'the fill did not follow the scroll').toBeGreaterThan(middle)
})
