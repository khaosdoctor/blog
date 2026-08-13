export type Locale = 'pt' | 'en'

type UIKey =
  | 'tagline'
  | 'readMore'
  | 'publishedOn'
  | 'updatedOn'
  | 'readingTime'
  | 'machineTranslated'
  | 'readOriginal'
  | 'readOriginals'
  | 'suggestFix'
  | 'search'
  | 'noResults'
  | 'noResultsFor'
  | 'searching'
  | 'moreResults'
  | 'searchLabel'
  | 'searchPlaceholder'
  | 'searchNoJs'
  | 'searchNoIndex'
  | 'searchTitle'
  | 'searchDescription'
  | 'series'
  | 'partOfSeries'
  | 'partOfSeriesNamed'
  | 'seriesContents'
  | 'seriesNav'
  | 'seriesDescription'
  | 'youAreHere'
  | 'linkCopied'
  | 'footnotes'
  | 'openInNewTab'
  | 'showSource'
  | 'codeTheme'
  | 'codeThemeAuto'
  | 'notWrittenYet'
  | 'allPosts'
  | 'categories'
  | 'tags'
  | 'tag'
  | 'tagDescription'
  | 'sections'
  | 'sectionDescription'
  | 'article'
  | 'articles'
  | 'homeDescription'
  | 'showingLatest'
  | 'noTranslatedPosts'
  | 'translatedIndexNotice'
  | 'skipToContent'
  | 'language'
  | 'version'
  | 'keepPreviews'
  | 'previewLoading'
  | 'previewClose'
  | 'previewPin'
  | 'previewUnpin'
  | 'previewDrag'
  | 'showNote'
  | 'showMarginNote'
  | 'imageGone'
  | 'imageGoneAlt'
  | 'imageGoneUnknownHost'
  | 'notFoundTitle'
  | 'notFoundBody'
  | 'notFoundRecent'
  | 'offlineTitle'
  | 'offlineDescription'
  | 'offlineBody'
  | 'backHome'
  | 'appName'
  | 'appShortName'
  | 'appDescription'

