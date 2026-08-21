import { test, expect, type Page } from '@playwright/test'

/**
 * The mobile ruler: every page type, both languages, at the common phone and
 * tablet widths. Two invariants: the page never scrolls sideways, and every
 * always-visible control is tappable (44x44 CSS px, WCAG 2.5.8).
 */

const PHONE_WIDTHS = [360, 393, 430]
const TABLET_WIDTHS = [768, 834, 1024]
const ALL_WIDTHS = [...PHONE_WIDTHS, ...TABLET_WIDTHS]

const PAGES = [
  { name: 'home pt', path: '/' },
  { name: 'home en', path: '/en/' },
  { name: 'post with series en', path: '/en/a-deep-dive-into-container-images-part-1/' },
  { name: 'series pt', path: '/series/' },
  { name: 'series en', path: '/en/series/' },
  { name: 'tags en', path: '/en/tags/' },
  { name: 'search en', path: '/en/search/' },
  { name: '404', path: '/definitely-not-a-page/' },
]

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const doc = document.documentElement
    return doc.scrollWidth - doc.clientWidth
  })
}

for (const { name, path } of PAGES) {
  for (const width of ALL_WIDTHS) {
    test(`${name} has no sideways scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 850 })
      await page.goto(path, { waitUntil: 'networkidle' })
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
    })
  }
}

/** Controls a thumb has to be able to hit on every page that shows them. */
const TAP_TARGETS = [
  { name: 'nav link', selector: '.nav-links a', path: '/en/' },
  { name: 'credits link', selector: 'footer .credits a', path: '/en/' },
  { name: 'toc handle', selector: '.handle', path: '/en/a-deep-dive-into-container-images-part-1/' },
]

for (const { name, selector, path } of TAP_TARGETS) {
  test(`${name} is tappable at 393px`, async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 850 })
    await page.goto(path, { waitUntil: 'networkidle' })
    const box = await page.locator(selector).first().boundingBox()
    expect(box, `${selector} not found on ${path}`).not.toBeNull()
    expect(box!.width, `${selector} width`).toBeGreaterThanOrEqual(44)
    expect(box!.height, `${selector} height`).toBeGreaterThanOrEqual(44)
  })
}

test('search returns results on the built site', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 850 })
  await page.goto('/en/search/?q=typescript', { waitUntil: 'networkidle' })
  await expect(page.locator('a[href*="typescript"]').first()).toBeVisible({ timeout: 10000 })
})
