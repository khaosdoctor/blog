// The Pagefind glue shared by Search.astro's page script and
// search-palette.ts, which carried identical copies of the loader, the types
// and the data-attribute label reader.

export interface PagefindResult {
  data: () => Promise<{ url: string; excerpt: string; meta: { title?: string } }>
}

export interface PagefindModule {
  init?: (language?: string) => Promise<void>
  search: (query: string) => Promise<{ results: PagefindResult[] }>
  debouncedSearch: (
    term: string,
    options?: Record<string, unknown>,
    timeoutMs?: number,
  ) => Promise<{ results: PagefindResult[] } | null>
}

export async function loadPagefind(): Promise<PagefindModule | null> {
  try {
    // Pagefind writes this into dist/ after the build, so it is not a source
    // module: the specifier goes through a variable to keep Vite and the
    // typechecker from resolving something that only exists in the output.
    const module = '/pagefind/pagefind.js'
    return (await import(/* @vite-ignore */ module)) as PagefindModule
  } catch {
    return null
  }
}

/**
 * t()'s server-side strings, read back off the input's own data attributes:
 * a plain script module has no access to t(). %s / %d is the placeholder,
 * matching the t() helper the markup uses.
 */
export function searchLabel(input: HTMLInputElement, name: string, value = ''): string {
  return (input.dataset[name] ?? '').replace(/%[ds]/, value)
}
