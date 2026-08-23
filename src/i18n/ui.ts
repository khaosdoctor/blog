export const LOCALES = ['pt', 'en'] as const

export type Locale = (typeof LOCALES)[number]

export const SOURCE_LOCALE: Locale = 'pt'

// Search engines match on the region, so Portuguese is announced as pt-BR.
export const HREFLANG: Record<Locale, string> = {
  pt: 'pt-BR',
  en: 'en',
}

export function localePath(locale: Locale, path: string): string {
  return locale === SOURCE_LOCALE ? path : `/${locale}${path}`
}

type UIKey =
  | 'finishReadingAt'
  | 'machineTranslated'
  | 'readOriginal'
  | 'suggestFix'
  | 'search'
  | 'noResults'
  | 'noResultsFor'
  | 'searching'
  | 'moreResults'
  | 'searchResultsFound'
  | 'searchLabel'
  | 'searchPlaceholder'
  | 'searchNoJs'
  | 'searchNoIndex'
  | 'searchTitle'
  | 'searchDescription'
  | 'series'
  | 'partOfSeriesNamed'
  | 'seriesNav'
  | 'seriesDescription'
  | 'youAreHere'
  | 'linkCopied'
  | 'footnotes'
  | 'showSource'
  | 'hideSource'
  | 'codeTheme'
  | 'codeThemeAuto'
  | 'themeToggle'
  | 'themeLight'
  | 'themeDark'
  | 'themeSystem'
  | 'settingsPanel'
  | 'settingsNudge'
  | 'motionLabel'
  | 'motionReduce'
  | 'motionAllow'
  | 'motionSystem'
  | 'fontSizeLabel'
  | 'fontSizeCurrent'
  | 'fontSizeDecrease'
  | 'fontSizeIncrease'
  | 'fontSizeReset'
  | 'fontSizeResetShort'
  | 'fontFamilyLabel'
  | 'fontFamilySerif'
  | 'fontFamilySans'
  | 'accentLabel'
  | 'accentAuto'
  | 'accentRed'
  | 'accentGreen'
  | 'accentYellow'
  | 'accentBlue'
  | 'accentPurple'
  | 'accentWhite'
  | 'backgroundLife'
  | 'conwayKnobs'
  | 'conwaySeedDensity'
  | 'conwayGenerationsPerSecond'
  | 'conwayAutoFeed'
  | 'conwayOpacity'
  | 'conwayPause'
  | 'conwayResume'
  | 'conwayReseed'
  | 'searchShortcutLabel'
  | 'searchShortcutReserved'
  | 'writtenBy'
  | 'contents'
  | 'openMenu'
  | 'closeMenu'
  | 'closeMenuShort'
  | 'openContents'
  | 'foldSection'
  | 'notWrittenYet'
  | 'tags'
  | 'tag'
  | 'tagDescription'
  | 'tagsIntro'
  | 'allSeries'
  | 'seriesIntro'
  | 'sectionDescription'
  | 'primaryNav'
  | 'navPosts'
  | 'navSeries'
  | 'navTags'
  | 'navAbout'
  | 'article'
  | 'articles'
  | 'homeDescription'
  | 'noTranslatedPosts'
  | 'skipToContent'
  | 'language'
  | 'switchLanguage'
  | 'version'
  | 'footnotePreviews'
  | 'keepPreviews'
  | 'resetAll'
  | 'resetAllHint'
  | 'previewLoading'
  | 'previewClose'
  | 'previewPin'
  | 'previewUnpin'
  | 'previewDrag'
  | 'previewUnwritten'
  | 'previewMinimize'
  | 'previewRestore'
  | 'showNote'
  | 'showMarginNote'
  | 'linkToNote'
  | 'copyQuote'
  | 'pagination'
  | 'paginationPrev'
  | 'paginationNext'
  | 'paginationGoTo'
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
  | 'copyright'
  | 'rightsReserved'
  | 'credits'
  | 'githubRepo'
  | 'linkedinProfile'
  | 'twitterProfile'
  | 'youtubeChannel'
  | 'ossTitle'
  | 'ossDescription'
  | 'ossIntro'
  | 'ossFontsHeading'
  | 'ossIconsHeading'
  | 'ossDependenciesHeading'

