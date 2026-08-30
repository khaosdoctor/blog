import { test, expect, type Page } from '@playwright/test'

/**
 * The mobile ruler: every page type, both languages, at the common phone and
 * tablet widths. Two invariants: the page never scrolls sideways, and every
 * always-visible control is tappable at 44x44 CSS px.
 *
 * The tap-target and note tests below run in one language on purpose. They
 * measure layout the two trees share to the pixel, and a second copy would
 * only cost a page load.
 */

const PHONE_WIDTHS = [360, 393, 430]
const TABLET_WIDTHS = [768, 834, 1024]
const ALL_WIDTHS = [...PHONE_WIDTHS, ...TABLET_WIDTHS]

/*
 * Grouped by language because lang-preference.ts sends a reader to the tree
 * their browser asks for: an en-US context loading `/` is redirected to `/en/`
 * before anything renders, so a Portuguese page can only be reached from a
 * Portuguese browser. The `lang` assertion below is what makes that visible;
 * without it these tests measure the redirect target and pass.
 */
const PAGES = {
  pt: [
    { name: 'home pt', path: '/' },
    { name: 'post with series pt', path: '/um-mergulho-em-imagens-de-containers-parte-1/' },
    { name: 'series pt', path: '/series/' },
    { name: 'tags pt', path: '/tags/' },
    { name: 'search pt', path: '/search/' },
    // One 404 answers for the whole host, so it renders in the source language.
    { name: '404', path: '/definitely-not-a-page/' },
  ],
  en: [
    { name: 'home en', path: '/en/' },
    { name: 'post with series en', path: '/en/a-deep-dive-into-container-images-part-1/' },
    { name: 'series en', path: '/en/series/' },
    { name: 'tags en', path: '/en/tags/' },
    { name: 'search en', path: '/en/search/' },
  ],
}

/** The browser locale that reaches each tree without being redirected away. */
const BROWSER_LOCALE = { pt: 'pt-BR', en: 'en-GB' }

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const doc = document.documentElement
    return doc.scrollWidth - doc.clientWidth
  })
}

/*
 * One load per page, widening through the list, rather than a load per pair:
 * the site relays out on resize, and forty-eight navigations cost minutes for
 * coverage a resize gives. The load happens at the narrowest width, which is
 * where an overflow that only appears on a cold layout would show.
 */
for (const [lang, pages] of Object.entries(PAGES)) {
  test.describe(`${lang} tree`, () => {
    test.use({ locale: BROWSER_LOCALE[lang as keyof typeof BROWSER_LOCALE] })

    for (const { name, path } of pages) {
      test(`${name} never scrolls sideways`, async ({ page }) => {
        await page.setViewportSize({ width: ALL_WIDTHS[0], height: 850 })
        await page.goto(path)
        await expect(page.locator('html')).toHaveAttribute('lang', lang)

        for (const width of ALL_WIDTHS) {
          await page.setViewportSize({ width, height: 850 })
          await expect
            .poll(() => horizontalOverflow(page), { timeout: 2000, message: `${name} at ${width}px` })
            .toBeLessThanOrEqual(0)
        }
      })
    }

    test(`search returns results on the built site (${lang})`, async ({ page }) => {
      await page.setViewportSize({ width: 393, height: 850 })
      await page.goto(`${lang === 'pt' ? '/search/' : '/en/search/'}?q=typescript`)
      await expect(page.locator('a[href*="typescript"]').first()).toBeVisible({ timeout: 10000 })
    })
  })
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
    await page.goto(path)
    const box = await page.locator(selector).first().boundingBox()
    expect(box, `${selector} not found on ${path}`).not.toBeNull()
    expect(box!.width, `${selector} width`).toBeGreaterThanOrEqual(minWidth)
    expect(box!.height, `${selector} height`).toBeGreaterThanOrEqual(minHeight)
  })
}

test('hamburger opens the drawer with nav links at 393px', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 850 })
  await page.goto('/en/')
  await expect(page.locator('.nav-links')).toBeHidden()
  await page.click('.menu-toggle')
  await expect(page.locator('.nav-links a', { hasText: 'SERIES' })).toBeVisible()
})

test('the toc tab slides the outline in at 393px', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 850 })
  await page.goto('/en/a-deep-dive-into-container-images-part-1/')
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
  await page.goto('/en/a-deep-dive-into-container-images-part-1/')
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
    await page.goto(POST)
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
    // Short on purpose: previews bind behind `(hover: hover) and (pointer: fine)`,
    // so on touch there is no timer to outlast, only the dispatch to settle.
    await page.waitForTimeout(250)
    await expect(page.locator('.hp-card')).toHaveCount(0)
  })

  test('a card pinned on a wider window does not come back', async ({ page }) => {
    await page.addInitScript(() => {
      const card = { href: `${location.origin}/en/security/`, left: 900, top: 40, docked: false }
      localStorage.setItem('hp-pinned', JSON.stringify([card]))
    })
    await page.goto(POST)
    await expect(page.locator('.hp-card')).toHaveCount(0)
    await expect(page.locator('.hp-dock')).toHaveCount(0)
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
  })
})

test.describe('notes on touch', () => {
  test.use({ viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true })

  test('the marker opens the note as a panel at the bottom edge', async ({ page }) => {
    await page.goto('/lab/')
    const toggle = page.locator('#sidenote-1 .note-toggle')
    const panel = page.locator('#sidenote-1 .note-text')

    await page.locator('#sidenote-1 .note-marker').tap()
    await expect(toggle).toBeChecked()

    // Polled: the panel is mid-slide right after the tap.
    await expect
      .poll(async () => {
        const box = await panel.boundingBox()
        return box ? Math.round(box.y + box.height) : -1
      })
      .toBe(780)

    const box = await panel.boundingBox()
    expect(box!.x).toBe(0)
    expect(box!.width).toBe(360)
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)

    await page.touchscreen.tap(8, 200)
    await expect(toggle).not.toBeChecked()
  })
})

