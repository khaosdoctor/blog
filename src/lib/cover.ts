/**
 * The post cover: "capa · wireframe 3D", the candidate Lucas picked in the
 * theme lab (content/blog/theme-lab/components/CoverLab.vue, read-only
 * reference, do not port from it again once this file exists). A real
 * `<svg viewBox="0 0 1200 630">`, not canvas, not WebGL: `scripts/cover.ts`
 * feeds the exact string this file builds to `sharp` at build time, and
 * `src/scripts/cover-hero.ts` drops the same string into the page's DOM on
 * load. One implementation, two callers, so the built PNG and the drawn
 * hero can never draw a different cover for the same post.
 *
 * Colour, seed and solid all come from `hashSlug(post.slug)` plus a fixed
 * salt, never `Math.random()`, so a post's cover is stable across rebuilds
 * and the social-card cache does not break every time the site builds.
 *
 * The knobs below are the lab's sliders baked to the values Lucas decided
 * on (docs/decisions-log.md once that entry ships): wireframe density 6px,
 * wireframe opacity 145%, the solid cursor on, and purple's own "% of the
 * brand kept" knob at 90% (`color-mix(in oklab, #4b15a8 90%, white)` =
 * #5937b3, 2.62:1 on black, which fails 4.5:1 on purpose. The lab's own
 * notes say why: an automatic floor sent purple "too dark" three times, so
 * this stays a per-brand number a human set, not a loop deciding on its
 * own). No other brand's knob was touched, so the rest keep the lab's own
 * default of 100%, full colour, no mix.
 */

export const CARD_W = 1200
export const CARD_H = 630

const TITLE_FONT = "'Departure Mono', ui-monospace, monospace"
const LABEL_FONT = "'PxPlus IBM VGA8', ui-monospace, monospace"
const SITE_KICKER_HOST = 'BLOG.LSANTOS.DEV'

// --- hash + PRNG -----------------------------------------------------------
// Small, deterministic, no dependency: the only job is to spread slugs across
// the brand pool and the solid's shape stably. Same slug, same number, always.
export function hashSlug(slug: string): number {
  let hash = 0
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash
}

// mulberry32, public domain: a seed in, a function that draws numbers in
// [0, 1) out, always the same sequence for the same seed.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// --- colour: sRGB <-> OKLab, just enough to mix a brand colour toward white
// the way `color-mix(in oklab, …)` would, for the literal hex an SVG needs
// baked in at build time (there is no live custom property to recompute here).
type Rgb = [number, number, number]

function parseHex(hex: string): Rgb {
  const clean = hex.replace('#', '')
  return [0, 2, 4].map((i) => Number.parseInt(clean.slice(i, i + 2), 16)) as Rgb
}

function toHex([r, g, b]: Rgb): string {
  const part = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
  return `#${part(r)}${part(g)}${part(b)}`
}

function composite(over: Rgb, under: Rgb, alpha: number): Rgb {
  return under.map((channel, i) => over[i] * alpha + channel * (1 - alpha)) as Rgb
}

function srgbChannelToLinear(c: number): number {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function linearChannelToSrgb(c: number): number {
  const s = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055
  return s * 255
}

function rgbToOklab([r, g, b]: Rgb): Rgb {
  const lr = srgbChannelToLinear(r)
  const lg = srgbChannelToLinear(g)
  const lb = srgbChannelToLinear(b)
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb
  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)
  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ]
}

function oklabToRgb([L, a, b]: Rgb): Rgb {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const b2 = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  return [linearChannelToSrgb(r), linearChannelToSrgb(g), linearChannelToSrgb(b2)]
}