const ui: Record<Locale, Record<UIKey, string>> = {
  pt: {
    tagline: 'Um blog sobre JavaScript, TypeScript, web e ferramentas',
    readMore: 'Ler mais',
    publishedOn: 'Publicado em',
    updatedOn: 'Atualizado em',
    readingTime: 'minutos',
    machineTranslated: 'Esta página foi traduzida automaticamente.',
    readOriginal: 'Ler original',
    readOriginals: 'Ler os originais',
    suggestFix: 'Sugerir correção',
    search: 'Buscar',
    noResults: 'Nenhum resultado encontrado',
    noResultsFor: 'Nenhum resultado para "%s".',
    searching: 'Buscando...',
    moreResults: 'E mais %d resultado(s).',
    searchLabel: 'Buscar no blog',
    searchPlaceholder: 'ex: deno, astro, observabilidade',
    searchNoJs:
      'A busca completa depende de JavaScript. Sem ele, o formulário acima ainda funciona: ele recarrega esta página com sua consulta salva na URL.',
    searchNoIndex:
      'O índice de busca ainda não foi gerado neste ambiente (rode o build). Envie o formulário para navegar normalmente.',
    searchTitle: 'Busca',
    searchDescription: 'Buscar artigos no blog de Lucas Santos.',
    series: 'Série',
    partOfSeries: 'Parte %d de %d',
    partOfSeriesNamed: 'Parte %d de %d da série',
    seriesContents: 'Esta série tem %d partes:',
    seriesNav: 'Navegação da série',
    seriesDescription: 'Todos os artigos da série %s.',
    youAreHere: 'você está aqui',
    linkCopied: 'link copiado',
    footnotes: 'Notas de rodapé',
    openInNewTab: 'abrir em uma aba',
    showSource: 'ver o código',
    codeTheme: 'Tema do código',
    codeThemeAuto: 'Automático (segue o sistema)',
    notWrittenYet: 'ainda não escrito',
    allPosts: 'Todos os posts',
    categories: 'Categorias',
    tags: 'Tags',
    tag: 'Tag',
    tagDescription: 'Artigos marcados com %s.',
    sections: 'Seções',
    sectionDescription: 'Todos os artigos da seção %s.',
    article: 'artigo',
    articles: 'artigos',
    homeDescription: 'Artigos sobre desenvolvimento, tecnologia e opinião.',
    showingLatest: 'Mostrando os %d mais recentes de %d.',
    noTranslatedPosts: 'Nenhum artigo traduzido ainda.',
    translatedIndexNotice: 'Estes artigos foram escritos em português e traduzidos automaticamente.',
    skipToContent: 'Pular para o conteúdo',
    language: 'Idioma',
    version: 'Versão',
    keepPreviews: 'Manter as prévias fixadas depois de fechar a aba',
    previewLoading: 'Carregando…',
    previewClose: 'Fechar prévia',
    previewPin: 'Fixar esta prévia',
    previewUnpin: 'Soltar esta prévia',
    previewDrag: 'arraste para mover',
    showNote: 'mostrar nota',
    showMarginNote: 'mostrar nota lateral',
    imageGone: 'Esta imagem não existe mais',
    imageGoneAlt: 'Imagem indisponível, hospedada em %s',
    imageGoneUnknownHost: 'um host que não a serve mais',
    notFoundTitle: 'Página não encontrada',
    notFoundBody: 'Esta página não existe. Talvez o link esteja errado, ou o post tenha mudado de nome.',
    notFoundRecent: 'Ou leia algo recente:',
    offlineTitle: 'Sem conexão',
    offlineDescription: 'Você está sem conexão.',
    offlineBody:
      'Esta página não está no cache do seu navegador e você está offline no momento. Os posts que você já abriu continuam disponíveis.',
    backHome: 'Voltar para a home',
    appName: 'Lucas Santos',
    appShortName: 'Blog Lucas Santos',
    appDescription: 'Artigos sobre desenvolvimento, tecnologia e opinião.',
  },
  en: {
    tagline: 'A blog about JavaScript, TypeScript, web and tooling',
    readMore: 'Read more',
    publishedOn: 'Published on',
    updatedOn: 'Updated on',
    readingTime: 'minutes',
    machineTranslated: 'This page was machine translated.',
    readOriginal: 'Read original',
    readOriginals: 'Read the originals',
    suggestFix: 'Suggest a fix',
    search: 'Search',
    noResults: 'No results found',
    noResultsFor: 'No results for "%s".',
    searching: 'Searching...',
    moreResults: 'And %d more result(s).',
    searchLabel: 'Search the blog',
    searchPlaceholder: 'e.g. deno, astro, observability',
    searchNoJs:
      'Full search needs JavaScript. Without it the form above still works: it reloads this page with your query in the URL.',
    searchNoIndex:
      'The search index has not been built in this environment (run the build). Submit the form to browse normally.',
    searchTitle: 'Search',
    searchDescription: 'Search every article on the blog.',
    series: 'Series',
    partOfSeries: 'Part %d of %d',
    partOfSeriesNamed: 'Part %d of %d of the series',
    seriesContents: 'This series has %d parts:',
    seriesNav: 'Series navigation',
    seriesDescription: 'Every article in the %s series.',
    youAreHere: 'you are here',
    linkCopied: 'link copied',
    footnotes: 'Footnotes',
    openInNewTab: 'open in a tab',
    showSource: 'show the source',
    codeTheme: 'Code theme',
    codeThemeAuto: 'Automatic (matches your system)',
    notWrittenYet: 'not written yet',
    allPosts: 'All posts',
    categories: 'Categories',
    tags: 'Tags',
    tag: 'Tag',
    tagDescription: 'Articles tagged %s.',
    sections: 'Sections',
    sectionDescription: 'Every article in the %s section.',
    article: 'article',
    articles: 'articles',
    homeDescription: 'Articles about software development, technology and opinion.',
    showingLatest: 'Showing the %d most recent of %d.',
    noTranslatedPosts: 'No translated articles yet.',
    translatedIndexNotice: 'These articles are written in Portuguese and translated automatically.',
    skipToContent: 'Skip to content',
    language: 'Language',
    version: 'Version',
    keepPreviews: 'Keep pinned previews after closing the tab',
    previewLoading: 'Loading…',
    previewClose: 'Close preview',
    previewPin: 'Pin this preview',
    previewUnpin: 'Unpin this preview',
    previewDrag: 'drag to move',
    showNote: 'show note',
    showMarginNote: 'show margin note',
    imageGone: 'This image is gone',
    imageGoneAlt: 'Image unavailable, hosted at %s',
    imageGoneUnknownHost: 'a host that no longer serves it',
    notFoundTitle: 'Page not found',
    notFoundBody: 'This page does not exist. The link may be wrong, or the post may have been renamed.',
    notFoundRecent: 'Or read something recent:',
    offlineTitle: 'No connection',
    offlineDescription: 'You are offline.',
    offlineBody:
      'This page is not in your browser cache and you are currently offline. Posts you have already opened are still available.',
    backHome: 'Back to the home page',
    appName: 'Lucas Santos',
    appShortName: 'Blog Lucas Santos',
    appDescription: 'Articles about software development, technology and opinion.',
  },
}

/** Both %d and %s are filled in order, so a string can mix them. */
export function t(lang: Locale, key: UIKey, ...args: Array<string | number>): string {
  const template = ui[lang][key]
  return args.reduce((result: string, arg) => result.replace(/%[ds]/, String(arg)), template)
}

/**
 * For components that render inside both page trees without a locale prop, such
 * as the ones injected into MDX. The English tree lives entirely under /en/, so
 * the path is the only signal available and it is a reliable one.
 */
export function localeFromPath(pathname: string): Locale {
  return pathname.startsWith('/en/') || pathname === '/en' ? 'en' : 'pt'
}
