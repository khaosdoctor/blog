import { t, type Locale } from '../i18n/ui'

// `scope` must stay at the site root for every locale, so crossing languages
// inside an installed app does not open a browser tab.
export function buildManifest(locale: Locale): string {
  return JSON.stringify(
    {
      name: t(locale, 'appName'),
      short_name: t(locale, 'appShortName'),
      description: t(locale, 'appDescription'),
      lang: locale === 'en' ? 'en' : 'pt-BR',
      start_url: locale === 'en' ? '/en/' : '/',
      scope: '/',
      display: 'standalone',
      // The light --bg from theme.css: a manifest holds one colour for both
      // schemes, and the splash screen should not be the black one.
      background_color: '#f4efe0',
      theme_color: '#f4efe0',
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
