import { defineConfig } from '@playwright/test'

/**
 * Runs against the built site: the Pagefind index and the real CSP only exist
 * in dist/, so `astro dev` would test a different site. Reuses a preview
 * server you already have on 4322; starts one (without rebuilding) if not.
 * Run `npm run build` first when src/ changed.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  // These pages are static and small, so a worker spends its time waiting on
  // navigation rather than on a core. Half the cores, the default, left most of
  // them idle.
  workers: '100%',
  use: {
    baseURL: 'http://localhost:4322',
    channel: 'chrome',
  },
  webServer: {
    command: 'npm run preview -- --port 4322',
    url: 'http://localhost:4322',
    reuseExistingServer: true,
  },
})
