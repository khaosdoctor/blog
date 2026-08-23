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
