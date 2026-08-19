// Wires up the preferences panel from SettingsPanel.astro. Same open/close,
// keyboard and focus handling as theme-toggle.ts, one popover instead of
// three menu options; the Conway-specific controls call straight into
// conway.ts's own exported setters rather than duplicating storage logic
// here (see that module's report note on why a direct import beats a custom
// event bus for two scripts bundled together).
//
// The empty export makes this a real module, same reason as the other
// scripts in this folder: without one its names would be global and could
// collide with theirs.
export {}

import { getSettings, reseed, setAutoFeed, setBackgroundEnabled, setDensity, setGps, setMotion, setOpacity, setPaused } from './conway'
import { getShortcutLetter, setShortcutLetter } from './search-palette'

// Same key hover-previews.ts's own bindPersistToggle() already reads and
// writes. That function still runs, unchanged, on the post pages
// HoverPreviews.astro loads on, and additionally reconciles the pinned set
// itself (moving it between sessionStorage and localStorage) whenever this
// checkbox changes there. This binding is the one that makes the checkbox
// mean something on every *other* page too, where hover-previews.ts never
// loads and there is nothing pinned to reconcile: just the flag, read and
// written directly, so the preference already applies the next time the
// reader opens a post.
const HP_PERSIST_KEY = 'hp-persist'

// Same key BaseLayout's own blocking <script is:inline> reads before first
// paint, so the reader never sees a flash at the default size. Five steps
// rather than a slider, null in the middle for the default (100%, same
// "no attribute = default" convention as motion and code-theme): the
// percentages here are read-only display text and must stay in sync with
// theme.css's own --font-scale values per data-font-size attribute.
const FONT_SIZE_KEY = 'font-size'
const FONT_SIZE_STEPS: ReadonlyArray<{ value: string | null; percent: string }> = [
  { value: 'xs', percent: '80%' },
  { value: 'sm', percent: '90%' },
  { value: null, percent: '100%' },
  { value: 'lg', percent: '110%' },
  { value: 'xl', percent: '120%' },
]

function isFontSizeValue(value: string): boolean {
  return value === 'xs' || value === 'sm' || value === 'lg' || value === 'xl'
}

function storedFontSize(): string | null {
  try {
    const value = localStorage.getItem(FONT_SIZE_KEY)
    return value !== null && isFontSizeValue(value) ? value : null
  } catch {
    return null
  }
}

function applyFontSize(value: string | null): void {
  if (value === null) document.documentElement.removeAttribute('data-font-size')
  else document.documentElement.setAttribute('data-font-size', value)
}

// Same key BaseLayout's own blocking script reads. 'sans' is the only stored
// value that means anything (Atkinson Hyperlegible); anything else, absent
// included, is the default (Literata). This only ever writes --font-body
// (theme.css), the running text inside .prose: headings, code and lists
// already pin --font-mono of their own accord and this control never
// touches that, nor the header or the mark, which read --font-display.
const BODY_FACE_KEY = 'body-face'

function storedBodyFace(): 'sans' | null {
  try {
    return localStorage.getItem(BODY_FACE_KEY) === 'sans' ? 'sans' : null
  } catch {
    return null
  }
}

function applyBodyFace(face: 'sans' | null): void {
  if (face === null) document.documentElement.removeAttribute('data-body-face')
  else document.documentElement.setAttribute('data-body-face', face)
}

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

const canPopover = 'popover' in HTMLElement.prototype

