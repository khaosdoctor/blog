// The .ts extension is required: scripts/cover.ts runs this file through plain
// node, whose ESM resolver does not add one.
import { chipColor, hashString } from './chip-color.ts'

const CARD_W = 1200
const CARD_H = 630

const TITLE_FONT = "'Departure Mono', ui-monospace, monospace"
const LABEL_FONT = "'PxPlus IBM VGA8', ui-monospace, monospace"

// Deterministic: hashString(slug) + salt seeds this PRNG, so the same slug always
// redraws the same solid; changing the salt, hash or arithmetic redraws every cover.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// sRGB -> linear -> LMS -> cube root -> OKLab -> back.
// Mix after the cube root; mixing raw sRGB darkens the midpoint.
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
const DIM_OPACITY = 0.75
const DIMMED_WHITE = toHex(composite(parseHex(TITLE_INK), parseHex(DARK_BG), DIM_OPACITY))

const BRANDS: Brand[] = [...BRAND_COLORS, { id: 'branco', hex: TITLE_INK }, { id: 'branco-apagado', hex: DIMMED_WHITE }]

const INK_MIX: Record<string, number> = { vermelho: 100, verde: 100, amarelo: 100, azul: 100, roxo: 90 }

// The SVG needs a literal hex since it paints on its own black ground; the page needs a CSS token since
// the same accent must work over `--bg` in both themes. The two neutrals map to `--fg`/`--muted` instead.
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

function coverSeed(slug: string): number {
  return (hashString(slug) + SEED_SALT) >>> 0
}

interface CoverTone {
  id: string
  hex: string
  token: string
}

export function coverTone(slug: string): CoverTone {
  const brand = BRANDS[coverSeed(slug) % BRANDS.length]
  const isNeutral = brand.id === 'branco' || brand.id === 'branco-apagado'
  const hex = isNeutral
    ? brand.hex
    : toHex(mixOklab(parseHex(brand.hex), parseHex('#ffffff'), INK_MIX[brand.id] ?? 100))
  return { id: brand.id, hex, token: BRAND_TOKENS[brand.id] }
}

// Ring of `sides` vertices stacks `ringCount` times along Y, tapered, optionally
// apex-capped, with a diagonal brace per quad when `brace` is on.
// Model space: origin-centred, Y up; order is yaw, pitch, roll, then perspective
// divide by camDist/(camDist+z), then scale/translate into 1200x630 card coords.
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

// Each edge is walked in WIRE_DENSITY-px steps, sample snapped to that pixel grid,
// one "+" glyph per cell. closeness = rotated Z normalised across the solid's Z range
// (1 = nearest camera), driving glyph size/opacity. Nearer edge wins on cell collision.
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

const BYLINE_SIZE = 22
const META_SIZE = 20
const LINE_HEIGHT_RATIO = 1.22
const MONO_ADVANCE = 0.62
const WRAP_SAFETY = 0.92 // margin against that estimate being wrong

const BORDER_OUTER_INSET = 36
const BORDER_STROKE = 4
const BORDER_SPACING = 28
const BORDER_INNER_INSET = BORDER_OUTER_INSET + BORDER_STROKE + BORDER_SPACING
const CARD_PAD_X = 160
const CARD_PAD_Y = 140

// The chip reproduces chips.css's shape, scaled to this card's larger text. Keep these in step with
// chips.css, or the drawn chip and the real DOM chip the browser layers over the card stop matching.
const CHIP_SIZE = 17
const CHIP_PAD_X = 14
const CHIP_PAD_Y = 5
const CHIP_BORDER = 2
const CHIP_BORDER_SPACING = 2
const CHIP_LETTER_SPACING = 1
const META_LETTER_SPACING = 2
const META_SPACING = 14
const META_BOX_H = CHIP_SIZE + CHIP_PAD_Y * 2

// No text measurement at build time, so this glyph-advance guess sizes the chip box;
// unlike the looser MONO_ADVANCE, a wrong value here misfits the box outright.
const CHIP_ADVANCE = 0.6
// The chip box's top: a monospace face carries ~0.8em over its baseline.
const META_BOX_RISE = CHIP_SIZE * 0.8 + CHIP_PAD_Y

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

// Every Y here is a text BASELINE in viewBox units, not a box top.
interface Card {
  padX: number
  fontSize: number
  lines: string[]
  bylineY: number
  ruleY: number
  titleYs: number[]
  metaY: number
}

