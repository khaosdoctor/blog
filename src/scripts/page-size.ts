// Wires up the size control Pagination.astro renders beside its own
// prev/numbers/next row: a trigger button and a popup list of options, the
// same open/close/place/dismiss shape as ThemeToggle.astro's own
// theme-toggle.ts (read there in full before this file was written) and
// SettingsPanel.astro's own gear menu, so this reads as the same family of
// control rather than a fourth, different one. Kept as its own copy of that
// shape rather than pulled into a shared module: the two existing files
// would need to become its callers too for that extraction not to be an
// abstraction with a single caller, and refactoring settings-panel.ts's own
// already-working popover here, unverified in a browser this session, is a
// worse trade than one more copy of a dozen lines.
//
// The empty export makes this a real module, same reason as the other
// scripts in this directory: without one its names would be global and
// could collide with theirs.
export {}

/**
 * The build only ever produces one page size (src/lib/posts.ts's own
 * LIST_PAGE_SIZE, read here off the nav's own data-built-page-size
 * attribute rather than imported, since a plain build-time constant is not
 * something a client script can reach into an Astro module for). A reader
 * asking for a bigger one is served by fetching however many further
 * already-built pages that size needs and appending their posts onto this
 * one: no second build at a second size, which is also why choosing 20, 50
 * or 100 changes what a bookmarked URL shows (the URL still names one
 * built-size page, not the merged view a stored preference produces on top
 * of it) and why a reader with JS off never sees anything past the
 * LIST_PAGE_SIZE this page was actually built at (the control itself never
 * appears for them either, see Pagination.astro's own comment on why). See
 * src/lib/posts.ts's own comment on LIST_PAGE_SIZE, and the task report,
 * for the full trade.
 */
const PAGE_SIZE_KEY = 'page-size'

function hrefFor(basePath: string, pageNumber: number): string {
  return pageNumber === 1 ? basePath : `${basePath}${pageNumber}/`
}

/** Strips a prev/next link down to the same disabled shape Pagination.astro
 * itself renders for the first/last built page, without swapping it for the
 * `<span>` that markup actually uses: the CSS rule that shape depends on
 * (`.pg-btn[aria-disabled='true']`) matches by attribute, not by tag, so an
 * `<a>` with the attribute set and no href reads identically. */
function disable(link: HTMLAnchorElement): void {
  link.removeAttribute('href')
  link.removeAttribute('rel')
  link.setAttribute('aria-disabled', 'true')
  link.setAttribute('tabindex', '-1')
}

/**
 * Every already-built page from `start` to `end` (inclusive), fetched at
 * once, resolved in the order they were requested rather than the order
 * their responses arrive: a failed fetch drops that page's posts silently
 * instead of breaking the ones already on screen, since the reader's own
 * current page came from the server and must survive whatever the network
 * does next.
 */
async function fetchPosts(basePath: string, start: number, end: number): Promise<Element[][]> {
  const requests = []
  for (let page = start; page <= end; page++) {
    requests.push(
      fetch(hrefFor(basePath, page))
        .then((response) => response.text())
        .then((html) => {
          const doc = new DOMParser().parseFromString(html, 'text/html')
          const otherList = doc.querySelector('nav.pagination')?.previousElementSibling
          return otherList === null || otherList === undefined ? [] : Array.from(otherList.children)
        })
        .catch(() => []),
    )
  }
  return Promise.all(requests)
}

/**
 * Merges however many further built pages the chosen size needs onto the
 * one already on screen, then rewrites prev/next to jump a whole group of
 * built pages at once. Runs once, on init, independent of whether the
 * reader ever opens the size menu on this particular page.
 */
async function mergeToSize(nav: HTMLElement, groupSize: number): Promise<void> {
  const basePath = nav.dataset.basePath ?? '/'
  const currentPage = Number(nav.dataset.currentPage ?? '1')
  const lastPage = Number(nav.dataset.lastPage ?? '1')

  const postList = nav.previousElementSibling
  if (postList === null) return

  const groupEnd = Math.min(currentPage + groupSize - 1, lastPage)
  if (groupEnd > currentPage) {
    const pages = await fetchPosts(basePath, currentPage + 1, groupEnd)
    for (const children of pages) postList.append(...children)
  }

  // Prev/next now jump a whole group of built pages instead of one, so a
  // link the server rendered enabled can need disabling here (this group's
  // edge fell past what jumping one page at a time would have reached); the
  // reverse never happens, since the built page a reader arrives at
  // directly does not have to be a group's own start (see fetchPosts's own
  // comment).
  const prevLink = nav.querySelector<HTMLAnchorElement>('a[rel="prev"]')
  if (prevLink !== null) {
    const prevTarget = currentPage - groupSize
    if (prevTarget < 1) disable(prevLink)
    else prevLink.href = hrefFor(basePath, prevTarget)
  }

  const nextLink = nav.querySelector<HTMLAnchorElement>('a[rel="next"]')
  if (nextLink !== null) {
    const nextTarget = groupEnd + 1
    if (nextTarget > lastPage) disable(nextLink)
    else nextLink.href = hrefFor(basePath, nextTarget)
  }

  // The numbered jump-to-page list does not generalise to a merged group
  // without also porting Pagination.astro's own ellipsis algorithm to this
  // script for a marginal gain; prev/next above stay as the only navigation
  // once a size other than the built one is active.
  nav.querySelector('.numbers')?.remove()
}

