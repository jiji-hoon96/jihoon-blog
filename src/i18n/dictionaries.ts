import type { Locale } from './locales.ts'

type Dictionary = {
  siteDescription: string
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
    siteDescription: '프론트엔드 개발자 이지훈(후니)의 기술 블로그. React, TypeScript, Next.js 등 웹 개발 기록과 학습 노트를 공유합니다.',
    navigation: { posts: '글', guestbook: '방명록', about: '소개' },
    actions: { search: '검색', changeTheme: '테마 변경' },
    search: { placeholder: '검색어를 입력하세요...', loading: '로딩 중...', empty: '검색 결과가 없습니다.', help: '제목, 내용, 카테고리로 검색할 수 있습니다.', shortcut: '로 언제든 검색할 수 있습니다.' },
  },
  en: {
    siteDescription: 'Jihoon Lee’s frontend engineering blog, sharing practical notes on React, TypeScript, Next.js, and web development.',
    navigation: { posts: 'Posts', guestbook: 'Guestbook', about: 'About' },
    actions: { search: 'Search', changeTheme: 'Change theme' },
    search: { placeholder: 'Search posts...', loading: 'Loading...', empty: 'No results found.', help: 'Search by title, content, or category.', shortcut: 'opens search at any time.' },
  },
  ja: {
    siteDescription: 'フロントエンドエンジニア、イ・ジフンの技術ブログ。React、TypeScript、Next.jsなどの実践記録を共有します。',
    navigation: { posts: '記事', guestbook: 'ゲストブック', about: 'プロフィール' },
    actions: { search: '検索', changeTheme: 'テーマを変更' },
    search: { placeholder: '記事を検索...', loading: '読み込み中...', empty: '検索結果がありません。', help: 'タイトル、本文、カテゴリーから検索できます。', shortcut: 'でいつでも検索できます。' },
  },
  es: {
    siteDescription: 'Blog de ingeniería frontend de Jihoon Lee con experiencias sobre React, TypeScript, Next.js y desarrollo web.',
    navigation: { posts: 'Artículos', guestbook: 'Libro de visitas', about: 'Acerca de' },
    actions: { search: 'Buscar', changeTheme: 'Cambiar tema' },
    search: { placeholder: 'Buscar artículos...', loading: 'Cargando...', empty: 'No se encontraron resultados.', help: 'Busca por título, contenido o categoría.', shortcut: 'abre la búsqueda en cualquier momento.' },
  },
  'pt-BR': {
    siteDescription: 'Blog de engenharia frontend de Jihoon Lee, com experiências sobre React, TypeScript, Next.js e desenvolvimento web.',
    navigation: { posts: 'Artigos', guestbook: 'Livro de visitas', about: 'Sobre' },
    actions: { search: 'Pesquisar', changeTheme: 'Alterar tema' },
    search: { placeholder: 'Pesquisar artigos...', loading: 'Carregando...', empty: 'Nenhum resultado encontrado.', help: 'Pesquise por título, conteúdo ou categoria.', shortcut: 'abre a pesquisa a qualquer momento.' },
  },
  'zh-CN': {
    siteDescription: '前端工程师李智勋的技术博客，分享 React、TypeScript、Next.js 与 Web 开发实践。',
    navigation: { posts: '文章', guestbook: '留言簿', about: '关于' },
    actions: { search: '搜索', changeTheme: '切换主题' },
    search: { placeholder: '搜索文章...', loading: '加载中...', empty: '未找到结果。', help: '可按标题、正文或分类搜索。', shortcut: '可随时打开搜索。' },
  },
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale]
}