function init(): void {
  const wrapperEl = document.querySelector<HTMLElement>('.settings-panel')
  const openerEl = document.querySelector<HTMLButtonElement>('.sp-open')
  const menuEl = document.querySelector<HTMLElement>('.sp-menu')
  if (wrapperEl === null || openerEl === null || menuEl === null) return
  const wrapper = wrapperEl
  const opener = openerEl
  const menu = menuEl

  const label = wrapper.dataset.label ?? 'Preferences'
  opener.setAttribute('aria-label', label)

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

  // --- Motion: same three-way shape as theme-toggle.ts's own options,
  // "system" written back as null so the OS query keeps deciding. ---
  const motionOptions = [...menu.querySelectorAll<HTMLButtonElement>('.sp-motion-option')]
  const initialMotion = getSettings().motion ?? 'system'
  for (const option of motionOptions) option.setAttribute('aria-current', String(option.dataset.value === initialMotion))

  for (const option of motionOptions) {
    option.addEventListener('click', () => {
      const value = option.dataset.value
      setMotion(value === 'reduce' || value === 'allow' ? value : null)
      for (const other of motionOptions) other.setAttribute('aria-current', String(other === option))
    })
  }

  // --- Reader text size: five steps, decrease/increase rather than a
  // slider, buttons disabled at either end instead of wrapping. ---
  const fontSizeDec = menu.querySelector<HTMLButtonElement>('#sp-font-size-dec')
  const fontSizeInc = menu.querySelector<HTMLButtonElement>('#sp-font-size-inc')
  const fontSizeValue = menu.querySelector<HTMLElement>('#sp-font-size-value')
  if (fontSizeDec !== null && fontSizeInc !== null && fontSizeValue !== null) {
    const template = fontSizeValue.dataset.template ?? 'Text size: %s'
    let index = FONT_SIZE_STEPS.findIndex((step) => step.value === storedFontSize())
    if (index === -1) index = 2

    const syncFontSize = (): void => {
      const step = FONT_SIZE_STEPS[index]
      fontSizeValue.textContent = step.percent
      fontSizeValue.setAttribute('aria-label', template.replace('%s', step.percent))
      fontSizeDec.disabled = index === 0
      fontSizeInc.disabled = index === FONT_SIZE_STEPS.length - 1
    }

    const move = (delta: number): void => {
      index = Math.min(Math.max(index + delta, 0), FONT_SIZE_STEPS.length - 1)
      const step = FONT_SIZE_STEPS[index]
      try {
        if (step.value === null) localStorage.removeItem(FONT_SIZE_KEY)
        else localStorage.setItem(FONT_SIZE_KEY, step.value)
      } catch {
        // Private mode, or storage disabled: the choice still applies for this page.
      }
      applyFontSize(step.value)
      syncFontSize()
    }

    syncFontSize()
    fontSizeDec.addEventListener('click', () => move(-1))
    fontSizeInc.addEventListener('click', () => move(1))
  }

  // --- Reading font: Literata (default) or Atkinson Hyperlegible, the two
  // vendored body faces (src/styles/fonts.css). Same aria-current shape as
  // the motion buttons above, its own class so this query never picks up
  // those. ---
  const fontFamilyOptions = [...menu.querySelectorAll<HTMLButtonElement>('.sp-font-family-option')]
  const initialBodyFace = storedBodyFace() ?? 'serif'
  for (const option of fontFamilyOptions) option.setAttribute('aria-current', String(option.dataset.value === initialBodyFace))

  for (const option of fontFamilyOptions) {
    option.addEventListener('click', () => {
      const value = option.dataset.value === 'sans' ? 'sans' : null
      try {
        if (value === null) localStorage.removeItem(BODY_FACE_KEY)
        else localStorage.setItem(BODY_FACE_KEY, value)
      } catch {
        // Private mode, or storage disabled: the choice still applies for this page.
      }
      applyBodyFace(value)
      for (const other of fontFamilyOptions) other.setAttribute('aria-current', String(other === option))
    })
  }

  // --- Conway background on/off. ---
  const bgLife = menu.querySelector<HTMLInputElement>('#sp-bg-life')
  if (bgLife !== null) {
    bgLife.checked = getSettings().backgroundEnabled
    bgLife.addEventListener('change', () => setBackgroundEnabled(bgLife.checked))
  }

  // --- The reader-adjustable Conway knobs, behind their own disclosure. ---
  const density = menu.querySelector<HTMLInputElement>('#sp-density')
  if (density !== null) {
    density.value = String(getSettings().density)
    density.addEventListener('input', () => setDensity(Number(density.value)))
  }

  const gps = menu.querySelector<HTMLInputElement>('#sp-gps')
  if (gps !== null) {
    gps.value = String(getSettings().gps)
    gps.addEventListener('input', () => setGps(Number(gps.value)))
  }

  const autoFeed = menu.querySelector<HTMLInputElement>('#sp-autofeed')
  if (autoFeed !== null) {
    autoFeed.value = String(getSettings().autoFeedSeconds)
    autoFeed.addEventListener('input', () => setAutoFeed(Number(autoFeed.value)))
  }

  const opacity = menu.querySelector<HTMLInputElement>('#sp-opacity')
  if (opacity !== null) {
    opacity.value = String(getSettings().opacity)
    opacity.addEventListener('input', () => setOpacity(Number(opacity.value)))
  }

  const pause = menu.querySelector<HTMLButtonElement>('#sp-pause')
  if (pause !== null) {
    const syncPauseLabel = (paused: boolean): void => {
      pause.textContent = paused ? (pause.dataset.resume ?? 'Resume') : (pause.dataset.pause ?? 'Pause')
      pause.setAttribute('aria-pressed', String(paused))
    }
    syncPauseLabel(getSettings().paused)
    pause.addEventListener('click', () => {
      const next = !getSettings().paused
      setPaused(next)
      syncPauseLabel(next)
    })
  }

  const reseedButton = menu.querySelector<HTMLButtonElement>('#sp-reseed')
  reseedButton?.addEventListener('click', () => reseed())

  // --- The search palette's shortcut letter, direct import into
  // search-palette.ts's own control surface, same convention as the Conway
  // setters above. ---
  const searchKey = menu.querySelector<HTMLSelectElement>('#sp-search-key')
  if (searchKey !== null) {
    searchKey.value = getShortcutLetter()
    searchKey.addEventListener('change', () => setShortcutLetter(searchKey.value))
  }

  // --- Pinned preview persistence, moved in from HoverPreviews.astro. ---
  const hpPersist = menu.querySelector<HTMLInputElement>('#hp-persist')
  if (hpPersist !== null) {
    try {
      hpPersist.checked = localStorage.getItem(HP_PERSIST_KEY) === '1'
    } catch {
      hpPersist.checked = false
    }
    hpPersist.addEventListener('change', () => {
      try {
        if (hpPersist.checked) localStorage.setItem(HP_PERSIST_KEY, '1')
        else localStorage.removeItem(HP_PERSIST_KEY)
      } catch {
        // Private mode, or storage disabled: the choice still applies for this page.
      }
    })
  }

  if (canPopover) {
    menu.removeAttribute('hidden')
    menu.setAttribute('popover', 'auto')
  }

  wrapper.removeAttribute('hidden')
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
