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
  | 'series'
  | 'partOfSeries'
  | 'allPosts'
  | 'categories'
  | 'tags'

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
    series: 'Série',
    partOfSeries: 'Parte %d de %d',
    allPosts: 'Todos os posts',
    categories: 'Categorias',
    tags: 'Tags',
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
    series: 'Series',
    partOfSeries: 'Part %d of %d',
    allPosts: 'All posts',
    categories: 'Categories',
    tags: 'Tags',
  },
}

export function t(lang: Locale, key: UIKey, ...args: Array<string | number>): string {
  const template = ui[lang][key]
  return args.reduce((result: string, arg) => result.replace('%d', String(arg)), template)
}
