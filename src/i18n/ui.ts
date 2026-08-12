export type Locale = 'pt' | 'en'

type UIKey =
  | 'tagline'
  | 'readMore'
  | 'publishedOn'
  | 'updatedOn'
  | 'readingTime'
  | 'machineTranslated'
  | 'readOriginal'
  | 'suggestFix'
  | 'search'
  | 'noResults'
  | 'searchLabel'
  | 'searchPlaceholder'
  | 'searchNoJs'
  | 'searchNoIndex'
  | 'series'
  | 'partOfSeries'
  | 'seriesContents'
  | 'youAreHere'
  | 'notWrittenYet'
  | 'allPosts'
  | 'categories'
  | 'tags'
  | 'skipToContent'

const ui: Record<Locale, Record<UIKey, string>> = {
  pt: {
    tagline: 'Um blog sobre JavaScript, TypeScript, web e ferramentas',
    readMore: 'Ler mais',
    publishedOn: 'Publicado em',
    updatedOn: 'Atualizado em',
    readingTime: 'minutos',
    machineTranslated: 'Esta página foi traduzida automaticamente.',
    readOriginal: 'Ler original',
    suggestFix: 'Sugerir correção',
    search: 'Buscar',
    noResults: 'Nenhum resultado encontrado',
    searchLabel: 'Buscar no blog',
    searchPlaceholder: 'ex: deno, astro, observabilidade',
    searchNoJs:
      'A busca completa depende de JavaScript. Sem ele, o formulário acima ainda funciona: ele recarrega esta página com sua consulta salva na URL.',
    searchNoIndex:
      'O índice de busca ainda não foi gerado neste ambiente (rode o build). Envie o formulário para navegar normalmente.',
    series: 'Série',
    partOfSeries: 'Parte %d de %d',
    seriesContents: 'Esta série tem %d partes:',
    youAreHere: 'você está aqui',
    notWrittenYet: 'ainda não escrito',
    allPosts: 'Todos os posts',
    categories: 'Categorias',
    tags: 'Tags',
    skipToContent: 'Pular para o conteúdo',
  },
  en: {
    tagline: 'A blog about JavaScript, TypeScript, web and tooling',
    readMore: 'Read more',
    publishedOn: 'Published on',
    updatedOn: 'Updated on',
    readingTime: 'minutes',
    machineTranslated: 'This page was machine translated.',
    readOriginal: 'Read original',
    suggestFix: 'Suggest a fix',
    search: 'Search',
    noResults: 'No results found',
    searchLabel: 'Search the blog',
    searchPlaceholder: 'e.g. deno, astro, observability',
    searchNoJs:
      'Full search needs JavaScript. Without it the form above still works: it reloads this page with your query in the URL.',
    searchNoIndex:
      'The search index has not been built in this environment (run the build). Submit the form to browse normally.',
    series: 'Series',
    partOfSeries: 'Part %d of %d',
    seriesContents: 'This series has %d parts:',
    youAreHere: 'you are here',
    notWrittenYet: 'not written yet',
    allPosts: 'All posts',
    categories: 'Categories',
    tags: 'Tags',
    skipToContent: 'Skip to content',
  },
}

export function t(lang: Locale, key: UIKey, ...args: Array<string | number>): string {
  const template = ui[lang][key]
  return args.reduce((result: string, arg) => result.replace('%d', String(arg)), template)
}
