import { HREFLANG, type Locale, localePath, t } from '../i18n/ui'
import { LIGHT_GROUND } from './grounds.ts'

// `scope` must stay at the site root for every locale, so crossing languages
// inside an installed app does not open a browser tab.
export function buildManifest(locale: Locale): string {
  return JSON.stringify(
    {
      name: t(locale, 'appName'),
      short_name: t(locale, 'appShortName'),
      description: t(locale, 'appDescription'),
      lang: HREFLANG[locale],
      start_url: localePath(locale, '/'),
      scope: '/',
      display: 'standalone',
      // A manifest holds one colour for both schemes, and the splash screen
      // should not be the black one.
      background_color: LIGHT_GROUND,
      theme_color: LIGHT_GROUND,
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
      // form_factor drives which shot Chrome's richer install UI shows on
      // desktop vs. mobile; without both it silently drops the richer UI.
      screenshots: [
        { src: '/screenshots/desktop-wide.png', sizes: '1280x800', type: 'image/png', form_factor: 'wide' },
        { src: '/screenshots/mobile-narrow.png', sizes: '390x844', type: 'image/png' },
      ],
    },
    null,
    2,
  )
}

export const MANIFEST_HEADERS = {
  'content-type': 'application/manifest+json; charset=utf-8',
}
