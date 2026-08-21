// The preferences panel from SettingsPanel.astro. Same open/close, keyboard and
// focus handling as theme-toggle.ts; the Conway controls call conway.ts's own
// exported setters rather than duplicating its storage logic.
//
// The empty export makes this a real module, or its names would be global.
export {}

import {
  getSettings,
  reseed,
  resetSettings as resetConway,
  setAutoFeed,
  setBackgroundEnabled,
  setDensity,
  setGps,
  setMotion,
  setOpacity,
  setPaused,
} from './conway'
import { getShortcutLetter, resetShortcutLetter, RESERVED_LETTERS, setShortcutLetter } from './search-palette'
import { resetCodeTheme } from './code-theme'
import { setAccent, storedAccent } from '../lib/accent'

// hover-previews.ts binds its own listener to the same checkbox on post pages
// and additionally moves the pinned set between storages. This binding is what
// makes the checkbox mean something on every OTHER page, where that module
// never loads and there is nothing to reconcile.
const HP_PERSIST_KEY = 'hp-persist'

// Written the first time the nudge under the cog is shown, so it only ever
// appears once per browser.
const NUDGE_KEY = 'settings-nudge-seen'

// The same key BaseLayout's pre-paint script reads, so there is no flash at the
// default size. A raw percentage rather than named steps: 50-160 in 10s is
// twelve stops, more than a fixed set of attribute blocks wants to carry, so
// this writes --font-scale inline instead. 160 is on the grid (160 - 50 = 110),
// so both ends are reachable. Nothing stored means the stylesheet's own 100%.
const FONT_SIZE_KEY = 'font-size'
const FONT_SIZE_MIN = 50
const FONT_SIZE_MAX = 160
const FONT_SIZE_STEP = 10
const FONT_SIZE_DEFAULT = 100

// Clamped, then snapped to the same grid the control steps on, so a value read
// back from storage always resolves to a stop the control can rest on. This is
// also what pulls a reader who set 400% under the old 10-500 range back to 160
// rather than discarding their choice. BaseLayout's pre-paint script repeats
// this arithmetic inline and has to keep matching it.
function clampFontSize(value: number): number {
  const clamped = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, value))
  return FONT_SIZE_MIN + Math.round((clamped - FONT_SIZE_MIN) / FONT_SIZE_STEP) * FONT_SIZE_STEP
}

// Missing or unparseable falls back to the default outright; out of range is
// pulled inside rather than discarded, so a past choice still means the closest
// thing to itself if the range moves again.
function storedFontSize(): number {
  try {
    const raw = localStorage.getItem(FONT_SIZE_KEY)
    if (raw === null) return FONT_SIZE_DEFAULT
    const value = Number(raw)
    return Number.isFinite(value) ? clampFontSize(value) : FONT_SIZE_DEFAULT
  } catch {
    return FONT_SIZE_DEFAULT
  }
}

function applyFontSize(value: number): void {
  if (value === FONT_SIZE_DEFAULT) document.documentElement.style.removeProperty('--font-scale')
  else document.documentElement.style.setProperty('--font-scale', String(value / 100))
}

