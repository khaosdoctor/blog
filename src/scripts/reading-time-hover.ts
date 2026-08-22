import { onReady } from './ready'

const OPEN_ATTR = 'data-open'

function finishTimeText(minutes: number, lang: string): string {
  const finish = new Date(Date.now() + minutes * 60_000)
  return new Intl.DateTimeFormat(lang, { hour: 'numeric', minute: '2-digit' }).format(finish)
}

let popupSeq = 0

function upgrade(span: HTMLElement): void {
  const minutes = Number(span.dataset.readingMinutes)
  const template = span.dataset.finishTemplate
  if (!Number.isFinite(minutes) || template === undefined) return

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'rt-trigger'
  button.textContent = span.textContent
  button.setAttribute('aria-expanded', 'false')

  // The aria-describedby target has to exist, even empty, before the button
  // ever points at it.
  const popup = document.createElement('span')
  popup.className = 'rt-popup'
  popup.id = `rt-popup-${popupSeq++}`
  button.setAttribute('aria-describedby', popup.id)

  span.replaceChildren(button, popup)

  const show = (): void => {
    // Written synchronously in the handler that received the focus event, or a
    // screen reader announces the empty string the popup started with.
    popup.textContent = template.replace(/%s/, finishTimeText(minutes, document.documentElement.lang || 'en'))
    span.setAttribute(OPEN_ATTR, 'true')
    button.setAttribute('aria-expanded', 'true')
  }

  const hide = (): void => {
    span.removeAttribute(OPEN_ATTR)
    button.setAttribute('aria-expanded', 'false')
  }

  // Bound on the wrapper span, not the button: the popup is a descendant of
  // that span, so moving the pointer onto the popup never fires this leave.
  span.addEventListener('mouseenter', show)
  span.addEventListener('mouseleave', hide)
  button.addEventListener('focus', show)
  button.addEventListener('blur', hide)
}

function init(): void {
  for (const span of document.querySelectorAll<HTMLElement>('.reading-time')) upgrade(span)

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

onReady(init)
