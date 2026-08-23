import { expect, test } from '@playwright/test'

const POST = '/theme-lab-arquivo/'

test('the initial HTML carries no demo source', async ({ request }) => {
  const html = await (await request.get(POST)).text()
  expect(html).not.toContain('TITLE_SIZE_OPTIONS')
  expect(html).toContain('href="/lab-source/theme-lab-arquivo/components/CoverLab.vue.html"')
})

test('clicking the reveal shows that one source, highlighted, with line numbers', async ({ page }) => {
  await page.goto(POST, { waitUntil: 'networkidle' })
  const link = page.locator('a[href="/lab-source/theme-lab-arquivo/components/CoverLab.vue.html"]')
  await expect(link).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('.lab-source-code')).toHaveCount(0)

  await link.click()
  const revealed = page.locator('.lab-source-code').first()
  await expect(revealed.locator('.expressive-code')).toBeVisible()
  await expect(revealed.locator('.ec-line .ln').first()).toHaveText('1')
  await expect(revealed.locator('.ec-line .ln').nth(1)).toHaveText('2')
  await expect(revealed).toContainText('TITLE_SIZE_OPTIONS')
  await expect(link).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('.lab-source-code')).toHaveCount(1)

  await link.click()
  await expect(revealed).toBeHidden()
  await expect(link).toHaveAttribute('aria-expanded', 'false')
})

/*
 * Expressive-code only ships its copy handler on a page that already has a
 * fenced block, so a revealed panel must carry its own control rather than
 * inheriting one that may not be there.
 */
test('the revealed source copies without expressive-code’s own handler', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto(POST, { waitUntil: 'networkidle' })
  await page.locator('a[href="/lab-source/theme-lab-arquivo/components/TmHeading.vue.html"]').click()

  const panel = page.locator('.lab-source-code').first()
  const copy = panel.locator('.lab-source-copy')
  await expect(copy, 'the panel brought no copy control of its own').toHaveCount(1)
  await expect(panel.locator('.copy'), 'expressive-code’s control was left in place too').toHaveCount(0)

  await copy.click()
  await expect(page.locator('.toast')).toBeVisible()

  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied.split('\n').length).toBeGreaterThan(20)
  expect(copied).toContain('<template>')
  // The gutter shares `pre > code` with the source, so a naive copy pastes the
  // line numbers too.
  expect(copied.split('\n')[0], 'the line number came along').not.toMatch(/^\d/)
})

test.describe('with no javascript', () => {
  test.use({ javaScriptEnabled: false })

  test('the reveal is a link to the source page', async ({ page }) => {
    await page.goto(POST)
    await page.locator('a[href="/lab-source/theme-lab-arquivo/components/CoverLab.vue.html"]').click()
    await expect(page).toHaveURL('/lab-source/theme-lab-arquivo/components/CoverLab.vue.html')
    await expect(page.locator('.expressive-code')).toBeVisible()
    await expect(page.locator('.ec-line .ln').first()).toHaveText('1')
    await expect(page.locator('a[href="/theme-lab-arquivo/"]')).toBeVisible()
  })
})
