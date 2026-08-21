/**
 * Runs init now if the DOM is already parsed, otherwise on DOMContentLoaded.
 * Needed because these modules load deferred but may also be imported after
 * parsing; every client script here carried its own copy of this guard.
 */
export function onReady(init: () => void): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
}
