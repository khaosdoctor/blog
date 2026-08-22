import { onReady } from './ready'

onReady(() => {
  const shell = document.querySelector<HTMLElement>('header.shell')
  const toggle = shell?.querySelector<HTMLButtonElement>('.menu-toggle')
  if (!shell || !toggle) return

  shell.dataset.menuReady = ''
  toggle.hidden = false

  const setOpen = (open: boolean): void => {
    if (open) shell.dataset.menuOpen = ''
    if (!open) {
      delete shell.dataset.menuOpen
      shell.querySelector<HTMLDialogElement>('.sx-dialog')?.close()
    }
    toggle.setAttribute('aria-expanded', String(open))
    const label = open ? toggle.dataset.labelClose : toggle.dataset.labelOpen
    if (label !== undefined) toggle.setAttribute('aria-label', label)
  }

  toggle.addEventListener('click', () => {
    setOpen(!('menuOpen' in shell.dataset))
  })

  shell.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('.nav-links a')) setOpen(false)
  })

  // One Escape handler for both layers: two would race on registration order.
  addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !('menuOpen' in shell.dataset)) return
    const palette = shell.querySelector<HTMLDialogElement>('.sx-dialog')
    if (palette?.open === true) {
      palette.close()
      return
    }
    setOpen(false)
  })

  document.addEventListener('click', (event) => {
    if (!('menuOpen' in shell.dataset)) return
    if (!(event.target as HTMLElement).closest('header.shell')) setOpen(false)
  })
})