function layoutCard(title: string): Card {
  const padX = CARD_PAD_X
  const padY = CARD_PAD_Y
  const fontSize = titleFontSize(title.length)
  const displayTitle = CURSOR ? `${title}.█` : title
  const lines = wrapTitle(displayTitle, CARD_W - padX * 2, fontSize)
  const lineHeight = fontSize * LINE_HEIGHT_RATIO
  const spaceAfterByline = fontSize * 0.55
  const spaceBeforeMeta = fontSize * 0.85
  // The meta line reserves a box height, not a line height: the chip's rule
  // would otherwise hang below the padding.
  const blockHeight =
    BYLINE_SIZE * LINE_HEIGHT_RATIO + spaceAfterByline + lines.length * lineHeight + spaceBeforeMeta + META_BOX_H
  const contentHeight = CARD_H - padY * 2
  const startY = padY + Math.max(0, (contentHeight - blockHeight) / 2)
  const bylineY = startY + BYLINE_SIZE
  const titleStartY = bylineY + spaceAfterByline + fontSize
  const titleYs = lines.map((_, index) => titleStartY + index * lineHeight)
  const metaY = titleYs[titleYs.length - 1] + spaceBeforeMeta + META_SIZE
  return { padX, fontSize, lines, bylineY, ruleY: bylineY + spaceAfterByline * 0.5, titleYs, metaY }
}

const MONTHS: Record<'pt' | 'en', string[]> = {
  pt: ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'],
  en: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
}

// UTC getters, so the printed day does not depend on the build machine's zone.
export function formatCoverByline(date: Date, lang: 'pt' | 'en', authorName: string): string {
  const month = MONTHS[lang][date.getUTCMonth()]
  return `${authorName} / ${date.getUTCDate()} ${month} ${date.getUTCFullYear()}`
}

// theme.css's `--brand-*` tokens (dark branch) as literal hexes, since an SVG has no custom properties
// at build time and the card is always black. Must be kept in sync with theme.css by hand.
const CHIP_BRAND_DARK: Record<string, string> = {
  'var(--brand-red)': '#e6242f',
  'var(--brand-blue)': '#1480c2',
  'var(--brand-yellow)': '#f5b200',
  'var(--brand-green)': '#45b384',
  'var(--brand-purple)': '#815bc2',
}

// Must match chips.css's own dark-ground ink mix.
const CHIP_INK_MIX = 52

// Hashed from the category label, not from the slug: the chip belongs to the
// taxonomy, so one category reads the same colour on every card carrying it.
function coverChipInk(label: string): string {
  const brand = CHIP_BRAND_DARK[chipColor(label)] ?? TITLE_INK
  return toHex(mixOklab(parseHex(brand), parseHex('#ffffff'), CHIP_INK_MIX))
}

interface CoverInput {
  slug: string
  title: string
  category: string
  byline: string
  readingMinutes?: number
  drawMeta?: boolean
}

// Positions in the 1200x630 viewBox. The container is `aspect-ratio: 1200/630`,
// so a caller converts to CSS by scaling against the rendered width.
interface CoverOverlay {
  x: number
  centerY: number
  size: number
  chipSize: number
  chipInk: string
  textInk: string
}

export function coverOverlay(title: string, category: string): CoverOverlay {
  const card = layoutCard(title)
  return {
    x: card.padX,
    centerY: card.metaY - META_BOX_RISE + META_BOX_H / 2,
    size: META_SIZE,
    chipSize: CHIP_SIZE,
    chipInk: coverChipInk(category),
    textInk: DIMMED_WHITE,
  }
}

function n(value: number): number {
  return Math.round(value * 100) / 100
}

