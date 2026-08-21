// The phone header's hamburger. Everything visual lives in BrandHeader.astro
// behind [data-menu-ready]/[data-menu-open]; this only owns the state, so a
// reader with JS off keeps the plain stacked header instead of a dead button.
import { onReady } from './ready'

onReady(() => {
  const shell = document.querySelector<HTMLElement>('header.shell')
  const toggle = shell?.querySelector<HTMLButtonElement>('.menu-toggle')
  if (!shell || !toggle) return

  shell.dataset.menuReady = ''
  toggle.hidden = false

  const setOpen = (open: boolean): void => {
    if (open) shell.dataset.menuOpen = ''
    else {
      delete shell.dataset.menuOpen
      // The search dropdown is only a dropdown while the drawer is open, so
      // leaving it open here would draw it as the desktop modal instead.
      shell.querySelector<HTMLDialogElement>('.sx-dialog')?.close()
    }
    toggle.setAttribute('aria-expanded', String(open))
    const label = open ? toggle.dataset.labelClose : toggle.dataset.labelOpen
    if (label !== undefined) toggle.setAttribute('aria-label', label)
  }

  toggle.addEventListener('click', () => {
    setOpen(!('menuOpen' in shell.dataset))
  })

  // Choosing a destination is also the end of the menu.
  shell.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('.nav-links a')) setOpen(false)
  })

  /*
   * Escape dismisses one layer at a time, and both layers are decided here:
   * the drawer's search palette opens non-modal (search-palette.ts), so it gets
   * no 'cancel' event of its own, and splitting the two presses across two
   * modules would leave which one wins up to listener registration order.
   */
  addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !('menuOpen' in shell.dataset)) return
    const palette = shell.querySelector<HTMLDialogElement>('.sx-dialog')
    if (palette?.open === true) palette.close()
    else setOpen(false)
  })

  // A tap on the page below the header reads as "done with the menu".
  document.addEventListener('click', (event) => {
    if (!('menuOpen' in shell.dataset)) return
    if (!(event.target as HTMLElement).closest('header.shell')) setOpen(false)
  })
})
