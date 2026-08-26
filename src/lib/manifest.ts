import { HREFLANG, localePath, t, type Locale } from '../i18n/ui'
import { LIGHT_GROUND } from './grounds.mjs'

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
    },
    null,
    2,
  )
}

export const MANIFEST_HEADERS = {
  'content-type': 'application/manifest+json; charset=utf-8',
}
