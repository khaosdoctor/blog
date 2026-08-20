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

// Written the first time the nudge under the cog is shown, so it only ever
// appears once per browser.
const NUDGE_KEY = 'settings-nudge-seen'

// Same key BaseLayout's own blocking <script is:inline> reads before first
// paint, so the reader never sees a flash at the default size. A raw
// percentage, 50 to 160 (the owner's own range, narrowed from the 10-500 this
// control opened with), not one of a few named steps: even 50-160 is twelve
// stops, more than a fixed set of attribute blocks wants to carry, so this
// writes --font-scale (theme.css) straight onto the root element's inline
// style instead of picking one of them. FONT_SIZE_STEP (10) is flat across
// the whole range rather than widening further out: 10% is a step a reader
// can feel at either end of a span this narrow. 160 is on the grid
// (160 - 50 = 110, a whole number of steps), so both ends are reachable. No
// stored value, and no inline style, means the stylesheet's own default
// (1, 100%) applies, same "nothing stored means default" convention as motion
// and code-theme.
const FONT_SIZE_KEY = 'font-size'
const FONT_SIZE_MIN = 50
const FONT_SIZE_MAX = 160
const FONT_SIZE_STEP = 10
const FONT_SIZE_DEFAULT = 100

// Clamped into range, then snapped onto the same 10-wide grid the control's
// own `step` divides it into, so a value read back out of storage always
// resolves to a stop the control (and a screen reader announcing it) can
// actually rest on. This is also the only thing standing between a reader who
// set 400% under the old 10-500 range and a page that still renders at 400%:
// clamping pulls it back to 160 rather than discarding it, so the choice
// still means the closest thing to itself the range now allows. BaseLayout's
// pre-paint script repeats this arithmetic inline for the same reason it
// repeats the key, and has to keep matching it.
function clampFontSize(value: number): number {
  const clamped = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, value))
  return FONT_SIZE_MIN + Math.round((clamped - FONT_SIZE_MIN) / FONT_SIZE_STEP) * FONT_SIZE_STEP
}

