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

type ThemeName = 'github-light' | 'github-dark' | 'monokai' | 'solarized-dark'

const THEMES: ThemeName[] = ['github-light', 'github-dark', 'monokai', 'solarized-dark']

function isThemeName(value: string): value is ThemeName {
  return (THEMES as string[]).includes(value)
}

function storedTheme(): ThemeName | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value !== null && isThemeName(value) ? value : null
  } catch {
    // Private mode, storage disabled: fall through to the auto/system option.
    return null
  }
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
    'solarized-dark': strings.solarizedDark,
  }
  for (const option of select.options) {
    option.textContent = captions[option.value] ?? option.value
  }

  // No stored choice selects "auto": the media query in astro.config.mjs
  // still decides, exactly like a first-time visitor with JavaScript off.
  select.value = storedTheme() ?? 'auto'

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
