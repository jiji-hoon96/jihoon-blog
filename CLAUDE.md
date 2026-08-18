# jihoon-blog

> 이 문서는 AI 에이전트(Claude Code)의 단일 진입점이다. Claude Code 는 이 `CLAUDE.md` 를 자동 로드한다.

프론트엔드 개발자의 기술 블로그 (Next.js + TypeScript + Contentlayer)

## 블로그 글 작성 가이드

이 블로그의 글은 jihoon 스타일의 문체를 따릅니다. 글 작성/정리 시 `.claude/commands/write-post.md`의 문체 가이드를 참고하세요.

### 핵심 문체 요약

- **한다체** 사용, 1인칭은 **"필자"**
- 도입: "이번 포스팅에서는 [주제]에 대한 이야기를 해보려고 한다." + 개인적 맥락
- 괄호 안에는 글 흐름에서 자연스럽게 이어지는 필자의 실제 소견이나 견해를 담는다. 글과 동떨어진 썰렁한 농담이나 인터넷 밈은 지양한다.
- 비유를 활용해 기술 개념을 설명하되, 업계에서 영어가 더 정확하고 검색하기 쉬운 용어는 영어로 보존한다. 첫 등장 풀이는 이해를 실제로 돕는 경우에만 병기한다.
- 섹션 전환은 질문을 통해 자연스럽게. 전체 문맥 흐름이 독자에게 어색하지 않아야 한다.
- 결론은 논지 압축 + 독자에게 말 건네기
- 출처를 본문에 언급할 때는 저자/기관 중심으로 간결하게 소개한다.

### 마크다운 문법 규칙

- **강조는 `**텍스트**` (볼드)만 사용**한다. `*텍스트*` (이탤릭)는 사용하지 않는다.
  - 한글은 이탤릭 렌더링이 자연스럽지 않아 시각적 효과가 약하고 일관성이 떨어지기 때문이다.
  - 톤 전환이나 부연이 필요하면 괄호 안 코멘트로 처리한다.
- **em dash(—)나 하이픈(-)을 문장 이음, 설명 연결, 제목·부제 구분 용도로 사용하지 않는다.** 본문·소제목·목록·프론트매터(seoTitle 등)·`:::ref` 링크 텍스트 어디에서도 마찬가지다. 다만 **외부 원문 인용 블록은 예외**로, 원문 구두점을 그대로 둔다.
  - 대신 쉼표, 콜론(`:`), 마침표, 또는 자연스러운 문장 구조로 표현한다.
  - 지양: `방향 1 — harness`, `2025년 10월 — Agent Skills`, `Zustand — 소스코드`
  - 권장: `방향 1, harness` 또는 `방향 1: harness`, `2025년 10월, Agent Skills`, `Zustand 소스코드`

### 기술 용어

- 제품명, API, SDK, 코드 식별자와 업계에서 영어가 더 명확한 용어는 억지로 번역하지 않는다. `Computer Science`, `wall-clock time`, `OpenTelemetry`, `React Server Components`처럼 정확성과 검색 가능성이 커지는 표현은 원문을 유지한다.
- 독자에게 낯선 핵심어는 첫 등장에만 `wall-clock time(실제 경과 시간)`처럼 짧게 설명할 수 있다. 설명이 뜻을 흐리거나 문장을 무겁게 만들면 영어만 쓴다.
- 외부 원문 인용과 코드 안의 명칭은 번역하지 않는다. 기술 용어 기준은 `content/terminology.yml`, 검증은 `pnpm content:terms`를 사용한다.

### 링크 사용 규칙

- **본문에서 직접 인용한 출처는 본문에 인라인 링크로 걸고, 하단 참고 자료(`:::ref`)에서는 뺀다.** 같은 링크를 본문과 하단에 중복하지 않는다.
  - "직접 인용"은 특정 수치·발언·정의·정책을 그 출처를 들어 본문에 쓴 경우다. 포괄적 언급("공식 문서에 따르면" 수준)은 무리하게 인라인화하지 않고 하단에 둔다.
  - 본문에 인라인 링크가 없는 보조/심화 자료만 하단 `:::ref`에 남긴다.
- **같은 URL은 글 전체에서 링크를 한 번만 건다.** 같은 출처(특히 내부 글 링크, 예: `[토큰의 원리](/260610)`)를 여러 번 언급해도 링크는 **첫 등장에만** 걸고, 이후 등장은 텍스트로만 둔다.

### 인용 사용 규칙