function mixOklab(over: Rgb, under: Rgb, overPercent: number): Rgb {
  const t = overPercent / 100
  const a = rgbToOklab(over)
  const b = rgbToOklab(under)
  return oklabToRgb([a[0] * t + b[0] * (1 - t), a[1] * t + b[1] * (1 - t), a[2] * t + b[2] * (1 - t)])
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// --- brand + the decided knobs ---------------------------------------------
interface Brand {
  id: string
  hex: string
}

const BRAND_COLORS: Brand[] = [
  { id: 'vermelho', hex: '#e30613' },
  { id: 'verde', hex: '#45b384' },
  { id: 'amarelo', hex: '#f5b200' },
  { id: 'azul', hex: '#0578be' },
  { id: 'roxo', hex: '#4b15a8' },
]

const DARK_BG = '#000000'
const DARK_SHADOW = '#050505'
const SHADOW_OFFSET = 3
const TITLE_INK = '#e6e4e0'
const BYLINE_OPACITY = 0.75
const DIMMED_WHITE = toHex(composite(parseHex(TITLE_INK), parseHex(DARK_BG), BYLINE_OPACITY))

// White and dimmed white are two more entries the hash can draw for "brand
// colour", same as the lab: no saturation, no % knob (nothing to mix).
const BRANDS: Brand[] = [...BRAND_COLORS, { id: 'branco', hex: TITLE_INK }, { id: 'branco-apagado', hex: DIMMED_WHITE }]

// Every brand's own knob starts at the lab's default (100%, full colour); only
// purple's was pulled down, per the derivation in this file's header comment.
// Do not add a floor here and do not let this resolve itself: that is the one
// thing the lab's notes ask future edits not to do.
const INK_MIX: Record<string, number> = { vermelho: 100, verde: 100, amarelo: 100, azul: 100, roxo: 90 }

/**
 * The same brand, named as the CSS custom property theme.css already tunes
 * per ground. The SVG needs a literal hex because it always paints on its own
 * black card (`DARK_BG`); the page needs a token because a highlight has to
 * work on `--bg` in both themes, and theme.css has already measured each of
 * these five for exactly that. Handing the page the card's hex instead would
 * take the brand off its per-ground tone and drop the measurements with it:
 * the card's yellow is #f5b200, chosen against black, and 85% of that over
 * black on the sepia ground reads far lighter than `--brand-yellow`'s own
 * light tone (#ac7d00) that prose/emphasis.css scanned. The hue is the same
 * either way, which is the whole complaint being fixed; only the lightness is
 * allowed to follow the ground it is painted on.
 *
 * The two neutrals have no brand token, and they cannot borrow one: a cover
 * that draws white draws white BECAUSE the hash picked "no colour", and the
 * page's own neutral per ground is its ink rather than a hue. `branco` maps
 * to `--fg` and `branco-apagado` to `--muted`, the same pairing the card
 * makes (full white for the title ink, white at 75% for the byline), just
 * resolved against `--bg` instead of black, so a neutral post reads as a
 * black highlight on the sepia ground and a white one on the black ground
 * rather than white-on-white. Through prose/emphasis.css's own mix those
 * measure 16.99:1 light / 18.74:1 dark for `--fg` and 7.15 / 8.75 for
 * `--muted`, both well clear of the 4.5:1 that file's table holds to.
 */
const BRAND_TOKENS: Record<string, string> = {
  vermelho: 'var(--brand-red)',
  verde: 'var(--brand-green)',
  amarelo: 'var(--brand-yellow)',
  azul: 'var(--brand-blue)',
  roxo: 'var(--brand-purple)',
  branco: 'var(--fg)',
  'branco-apagado': 'var(--muted)',
}

const SEED_SALT = 65
const WIRE_DENSITY = 6
const WIRE_OPACITY_SCALE = 145
const CURSOR = true

/** The one number a slug turns into. Colour and solid both read this. */
function coverSeed(slug: string): number {
  return (hashSlug(slug) + SEED_SALT) >>> 0
}

export interface CoverTone {
  /** The brand the hash drew, by the lab's own name: `roxo`, `branco`, ... */
  id: string
  /** The literal colour the card paints, already through that brand's `INK_MIX`. */
  hex: string
  /** The same brand as a theme.css custom property, see `BRAND_TOKENS`. */
  token: string
}

/**
 * A post's colour, the only derivation of it there is.
 *
 * There used to be two. The card resolved its own brand here, out of seven
 * entries, off a salted `hash * 31 + charCode`; the article element wrote
 * `--post-accent` from `chipColor(slug)`, out of five `var(--brand-*)`
 * tokens, off a sum of code points. Two hashes over two pools can only agree
 * by luck, and for `criptografia-assimetrica-com-rsa` they did not: the card
 * drew purple and every `<strong>` in the post came out red. The card's own
 * pick wins, since that is the colour a reader has already seen at the top of
 * the page by the time any bold text arrives, and everything else reads this.
 *
 * This is the cover's colour, so it follows the cover's split: bold, italic
 * and the other text treatments (prose/emphasis.css) read this; links, hovers
 * and anything else transient stay on the day colour (`--accent-day`,
 * day-color.ts, prose/links.css). Do not move a link onto this.
 */
export function coverTone(slug: string): CoverTone {
  const brand = BRANDS[coverSeed(slug) % BRANDS.length]
  const isNeutral = brand.id === 'branco' || brand.id === 'branco-apagado'
  const hex = isNeutral
    ? brand.hex
    : toHex(mixOklab(parseHex(brand.hex), parseHex('#ffffff'), INK_MIX[brand.id] ?? 100))
  return { id: brand.id, hex, token: BRAND_TOKENS[brand.id] }
}

// --- the generated solid ----------------------------------------------------
// A ring of N sides stacked M times, tips optionally closed: the same shape
// that produces a cube, a hex prism, an octahedron or a tetrahedron, just by
// varying the numbers the hash draws, rather than picking from a fixed list.
type Vec3 = [number, number, number]

interface SolidParams {
  sides: number
  ringCount: number
  topClose: boolean
  bottomClose: boolean
  taper: number
  brace: boolean
  yaw: number
  pitch: number
  roll: number
}

interface GeneratedSolid {
  vertices: Vec3[]
  edges: Array<[number, number]>
  params: SolidParams
}

function generateSolidParams(rng: () => number): SolidParams {
  const sides = 3 + Math.floor(rng() * 6)
  const ringCount = 1 + Math.floor(rng() * 3)
  let topClose = rng() < 0.5
  let bottomClose = rng() < 0.5
  if (ringCount === 1 && !topClose && !bottomClose) topClose = true
  const taper = 0.55 + rng() * 0.45
  const brace = rng() < 0.45
  const yaw = rng() * Math.PI * 2
  const pitch = rng() * Math.PI * 2
  const roll = rng() * Math.PI * 2
  return { sides, ringCount, topClose, bottomClose, taper, brace, yaw, pitch, roll }
}

function generateSolid(rng: () => number): GeneratedSolid {
  const params = generateSolidParams(rng)
  const { sides, ringCount, topClose, bottomClose, taper } = params

  let ringYs: number[]
  if (ringCount === 1) {
    if (topClose && bottomClose) ringYs = [0]
    else if (topClose) ringYs = [-1]
    else ringYs = [1]
  } else {
    ringYs = Array.from({ length: ringCount }, (_, i) => -1 + (2 * i) / (ringCount - 1))
  }

  const vertices: Vec3[] = []
  const edges: Array<[number, number]> = []
  const ringIndices: number[][] = []
  for (const y of ringYs) {
    const radius = 1 + (taper - 1) * ((y + 1) / 2)
    const indices: number[] = []
    for (let s = 0; s < sides; s++) {
      const angle = (s / sides) * Math.PI * 2
      indices.push(vertices.length)
      vertices.push([Math.cos(angle) * radius, y, Math.sin(angle) * radius])
    }
    ringIndices.push(indices)
    for (let s = 0; s < sides; s++) edges.push([indices[s], indices[(s + 1) % sides]])
  }
  for (let r = 0; r < ringIndices.length - 1; r++) {
    for (let s = 0; s < sides; s++) {
      edges.push([ringIndices[r][s], ringIndices[r + 1][s]])
      if (params.brace) edges.push([ringIndices[r][s], ringIndices[r + 1][(s + 1) % sides]])
    }
  }
  if (topClose) {
    const apexIdx = vertices.length
    vertices.push([0, ringCount === 1 ? 1 : 1.3, 0])
    for (const idx of ringIndices[ringIndices.length - 1]) edges.push([apexIdx, idx])
  }
  if (bottomClose) {
    const apexIdx = vertices.length
    vertices.push([0, ringCount === 1 ? -1 : -1.3, 0])
    for (const idx of ringIndices[0]) edges.push([apexIdx, idx])
  }
  return { vertices, edges, params }
}

function rotate3(v: Vec3, yaw: number, pitch: number, roll: number): Vec3 {
  let [x, y, z] = v
  const x1 = x * Math.cos(yaw) + z * Math.sin(yaw)
  const z1 = -x * Math.sin(yaw) + z * Math.cos(yaw)
  x = x1
  z = z1
  const y1 = y * Math.cos(pitch) - z * Math.sin(pitch)
  const z2 = y * Math.sin(pitch) + z * Math.cos(pitch)
  y = y1
  z = z2
  const x2 = x * Math.cos(roll) - y * Math.sin(roll)
  const y2 = x * Math.sin(roll) + y * Math.cos(roll)
  x = x2
  y = y2
  return [x, y, z]
}

function projectPerspective(v: Vec3, cx: number, cy: number, scale: number, camDist: number) {
  const [x, y, z] = v
  const factor = camDist / (camDist + z)
  return { x: cx + x * factor * scale, y: cy + y * factor * scale, z }
}

const WIRE_CENTER = { x: 900, y: 335 }
const WIRE_RADIUS = 130
const WIRE_CAM_DIST = 4.5
const WIRE_OPACITY_FLOOR = 0.12
const WIRE_OPACITY_RANGE = 0.35

interface WireCell {
  x: number
  y: number
  closeness: number
}

// Each edge is sampled into points snapped to a `WIRE_DENSITY`px grid, one "+"
// glyph per cell: a mesh of characters, not a smooth vector stroke. Depth
// (the rotated Z, before perspective) drives size and opacity, so the near
// side of the solid reads solid and the far side reads faint, same idea as
// hidden edges still drawn, just weak. When two edges round to the same
// cell, whichever is closer to the camera wins, since that is the one that
// would actually be in front.
function buildWireCells(solid: GeneratedSolid): WireCell[] {
  const step = WIRE_DENSITY
  const rotated = solid.vertices.map((v) => rotate3(v, solid.params.yaw, solid.params.pitch, solid.params.roll))
  const zs = rotated.map(([, , z]) => z)
  const zMin = Math.min(...zs)
  const zRange = Math.max(0.0001, Math.max(...zs) - zMin)
  const projected = rotated.map((v) => projectPerspective(v, WIRE_CENTER.x, WIRE_CENTER.y, WIRE_RADIUS, WIRE_CAM_DIST))
  const best = new Map<string, WireCell>()
  for (const [a, b] of solid.edges) {
    const p1 = projected[a]
    const p2 = projected[b]
    const length = Math.hypot(p2.x - p1.x, p2.y - p1.y)
    const steps = Math.max(1, Math.round(length / step))
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const x = p1.x + (p2.x - p1.x) * t
      const y = p1.y + (p2.y - p1.y) * t
      const z = p1.z + (p2.z - p1.z) * t
      const closeness = 1 - (z - zMin) / zRange
      const gx = Math.round(x / step) * step
      const gy = Math.round(y / step) * step
      const key = `${gx},${gy}`
      const existing = best.get(key)
      if (existing === undefined || closeness > existing.closeness) best.set(key, { x: gx, y: gy, closeness })
    }
  }
  return [...best.values()]
}

