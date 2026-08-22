import { readStorage, removeStorage, writeStorage } from '../lib/storage'
import { onReady } from './ready'

const STORAGE_KEY = 'code-theme'
const ATTR = 'data-code-theme'
const PAGE_THEME_ATTR = 'data-theme'

const AUTO_LIGHT = 'ayu-light'
const AUTO_DARK = 'ayu-dark'
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

function rawStored(): string | null {
  return readStorage(STORAGE_KEY)
}

function storedTheme(): ThemeName | null {
  const value = rawStored()
  return value !== null && isThemeName(value) ? value : null
}

function pageScheme(): 'light' | 'dark' | null {
  const value = document.documentElement.getAttribute(PAGE_THEME_ATTR)
  return value === 'light' || value === 'dark' ? value : null
}

// "Auto" sets no attribute until a site-wide scheme exists; ayu-light is named
// deliberately, since the generated dark override is scoped to exclude it.
function applyTheme(theme: ThemeName | null): void {
  if (theme !== null) {
    document.documentElement.setAttribute(ATTR, theme)
    return
  }
  const scheme = pageScheme()
  if (scheme === null) document.documentElement.removeAttribute(ATTR)
  else document.documentElement.setAttribute(ATTR, scheme === 'dark' ? AUTO_DARK : AUTO_LIGHT)
}

let picker: HTMLSelectElement | null = null

export function resetCodeTheme(): void {
  removeStorage(STORAGE_KEY)
  applyTheme(null)
  if (picker !== null) picker.value = 'auto'
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

  // The pre-paint snippet cannot validate what it read and may already have set
  // a theme name that no longer exists. This is the first point that can.
  const raw = rawStored()
  const valid = storedTheme()
  if (raw !== null && valid === null) removeStorage(STORAGE_KEY)
  applyTheme(valid)

  select.value = valid ?? 'auto'

  select.addEventListener('change', () => {
    if (select.value === 'auto') {
      removeStorage(STORAGE_KEY)
      applyTheme(null)
      return
    }
    if (!isThemeName(select.value)) return
    writeStorage(STORAGE_KEY, select.value)
    applyTheme(select.value)
  })

  new MutationObserver(() => applyTheme(storedTheme())).observe(document.documentElement, {
    attributes: true,
    attributeFilter: [PAGE_THEME_ATTR],
  })

  wrapper.removeAttribute('hidden')
}

onReady(init)