- **인용 블록(`> `)은 글 하나에 3~5개를 상한**으로 본다. 논지를 뒷받침할 때만 쓰고, 사실 전달이 목적이면 인라인 링크를 걸고 필자의 문장으로 푼다.
- 걷어낼 때는 인라인 링크를 남기고 인용 블록만 지운다. 인용 블록 사이에는 필자의 문단이 최소 하나 들어가야 한다.

### 시각 자료

- **참조를 쓰기 전에 이미지 파일을 먼저 만든다.** `![설명](그림이나자료필요(...))` 플레이스홀더 문법은 마크다운으로 파싱되지 않아 프롬프트가 본문에 노출된다. 사용 금지.
- 제작은 HTML 을 헤드리스 Chrome 으로 스크린샷 하는 방식이다. 다크 테마 토큰과 렌더 명령은 `.claude/commands/write-post.md` 의 시각 자료 가이드에 있다.
- 저장 위치는 `content/YYMMDD/N.png`, 본문 참조는 `![설명](N.png?w=720)`. 빌드가 `public/content/` 로 복사한다.
- 우선순위는 이 리포·계정의 실제 데이터로 만든 도표 > 개념 다이어그램 > 외부 스크린샷 순이다.

### 글의 깊이

- 글의 척추는 필자의 1차 경험이다. 웹 검색보다 **리포(PR 본문·코드·테스트), `.gsc-data/` 의 Search Console CSV, Sentry MCP(`hooninedev/jihoon-blog`) 의 이슈·태그·릴리스, 빌드 실측**을 먼저 턴다.
- 필자는 회사에서 Sentry 기반 에러 모니터링을 오래 써왔고 개인 블로그에서는 GA4·Search Console·SEO 를 직접 운영해왔다. "몰라서 못 했다" 식 초심자 프레이밍으로 쓰지 않는다.
- 과거 작업을 글로 정리할 때는 **현재 상태를 다시 조회한다.** 고쳤다고 믿은 것이 지금도 고쳐져 있는지 확인하고, 아니면 미해결 상태 그대로 쓴다.
- [Sean Goedecke의 글쓰기 원칙](https://www.seangoedecke.com/blog-about-things-you-dont-understand-yet/)처럼, 글은 이미 아는 내용을 정리하는 데서 끝내지 않고 쓰는 동안 이해를 갱신하는 도구로 쓴다. 시작할 때 질문과 초기 가설, 합리적인 독자가 반론할 수 있는 핵심 주장을 한 문장씩 적는다.
- 조사 중 생각이 바뀐 지점과 아직 모르는 범위를 숨기지 않는다. 사실, 추론, 의견을 구분하고 자신의 경험·전문성 범위를 명시한다.
- 초고의 결론이 도입보다 더 정확하고 압축되어야 한다. 결론까지 쓴 뒤 새로 이해한 내용을 기준으로 도입을 다시 쓰며, 배운 것이 없다면 발행 가치와 질문을 재검토한다.

### 리서치 기반 글쓰기

글 작성/리파인 시 초안 내용만으로 작성하지 않고, **웹 검색을 통한 리서치를 병행**합니다.

- 기술적 주장(성능 수치, 동작 원리, 비교 등)의 **사실 관계를 검증**
- 주제 관련 **최신 버전, 생태계 현황, 업계 동향**을 조사하여 시의성 확보
- 전문가 발언, 공식 문서, 벤치마크 등 **레퍼런스 기반 서술**에 활용할 자료 수집
- 리서치 결과 중 초안에 없더라도 주제의 깊이를 더하는 내용은 적극 반영

### SEO 가이드

블로그 글 작성 시 SEO를 위해 프론트매터에 `description`과 `keywords` 필드를 반드시 포함합니다. 짧은 `title`로 사이트 내 가독성을 유지하면서 검색엔진엔 풍부한 키워드를 노출하고 싶을 땐 `seoTitle`을 함께 사용합니다.

- **title**: 사이트 본문 H1, 카드/리스트/내비게이션에 표시되는 짧고 명확한 제목
  - "추상화", "도메인 모델"처럼 깔끔하게 유지
- **seoTitle** (선택): `<title>` 태그, OG, 트위터 카드, 구글 검색 결과 제목에 사용되는 SEO 친화적 긴 제목
  - 50~60자 권장, 핵심 검색 키워드를 자연스럽게 포함
  - JSON-LD에서 `alternativeHeadline`/`name`으로도 출력되어 검색엔진이 양쪽 제목을 모두 인식
  - 미지정 시 `title`이 자동으로 대체되므로, 키워드 강화가 필요한 글에만 추가
  - 예: title `"추상화"` + seoTitle `"프론트엔드 추상화, 좋은 코드를 위한 설계 원칙"`
- **description**: 검색 결과 스니펫에 노출되는 메타 디스크립션 (120~160자)
  - 글의 핵심 내용과 독자가 얻을 수 있는 가치를 명확하게 전달
  - 주요 검색 키워드를 자연스럽게 포함
- **keywords**: 쉼표로 구분된 검색 타겟 키워드 (5~8개, 필요시 더 추가)
  - 구체적이고 검색량이 있는 롱테일 키워드 위주로 작성
  - 한글/영문 혼용 가능 (예: "React Fiber, React 렌더링 원리")

프론트매터에 `description`/`keywords`가 없으면 자동 생성된 excerpt/categories로 대체되지만, 직접 작성하는 것이 SEO에 훨씬 효과적입니다.

실제 운영 데이터상 `description`/`keywords`가 비면 검색 노출은 되어도 클릭이 0에 수렴하는 사례가 확인됐습니다. 발행 전 SEO 체크리스트(길이 기준, 내부 링크, 이미지 alt 등)는 `.claude/commands/write-post.md`를 참고하세요.

`updatedAt`은 선택 필드입니다. 결론, 근거, 예제처럼 독자가 다시 확인할 만한 본문을 실제로 수정했을 때만 `YYYY-MM-DD`로 기록하고, 오탈자 수정이나 Git 커밋 시각만으로는 추가하지 않습니다.

사람과 AI가 모두 신뢰하고 인용하기 쉬운 글을 위해 필자의 1차 경험·실측, 선택의 이유와 대안, 버전·환경·절차 같은 재현 조건, 공식 문서·표준·원 논문 등 1차 출처를 우선합니다. AI가 보조한 인용·수치·코드·번역은 사람이 원문이나 실행 결과로 다시 확인합니다. TL;DR, FAQ, 비교표, 고정 소제목은 필수가 아니며 독자에게 실제로 도움이 될 때만 사용합니다.

### GSC(검색 성과) 데이터 활용

- `pnpm gsc`로 Google Search Console의 최근 28일 vs 직전 28일 검색 데이터를 수집합니다. (`.gsc-data/`에 CSV 저장 + Quick Win/Cannibalization 자동 분류)
- 사전 준비: `.env.local`에 `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GSC_SITE_URL` 설정. (GA4와 동일 서비스 계정 재사용, 해당 계정을 GSC 속성에 사용자로 추가 필요)
- GitHub Actions(`.github/workflows/gsc-collect.yml`)가 매주 월요일 자동 수집하며, 결과는 아티팩트 + Job Summary로 확인합니다. (동일한 3개 값을 리포 Secrets에 등록해야 동작)
- 글의 `keywords`는 추측이 아니라 GSC에서 실제 노출되는 쿼리를 우선 반영합니다.

### 콘텐츠 구조

- 블로그 포스트: `content/YYMMDD/index.md`
- 프론트매터: emoji, title, seoTitle(선택), date, updatedAt(의미 있는 수정 시 선택), categories, description, keywords 필드 사용
- categories에 "ignore"가 포함되면 비공개 처리됩니다. `ignore` 글은 sitemap, RSS, 글 목록, 검색, 개별 페이지(404), llms.txt에서 완전히 제외되고 `noindex`가 적용됩니다. (판별 로직: `src/lib/filter-posts.ts`의 `isHiddenPost`) 발행 시 `ignore`를 실제 카테고리로 교체합니다.

### 커스텀 명령어

- `/write-post [초안]` - 초안을 블로그 글 작성
- `/refine-post [파일경로]` - 기존 글을 jihoon 스타일로 리파인

## 에러 모니터링 (Sentry)

Sentry 프로젝트: `hooninedev/jihoon-blog` (`@sentry/nextjs`)

### 서버 전용 구성이다

**브라우저 계측은 의도적으로 넣지 않았다.** `src/instrumentation-client.ts` 가 없다. 아래 번들 실측대로 클라이언트 SDK 가 client JS 를 79KB(gzip) 늘리는데, 이 블로그의 도입 목적은 서버에서 조용히 실패하는 GA 호출을 잡는 것이고 그 부분은 사실상 공짜다.

따라서 잡히는 것과 안 잡히는 것이 갈린다.

- 잡힌다: 라우트 핸들러와 서버 컴포넌트에서 발생한 에러, `src/lib/google-analytics.ts` 의 GA 실패
- 안 잡힌다: 브라우저에서만 발생하는 에러 (클라이언트 컴포넌트 이벤트 핸들러, 하이드레이션 불일치 등)

클라이언트 계측을 켜려면 `src/instrumentation-client.ts` 를 만들어 `Sentry.init` 과 `export const onRouterTransitionStart = Sentry.captureRouterTransitionStart` 를 넣고, `src/app/global-error.tsx` 에 `captureException` 을 되살린다. 이때 브라우저 확장·서드파티 스크립트·`utteranc.es` 를 걸러내는 `ignoreErrors`/`denyUrls` 를 반드시 함께 넣는다. 무료 티어 쿼터를 태우는 건 실제 버그가 아니라 그런 노이즈다.

### 파일 구조

`src/` 디렉터리를 쓰는 프로젝트이므로 init 파일도 전부 `src/` 아래에 둔다. Next 16 은 `src/instrumentation-client` 를 루트보다 먼저 해석하고(`next/dist/build/create-compiler-aliases.js`), 서버 훅도 `app` 과 같은 레벨에서 탐지한다.

| 파일 | 역할 |
|---|---|
| `src/instrumentation.ts` | 런타임별 init 로드, `onRequestError` 로 서버 요청 에러 캡처 |
| `src/sentry.server.config.ts` | Node 런타임 init |
| `src/sentry.edge.config.ts` | Edge 런타임 init (현재 edge 라우트는 없지만 빌드가 배선함) |
| `src/app/global-error.tsx` | 루트 렌더 에러 UI 폴백. 서버 전용 구성이라 Sentry 로 직접 보고하지는 않는다 |

### 환경변수

- 로컬: `.env` 의 `NEXT_PUBLIC_SENTRY_DSN`
- Netlify 대시보드에도 `NEXT_PUBLIC_SENTRY_DSN` 을 등록해야 한다. `.env*` 는 gitignore 대상이라 배포 환경엔 자동으로 넘어가지 않는다.
- 소스맵 업로드에는 `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` 가 필요하다. Netlify 대시보드에 등록되어 있다. 토큰이 없으면 업로드만 꺼지고 빌드는 통과한다. (`next.config.ts` 의 `sourcemaps.disable`)
- `SENTRY_ORG` 는 슬러그 기준이다. Sentry org 슬러그를 바꾸면 이 값도 같이 바꿔야 업로드가 동작한다. 현재 슬러그는 `hooninedev` 다.
- 토큰 스코프는 `project:releases` 다. 현재 쓰는 토큰은 `sntryu_` 로 시작하는 **user(개인) 토큰**이다. 동작은 하지만 계정 변경에 취약하므로 `sntrys_` organization 토큰으로 교체하는 편이 낫다.

### 소스맵

Turbopack 빌드도 업로드를 지원한다. `useRunAfterProductionCompileHook` 이 Turbopack 에서 기본 `true` 이고, 빌드 로그의 `Running next.config.js provided runAfterProductionCompile` 이 그 경로다. 서버 `.map` 은 Next 가 이미 130개 남짓 생성하므로 따로 켤 설정은 없다.

업로드 후 `.map` 을 지우는 이유는 용량이다. Turbopack 이 만드는 서버 소스맵이 57MB 로 서버 JS(15MB) 보다 큰데, 지우지 않으면 그게 전부 Netlify 함수 번들에 실린다. 업로드 후에는 필요 없다.

**여기서 `deleteSourcemapsAfterUpload: true` 는 쓰지 않는다.** 그 옵션은 `.next/static` 만 지우고 정작 용량을 차지하는 `.next/server` 는 남긴다. 실측으로 확인했다(업로드 직후에도 서버 `.map` 135개 / 57MB 잔존). 그래서 `filesToDeleteAfterUpload` 로 `.next/server/**/*.map` 과 `.next/static/**/*.map` 을 직접 지정한다.

`silent` 은 조건부다. 항상 켜두면 토큰 스코프 부족이나 만료로 업로드가 실패해도 조용히 넘어가서, 다음에 읽을 수 없는 스택 트레이스를 볼 때까지 알 수 없다. 업로드를 시도할 때만 로그를 남긴다.

**클라이언트 맵은 대상이 아니다.** 서버 전용 구성이라 브라우저 SDK 가 없다.

### 검증 완료 상태 (2026-08-04)

Netlify 함수 런타임에서 실제 이벤트로 확인한 것들이다. Deploy Preview 에 임시 라우트를 올려 검증하고 머지하지 않고 닫는 방식을 썼다. 프로덕션 크레덴셜을 건드리지 않아도 된다.

- 서버 캡처: `captureException` 이 `flush()` 없이도 전송된다. 서버리스에서 응답 후 함수가 얼어 전송이 끊길까 걱정했지만 문제 없었다. `google-analytics.ts` 가 쓰는 경로가 이것이다.
- `onRequestError` 자동 훅: 핸들링하지 않은 라우트 에러도 잡힌다 (`mechanism: auto.function.nextjs.on_request_error`).
- 소스맵: 스택이 `src/...` 경로 + 줄번호 + 주변 소스 코드까지 해석된다. 적용 전에는 `y([root-of-the-server]__468aa3ae._)` 였다.
- 이벤트 지연: throw 경로 이벤트가 약 2분 늦게 도착한 적이 있다. 즉시 조회해서 없다고 누락으로 판단하면 안 된다.

### 동작 조건과 정책

- DSN 이 있고 `NODE_ENV === 'production'` 일 때만 전송한다. 개발 중 발생하는 에러는 무료 티어 쿼터만 태우므로 보내지 않는다.
- `tracesSampleRate` 는 0.1. Core Web Vitals 는 기존대로 `WebVitalsReporter` 가 GA4 로 보내고, Sentry 는 에러와 낮은 샘플링 트레이싱만 담당한다.
- **Session Replay 는 쓰지 않는다.** 블로그는 로딩 성능이 곧 SEO 라서 비용이 이득보다 크다. `next.config.ts` 의 `bundleSizeOptimizations` 로 관련 코드를 번들에서 제거한다.
- **GA 호출에는 반드시 `gaCallOptions()` 를 넘긴다.** `src/lib/ga-request-options.ts` 에 있다. `runReport` 의 라이브러리 기본 RPC 타임아웃이 60초여서, 넘기지 않으면 GA 가 응답하지 않을 때 요청이 60초 넘게 매달린다. fallback 때문에 응답은 200 이라 조용히 통계만 빈다. 프로덕션에서 `Deadline exceeded after 65.877s` 로 실제 관측됐다(JIHOON-BLOG-2). 블랙홀 서버로 재현해 타임아웃 미지정 60.04초 / 5초 지정 5.00초를 실측했다. `src/lib/ga-request-options.test.mjs` 가 호출 지점 누락을 막는다.
- `src/lib/google-analytics.ts` 의 catch 블록 4곳에서 `captureException` 을 호출한다. 이 함수들은 GA 호출이 실패해도 fallback 값을 반환하고 응답은 200 이라, 계측하지 않으면 통계가 0 으로 보이는 장애를 알 방법이 없다. **라우트 핸들러의 catch 만으로는 잡히지 않는다.** 실제로 검증 과정에서 이 사실이 드러났다.

### 번들 비용 실측 (2026-08-04)

`.next/static/chunks/*.js` 의 gzip 총합을 clean build 기준으로 비교했다.

| 구성 | client JS (gzip) | 증가분 |
|---|---|---|
| Sentry 미적용 | 181.6 KB | 기준 |
| **현재 구성 (서버 전용)** | **182.3 KB** | **+0.7 KB** |
| 서버 전용 + global-error 에서 `captureException` 호출 | 186.0 KB | +4.4 KB |
| 클라이언트 + 서버 | 260.4 KB | +78.8 KB |

`bundleSizeOptimizations.excludeTracing: true` 도 시도했지만 260.4 KB 로 변화가 없었다. 클라이언트 비용을 줄이는 유일한 방법은 `src/instrumentation-client.ts` 를 두지 않는 것이다.

3번째 행이 있는 이유: 브라우저 Sentry 클라이언트가 없으면 `global-error.tsx` 의 `captureException` 은 no-op 인데 SDK 코드는 번들에 실린다. 그래서 호출을 뺐다.

### 로컬 검증 방법

개발 모드에서는 전송이 꺼져 있으므로 프로덕션 모드로 확인한다. 잘못된 키를 주입해 GA 호출을 실패시키면 된다.

```bash
pnpm build
PORT=3111 GA_PROPERTY_ID=123456789 \
  GOOGLE_SERVICE_ACCOUNT_EMAIL=verify@example.iam.gserviceaccount.com \
  GOOGLE_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\nINVALID\n-----END PRIVATE KEY-----\n' \
  pnpm start
curl "http://localhost:3111/api/analytics?type=page&slug=/verify"
```

`type=page` 를 쓰는 이유는 `getPageViews` 가 `unstable_cache` 를 거치지 않아서다. `type=stats` 나 `type=popular` 는 캐시된 fallback 이 돌아와 에러가 재현되지 않을 수 있다.