// --- the card: kicker, title, byline ----------------------------------------
const KICKER_SIZE = 22
const BYLINE_SIZE = 20
const LINE_HEIGHT_RATIO = 1.22
const MONO_ADVANCE = 0.62 // a monospace face's rough advance, in em
const WRAP_SAFETY = 0.92 // margin against that estimate being wrong

const BORDER_OUTER_INSET = 36
const BORDER_STROKE = 4
const BORDER_SPACING = 28
const BORDER_INNER_INSET = BORDER_OUTER_INSET + BORDER_STROKE + BORDER_SPACING
const CARD_PAD_X = 160
const CARD_PAD_Y = 140

function titleFontSize(length: number): number {
  if (length <= 30) return 66
  if (length <= 65) return 50
  return 38
}

function wrapTitle(text: string, maxWidth: number, fontSize: number): string[] {
  const maxChars = Math.max(6, Math.floor((maxWidth * WRAP_SAFETY) / (fontSize * MONO_ADVANCE)))
  const lines: string[] = []
  let current = ''
  for (const word of text.split(' ')) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines
}

interface Card {
  padX: number
  fontSize: number
  lines: string[]
  kickerY: number
  ruleY: number
  titleYs: number[]
  bylineY: number
}

function layoutCard(title: string): Card {
  const padX = CARD_PAD_X
  const padY = CARD_PAD_Y
  const fontSize = titleFontSize(title.length)
  const displayTitle = CURSOR ? `${title}.█` : title
  const lines = wrapTitle(displayTitle, CARD_W - padX * 2, fontSize)
  const lineHeight = fontSize * LINE_HEIGHT_RATIO
  const spaceAfterKicker = fontSize * 0.55
  const spaceBeforeByline = fontSize * 0.5
  const blockHeight =
    KICKER_SIZE * LINE_HEIGHT_RATIO +
    spaceAfterKicker +
    lines.length * lineHeight +
    spaceBeforeByline +
    BYLINE_SIZE * LINE_HEIGHT_RATIO
  const contentHeight = CARD_H - padY * 2
  const startY = padY + Math.max(0, (contentHeight - blockHeight) / 2)
  const kickerY = startY + KICKER_SIZE
  const titleStartY = kickerY + spaceAfterKicker + fontSize
  const titleYs = lines.map((_, index) => titleStartY + index * lineHeight)
  const bylineY = titleYs[titleYs.length - 1] + spaceBeforeByline + BYLINE_SIZE
  return { padX, fontSize, lines, kickerY, ruleY: kickerY + spaceAfterKicker * 0.5, titleYs, bylineY }
}

