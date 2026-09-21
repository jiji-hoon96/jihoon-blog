# jihoon-blog

> 이 문서는 AI 에이전트(Claude Code)의 단일 진입점이다. Claude Code 는 이 `CLAUDE.md` 를 자동 로드한다.

프론트엔드 개발자의 기술 블로그 (Next.js + TypeScript + Contentlayer)

## 블로그 글 작성 가이드

이 블로그의 글은 jihoon 스타일의 문체를 따릅니다. 글 작성/정리 시 `.claude/commands/write-post.md`의 문체 가이드를 참고하세요.

### 핵심 문체 요약

- **한다체** 사용, 1인칭은 **"필자"**
- 도입: "이번 포스팅에서는 [주제]에 대한 이야기를 해보려고 한다." + 개인적 맥락
- 괄호에는 **독자에게 보여줄 내용**만 담는다. 영어 원어 병기(20자 이내), 한 문장 보충, 필자의 소견 셋 중 하나다. 글과 동떨어진 농담이나 밈은 지양한다.
- **작업 과정의 흔적을 괄호에 남기지 않는다.** `(이 세션의 요청에 없었던 것이다)`, `(다시 빌드해 보지 않아 모른다)` 같은 문장이다. 남길 값어치가 있는 한계라면 괄호가 아니라 본문 문장으로 올린다.
- 괄호가 **60자를 넘으면 본문으로 내릴 후보**다. 상한이 아니라 검토 신호다. 그림 출처와 라이선스는 본문 괄호가 아니라 그림 아래 독립된 줄에 적는다.
- 비유를 활용해 기술 개념을 설명하되, 업계에서 영어가 더 정확하고 검색하기 쉬운 용어는 영어로 보존한다. 첫 등장 풀이는 이해를 실제로 돕는 경우에만 병기한다.
- 섹션 전환은 질문을 통해 자연스럽게. 전체 문맥 흐름이 독자에게 어색하지 않아야 한다.
- 결론은 논지 압축 + 독자에게 말 건네기
- 출처를 본문에 언급할 때는 저자/기관 중심으로 간결하게 소개한다.

### 목차와 독자 검증

- H2와 H3는 본문을 찾기 위한 탐색 표지다. 절의 핵심 개념을 **명사구로 먼저 시도하고**, 명사구로 뜻이 서지 않을 때만 짧은 문장을 쓴다. 제목만 읽어도 글의 논리 흐름이 보여야 한다.
- **20자를 기준선으로 본다.** 넘으면 줄일 수 있는지 검토하고, 25자를 넘으면 대개 두 가지를 한 제목에 넣은 것이다. 서술형 종결이 절반을 넘으면 목차가 주장 목록이 되어 결론이 흐려진다.
- 질문형은 소제목이 아니라 절 전환 문장에 쓴다. **소제목 개수나 밀도는 기준이 아니다.** 판별 기준은 마지막 H2 가 앞의 H2 들을 결정 하나로 묶는가이고, 묶이지 않으면 논증이 아니라 카탈로그다.
- 제목 하나에 여러 주제를 묶지 않고, 추상적인 비유보다 본문에서 실제로 설명하는 단어를 우선한다. 제목과 첫 문단은 같은 내용을 반복하지 않는다.
- 초안 전에 글의 핵심 주장 한 문장과 절별 독자 획득점 한 문장을 편집 메모로 정리한다. 이 메모는 공개 원고에 자동으로 넣지 않는다.
- 리파인할 때는 입문자, 실무자, 전문가, 회의적 독자 관점으로 순서대로 검토한다. 지적에는 대상 문단, 예상되는 오해, 수정 방향을 함께 적는다.

### 논지와 독해 흐름

