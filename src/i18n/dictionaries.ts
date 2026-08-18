import type { Locale } from './locales.ts'

type Dictionary = {
  navigation: {
    posts: string
    guestbook: string
    about: string
  }
  actions: {
    search: string
    changeTheme: string
  }
  search: {
    placeholder: string
    loading: string
    empty: string
    help: string
    shortcut: string
  }
}

const dictionaries: Record<Locale, Dictionary> = {
  ko: {
    navigation: { posts: '글', guestbook: '방명록', about: '소개' },
    actions: { search: '검색', changeTheme: '테마 변경' },
    search: { placeholder: '검색어를 입력하세요...', loading: '로딩 중...', empty: '검색 결과가 없습니다.', help: '제목, 내용, 카테고리로 검색할 수 있습니다.', shortcut: '로 언제든 검색할 수 있습니다.' },
  },
  en: {
    navigation: { posts: 'Posts', guestbook: 'Guestbook', about: 'About' },
    actions: { search: 'Search', changeTheme: 'Change theme' },
    search: { placeholder: 'Search posts...', loading: 'Loading...', empty: 'No results found.', help: 'Search by title, content, or category.', shortcut: 'opens search at any time.' },
  },
  ja: {
    navigation: { posts: '記事', guestbook: 'ゲストブック', about: 'プロフィール' },
    actions: { search: '検索', changeTheme: 'テーマを変更' },
    search: { placeholder: '記事を検索...', loading: '読み込み中...', empty: '検索結果がありません。', help: 'タイトル、本文、カテゴリーから検索できます。', shortcut: 'でいつでも検索できます。' },
  },
  es: {
    navigation: { posts: 'Artículos', guestbook: 'Libro de visitas', about: 'Acerca de' },
    actions: { search: 'Buscar', changeTheme: 'Cambiar tema' },
    search: { placeholder: 'Buscar artículos...', loading: 'Cargando...', empty: 'No se encontraron resultados.', help: 'Busca por título, contenido o categoría.', shortcut: 'abre la búsqueda en cualquier momento.' },
  },
  'pt-BR': {
    navigation: { posts: 'Artigos', guestbook: 'Livro de visitas', about: 'Sobre' },
    actions: { search: 'Pesquisar', changeTheme: 'Alterar tema' },
    search: { placeholder: 'Pesquisar artigos...', loading: 'Carregando...', empty: 'Nenhum resultado encontrado.', help: 'Pesquise por título, conteúdo ou categoria.', shortcut: 'abre a pesquisa a qualquer momento.' },
  },
  'zh-CN': {
    navigation: { posts: '文章', guestbook: '留言簿', about: '关于' },
    actions: { search: '搜索', changeTheme: '切换主题' },
    search: { placeholder: '搜索文章...', loading: '加载中...', empty: '未找到结果。', help: '可按标题、正文或分类搜索。', shortcut: '可随时打开搜索。' },
  },
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale]
}
