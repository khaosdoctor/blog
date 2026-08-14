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

function init(): void {
  const wrapper = document.querySelector<HTMLElement>('.ct-settings')
  const select = document.querySelector<HTMLSelectElement>('#ct-theme')
  if (wrapper === null || select === null) return

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
      return
    }
    if (!isThemeName(select.value)) return
    try {
      localStorage.setItem(STORAGE_KEY, select.value)
    } catch {
      // Private mode, storage disabled: the theme still applies for this page.
    }
    applyTheme(select.value)
  })

  // Nothing above matters without a script to run it, so the picker only
  // appears once it is actually wired up.
  wrapper.hidden = false
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