// A stored value that is missing, not a number, or outside the range must
// never reach the page as-is: missing or non-numeric falls back to the
// default outright, and an out-of-range number is pulled back inside the
// range rather than discarded, so a reader's past choice still means
// something close to itself if the range itself ever moves again.
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

  /*
   * What reset-all has to put back on screen, collected as each control below
   * is wired up rather than written out again in one block at the bottom.
   * Clearing a key is only half a reset: the control still shows the old
   * choice until something re-reads it, and this panel has three separate
   * shapes of "shows the old choice" (aria-current on a button group, a
   * slider's value, a checkbox). Each control knows its own, so each one
   * registers it here next to itself, where it stays correct when that
   * control changes.
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

  // --- Motion: same three-way shape as theme-toggle.ts's own options,
  // "system" written back as null so the OS query keeps deciding. ---
  const motionOptions = [...menu.querySelectorAll<HTMLButtonElement>('.sp-motion-option')]
  const markMotion = (value: string): void => {
    for (const option of motionOptions) option.setAttribute('aria-current', String(option.dataset.value === value))
  }
  markMotion(getSettings().motion ?? 'system')
  // conway.ts's resetSettings() has already cleared the key and the attribute
  // by the time this runs, so this only has to re-read what it left.
  resetHandlers.push(() => markMotion(getSettings().motion ?? 'system'))

  for (const option of motionOptions) {
    option.addEventListener('click', () => {
      const value = option.dataset.value
      setMotion(value === 'reduce' || value === 'allow' ? value : null)
      markMotion(value ?? 'system')
    })
  }

  // --- Reader text size: a minus/plus stepper around an editable number box
  // across the owner's own 50-160% span (SettingsPanel.astro carries the
  // reasoning for `type="number"` over a plain text input). ---
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
      // Disabled at each end rather than left live and silently doing
      // nothing. Null-checked because each control is queried separately
      // above and any of them could be missing from the markup.
      if (fontSizeDown !== null) fontSizeDown.disabled = value <= FONT_SIZE_MIN
      if (fontSizeUp !== null) fontSizeUp.disabled = value >= FONT_SIZE_MAX
    }

    // The one write path for every way the size can change: the buttons, the
    // box, and reset-all further down. Storing the default as *nothing
    // stored* is this site's convention across every reader preference, so
    // 100 removes the key and the inline --font-scale instead of writing a
    // literal 100 that would then have to be recognised as a default
    // everywhere it is read back.
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

    // `change`, not `input`: on a number field `input` fires on every
    // keystroke, so "5" on the way to "50" would clamp up to 50 and overwrite
    // what the reader is still typing. `change` fires on blur, on Enter and
    // on each arrow-key step, which is every moment a typed value is actually
    // finished. An empty or unparseable box falls back to the default rather
    // than to NaN, which clampFontSize would otherwise turn into the minimum.
    fontSizeInput.addEventListener('change', () => {
      const typed = Number(fontSizeInput.value)
      setFontSize(Number.isFinite(typed) && fontSizeInput.value.trim() !== '' ? typed : FONT_SIZE_DEFAULT)
    })

    // The same path the 100% button takes, which already removes the key and
    // the inline --font-scale rather than storing a literal 100.
    resetHandlers.push(() => setFontSize(FONT_SIZE_DEFAULT))
  }

  // --- Reading font: Literata (default) or Atkinson Hyperlegible, the two
  // vendored body faces (src/styles/fonts.css). Same aria-current shape as
  // the motion buttons above, its own class so this query never picks up
  // those. ---
  const fontFamilyOptions = [...menu.querySelectorAll<HTMLButtonElement>('.sp-font-family-option')]

  // One write path, the same shape as setFontSize above: null is the default
  // (Literata) and is stored as nothing stored, so a reset is just this
  // function called with null.
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

  // --- Accent: today's colour, or one the reader pins. ---
  // The write path and the resolution both live in lib/accent.ts, since
  // header-brand.ts applies the same choice on every page load and this panel
  // only exists on a page the reader has opened the menu on. Same aria-current
  // shape as the two groups above; "auto" is stored as nothing stored, so the
  // reset is setAccent(null) like every other default here.
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

  // --- Conway background on/off. ---
  // Every control from here to the pause button reads its value back out of
  // conway.ts rather than out of storage, so its own reset handler is the
  // same one-liner that set it up: resetConway() has already put that
  // module's state back by the time these run.
  const bgLife = menu.querySelector<HTMLInputElement>('#sp-bg-life')
  if (bgLife !== null) {
    const syncBgLife = (): void => {
      bgLife.checked = getSettings().backgroundEnabled
    }
    syncBgLife()
    bgLife.addEventListener('change', () => setBackgroundEnabled(bgLife.checked))
    resetHandlers.push(syncBgLife)
  }

  // --- The reader-adjustable Conway knobs, behind their own disclosure. ---
  //
  // All four are the same three lines with different names, so they share one
  // wiring function rather than repeating it: read the current value, write
  // the slider and its own readout, and re-read after every change.
  //
  // The readout prints from the value the setter actually took, not from the
  // slider's raw string. conway.ts clamps every one of these (setDensity to
  // 1-20, setGps to 0.5-8, and so on), so a value that arrives out of range,
  // from storage written by an older build, say, would otherwise be shown as
  // the number nothing is using.
  //
  // The unit is a symbol appended here rather than a translated string: `%`,
  // `/s` and `s` read the same in both languages, and the number is
  // aria-hidden in the markup anyway (SettingsPanel.astro says why), so this
  // text is never spoken, only seen.
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
  // Stored as an alpha (0 to 0.5) and shown as a percentage: 0.09 reads as 9%,
  // which is the number the owner set this knob's default in.
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

  // --- The search palette's shortcut letter, direct import into
  // search-palette.ts's own control surface, same convention as the Conway
  // setters above. ---
  const searchKey = menu.querySelector<HTMLSelectElement>('#sp-search-key')
  if (searchKey !== null) {
    /*
     * Seven of the 26 letters are a shortcut the browser itself owns, and its
     * chrome intercepts the combination before any listener on this page runs
     * (see RESERVED_LETTERS' own comment in search-palette.ts for which and
     * why). Picking one used to leave the setting looking broken: it saved,
     * and then did nothing at all.
     *
     * They are disabled rather than removed from the list, so the alphabet
     * stays whole and a reader looking for D finds it and can see it is not
     * available, instead of wondering whether the list is just missing letters.
     * The reason rides along in `title`, since a disabled option cannot be
     * focused to announce anything longer.
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

  // --- Pinned preview persistence, moved in from HoverPreviews.astro. ---
  const hpPersist = menu.querySelector<HTMLInputElement>('#hp-persist')
  if (hpPersist !== null) {
    // On by default, so the stored value marks OFF rather than on and an
    // absent key reads as checked: the same direction hover-previews.ts's own
    // persistent() reads, and the same "nothing stored means the default"
    // convention as every other preference here. Both files write this key,
    // so the two have to agree on which value means what.
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
     * The one control whose reset dispatches an event rather than doing the
     * work itself. On a post page hover-previews.ts binds its own listener to
     * this same checkbox, and that listener does more than write the flag: it
     * moves the pinned set between sessionStorage and localStorage. Setting
     * `.checked` from a script fires nothing, so unchecking it silently would
     * leave a pinned set stranded in localStorage that this preference says
     * should not be there. Dispatching the event runs both listeners, that one
     * and the plain flag write just above, and needs no import of a module
     * that is not on every page.
     */
    resetHandlers.push(() => {
      // The default is checked, so a reset only has work to do when the reader
      // had turned it off.
      if (hpPersist.checked) return
      hpPersist.checked = true
      hpPersist.dispatchEvent(new Event('change', { bubbles: true }))
    })
  }

  /*
   * --- Reset all, at the foot of the panel. ---
   *
   * The three modules that own keys of their own go first, then every
   * control's own handler re-reads what they left, so nothing here has to
   * know which key belongs to which control.
   *
   * What it deliberately does not touch is the light/dark theme choice
   * ('color-scheme', theme-toggle.ts). Two reasons, both the same one from
   * different sides: the owner asked for that choice to stay out of this
   * panel, so a reader has no way to see it change from in here and would
   * only find out by watching the whole page invert under a button labelled
   * as a preferences reset; and ThemeToggle already carries its own reset,
   * the "system" option, one button over from this one. A control that
   * reaches outside its own menu to undo a setting the menu does not show is
   * a surprise, not a convenience.
   *
   * 'hp-pinned' is left alone for a different reason: the pinned cards are
   * the reader's own content, not a preference. Turning the persistence flag
   * off above already moves that set back to the session where it belongs.
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
   * The first-visit nudge. Shown once, then never again: the flag is written
   * the moment it appears rather than when the reader opens the panel, so a
   * visitor who ignores it does not meet it again on the next page.
   *
   * Storage throwing (private mode) means "shown already", which errs toward
   * not pestering someone whose browser cannot remember the answer.
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
      // Opening the panel answers it, so it goes at that point rather than
      // waiting for a navigation.
      opener.addEventListener('click', () => nudge.remove(), { once: true })
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
