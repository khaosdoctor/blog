/** Both branches are needed: these modules may be imported after parsing ends. */
export function onReady(init: () => void): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
}
