import { expect, type Page } from '@playwright/test'

/** The post the code-block tests read: long, many languages, both frame kinds. */
export const POST = '/en/everything-about-node-running-typescript-natively/'

export async function pickCodeTheme(page: Page, theme: string): Promise<void> {
  await page.evaluate((name) => {
    const select = document.querySelector<HTMLSelectElement>('#ct-theme')
    if (select === null) throw new Error('the code theme picker is not on the page')
    select.value = name
    select.dispatchEvent(new Event('change', { bubbles: true }))
  }, theme)
  await expect(page.locator('html')).toHaveAttribute('data-code-theme', theme)
}
