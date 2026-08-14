// Wires up the code-block theme picker from CodeTheme.astro. This is the
// interactive half only: the blocking snippet that applies a stored choice
// before first paint lives directly in BaseLayout's <head> (see the report),
// since this module is deferred and would otherwise let the wrong theme show
// for a moment. That snippet and this module read and write the same key, so
// they must be kept in sync if either one changes.
//
// The empty export makes this a real module: without one, a script with no
// other import or export is global rather than file-scoped, and its names
// collide with hover-previews.ts, which has the same shape for the same
// reason.
export {}

const STORAGE_KEY = 'code-theme'
const ATTR = 'data-code-theme'

type ThemeName =
  | 'github-light'
  | 'github-dark'
  | 'monokai'
  | 'dracula'
  | 'catppuccin-latte'
  | 'catppuccin-frappe'
  | 'catppuccin-macchiato'
  | 'catppuccin-mocha'
  | 'kanagawa-wave'
  | 'kanagawa-dragon'
  | 'kanagawa-lotus'
  | 'ayu-light'
  | 'ayu-dark'
  | 'snazzy-light'

const THEMES: ThemeName[] = [
  'github-light',
  'github-dark',
  'monokai',
  'dracula',
  'catppuccin-latte',
  'catppuccin-frappe',
  'catppuccin-macchiato',
  'catppuccin-mocha',
  'kanagawa-wave',
  'kanagawa-dragon',
  'kanagawa-lotus',
  'ayu-light',
  'ayu-dark',
  'snazzy-light',
]

function isThemeName(value: string): value is ThemeName {
  return (THEMES as string[]).includes(value)
}

// Raw localStorage read, unvalidated: used once at startup to tell "nothing
// stored" apart from "something stored that is no longer a real theme" (e.g.
// solarized-dark, dropped from the list below), so the latter can be cleaned
// up instead of quietly lingering.
function rawStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function storedTheme(): ThemeName | null {
  const value = rawStored()
  return value !== null && isThemeName(value) ? value : null
}

function applyTheme(theme: ThemeName | null): void {
  if (theme === null) document.documentElement.removeAttribute(ATTR)
  else document.documentElement.setAttribute(ATTR, theme)
}

// Same feature check as hover-previews.ts's canPopover: true wherever the
// native popover API exists, which lets the shared picker below sit in the
// top layer instead of needing its own stacking-context and outside-click
// bookkeeping. Where it does not exist, the same element is toggled with the
// `hidden` attribute and positioned manually instead (see openPicker).
const canPopover = 'popover' in HTMLElement.prototype

/**
 * Places the shared picker next to the button that opened it, clamped to the
 * viewport. Same shape as hover-previews.ts's place(): getBoundingClientRect
 * is viewport-relative, which lines up with `position: fixed` (set in CSS
 * for the no-popover fallback, and imposed by the UA itself once `popover`
 * is set).
 */
function place(el: HTMLElement, anchor: HTMLElement): void {
  const rect = anchor.getBoundingClientRect()
  const gap = 8
  const w = el.offsetWidth
  const h = el.offsetHeight
  const vw = innerWidth
  const vh = innerHeight

  let top = rect.bottom + gap
  if (top + h > vh && rect.top - h - gap > 0) top = rect.top - h - gap
  top = Math.min(Math.max(top, gap), Math.max(gap, vh - h - gap))

  const left = Math.min(Math.max(rect.right - w, gap), Math.max(gap, vw - w - gap))

  el.style.top = `${top}px`
  el.style.left = `${left}px`
}

