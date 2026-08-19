// Wires up the code-block theme picker from CodeTheme.astro, now a single
// row inside SettingsPanel.astro rather than a shared popover with one opener
// button injected per code block (docs/design.md, Settled). This is the
// interactive half only: the blocking snippet that applies a stored choice
// before first paint lives directly in BaseLayout's <head> (see the report),
// since this module is deferred and would otherwise let the wrong theme show
// for a moment. That snippet and this module read and write the same key, and
// resolve the unstored "auto" case the same way (see applyTheme below), so
// they must be kept in sync if either one changes.
//
// The empty export makes this a real module: without one, a script with no
// other import or export is global rather than file-scoped, and its names
// collide with theme-toggle.ts and hover-previews.ts, which have the same
// shape for the same reason.
export {}

const STORAGE_KEY = 'code-theme'
const ATTR = 'data-code-theme'
// theme-toggle.ts's own attribute, read here and never written: the page's
// light/dark choice is what "auto" has to follow (see applyTheme).
const PAGE_THEME_ATTR = 'data-theme'

// The unstored default, the owner's own pairing: ayu-dark on the dark page,
// ayu-light on the light one. These two also lead astro.config.mjs's `themes`
// array, which is what makes expressive-code emit the same pair for a reader
// with no JavaScript at all; the two have to keep matching.
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

/** The site's own explicit light/dark choice, or null when it is following the OS. */
function pageScheme(): 'light' | 'dark' | null {
  const value = document.documentElement.getAttribute(PAGE_THEME_ATTR)
  return value === 'light' || value === 'dark' ? value : null
}

/*
 * A stored theme is set outright. "Auto" is the interesting half.
 *
 * With no site-wide light/dark choice, no attribute at all is correct:
 * expressive-code's own generated CSS puts ayu-light at `:root` and overrides
 * it with ayu-dark under `@media (prefers-color-scheme: dark)`, which is
 * exactly the pairing asked for, arrived at with no JavaScript and no flash.
 *
 * With a site-wide choice, that media query is answering the wrong question:
 * it reports the OS, while the page is showing whatever ThemeToggle was told.
 * A reader on a dark OS who picked light here would get ayu-dark code on a
 * light page. So the matching ayu is named outright as the attribute instead.
 * ayu-light is astro.config.mjs's themes[0], and the generated dark media
 * query is scoped `:not([data-code-theme='ayu-light'])`, so naming it is what
 * switches that override back off; ayu-dark has its own
 * `[data-code-theme='ayu-dark']` rule, the same one the picker uses.
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

// Held at module level so resetCodeTheme() below can put the picker back to
// "auto" as well as clearing the key; init() is the only writer.
let picker: HTMLSelectElement | null = null

/*
 * Back to the unstored default, for settings-panel.ts's reset-all. Clearing
 * the key is not enough on its own: `data-code-theme` may still be on <html>
 * from the reader's old choice, and the picker would still be showing that
 * theme's name. applyTheme(null) is the same path a reader picking "auto"
 * takes, so this resolves to ayu the same way they would, not to github and
 * not to whatever happened to be showing.
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

  // No stored choice selects "auto": the ayu pair, resolved against the page
  // (applyTheme above), which for a reader who has picked nothing anywhere is
  // exactly the media query in astro.config.mjs deciding, the same as a
  // first-time visitor with JavaScript off.
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
   * "Auto" now depends on the page's own light/dark choice, and that choice
   * can change under this module's feet: theme-toggle.ts writes `data-theme`
   * and dispatches nothing when it does. A MutationObserver is the plain
   * platform way to notice a change made by a script this one has no other
   * reason to import, the same technique conway.ts already uses on the same
   * attribute. Re-reading the stored theme rather than caching it keeps the
   * stored branch a no-op: only "auto" actually resolves to something new.
   * No loop is possible, since the attribute written here is a different one.
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
