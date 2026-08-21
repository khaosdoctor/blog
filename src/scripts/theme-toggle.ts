// The light/dark/system control from ThemeToggle.astro.
//
// The interactive half only: the blocking snippet that applies a stored choice
// before first paint lives in BaseLayout's <head>, since this module is
// deferred and would otherwise let the wrong ground show for a moment. Both
// read and write the same key and have to be kept in step.
import { readStorage, removeStorage, writeStorage } from '../lib/storage'
import { promoteToPopover, wireMenu } from './popover-menu'
import { onReady } from './ready'

const STORAGE_KEY = 'color-scheme'
const ATTR = 'data-theme'

type Scheme = 'light' | 'dark'

function isScheme(value: string): value is Scheme {
  return value === 'light' || value === 'dark'
}

function storedScheme(): Scheme | null {
  const value = readStorage(STORAGE_KEY)
  return value !== null && isScheme(value) ? value : null
}

function applyScheme(scheme: Scheme | null): void {
  if (scheme === null) document.documentElement.removeAttribute(ATTR)
  else document.documentElement.setAttribute(ATTR, scheme)
}

// BaseLayout ships two <meta name="theme-color"> tags, one per OS scheme; an
// explicit choice makes them disagree with the page, so both get the resolved
// colour and revert on "system". Each meta's own content IS that scheme's
// colour, read off the DOM and cached before it is ever overwritten.
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
  // TypeScript cannot carry the null check above into a closure that runs
  // later, so the nested functions read these aliases.
  const wrapper = wrapperEl
  const opener = openerEl
  const menu = menuEl

  const menuControl = wireMenu(wrapper, opener, menu)

  // The opener is icon-only, so its accessible name lives in aria-label. The
  // menu gets none: a role-less element's aria-label is ignored by every screen
  // reader, so each option's visible text is what names it. That text comes
  // from data attributes, since a plain module has no access to t().
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

  // Three icons, one per scheme, only one ever unhidden: the button shows what
  // is on without opening anything.
  const openerIcons = [...opener.querySelectorAll<SVGElement>('.tt-icon')]

  function markCurrent(scheme: Scheme | null): void {
    const value = scheme ?? 'system'
    for (const option of options) option.setAttribute('aria-current', String(option.dataset.value === value))
    for (const icon of openerIcons) {
      if (icon.dataset.value === value) icon.removeAttribute('hidden')
      else icon.setAttribute('hidden', '')
    }
  }

  const initial = storedScheme()
  applyScheme(initial)
  syncThemeColor(initial)
  markCurrent(initial)

  for (const option of options) {
    option.addEventListener('click', () => {
      const value = option.dataset.value
      const scheme = value === 'light' || value === 'dark' ? value : null
      if (scheme === null) removeStorage(STORAGE_KEY)
      else writeStorage(STORAGE_KEY, scheme)
      applyScheme(scheme)
      syncThemeColor(scheme)
      markCurrent(scheme)
      menuControl.close(true)
    })
  }

  promoteToPopover(menu)

  wrapper.removeAttribute('hidden')
}

onReady(init)
