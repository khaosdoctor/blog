interface EmbedProvider {
  component: string
  frame?: string[]
  script?: string[]
  connect?: string[]
  /** Appears in the output but executes nothing: the guard accepts these, the CSP grants them nothing. */
  referenced?: string[]
  note?: string
}

const EMBED_PROVIDERS: EmbedProvider[] = [
  {
    component: 'YouTube',
    frame: ['www.youtube-nocookie.com', 'www.youtube.com'],
    script: ['www.youtube.com'],
    referenced: ['i.ytimg.com', 'www.youtube-nocookie.com'],
    note: 'The facade is a thumbnail plus a click handler; the player URL it builds is a frame, not a script.',
  },
  {
    component: 'YouTube facade',
    referenced: ['www.google.com', 'googleads.g.doubleclick.net', 'static.doubleclick.net'],
    note: "astro-embed's facade preconnects to Google's ad network. Nothing executes until a reader presses play, and script-src grants these nothing, but the contact is real and it is not a choice this site made. Removing it means replacing that component.",
  },
  {
    component: 'Vimeo',
    frame: ['player.vimeo.com'],
    referenced: ['vumbnail.com', 'i.vimeocdn.com', 'f.vimeocdn.com', 'fresnel.vimeocdn.com', 'player.vimeo.com'],
    note: 'Thumbnails and the frame URL its facade assembles. Nothing here runs script.',
  },
  {
    component: 'Tweet',
    frame: ['platform.twitter.com'],
    script: ['platform.twitter.com'],
    note: 'widgets.js upgrades the cached quote in place. With it blocked the reader still gets the quote and a link.',
  },
  {
    component: 'RawEmbed',
    frame: ['cdn.embedly.com'],
    note: 'Two embeds from the Ghost export that have no first-class component.',
  },
  { component: 'SpeakerDeck', frame: ['speakerdeck.com'] },
  { component: 'Spotify', frame: ['open.spotify.com'] },
  {
    component: 'Cloudflare Web Analytics',
    script: ['static.cloudflareinsights.com'],
    connect: ['static.cloudflareinsights.com'],
    note: 'Cookieless, and only emitted when PUBLIC_CF_ANALYTICS_TOKEN is set.',
  },
]

function hostsFor(...keys: Array<'frame' | 'script' | 'connect' | 'referenced'>): string[] {
  const hosts = keys.flatMap((key) => EMBED_PROVIDERS.flatMap((provider) => provider[key] ?? []))
  return [...new Set(hosts)].sort()
}

export const FRAME_HOSTS = hostsFor('frame')
export const SCRIPT_HOSTS = hostsFor('script')
const CONNECT_HOSTS = hostsFor('connect')

/** Wider than any CSP directive on purpose, and still an allowlist. */
export const MENTIONABLE_HOSTS = hostsFor('frame', 'script', 'connect', 'referenced')

const https = (hosts: string[]): string => hosts.map((host) => `https://${host}`).join(' ')

// GitHub Pages cannot set headers, so this goes in a meta tag. `unsafe-inline` covers the service
// worker registration and the JSON-LD blocks; dropping it needs hashes or a real header.
export function contentSecurityPolicy(): string {
  return [
    "default-src 'self'",
    // 'wasm-unsafe-eval' is required by Pagefind's WASM module. It permits WASM
    // only, not eval().
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' ${https(SCRIPT_HOSTS)}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    `connect-src 'self' ${https(CONNECT_HOSTS)}`,
    // 'self' is for public/labs/: a same-origin iframe keeps a demo's scripts
    // and styles away from the post around it.
    `frame-src 'self' ${https(FRAME_HOSTS)}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}
