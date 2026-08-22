interface PagefindResult {
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
    // Pagefind writes this into dist/ after the build, so the specifier has to
    // go through a variable or Vite tries to resolve it at build time.
    const module = '/pagefind/pagefind.js'
    return (await import(/* @vite-ignore */ module)) as PagefindModule
  } catch {
    return null
  }
}

export function searchLabel(input: HTMLInputElement, name: string, value = ''): string {
  return (input.dataset[name] ?? '').replace(/%[ds]/, value)
}
