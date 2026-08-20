// The code-block theme picker, one row inside SettingsPanel.astro.
//
// The interactive half only: the blocking snippet in BaseLayout's <head>
// applies a stored choice before first paint, since this module is deferred.
// Both read the same key AND resolve the unstored "auto" case the same way
// (see applyTheme), so the two have to be kept in step.
//
// The empty export makes this a real module, or its names would be global.
export {}

const STORAGE_KEY = 'code-theme'
const ATTR = 'data-code-theme'
// theme-toggle.ts's attribute, read here and never written: the page's
// light/dark choice is what "auto" follows.
const PAGE_THEME_ATTR = 'data-theme'

// The unstored default. These two also lead astro.config.mjs's `themes` array,
// which is what makes expressive-code emit the same pair for a reader with no
// JavaScript at all. The two have to keep matching.
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

// Unvalidated, used once at startup to tell "nothing stored" apart from
// "something stored that is no longer a real theme", so the latter can be
// cleaned up rather than lingering.
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

/** The site's own light/dark choice, or null when it follows the OS. */
function pageScheme(): 'light' | 'dark' | null {
  const value = document.documentElement.getAttribute(PAGE_THEME_ATTR)
  return value === 'light' || value === 'dark' ? value : null
}

/*
 * A stored theme is set outright. "Auto" is the interesting half.
 *
 * With no site-wide choice, no attribute at all is correct: expressive-code's
 * generated CSS already puts ayu-light at `:root` and ayu-dark under the dark
 * media query, with no JavaScript and no flash.
 *
 * With a site-wide choice, that media query answers the wrong question: it
 * reports the OS while the page shows what ThemeToggle was told, so a reader on
 * a dark OS who picked light here would get ayu-dark code on a light page. The
 * matching ayu is named outright instead. Naming ayu-light is also what
 * switches the generated dark override back off, since it is scoped
 * `:not([data-code-theme='ayu-light'])`.
 */
function applyTheme(theme: ThemeName | null): void {
  if (theme !== null) {
    document.documentElement.setAttribute(ATTR, theme)
    return
  }
  const scheme = pageScheme()
  if (scheme === null) document.documentElement.removeAttribute(ATTR)
  else document.documentElement.setAttribute(ATTR, scheme === 'dark' ? AUTO_DARK : AUTO_LIGHT)
}

// Module level so resetCodeTheme() can put the picker back to "auto" as well as
// clearing the key. init() is the only writer.
let picker: HTMLSelectElement | null = null

/*
 * Back to the unstored default, for reset-all. Clearing the key is not enough:
 * the attribute may still be on <html> from the old choice and the picker would
 * still show that theme's name. This takes the same path a reader picking
 * "auto" takes, so it resolves to ayu rather than to github or to whatever
 * happened to be showing.
 */
export function resetCodeTheme(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to clean up if storage was never available.
  }
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

  // The <option>s ship with no text: the labels come from data attributes,
  // since a plain module has no access to t().
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

  // A value stored before a theme was dropped from the list is neither "auto"
  // nor something any selector matches. The blocking script cannot tell the
  // difference and may already have set that stale name, which silently falls
  // back to the media query while lingering in storage forever. This is the
  // first point able to validate it, so it clears it.
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

  /*
   * "Auto" depends on the page's light/dark choice, and theme-toggle.ts changes
   * that attribute without dispatching anything. Re-reading the stored theme
   * rather than caching it keeps the stored branch a no-op: only "auto"
   * resolves to something new. No loop, since the attribute written here is a
   * different one.
   */
  new MutationObserver(() => applyTheme(storedTheme())).observe(document.documentElement, {
    attributes: true,
    attributeFilter: [PAGE_THEME_ATTR],
  })

  wrapper.removeAttribute('hidden')
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
