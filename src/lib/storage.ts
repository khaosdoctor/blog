// Private mode, disabled storage and quota errors must lose the preference
// rather than break the page.

export function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: string | null): void {
  if (value === null) {
    removeStorage(key)
    return
  }
  try {
    localStorage.setItem(key, value)
  } catch {}
}

export function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {}
}
