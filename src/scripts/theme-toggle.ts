// Wires up the light/dark/system control from ThemeToggle.astro. This is the
// interactive half only: the blocking snippet that applies a stored choice
// before first paint lives directly in BaseLayout's <head> (same reason as
// code-theme.ts's split), since this module is deferred and would otherwise
// let the wrong ground show for a moment. That snippet and this module read
// and write the same key, so they must be kept in sync if either one changes.
//
// The empty export makes this a real module: without one, a script with no
// other import or export is global rather than file-scoped, and its names
// would collide with code-theme.ts and hover-previews.ts, which have the same
// shape for the same reason.
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
// prefers-color-scheme value, hardcoded to --bg's two hexes because a meta
// tag cannot read a CSS custom property. An explicit choice makes them
// disagree with the page whenever the OS preference differs from it, so both
// get the resolved colour: whichever one the browser's media query still
// matches, the colour it reports is now the page's actual one. Restored to
// their own per-scheme colour when the choice goes back to "system".
const BG_LIGHT = '#f4efe0'
const BG_DARK = '#000000'

function syncThemeColor(scheme: Scheme | null): void {
  const light = document.querySelector('meta[name="theme-color"][media*="light"]')
  const dark = document.querySelector('meta[name="theme-color"][media*="dark"]')
  if (light === null || dark === null) return
  const resolved = scheme === null ? null : scheme === 'dark' ? BG_DARK : BG_LIGHT
  light.setAttribute('content', resolved ?? BG_LIGHT)
  dark.setAttribute('content', resolved ?? BG_DARK)
}

// Same feature check as code-theme.ts's canPopover: true wherever the native
// popover API exists, which lets the menu sit in the top layer instead of
// needing its own stacking context and outside-click bookkeeping. Where it
// does not exist, the same element is toggled with the `hidden` attribute and
// positioned manually instead (see openMenu).
const canPopover = 'popover' in HTMLElement.prototype

/**
 * Places the menu next to the button that opened it, clamped to the viewport.
 * Same shape as code-theme.ts's place(): getBoundingClientRect is
 * viewport-relative, which lines up with `position: fixed` (set in CSS for
 * the no-popover fallback, and imposed by the UA itself once `popover` is
 * set).
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
  // Reassigned to plain consts, the way code-theme.ts does: the nested
  // functions below close over these, and TypeScript cannot carry the null
  // check above into a closure that might run later.
  const wrapper = wrapperEl
  const opener = openerEl
  const menu = menuEl

  // Tracked here rather than read back off the element, for the same reason
  // as code-theme.ts's `open`: `:popover-open` and the `hidden` attribute are
  // two different sources of truth, and the close paths below have to work
  // the same way whichever one is in play.
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

  // Static buttons ship with no text: the labels come from data attributes
  // (see ThemeToggle.astro) since this plain module has no access to t().
  const strings = wrapper.dataset
  const label = strings.label ?? 'Theme'
  opener.textContent = label
  opener.setAttribute('aria-label', label)
  menu.setAttribute('aria-label', label)

  const captions: Record<'light' | 'dark' | 'system', string | undefined> = {
    light: strings.light,
    dark: strings.dark,
    system: strings.system,
  }

  const options = [...menu.querySelectorAll<HTMLButtonElement>('.tt-option')]
  for (const option of options) {
    const value = option.dataset.value as 'light' | 'dark' | 'system'
    option.textContent = captions[value] ?? value
  }

  function markCurrent(scheme: Scheme | null): void {
    const value = scheme ?? 'system'
    for (const option of options) option.setAttribute('aria-current', String(option.dataset.value === value))
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

  // Matches code-theme.ts: hidden is cleared before popover is set, since a
  // popover-attributed element that is still `hidden` refuses to show.
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
