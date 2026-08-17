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
}

const dictionaries: Record<Locale, Dictionary> = {
  ko: {
    navigation: { posts: '글', guestbook: '방명록', about: '소개' },
    actions: { search: '검색', changeTheme: '테마 변경' },
  },
  en: {
    navigation: { posts: 'Posts', guestbook: 'Guestbook', about: 'About' },
    actions: { search: 'Search', changeTheme: 'Change theme' },
  },
  ja: {
    navigation: { posts: '記事', guestbook: 'ゲストブック', about: 'プロフィール' },
    actions: { search: '検索', changeTheme: 'テーマを変更' },
  },
  es: {
    navigation: { posts: 'Artículos', guestbook: 'Libro de visitas', about: 'Acerca de' },
    actions: { search: 'Buscar', changeTheme: 'Cambiar tema' },
  },
  'pt-BR': {
    navigation: { posts: 'Artigos', guestbook: 'Livro de visitas', about: 'Sobre' },
    actions: { search: 'Pesquisar', changeTheme: 'Alterar tema' },
  },
  'zh-CN': {
    navigation: { posts: '文章', guestbook: '留言簿', about: '关于' },
    actions: { search: '搜索', changeTheme: '切换主题' },
  },
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale]
}
