export const THEME_ATTR = 'data-theme'

export type Scheme = 'light' | 'dark'

export function isScheme(value: string): value is Scheme {
  return value === 'light' || value === 'dark'
}

export function pageScheme(): Scheme | null {
  const value = document.documentElement.getAttribute(THEME_ATTR)
  return value !== null && isScheme(value) ? value : null
}