// 'sans' is the only stored value that means anything; anything else, absent
// included, is Literata. This only ever writes --font-body, the running text
// inside .prose, never the header or code.
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

  /*
   * What reset-all has to put back ON SCREEN, collected next to each control as
   * it is wired rather than written out again at the bottom. Clearing a key is
   * only half a reset: the control still shows the old choice until something
   * re-reads it, and this panel has three shapes of that (aria-current on a
   * button group, a slider's value, a checkbox).
   */
  const resetHandlers: Array<() => void> = []

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


  // --- Motion: the same three-way shape as theme-toggle.ts, "system" written
  // back as null so the OS query keeps deciding. ---
  const motionOptions = [...menu.querySelectorAll<HTMLButtonElement>('.sp-motion-option')]
  const markMotion = (value: string): void => {
    for (const option of motionOptions) option.setAttribute('aria-current', String(option.dataset.value === value))
  }
  markMotion(getSettings().motion ?? 'system')
  // resetConway() has already cleared the key by the time this runs, so it only
  // has to re-read what was left.
  resetHandlers.push(() => markMotion(getSettings().motion ?? 'system'))

  for (const option of motionOptions) {
    option.addEventListener('click', () => {
      const value = option.dataset.value
      setMotion(value === 'reduce' || value === 'allow' ? value : null)
      markMotion(value ?? 'system')
    })
  }

  // --- Text size: a minus/plus stepper around an editable number box. ---
  const fontSizeInput = menu.querySelector<HTMLInputElement>('#sp-font-size')
  const fontSizeValue = menu.querySelector<HTMLElement>('#sp-font-size-value')
  const fontSizeDown = menu.querySelector<HTMLButtonElement>('#sp-font-size-down')
  const fontSizeUp = menu.querySelector<HTMLButtonElement>('#sp-font-size-up')
  const fontSizeReset = menu.querySelector<HTMLButtonElement>('#sp-font-size-reset')
  if (fontSizeInput !== null && fontSizeValue !== null) {
    const template = fontSizeValue.dataset.template ?? 'Text size: %s'
    let value = storedFontSize()

    const syncFontSize = (): void => {
      fontSizeInput.value = String(value)
      const percent = `${value}%`
      fontSizeValue.textContent = percent
      fontSizeValue.setAttribute('aria-label', template.replace('%s', percent))
      // Disabled at each end rather than live and silently doing nothing.
      if (fontSizeDown !== null) fontSizeDown.disabled = value <= FONT_SIZE_MIN
      if (fontSizeUp !== null) fontSizeUp.disabled = value >= FONT_SIZE_MAX
    }

    // The one write path for every way the size can change. The default is
    // stored as NOTHING stored, this site's convention for every preference, so
    // 100 removes the key rather than writing a literal that would then have to
    // be recognised as a default everywhere it is read.
    const setFontSize = (next: number): void => {
      value = clampFontSize(next)
      try {
        if (value === FONT_SIZE_DEFAULT) localStorage.removeItem(FONT_SIZE_KEY)
        else localStorage.setItem(FONT_SIZE_KEY, String(value))
      } catch {
        // Private mode, or storage disabled: the choice still applies for this page.
      }
      applyFontSize(value)
      syncFontSize()
    }

    syncFontSize()

    fontSizeDown?.addEventListener('click', () => setFontSize(value - FONT_SIZE_STEP))
    fontSizeUp?.addEventListener('click', () => setFontSize(value + FONT_SIZE_STEP))
    fontSizeReset?.addEventListener('click', () => setFontSize(FONT_SIZE_DEFAULT))

    // `change`, not `input`: on a number field `input` fires per keystroke, so
    // "5" on the way to "50" would clamp up and overwrite what is being typed.
    // `change` fires on blur, Enter and each arrow step. An empty box falls back
    // to the default rather than to NaN, which would clamp to the minimum.
    fontSizeInput.addEventListener('change', () => {
      const typed = Number(fontSizeInput.value)
      setFontSize(Number.isFinite(typed) && fontSizeInput.value.trim() !== '' ? typed : FONT_SIZE_DEFAULT)
    })

    resetHandlers.push(() => setFontSize(FONT_SIZE_DEFAULT))
  }

  // --- Reading font: the two vendored body faces. Its own class so this query
  // never picks up the motion buttons. ---
  const fontFamilyOptions = [...menu.querySelectorAll<HTMLButtonElement>('.sp-font-family-option')]

  // One write path, same shape as setFontSize: null is the default and is
  // stored as nothing stored, so a reset is this called with null.
  const setBodyFace = (face: 'sans' | null): void => {
    try {
      if (face === null) localStorage.removeItem(BODY_FACE_KEY)
      else localStorage.setItem(BODY_FACE_KEY, face)
    } catch {
      // Private mode, or storage disabled: the choice still applies for this page.
    }
    applyBodyFace(face)
    const current = face ?? 'serif'
    for (const option of fontFamilyOptions) option.setAttribute('aria-current', String(option.dataset.value === current))
  }

  const initialBodyFace = storedBodyFace() ?? 'serif'
  for (const option of fontFamilyOptions) option.setAttribute('aria-current', String(option.dataset.value === initialBodyFace))

  for (const option of fontFamilyOptions) {
    option.addEventListener('click', () => setBodyFace(option.dataset.value === 'sans' ? 'sans' : null))
  }

  resetHandlers.push(() => setBodyFace(null))

  // --- Accent: today's colour, or one the reader pins. The write path and the
  // resolution live in lib/accent.ts, since header-brand.ts applies the same
  // choice on every page load. ---
  const accentOptions = [...menu.querySelectorAll<HTMLButtonElement>('.sp-accent-auto, .sp-accent-option')]
  if (accentOptions.length > 0) {
    const syncAccent = (): void => {
      const current = storedAccent() ?? 'auto'
      for (const option of accentOptions) option.setAttribute('aria-current', String(option.dataset.value === current))
    }
    syncAccent()
    for (const option of accentOptions) {
      option.addEventListener('click', () => {
        const value = option.dataset.value
        setAccent(value === undefined || value === 'auto' ? null : value)
        syncAccent()
      })
    }
    resetHandlers.push(() => {
      setAccent(null)
      syncAccent()
    })
  }

  // --- Conway. Every control from here to the pause button reads its value
  // back out of conway.ts rather than storage, so its reset handler is the same
  // one-liner that set it up: resetConway() has already run by then. ---
  const bgLife = menu.querySelector<HTMLInputElement>('#sp-bg-life')
  if (bgLife !== null) {
    const syncBgLife = (): void => {
      bgLife.checked = getSettings().backgroundEnabled
    }
    syncBgLife()
    bgLife.addEventListener('change', () => setBackgroundEnabled(bgLife.checked))
    resetHandlers.push(syncBgLife)
  }

  // All four knobs are the same three lines with different names, so they share
  // one wiring function.
  //
  // The readout prints from the value the SETTER took, not the slider's raw
  // string: conway.ts clamps every one of these, so a value that arrives out of
  // range (from storage written by an older build) would otherwise be shown as
  // a number nothing is using.
  //
  // The unit is a symbol appended here rather than a translated string: `%`,
  // `/s` and `s` read the same in both languages, and the readout is
  // aria-hidden anyway, so this text is seen and never spoken.
  const wireKnob = (
    id: string,
    read: () => number,
    write: (value: number) => void,
    format: (value: number) => string
  ): void => {
    const input = menu.querySelector<HTMLInputElement>(`#${id}`)
    if (input === null) return
    const readout = menu.querySelector<HTMLElement>(`#${id}-value`)
    const sync = (): void => {
      const value = read()
      input.value = String(value)
      if (readout !== null) readout.textContent = format(value)
    }
    sync()
    input.addEventListener('input', () => {
      write(Number(input.value))
      sync()
    })
    resetHandlers.push(sync)
  }

  wireKnob('sp-density', () => getSettings().density, setDensity, (value) => `${value}%`)
  wireKnob('sp-gps', () => getSettings().gps, setGps, (value) => `${value}/s`)
  wireKnob('sp-autofeed', () => getSettings().autoFeedSeconds, setAutoFeed, (value) => `${value}s`)
  // Stored as an alpha and shown as a percentage: 0.09 reads as 9%.
  wireKnob('sp-opacity', () => getSettings().opacity, setOpacity, (value) => `${Math.round(value * 100)}%`)

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
    resetHandlers.push(() => syncPauseLabel(getSettings().paused))
  }

  const reseedButton = menu.querySelector<HTMLButtonElement>('#sp-reseed')
  reseedButton?.addEventListener('click', () => reseed())

  // --- The search palette's shortcut letter. ---
  const searchKey = menu.querySelector<HTMLSelectElement>('#sp-search-key')
  if (searchKey !== null) {
    /*
     * Seven letters are shortcuts the browser owns, and the browser intercepts
     * them before any listener here runs, so picking one used to save and then
     * do nothing at all.
     *
     * Disabled rather than removed, so the alphabet stays whole and a reader
     * looking for D finds it and can see it is unavailable. The reason rides in
     * `title`, since a disabled option cannot be focused to announce more.
     */
    for (const option of searchKey.options) {
      if (!RESERVED_LETTERS.has(option.value)) continue
      option.disabled = true
      option.title = searchKey.dataset.reserved ?? 'Reserved by the browser'
    }
    const syncSearchKey = (): void => {
      searchKey.value = getShortcutLetter()
    }
    syncSearchKey()
    searchKey.addEventListener('change', () => setShortcutLetter(searchKey.value))
    resetHandlers.push(syncSearchKey)
  }

  // --- Pinned preview persistence. ---
  const hpPersist = menu.querySelector<HTMLInputElement>('#hp-persist')
  if (hpPersist !== null) {
    // On by default, so the stored value marks OFF and an absent key reads as
    // checked. hover-previews.ts's own persistent() reads the same direction;
    // both files write this key and have to agree on which value means what.
    try {
      hpPersist.checked = localStorage.getItem(HP_PERSIST_KEY) !== '0'
    } catch {
      hpPersist.checked = true
    }
    hpPersist.addEventListener('change', () => {
      try {
        if (hpPersist.checked) localStorage.removeItem(HP_PERSIST_KEY)
        else localStorage.setItem(HP_PERSIST_KEY, '0')
      } catch {
        // Private mode, or storage disabled: the choice still applies for this page.
      }
    })
    /*
     * The one reset that dispatches an event rather than doing the work itself.
     * On a post page hover-previews.ts binds to this same checkbox and does more
     * than write the flag: it moves the pinned set between storages. Setting
     * `.checked` from a script fires nothing, so doing it silently would strand
     * a pinned set in localStorage that this preference says should not be
     * there.
     */
    resetHandlers.push(() => {
      if (hpPersist.checked) return
      hpPersist.checked = true
      hpPersist.dispatchEvent(new Event('change', { bubbles: true }))
    })
  }

  /*
   * --- Reset all. ---
   *
   * The three modules that own their own keys go first, then every control's
   * handler re-reads what they left, so nothing here has to know which key
   * belongs to which control.
   *
   * It deliberately does NOT touch the light/dark choice. Lucas asked for that
   * to stay out of this panel, so a reader would have no way to see it change
   * from in here and would only find out by watching the page invert under a
   * button labelled as a preferences reset. ThemeToggle already carries its own
   * reset, the "system" option, one button over.
   *
   * 'hp-pinned' is left for a different reason: the pinned cards are the
   * reader's content, not a preference. Clearing the flag above already moves
   * that set back to the session.
   */
  const resetAll = menu.querySelector<HTMLButtonElement>('#sp-reset-all')
  resetAll?.addEventListener('click', () => {
    resetConway()
    resetShortcutLetter()
    resetCodeTheme()
    for (const handler of resetHandlers) handler()
  })

  if (canPopover) {
    menu.removeAttribute('hidden')
    menu.setAttribute('popover', 'auto')
  }

  wrapper.removeAttribute('hidden')

  /*
   * The first-visit nudge. The flag is written the moment it appears rather
   * than when the panel is opened, so a visitor who ignores it does not meet it
   * again on the next page. Storage throwing means "shown already", which errs
   * toward not pestering someone whose browser cannot remember the answer.
   */
  const nudge = wrapper.querySelector<HTMLElement>('[data-nudge]')
  if (nudge !== null) {
    let seen = true
    try {
      seen = localStorage.getItem(NUDGE_KEY) === '1'
      if (!seen) localStorage.setItem(NUDGE_KEY, '1')
    } catch {
      // Left as seen.
    }
    if (!seen) {
      nudge.hidden = false
      opener.addEventListener('click', () => nudge.remove(), { once: true })
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