export function buildCoverSvg({ slug, title, category, byline, readingMinutes, drawMeta = true }: CoverInput): string {
  const seed = coverSeed(slug)
  const { hex: brandTone } = coverTone(slug)

  const solid = generateSolid(mulberry32(seed))
  const wireCells = buildWireCells(solid)
  const card = layoutCard(title)

  const wireGlyphs = wireCells
    .map((c) => {
      const opacity = Math.min(1, (WIRE_OPACITY_FLOOR + c.closeness * WIRE_OPACITY_RANGE) * (WIRE_OPACITY_SCALE / 100))
      const fontSize = 8 + c.closeness * WIRE_DENSITY
      return `<text x="${n(c.x)}" y="${n(c.y)}" font-size="${n(fontSize)}" opacity="${n(opacity)}">+</text>`
    })
    .join('')

  const outer = { x: BORDER_OUTER_INSET, y: BORDER_OUTER_INSET, w: CARD_W - BORDER_OUTER_INSET * 2, h: CARD_H - BORDER_OUTER_INSET * 2 }
  const inner = { x: BORDER_INNER_INSET, y: BORDER_INNER_INSET, w: CARD_W - BORDER_INNER_INSET * 2, h: CARD_H - BORDER_INNER_INSET * 2 }

  // Every line is drawn twice: shadow tone first to knock the wireframe glyphs out from behind the text, then real ink.
  // SVG letter-spacing applies after every glyph including the last, so the real width is one spacing short of the naive sum.
  const chipTextWidth = category.length * (CHIP_SIZE * CHIP_ADVANCE + CHIP_LETTER_SPACING) - CHIP_LETTER_SPACING
  const chipWidth = chipTextWidth + CHIP_PAD_X * 2
  const chipTop = card.metaY - META_BOX_RISE
  const readingText = readingMinutes === undefined ? null : `· ${readingMinutes} min`
  const readingX = card.padX + chipWidth + META_SPACING

  const chipRule = (x: number, y: number, inset: number, stroke: string): string =>
    `<rect x="${n(x + inset)}" y="${n(y + inset)}" width="${n(chipWidth - inset * 2)}" height="${n(META_BOX_H - inset * 2)}" fill="none" stroke="${stroke}" stroke-width="${CHIP_BORDER}"/>`

  const metaLine = (dx: number, dy: number, chipInk: string, textFill: string, textOpacity: number): string => {
    const x = card.padX + dx
    const y = chipTop + dy
    const parts = [
      // `border: 3px double` is a stroke, a space, then a stroke: two rects inset by half a stroke and
      // by a stroke and a half plus the space, since an SVG stroke straddles its own path.
      chipRule(x, y, CHIP_BORDER / 2, chipInk),
      chipRule(x, y, CHIP_BORDER * 1.5 + CHIP_BORDER_SPACING, chipInk),
      `<text x="${n(x + CHIP_PAD_X)}" y="${n(card.metaY + dy)}" font-family="${TITLE_FONT}" font-size="${CHIP_SIZE}" letter-spacing="${CHIP_LETTER_SPACING}" fill="${chipInk}">${escapeXml(category)}</text>`,
    ]
    if (readingText !== null)
      parts.push(
        `<text x="${n(readingX + dx)}" y="${n(card.metaY + dy)}" font-family="${TITLE_FONT}" font-size="${META_SIZE}" letter-spacing="${META_LETTER_SPACING}" fill="${textFill}" opacity="${textOpacity}">${escapeXml(readingText)}</text>`,
      )
    return parts.join('')
  }

  const shadowByline = `<text x="${card.padX + SHADOW_OFFSET}" y="${n(card.bylineY + SHADOW_OFFSET)}" font-family="${LABEL_FONT}" font-size="${BYLINE_SIZE}" letter-spacing="4" fill="${DARK_SHADOW}">${escapeXml(byline)}</text>`
  const shadowTitle = card.titleYs
    .map((y, i) => `<text x="${card.padX + SHADOW_OFFSET}" y="${n(y + SHADOW_OFFSET)}" font-family="${TITLE_FONT}" font-size="${card.fontSize}" fill="${DARK_SHADOW}">${escapeXml(card.lines[i])}</text>`)
    .join('')
  const shadowMeta = drawMeta ? metaLine(SHADOW_OFFSET, SHADOW_OFFSET, DARK_SHADOW, DARK_SHADOW, 1) : ''

  const bylineLine = `<text x="${card.padX}" y="${n(card.bylineY)}" font-family="${LABEL_FONT}" font-size="${BYLINE_SIZE}" letter-spacing="4" fill="${brandTone}">${escapeXml(byline)}</text>`
  const rule = `<line x1="${card.padX}" y1="${n(card.ruleY)}" x2="${CARD_W - card.padX}" y2="${n(card.ruleY)}" stroke="${brandTone}" stroke-width="2" stroke-dasharray="10 6" opacity="0.7"/>`
  const titleLines = card.titleYs
    .map((y, i) => `<text x="${card.padX}" y="${n(y)}" font-family="${TITLE_FONT}" font-size="${card.fontSize}" fill="${TITLE_INK}">${escapeXml(card.lines[i])}</text>`)
    .join('')
  const metaInk = drawMeta ? metaLine(0, 0, coverChipInk(category), TITLE_INK, DIM_OPACITY) : ''

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_W} ${CARD_H}">` +
    `<rect width="${CARD_W}" height="${CARD_H}" fill="${DARK_BG}"/>` +
    `<g font-family="${LABEL_FONT}" fill="${brandTone}" text-anchor="middle" dominant-baseline="central">${wireGlyphs}</g>` +
    `<rect x="${outer.x}" y="${outer.y}" width="${outer.w}" height="${outer.h}" fill="none" stroke="${brandTone}" stroke-width="${BORDER_STROKE}"/>` +
    `<rect x="${inner.x}" y="${inner.y}" width="${inner.w}" height="${inner.h}" fill="none" stroke="${brandTone}" stroke-width="3"/>` +
    shadowByline +
    shadowTitle +
    shadowMeta +
    bylineLine +
    rule +
    titleLines +
    metaInk +
    `</svg>`
  )
}
