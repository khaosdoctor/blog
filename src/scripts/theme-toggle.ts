// The light/dark/system control from ThemeToggle.astro.
//
// The interactive half only: the blocking snippet that applies a stored choice
// before first paint lives in BaseLayout's <head>, since this module is
// deferred and would otherwise let the wrong ground show for a moment. Both
// read and write the same key and have to be kept in step.
//
// The empty export makes this a real module, or its names would be global and
// collide with the other scripts here.
export {}

const STORAGE_KEY = 'color-scheme'
const ATTR = 'data-theme'

type Scheme = 'light' | 'dark'

function isScheme(value: string): value is Scheme {
  return value === 'light' || value === 'dark'
}

function storedScheme(): Scheme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value !== null && isScheme(value) ? value : null
  } catch {
    return null
  }
}

function applyScheme(scheme: Scheme | null): void {
  if (scheme === null) document.documentElement.removeAttribute(ATTR)
  else document.documentElement.setAttribute(ATTR, scheme)
}

// BaseLayout ships two <meta name="theme-color"> tags, one per
// prefers-color-scheme, hardcoded because a meta tag cannot read a custom
// property. An explicit choice makes them disagree with the page whenever the
// OS differs from it, so both get the resolved colour and revert on "system".
//
// Each meta's own content already IS that scheme's colour, so it is read off
// the DOM rather than repeated here. Cached before this ever overwrites it, or
// a later call would cache its own overwrite.
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

// Where the native popover API exists the menu sits in the top layer, with no
// stacking context or outside-click bookkeeping of its own. Where it does not,
// the same element is toggled with `hidden` and positioned manually.
const canPopover = 'popover' in HTMLElement.prototype

/**
 * Places the menu next to its opener, clamped to the viewport.
 * getBoundingClientRect is viewport-relative, which lines up with the `fixed`
 * positioning the fallback sets and the popover API imposes.
 */
function place(el: HTMLElement, anchor: HTMLElement): void {
  const rect = anchor.getBoundingClientRect()
  const space = 8
  const w = el.offsetWidth
  const h = el.offsetHeight
  const vw = innerWidth
  const vh = innerHeight

  let top = rect.bottom + space
  if (top + h > vh && rect.top - h - space > 0) top = rect.top - h - space
  top = Math.min(Math.max(top, space), Math.max(space, vh - h - space))

  const left = Math.min(Math.max(rect.right - w, space), Math.max(space, vw - w - space))

  el.style.top = `${top}px`
  el.style.left = `${left}px`
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

  // Tracked here rather than read off the element: `:popover-open` and the
  // `hidden` attribute are two different sources of truth, and the close paths
  // have to work the same way whichever is in play.
  let open = false

  function openMenu(): void {
    menu.style.visibility = 'hidden'
    if (canPopover) {
      try {
        menu.hidePopover?.()
        menu.showPopover?.()
      } catch {
        menu.hidden = false
      }
    } else {
      menu.hidden = false
    }
    open = true
    opener.setAttribute('aria-expanded', 'true')
    place(menu, opener)
    menu.style.visibility = ''
  }

  function closeMenu(returnFocus: boolean): void {
    open = false
    opener.setAttribute('aria-expanded', 'false')
    try {
      menu.hidePopover?.()
    } catch {
      // Not currently showing as a popover.
    }
    if (!canPopover) menu.hidden = true
    if (returnFocus) opener.focus()
  }

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
      try {
        if (scheme === null) localStorage.removeItem(STORAGE_KEY)
        else localStorage.setItem(STORAGE_KEY, scheme)
      } catch {
        // Private mode, storage disabled: the choice still applies for this page.
      }
      applyScheme(scheme)
      syncThemeColor(scheme)
      markCurrent(scheme)
      closeMenu(true)
    })
  }

  // `hidden` is cleared before `popover` is set: a popover-attributed element
  // that is still hidden refuses to show.
  if (canPopover) {
    menu.removeAttribute('hidden')
    menu.setAttribute('popover', 'auto')
  }

  opener.addEventListener('click', () => {
    if (open) closeMenu(true)
    else openMenu()
  })

  document.addEventListener('click', (event) => {
    if (!open) return
    const target = event.target as Element
    if (!wrapper.contains(target)) closeMenu(false)
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open) closeMenu(true)
  })

  wrapper.removeAttribute('hidden')
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
