/**
 * WCAG 2.1 contrast, computed live so every candidate on this page can state a
 * real number instead of a promise. An effect that costs contrast should say how
 * much while you are dragging the slider that costs it.
 */

export type Rgb = [number, number, number]

export function parseHex(hex: string): Rgb {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? [...clean].map((c) => c + c).join('') : clean
  return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16)) as Rgb
}

export function toHex([r, g, b]: Rgb): string {
  const part = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
  return `#${part(r)}${part(g)}${part(b)}`
}

/** `over` painted at `alpha` on top of `under`, which is what any full-surface overlay does. */
export function composite(over: Rgb, under: Rgb, alpha: number): Rgb {
  return under.map((channel, i) => over[i] * alpha + channel * (1 - alpha)) as Rgb
}

function luminance([r, g, b]: Rgb): number {
  const channel = (value: number) => {
    const s = value / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function ratio(a: Rgb, b: Rgb): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (high + 0.05) / (low + 0.05)
}

/** AAA at 7, AA at 4.5, large text at 3. Below 3 is decoration, not text. */
export function grade(value: number): 'AAA' | 'AA' | 'AA large' | 'reprova' {
  if (value >= 7) return 'AAA'
  if (value >= 4.5) return 'AA'
  if (value >= 3) return 'AA large'
  return 'reprova'
}

function srgbChannelToLinear(c: number): number {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function linearChannelToSrgb(c: number): number {
  const s = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055
  return s * 255
}

/**
 * sRGB <-> OKLab, the exact matrices behind CSS `color-mix(in oklab, …)`
 * (Björn Ottosson's reference implementation, the public-domain basis for the
 * CSS Color 4 definition of the space). A cover card bakes a literal hex into
 * an SVG at build time; there is no live custom property for the browser to
 * recompute, so `mixOklab` below has to do in JS what `--chip-ink` does in
 * CSS (src/styles/chips.css: `color-mix(in oklab, var(--chip-color) N%,
 * white)`).
 */
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

/** `over` mixed with `under` in OKLab, `overPercent` of it: the JS equivalent
 * of `color-mix(in oklab, over overPercent%, under)`. */
export function mixOklab(over: Rgb, under: Rgb, overPercent: number): Rgb {
  const t = overPercent / 100
  const a = rgbToOklab(over)
  const b = rgbToOklab(under)
  return oklabToRgb([a[0] * t + b[0] * (1 - t), a[1] * t + b[1] * (1 - t), a[2] * t + b[2] * (1 - t)])
}
