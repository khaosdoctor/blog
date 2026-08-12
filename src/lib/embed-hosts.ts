/**
 * Every third party this site may talk to, and why. One registry, two consumers:
 * the CSP meta tag in BaseLayout.astro and the frame/script allowlists in
 * scripts/check-output.ts. Before this existed a host had to be added in both
 * places, and missing one failed silently in a different way each time: missing
 * from the CSP meant a blocked embed with nothing in the build log, missing from
 * the guard meant an unguarded frame.
 *
 * This is deliberately NOT derived from the built output. An allowlist that
 * grows to fit whatever frame appears in a page would let anything that can
 * write a frame grant itself permission, which is the failure the previous site
 * had. Adding a provider here is a reviewed edit; the build tells you when one
 * is needed.
 *
 * `component` names the thing that emits it, so the registry reads as a map of
 * the embed pipeline: see src/plugins/remark-embeds.mjs.
 */
export interface EmbedProvider {
  /** Component or feature that produces this traffic. */
  component: string
  /** Hosts allowed in an <iframe>. Becomes `frame-src`. */
  frame?: string[]
  /**
   * Hosts allowed to serve and run JavaScript. Becomes `script-src`, so this is
   * the narrowest list and the one to think hardest about.
   */
  script?: string[]
  /** Hosts allowed as a fetch/XHR/beacon target. Becomes `connect-src`. */
  connect?: string[]
  /**
   * Hosts that legitimately appear in the output without executing anything:
   * thumbnails, preconnect hints, and URLs a facade assembles inside its own
   * script before the reader clicks. The guard accepts these; the CSP grants
   * them nothing, which is the point of keeping them separate.
   */
  referenced?: string[]
  /** Why these hosts are here, when it is not obvious. */
  note?: string
}

export const EMBED_PROVIDERS: EmbedProvider[] = [
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
export const CONNECT_HOSTS = hostsFor('connect')

/**
 * What a URL inside the output may point at without failing the guard: anything
 * granted above, plus the hosts that only ever get mentioned. Wider than any CSP
 * directive on purpose, and still an allowlist.
 */
export const MENTIONABLE_HOSTS = hostsFor('frame', 'script', 'connect', 'referenced')

const https = (hosts: string[]): string => hosts.map((host) => `https://${host}`).join(' ')

/**
 * GitHub Pages cannot set headers, so this goes in a meta tag. `unsafe-inline`
 * for script covers the service worker registration and the JSON-LD blocks;
 * dropping it needs either hashes or a real header, so it stays for now.
 */
export function contentSecurityPolicy(): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${https(SCRIPT_HOSTS)}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    `connect-src 'self' ${https(CONNECT_HOSTS)}`,
    `frame-src ${https(FRAME_HOSTS)}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}
