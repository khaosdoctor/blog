import { expect, type Page } from '@playwright/test'

/** The post the code-block tests read: long, many languages, both frame kinds. */
export const POST = '/en/everything-about-node-running-typescript-natively/'

/**
 * Sets the resolved code theme directly rather than through the picker: the
 * picker only offers Normal and High Contrast, each following the page
 * theme, so it cannot express an explicit pairing of the two that a test
 * wants to hold fixed.
 */
export async function pickCodeTheme(page: Page, theme: string): Promise<void> {
  await page.evaluate((name) => document.documentElement.setAttribute('data-code-theme', name), theme)
  await expect(page.locator('html')).toHaveAttribute('data-code-theme', theme)
}
