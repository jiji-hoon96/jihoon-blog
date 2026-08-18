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
    openMenu: string
    subscribeRss: string
  }
  search: {
    placeholder: string
    loading: string
    empty: string
    help: string
    shortcut: string
  }
  home: {
    greeting: string
    statsLoading: string
    popularPosts: string
    pinnedPosts: string
    noPinnedPosts: string
    recentPosts: string
    viewAll: string
    noPosts: string
    noPopularPosts: string
  }
  posts: {
    allPosts: string
    count: string
    empty: string
  }
  post: {
    tableOfContents: string
    openTableOfContents: string
    closeTableOfContents: string
    relatedPosts: string
    previousPost: string
    nextPost: string
    comments: string
    updated: string
  }
  category: {
    label: string
    description: string
    empty: string
  }
  about: {
    greeting: string
    description: string
    profileDescription: string
  }
  guestbook: {
    title: string
    description: string
  }
  playground: {
    title: string
    description: string
    empty: string
  }
}

const dictionaries: Record<Locale, Dictionary> = {
  ko: {
    siteDescription: '프론트엔드 개발자 이지훈(후니)의 기술 블로그. React, TypeScript, Next.js 등 웹 개발 기록과 학습 노트를 공유합니다.',
    navigation: { posts: '글', guestbook: '방명록', about: '소개' },
    actions: { search: '검색', changeTheme: '테마 변경', openMenu: '메뉴 열기', subscribeRss: 'RSS 구독' },
    search: { placeholder: '검색어를 입력하세요...', loading: '로딩 중...', empty: '검색 결과가 없습니다.', help: '제목, 내용, 카테고리로 검색할 수 있습니다.', shortcut: '로 언제든 검색할 수 있습니다.' },
    home: { greeting: '안녕하세요 {name}입니다', statsLoading: '통계 로딩 중...', popularPosts: '인기 글', pinnedPosts: '고정 글', noPinnedPosts: '고정된 글이 없습니다.', recentPosts: '최근 작성한 글', viewAll: '전체보기', noPosts: '아직 작성된 글이 없습니다.', noPopularPosts: '아직 인기 글이 없습니다.' },
    posts: { allPosts: '모든 글', count: '{count}개의 글', empty: '아직 작성된 글이 없습니다.' },
    post: { tableOfContents: '목차', openTableOfContents: '목차 열기', closeTableOfContents: '목차 닫기', relatedPosts: '함께 읽으면 좋은 글', previousPost: '이전 글', nextPost: '다음 글', comments: '댓글', updated: '수정' },
    category: { label: '카테고리', description: '{category} 카테고리의 글 {count}개', empty: '이 카테고리에는 아직 글이 없습니다.' },
    about: { greeting: '안녕하세요 {name}입니다.', description: '프론트엔드 개발자 {name}의 소개, 커리어, 활동 이력과 기술 스택을 확인하세요.', profileDescription: '프론트엔드 개발자. {stack} 등의 기술로 웹을 개발합니다.' },
    guestbook: { title: '안녕하세요!', description: '자유롭게 방명록을 작성해주세요 :)' },
    playground: { title: '재미있는 것을 만듭니다', description: '개인 프로젝트 모음', empty: '아직 프로젝트가 없습니다.' },
  },
  en: {
    siteDescription: 'Jihoon Lee’s frontend engineering blog, sharing practical notes on React, TypeScript, Next.js, and web development.',
    navigation: { posts: 'Posts', guestbook: 'Guestbook', about: 'About' },
    actions: { search: 'Search', changeTheme: 'Change theme', openMenu: 'Open menu', subscribeRss: 'Subscribe via RSS' },
    search: { placeholder: 'Search posts...', loading: 'Loading...', empty: 'No results found.', help: 'Search by title, content, or category.', shortcut: 'opens search at any time.' },
    home: { greeting: 'Hello, I’m {name}', statsLoading: 'Loading stats...', popularPosts: 'Popular posts', pinnedPosts: 'Pinned posts', noPinnedPosts: 'No pinned posts yet.', recentPosts: 'Recent posts', viewAll: 'View all', noPosts: 'No posts yet.', noPopularPosts: 'No popular posts yet.' },
    posts: { allPosts: 'All posts', count: '{count} posts', empty: 'No posts yet.' },
    post: { tableOfContents: 'Table of contents', openTableOfContents: 'Open table of contents', closeTableOfContents: 'Close table of contents', relatedPosts: 'Related posts', previousPost: 'Previous post', nextPost: 'Next post', comments: 'Comments', updated: 'Updated' },
    category: { label: 'Category', description: '{count} posts in {category}', empty: 'There are no posts in this category yet.' },
    about: { greeting: 'Hello, I’m {name}.', description: 'Meet frontend engineer {name} and explore his career, activities, and technical stack.', profileDescription: 'Frontend engineer building for the web with {stack}.' },
    guestbook: { title: 'Hello!', description: 'Feel free to leave a message :)' },
    playground: { title: 'Enjoying making fun things', description: 'A collection of personal projects', empty: 'No projects yet.' },
  },
  ja: {
    siteDescription: 'フロントエンドエンジニア、イ・ジフンの技術ブログ。React、TypeScript、Next.jsなどの実践記録を共有します。',
    navigation: { posts: '記事', guestbook: 'ゲストブック', about: 'プロフィール' },
    actions: { search: '検索', changeTheme: 'テーマを変更', openMenu: 'メニューを開く', subscribeRss: 'RSSを購読' },
    search: { placeholder: '記事を検索...', loading: '読み込み中...', empty: '検索結果がありません。', help: 'タイトル、本文、カテゴリーから検索できます。', shortcut: 'でいつでも検索できます。' },
    home: { greeting: 'こんにちは、{name}です', statsLoading: '統計を読み込み中...', popularPosts: '人気の記事', pinnedPosts: '注目の記事', noPinnedPosts: '注目の記事はまだありません。', recentPosts: '最新の記事', viewAll: 'すべて見る', noPosts: '記事はまだありません。', noPopularPosts: '人気の記事はまだありません。' },
    posts: { allPosts: 'すべての記事', count: '{count}件の記事', empty: '記事はまだありません。' },
    post: { tableOfContents: '目次', openTableOfContents: '目次を開く', closeTableOfContents: '目次を閉じる', relatedPosts: '関連記事', previousPost: '前の記事', nextPost: '次の記事', comments: 'コメント', updated: '更新' },
    category: { label: 'カテゴリー', description: '{category}カテゴリーの記事（{count}件）', empty: 'このカテゴリーにはまだ記事がありません。' },
    about: { greeting: 'こんにちは、{name}です。', description: 'フロントエンドエンジニア{name}の経歴、活動、技術スタックを紹介します。', profileDescription: '{stack}などを使ってWeb開発に取り組むフロントエンドエンジニアです。' },
    guestbook: { title: 'こんにちは！', description: 'お気軽にメッセージを残してください :)' },
    playground: { title: '楽しいものを作る', description: '個人プロジェクト集', empty: 'プロジェクトはまだありません。' },
  },
  es: {
    siteDescription: 'Blog de ingeniería frontend de Jihoon Lee con experiencias sobre React, TypeScript, Next.js y desarrollo web.',
    navigation: { posts: 'Artículos', guestbook: 'Libro de visitas', about: 'Acerca de' },
    actions: { search: 'Buscar', changeTheme: 'Cambiar tema', openMenu: 'Abrir menú', subscribeRss: 'Suscribirse por RSS' },
    search: { placeholder: 'Buscar artículos...', loading: 'Cargando...', empty: 'No se encontraron resultados.', help: 'Busca por título, contenido o categoría.', shortcut: 'abre la búsqueda en cualquier momento.' },
    home: { greeting: 'Hola, soy {name}', statsLoading: 'Cargando estadísticas...', popularPosts: 'Artículos populares', pinnedPosts: 'Artículos destacados', noPinnedPosts: 'Aún no hay artículos destacados.', recentPosts: 'Artículos recientes', viewAll: 'Ver todos', noPosts: 'Aún no hay artículos.', noPopularPosts: 'Aún no hay artículos populares.' },
    posts: { allPosts: 'Todos los artículos', count: '{count} artículos', empty: 'Aún no hay artículos.' },
    post: { tableOfContents: 'Índice', openTableOfContents: 'Abrir índice', closeTableOfContents: 'Cerrar índice', relatedPosts: 'Artículos relacionados', previousPost: 'Artículo anterior', nextPost: 'Artículo siguiente', comments: 'Comentarios', updated: 'Actualizado' },
    category: { label: 'Categoría', description: '{count} artículos en {category}', empty: 'Aún no hay artículos en esta categoría.' },
    about: { greeting: 'Hola, soy {name}.', description: 'Conoce al ingeniero frontend {name}, su trayectoria, actividades y stack técnico.', profileDescription: 'Ingeniero frontend que desarrolla para la web con {stack}.' },
    guestbook: { title: '¡Hola!', description: 'Puedes dejar un mensaje cuando quieras :)' },
    playground: { title: 'Creando cosas divertidas', description: 'Una colección de proyectos personales', empty: 'Aún no hay proyectos.' },
  },
  'pt-BR': {
    siteDescription: 'Blog de engenharia frontend de Jihoon Lee, com experiências sobre React, TypeScript, Next.js e desenvolvimento web.',
    navigation: { posts: 'Artigos', guestbook: 'Livro de visitas', about: 'Sobre' },
    actions: { search: 'Pesquisar', changeTheme: 'Alterar tema', openMenu: 'Abrir menu', subscribeRss: 'Assinar via RSS' },
    search: { placeholder: 'Pesquisar artigos...', loading: 'Carregando...', empty: 'Nenhum resultado encontrado.', help: 'Pesquise por título, conteúdo ou categoria.', shortcut: 'abre a pesquisa a qualquer momento.' },
    home: { greeting: 'Olá, eu sou {name}', statsLoading: 'Carregando estatísticas...', popularPosts: 'Artigos populares', pinnedPosts: 'Artigos em destaque', noPinnedPosts: 'Ainda não há artigos em destaque.', recentPosts: 'Artigos recentes', viewAll: 'Ver todos', noPosts: 'Ainda não há artigos.', noPopularPosts: 'Ainda não há artigos populares.' },
    posts: { allPosts: 'Todos os artigos', count: '{count} artigos', empty: 'Ainda não há artigos.' },
    post: { tableOfContents: 'Sumário', openTableOfContents: 'Abrir sumário', closeTableOfContents: 'Fechar sumário', relatedPosts: 'Artigos relacionados', previousPost: 'Artigo anterior', nextPost: 'Próximo artigo', comments: 'Comentários', updated: 'Atualizado' },
    category: { label: 'Categoria', description: '{count} artigos em {category}', empty: 'Ainda não há artigos nesta categoria.' },
    about: { greeting: 'Olá, eu sou {name}.', description: 'Conheça o engenheiro frontend {name}, sua carreira, atividades e stack técnico.', profileDescription: 'Engenheiro frontend que desenvolve para a web com {stack}.' },
    guestbook: { title: 'Olá!', description: 'Fique à vontade para deixar uma mensagem :)' },
    playground: { title: 'Criando coisas divertidas', description: 'Uma coleção de projetos pessoais', empty: 'Ainda não há projetos.' },
  },
  'zh-CN': {
    siteDescription: '前端工程师李智勋的技术博客，分享 React、TypeScript、Next.js 与 Web 开发实践。',
    navigation: { posts: '文章', guestbook: '留言簿', about: '关于' },
    actions: { search: '搜索', changeTheme: '切换主题', openMenu: '打开菜单', subscribeRss: '订阅 RSS' },
    search: { placeholder: '搜索文章...', loading: '加载中...', empty: '未找到结果。', help: '可按标题、正文或分类搜索。', shortcut: '可随时打开搜索。' },
    home: { greeting: '你好，我是{name}', statsLoading: '正在加载统计数据...', popularPosts: '热门文章', pinnedPosts: '精选文章', noPinnedPosts: '暂无精选文章。', recentPosts: '最新文章', viewAll: '查看全部', noPosts: '暂无文章。', noPopularPosts: '暂无热门文章。' },
    posts: { allPosts: '全部文章', count: '{count}篇文章', empty: '暂无文章。' },
    post: { tableOfContents: '目录', openTableOfContents: '打开目录', closeTableOfContents: '关闭目录', relatedPosts: '相关文章', previousPost: '上一篇', nextPost: '下一篇', comments: '评论', updated: '更新' },
    category: { label: '分类', description: '{category}分类下有{count}篇文章', empty: '该分类下暂无文章。' },
    about: { greeting: '你好，我是{name}。', description: '了解前端工程师{name}的职业经历、活动与技术栈。', profileDescription: '使用{stack}等技术进行 Web 开发的前端工程师。' },
    guestbook: { title: '你好！', description: '欢迎随时留言 :)' },
    playground: { title: '创造有趣的东西', description: '个人项目合集', empty: '暂无项目。' },
  },
}

export function interpolate(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(values[key] ?? `{${key}}`),
  )
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale]
}