- 초안 전에 핵심 질문, 글이 전달할 답, 포함할 범위, 다루지 않을 범위를 각각 한 문장으로 정한다. 쓰는 동안 결론이 바뀌면 이 범위 계약도 함께 갱신한다.
- 각 절은 독자가 그 지점에서 가질 질문 하나에 답한다. 절의 답이 다음 절을 읽어야 할 이유를 만들되, 질문형 문장을 기계적으로 넣지는 않는다.
- 문단은 하나의 논리 단위로 쓴다. 첫 문장에서 중심 내용을 알리고, 나머지 문장은 근거, 해석, 적용 또는 한계를 보탠다. 현재 문단의 중심 내용과 직접 관계없는 문장은 이동하거나 걷어낸다.
- 초고 뒤에는 각 문단의 요지와 역할을 짧게 적는 reverse outline을 만든다. 요지가 없으면 연결을 보강하거나 삭제하고, 요지가 둘 이상이면 문단을 나누며, 핵심 주장에 기여하지 않으면 범위 밖으로 판단한다.
- 제목, 도입, H2와 H3, 각 문단의 첫 문장만 위에서 아래로 읽어도 `무엇을 말하는가`, `왜 다음 내용이 필요한가`, `어디에서 결론에 도달하는가`가 보여야 한다.
- 필요한 정의와 전제는 처음 사용하기 전에 둔다. 뒤 절의 내용을 미리 길게 설명하거나 앞 절의 결론을 이유 없이 반복하지 않는다.
- 긴 글의 구성과 문단 검토에는 [Google Technical Writing의 문서 구성](https://developers.google.com/tech-writing/two/large-docs)과 [문단 작성 원칙](https://developers.google.com/tech-writing/one/paragraphs), 초고의 구조 검토에는 [George Mason Writing Center의 reverse outlining](https://writingcenter.gmu.edu/writing-resources/writing-as-process/reverse-outlining)을 참고한다.

### 마크다운 문법 규칙

- **강조는 `**텍스트**` (볼드)만 사용**한다. `*텍스트*` (이탤릭)는 사용하지 않는다.
  - 한글은 이탤릭 렌더링이 자연스럽지 않아 시각적 효과가 약하고 일관성이 떨어지기 때문이다.
  - 톤 전환이나 부연이 필요하면 문장을 끊거나 괄호를 쓴다. 괄호는 위 세 용도 안에서만 쓴다.
- **em dash(—)나 하이픈(-)을 문장 이음, 설명 연결, 제목·부제 구분 용도로 사용하지 않는다.** 본문·소제목·목록·프론트매터(seoTitle 등)·`:::ref` 링크 텍스트 어디에서도 마찬가지다. 다만 **외부 원문 인용 블록은 예외**로, 원문 구두점을 그대로 둔다.
  - 대신 쉼표, 콜론(`:`), 마침표, 또는 자연스러운 문장 구조로 표현한다.
  - 지양: `방향 1 — harness`, `2025년 10월 — Agent Skills`, `Zustand — 소스코드`
  - 권장: `방향 1, harness` 또는 `방향 1: harness`, `2025년 10월, Agent Skills`, `Zustand 소스코드`
  - **이 규칙은 한국어, 일본어, 중국어 본문에만 적용한다.** 금지의 근거가 "한국어 문장에서 번역투를 만든다" 이고 같은 문제가 CJK 전반에 있다. 영어, 스페인어, 포르투갈어에서 em dash 는 그 언어의 정상 구두점이라 걷어내면 문장이 나빠진다. 중국어의 破折号(`——`)도 그 언어의 표준 부호이므로 그대로 둔다. `pnpm audit:repo` 가 이 범위대로 검사한다.
  - **이탤릭 금지에는 로케일 예외가 없다.** 번역본에서도 `**볼드**`를 쓴다. 책 제목처럼 라틴 조판에서 이탤릭이 관례인 경우에도 이 블로그는 강조 표기를 하나로 유지한다.

### 기술 용어

- 제품명, API, SDK, 코드 식별자와 업계에서 영어가 더 명확한 용어는 억지로 번역하지 않는다. `Computer Science`, `wall-clock time`, `OpenTelemetry`, `React Server Components`처럼 정확성과 검색 가능성이 커지는 표현은 원문을 유지한다.
- 독자에게 낯선 핵심어는 첫 등장에만 `wall-clock time(실제 경과 시간)`처럼 짧게 설명할 수 있다. 설명이 뜻을 흐리거나 문장을 무겁게 만들면 영어만 쓴다.
- 외부 원문 인용과 코드 안의 명칭은 번역하지 않는다. 기술 용어 기준은 `content/terminology.yml`, 검증은 `pnpm content:terms`를 사용한다.
- **영어 단어를 한글 발음으로 옮겨 적은 것은 원어로 쓴다.** `피커`가 아니라 `picker`, `팝오버`가 아니라 `popover` 다. 다만 합성어 안에서만 등장하거나(`멀티스레드`, `프레임워크`, `자바스크립트`) 한국어 기술 문서에 이미 정착한 말(`응답 헤더`, `콜 스택`, `컨텍스트 엔지니어링`, `릴리스`)은 그대로 둔다. 기계가 막는 목록은 `terminology.yml` 의 `banned` 이고, 판단 기준은 `.claude/commands/write-post.md` 의 「음차 외래어를 영어로 되돌린다」에 있다.
- **프론트매터도 음차 규칙 대상이다.** `seoTitle` 과 `description` 은 검색 결과에 그대로 노출되고, `keywords` 도 본문과 표기가 갈리면 같은 글이 두 가지 이름을 갖는다. 검사에서 빠지는 것은 코드 블록과 인라인 코드뿐이다. 한글 검색어 자체(`React 렌더링 원리`)는 음차가 아니므로 그대로 둔다.
- 음차만 고친 수정은 번역본 내용을 건드리지 않고 `sourceHash` 만 갱신하면 된다. 각 로케일의 `seoTitle` 과 `keywords` 는 그 언어의 검색어라 함께 바꾸지 않는다.
- 본문 흐름 안에서 짧은 해설이 필요한 핵심 용어는 첫 의미 있는 등장에 `:term[RUM]{key="rum"}` 형식으로 표시한다. 키는 `content/glossary.json`의 소문자 kebab-case 값을 사용한다.
- 용어 해설은 본문 설명을 대체하지 않는다. `pnpm content:glossary`로 검증한다.

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
- **우선순위를 정하는 기준은 독자가 그 그림 없이 이해할 수 있는가다.** 데이터가 예뻐 보이는지가 아니다. 순서는 `이해가 막히는 지점을 푸는 개념 다이어그램 > 라이선스가 허락하는 출처 원본 그림 > 실제 데이터로 만든 도표` 다.
- **먼저 개념 다이어그램을 검토한다.** 텍스트로 설명하면 두 문단이 걸리는 구조, 시간 순서, 포함 관계, 경계선을 한 장으로 보여준다. 숫자는 문장으로도 전달되지만 구조는 잘 안 된다. 손그림 스타일을 쓰고 흰 배경으로 둔다. `rough.js` 를 인라인한 HTML 을 헤드리스 Chrome 으로 굽는 절차가 `write-post.md` 에 있다. 시각적 기준은 web.dev 의 INP 다이어그램(input delay, processing duration, presentation delay 를 시간축에 놓은 손그림)이다. 그 그림을 실었던 글은 2026-09-21 에 내려서 리포에는 더 이상 없다.
- **출처에 이미 있는 그림이 있으면 직접 그리지 않는다.** 인용한 공식 문서나 명세의 그림을 내려받아 쓴다. 조건은 재사용을 허락하는 라이선스(web.dev·developer.chrome.com·OpenTelemetry 문서의 CC BY 4.0 등)이고, 그림 바로 아래 독립된 줄에 출처와 라이선스를 밝힌다. 라이선스가 불명확하면 내려받지 않고 링크로만 건다.
- **데이터 도표는 수치의 분포나 대비 자체가 논지일 때만 만든다.** 숫자를 카드에 담아 늘어놓는 것은 도표가 아니다. 값 세 개를 보여주려고 대시보드 모양을 만들고 있다면 그 자리는 문장이나 표가 낫다. 만들기로 했다면 HTML 을 헤드리스 Chrome 으로 스크린샷 하고, 다크 테마 토큰과 렌더 명령은 `.claude/commands/write-post.md` 의 시각 자료 가이드에 있다.
- **다크 테마 카드 레이아웃을 개념 설명에 쓰지 않는다.** 그 형식은 수치용이고, 구조를 담으면 대시보드 스크린샷처럼 보여 관계가 드러나지 않는다.
- 저장 위치는 `content/YYMMDD/N.png`, 본문 참조는 `![설명](N.png?w=720)`. 빌드가 `public/content/` 로 복사한다.
- **`public/content/` 는 `content/` 의 파생물이다.** 거기에만 있는 파일을 만들지 않는다.
  `pruneOrphans` 가 폴더 단위로만 지우던 시절에 글 두 편의 이미지 16개가 `public/content/` 에만
  남아 git 에 추적됐다. 본문이 그것을 참조하므로 화면은 멀쩡했고 참조에서 존재를 확인하는 게이트도
  통과했다. 파일 단위로 지우는 순간 6개 로케일에서 깨진다. 지금은 파일 단위로 지운다.

### 글의 깊이

- 글의 척추는 필자의 1차 경험이다. 웹 검색보다 **리포(PR 본문·코드·테스트), `.gsc-data/` 의 Search Console CSV, Sentry MCP(`hooninedev/jihoon-blog`) 의 이슈·태그·릴리스, 빌드 실측**을 먼저 턴다.
- 필자는 회사에서 Sentry 기반 에러 모니터링을 오래 써왔고 개인 블로그에서는 GA4·Search Console·SEO 를 직접 운영해왔다. "몰라서 못 했다" 식 초심자 프레이밍으로 쓰지 않는다.
- **예시는 검증된 것만 쓴다.** 이 리포의 코드와 커밋, 이 계정의 실데이터(Sentry, GSC, 빌드 실측), 공식 문서나 명세에 실린 예시 중 하나여야 한다. 필자가 겪지 않은 가상의 결제 흐름이나 보내지 않는 이벤트 이름 같은 지어낸 예시는 넣지 않는다. 다시 뽑을 수 없는 과거 수치는 조회 시점을 함께 적는다.
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

### 다국어 번역 (한글 본문을 고치면 5개 로케일이 같이 움직인다)

모든 한글 글은 `en`, `ja`, `es`, `pt-BR`, `zh-CN` 5개 로케일 번역본을 가진다. (`content/YYMMDD/index.<locale>.md`, 로케일 목록은 `src/i18n/locales.ts`)

**한글 원문(`index.md`)을 고치면 그 글의 번역본 5개가 전부 stale 이 된다.** `content/translations.json` 이 각 글의 한글 원문 sha256 을 들고 있고, 번역본 프론트매터의 `sourceHash` 가 그 값과 같아야 통과한다. 해시는 프론트매터를 포함한 파일 전체를 대상으로 하므로 `keywords` 하나만 고쳐도 stale 이 된다. (의도한 동작이다. 원문 SEO 메타가 바뀌면 각 로케일의 `description`·`keywords` 도 검색 의도에 맞춰 다시 써야 한다)

그래서 한글 본문을 수정할 때의 절차는 이렇다.

1. `index.md` 를 고친다
2. 번역본 5개의 해당 문단을 같이 고친다. 절차는 `docs/translation-review.md` 의 2-pass 규약을 따른다
3. `node -e` 로 새 해시를 구해 `content/translations.json` 과 번역본 5개의 `sourceHash` 를 갱신한다
4. `pnpm content:translations` 로 확인한다

**빠뜨리면 빌드가 막힌다.** `pnpm build` 와 `pnpm test` 양쪽에서 `scripts/validate-translations.mjs` 가 돌고, missing·stale·구조 불일치가 하나라도 있으면 실패한다. 구조 검사는 코드 블록, 인라인 코드, 링크 목적지, 이미지 경로, 헤딩 레벨, 디렉티브, `:::original` 원문을 원문과 완전히 일치시킬 것을 요구한다. 따라서 번역본에서 내부 링크(`/260418`)를 로케일 경로로 바꾸거나 인용 원문을 손대면 실패한다.

한 글만 볼 때는 `pnpm content:translations -- --post YYMMDD` 를 쓴다.

**새 글은 검사 대상이 아니다.** validator 는 `content/translations.json` 의 `posts` 배열만 순회하므로, 매니페스트에 등록하지 않은 새 글은 번역이 하나도 없어도 조용히 통과한다. (실측 확인) 그러므로 새 글을 발행할 때는 번역 5개를 만든 뒤 매니페스트에 항목을 직접 추가해야 한다. 초고를 쓰는 동안 빌드가 막히지 않는 것은 이 구조 덕분이지만, 등록을 잊으면 번역 없이 발행된다.

### 커스텀 명령어

- `/write-post [초안]` - 초안을 블로그 글 작성
- `/refine-post [파일경로]` - 기존 글을 jihoon 스타일로 리파인
- `/audit` - 기능, 성능, SEO, 관측, 콘텐츠 정합성을 여러 관점에서 점검하고 고친다

## 정기 점검 (/audit)

리포 점검은 기계가 하는 부분과 판단이 필요한 부분으로 나눠 둔다.

| 조각 | 무엇을 한다 |
|---|---|
| `pnpm audit:repo` | 게이트 7개, 콘텐츠 정합성, 번들과 소스맵 측정. 결과는 `.audit-report.json` |
| `pnpm audit:repo --build` | 앞에 클린 프로덕션 빌드를 돌린다 |
| `pnpm audit:repo --live` | 프로덕션 응답 코드, TTFB, 보안 헤더, 사이트맵 유출까지 본다 |
| `.claude/commands/audit.md` | 병렬 에이전트 5개로 판단이 필요한 레인을 본다 |

**빌드는 병렬 진입 전에 혼자 한 번만 돌린다.** `pnpm build` 와 `pnpm rebuild` 가 `.contentlayer` 와 `.next` 를 지우므로,
에이전트를 띄운 채로 누가 빌드를 돌리면 서로의 산출물을 덮어쓴다. 그러면 레포의 문제가 아니라
경쟁 상태의 흔적을 발견하게 된다. 그래서 `/audit` 은 0단계에서 빌드를 끝내고 레인에는 로그 경로만 넘긴다.

예산은 `scripts/audit.mjs` 의 `BUDGET` 에 있다. 실측이 바뀌면 이 문서의 수치와 같이 갱신한다.
문서의 수치가 실측과 어긋난 채로 남으면 다음 번에 회귀를 판정할 기준이 사라진다.

**린트는 빌드 게이트가 아니다.** `pnpm build` 는 `eslint` 를 돌리지 않으므로 린트가 깨져도 배포는 통과한다.
그래서 `audit:repo` 는 린트 실패를 FAIL 이 아니라 WARN 으로 둔다.

**TTFB 는 중앙값 5회다.** 1회 측정은 edge 캐시 적중 여부에 따라 3.6배까지 흔들린다.
2026-09-19 감사에서 홈이 4.27초로 WARN 이 떴는데, 같은 시각 기준선은 edge hit 0.27초 /
함수 경로 1.00초였다. 사이트가 느렸던 것이 아니라 그 순간의 캐시 상태를 잰 것이다.
그래서 `--live` 는 경로마다 5회를 재 중앙값을 쓰고 `cache-status` 를 같이 남긴다.
이 숫자를 읽을 때는 함수 경로인지 edge hit 인지를 먼저 본다.

## 폰트

**굵기는 400 과 700 두 종만 쓴다.** 위계는 크기로 준다. Wanted Sans 는 굵기마다 한글
서브셋을 따로 받으므로 굵기 하나가 곧 수십 KB 다.

이 규칙이 CSS 에서 지켜지지 않고 있었다. `prose.css` 가 `em`, `.ref-summary`,
`.interactive-widget::before`, `.tep-stage-label` 에 600 을, `.copy-button` 에 500 을 쓰고
있었고 전부 Wanted Sans 를 상속받았다. 헤드리스 Chrome 으로 글 페이지를 재니 프로덕션이
굵기 4종 49개 파일을 내려받고 있었다. 지금은 2종 31개다. 줄어든 18개가 236 KB 다.

**폰트 CSS 는 self-host 한다.** 업스트림(`cdn.jsdelivr.net`)의 CSS 는 굵기 7종 전부라
`@font-face` 644개다. `scripts/build-font-css.mjs`(`pnpm fonts:build`)가 400/700 만 남기고
폰트 URL 을 절대 경로로 바꿔 `public/fonts/wanted-sans.css` 를 만든다.

**CSS 바이트 절감은 크지 않다.** 양쪽 다 brotli 로 협상되기 때문이다. 실측은
업스트림 16,309 B 대 self-host 11,116 B 로 5,193 B 다. gzip 으로 재면 83,925 B 대
24,103 B 로 59,822 B 차이가 나지만 그 인코딩은 실제로 쓰이지 않는다.
**gzip 숫자를 이 변경의 근거로 쓰지 않는다.**

self-host 의 실제 이득은 바이트가 아니라 origin 이다. 첫 렌더를 막는 요청이 남의 origin 에
걸리지 않는다. 폰트 파일 자체는 그대로 jsdelivr 에서 받으므로 `preconnect` 는 남긴다.
그리고 이 변경의 큰 몫은 CSS 가 아니라 위의 폰트 파일 18개 236 KB 다.

`public/fonts/wanted-sans.css` 는 생성물이다. 직접 고치지 않는다. 업스트림 버전을 올릴 때
스크립트의 `VERSION` 을 바꾸고 다시 돌린다. 새 굵기가 필요하면 `KEPT_WEIGHTS` 를 먼저 늘린다.
늘리지 않고 CSS 에만 적으면 브라우저가 가장 가까운 굵기로 스냅하거나 합성한다.

**이 맥에는 Wanted Sans 가 설치돼 있다.** 그래서 폴백과 CLS 는 로컬 렌더로 측정할 수 없다.
다만 `@font-face` 의 `src` 가 `url()` 뿐이라 다운로드는 그대로 일어나므로, 어떤 굵기를
받는지는 CDP 의 `Network.responseReceived` 로 확인할 수 있다. 위 수치가 그렇게 나왔다.

## 라우팅에서 조심할 것

**잘못된 percent-escape 는 프록시에서 끊는다.** 디코딩할 수 없는 escape(`/posts/%E0`)가
들어오면 Next 의 URL 정규화가 URIError 를 던지고, 그 예외는 not-found 경로를 타지 않아
500 으로 나간다. Sentry 에도 안 남는다. `classifyLocaleRequest` 가 맨 앞에서 404 로 끊는다.
`src/proxy.test.mjs` 가 지킨다.

**404 는 파일 셋이 나눠 받고, 그중 하나는 프로덕션에서 아직 동작하지 않는다.**

| 파일 | 언제 |
|---|---|
| `src/app/global-not-found.tsx` | 매칭되지 않은 URL. `experimental.globalNotFound` 로 켠다 |
| `src/app/[lang]/not-found.tsx` | 로케일 트리 안에서 `notFound()` 가 던져졌을 때 |
| `src/app/not-found.tsx` | 그 밖의 세그먼트 |

본문은 `NotFoundScreen` 하나를 공유한다. 루트 레이아웃이 `[lang]` 이라는 최상위 동적
세그먼트라 `<html lang>` 과 `<title>` 을 낼 자리가 `global-not-found` 뿐이다.

**`[lang]/layout.tsx` 는 로케일이 아니어도 `notFound()` 를 부르지 않는다.** 이 레이아웃이
곧 루트 레이아웃이므로 여기서 빠져나가면 404 경계가 들어갈 자리 자체가 사라지고 Next 가
`<html id="__next_error__">` 한 겹을 내준다. 404 판정은 페이지가 한다. 레이아웃은 껍데기를
그릴 언어만 정한다. `generateMetadata` 도 `{}` 를 돌려주지 않는다. metadataBase 가 비면
파일 컨벤션의 opengraph-image 가 `http://localhost:3000` 에 대해 해석돼 그 URL 이
404 응답에 실린다.

**남은 문제.** 프록시 rewrite 를 탄 요청(접두사 없는 경로)의 404 는 프로덕션에서 여전히
본문이 빈다. 로케일 접두사가 있는 `/en/999999` 는 완전한 문서가 나가므로 갈리는 지점은
`NextResponse.rewrite` 다. 로컬 `next start` 는 양쪽 다 정상이라 재현되지 않는다.
상태 코드는 404 로 정상이고 JS 를 켜면 렌더되므로 영향은 JS 없는 크롤러에 한정된다.
위 세 파일을 추가하는 것으로는 해결되지 않았다. 다음에 손댄다면 Netlify 어댑터의
rewrite 와 notFound 조합부터 본다.

**OG 이미지 경로는 정규화하지 않는다.** OG 이미지는 파일 컨벤션이 만들고 Next 가 그 내부
경로를 메타태그에 쓴다. 홈(`[lang]/layout.tsx`)에서는 `openGraph.images` 를 줘도 덮이지
않았다(2026-09-19 에 시도해서 확인했다). 반면 글 페이지는 `localized-metadata.ts` 가
`images` 를 명시해 공개 URL 이 나간다. **우선순위가 모든 세그먼트에서 같지는 않으므로
일반 규칙으로 기억하지 않는다.** 실제로 어긋나는 것은 홈뿐이다.

한국어만 접두사가 없어 홈에서 `/ko/opengraph-image` 가 광고되는데, 그 URL 이 307 로 돌면
리다이렉트를 따르지 않는 소셜 unfurler 가 카드를 비운다. 그래서 `/ko/**/opengraph-image`
만 정규화에서 뺀다. 메타가 내부 접두사를 노출하는 것은 남지만, 200 으로 응답한다.

## 에러 모니터링 (Sentry)

Sentry 프로젝트: `hooninedev/jihoon-blog` (`@sentry/nextjs`)

### 서버 전용 구성이다

**브라우저 계측은 의도적으로 넣지 않았다.** `src/instrumentation-client.ts` 가 없다. 아래 번들 실측대로 클라이언트 SDK 가 client JS 를 79KB(gzip) 늘리는데, 이 블로그의 도입 목적은 서버에서 조용히 실패하는 경로를 잡는 것이고 그 부분은 사실상 공짜다.

따라서 잡히는 것과 안 잡히는 것이 갈린다.

- 잡힌다: 라우트 핸들러와 서버 컴포넌트에서 발생한 에러, `src/lib/og-font.ts` 의 폰트 해석 실패
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
| `src/lib/sentry-options.ts` | DSN 게이트, `tracesSampleRate`, release 와 environment 를 실제로 정하는 곳 |

### 환경변수

- 로컬: `.env` 의 `NEXT_PUBLIC_SENTRY_DSN`
- Netlify 대시보드에도 `NEXT_PUBLIC_SENTRY_DSN` 을 등록해야 한다. `.env*` 는 gitignore 대상이라 배포 환경엔 자동으로 넘어가지 않는다.
- 소스맵 업로드에는 `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` 가 필요하다. Netlify 대시보드에 등록되어 있다. 토큰이 없으면 업로드만 꺼지고 빌드는 통과한다. (`next.config.ts` 의 `sourcemaps.disable`)
- `SENTRY_ORG` 는 슬러그 기준이다. Sentry org 슬러그를 바꾸면 이 값도 같이 바꿔야 업로드가 동작한다. 현재 슬러그는 `hooninedev` 다.
- 토큰 스코프는 `project:releases` 다. 현재 쓰는 토큰은 `sntryu_` 로 시작하는 **user(개인) 토큰**이다. 동작은 하지만 계정 변경에 취약하므로 `sntrys_` organization 토큰으로 교체하는 편이 낫다.

### 소스맵

Turbopack 빌드도 업로드를 지원한다. `useRunAfterProductionCompileHook` 이 Turbopack 에서 기본 `true` 이고, 빌드 로그의 `Running next.config.js provided runAfterProductionCompile` 이 그 경로다. 서버 `.map` 은 Next 가 이미 130개 남짓 생성하므로 따로 켤 설정은 없다.

업로드 후 `.map` 을 지우는 이유는 용량이다. Turbopack 이 만드는 서버 소스맵이 57MB 로 서버 JS(15MB) 보다 큰데, 지우지 않으면 그게 전부 Netlify 함수 번들에 실린다. 업로드 후에는 필요 없다.

**토큰이 없으면 삭제도 같이 건너뛰어진다.** 삭제는 업로드에 딸려 있어서, `SENTRY_AUTH_TOKEN` 이 없는 환경에서는 `filesToDeleteAfterUpload` 가 빈 배열이 된다. CI 첫 실행에서 서버 소스맵 115개 148MB 가 그대로 남는 것으로 확인했다. CI 는 배포하지 않으므로 해가 없지만, 토큰 없이 배포하면 그 용량이 Netlify 함수 번들에 전부 실린다. 그래서 `pnpm audit:repo` 는 이 경우를 FAIL 이 아니라 WARN 으로 남긴다. 토큰이 있는데도 맵이 남아 있으면 그때가 FAIL 이다.

**여기서 `deleteSourcemapsAfterUpload: true` 는 쓰지 않는다.** 그 옵션은 `.next/static` 만 지우고 정작 용량을 차지하는 `.next/server` 는 남긴다. 실측으로 확인했다(업로드 직후에도 서버 `.map` 135개 / 57MB 잔존). 그래서 `filesToDeleteAfterUpload` 로 `.next/server/**/*.map` 과 `.next/static/**/*.map` 을 직접 지정한다.

`silent` 은 조건부다. 항상 켜두면 토큰 스코프 부족이나 만료로 업로드가 실패해도 조용히 넘어가서, 다음에 읽을 수 없는 스택 트레이스를 볼 때까지 알 수 없다. 업로드를 시도할 때만 로그를 남긴다.

**클라이언트 맵은 대상이 아니다.** 서버 전용 구성이라 브라우저 SDK 가 없다.

### 지난 GA 장애 (코드는 2026-09-19 에 삭제됐다)

이 블로그의 Sentry 도입 계기는 GA Data API 호출이 조용히 매달리는 것이었다.
`/api/analytics` 와 `src/lib/google-analytics.ts` 를 소비자가 없어 지웠으므로
아래는 더 이상 이 리포에 없는 코드의 기록이다. 판단의 근거로는 여전히 쓸모가 있다.

- `runReport` 의 라이브러리 기본 RPC 타임아웃이 60초다. CallOptions 를 넘기지 않으면
  GA 가 응답하지 않을 때 요청이 60초 넘게 매달리는데, fallback 때문에 응답은 200 이라
  조용히 통계만 빈다. 프로덕션에서 `Deadline exceeded after 65.877s` 로 관측됐다(JIHOON-BLOG-2).
  블랙홀 서버로 재현해 타임아웃 미지정 60.04초 / 5초 지정 5.00초를 실측했다.
- **5초 타임아웃이 그 실패를 다 막지는 못했다.** fix 가 배포된 릴리스에서 13일 뒤
  `Deadline exceeded after 338.655s` 가 다시 잡혔다(JIHOON-BLOG-8). CallOptions 는 정상적으로
  넘어가고 있었다. 338초가 Lambda 컨테이너 수명(344초)과 거의 겹치고 전 구간이 gRPC
  subchannel pick 이었다. **서버리스에서 함수가 freeze 된 동안 wall-clock 타이머가 발화하지
  못하고 thaw 후에야 만료된 것으로 보인다.** in-process 타이머로는 이 실패를 경계 지을 수 없다.
  다음에 서버리스에서 외부 RPC 를 붙일 때 같은 함정이 있다.
- **`unstable_cache` 가 실패 이벤트 수를 눌렀다.** 실패 결과도 한 시간 캐시되므로 트래픽이
  아무리 많아도 이벤트는 시간당 최대 1건이었다. 이벤트 건수를 영향 범위의 대리 지표로 쓰면
  체계적으로 과소평가한다. 알림 임계치를 건수로 잡지 않는 이유다.
- **fallback 을 돌려주는 경로는 라우트 핸들러의 catch 로 잡히지 않았다.** 조용히 실패하고
  응답이 200 인 함수는 그 함수 안에서 보고해야 한다. 검증 과정에서 드러난 사실이다.

JIHOON-BLOG-2 와 -8 은 90일 보존에서 밀려나 Sentry 로는 더 이상 조회되지 않는다.
이 문서가 유일한 기록이다.

### 검증 완료 상태 (2026-08-04)

Netlify 함수 런타임에서 실제 이벤트로 확인한 것들이다. Deploy Preview 에 임시 라우트를 올려 검증하고 머지하지 않고 닫는 방식을 썼다. 프로덕션 크레덴셜을 건드리지 않아도 된다.

- 서버 캡처: `captureException` 이 `flush()` 없이도 전송된다. 서버리스에서 응답 후 함수가 얼어 전송이 끊길까 걱정했지만 문제 없었다. `og-font.ts` 가 쓰는 경로가 이것이다.
- `onRequestError` 자동 훅: 핸들링하지 않은 라우트 에러도 잡힌다 (`mechanism: auto.function.nextjs.on_request_error`).
- 소스맵: 스택이 `src/...` 경로 + 줄번호 + 주변 소스 코드까지 해석된다. 적용 전에는 `y([root-of-the-server]__468aa3ae._)` 였다.
- 이벤트 지연: throw 경로 이벤트가 약 2분 늦게 도착한 적이 있다. 즉시 조회해서 없다고 누락으로 판단하면 안 된다.

### 동작 조건과 정책

- DSN 이 있고 `NODE_ENV === 'production'` 일 때만 전송한다. 개발 중 발생하는 에러는 무료 티어 쿼터만 태우므로 보내지 않는다.
- `tracesSampleRate` 는 0.1. Core Web Vitals 는 기존대로 `WebVitalsReporter` 가 GA4 로 보내고, Sentry 는 에러와 낮은 샘플링 트레이싱만 담당한다.
- **Session Replay 는 쓰지 않는다.** 블로그는 로딩 성능이 곧 SEO 라서 비용이 이득보다 크다. `next.config.ts` 의 `bundleSizeOptimizations` 로 관련 코드를 번들에서 제거한다.
- **명시적 보고 지점은 `src/lib/og-font.ts` 하나다.** OG 이미지의 폰트 CSS 를 파싱해 굵기를 하나도 얻지 못하면 satori 가 `No fonts are loaded` 로 던지고, 스트림이 이미 시작된 뒤라 응답이 상태 코드도 없이 끊긴다(실측: curl 이 `000`). 소셜 unfurler 는 카드 이미지를 못 받는다. 모듈 수준 캐시라 한 번 빈 값이 잡히면 그 컨테이너가 사는 동안 유지되므로, 빈 결과는 캐시하지 않고 보고한다. 나머지는 `onRequestError` 자동 훅이 받는다.

- **Deploy Preview 도 `NODE_ENV === 'production'` 이라 게이트를 통과한다.** 그래서 `sentry-options.ts` 가 `SENTRY_ENVIRONMENT` 가 없으면 Netlify 의 `CONTEXT`(`production` / `deploy-preview` / `branch-deploy`)를 환경 이름으로 쓴다. 이게 없으면 프리뷰 트래픽이 프로덕션 이슈에 섞여서 알림을 걸 때 걸러낼 방법이 없다.

### 번들 비용 실측 (2026-08-04)

`.next/static/chunks/*.js` 의 gzip 총합을 clean build 기준으로 비교했다.

| 구성 | client JS (gzip) | 증가분 |
|---|---|---|
| Sentry 미적용 | 181.6 KB | 기준 |
| **현재 구성 (서버 전용)** | **182.3 KB** | **+0.7 KB** |
| 서버 전용 + global-error 에서 `captureException` 호출 | 186.0 KB | +4.4 KB |
| 클라이언트 + 서버 | 260.4 KB | +78.8 KB |

위 표는 Next 16.1.4 기준이다. **2026-09-19 재측정은 207.6 KB 다.** 기준선보다 26.0 KB 크다.
Sentry 구성은 그대로 서버 전용이고 `src/instrumentation-client.ts` 는 여전히 없으므로, 이 증가분은 Sentry 때문이 아니다.
현재 예산은 `scripts/audit.mjs` 의 `BUDGET.clientJsGzipKb` 에 215 KB 로 박혀 있다. `pnpm audit:repo` 가 매번 확인한다.

**증가분의 원인 후보 중 하나는 측정으로 배제됐다.** GA4 소프트 내비게이션 리포터(`cc21a0d`)의
`pnpm-lock.yaml` diff 는 web-vitals 5.2.0 → 6.2.1 한 줄이고, 두 dist 의 gzip 차이는 935B 다.
게다가 web-vitals 는 `import('web-vitals')` 로 지연 로드돼 first load 에 들어가지도 않는다.
남은 것은 Next 16.1.4 → 16.3.4 업그레이드(`49ea2e0`)와, 기준선 이후 새로 생긴 클라이언트 컴포넌트
셋(`GlossaryTerms` 08-27, `LanguageSelector` 08-17, `AiReferralReporter` 08-18)이 나눠 가진다.
그 안의 비율은 각 커밋에서 다시 빌드하기 전에는 모른다.

**예산이 세는 숫자에는 모던 브라우저가 받지 않는 것이 섞여 있다.** 15개 청크 합계 중
`noModule` 폴리필이 38.6 KiB 다. 홈 HTML 이 `<script ... noModule="">` 로 싣는다.
모던 브라우저 기준 실제 first load 는 홈 152.2 KiB, 글 페이지 159.4 KiB(Utterances 7.1 KiB 추가)다.
예산은 상한을 보는 용도라 전부 세는 지금 방식을 그대로 두지만, 이 숫자를 사용자 체감으로 읽지는 않는다.

`bundleSizeOptimizations.excludeTracing: true` 도 시도했지만 260.4 KB 로 변화가 없었다. 클라이언트 비용을 줄이는 유일한 방법은 `src/instrumentation-client.ts` 를 두지 않는 것이다.

3번째 행이 있는 이유: 브라우저 Sentry 클라이언트가 없으면 `global-error.tsx` 의 `captureException` 은 no-op 인데 SDK 코드는 번들에 실린다. 그래서 호출을 뺐다.

### 로컬 검증 방법

개발 모드에서는 전송이 꺼져 있으므로 프로덕션 모드로 확인한다. 실패를 주입할 지점은
`src/lib/og-font.ts` 다. `OG_FONT_CSS_URL` 로 폰트 CSS 출처를 바꿀 수 있고, `@font-face` 가
없는 200 응답을 가리키면 「굵기를 하나도 얻지 못하는」 경로가 그대로 재현된다.
이 환경변수는 이 검증만을 위해 있다.

```bash
pnpm build
PORT=3111 SENTRY_ENVIRONMENT=local \
  OG_FONT_CSS_URL=http://localhost:3111/robots.txt \
  pnpm start
curl -o /dev/null -w '%{http_code}\n' http://localhost:3111/260723/opengraph-image
```

응답 코드가 `000` 으로 나오면 재현된 것이다. 폰트가 0개면 satori 가
`No fonts are loaded` 로 던지는데, 스트림이 이미 시작된 뒤라 상태 코드조차 실리지 않는다.
서버 로그에도 `failed to pipe response` 와 그 cause 가 찍힌다. 같은 서버에서 `/` 는 200 이므로
이 경로만 깨진 것을 구분할 수 있다.

`SENTRY_ENVIRONMENT=local` 을 빼면 이벤트가 `production` 으로 찍힌다. 로컬에는 Netlify 의
`CONTEXT` 도 없어서 `sentry-options.ts` 가 환경 값을 넘기지 않기 때문이다. 2026-09-16 에
옛 절차로 만든 JIHOON-BLOG-B 가 그렇게 프로덕션 이슈에 섞였다.

**쿼터를 태우지 않으려면 DSN 없이 돌린다.** 위 절차는 코드 경로가 도는 것까지만 확인하면
충분하다. 실제 전송까지 보고 싶을 때만 DSN 을 주고, 끝나면 만들어진 이슈를 resolve 한다.

## 손으로 쓴 CSS 는 새 파일에 둔다

`src/app/globals.css` 끝에 붙인 규칙이 배포에서 사라진 적이 있다(2026-09-20, `aae52ab`).
`@layer base` 커서 규칙과 `@keyframes qa-*` 가 프로덕션 CSS 에 하나도 없었다.

**같은 빌드의 나머지는 멀쩡했다.** HTML 은 그 커밋이 맞았고, 새 컴포넌트에서 생성된
유틸리티(`backdrop-filter`, `origin-top-right`, `shadow-2xl`)도 들어왔고, 같은 파일의
**기존** 수제 규칙(`.home-meta`, `.utterances-wrapper`)도 남아 있었다. 새로 쓴 꼬리만
없었다. 중괄호는 맞았고 lockfile 은 양쪽 다 tailwind 4.1.18 이며 로컬 clean build 에는
그 규칙들이 있었다. 그 파일의 컴파일 결과가 캐시에서 온 것으로 본다.

고친 방법은 경로를 바꾸는 것이다. `src/styles/interactions.css` 로 옮겨 `prose.css` 옆에서
`@import` 했다. 빌드가 한 번도 본 적 없는 경로는 낡은 항목을 가질 수 없다. 다음 배포에서
CSS 해시가 `3gcul2laa-bvp` 에서 `27hlba6q1xl7s` 로 바뀌며 실렸다.

**그래서 새 수제 CSS 는 `globals.css` 꼬리가 아니라 `src/styles/` 의 파일에 쓴다.**
그리고 배포 확인은 페이지가 아니라 배포된 CSS 파일을 직접 본다.

```bash
curl -s "https://hooninedev.com$(curl -s https://hooninedev.com/ \
  | grep -oE '/_next/static/[^"]+\.css' | head -1)" | grep -c qa-fade-in
```

**유틸리티 클래스는 이 사고에서 살아남았다.** 그래서 커서처럼 눈에 띄는 것은
base 레이어와 컴포넌트의 `cursor-pointer` 양쪽에 둔다.

## 방문자 수 (Netlify Blobs)

홈 상단에 `오늘 N · 전체 N` 을 둔다. 조각은 다섯이다.

| 조각 | 위치 |
|---|---|
| CAS 로직 | `src/lib/visit-counter.ts` (+ `visit-counter.test.mjs` 9개) |
| 라우트 | `src/app/api/visits/route.ts` (`GET` 읽기 / `POST` 증가) |
| 요청 | `src/lib/visits-client.ts` |
| 증가 (홈 외 모든 경로) | `src/components/VisitPing.tsx`, 루트 레이아웃에 있다 |
| 증가 + 표시 (홈) | `src/components/VisitCounter.tsx` |

**세는 범위는 사이트 전체다.** 처음에는 `VisitCounter` 가 홈에만 있어서 홈을 거친
방문만 세었다. 검색 유입은 대부분 글 URL 로 바로 들어오므로 그 숫자는 실제의 일부였다.
지금은 렌더가 없는 `VisitPing` 이 루트 레이아웃(`src/app/[lang]/layout.tsx`)에 있어
글, 목록, 소개 어디로 들어와도 센다.

**단위는 페이지 접근이다.** 처음에는 `sessionStorage` 로 한 세션에 한 번만 올렸다.
그러면 같은 사람이 글 다섯 개를 봐도 1 이라 세션 수가 된다. 화면에 두려던 숫자는
접근의 총합이므로 게이트를 걷어냈다. GA4 의 `page_view` 와 같은 단위라 과거 수치를
이어 붙일 수도 있다.

**`usePathname()` 변화마다 센다.** 글 사이 이동이 client-side navigation 이라
문서 로드만 세면 링크를 타고 읽어 나가는 방문이 한 번으로 줄어든다.

**홈에서는 `VisitPing` 이 비켜선다.** 홈에는 두 컴포넌트가 같이 마운트되므로 둘 다
올리면 한 접근이 둘로 세어진다. 한쪽을 `GET` 으로 돌리면 증가가 반영되기 전 값을
읽는 경쟁이 생기므로, 홈의 증가는 `VisitCounter` 가 맡고 `VisitPing` 은 경로가 홈이면
아무것도 하지 않는다.

**GA Data API 로 읽지 않는다.** 그 경로는 `c36577a` 에서 지웠고, 지우기 전에 서버리스에서
응답 없이 매달리는 실패를 두 번 냈다(JIHOON-BLOG-2, -8). -8 은 미해결이고 원인 가설이
함수 freeze 라서 in-process 타이머로 경계 지을 수 없다. 같은 모양을 다시 들이지 않는다.

**서버 컴포넌트로 세지 않는다.** 페이지 HTML 은 Netlify 의 durable 캐시에 실려서 렌더가
방문마다 돌지 않는다. 서버에서 세면 캐시가 사는 동안 숫자가 멈춘 채로 모두에게 같은 값이
나간다. 그래서 브라우저가 부른다. 부수 효과로 JS 를 안 돌리는 크롤러는 세어지지 않는다.

**증가는 `POST` 다.** `GET` 에 두면 링크 프리페치나 프리뷰 봇의 조회 한 번이 그대로
방문 한 번이 된다. 한 세션에 한 번만 올리는 것은 `sessionStorage` 가 판단한다.

**Blobs 에는 원자적 증가가 없다.** 조건부 쓰기(`onlyIfMatch` / `onlyIfNew`)로
compare-and-swap 을 만들고 세 번까지 재시도한다. 세 번 다 지면 조용히 성공하지 않고 던진다.
오늘과 전체를 키 두 개로 나누지 않고 레코드 하나(`{ total, today, day }`)에 담는다.
나누면 둘 중 하나만 쓰인 상태가 생긴다. 날짜는 Asia/Seoul 기준이고, 자정 초기화 크론은
없다. 읽는 쪽이 `day` 를 비교해 어제 레코드의 `today` 를 0 으로 본다.

**실패는 200 이 아니라 503 이다.** 0 을 실어 보내면 「고장」과 「아직 아무도 안 왔다」가
화면에서 같아진다. 보고는 컨테이너당 한 번만 한다. Blobs 가 죽으면 방문 수만큼 이벤트가
생겨 무료 티어 쿼터를 태운다.

**실패해도 마크업은 비우지 않는다.** 전에는 응답이 없으면 줄을 통째로 안 그렸는데, 그러면
그만큼 아래 본문이 위로 올라온다. 실측 CLS 가 0.019 였고 시프트의 출처는 그 아래 `section`
이었다. 지금은 `visibility` 로만 감춘다. 높이는 59.5px 로 양쪽이 같다.

**라벨은 응답을 기다리지 않는다.** 「오늘」과 「전체」는 서버 렌더에 이미 들어 있고 숫자
자리만 비어 있다. 자리는 `min-w-[3ch]` 와 `tabular-nums` 로 미리 잡는다. 헤드리스 Chrome
실측으로 두 자리와 세 자리에서 CLS 가 0 이고, 네 자리에서 0.0005 다. 그 값은 같은 줄의 뒤
텍스트가 밀린 것이고 아래 본문은 움직이지 않는다. 이 `<p>` 가 `text-align: start` 라서다.
`total` 이 1000 을 넘을 때 자리를 한 칸 늘리면 다시 0 이 된다.

**로컬에서 화면을 보려면 `VISITS_MEMORY_STORE=1` 을 준다.** Blobs 환경변수가 없으면
`getStore` 가 던지는데, `next start` 는 `NODE_ENV` 가 production 이라 개발 폴백에 걸리지
않는다. `og-font.ts` 의 `OG_FONT_CSS_URL` 과 같은 자리에 있는 검증용 스위치다.

```bash
pnpm build && PORT=3211 VISITS_MEMORY_STORE=1 pnpm start
curl -X POST http://localhost:3211/api/visits   # {"total":1,"today":1}
```

## 검색엔진 통보 (IndexNow)

바뀐 글 URL 을 IndexNow 로 직접 알린다. **Google 은 이 프로토콜을 쓰지 않는다.** 받는 쪽은 Bing, Yandex, 그리고 Ahrefs Site Audit 이 AI Discoverability 로 묶는 크롤러들이다. 그래서 GSC 지표가 이것 때문에 움직이지는 않는다.

| 조각 | 위치 |
|---|---|
| 키 파일 | `public/3176e9bf8c16a1051a52edd5ce330de5.txt` |
| 제출 스크립트 | `scripts/submit-indexnow.mjs` (`pnpm indexnow`) |
| 자동 실행 | `.github/workflows/indexnow.yml` |

**키는 비밀이 아니다.** 같은 호스트에 공개 서빙되는 것이 프로토콜의 소유 검증 방식이라 리포에 그대로 둔다. GitHub Secret 이나 환경변수가 필요 없다.

제출 범위는 바뀐 글로 한정한다. 안 바뀐 URL 을 배포마다 다시 밀어 넣는 것은 프로토콜이 권하지 않는다. 그래서 push 트리거는 그 푸시의 `content/*/index*.md` diff 만 보내고, 수동 실행은 공개된 글 전체를 보낸다.

**카테고리 페이지는 어느 쪽으로도 제출되지 않는다.** `--all` 이 도는 대상은 글 URL 뿐이다. 카테고리는 글에서 파생되는 목록이고 절반 가까이가 글 1개짜리라 `noindex` 인데, 색인 대상만 골라내는 필터가 틀리면 noindex URL 을 알리게 된다. 그 경로를 닫아 두는 편이 낫다고 판단했다. 그래서 `src/i18n/dictionaries.ts` 의 카테고리 description 을 고쳐도 IndexNow 로는 알리지 않는다.

`draft` 와 `ignore` 글은 보내지 않는다. noindex URL 을 알리는 것이 이 기능이 해를 끼칠 수 있는 유일한 경로다.

**배포보다 먼저 보내면 크롤러가 옛 문서를 본다.** 워크플로가 배포를 기다리는 신호는 `x-nextjs-date` 응답 헤더다. (2026-09-19 실측에서 이 값은 durable 캐시 적중 응답에서도 요청 시각으로 다시 찍혔다. 렌더 시각이 아니라 응답 시각에 가깝다. 배포가 캐시를 비우므로 신호로는 여전히 동작한다) Netlify 의 durable 캐시는 쿼리스트링으로도 `Cache-Control: no-cache` 로도 뚫리지 않지만(실측: `age` 가 그대로 유지됨), 배포가 캐시를 비우므로 헤더 값이 바뀌는 것으로 감지할 수 있다. 15분 안에 신호를 못 보면 그냥 보낸다. 몇 분 이르게 알려도 크롤러는 나중에 다시 오므로 고정 대기보다 나쁠 것이 없다.

드라이런이 기본값이다. `--submit` 을 붙여야 실제로 전송한다.

```bash
pnpm indexnow content/260723/index.md content/260723/index.ja.md   # 미리보기
pnpm indexnow --all                                                 # 공개 글 전체 미리보기
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