export const ui: Record<Locale, Record<UIKey, string>> = {
  pt: {
    finishReadingAt: 'termina às %s',
    machineTranslated: 'Esta página foi traduzida automaticamente.',
    readOriginal: 'Ler original',
    suggestFix: 'Sugerir correção',
    search: 'Buscar',
    noResults: 'Nenhum resultado encontrado',
    noResultsFor: 'Nenhum resultado para "%s".',
    searching: 'Buscando...',
    moreResults: 'E mais %d resultado(s).',
    searchResultsFound: '%d resultado(s).',
    searchLabel: 'Buscar no blog',
    searchPlaceholder: 'ex: deno, astro, observabilidade',
    searchNoJs:
      'A busca completa depende de JavaScript. Sem ele, o formulário acima ainda funciona: ele recarrega esta página com sua consulta salva na URL.',
    searchNoIndex:
      'O índice de busca ainda não foi gerado neste ambiente (rode o build). Envie o formulário para navegar normalmente.',
    searchTitle: 'Busca',
    searchDescription: 'Buscar artigos no blog de Lucas Santos.',
    series: 'Série',
    partOfSeriesNamed: 'Parte %d de %d da série',
    seriesNav: 'Navegação da série',
    seriesDescription: 'Todos os artigos da série %s.',
    youAreHere: 'você está aqui',
    linkCopied: 'link copiado',
    footnotes: 'Notas de rodapé',
    showSource: 'ver o código',
    hideSource: 'esconder o código',
    codeTheme: 'Tema do código',
    codeThemeAuto: 'Automático (segue o tema da página)',
    themeToggle: 'Tema',
    themeLight: 'Claro',
    themeDark: 'Escuro',
    themeSystem: 'Sistema',
    settingsPanel: 'Preferências',
    settingsNudge: 'Ajuste a leitura do jeito que você gosta',
    motionLabel: 'Movimento',
    motionReduce: 'Reduzido',
    motionAllow: 'Sempre ativo',
    motionSystem: 'Sistema',
    fontSizeLabel: 'Tamanho do texto',
    fontSizeCurrent: 'Tamanho do texto: %s',
    fontSizeDecrease: 'Diminuir o tamanho do texto',
    fontSizeIncrease: 'Aumentar o tamanho do texto',
    fontSizeReset: 'Voltar o tamanho do texto para 100%',
    fontSizeResetShort: 'Redefinir',
    fontFamilyLabel: 'Fonte de leitura',
    fontFamilySerif: 'Serifada',
    fontFamilySans: 'Sem serifa',
    accentLabel: 'Cor de destaque',
    accentAuto: 'Auto',
    accentRed: 'Vermelho',
    accentGreen: 'Verde',
    accentYellow: 'Amarelo',
    accentBlue: 'Azul',
    accentPurple: 'Roxo',
    accentWhite: 'Branco',
    backgroundLife: 'Plano de fundo',
    conwayKnobs: 'Propriedades',
    conwaySeedDensity: 'Densidade do seed',
    conwayGenerationsPerSecond: 'Gerações por segundo',
    conwayAutoFeed: 'Alimentação automática (s, 0 desliga)',
    conwayOpacity: 'Opacidade do fundo',
    conwayPause: 'Pausar',
    conwayResume: 'Retomar',
    conwayReseed: 'Reiniciar',
    searchShortcutLabel: 'Tecla de atalho da busca',
    searchShortcutReserved: 'O navegador já usa esta tecla',
    writtenBy: 'por',
    contents: 'Neste post',
    openMenu: 'abrir o menu',
    closeMenu: 'fechar o menu',
    closeMenuShort: 'Fechar',
    openContents: 'abrir o índice',
    foldSection: 'recolher ou expandir esta seção',
    notWrittenYet: 'ainda não escrito',
    tags: 'Tags',
    tag: 'Tag',
    tagDescription: 'Artigos marcados com %s.',
    tagsIntro: 'Todas as tags usadas nos artigos, com quantos artigos cada uma tem.',
    allSeries: 'Séries',
    seriesIntro: 'Todas as séries de artigos publicadas.',
    sectionDescription: 'Todos os artigos da seção %s.',
    primaryNav: 'Navegação principal',
    navPosts: 'Posts',
    navSeries: 'Séries',
    navTags: 'Tags',
    navAbout: 'Sobre',
    article: 'artigo',
    articles: 'artigos',
    homeDescription: 'Artigos sobre desenvolvimento, tecnologia e opinião.',
    noTranslatedPosts: 'Nenhum artigo traduzido ainda.',
    skipToContent: 'Pular para o conteúdo',
    language: 'Idioma',
    switchLanguage: 'Mudar para %s',
    version: 'Versão',
    copyright: '© 2019–%d Lucas Santos.',
    rightsReserved: 'Todos os direitos reservados.',
    credits: 'Créditos',
    githubRepo: 'Repositório no GitHub',
    linkedinProfile: 'Perfil no LinkedIn',
    twitterProfile: 'Perfil no Twitter',
    youtubeChannel: 'Canal no YouTube',
    ossTitle: 'Código aberto',
    ossDescription: 'Cada projeto de código aberto, fonte e ferramenta usados para construir este site, com um link para cada um.',
    ossIntro: 'Este site é construído sobre o trabalho de muita gente.',
    ossFontsHeading: 'Tipografia',
    ossIconsHeading: 'Ícones',
    ossDependenciesHeading: 'Framework e dependências',
    footnotePreviews: 'Mostrar prévia ao passar o mouse numa nota de rodapé',
    keepPreviews: 'Manter as prévias fixadas depois de fechar a aba',
    resetAll: 'Restaurar tudo',
    resetAllHint: 'Volta todas as preferências acima para o padrão',
    previewLoading: 'Carregando…',
    previewClose: 'Fechar prévia',
    previewPin: 'Fixar esta prévia',
    previewUnpin: 'Soltar esta prévia',
    previewDrag: 'arraste para mover',
    previewUnwritten: 'ainda não escrito, mas em breve!',
    previewMinimize: 'Minimizar prévia',
    previewRestore: 'Restaurar prévia',
    showNote: 'mostrar nota',
    showMarginNote: 'mostrar nota lateral',
    linkToNote: 'link para esta nota',
    copyQuote: 'copiar esta citação',
    pagination: 'Paginação',
    paginationPrev: 'Página anterior',
    paginationNext: 'Próxima página',
    paginationGoTo: 'ir para a página %d',
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
    finishReadingAt: 'finish at %s',
    machineTranslated: 'This page was machine translated.',
    readOriginal: 'Read original',
    suggestFix: 'Suggest a fix',
    search: 'Search',
    noResults: 'No results found',
    noResultsFor: 'No results for "%s".',
    searching: 'Searching...',
    moreResults: 'And %d more result(s).',
    searchResultsFound: '%d result(s).',
    searchLabel: 'Search the blog',
    searchPlaceholder: 'e.g. deno, astro, observability',
    searchNoJs:
      'Full search needs JavaScript. Without it the form above still works: it reloads this page with your query in the URL.',
    searchNoIndex:
      'The search index has not been built in this environment (run the build). Submit the form to browse normally.',
    searchTitle: 'Search',
    searchDescription: 'Search every article on the blog.',
    series: 'Series',
    partOfSeriesNamed: 'Part %d of %d of the series',
    seriesNav: 'Series navigation',
    seriesDescription: 'Every article in the %s series.',
    youAreHere: 'you are here',
    linkCopied: 'link copied',
    footnotes: 'Footnotes',
    showSource: 'show the source',
    hideSource: 'hide the source',
    codeTheme: 'Code theme',
    codeThemeAuto: 'Automatic (follows the page theme)',
    themeToggle: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    settingsPanel: 'Preferences',
    settingsNudge: 'Set the reading up the way you like it',
    motionLabel: 'Motion',
    motionReduce: 'Reduced',
    motionAllow: 'Always on',
    motionSystem: 'System',
    fontSizeLabel: 'Text size',
    fontSizeCurrent: 'Text size: %s',
    fontSizeDecrease: 'Decrease text size',
    fontSizeIncrease: 'Increase text size',
    fontSizeReset: 'Reset text size to 100%',
    fontSizeResetShort: 'Reset',
    fontFamilyLabel: 'Reading font',
    fontFamilySerif: 'Serif',
    fontFamilySans: 'Sans',
    accentLabel: 'Accent',
    accentAuto: 'Auto',
    accentRed: 'Red',
    accentGreen: 'Green',
    accentYellow: 'Yellow',
    accentBlue: 'Blue',
    accentPurple: 'Purple',
    accentWhite: 'White',
    backgroundLife: 'Background field',
    conwayKnobs: 'Field settings',
    conwaySeedDensity: 'Seed density',
    conwayGenerationsPerSecond: 'Generations per second',
    conwayAutoFeed: 'Auto-feed (s, 0 disables)',
    conwayOpacity: 'Background opacity',
    conwayPause: 'Pause',
    conwayResume: 'Resume',
    conwayReseed: 'Reseed',
    searchShortcutLabel: 'Search shortcut key',
    searchShortcutReserved: 'The browser already uses this key',
    writtenBy: 'by',
    contents: 'In this post',
    openMenu: 'open the menu',
    closeMenu: 'close the menu',
    closeMenuShort: 'Close',
    openContents: 'open the contents',
    foldSection: 'fold or unfold this section',
    notWrittenYet: 'not written yet',
    tags: 'Tags',
    tag: 'Tag',
    tagDescription: 'Articles tagged %s.',
    tagsIntro: 'Every tag used across the articles, with how many articles carry each one.',
    allSeries: 'Series',
    seriesIntro: 'Every series of articles published so far.',
    sectionDescription: 'Every article in the %s section.',
    primaryNav: 'Main navigation',
    navPosts: 'Posts',
    navSeries: 'Series',
    navTags: 'Tags',
    navAbout: 'About',
    article: 'article',
    articles: 'articles',
    homeDescription: 'Articles about software development, technology and opinion.',
    noTranslatedPosts: 'No translated articles yet.',
    skipToContent: 'Skip to content',
    language: 'Language',
    switchLanguage: 'Switch to %s',
    version: 'Version',
    copyright: '© 2019–%d Lucas Santos.',
    rightsReserved: 'All rights reserved.',
    credits: 'Credits',
    githubRepo: 'GitHub repository',
    linkedinProfile: 'LinkedIn profile',
    twitterProfile: 'Twitter profile',
    youtubeChannel: 'YouTube channel',
    ossTitle: 'Open source',
    ossDescription: 'Every open source project, typeface and tool this site is built on, with a link to each.',
    ossIntro: 'This site is built on the work of a lot of people.',
    ossFontsHeading: 'Typefaces',
    ossIconsHeading: 'Icons',
    ossDependenciesHeading: 'Framework and dependencies',
    footnotePreviews: 'Show a preview when hovering a footnote reference',
    keepPreviews: 'Keep pinned previews after closing the tab',
    resetAll: 'Reset everything',
    resetAllHint: 'Puts every preference above back to its default',
    previewLoading: 'Loading…',
    previewClose: 'Close preview',
    previewPin: 'Pin this preview',
    previewUnpin: 'Unpin this preview',
    previewDrag: 'drag to move',
    previewUnwritten: 'not yet written, but soon!',
    previewMinimize: 'Minimise preview',
    previewRestore: 'Restore preview',
    showNote: 'show note',
    showMarginNote: 'show margin note',
    linkToNote: 'link to this note',
    copyQuote: 'copy this quote',
    pagination: 'Pagination',
    paginationPrev: 'Previous page',
    paginationNext: 'Next page',
    paginationGoTo: 'go to page %d',
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

export function localeFromPath(pathname: string): Locale {
  const segment = pathname.split('/')[1]
  return LOCALES.find((locale) => locale === segment) ?? SOURCE_LOCALE
}
