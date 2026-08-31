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
import { readStorage, removeStorage, writeStorage } from '../lib/storage'
import {
  fontSizeDefaultPercent as FONT_SIZE_DEFAULT,
  fontSizeMaximumPercent as FONT_SIZE_MAX,
  fontSizeMinimumPercent as FONT_SIZE_MIN,
  fontSizeStepPercent as FONT_SIZE_STEP,
} from '../lib/tweaks'
import { markCurrent, promoteToPopover, wireMenu } from './popover-menu'
import { onReady } from './ready'

const HP_PERSIST_KEY = 'hp-persist'

const NUDGE_KEY = 'settings-nudge-seen'

const FONT_SIZE_KEY = 'font-size'

function clampFontSize(value: number): number {
  const clamped = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, value))
  return FONT_SIZE_MIN + Math.round((clamped - FONT_SIZE_MIN) / FONT_SIZE_STEP) * FONT_SIZE_STEP
}

function storedFontSize(): number {
  const raw = readStorage(FONT_SIZE_KEY)
  if (raw === null) return FONT_SIZE_DEFAULT
  const value = Number(raw)
  return Number.isFinite(value) ? clampFontSize(value) : FONT_SIZE_DEFAULT
}

function applyFontSize(value: number): void {
  if (value === FONT_SIZE_DEFAULT) document.documentElement.style.removeProperty('--font-scale')
  else document.documentElement.style.setProperty('--font-scale', String(value / 100))
}

const BODY_FACE_KEY = 'body-face'

function storedBodyFace(): 'sans' | null {
  return readStorage(BODY_FACE_KEY) === 'sans' ? 'sans' : null
}

function applyBodyFace(face: 'sans' | null): void {
  if (face === null) document.documentElement.removeAttribute('data-body-face')
  else document.documentElement.setAttribute('data-body-face', face)
}

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

  const resetHandlers: Array<() => void> = []

  wireMenu(wrapper, opener, menu)


  const motionOptions = [...menu.querySelectorAll<HTMLButtonElement>('.sp-motion-option')]
  const markMotion = (value: string): void => {
    markCurrent(motionOptions, value)
  }
  markMotion(getSettings().motion ?? 'system')
  resetHandlers.push(() => markMotion(getSettings().motion ?? 'system'))

  for (const option of motionOptions) {
    option.addEventListener('click', () => {
      const value = option.dataset.value
      setMotion(value === 'reduce' || value === 'allow' ? value : null)
      markMotion(value ?? 'system')
    })
  }

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
      if (fontSizeDown !== null) fontSizeDown.disabled = value <= FONT_SIZE_MIN
      if (fontSizeUp !== null) fontSizeUp.disabled = value >= FONT_SIZE_MAX
    }

    const setFontSize = (next: number): void => {
      value = clampFontSize(next)
      if (value === FONT_SIZE_DEFAULT) removeStorage(FONT_SIZE_KEY)
      else writeStorage(FONT_SIZE_KEY, String(value))
      applyFontSize(value)
      syncFontSize()
    }

    syncFontSize()

    fontSizeDown?.addEventListener('click', () => setFontSize(value - FONT_SIZE_STEP))
    fontSizeUp?.addEventListener('click', () => setFontSize(value + FONT_SIZE_STEP))
    fontSizeReset?.addEventListener('click', () => setFontSize(FONT_SIZE_DEFAULT))

    // `input` fires per keystroke, so "5" on the way to "50" would clamp up and
    // overwrite what is being typed; `change` fires on blur, Enter and arrow steps.
    fontSizeInput.addEventListener('change', () => {
      const typed = Number(fontSizeInput.value)
      setFontSize(Number.isFinite(typed) && fontSizeInput.value.trim() !== '' ? typed : FONT_SIZE_DEFAULT)
    })

    resetHandlers.push(() => setFontSize(FONT_SIZE_DEFAULT))
  }

  const fontFamilyOptions = [...menu.querySelectorAll<HTMLButtonElement>('.sp-font-family-option')]

  const setBodyFace = (face: 'sans' | null): void => {
    if (face === null) removeStorage(BODY_FACE_KEY)
    else writeStorage(BODY_FACE_KEY, face)
    applyBodyFace(face)
    markCurrent(fontFamilyOptions, face ?? 'serif')
  }

  markCurrent(fontFamilyOptions, storedBodyFace() ?? 'serif')

  for (const option of fontFamilyOptions) {
    option.addEventListener('click', () => setBodyFace(option.dataset.value === 'sans' ? 'sans' : null))
  }

  resetHandlers.push(() => setBodyFace(null))

  const accentOptions = [...menu.querySelectorAll<HTMLButtonElement>('.sp-accent-auto, .sp-accent-option')]
  if (accentOptions.length > 0) {
    const syncAccent = (): void => {
      markCurrent(accentOptions, storedAccent() ?? 'auto')
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

  const bgLife = menu.querySelector<HTMLInputElement>('#sp-bg-life')
  if (bgLife !== null) {
    const syncBgLife = (): void => {
      bgLife.checked = getSettings().backgroundEnabled
    }
    syncBgLife()
    bgLife.addEventListener('change', () => setBackgroundEnabled(bgLife.checked))
    resetHandlers.push(syncBgLife)
  }

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

  const searchKey = menu.querySelector<HTMLSelectElement>('#sp-search-key')
  if (searchKey !== null) {
    // The browser intercepts its own shortcut letters before any listener here
    // runs. `title` is all a disabled option can carry.
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

  const hpPersist = menu.querySelector<HTMLInputElement>('#hp-persist')
  if (hpPersist !== null) {
    hpPersist.checked = readStorage(HP_PERSIST_KEY) !== '0'
    hpPersist.addEventListener('change', () => {
      if (hpPersist.checked) removeStorage(HP_PERSIST_KEY)
      else writeStorage(HP_PERSIST_KEY, '0')
    })
    resetHandlers.push(() => {
      if (hpPersist.checked) return
      hpPersist.checked = true
      hpPersist.dispatchEvent(new Event('change', { bubbles: true }))
    })
  }

  // Order matters: the modules that own their own keys clear them first, then
  // every control's handler re-reads what they left.
  const resetAll = menu.querySelector<HTMLButtonElement>('#sp-reset-all')
  resetAll?.addEventListener('click', () => {
    resetConway()
    resetShortcutLetter()
    resetCodeTheme()
    for (const handler of resetHandlers) handler()
  })

  promoteToPopover(menu)

  wrapper.removeAttribute('hidden')

  const nudge = wrapper.querySelector<HTMLElement>('[data-nudge]')
  if (nudge !== null) {
    // Not readStorage: a reader whose storage throws must not be nudged on
    // every visit, and the helper cannot tell an absent key from a refusal.
    let seen = true
    try {
      seen = localStorage.getItem(NUDGE_KEY) === '1'
      if (!seen) localStorage.setItem(NUDGE_KEY, '1')
    } catch {}
    if (!seen) {
      nudge.hidden = false
      opener.addEventListener('click', () => nudge.remove(), { once: true })
    }
  }
}

onReady(init)
