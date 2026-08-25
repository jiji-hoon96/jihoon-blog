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
    values: readonly [string, string, string, string]
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
    readingTime: string
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
  llms: {
    intro: string
    about: string
    rss: string
    sitemap: string
    posts: string
  }
}

const dictionaries: Record<Locale, Dictionary> = {
  ko: {
    siteDescription: '프론트엔드 개발자 이지훈(후니)의 기술 블로그. React, TypeScript, Next.js 등 웹 개발 기록과 학습 노트를 공유합니다.',
    navigation: { posts: '글', guestbook: '방명록', about: '소개' },
    actions: { search: '검색', changeTheme: '테마 변경', openMenu: '메뉴 열기', subscribeRss: 'RSS 구독' },
    search: { placeholder: '검색어를 입력하세요...', loading: '로딩 중...', empty: '검색 결과가 없습니다.', help: '제목, 내용, 카테고리로 검색할 수 있습니다.', shortcut: '로 언제든 검색할 수 있습니다.' },
    home: { values: ['독특한 이름을 가진다고 독특한 사람이 되는 것은 아니라고 생각한다. 내가 더 깊이 생각하고 더 나은 것을 만드는 사람이 된다면, 내가 남기는 것들도 자연스럽게 나만의 것이 될 것이다.', '지훈을 뒤집어 훈지라고 부르기 시작한 것도 그런 생각에서였다. 익숙한 생각을 조금만 뒤집어도 다른 질문과 관점이 생긴다. 소프트웨어를 만들 때도 기술보다 먼저 사용자가 겪는 문제를 보고, 당연해 보이는 선택을 다시 묻고, 판단의 이유를 남기려고 한다.', '좋은 소프트웨어는 복잡한 코드를 능숙하게 다루는 데서 끝나지 않는다. 문제를 함께 이해할 수 있는 언어를 만들고, 실패를 관찰할 수 있게 하며, 다음 사람이 더 나은 판단을 할 수 있도록 맥락을 남기는 일이라고 믿는다.', '이곳에는 그렇게 다르게 보고, 만들고, 다시 생각한 것들을 기록한다. 글을 쓰는 일 역시 알고 있는 것을 정리하는 것보다, 내가 무엇을 모르고 있었는지 발견하는 과정에 가깝다.'], greeting: '안녕하세요 {name}입니다', statsLoading: '통계 로딩 중...', popularPosts: '인기 글', pinnedPosts: '고정 글', noPinnedPosts: '고정된 글이 없습니다.', recentPosts: '최근 작성한 글', viewAll: '모든 글', noPosts: '아직 작성된 글이 없습니다.', noPopularPosts: '아직 인기 글이 없습니다.' },
    posts: { allPosts: '모든 글', count: '{count}개의 글', empty: '아직 작성된 글이 없습니다.' },
    post: { readingTime: '{minutes}분 분량', tableOfContents: '목차', openTableOfContents: '목차 열기', closeTableOfContents: '목차 닫기', relatedPosts: '함께 읽으면 좋은 글', previousPost: '이전 글', nextPost: '다음 글', comments: '댓글', updated: '수정' },
    category: { label: '카테고리', description: '{category} 주제의 글 {count}개를 모았습니다. React와 TypeScript를 활용한 프론트엔드 개발 경험, 문제 해결 과정, 설계 원칙과 실무에서 얻은 학습 내용을 한곳에서 살펴보세요.', empty: '이 카테고리에는 아직 글이 없습니다.' },
    about: { greeting: '안녕하세요 {name}입니다.', description: '프론트엔드 개발자 {name}의 소개 페이지입니다. 지금까지의 커리어와 커뮤니티 활동, React·TypeScript 중심의 기술 스택, 웹 제품을 설계하고 개발하며 쌓은 경험을 확인하세요.', profileDescription: '프론트엔드 개발자. {stack} 등의 기술로 웹을 개발합니다.' },
    guestbook: { title: '안녕하세요!', description: '후니네 개발하우스 방명록입니다. 프론트엔드 개발과 블로그 글에 대한 의견이나 질문, 함께 나누고 싶은 경험과 가벼운 인사를 자유롭게 남겨주세요. 모든 메시지를 반갑게 읽고 답변합니다.' },
    playground: { title: '재미있는 것을 만듭니다', description: '프론트엔드 개발자 이지훈이 직접 만든 개인 프로젝트를 소개합니다. 아이디어를 실제 제품으로 구현하며 얻은 설계 과정과 기술적 실험, 결과를 함께 살펴보세요.', empty: '아직 프로젝트가 없습니다.' },
    llms: { intro: '프론트엔드 개발자 {authorName}({authorNickname})의 기술 블로그입니다. 주요 스택: {stack}', about: '저자 소개, 커리어, 활동 이력', rss: 'RSS 구독', sitemap: '사이트 전체 URL', posts: '글' },
  },
  en: {
    siteDescription: 'Jihoon Lee’s frontend engineering blog, sharing practical notes on React, TypeScript, Next.js, and web development.',
    navigation: { posts: 'Posts', guestbook: 'Guestbook', about: 'About' },
    actions: { search: 'Search', changeTheme: 'Change theme', openMenu: 'Open menu', subscribeRss: 'Subscribe via RSS' },
    search: { placeholder: 'Search posts...', loading: 'Loading...', empty: 'No results found.', help: 'Search by title, content, or category.', shortcut: 'opens search at any time.' },
    home: { values: ['I do not think having a distinctive name makes someone distinctive. If I become a person who thinks more deeply and makes better things, what I leave behind will naturally become my own.', 'That thought is also why I began calling Jihoon in reverse, 훈지. Turning a familiar idea around just a little can reveal different questions and perspectives. When I build software, I try to see the problem the user faces before the technology, question choices that seem obvious, and leave behind the reasons for each decision.', 'Good software does not end with handling complex code skillfully. I believe it is about creating a language through which we can understand the problem together, making failure observable, and leaving enough context for the next person to make a better decision.', 'This is where I record what I have seen differently, made, and reconsidered. Writing is less about arranging what I already know than about discovering what I did not know.'], greeting: 'Hello, I’m {name}', statsLoading: 'Loading stats...', popularPosts: 'Popular posts', pinnedPosts: 'Pinned posts', noPinnedPosts: 'No pinned posts yet.', recentPosts: 'Recent posts', viewAll: 'All posts', noPosts: 'No posts yet.', noPopularPosts: 'No popular posts yet.' },
    posts: { allPosts: 'All posts', count: '{count} posts', empty: 'No posts yet.' },
    post: { readingTime: '{minutes} min read', tableOfContents: 'Table of contents', openTableOfContents: 'Open table of contents', closeTableOfContents: 'Close table of contents', relatedPosts: 'Related posts', previousPost: 'Previous post', nextPost: 'Next post', comments: 'Comments', updated: 'Updated' },
    category: { label: 'Category', description: 'Explore {count} articles about {category}, with practical frontend engineering notes, examples, and lessons.', empty: 'There are no posts in this category yet.' },
    about: { greeting: 'Hello, I’m {name}.', description: 'Meet frontend engineer {name} and explore his career, activities, and technical stack.', profileDescription: 'Frontend engineer building for the web with {stack}.' },
    guestbook: { title: 'Hello!', description: 'Leave a message, question, or feedback about the articles on Jihoon Lee’s frontend engineering blog.' },
    playground: { title: 'Enjoying making fun things', description: 'Explore Jihoon Lee’s personal frontend projects, product experiments, design decisions, and lessons learned while turning ideas into working software.', empty: 'No projects yet.' },
    llms: { intro: 'Technical blog by frontend engineer {authorName} ({authorNickname}). Main stack: {stack}', about: 'Author profile, career, and activities', rss: 'RSS subscription', sitemap: 'All site URLs', posts: 'Posts' },
  },
  ja: {
    siteDescription: 'フロントエンドエンジニア、イ・ジフンの技術ブログです。React、TypeScript、Next.jsを使ったWeb開発の実践、設計上の判断、問題解決の過程、継続的な学びを詳しく共有します。',
    navigation: { posts: '記事', guestbook: 'ゲストブック', about: 'プロフィール' },
    actions: { search: '検索', changeTheme: 'テーマを変更', openMenu: 'メニューを開く', subscribeRss: 'RSSを購読' },
    search: { placeholder: '記事を検索...', loading: '読み込み中...', empty: '検索結果がありません。', help: 'タイトル、本文、カテゴリーから検索できます。', shortcut: 'でいつでも検索できます。' },
    home: { values: ['個性的な名前を持つだけで、個性的な人になれるとは思わない。自分がより深く考え、より良いものを作る人になれば、残すものも自然と自分らしいものになるはずだ。', 'ジフンを逆にして훈지と呼び始めたのも、そんな考えからだった。慣れた考えを少しだけ裏返すと、別の問いや視点が生まれる。ソフトウェアを作るときも、技術より先にユーザーが直面する問題を見て、当然に見える選択を問い直し、判断の理由を残そうとしている。', '良いソフトウェアは、複雑なコードを巧みに扱うだけでは終わらない。問題を一緒に理解するための言葉を作り、失敗を観察できるようにし、次の人がより良い判断をできるよう文脈を残すことだと信じている。', 'ここには、そうして違う角度から見て、作り、もう一度考えたことを記録する。書くことも、知っていることを整理するというより、自分が何を知らなかったのかを発見する過程に近い。'], greeting: 'こんにちは、{name}です', statsLoading: '統計を読み込み中...', popularPosts: '人気の記事', pinnedPosts: '注目の記事', noPinnedPosts: '注目の記事はまだありません。', recentPosts: '最新の記事', viewAll: 'すべての記事', noPosts: '記事はまだありません。', noPopularPosts: '人気の記事はまだありません。' },
    posts: { allPosts: 'すべての記事', count: '{count}件の記事', empty: '記事はまだありません。' },
    post: { readingTime: '{minutes}分で読めます', tableOfContents: '目次', openTableOfContents: '目次を開く', closeTableOfContents: '目次を閉じる', relatedPosts: '関連記事', previousPost: '前の記事', nextPost: '次の記事', comments: 'コメント', updated: '更新' },
    category: { label: 'カテゴリー', description: '{category}に関する記事を{count}件まとめました。ReactやTypeScriptを使ったフロントエンド開発の実践例、問題解決の過程、設計上の判断、仕事と学習から得た知見を一か所で紹介します。', empty: 'このカテゴリーにはまだ記事がありません。' },
    about: { greeting: 'こんにちは、{name}です。', description: 'フロントエンドエンジニア{name}のプロフィールです。これまでの経歴やコミュニティ活動、ReactとTypeScriptを中心とした技術スタック、Webプロダクトの設計と開発で培った経験を紹介します。', profileDescription: '{stack}などを使ってWeb開発に取り組むフロントエンドエンジニアです。' },
    guestbook: { title: 'こんにちは！', description: 'イ・ジフンのフロントエンド技術ブログのゲストブックです。記事への感想や質問、共有したい開発経験、気軽なメッセージを自由にお寄せください。すべての投稿を楽しく読み、できる限り返信します。' },
    playground: { title: '楽しいものを作る', description: 'フロントエンドエンジニアのイ・ジフンが制作した個人プロジェクトを紹介します。アイデアを実際のプロダクトにする過程で試した設計、技術的な実験、そこから得た学びをまとめています。', empty: 'プロジェクトはまだありません。' },
    llms: { intro: 'フロントエンドエンジニア{authorName}（{authorNickname}）の技術ブログです。主な技術: {stack}', about: '著者プロフィール、経歴、活動', rss: 'RSS購読', sitemap: 'サイト全体のURL', posts: '記事' },
  },
  es: {
    siteDescription: 'Blog de ingeniería frontend de Jihoon Lee con experiencias sobre React, TypeScript, Next.js y desarrollo web.',
    navigation: { posts: 'Artículos', guestbook: 'Libro de visitas', about: 'Acerca de' },
    actions: { search: 'Buscar', changeTheme: 'Cambiar tema', openMenu: 'Abrir menú', subscribeRss: 'Suscribirse por RSS' },
    search: { placeholder: 'Buscar artículos...', loading: 'Cargando...', empty: 'No se encontraron resultados.', help: 'Busca por título, contenido o categoría.', shortcut: 'abre la búsqueda en cualquier momento.' },
    home: { values: ['No creo que tener un nombre singular convierta a alguien en una persona singular. Si llego a pensar con más profundidad y a crear mejores cosas, lo que deje atrás acabará siendo mío de forma natural.', 'Esa idea también me llevó a invertir Jihoon y empezar a llamarlo 훈지. Basta con girar un poco una idea familiar para que aparezcan otras preguntas y perspectivas. Al crear software, intento mirar el problema que vive la persona antes que la tecnología, volver a preguntar por las decisiones que parecen obvias y dejar constancia de por qué se tomaron.', 'El buen software no termina en saber manejar código complejo. Creo que consiste en crear un lenguaje con el que podamos entender juntos el problema, hacer observables los fallos y dejar contexto para que la siguiente persona pueda tomar una decisión mejor.', 'Aquí registro aquello que he mirado de otra manera, construido y vuelto a pensar. Escribir también se parece menos a ordenar lo que ya sé que a descubrir lo que no sabía.'], greeting: 'Hola, soy {name}', statsLoading: 'Cargando estadísticas...', popularPosts: 'Artículos populares', pinnedPosts: 'Artículos destacados', noPinnedPosts: 'Aún no hay artículos destacados.', recentPosts: 'Artículos recientes', viewAll: 'Todos los artículos', noPosts: 'Aún no hay artículos.', noPopularPosts: 'Aún no hay artículos populares.' },
    posts: { allPosts: 'Todos los artículos', count: '{count} artículos', empty: 'Aún no hay artículos.' },
    post: { readingTime: '{minutes} min de lectura', tableOfContents: 'Índice', openTableOfContents: 'Abrir índice', closeTableOfContents: 'Cerrar índice', relatedPosts: 'Artículos relacionados', previousPost: 'Artículo anterior', nextPost: 'Artículo siguiente', comments: 'Comentarios', updated: 'Actualizado' },
    category: { label: 'Categoría', description: 'Explora {count} artículos sobre {category} con experiencias, ejemplos y aprendizajes de ingeniería frontend.', empty: 'Aún no hay artículos en esta categoría.' },
    about: { greeting: 'Hola, soy {name}.', description: 'Conoce al ingeniero frontend {name}, su trayectoria, actividades y stack técnico.', profileDescription: 'Ingeniero frontend que desarrolla para la web con {stack}.' },
    guestbook: { title: '¡Hola!', description: 'Deja un mensaje, una pregunta o tus comentarios sobre los artículos del blog de ingeniería frontend de Jihoon Lee.' },
    playground: { title: 'Creando cosas divertidas', description: 'Explora los proyectos personales de frontend de Jihoon Lee, sus experimentos de producto, decisiones de diseño y aprendizajes al convertir ideas en software.', empty: 'Aún no hay proyectos.' },
    llms: { intro: 'Blog técnico del ingeniero frontend {authorName} ({authorNickname}). Stack principal: {stack}', about: 'Perfil, trayectoria y actividades del autor', rss: 'Suscripción RSS', sitemap: 'Todas las URL del sitio', posts: 'Artículos' },
  },
  'pt-BR': {
    siteDescription: 'Blog de engenharia frontend de Jihoon Lee, com experiências sobre React, TypeScript, Next.js e desenvolvimento web.',
    navigation: { posts: 'Artigos', guestbook: 'Livro de visitas', about: 'Sobre' },
    actions: { search: 'Pesquisar', changeTheme: 'Alterar tema', openMenu: 'Abrir menu', subscribeRss: 'Assinar via RSS' },
    search: { placeholder: 'Pesquisar artigos...', loading: 'Carregando...', empty: 'Nenhum resultado encontrado.', help: 'Pesquise por título, conteúdo ou categoria.', shortcut: 'abre a pesquisa a qualquer momento.' },
    home: { values: ['Não acredito que ter um nome singular torne alguém singular. Se eu me tornar uma pessoa que pensa com mais profundidade e cria coisas melhores, aquilo que eu deixar também se tornará naturalmente algo só meu.', 'Foi por essa ideia que comecei a inverter Jihoon e chamá-lo de 훈지. Basta virar um pouco um pensamento familiar para surgirem outras perguntas e perspectivas. Ao criar software, procuro enxergar o problema vivido pelo usuário antes da tecnologia, questionar escolhas que parecem óbvias e registrar as razões de cada decisão.', 'Bom software não termina em saber lidar com código complexo. Acredito que ele envolve criar uma linguagem para compreendermos o problema juntos, tornar as falhas observáveis e deixar contexto para que a próxima pessoa possa tomar uma decisão melhor.', 'Aqui registro o que observei de outra forma, construí e repensei. Escrever também se parece menos com organizar o que já sei e mais com descobrir o que eu ainda não sabia.'], greeting: 'Olá, eu sou {name}', statsLoading: 'Carregando estatísticas...', popularPosts: 'Artigos populares', pinnedPosts: 'Artigos em destaque', noPinnedPosts: 'Ainda não há artigos em destaque.', recentPosts: 'Artigos recentes', viewAll: 'Todos os artigos', noPosts: 'Ainda não há artigos.', noPopularPosts: 'Ainda não há artigos populares.' },
    posts: { allPosts: 'Todos os artigos', count: '{count} artigos', empty: 'Ainda não há artigos.' },
    post: { readingTime: '{minutes} min de leitura', tableOfContents: 'Sumário', openTableOfContents: 'Abrir sumário', closeTableOfContents: 'Fechar sumário', relatedPosts: 'Artigos relacionados', previousPost: 'Artigo anterior', nextPost: 'Próximo artigo', comments: 'Comentários', updated: 'Atualizado' },
    category: { label: 'Categoria', description: 'Explore {count} artigos sobre {category}, com experiências, exemplos e aprendizados de engenharia frontend.', empty: 'Ainda não há artigos nesta categoria.' },
    about: { greeting: 'Olá, eu sou {name}.', description: 'Conheça o engenheiro frontend {name}, sua carreira, atividades e stack técnico.', profileDescription: 'Engenheiro frontend que desenvolve para a web com {stack}.' },
    guestbook: { title: 'Olá!', description: 'Deixe uma mensagem, pergunta ou comentário sobre os artigos do blog de engenharia frontend de Jihoon Lee.' },
    playground: { title: 'Criando coisas divertidas', description: 'Conheça os projetos pessoais de frontend de Jihoon Lee, experimentos de produto, decisões de design e aprendizados ao transformar ideias em software.', empty: 'Ainda não há projetos.' },
    llms: { intro: 'Blog técnico do engenheiro frontend {authorName} ({authorNickname}). Stack principal: {stack}', about: 'Perfil, carreira e atividades do autor', rss: 'Assinatura RSS', sitemap: 'Todas as URLs do site', posts: 'Artigos' },
  },
  'zh-CN': {
    siteDescription: '前端工程师李智勋的技术博客，深入分享使用 React、TypeScript、Next.js 进行 Web 开发的实践记录、架构判断、问题排查过程、性能优化经验以及持续学习获得的技术见解。',
    navigation: { posts: '文章', guestbook: '留言簿', about: '关于' },
    actions: { search: '搜索', changeTheme: '切换主题', openMenu: '打开菜单', subscribeRss: '订阅 RSS' },
    search: { placeholder: '搜索文章...', loading: '加载中...', empty: '未找到结果。', help: '可按标题、正文或分类搜索。', shortcut: '可随时打开搜索。' },
    home: { values: ['我不认为拥有一个独特的名字，就会成为独特的人。如果我能思考得更深入，做出更好的东西，那么我留下的一切自然会带上只属于我的样子。', '我开始把 Jihoon 倒过来称作 훈지，也是因为这样的想法。把熟悉的念头稍微翻转一下，就会出现不同的问题和视角。做软件时，我也会先看用户正在经历的问题，而不是先看技术；重新追问那些看似理所当然的选择，并留下每次判断的理由。', '好的软件不止是熟练驾驭复杂的代码。我相信，它还意味着建立一种让大家共同理解问题的语言，让失败可以被观察，并留下足够的上下文，使后来的人能够做出更好的判断。', '我在这里记录那些换个角度看过、亲手做过，又重新思考过的事。写作与其说是在整理已经知道的内容，不如说是在发现自己原来并不知道什么。'], greeting: '你好，我是{name}', statsLoading: '正在加载统计数据...', popularPosts: '热门文章', pinnedPosts: '精选文章', noPinnedPosts: '暂无精选文章。', recentPosts: '最新文章', viewAll: '全部文章', noPosts: '暂无文章。', noPopularPosts: '暂无热门文章。' },
    posts: { allPosts: '全部文章', count: '{count}篇文章', empty: '暂无文章。' },
    post: { readingTime: '阅读约{minutes}分钟', tableOfContents: '目录', openTableOfContents: '打开目录', closeTableOfContents: '关闭目录', relatedPosts: '相关文章', previousPost: '上一篇', nextPost: '下一篇', comments: '评论', updated: '更新' },
    category: { label: '分类', description: '这里汇集了{count}篇关于{category}的文章，系统分享 React 与 TypeScript 前端工程实践、真实问题的排查过程、架构和设计取舍，以及从项目开发和持续学习中总结出的经验。', empty: '该分类下暂无文章。' },
    about: { greeting: '你好，我是{name}。', description: '这是前端工程师{name}的个人介绍页面。你可以了解他的职业经历、社区活动、以 React 和 TypeScript 为核心的技术栈，以及在设计和开发 Web 产品过程中积累的实践经验。', profileDescription: '使用{stack}等技术进行 Web 开发的前端工程师。' },
    guestbook: { title: '你好！', description: '欢迎来到李智勋前端工程技术博客的留言簿。你可以自由分享对文章的看法、开发中遇到的问题、值得交流的实践经验或简单问候；每一条留言都会被认真阅读并尽力回复。' },
    playground: { title: '创造有趣的东西', description: '探索前端工程师李智勋亲手完成的个人项目。这里记录了如何把想法变成可用产品的过程，包括产品实验、设计决策、技术取舍、实现结果以及开发过程中获得的经验与反思。', empty: '暂无项目。' },
    llms: { intro: '前端工程师{authorName}（{authorNickname}）的技术博客。主要技术栈：{stack}', about: '作者简介、职业经历与活动', rss: 'RSS 订阅', sitemap: '全站 URL', posts: '文章' },
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
