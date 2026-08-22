/** Silent on failure: with no permission or on an insecure origin, a toast would lie. */
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
