// Reduced-motion resolution shared by header-brand.ts and
// ReadingProgress.astro, which carried identical copies. An explicit
// `data-motion` on <html> (written by the settings panel) wins in both
// directions; the OS query decides when it is absent. conway.ts keeps its own
// copy because it tracks the override in a module variable for its loop.

export function motionOverride(): 'reduce' | 'allow' | null {
  const attr = document.documentElement.getAttribute('data-motion')
  return attr === 'reduce' || attr === 'allow' ? attr : null
}

export function prefersReducedMotion(): boolean {
  const override = motionOverride()
  if (override === 'reduce') return true
  if (override === 'allow') return false
  return matchMedia('(prefers-reduced-motion: reduce)').matches
}
