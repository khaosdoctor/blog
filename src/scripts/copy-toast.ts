/*
 * The site's one copy-confirmation: write to the clipboard, then show the
 * `.toast` (styles/prose/toast.css) for two seconds. Four controls share it:
 * heading anchors (BaseLayout), note anchors (FootnoteSidenotes), equations
 * (MathCopy) and quote citations (QuoteCopy), which used to carry four
 * identical inline copies of this block.
 *
 * Silent on failure everywhere: with no clipboard permission, or on an
 * insecure origin, none of these buttons has anything else left to do, so a
 * failed write shows nothing rather than a toast that lies.
 *
 * The label comes off <html data-copied-label>, stamped by BaseLayout, because
 * it is translated and a module script cannot call t() the way the inline
 * define:vars scripts could.
 */
export async function copyWithToast(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    return
  }

  document.querySelector('.toast')?.remove()
  const toast = document.createElement('div')
  toast.className = 'toast'
  toast.setAttribute('role', 'status')
  toast.textContent = document.documentElement.dataset.copiedLabel ?? 'Copied'
  document.body.append(toast)
  setTimeout(() => toast.remove(), 2000)
}
