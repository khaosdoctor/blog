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

async function reveal(link: HTMLAnchorElement): Promise<void> {
  const row = link.parentElement
  if (row === null || pending.has(link)) return

  const revealed = row.nextElementSibling
  if (revealed !== null && revealed.classList.contains('lab-source-code')) {
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
