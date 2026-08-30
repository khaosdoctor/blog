import { readStorage, removeStorage, writeStorage } from '../lib/storage'
import { pageScheme, THEME_ATTR } from './scheme'
import { onReady } from './ready'

const STORAGE_KEY = 'code-theme'
const ATTR = 'data-code-theme'

const THEME_BY_MODE = {
  normal: { light: 'ayu-light', dark: 'ayu-dark' },
  'high-contrast': { light: 'github-light-high-contrast', dark: 'github-dark-high-contrast' },
} as const

type Mode = keyof typeof THEME_BY_MODE

function isMode(value: string): value is Mode {
  return value === 'normal' || value === 'high-contrast'
}

function rawStored(): string | null {
  return readStorage(STORAGE_KEY)
}

function storedMode(): Mode | null {
  const value = rawStored()
  return value !== null && isMode(value) ? value : null
}

function currentMode(): Mode {
  return storedMode() ?? 'normal'
}

function osScheme(): 'light' | 'dark' {
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// Normal's ayu pair is expressive-code's own automatic dark-mode pairing (see
// the themes comment in astro.config.mjs), so leaving the attribute unset
// when no site-wide scheme is chosen already resolves it through CSS alone.
// High contrast has no such pairing, so it is named outright either way.
function applyTheme(mode: Mode): void {
  const scheme = pageScheme()
  if (mode === 'normal' && scheme === null) {
    document.documentElement.removeAttribute(ATTR)
    return
  }
  document.documentElement.setAttribute(ATTR, THEME_BY_MODE[mode][scheme ?? osScheme()])
}

let picker: HTMLSelectElement | null = null

export function resetCodeTheme(): void {
  removeStorage(STORAGE_KEY)
  applyTheme('normal')
  if (picker !== null) picker.value = 'normal'
}

function init(): void {
  const wrapperEl = document.querySelector<HTMLElement>('.ct-settings')
  const selectEl = document.querySelector<HTMLSelectElement>('#ct-theme')
  if (wrapperEl === null || selectEl === null) return
  const wrapper = wrapperEl
  const select = selectEl
  picker = select

  const strings = wrapper.dataset
  const label = wrapper.querySelector('label')
  if (label) label.textContent = strings.label ?? 'Code theme'

  const captions: Partial<Record<Mode, string | undefined>> = {
    normal: strings.normal,
    'high-contrast': strings.highContrast,
  }
  for (const option of select.options) {
    option.textContent = captions[option.value as Mode] ?? option.value
  }

  // The pre-paint snippet cannot validate what it read and may already have
  // set a theme from a mode this build no longer knows. This is the first
  // point that can.
  const raw = rawStored()
  const valid = storedMode()
  if (raw !== null && valid === null) removeStorage(STORAGE_KEY)
  applyTheme(valid ?? 'normal')

  select.value = valid ?? 'normal'

  select.addEventListener('change', () => {
    if (!isMode(select.value)) return
    writeStorage(STORAGE_KEY, select.value)
    applyTheme(select.value)
  })

  new MutationObserver(() => applyTheme(currentMode())).observe(document.documentElement, {
    attributes: true,
    attributeFilter: [THEME_ATTR],
  })

  // Normal's OS-driven half is free, through the CSS media query; high
  // contrast has no such rule, so an OS change needs this to repaint it live.
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(currentMode()))

  wrapper.removeAttribute('hidden')
}

onReady(init)
