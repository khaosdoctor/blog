/**
 * What was put on the clipboard. The toast names the thing, so copying a quote
 * cannot report a copied link. BaseLayout writes one attribute per kind on
 * <html>, which is what keeps these strings translated without every caller
 * reaching into the i18n tables.
 */
const LABEL_ATTRIBUTE = {
  link: 'copiedLabel',
  quote: 'quoteCopiedLabel',
  formula: 'formulaCopiedLabel',
  source: 'sourceCopiedLabel',
} as const

type Copied = keyof typeof LABEL_ATTRIBUTE

/** Silent on failure: with no permission or on an insecure origin, a toast would lie. */
export async function copyWithToast(text: string, kind: Copied = 'link'): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    return
  }

  const labels = document.documentElement.dataset
  document.querySelector('.toast')?.remove()
  const toast = document.createElement('div')
  toast.className = 'toast'
  toast.setAttribute('role', 'status')
  toast.textContent = labels[LABEL_ATTRIBUTE[kind]] ?? labels.copiedLabel ?? 'Copied'
  document.body.append(toast)
  setTimeout(() => toast.remove(), 2000)
}
