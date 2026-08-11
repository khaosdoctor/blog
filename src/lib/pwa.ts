// ponytail: no service worker yet (that's @vite-pwa/astro's job, not installed).
// This file only carries the two static facts BaseLayout/head markup will need
// once that lands: where the manifest lives and where offline visitors go.

interface ManifestLinkTag {
  rel: 'manifest'
  href: string
}

/**
 * Drop into <head> as <link {...manifestLink} /> once BaseLayout wires it up.
 *
 * The manifest references three PNGs that must exist in public/icons/ with
 * these exact names/sizes before this does anything in a real browser:
 *   - icon-192.png            192x192, purpose "any"
 *   - icon-512.png            512x512, purpose "any" (same art, scaled up)
 *   - icon-512-maskable.png   512x512, purpose "maskable" — keep the logo
 *     inside the inner ~80% safe zone, Android crops the rest into
 *     circles/squircles/rounded squares depending on device icon shape.
 * Source art should follow BaseLayout's palette (--bg / --fg / --accent) so
 * the installed app icon matches the site.
 */
export const manifestLink: ManifestLinkTag = {
  rel: 'manifest',
  href: '/manifest.webmanifest',
}

/** Route the future service worker should serve when a navigation fails offline. */
export const offlinePagePath = '/offline/'
