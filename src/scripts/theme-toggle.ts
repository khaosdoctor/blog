import { readStorage, removeStorage, writeStorage } from '../lib/storage'
import { markCurrent, promoteToPopover, wireMenu } from './popover-menu'
import { onReady } from './ready'
import { isScheme, type Scheme, THEME_ATTR } from './scheme'

const STORAGE_KEY = 'color-scheme'

function storedScheme(): Scheme | null {
  const value = readStorage(STORAGE_KEY)
  return value !== null && isScheme(value) ? value : null
}

function applyScheme(scheme: Scheme | null): void {
  if (scheme === null) document.documentElement.removeAttribute(THEME_ATTR)
  else document.documentElement.setAttribute(THEME_ATTR, scheme)
}

// Each tag's authored content IS that scheme's colour, so it has to be cached
// before the first overwrite or "system" can no longer be restored.
let ownLight: string | null = null
let ownDark: string | null = null

function syncThemeColor(scheme: Scheme | null): void {
  const light = document.querySelector('meta[name="theme-color"][media*="light"]')
  const dark = document.querySelector('meta[name="theme-color"][media*="dark"]')
  if (light === null || dark === null) return
  ownLight ??= light.getAttribute('content')
  ownDark ??= dark.getAttribute('content')
  const resolved = scheme === null ? null : scheme === 'dark' ? ownDark : ownLight
  if (resolved !== null) light.setAttribute('content', resolved)
  else if (ownLight !== null) light.setAttribute('content', ownLight)
  if (resolved !== null) dark.setAttribute('content', resolved)
  else if (ownDark !== null) dark.setAttribute('content', ownDark)
}

function init(): void {
  const wrapperEl = document.querySelector<HTMLElement>('.theme-toggle')
  const openerEl = document.querySelector<HTMLButtonElement>('.tt-open')
  const menuEl = document.querySelector<HTMLElement>('.tt-menu')
  if (wrapperEl === null || openerEl === null || menuEl === null) return
  const wrapper = wrapperEl
  const opener = openerEl
  const menu = menuEl

  const closeMenu = wireMenu(wrapper, opener, menu)

  const strings = wrapper.dataset
  const label = strings.label ?? 'Theme'
  opener.setAttribute('aria-label', label)

  const captions: Record<'light' | 'dark' | 'system', string | undefined> = {
    light: strings.light,
    dark: strings.dark,
    system: strings.system,
  }

  const options = [...menu.querySelectorAll<HTMLButtonElement>('.tt-option')]
  for (const option of options) {
    const value = option.dataset.value as 'light' | 'dark' | 'system'
    const labelEl = option.querySelector<HTMLElement>('.tt-option-label')
    if (labelEl !== null) labelEl.textContent = captions[value] ?? value
  }

  const openerIcons = [...opener.querySelectorAll<SVGElement>('.tt-icon')]

  function markScheme(scheme: Scheme | null): void {
    const value = scheme ?? 'system'
    markCurrent(options, value)
    for (const icon of openerIcons) {
      if (icon.dataset.value === value) icon.removeAttribute('hidden')
      else icon.setAttribute('hidden', '')
    }
  }

  const initial = storedScheme()
  applyScheme(initial)
  syncThemeColor(initial)
  markScheme(initial)

  for (const option of options) {
    option.addEventListener('click', () => {
      const value = option.dataset.value
      const scheme = value === 'light' || value === 'dark' ? value : null
      if (scheme === null) removeStorage(STORAGE_KEY)
      else writeStorage(STORAGE_KEY, scheme)
      applyScheme(scheme)
      syncThemeColor(scheme)
      markScheme(scheme)
      closeMenu(true)
    })
  }

  promoteToPopover(menu)

  wrapper.removeAttribute('hidden')
}

onReady(init)
