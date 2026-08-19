// Upgrades ReadingTime.astro's own static "%d min" span into a hoverable
// control: hovering, or focusing, the trigger reveals the clock time a
// reader finishes at if they start now. That finish time cannot be built
// ahead of time (the answer depends on the moment the reader looks), so
// nothing here runs until this script does, and everything it computes is
// thrown away and recomputed on the next hover rather than cached.
//
// The empty export makes this a real module, same reason as cover-hero.ts
// and the rest of src/scripts/: without one a script with no other import or
// export is global, not file-scoped, and would collide with them.
export {}

const OPEN_ATTR = 'data-open'

/**
 * The clock time a reader finishes at, in the page's own locale, hour and
 * minute only. Intl.DateTimeFormat with no year/month/day/second field never
 * asks for a date, and never hardcodes a 12h/24h choice or an AM/PM suffix:
 * that is the locale's own call, exactly the same one document.documentElement
 * .lang (BaseLayout's own <html lang>) already makes for every other date on
 * this site.
 */
function finishTimeText(minutes: number, lang: string): string {
  const finish = new Date(Date.now() + minutes * 60_000)
  return new Intl.DateTimeFormat(lang, { hour: 'numeric', minute: '2-digit' }).format(finish)
}

let popupSeq = 0

/**
 * Turns one static span into a real <button> plus an empty popup <span>. A
 * reader with JS off, or before this has run, sees exactly the plain "%d min"
 * text ReadingTime.astro already rendered: nothing here runs until this
 * function does, and it never removes that text, only moves it onto a
 * button.
 */
function upgrade(span: HTMLElement): void {
  const minutes = Number(span.dataset.readingMinutes)
  const template = span.dataset.finishTemplate
  if (!Number.isFinite(minutes) || template === undefined) return

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'rt-trigger'
  button.textContent = span.textContent
  button.setAttribute('aria-expanded', 'false')

  // Empty until the first show(): the finish time is announced to a screen
  // reader through aria-describedby below, not painted only, so the target
  // has to exist (even empty) before the button ever gets it.
  const popup = document.createElement('span')
  popup.className = 'rt-popup'
  popup.id = `rt-popup-${popupSeq++}`
  button.setAttribute('aria-describedby', popup.id)

  span.replaceChildren(button, popup)

  const show = (): void => {
    // Computed here, on every hover/focus, never once on load: a tab left
    // open for an hour would otherwise keep showing the first answer it ever
    // gave. Written into the popup synchronously, in the same handler that
    // received the focus event, so a screen reader reading the button's own
    // aria-describedby announces this text rather than the empty string the
    // popup started with.
    popup.textContent = template.replace(/%s/, finishTimeText(minutes, document.documentElement.lang || 'en'))
    span.setAttribute(OPEN_ATTR, 'true')
    button.setAttribute('aria-expanded', 'true')
  }

  const hide = (): void => {
    span.removeAttribute(OPEN_ATTR)
    button.setAttribute('aria-expanded', 'false')
  }

  // mouseenter/mouseleave on the wrapper span, not on the button: the popup
  // is a descendant of that same span, so a pointer moving off the button and
  // onto the popup never fires this leave. That is the whole of "hoverable"
  // (WCAG 1.4.13's second requirement): nothing extra to track for it.
  span.addEventListener('mouseenter', show)
  span.addEventListener('mouseleave', hide)
  // A keyboard reaches the same popup through the button itself: a real
  // <button> is a normal stop in the page's own tab order, and focus/blur
  // mirror the mouse pair above so a keyboard user gets the identical,
  // persistent popup (WCAG 1.4.13's third requirement: it stays up until
  // hover or focus is removed, or the reader dismisses it below, never on a
  // timeout).
  button.addEventListener('focus', show)
  button.addEventListener('blur', hide)
}

function init(): void {
  for (const span of document.querySelectorAll<HTMLElement>('.reading-time')) upgrade(span)

  // Escape closes the open popup without moving the pointer or the keyboard
  // focus anywhere else, WCAG 1.4.13's first requirement ("dismissable"):
  // focus stays on the trigger, ready to reopen it.
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return
    const open = document.querySelector<HTMLElement>(`.reading-time[${OPEN_ATTR}="true"]`)
    if (open === null) return
    open.removeAttribute(OPEN_ATTR)
    const trigger = open.querySelector<HTMLButtonElement>('.rt-trigger')
    trigger?.setAttribute('aria-expanded', 'false')
    trigger?.focus()
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