function init(): void {
  const wrapperEl = document.querySelector<HTMLElement>('.ct-settings')
  const selectEl = document.querySelector<HTMLSelectElement>('#ct-theme')
  if (wrapperEl === null || selectEl === null) return
  // Reassigned to plain consts: the nested functions below (openPicker,
  // closePicker, injectOpeners) close over these, and TypeScript cannot carry
  // the null check above into a closure that might run later, only into a
  // binding it knows was never reassigned.
  const wrapper = wrapperEl
  const select = selectEl

  function openPicker(anchor: HTMLElement): void {
    wrapper.style.visibility = 'hidden'
    if (canPopover) {
      // No-op if it was already closed: this is what lets a click on a
      // different block's button reposition the same popover instead of
      // erroring on an already-open one.
      wrapper.hidePopover?.()
      wrapper.showPopover?.()
    } else {
      wrapper.hidden = false
    }
    place(wrapper, anchor)
    wrapper.style.visibility = ''
    select.focus()
  }

  function closePicker(): void {
    if (canPopover) wrapper.hidePopover?.()
    else wrapper.hidden = true
  }

  // One button per code block, injected here rather than shipped in the
  // server-rendered HTML, so a page with forty blocks pays for forty small
  // buttons and not forty copies of the option list above them. Each is a
  // sibling of Expressive Code's own copy button inside its `.copy` div,
  // which is already a positioned, hover-revealed flex row (see
  // code-and-callouts.css), so the two share layout and hover behaviour with
  // no extra CSS on this end.
  function injectOpeners(label: string): void {
    for (const copy of document.querySelectorAll<HTMLElement>('.expressive-code .copy')) {
      if (copy.querySelector('.ct-open')) continue
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'ct-open'
      button.dataset.ctOpen = ''
      button.setAttribute('aria-label', label)
      // An empty inner div, matching the copy button's own markup: Expressive
      // Code's stylesheet styles that div for the idle/hover/focus/active
      // background wash (`.copy button div`), so this button gets the same
      // treatment for free instead of redefining it here.
      button.append(document.createElement('div'))
      copy.insertBefore(button, copy.querySelector('button'))
    }
  }

  // Static <option>s ship with no text: the labels come from data attributes
  // (see CodeTheme.astro) since this plain module has no access to t().
  const strings = wrapper.dataset
  const label = wrapper.querySelector('label')
  if (label) label.textContent = strings.label ?? 'Code theme'

  const captions: Partial<Record<string, string | undefined>> = {
    auto: strings.auto,
    'github-light': strings.githubLight,
    'github-dark': strings.githubDark,
    monokai: strings.monokai,
    dracula: strings.dracula,
    'catppuccin-latte': strings.catppuccinLatte,
    'catppuccin-frappe': strings.catppuccinFrappe,
    'catppuccin-macchiato': strings.catppuccinMacchiato,
    'catppuccin-mocha': strings.catppuccinMocha,
    'kanagawa-wave': strings.kanagawaWave,
    'kanagawa-dragon': strings.kanagawaDragon,
    'kanagawa-lotus': strings.kanagawaLotus,
    'ayu-light': strings.ayuLight,
    'ayu-dark': strings.ayuDark,
    'snazzy-light': strings.snazzyLight,
  }
  for (const option of select.options) {
    option.textContent = captions[option.value] ?? option.value
  }

  // A value stored before a theme was dropped from the list (solarized-dark,
  // formerly) is neither "auto" nor a theme any CSS selector still matches.
  // The blocking script in BaseLayout's <head> cannot tell the difference and
  // may already have set that stale name as the attribute; since no
  // `[data-code-theme='...']` rule matches it, the page silently falls back
  // to the prefers-color-scheme default, but the stale name lingers in
  // storage and would keep doing this on every visit. Once this module is
  // able to validate it, it clears it and resets the attribute right below,
  // exactly as if the reader had picked "auto".
  const raw = rawStored()
  const valid = storedTheme()
  if (raw !== null && valid === null) {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Nothing to clean up if storage was never available.
    }
  }
  applyTheme(valid)

  // No stored choice selects "auto": the media query in astro.config.mjs
  // still decides, exactly like a first-time visitor with JavaScript off.
  select.value = valid ?? 'auto'

  select.addEventListener('change', () => {
    if (select.value === 'auto') {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // Nothing to clean up if storage was never available.
      }
      applyTheme(null)
      closePicker()
      return
    }
    if (!isThemeName(select.value)) return
    try {
      localStorage.setItem(STORAGE_KEY, select.value)
    } catch {
      // Private mode, storage disabled: the theme still applies for this page.
    }
    applyTheme(select.value)
    closePicker()
  })

  // Nothing above matters without a script to run it. The picker used to
  // reveal itself here as a static control at the foot of the page; now that
  // every code block has its own opener, it stays out of the layout entirely
  // and only appears as a popover next to whichever button was clicked (see
  // openPicker). `[popover]` takes over hiding it when the API exists;
  // without it, the `hidden` attribute stays and is toggled by hand.
  if (canPopover) {
    wrapper.removeAttribute('hidden')
    wrapper.setAttribute('popover', 'auto')
  }

  injectOpeners(wrapper.dataset.pick ?? 'change the code theme')

  document.addEventListener('click', (event) => {
    const opener = (event.target as Element).closest<HTMLElement>('[data-ct-open]')
    if (opener) {
      openPicker(opener)
      return
    }
    // The popover API's own light-dismiss handles an outside click when
    // canPopover is true; the fallback path has no such thing, so it is done
    // by hand here.
    if (!canPopover && !wrapper.hidden && !wrapper.contains(event.target as Node)) closePicker()
  })

  if (!canPopover) {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !wrapper.hidden) closePicker()
    })
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
