export const canPopover = 'popover' in HTMLElement.prototype

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

/** Local `open` because `:popover-open` and `hidden` are two different sources of truth. */
export function wireMenu(
  wrapper: HTMLElement,
  opener: HTMLButtonElement,
  menu: HTMLElement,
): (returnFocus: boolean) => void {
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
      /* not showing as a popover */
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

  return closeMenu
}

/** Order matters: a popover element that is still `hidden` refuses to show. */
export function promoteToPopover(menu: HTMLElement): void {
  if (!canPopover) return
  menu.removeAttribute('hidden')
  menu.setAttribute('popover', 'auto')
}