// --- byline date formatting --------------------------------------------------
const MONTHS: Record<'pt' | 'en', string[]> = {
  pt: ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'],
  en: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
}

/**
 * "Lucas Santos · 18 AGO 2026": the same shape as the lab's own byline, with
 * a real date and a real author instead of a fixture. Read with the UTC
 * getters, not the local ones, so the day printed on the cover does not
 * depend on which timezone happens to be running the build.
 */
export function formatCoverByline(date: Date, lang: 'pt' | 'en', authorName: string): string {
  const month = MONTHS[lang][date.getUTCMonth()]
  return `${authorName} · ${date.getUTCDate()} ${month} ${date.getUTCFullYear()}`
}

// --- assembly ----------------------------------------------------------------
export interface CoverInput {
  /** Hashed for colour, seed and solid. The post's own URL slug. */
  slug: string
  title: string
  category: string
  /** Already formatted, e.g. via `formatCoverByline`. */
  byline: string
}

function n(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Builds the cover as a literal SVG string, 1200x630. `scripts/cover.ts`
 * rasterises this with `sharp` at build; `src/scripts/cover-hero.ts` sets it
 * as a decorative container's `innerHTML` on load. Both read the exact same
 * function, so there is only ever one cover per post, not two that can drift
 * apart from each other.
 */
export function buildCoverSvg({ slug, title, category, byline }: CoverInput): string {
  const seed = coverSeed(slug)
  const { hex: brandTone } = coverTone(slug)

  const solid = generateSolid(mulberry32(seed))
  const wireCells = buildWireCells(solid)
  const card = layoutCard(title)
  const kickerText = `${SITE_KICKER_HOST} / ${category.toUpperCase()}`

  const wireGlyphs = wireCells
    .map((c) => {
      const opacity = Math.min(1, (WIRE_OPACITY_FLOOR + c.closeness * WIRE_OPACITY_RANGE) * (WIRE_OPACITY_SCALE / 100))
      const fontSize = 8 + c.closeness * WIRE_DENSITY
      return `<text x="${n(c.x)}" y="${n(c.y)}" font-size="${n(fontSize)}" opacity="${n(opacity)}">+</text>`
    })
    .join('')

  const outer = { x: BORDER_OUTER_INSET, y: BORDER_OUTER_INSET, w: CARD_W - BORDER_OUTER_INSET * 2, h: CARD_H - BORDER_OUTER_INSET * 2 }
  const inner = { x: BORDER_INNER_INSET, y: BORDER_INNER_INSET, w: CARD_W - BORDER_INNER_INSET * 2, h: CARD_H - BORDER_INNER_INSET * 2 }

  const shadowKicker = `<text x="${card.padX + SHADOW_OFFSET}" y="${n(card.kickerY + SHADOW_OFFSET)}" font-family="${LABEL_FONT}" font-size="${KICKER_SIZE}" letter-spacing="4" fill="${DARK_SHADOW}">${escapeXml(kickerText)}</text>`
  const shadowTitle = card.titleYs
    .map((y, i) => `<text x="${card.padX + SHADOW_OFFSET}" y="${n(y + SHADOW_OFFSET)}" font-family="${TITLE_FONT}" font-size="${card.fontSize}" fill="${DARK_SHADOW}">${escapeXml(card.lines[i])}</text>`)
    .join('')
  const shadowByline = `<text x="${card.padX + SHADOW_OFFSET}" y="${n(card.bylineY + SHADOW_OFFSET)}" font-family="${LABEL_FONT}" font-size="${BYLINE_SIZE}" letter-spacing="2" fill="${DARK_SHADOW}">${escapeXml(byline)}</text>`

  const kicker = `<text x="${card.padX}" y="${n(card.kickerY)}" font-family="${LABEL_FONT}" font-size="${KICKER_SIZE}" letter-spacing="4" fill="${brandTone}">${escapeXml(kickerText)}</text>`
  const rule = `<line x1="${card.padX}" y1="${n(card.ruleY)}" x2="${CARD_W - card.padX}" y2="${n(card.ruleY)}" stroke="${brandTone}" stroke-width="2" stroke-dasharray="10 6" opacity="0.7"/>`
  const titleLines = card.titleYs
    .map((y, i) => `<text x="${card.padX}" y="${n(y)}" font-family="${TITLE_FONT}" font-size="${card.fontSize}" fill="${TITLE_INK}">${escapeXml(card.lines[i])}</text>`)
    .join('')
  const bylineLine = `<text x="${card.padX}" y="${n(card.bylineY)}" font-family="${LABEL_FONT}" font-size="${BYLINE_SIZE}" letter-spacing="2" fill="${TITLE_INK}" opacity="${BYLINE_OPACITY}">${escapeXml(byline)}</text>`

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_W} ${CARD_H}">` +
    `<rect width="${CARD_W}" height="${CARD_H}" fill="${DARK_BG}"/>` +
    `<g font-family="${LABEL_FONT}" fill="${brandTone}" text-anchor="middle" dominant-baseline="central">${wireGlyphs}</g>` +
    `<rect x="${outer.x}" y="${outer.y}" width="${outer.w}" height="${outer.h}" fill="none" stroke="${brandTone}" stroke-width="${BORDER_STROKE}"/>` +
    `<rect x="${inner.x}" y="${inner.y}" width="${inner.w}" height="${inner.h}" fill="none" stroke="${brandTone}" stroke-width="3"/>` +
    shadowKicker +
    shadowTitle +
    shadowByline +
    kicker +
    rule +
    titleLines +
    bylineLine +
    `</svg>`
  )
}
