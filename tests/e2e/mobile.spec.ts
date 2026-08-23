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
  { name: 'credits link', selector: 'footer .credits a', path: '/en/', minWidth: 44, minHeight: 44 },
  { name: 'hamburger', selector: '.menu-toggle', path: '/en/', minWidth: 44, minHeight: 44 },
  // The TOC pull tab is half an icon button wide by design (flush with the
  // screen edge, cannot be overshot); the height is what carries the target.
  {
    name: 'toc handle',
    selector: '.handle',
    path: '/en/a-deep-dive-into-container-images-part-1/',
    minWidth: 20,
    minHeight: 100,
  },
]

for (const { name, selector, path, minWidth, minHeight } of TAP_TARGETS) {
  test(`${name} is tappable at 393px`, async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 850 })
    await page.goto(path, { waitUntil: 'networkidle' })
    const box = await page.locator(selector).first().boundingBox()
    expect(box, `${selector} not found on ${path}`).not.toBeNull()
    expect(box!.width, `${selector} width`).toBeGreaterThanOrEqual(minWidth)
    expect(box!.height, `${selector} height`).toBeGreaterThanOrEqual(minHeight)
  })
}

test('hamburger opens the drawer with nav links at 393px', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 850 })
  await page.goto('/en/', { waitUntil: 'networkidle' })
  await expect(page.locator('.nav-links')).toBeHidden()
  await page.click('.menu-toggle')
  await expect(page.locator('.nav-links a', { hasText: 'SERIES' })).toBeVisible()
})

test('the toc tab slides the outline in at 393px', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 850 })
  await page.goto('/en/a-deep-dive-into-container-images-part-1/', { waitUntil: 'networkidle' })
  await page.click('.handle')
  await expect(page.locator('.toc')).toBeVisible()
  // Polled: the panel is mid-slide right after the click.
  await expect
    .poll(async () => {
      const box = await page.locator('.toc').boundingBox()
      return box ? box.x + box.width : Number.POSITIVE_INFINITY
    })
    .toBeLessThanOrEqual(394)
})

test('long unbroken tokens wrap instead of scrolling the page', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 850 })
  await page.goto('/en/a-deep-dive-into-container-images-part-1/', { waitUntil: 'networkidle' })
  const grew = await page.evaluate(() => {
    const doc = document.documentElement
    const token = 'a'.repeat(61)
    const paragraph = document.querySelector('.prose p')
    const seriesRow = document.querySelector('.series-toc li a')
    if (paragraph) paragraph.append(` ${token}`)
    if (seriesRow) seriesRow.append(token)
    return doc.scrollWidth - doc.clientWidth
  })
  expect(grew).toBeLessThanOrEqual(0)
})

/** A preview card is a hovering-pointer affordance and never reaches a phone. */
test.describe('hover previews on touch', () => {
  test.use({ viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true })

  const POST = '/en/cryptography-0-essential-concepts/'

  test('a long press on a post link opens no card', async ({ page }) => {
    await page.goto(POST, { waitUntil: 'networkidle' })
    await expect(page.locator('article a[aria-expanded]')).toHaveCount(0)

    const link = page.locator('article a[href^="/en/"]').first()
    await link.scrollIntoViewIfNeeded()
    await link.evaluate((el) => {
      const rect = el.getBoundingClientRect()
      el.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          pointerType: 'touch',
          clientX: rect.x + rect.width / 2,
          clientY: rect.y + rect.height / 2,
        }),
      )
    })
    await page.waitForTimeout(900)
    await expect(page.locator('.hp-card')).toHaveCount(0)
  })

  test('a card pinned on a wider window does not come back', async ({ page }) => {
    await page.addInitScript(() => {
      const card = { href: `${location.origin}/en/security/`, left: 900, top: 40, docked: false }
      localStorage.setItem('hp-pinned', JSON.stringify([card]))
    })
    await page.goto(POST, { waitUntil: 'networkidle' })
    await expect(page.locator('.hp-card')).toHaveCount(0)
    await expect(page.locator('.hp-dock')).toHaveCount(0)
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
  })
})

test('search returns results on the built site', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 850 })
  await page.goto('/en/search/?q=typescript', { waitUntil: 'networkidle' })
  await expect(page.locator('a[href*="typescript"]').first()).toBeVisible({ timeout: 10000 })
})
