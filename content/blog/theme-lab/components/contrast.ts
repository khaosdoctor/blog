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
