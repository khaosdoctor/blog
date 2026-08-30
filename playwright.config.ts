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
    // --force because .astro/ is a CI cache: a run that ended without stopping
    // its preview leaves preview.json behind, and the next run restores that
    // lock and refuses to start. reuseExistingServer means this only runs when
    // nothing is answering on the port, so the lock it replaces is always stale.
    command: 'npm run preview -- --port 4322 --force',
    url: 'http://localhost:4322',
    reuseExistingServer: true,
  },
})
