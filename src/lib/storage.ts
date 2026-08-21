/**
 * localStorage with the failure modes swallowed: private mode, storage
 * disabled, or quota errors must never break the page, only lose the
 * preference. Every client script used to hand-roll this try/catch.
 */

export function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/** null clears the key: this site stores every default as nothing stored. */
export function writeStorage(key: string, value: string | null): void {
  if (value === null) {
    removeStorage(key)
    return
  }
  try {
    localStorage.setItem(key, value)
  } catch {
    // The choice still applies for this page; it just will not persist.
  }
}

export function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // Nothing to clear if storage is unreachable.
  }
}
