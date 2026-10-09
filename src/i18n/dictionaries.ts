import type { Locale } from './locales.ts'

type Dictionary = {
  siteTitle: string
  siteDescription: string
  navigation: {
    posts: string
    guestbook: string
    main: string
    adjacentPosts: string
    externalLinks: string
  }
  actions: {
    search: string
    changeTheme: string
    openMenu: string
    closeMenu: string
    clearSearch: string
    backToTop: string
    copyCode: string
    skipToContent: string
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
    recentPosts: string
    viewAll: string
    visitsToday: string
    visitsTotal: string
  }
  notFound: {
    title: string
    description: string
    backHome: string
    browsePosts: string
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
    closeGlossary: string
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
  guestbook: {
    title: string
    description: string
  }
  playground: {
    title: string
    description: string
    empty: string
  }
  resume: {
    title: string
    description: string
    role: string
    scale: string
    approach: string
    downloadKo: string
    downloadEn: string
    pdfNote: string
    contact: string
    email: string
    openSource: { title: string; merged: string; viewAll: string }
  }
  llms: {
    intro: string
    rss: string
    sitemap: string
    posts: string
  }
}

const dictionaries: Record<Locale, Dictionary> = {
  ko: {
    siteTitle: '훈지 · 프론트엔드 엔지니어링 기술 블로그',
    siteDescription: '프론트엔드 개발자 이지훈(후니)의 기술 블로그. React, TypeScript, Next.js 로 만들면서 겪은 설계 판단과 문제 해결 과정, 성능과 관측 실측, 학습 노트를 남깁니다.',
    navigation: {
      posts: '글',
      guestbook: '방명록',
      main: '주요 메뉴',
      adjacentPosts: '이전 글과 다음 글',
      externalLinks: '외부 링크',
    },
    actions: {
      search: '검색',
      changeTheme: '테마 변경',
      openMenu: '메뉴 열기',
      closeMenu: '메뉴 닫기',
      clearSearch: '검색어 지우기',
      backToTop: '맨 위로',
      copyCode: '코드 복사',
      skipToContent: '본문으로 건너뛰기',
    },
    search: { placeholder: '검색어를 입력하세요...', loading: '로딩 중...', empty: '검색 결과가 없습니다.', help: '제목, 내용, 카테고리로 검색할 수 있습니다.', shortcut: '로 언제든 검색할 수 있습니다.' },
    home: { values: ['독특한 이름을 가진다고 독특한 사람이 되는 것은 아니라고 생각한다. 내가 더 깊이 생각하고 더 나은 것을 만드는 사람이 된다면, 내가 남기는 것들도 자연스럽게 나만의 것이 될 것이다.', '지훈을 뒤집어 훈지라고 부르기 시작한 것도 그런 생각에서였다. 익숙한 생각을 조금만 뒤집어도 다른 질문과 관점이 생긴다. 그래서 복잡한 도메인을 만나면 당연해 보이는 선택부터 다시 묻고, 그 규칙과 예외를 코드가 다룰 수 있는 구조로 옮기는 일을 즐긴다.', '사용자나 동료가 같은 자리에서 반복해서 막히면 그냥 지나치지 않는다. 왜 막히는지 재고, 원인을 찾으면 직접 고치고, 고친 방법과 이유를 동료가 다시 쓸 수 있게 공유하는 데까지가 내 일이라고 생각한다. 맡은 부분은 운영 환경에서 의도대로 동작하는 것을 확인할 때까지 책임지고, 라이브러리를 읽다 발견한 문제는 오픈소스에 직접 고쳐 보내기도 한다.', '이곳에는 그렇게 다르게 보고, 만들고, 다시 생각한 것들을 기록한다. 글을 쓰는 일 역시 알고 있는 것을 정리하는 것보다, 내가 무엇을 모르고 있었는지 발견하는 과정에 가깝다.'], recentPosts: '최근 작성한 글', viewAll: '모든 글', visitsToday: '오늘', visitsTotal: '전체' },
    notFound: { title: '찾는 페이지가 없습니다', description: '주소가 바뀌었거나 글이 내려갔을 수 있습니다. 아래에서 다른 글을 찾아보세요.', backHome: '홈으로', browsePosts: '모든 글 보기' },
    posts: { allPosts: '모든 글', count: '{count}개의 글', empty: '아직 작성된 글이 없습니다.' },
    post: { readingTime: '{minutes}분 분량', tableOfContents: '목차', openTableOfContents: '목차 열기', closeTableOfContents: '목차 닫기', closeGlossary: '용어 설명 닫기', previousPost: '이전 글', nextPost: '다음 글', comments: '댓글', updated: '수정' },
    category: { label: '카테고리', description: '{category} 주제의 글 {count}개를 모았습니다. React와 TypeScript를 활용한 프론트엔드 개발 경험, 문제 해결 과정, 설계 원칙과 실무에서 얻은 학습 내용을 한곳에서 살펴보세요.', empty: '이 카테고리에는 아직 글이 없습니다.' },
    guestbook: { title: '안녕하세요!', description: '후니네 개발하우스 방명록입니다. 프론트엔드 개발과 블로그 글에 대한 의견이나 질문, 함께 나누고 싶은 경험과 가벼운 인사를 자유롭게 남겨주세요. 모든 메시지를 반갑게 읽고 답변합니다.' },
    playground: { title: '재미있는 것을 만듭니다', description: '프론트엔드 개발자 이지훈이 직접 만든 개인 프로젝트를 소개합니다. 아이디어를 실제 제품으로 구현하며 얻은 설계 과정과 기술적 실험, 결과를 함께 살펴보세요.', empty: '아직 프로젝트가 없습니다.' },
    resume: {
      title: 'About',
      description: '하이케어넷에서 미국 Medicare RPM/CCM 청구 플랫폼을 만드는 프론트엔드 개발자 이지훈의 이력서입니다. 한국어와 영어 이력서를 PDF로 내려받을 수 있습니다.',
      role: '프론트엔드 개발자',
      scale: '하이케어넷에서 프론트엔드를 맡고 있습니다. 단일 클리닉 환자 12명이 쓰던 건강정보 관리 서비스를, 캘리포니아 클리닉 46개와 환자 4,000명 이상이 쓰는 Medicare RPM/CCM 청구 플랫폼으로 확장했습니다.',
      approach: '사용자가 겪는 시간으로 트레이드오프를 판단하고, 그 근거를 구조에 남겨 팀의 품질로 만듭니다.',
      downloadKo: '한국어 이력서',
      downloadEn: 'English resume',
      pdfNote: 'PDF · {size}',
      contact: '연락처',
      email: '메일',
      openSource: { title: '오픈소스 기여', merged: '머지된 PR {count}건', viewAll: 'GitHub 에서 전체 보기' },
    },
    llms: { intro: '프론트엔드 개발자 {authorName}({authorNickname})의 기술 블로그입니다. 주요 스택: {stack}', rss: 'RSS 구독', sitemap: '사이트 전체 URL', posts: '글' },
  },
  en: {
    siteTitle: 'hooninedev · Frontend Engineering Blog by Jihoon Lee',
    siteDescription: 'Jihoon Lee’s frontend engineering blog: notes on React, TypeScript, and Next.js covering design decisions, debugging stories, and measured performance work.',
    navigation: {
      posts: 'Posts',
      guestbook: 'Guestbook',
      main: 'Main',
      adjacentPosts: 'Previous and next post',
      externalLinks: 'External links',
    },
    actions: {
      search: 'Search',
      changeTheme: 'Change theme',
      openMenu: 'Open menu',
      closeMenu: 'Close menu',
      clearSearch: 'Clear search',
      backToTop: 'Back to top',
      copyCode: 'Copy code',
      skipToContent: 'Skip to content',
    },
    search: { placeholder: 'Search posts...', loading: 'Loading...', empty: 'No results found.', help: 'Search by title, content, or category.', shortcut: 'opens search at any time.' },
    home: { values: ['I do not think having a distinctive name makes someone distinctive. If I become a person who thinks more deeply and makes better things, what I leave behind will naturally become my own.', 'That thought is also why I began calling Jihoon in reverse, 훈지. Turning a familiar idea around just a little can reveal different questions and perspectives. So when I meet a complex domain, I start by questioning the choices that seem obvious, and I enjoy turning its rules and exceptions into a structure that code can handle.', 'When users or colleagues keep getting stuck in the same place, I do not walk past it. I measure why they get stuck, fix the cause myself once I find it, and share how and why I fixed it so my colleagues can reuse it. I own my work until I have confirmed in production that it behaves as intended, and when I find a problem while reading a library, I sometimes send the fix upstream to open source.', 'This is where I record what I have seen differently, made, and reconsidered. Writing is less about arranging what I already know than about discovering what I did not know.'], recentPosts: 'Recent posts', viewAll: 'All posts', visitsToday: 'Today', visitsTotal: 'All time' },
    notFound: { title: 'This page does not exist', description: 'The address may have changed, or the post may have been taken down. Try finding another article below.', backHome: 'Go home', browsePosts: 'Browse all posts' },
    posts: { allPosts: 'All posts', count: '{count} posts', empty: 'No posts yet.' },
    post: { readingTime: '{minutes} min read', tableOfContents: 'Table of contents', openTableOfContents: 'Open table of contents', closeTableOfContents: 'Close table of contents', closeGlossary: 'Close term explanation', previousPost: 'Previous post', nextPost: 'Next post', comments: 'Comments', updated: 'Updated' },
    category: { label: 'Category', description: 'Explore {count} articles about {category}. Frontend engineering notes on React and TypeScript, debugging stories, design decisions, and practical lessons.', empty: 'There are no posts in this category yet.' },
    guestbook: { title: 'Hello!', description: 'Leave a message, a question, or feedback about the articles on Jihoon Lee’s frontend engineering blog. Every note gets read, and most of them get an answer.' },
    playground: { title: 'Enjoying making fun things', description: 'Explore Jihoon Lee’s personal frontend projects, product experiments, design decisions, and lessons learned while turning ideas into working software.', empty: 'No projects yet.' },
    resume: {
      title: 'About',
      description: 'Resume of Jihoon Lee, a frontend developer at HicareNet building a Medicare RPM/CCM billing platform for US clinics. Korean and English resumes are available as PDFs.',
      role: 'Frontend Developer',
      scale: 'I lead frontend work at HicareNet. I grew a health-record service used by 12 patients at a single clinic into a Medicare RPM/CCM billing platform serving 46 California clinics and more than 4,000 patients.',
      approach: 'I weigh trade-offs by the time a user actually spends, and I leave the reasoning in the structure so it becomes the team\'s quality rather than mine.',
      downloadKo: 'Korean resume',
      downloadEn: 'English resume',
      pdfNote: 'PDF · {size}',
      contact: 'Contact',
      email: 'Email',
      openSource: { title: 'Open source contributions', merged: '{count} merged pull requests', viewAll: 'View all on GitHub' },
    },
    llms: { intro: 'Technical blog by frontend engineer {authorName} ({authorNickname}). Main stack: {stack}', rss: 'RSS subscription', sitemap: 'All site URLs', posts: 'Posts' },
  },
  ja: {
    siteTitle: 'hooninedev · イ・ジフンのフロントエンド技術ブログ',
    siteDescription: 'フロントエンドエンジニア、イ・ジフンの技術ブログです。React、TypeScript、Next.jsを使ったWeb開発の実践、設計上の判断、問題解決の過程、継続的な学びを詳しく共有します。',
    navigation: {
      posts: '記事',
      guestbook: 'ゲストブック',
      main: 'メインメニュー',
      adjacentPosts: '前の記事と次の記事',
      externalLinks: '外部リンク',
    },
    actions: {
      search: '検索',
      changeTheme: 'テーマを変更',
      openMenu: 'メニューを開く',
      closeMenu: 'メニューを閉じる',
      clearSearch: '検索語を消去',
      backToTop: 'トップへ戻る',
      copyCode: 'コードをコピー',
      skipToContent: '本文へスキップ',
    },
    search: { placeholder: '記事を検索...', loading: '読み込み中...', empty: '検索結果がありません。', help: 'タイトル、本文、カテゴリーから検索できます。', shortcut: 'でいつでも検索できます。' },
    home: { values: ['個性的な名前を持つだけで、個性的な人になれるとは思わない。自分がより深く考え、より良いものを作る人になれば、残すものも自然と自分らしいものになるはずだ。', 'ジフンを逆にして훈지と呼び始めたのも、そんな考えからだった。慣れた考えを少しだけ裏返すと、別の問いや視点が生まれる。だから複雑なドメインに出会うと、当然に見える選択から問い直し、そのルールと例外をコードが扱える構造に移すことを楽しんでいる。', 'ユーザーや同僚が同じ場所で何度もつまずいていたら、見過ごさない。なぜつまずくのかを測り、原因が分かれば自分で直し、直した方法と理由を同僚が再利用できるよう共有するところまでが自分の仕事だと考えている。任された部分は本番環境で意図どおりに動くと確かめるまで責任を持ち、ライブラリを読んでいて見つけた問題はオープンソースに直接修正を送ることもある。', 'ここには、そうして違う角度から見て、作り、もう一度考えたことを記録する。書くことも、知っていることを整理するというより、自分が何を知らなかったのかを発見する過程に近い。'], recentPosts: '最新の記事', viewAll: 'すべての記事', visitsToday: '本日', visitsTotal: '累計' },
    notFound: { title: 'お探しのページはありません', description: 'アドレスが変わったか、記事が取り下げられた可能性があります。下から別の記事を探してみてください。', backHome: 'ホームへ', browsePosts: 'すべての記事を見る' },
    posts: { allPosts: 'すべての記事', count: '{count}件の記事', empty: '記事はまだありません。' },
    post: { readingTime: '{minutes}分で読めます', tableOfContents: '目次', openTableOfContents: '目次を開く', closeTableOfContents: '目次を閉じる', closeGlossary: '用語の説明を閉じる', previousPost: '前の記事', nextPost: '次の記事', comments: 'コメント', updated: '更新' },
    category: { label: 'カテゴリー', description: '{category}に関する記事を{count}件まとめました。ReactやTypeScriptを使ったフロントエンド開発の実践例、問題解決の過程、設計上の判断、仕事と学習から得た知見を一か所で紹介します。', empty: 'このカテゴリーにはまだ記事がありません。' },
    guestbook: { title: 'こんにちは！', description: 'イ・ジフンのフロントエンド技術ブログのゲストブックです。記事への感想や質問、共有したい開発経験、気軽なメッセージを自由にお寄せください。すべての投稿を楽しく読み、できる限り返信します。' },
    playground: { title: '楽しいものを作る', description: 'フロントエンドエンジニアのイ・ジフンが制作した個人プロジェクトを紹介します。アイデアを実際のプロダクトにする過程で試した設計、技術的な実験、そこから得た学びをまとめています。', empty: 'プロジェクトはまだありません。' },
    resume: {
      title: 'About',
      description: 'HicareNetで米国のMedicare RPM/CCM請求プラットフォームを開発するフロントエンド開発者イ・ジフンの履歴書です。韓国語と英語の履歴書をPDFでダウンロードできます。',
      role: 'フロントエンド開発者',
      scale: 'HicareNetでフロントエンドを担当しています。単一クリニックの患者12名が使っていた健康情報管理サービスを、カリフォルニアの46クリニック・4,000名以上の患者が使うMedicare RPM/CCM請求プラットフォームへと広げました。',
      approach: 'ユーザーが実際に費やす時間でトレードオフを判断し、その根拠を構造に残してチームの品質にします。',
      downloadKo: '韓国語の履歴書',
      downloadEn: '英語の履歴書',
      pdfNote: 'PDF · {size}',
      contact: '連絡先',
      email: 'メール',
      openSource: { title: 'オープンソースへの貢献', merged: 'マージされた PR {count}件', viewAll: 'GitHub ですべて見る' },
    },
    llms: { intro: 'フロントエンドエンジニア{authorName}（{authorNickname}）の技術ブログです。主な技術: {stack}', rss: 'RSS購読', sitemap: 'サイト全体のURL', posts: '記事' },
  },
  es: {
    siteTitle: 'hooninedev · Blog de ingeniería frontend de Jihoon Lee',
    siteDescription: 'Blog de ingeniería frontend de Jihoon Lee, con experiencias sobre React, TypeScript, Next.js, rendimiento web y decisiones de diseño en producción.',
    navigation: {
      posts: 'Artículos',
      guestbook: 'Libro de visitas',
      main: 'Principal',
      adjacentPosts: 'Artículo anterior y siguiente',
      externalLinks: 'Enlaces externos',
    },
    actions: {
      search: 'Buscar',
      changeTheme: 'Cambiar tema',
      openMenu: 'Abrir menú',
      closeMenu: 'Cerrar menú',
      clearSearch: 'Borrar búsqueda',
      backToTop: 'Volver arriba',
      copyCode: 'Copiar código',
      skipToContent: 'Saltar al contenido',
    },
    search: { placeholder: 'Buscar artículos...', loading: 'Cargando...', empty: 'No se encontraron resultados.', help: 'Busca por título, contenido o categoría.', shortcut: 'abre la búsqueda en cualquier momento.' },
    home: { values: ['No creo que tener un nombre singular convierta a alguien en una persona singular. Si llego a pensar con más profundidad y a crear mejores cosas, lo que deje atrás acabará siendo mío de forma natural.', 'Esa idea también me llevó a invertir Jihoon y empezar a llamarlo 훈지. Basta con girar un poco una idea familiar para que aparezcan otras preguntas y perspectivas. Por eso, cuando me encuentro con un dominio complejo, empiezo por cuestionar las decisiones que parecen obvias y disfruto convirtiendo sus reglas y excepciones en una estructura que el código pueda manejar.', 'Cuando usuarios o colegas se atascan una y otra vez en el mismo punto, no lo dejo pasar. Mido por qué se atascan, corrijo la causa yo mismo cuando la encuentro y comparto cómo y por qué lo corregí para que mis colegas puedan reutilizarlo. Me hago responsable de mi trabajo hasta comprobar en producción que funciona como se esperaba, y cuando encuentro un problema leyendo una librería, a veces envío la corrección al proyecto de código abierto.', 'Aquí registro aquello que he mirado de otra manera, construido y vuelto a pensar. Escribir también se parece menos a ordenar lo que ya sé que a descubrir lo que no sabía.'], recentPosts: 'Artículos recientes', viewAll: 'Todos los artículos', visitsToday: 'Hoy', visitsTotal: 'Total' },
    notFound: { title: 'Esta página no existe', description: 'Puede que la dirección haya cambiado o que el artículo se haya retirado. Busca otro artículo abajo.', backHome: 'Ir al inicio', browsePosts: 'Ver todos los artículos' },
    posts: { allPosts: 'Todos los artículos', count: '{count} artículos', empty: 'Aún no hay artículos.' },
    post: { readingTime: '{minutes} min de lectura', tableOfContents: 'Índice', openTableOfContents: 'Abrir índice', closeTableOfContents: 'Cerrar índice', closeGlossary: 'Cerrar explicación del término', previousPost: 'Artículo anterior', nextPost: 'Artículo siguiente', comments: 'Comentarios', updated: 'Actualizado' },
    category: { label: 'Categoría', description: 'Explora {count} artículos sobre {category}. Notas de ingeniería frontend con React y TypeScript, decisiones de diseño y aprendizajes prácticos.', empty: 'Aún no hay artículos en esta categoría.' },
    guestbook: { title: '¡Hola!', description: 'Deja un mensaje, una pregunta o tus comentarios sobre los artículos del blog de ingeniería frontend de Jihoon Lee.' },
    playground: { title: 'Creando cosas divertidas', description: 'Explora los proyectos personales de frontend de Jihoon Lee, sus experimentos de producto, decisiones de diseño y aprendizajes al convertir ideas en software.', empty: 'Aún no hay proyectos.' },
    resume: {
      title: 'About',
      description: 'Currículum de Jihoon Lee, desarrollador frontend en HicareNet, donde construye una plataforma de facturación Medicare RPM/CCM para clínicas de EE. UU. Disponible en coreano e inglés en PDF.',
      role: 'Desarrollador Frontend',
      scale: 'Lidero el frontend en HicareNet. Convertí un servicio de registros de salud que usaban 12 pacientes de una sola clínica en una plataforma de facturación Medicare RPM/CCM para 46 clínicas de California y más de 4.000 pacientes.',
      approach: 'Decido las concesiones según el tiempo que el usuario realmente vive, y dejo ese razonamiento en la estructura para que se convierta en calidad del equipo.',
      downloadKo: 'Currículum en coreano',
      downloadEn: 'Currículum en inglés',
      pdfNote: 'PDF · {size}',
      contact: 'Contacto',
      email: 'Correo',
      openSource: { title: 'Contribuciones de código abierto', merged: '{count} pull requests fusionados', viewAll: 'Ver todo en GitHub' },
    },
    llms: { intro: 'Blog técnico del ingeniero frontend {authorName} ({authorNickname}). Stack principal: {stack}', rss: 'Suscripción RSS', sitemap: 'Todas las URL del sitio', posts: 'Artículos' },
  },
  'pt-BR': {
    siteTitle: 'hooninedev · Blog de engenharia frontend de Jihoon Lee',
    siteDescription: 'Blog de engenharia frontend de Jihoon Lee: notas sobre React, TypeScript e Next.js, com decisões de design, casos de depuração e medições de desempenho.',
    navigation: {
      posts: 'Artigos',
      guestbook: 'Livro de visitas',
      main: 'Principal',
      adjacentPosts: 'Artigo anterior e próximo',
      externalLinks: 'Links externos',
    },
    actions: {
      search: 'Pesquisar',
      changeTheme: 'Alterar tema',
      openMenu: 'Abrir menu',
      closeMenu: 'Fechar menu',
      clearSearch: 'Limpar pesquisa',
      backToTop: 'Voltar ao topo',
      copyCode: 'Copiar código',
      skipToContent: 'Ir para o conteúdo',
    },
    search: { placeholder: 'Pesquisar artigos...', loading: 'Carregando...', empty: 'Nenhum resultado encontrado.', help: 'Pesquise por título, conteúdo ou categoria.', shortcut: 'abre a pesquisa a qualquer momento.' },
    home: { values: ['Não acredito que ter um nome singular torne alguém singular. Se eu me tornar uma pessoa que pensa com mais profundidade e cria coisas melhores, aquilo que eu deixar também se tornará naturalmente algo só meu.', 'Foi por essa ideia que comecei a inverter Jihoon e chamá-lo de 훈지. Basta virar um pouco um pensamento familiar para surgirem outras perguntas e perspectivas. Por isso, quando encontro um domínio complexo, começo questionando as escolhas que parecem óbvias e gosto de transformar suas regras e exceções em uma estrutura que o código consiga tratar.', 'Quando usuários ou colegas travam repetidamente no mesmo ponto, não deixo passar. Meço por que travam, corrijo a causa eu mesmo quando a encontro e compartilho como e por que corrigi para que meus colegas possam reutilizar. Assumo a responsabilidade pelo meu trabalho até confirmar em produção que ele funciona como pretendido e, quando encontro um problema lendo uma biblioteca, às vezes envio a correção para o projeto open source.', 'Aqui registro o que observei de outra forma, construí e repensei. Escrever também se parece menos com organizar o que já sei e mais com descobrir o que eu ainda não sabia.'], recentPosts: 'Artigos recentes', viewAll: 'Todos os artigos', visitsToday: 'Hoje', visitsTotal: 'Total' },
    notFound: { title: 'Esta página não existe', description: 'O endereço pode ter mudado ou o artigo pode ter sido retirado. Procure outro artigo abaixo.', backHome: 'Ir para o início', browsePosts: 'Ver todos os artigos' },
    posts: { allPosts: 'Todos os artigos', count: '{count} artigos', empty: 'Ainda não há artigos.' },
    post: { readingTime: '{minutes} min de leitura', tableOfContents: 'Sumário', openTableOfContents: 'Abrir sumário', closeTableOfContents: 'Fechar sumário', closeGlossary: 'Fechar explicação do termo', previousPost: 'Artigo anterior', nextPost: 'Próximo artigo', comments: 'Comentários', updated: 'Atualizado' },
    category: { label: 'Categoria', description: 'Explore {count} artigos sobre {category}. Notas de engenharia frontend com React e TypeScript, decisões de design e aprendizados práticos.', empty: 'Ainda não há artigos nesta categoria.' },
    guestbook: { title: 'Olá!', description: 'Deixe uma mensagem, uma pergunta ou um comentário sobre os artigos do blog de engenharia frontend de Jihoon Lee. Toda mensagem é lida e quase sempre respondida.' },
    playground: { title: 'Criando coisas divertidas', description: 'Conheça os projetos pessoais de frontend de Jihoon Lee, experimentos de produto, decisões de design e aprendizados ao transformar ideias em software.', empty: 'Ainda não há projetos.' },
    resume: {
      title: 'About',
      description: 'Currículo de Jihoon Lee, desenvolvedor frontend na HicareNet, onde constrói uma plataforma de faturamento Medicare RPM/CCM para clínicas dos EUA. Disponível em coreano e inglês em PDF.',
      role: 'Desenvolvedor Frontend',
      scale: 'Lidero o frontend na HicareNet. Transformei um serviço de registros de saúde usado por 12 pacientes de uma única clínica em uma plataforma de faturamento Medicare RPM/CCM para 46 clínicas da Califórnia e mais de 4.000 pacientes.',
      approach: 'Avalio as trocas pelo tempo que o usuário realmente gasta e deixo esse raciocínio na estrutura, para que vire qualidade do time.',
      downloadKo: 'Currículo em coreano',
      downloadEn: 'Currículo em inglês',
      pdfNote: 'PDF · {size}',
      contact: 'Contato',
      email: 'E-mail',
      openSource: { title: 'Contribuições open source', merged: '{count} pull requests mesclados', viewAll: 'Ver tudo no GitHub' },
    },
    llms: { intro: 'Blog técnico do engenheiro frontend {authorName} ({authorNickname}). Stack principal: {stack}', rss: 'Assinatura RSS', sitemap: 'Todas as URLs do site', posts: 'Artigos' },
  },
  'zh-CN': {
    siteTitle: 'hooninedev · 李智勋的前端工程技术博客',
    siteDescription: '前端工程师李智勋的技术博客，深入分享使用 React、TypeScript、Next.js 进行 Web 开发的实践记录、架构判断、问题排查过程、性能优化经验以及持续学习获得的技术见解。',
    navigation: {
      posts: '文章',
      guestbook: '留言簿',
      main: '主菜单',
      adjacentPosts: '上一篇和下一篇',
      externalLinks: '外部链接',
    },
    actions: {
      search: '搜索',
      changeTheme: '切换主题',
      openMenu: '打开菜单',
      closeMenu: '关闭菜单',
      clearSearch: '清除搜索内容',
      backToTop: '返回顶部',
      copyCode: '复制代码',
      skipToContent: '跳到正文',
    },
    search: { placeholder: '搜索文章...', loading: '加载中...', empty: '未找到结果。', help: '可按标题、正文或分类搜索。', shortcut: '可随时打开搜索。' },
    home: { values: ['我不认为拥有一个独特的名字，就会成为独特的人。如果我能思考得更深入，做出更好的东西，那么我留下的一切自然会带上只属于我的样子。', '我开始把 Jihoon 倒过来称作 훈지，也是因为这样的想法。把熟悉的念头稍微翻转一下，就会出现不同的问题和视角。所以遇到复杂的业务领域时，我会先重新追问那些看似理所当然的选择，并乐于把其中的规则和例外转化为代码能够处理的结构。', '当用户或同事反复卡在同一个地方时，我不会视而不见。我会去度量他们为什么卡住，找到原因后亲手修复，并把修复的方法和理由分享出去，让同事可以复用。负责的部分，我会一直负责到在生产环境中确认它按预期运行为止；在阅读库的源码时发现问题，有时也会直接向开源项目提交修复。', '我在这里记录那些换个角度看过、亲手做过，又重新思考过的事。写作与其说是在整理已经知道的内容，不如说是在发现自己原来并不知道什么。'], recentPosts: '最新文章', viewAll: '全部文章', visitsToday: '今日', visitsTotal: '累计' },
    notFound: { title: '找不到这个页面', description: '地址可能已经变了，或者这篇文章已被撤下。可以在下面找找别的文章。', backHome: '回到首页', browsePosts: '查看全部文章' },
    posts: { allPosts: '全部文章', count: '{count}篇文章', empty: '暂无文章。' },
    post: { readingTime: '阅读约{minutes}分钟', tableOfContents: '目录', openTableOfContents: '打开目录', closeTableOfContents: '关闭目录', closeGlossary: '关闭术语说明', previousPost: '上一篇', nextPost: '下一篇', comments: '评论', updated: '更新' },
    category: { label: '分类', description: '这里汇集了{count}篇关于{category}的文章，系统分享 React 与 TypeScript 前端工程实践、真实问题的排查过程、架构和设计取舍，以及从项目开发和持续学习中总结出的经验。', empty: '该分类下暂无文章。' },
    guestbook: { title: '你好！', description: '欢迎来到李智勋前端工程技术博客的留言簿。你可以自由分享对文章的看法、开发中遇到的问题、值得交流的实践经验或简单问候；每一条留言都会被认真阅读并尽力回复。' },
    playground: { title: '创造有趣的东西', description: '探索前端工程师李智勋亲手完成的个人项目。这里记录了如何把想法变成可用产品的过程，包括产品实验、设计决策、技术取舍、实现结果以及开发过程中获得的经验与反思。', empty: '暂无项目。' },
    resume: {
      title: 'About',
      description: '李智勋的简历。他是 HicareNet 的前端开发者，为美国诊所构建 Medicare RPM/CCM 计费平台。提供韩语和英语两份 PDF。',
      role: '前端开发者',
      scale: '我在 HicareNet 负责前端。把原本只有一家诊所 12 名患者使用的健康信息管理服务，扩展成加州 46 家诊所、4,000 多名患者在用的 Medicare RPM/CCM 计费平台。',
      approach: '我以用户真正花掉的时间来权衡取舍，并把依据留在结构里，让它成为团队的质量。',
      downloadKo: '韩语简历',
      downloadEn: '英语简历',
      pdfNote: 'PDF · {size}',
      contact: '联系方式',
      email: '邮箱',
      openSource: { title: '开源贡献', merged: '已合并 {count} 个 PR', viewAll: '在 GitHub 查看全部' },
    },
    llms: { intro: '前端工程师{authorName}（{authorNickname}）的技术博客。主要技术栈：{stack}', rss: 'RSS 订阅', sitemap: '全站 URL', posts: '文章' },
  },
}

/**
 * 헤더가 쓰는 문구만 고른다. 서버에서 불러 `Header` 에 props 로 넘긴다.
 * 클라이언트 컴포넌트가 이 모듈을 import 하면 사전 전체가 번들에 실린다.
 */
export function getHeaderLabels(locale: Locale) {
  const dictionary = getDictionary(locale)
  return {
    posts: dictionary.navigation.posts,
    resume: dictionary.resume.title,
    main: dictionary.navigation.main,
    changeTheme: dictionary.actions.changeTheme,
    openMenu: dictionary.actions.openMenu,
    closeMenu: dictionary.actions.closeMenu,
    search: {
      search: dictionary.actions.search,
      clearSearch: dictionary.actions.clearSearch,
      placeholder: dictionary.search.placeholder,
      loading: dictionary.search.loading,
      empty: dictionary.search.empty,
      help: dictionary.search.help,
      shortcut: dictionary.search.shortcut,
    },
  }
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
