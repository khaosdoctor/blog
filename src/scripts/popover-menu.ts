// The shared open/close/position shell for the header's anchored menus
// (theme-toggle.ts and settings-panel.ts), which carried identical copies.

// Where the native popover API exists the menu is promoted to the top layer,
// with no stacking context or outside-click bookkeeping of its own. Where it
// does not, the same element is toggled with `hidden` and positioned manually.
export const canPopover = 'popover' in HTMLElement.prototype

/**
 * Places the menu next to its opener, clamped to the viewport.
 * getBoundingClientRect is viewport-relative, which lines up with the `fixed`
 * positioning the fallback sets and the popover API imposes.
 */
function placeMenu(el: HTMLElement, anchor: HTMLElement): void {
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

export interface MenuController {
  isOpen(): boolean
  open(): void
  close(returnFocus: boolean): void
}

/**
 * Wires opener click, outside click and Escape for one menu. Open state is
 * tracked here rather than read off the element: `:popover-open` and the
 * `hidden` attribute are two different sources of truth, and the close paths
 * have to work the same way whichever is in play.
 */
export function wireMenu(wrapper: HTMLElement, opener: HTMLButtonElement, menu: HTMLElement): MenuController {
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
    placeMenu(menu, opener)
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
    if (!wrapper.contains(event.target as Element)) closeMenu(false)
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open) closeMenu(true)
  })

  return { isOpen: () => open, open: openMenu, close: closeMenu }
}

/**
 * Promotes a wired menu to a native popover where supported. `hidden` is
 * cleared before `popover` is set: a popover-attributed element that is still
 * hidden refuses to show.
 */
export function promoteToPopover(menu: HTMLElement): void {
  if (!canPopover) return
  menu.removeAttribute('hidden')
  menu.setAttribute('popover', 'auto')
}
