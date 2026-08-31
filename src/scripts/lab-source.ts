import { copyWithToast } from './copy-toast'
import { onReady } from './ready'

const pending = new Set<HTMLAnchorElement>()

function setExpanded(link: HTMLAnchorElement, expanded: boolean): void {
  link.setAttribute('aria-expanded', String(expanded))
  const label = link.querySelector('span')
  if (label === null) return
  label.textContent = expanded ? (link.dataset.hide ?? '') : (link.dataset.show ?? '')
}

async function fetchSource(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const page = new DOMParser().parseFromString(await response.text(), 'text/html')
    return page.getElementById('lab-source')?.innerHTML ?? null
  } catch {
    return null
  }
}

/*
 * Expressive-code only ships its copy handler on a page that already has a
 * fenced block, so a lab post with none would reveal a dead button. Replacing
 * the control removes that dependency instead of relying on it.
 */
function bindCopy(panel: HTMLElement): void {
  const original = panel.querySelector('.copy')
  const lines = panel.querySelectorAll('.ec-line .code')
  if (original === null || lines.length === 0) return

  // Per line, and only the code half: `pre > code` also holds the line-number
  // gutter, so its text would paste the numbers along with the source.
  const source = [...lines].map((line) => line.textContent ?? '').join('\n')

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'lab-source-copy'
  button.textContent = original.querySelector('button')?.getAttribute('title') ?? ''
  button.addEventListener('click', () => void copyWithToast(source, 'source'))
  original.replaceWith(button)
}

async function reveal(link: HTMLAnchorElement): Promise<void> {
  const row = link.parentElement
  if (row === null || pending.has(link)) return

  const revealed = row.nextElementSibling
  if (revealed?.classList.contains('lab-source-code')) {
    const hidden = revealed.hasAttribute('hidden')
    revealed.toggleAttribute('hidden', !hidden)
    setExpanded(link, hidden)
    return
  }

  pending.add(link)
  const html = await fetchSource(link.href)
  pending.delete(link)

  // Offline, or a file that never built: the link goes where it always went.
  if (html === null) {
    window.location.assign(link.href)
    return
  }

  const panel = document.createElement('div')
  panel.className = 'lab-source-code'
  panel.id = `lab-source-${document.querySelectorAll('.lab-source-code').length + 1}`
  // The markup comes from a page of this same build, so it is output, not input.
  panel.innerHTML = html
  bindCopy(panel)
  row.after(panel)
  link.setAttribute('aria-controls', panel.id)
  setExpanded(link, true)
}

onReady(() => {
  for (const link of document.querySelectorAll<HTMLAnchorElement>('.lab-source a')) {
    link.setAttribute('aria-expanded', 'false')
    link.addEventListener('click', (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      void reveal(link)
    })
  }
})