const canPopover = 'popover' in HTMLElement.prototype

/** Same shape as theme-toggle.ts's own place(): getBoundingClientRect is
 * viewport-relative, which lines up with `position: fixed` (set in CSS for
 * the no-popover fallback, and imposed by the UA itself once `popover` is
 * set). */
function place(el: HTMLElement, anchor: HTMLElement): void {
  const rect = anchor.getBoundingClientRect()
  const space = 8
  const w = el.offsetWidth
  const h = el.offsetHeight
  const vw = innerWidth
  const vh = innerHeight

  let top = rect.bottom + space
  if (top + h > vh && rect.top - h - space > 0) top = rect.top - h - space
  top = Math.min(Math.max(top, space), Math.max(space, vh - h - space))

  const left = Math.min(Math.max(rect.right - w, space), Math.max(space, vw - w - space))

  el.style.top = `${top}px`
  el.style.left = `${left}px`
}

function init(): void {
  const nav = document.querySelector<HTMLElement>('nav.pagination')
  const wrapperEl = document.querySelector<HTMLElement>('.pg-size')
  const openerEl = document.querySelector<HTMLButtonElement>('.pg-size-open')
  const menuEl = document.querySelector<HTMLElement>('.pg-size-menu')
  if (nav === null || wrapperEl === null || openerEl === null || menuEl === null) return
  const wrapper = wrapperEl
  const opener = openerEl
  const menu = menuEl

  const options = Array.from(menu.querySelectorAll<HTMLButtonElement>('.pg-size-option'))
  if (options.length === 0) return

  const builtSize = Number(nav.dataset.builtPageSize ?? '10')
  const validSizes = options.map((option) => Number(option.dataset.value))

  function storedSize(): number {
    try {
      const raw = Number(localStorage.getItem(PAGE_SIZE_KEY))
      return validSizes.includes(raw) ? raw : builtSize
    } catch {
      return builtSize
    }
  }

  const openerLabel = opener.querySelector<HTMLElement>('.pg-size-open-label')
  const template = opener.dataset.template ?? 'Posts per page: %d'

  function markCurrent(size: number): void {
    for (const option of options) option.setAttribute('aria-current', String(Number(option.dataset.value) === size))
    if (openerLabel !== null) openerLabel.textContent = template.replace('%d', String(size))
  }

  let open = false

  function openMenu(): void {
    menu.style.visibility = 'hidden'
    if (canPopover) {
      try {
        menu.hidePopover?.()
        menu.showPopover?.()
      } catch {
        menu.hidden = false
      }
    } else {
      menu.hidden = false
    }
    open = true
    opener.setAttribute('aria-expanded', 'true')
    place(menu, opener)
    menu.style.visibility = ''
  }

  function closeMenu(returnFocus: boolean): void {
    open = false
    opener.setAttribute('aria-expanded', 'false')
    try {
      menu.hidePopover?.()
    } catch {
      // Not currently showing as a popover.
    }
    if (!canPopover) menu.hidden = true
    if (returnFocus) opener.focus()
  }

  const size = storedSize()
  markCurrent(size)

  for (const option of options) {
    option.addEventListener('click', () => {
      const value = Number(option.dataset.value)
      if (value !== size) {
        try {
          if (value === builtSize) localStorage.removeItem(PAGE_SIZE_KEY)
          else localStorage.setItem(PAGE_SIZE_KEY, String(value))
        } catch {
          // Private mode, or storage disabled: the choice still applies for this page.
        }
        // A size change resets to this list's first page, the same
        // convention most paged UIs already use, so the merged window
        // mergeToSize builds always starts aligned to a multiple of the
        // chosen size rather than wherever the reader happened to be.
        location.href = nav.dataset.basePath ?? '/'
        return
      }
      closeMenu(true)
    })
  }

  opener.addEventListener('click', () => {
    if (open) closeMenu(true)
    else openMenu()
  })

  document.addEventListener('click', (event) => {
    if (!open) return
    const target = event.target as Element
    if (!wrapper.contains(target)) closeMenu(false)
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open) closeMenu(true)
  })

  // Arrow keys move focus between options, the one thing a native <select>
  // gave for free that a plain button group (ThemeToggle.astro's own
  // .tt-option row, Tab-only per that file's comment) does not: Up/Left to
  // the previous option, Down/Right to the next, both wrapping past either
  // end, Home/End to the first/last. Enter and Space already activate the
  // focused option, being a plain <button>.
  menu.addEventListener('keydown', (event) => {
    const currentIndex = options.indexOf(document.activeElement as HTMLButtonElement)
    if (currentIndex === -1) return
    const focusAt = (index: number): void => options[(index + options.length) % options.length]?.focus()
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault()
        focusAt(currentIndex + 1)
        break
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault()
        focusAt(currentIndex - 1)
        break
      case 'Home':
        event.preventDefault()
        options[0]?.focus()
        break
      case 'End':
        event.preventDefault()
        options[options.length - 1]?.focus()
        break
      default:
        break
    }
  })

  if (canPopover) {
    menu.removeAttribute('hidden')
    menu.setAttribute('popover', 'auto')
  }

  wrapper.removeAttribute('hidden')

  if (size !== builtSize) void mergeToSize(nav, size / builtSize)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
