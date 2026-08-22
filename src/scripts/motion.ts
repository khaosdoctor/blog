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
