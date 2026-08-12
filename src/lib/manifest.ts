import { t, type Locale } from '../i18n/ui'

/**
 * The manifest used to be a static file in public/, which meant an English
 * reader installing the app got a Portuguese description. It is generated per
 * locale now: BaseLayout links the one matching the page.
 *
 * `scope` stays at the site root for both, so navigating from an installed
 * English app into a Portuguese post stays inside the app instead of opening a
 * browser tab. Only `start_url` and the copy differ.
 */
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
      background_color: '#fffdf9',
      theme_color: '#fffdf9',
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
