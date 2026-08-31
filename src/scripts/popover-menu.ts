export const canPopover = 'popover' in HTMLElement.prototype

const MENU_MARGIN = 8

export const ALIGN = { start: 'start', end: 'end' } as const

export type Align = (typeof ALIGN)[keyof typeof ALIGN]

export function clampAxis(value: number, size: number, extent: number, inset: number): number {
  return Math.min(Math.max(value, inset), Math.max(inset, extent - size - inset))
}

export function placeNear(
  el: HTMLElement,
  anchor: HTMLElement,
  { margin, align }: { margin: number; align: Align },
): void {
  const rect = anchor.getBoundingClientRect()
  const w = el.offsetWidth
  const h = el.offsetHeight
  const vw = innerWidth
  const vh = innerHeight

  let top = rect.bottom + margin
  if (top + h > vh && rect.top - h - margin > 0) top = rect.top - h - margin

  el.style.top = `${clampAxis(top, h, vh, margin)}px`
  el.style.left = `${clampAxis(align === ALIGN.end ? rect.right - w : rect.left, w, vw, margin)}px`
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
    placeNear(menu, opener, { margin: MENU_MARGIN, align: ALIGN.end })
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

export function markCurrent(options: HTMLElement[], value: string): void {
  for (const option of options) option.setAttribute('aria-current', String(option.dataset.value === value))
}

/** Order matters: a popover element that is still `hidden` refuses to show. */
export function promoteToPopover(menu: HTMLElement): void {
  if (!canPopover) return
  menu.removeAttribute('hidden')
  menu.setAttribute('popover', 'auto')
}
