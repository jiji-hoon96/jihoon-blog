---
emoji: 🔎
title: "Code intelligence의 네 계층"
seoTitle: "AI 코딩 에이전트의 코드 탐색 비용: Repomix, Aider, CodeGraph, Serena 비교"
date: "2026-05-26"
updatedAt: "2026-10-08"
categories: AI 개발도구 Claude MCP CodeGraph
description: "AI 코딩 에이전트의 코드 탐색 비용을 줄이는 도구를 네 계층으로 비교한다. Repomix의 context packing, Aider의 tree-sitter repo map, CodeGraph 지식 그래프, Serena 같은 LSP 기반 도구가 코드를 얼마나 이해하는지 본다."
keywords: "code intelligence, CodeGraph, Serena MCP, tree-sitter, LSP, Repomix, Aider repo map, AI 코딩 에이전트 토큰 절약"
---

이번 포스팅에서는 **AI 코딩 에이전트가 관련 코드를 찾는 비용을 줄이는 도구들이 서로 무엇이 다른지**에 대한 이야기를 해보려고 한다.

큰 코드베이스에서 에이전트가 grep과 파일 읽기를 되풀이하며 토큰을 쓰는 것을 보고, Repomix나 CodeGraph, Serena 같은 도구 중 무엇을 붙여야 할지 고민하는 개발자를 위한 글이다. 끝까지 읽으면 이 도구들이 코드를 얼마나 깊이 이해하는지에 따라 어떻게 갈리는지, 그리고 각 방식이 탐색 비용을 어디서 줄이는지 구분할 수 있다. 이해의 깊이는 넷으로 나뉜다. 코드를 텍스트로 통째로 넣는 context packing, 심볼이 있다는 것까지 아는 tree-sitter repo map, 심볼 관계를 미리 저장해 두는 지식 그래프, 그 심볼이 무엇인지까지 아는 LSP다. 지식 그래프를 뺀 세 계층은 이 블로그 리포의 `src/` 로 직접 잰 결과를, 지식 그래프는 제작사의 벤치마크를 함께 싣는다.

`codegraph`가 GitHub Trending에 오른 걸 보고 따라 설치해 본 뒤로, 필자는 새 도구를 볼 때마다 그것이 어떤 원리로 토큰을 아끼는지가 궁금했다. 이 글에 나오는 도구 상당수도 필자가 보통 weekly 기준으로 TypeScript와 Python을 골라 훑는 GitHub Trending에서 처음 알게 됐다.


## Code intelligence 도구

에이전트는 코드를 고치기 전에 관련 코드가 어디 있는지부터 찾는다. grep으로 찾고, 파일을 읽고, 걸러내고, 다시 grep 하는 루프다. 뒤에서 볼 CodeGraph 벤치마크에서 도구 없이 답한 쪽은 질문 하나에 tool call을 최대 43번 썼다. Code intelligence 도구는 이 탐색 비용을 줄이려는 시도들이다.

다만 비용이라는 말이 가리키는 것이 하나가 아니다. 모델이 처리한 토큰, tool call 횟수, 그리고 작업이 끝난 뒤에도 context window에 남아 있는 토큰은 따로 움직인다. 이 글은 계층마다 이 셋 중 무엇을 줄이는지를 본다.

필자는 이 시도들을 아래 네 개의 계층(tier)으로 나눠 본다. 업계에 정해진 분류가 아니라, 도구가 코드를 얼마나 깊이 이해하는지를 기준으로 필자가 정리한 구분이다. 필자가 직접 잰 값은 전부 이 리포의 커밋 `36e5cfa` 에서 2026-10-08 에 얻었고, 토큰은 tiktoken의 `o200k_base` 로 셌다. Claude의 tokenizer와는 값이 다르므로 절대값보다 비교에 쓴다.


### Context packing

가장 단순한 해법은 "**전부 다 한 context window에 넣어버리자**"는 발상이다. 그래프도 안 만들고, 인덱싱도 안 한다. 그냥 레포 전체를 텍스트 덩어리로 직렬화해서 모델에게 통째로 던진다.

대표 도구가 **Repomix**다. 기본 출력 형식이 XML이고, README는 Anthropic의 XML 태그 문서를 함께 링크한다. CLI, 웹, 브라우저 확장, MCP 서버를 다 갖췄다.

**GitIngest**는 마찰 제로 사용성으로 유명하다. GitHub URL에서 `github.com`을 `gitingest.com`으로 한 단어만 바꾸면, 해당 레포 전체가 한 텍스트 페이지로 변환된다. (예: `github.com/facebook/react` → `gitingest.com/facebook/react`.) 브라우저 주소창에서 단어 하나 바꾸는 게 전부라서 별도 설치도 필요 없다. 1회성 빠른 탐색에 특화되어 있다.

**code2prompt**(Mufeed VH 제작)는 Rust 기반 CLI로, 템플릿 시스템을 통한 커스터마이징에 강점이 있다.

**rtk**(`rtk-ai/rtk`)는 방향이 조금 다르다. 위 도구들이 레포 전체를 한 번에 패킹한다면, rtk는 에이전트가 실행한 CLI 명령의 출력을 압축한다. Rust로 만든 단일 바이너리이고, Claude Code, Cursor, Copilot, Gemini CLI, Codex 등 여러 에이전트의 hook에 등록되어 에이전트가 `git status`를 호출하면 `rtk git status`로 바꿔 실행한다. 100개 이상의 명령에 filtering, grouping, truncation, deduplication을 적용한다. 이 hook은 Bash tool call에만 걸린다. Claude Code의 `Read`, `Grep`, `Glob` 은 그대로 지나간다.

줄어드는 양은 조심해서 읽어야 한다. [rtk README](https://github.com/rtk-ai/rtk/blob/8533612180c60efbcb5827c7db4e910aba096705/README.md#L66-L70)는 Bash 출력을 최대 90% 줄인다고 쓰면서, 그것이 청구액을 90% 줄인다는 뜻은 아니라고 바로 덧붙인다. 명령 출력은 모델 입장에서 입력 토큰의 일부이고, 입력 토큰은 청구액의 일부라서 단계마다 희석된다. [공식 사이트](https://www.rtk-ai.app/)가 내세우는 숫자는 rtk가 바꿔 실행한 명령 기준 평균 56%다. 위 도구들이 들어가는 텍스트를 줄인다면, rtk는 tool call 결과로 돌아오는 텍스트를 줄인다.

이 계층의 한계는 **대형 레포가 토큰 한도에 걸린다**는 것이다. 이 블로그의 `src/` 파일 109개만 패킹해도 94,596 tokens다. Repomix는 이 문제에 `--compress` 로 답한다. [README](https://github.com/yamadashy/repomix/blob/8d6429121e98ed178e4d3a975c2bdbbecc958c4a/README.md#L797-L831)에 따르면 Tree-sitter로 함수와 클래스 시그니처를 남기고 구현 본문을 버린다.

```bash
# repomix 1.18.1, 이 리포 커밋 36e5cfa, 2026-10-08
npx -y repomix@1.18.1 src -o out.xml              # Total Tokens: 94,596 tokens
npx -y repomix@1.18.1 src --compress -o out.xml   # Total Tokens: 30,320 tokens
```

68%가 줄었다. 주석은 그대로 남기 때문에, JSDoc이 긴 `visit-counter.ts` 는 1,642에서 약 1,220 tokens로 26%만 줄었다. 압축본에 남는 것은 파일마다의 구문이고, 누가 누구를 부르는지 같은 관계는 없다. 그래서 이 계층과 다음 계층의 경계는 구문을 보느냐보다 관계를 물을 수 있느냐에 있다.


### tree-sitter repo map

다음 계층은 **tree-sitter**를 활용해 코드의 구조를 분석하되, 별도의 인덱스 서버를 띄우진 않는 방식이다.

**AST(Abstract Syntax Tree, 추상 구문 트리)** 는 소스 코드의 구조를 트리로 표현한 자료구조다. 컴파일러의 구문 분석 결과물로, 괄호나 세미콜론 같은 표면 정보는 버리고 변수, 연산자, 함수 호출 같은 요소만 노드로 남긴다. 그런데 이 계층의 도구들이 쓰는 tree-sitter가 만드는 것은 **CST(Concrete Syntax Tree)** 다. [tree-sitter 공식 문서](https://tree-sitter.github.io/tree-sitter/)도 concrete syntax tree를 만든다고 쓴다. 괄호와 구두점까지 노드로 남긴 트리이고, 아래 도구들이 다루는 것도 이 트리다.

**tree-sitter**는 오픈소스 파서 생성기이자 증분(incremental) 파싱 라이브러리다. [GitHub의 code navigation](https://docs.github.com/en/repositories/working-with-files/using-files/navigating-code-on-github)이 tree-sitter를 쓴다. 편집된 부분만 다시 파싱하므로, 에디터에서 한 줄을 고쳐도 파일 전체를 다시 파싱하지 않고 바뀐 트리만 고친다. 이 이점은 편집이 계속 일어나는 에디터의 것이다. 아래의 Aider는 파일 수정 시각으로 캐시를 두어 바뀌지 않은 파일을 다시 파싱하지 않는다.

터미널에서 쓰는 AI 페어 프로그래밍 도구 **Aider**가 이 접근의 대표 사례다. tree-sitter로 파일마다 함수, 클래스, 메서드 정의와 참조를 뽑고, 파일을 노드로 하는 그래프를 만든다. A 파일이 B 파일에 정의된 식별자를 참조하면 A에서 B로 엣지가 생긴다. 이 그래프에 personalized PageRank(링크의 수와 무게로 노드 중요도를 매기되, 지정한 노드 쪽으로 점수를 기울이는 변형)를 돌려, 순위가 높은 파일의 정의와 시그니처를 토큰 예산만큼 넣는다.

무엇이 예산 안에 들어갈지는 지금의 대화에 따라 바뀐다. Aider의 [`repomap.py`](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/aider/repomap.py#L487-L525)에서 엣지 가중치는 참조 횟수의 제곱근에 배수를 곱한 값이다. 대화에 나온 식별자는 10배, 8자 이상인 camelCase나 snake_case 식별자도 10배, `_` 로 시작하는 식별자는 0.1배, 지금 채팅에 올린 파일에서 나가는 엣지는 50배다. 채팅에 올린 파일과 대화에서 언급한 파일은 PageRank의 personalization 점수도 받는다.

예산도 고정값이 아니다. [Aider 문서](https://aider.chat/docs/repomap.html)는 `--map-tokens` 기본값을 1k로 적지만, [코드](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/aider/models.py#L782-L789)는 모델 입력 한도의 1/8을 1,024에서 4,096 사이로 자른다. 그리고 채팅에 파일이 없으면 `--map-multiplier-no-files`(기본 2)배까지 키운다. 이 리포의 `src/` 로 확인했다. 실행한 0.86.1과 위에 링크한 커밋은 랭킹 코드가 같다.

```bash
# aider-chat 0.86.1, 리포 루트에서 시작한다, 2026-10-08
mkdir /tmp/aidermap && cp -R src /tmp/aidermap/ && cd /tmp/aidermap && git init -q && git add -A && git commit -qm init
# 키는 더미 값이다. --show-repo-map 은 map 만 출력하고 LLM 을 부르지 않는다
export OPENAI_API_KEY=dummy
AIDER="uvx --python 3.12 --from aider-chat==0.86.1 aider --no-check-update --analytics-disable --no-gitignore --model gpt-4o"
$AIDER --show-repo-map                                              # Repo-map: using 4096 tokens
$AIDER --map-tokens 1024 --show-repo-map                            # Repo-map: using 1024 tokens
$AIDER --map-tokens 1024 --show-repo-map src/lib/filter-posts.ts    # 이 파일을 채팅에 올린 상태
```

| 조건 | Aider가 잡은 예산 | 출력된 map | 들어간 파일 |
|---|---|---|---|
| 기본값, 채팅에 파일 없음 | 4,096 | 7,370 tokens | 61개 |
| `--map-tokens 1024`, 채팅에 파일 없음 | 1,024 | 2,019 tokens | 27개 |
| `--map-tokens 1024`, `filter-posts.ts` 를 채팅에 올림 | 1,024 | 983 tokens | 12개 |

gpt-4o의 입력 한도는 128k라서 1/8이 4,096으로 잘렸고, 채팅이 비어 있으니 그 두 배 안에서 map이 나왔다. 파일 하나를 채팅에 올리자 map은 예산 안으로 줄었고, 앞의 27개 중 10개만 남은 자리에 `PostList.tsx` 와 `SearchModal.tsx` 가 새로 들어왔다. repo map은 레포의 고정된 요약이 아니라 그 순간의 대화에 맞춘 발췌다.

**AFT**(`cortexkit/aft`)는 읽기와 편집을 심볼 단위로 한다. 라인 번호 기반 편집은 대상 위의 코드가 움직이는 순간 깨지지만, AFT의 심볼 모드 편집은 함수를 이름으로 주소 지정하기 때문에 그 영향을 받지 않는다.

같은 계층에서 짚을 만한 도구가 하나 더 있다. **ast-grep**(`ast-grep/ast-grep`)이다. tree-sitter 기반 구조 검색과 rewrite를 하는 CLI인데, 텍스트가 아니라 구문 트리의 노드를 매칭한다. 예를 들어 `console.log($A)` 패턴은 줄바꿈이나 공백이 어떻게 생겼든 인자 하나로 `console.log` 를 부르는 호출을 모두 잡는다. 잡는 것은 같은 구문 구조다. `$A` 의 타입이나 `console` 이 어디서 온 이름인지는 모른다. `ast-grep-mcp` 서버도 있어서 에이전트가 텍스트 grep 대신 구조 검색을 쓰게 만들 수 있다.


### Knowledge Graph

세 번째 계층은 한 발 더 나아간다. **사전에 코드베이스 전체를 파싱해서 지식 그래프를 만들어 디스크에 저장**해두고, 에이전트는 저장해둔 그래프에 쿼리를 던지는 방식이다. 가장 화제가 되는 사례가 **CodeGraph** 라는 도구이다.

[CodeGraph README](https://github.com/colbymchenry/codegraph/blob/b635dd467f0578926a9c01a37b9d28d2b26689f1/README.md)가 설명하는 구조는 단순하다. tree-sitter로 코드를 파싱해 심볼, 엣지, 파일 정보를 뽑고, 이것을 로컬 SQLite 데이터베이스에 저장한다. 이름 검색은 SQLite의 FTS5 인덱스로 한다. 에이전트는 MCP를 통해 이 그래프에 묻는다. 그리고 **이 추출은 LLM 요약이 아니라 구문 트리 파싱에서 결정론적으로 일어난다.**

여기 등장하는 **FTS5(SQLite Full-Text Search 5)** 는 SQLite의 가상 테이블 형태로 제공되는 전문 검색 확장이다. [SQLite 문서](https://www.sqlite.org/fts5.html)에 따르면 3.9.0(2015-10-14)부터 amalgamation에 포함됐고, `CREATE VIRTUAL TABLE ... USING fts5(...)` 로 테이블을 만들어 `MATCH` 연산자로 질의한다. Elasticsearch 같은 별도 검색 엔진을 띄우지 않고도 SQLite 파일 하나로 전문 검색 인덱스를 둘 수 있다.

방금 쓴 **결정론적(deterministic)** 이라는 말은 같은 코드를 넣으면 언제나 같은 결과가 나온다는 뜻이다. LLM이 코드를 요약해서 그래프를 만들면 같은 코드에서도 결과가 달라질 수 있고 환각이 섞일 위험이 있다. 반면 구문 트리를 직접 파싱하면 언어 문법이 정한 규칙대로만 심볼 관계를 뽑으므로 그런 해석이 끼어들 틈이 없다.

다만 결정론적인 것과 빠짐없는 것은 다르다. 같은 README는 관례와 reflection에 기대는 프레임워크의 route 인식률을 Spring 83.3%, ASP.NET 83.9%로 적고, 이를 정적 분석의 한계(honest static-analysis ceiling)라고 부른다. 같은 코드에서 같은 결과가 나오지만, 그 결과에서 빠진 엣지가 있을 수 있다.

벤치마크는 CodeGraph가 직접 잰 것이다. 같은 README의 2026-08-05 재측정은 Claude Opus 4.8을 headless로 돌려 7개 오픈소스 레포에 아키텍처 질문을 하나씩 던졌다. CodeGraph MCP를 켠 쪽이 평균 비용 44%, 처리 토큰 62%, tool call 88%를 줄였다. 이 재측정은 양쪽 모두 Bash로 `codegraph` CLI를 부르지 못하게 막았다. 막지 않은 harness에서는 도구 없는 쪽이 28회 중 26회 CLI를 찾아 썼고, README는 이전에 발표한 수치가 이 차단 없이 나왔다고 밝힌다. 이 글이 처음에 옮겼던 Opus 4.7 수치(35% 저렴, tool call 71% 감소)가 그 이전 수치다.

절감 폭은 레포 크기를 따르지 않았다. 도구 없는 쪽이 tool call을 28~43번 쓴 질문에서는 비용이 57~78% 줄었고, 7번으로 끝난 Gin에서는 거의 같았다. 파일이 약 11k개인 VS Code가 71%, 약 640개인 Excalidraw가 78%였다. 질문에 탐색이 많이 필요할수록 이득이 컸다.

README는 반대 방향의 숫자도 적는다. 처리한 토큰은 줄지만, 여러 턴짜리 세션이 끝났을 때 context window에 남아 있는 retrieval 결과는 CodeGraph 쪽이 약 80% 많다. VS Code에서 67k 대 18k tokens다. 한 번에 원문을 촘촘히 돌려주고 그것이 창에 그대로 남기 때문이다. 이 계층은 tool call과 처리 토큰을 줄이는 대신 창에 남는 양을 늘린다.

학계에도 같은 방향의 연구가 있다. [GraphCoder](https://arxiv.org/abs/2406.07003)(ASE 2024)는 control flow와 data/control dependence를 합친 Code Context Graph를 만들었고, [CodexGraph](https://aclanthology.org/2025.naacl-long.7/)(NAACL 2025)는 LLM 에이전트가 그래프 데이터베이스 쿼리를 직접 작성해 실행하게 했다. 동료 심사를 거치지 않은 preprint인 [Prometheus](https://arxiv.org/abs/2507.19942)는 tree-sitter 기반 지식 그래프에 working memory를 붙여 여러 언어의 이슈 해결에 적용했다.

**Cursor**는 다른 길로 갔다가 방향을 바꿨다. [2026년 1월 Cursor 블로그](https://cursor.com/blog/secure-codebase-indexing)가 설명한 인덱싱은 구문 그래프가 아니라 **벡터 임베딩 기반 의미 검색**이었다. 로컬에서 파일을 chunk로 나누고, Merkle tree 해시로 서버와 동기화하고, 임베딩을 Turbopuffer라는 벡터 DB에 저장했다. 2026년 7월 Cursor의 Community Support Engineer는 [포럼](https://forum.cursor.com/t/what-do-you-think-about-cursor-removing-the-codebase-indexing-settings/165899)에서 "Semantic/embeddings indexing is being turned down in favor of grep-based retrieval" 이라고 답했다. 같은 스레드에서 다른 직원은 모델이 grep을 잘 쓰게 되면서 예전 의미 검색 경로가 더는 의미 있게 돕지 못했다고 썼다. 지금 [Cursor 문서](https://cursor.com/docs/context/codebase-indexing)는 Instant Grep이 인덱스를 로컬에서 만들고 질의하며, 코드베이스의 임베딩을 저장하지 않는다고 적는다.


### LSP

마지막 계층은 **언어 서버에 직접 의존**하는 방식이다. tree-sitter가 "심볼이 존재한다는 것"을 안다면, LSP는 "그 심볼이 무엇인지"를 안다.

**[LSP(Language Server Protocol)](https://microsoft.github.io/language-server-protocol/)** 는 에디터와 언어 분석 도구(코드 완성, 정의로 이동, 참조 찾기, 리팩토링 등) 사이의 통신을 표준화한 JSON-RPC 기반 개방형 프로토콜이다. 2016년 [Microsoft, Red Hat, Codenvy가 협력을 발표했다](https://www.redhat.com/en/about/press-releases/red-hat-codenvy-and-microsoft-collaborate-language-server-protocol). 핵심 아이디어는 "에디터마다 언어 분석기를 재구현하지 말고, 언어별 서버 하나를 두고 모든 에디터가 그 서버에 질의하자"는 것이다. rust-analyzer와 Python의 pyright가 LSP 서버이고, TypeScript는 자체 프로토콜을 쓰는 `tsserver` 를 LSP로 감싼 typescript-language-server를 쓴다.

**Serena**(`oraios/serena`)가 이 계층에 속하는 MCP 서버다. 2026-10-08 기준 30,093 stars이고, 저장소는 2025년 3월에 만들어졌다. Serena의 핵심 아이디어는 한 줄로 요약된다. **에이전트에게 텍스트가 아니라 심볼을 보여주자.** 핵심 도구는 `find_symbol`, `find_referencing_symbols`, `get_symbols_overview` 등이다. 백엔드는 두 가지 중 하나를 선택할 수 있다. 기본값은 LSP를 구현한 언어 서버(무료/오픈소스), 다른 옵션은 JetBrains IDE의 코드 분석을 활용하는 유료 플러그인(무료 체험 제공)이다.

이 리포에서 재 보면 차이가 어디서 나는지 보인다. 비공개 글을 거르는 `isHiddenPost`(`src/lib/filter-posts.ts:12`)의 사용처를 두 방식으로 찾았다. 텍스트 쪽은 grep이다.

```bash
# 커밋 36e5cfa, 2026-10-08. 이 글도 같은 이름을 담고 있어 content/ 는 뺐다
git grep -n isHiddenPost -- ':!content'   # 16줄, 파일 9개
```

LSP 쪽은 typescript-language-server가 `textDocument/references` 에 답할 때 쓰는 TypeScript의 `findReferences` API를 직접 불렀다. Serena를 띄워서 잰 것은 아니다. LSP의 참조 찾기는 이름이 아니라 위치(파일과 줄, 열)로 묻는다. 그래서 Serena의 [`find_referencing_symbols`](https://github.com/oraios/serena/blob/3b99f8b024dafd58c962ea6e74f37c8a730ef532/src/serena/tools/symbol_tools.py#L169-L172)도 `name_path` 와 `relative_path` 를 함께 받는다. 이 예시라면 `find_referencing_symbols(name_path="isHiddenPost", relative_path="src/lib/filter-posts.ts")` 다.

```js
// 리포 루트에서 실행한다: node - < refs.cjs
const path = require('path')
const ts = require('typescript')
const cfg = ts.getParsedCommandLineOfConfigFile('tsconfig.json', {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic() {} })
const service = ts.createLanguageService({
  getScriptFileNames: () => cfg.fileNames,
  getScriptVersion: () => '0',
  getScriptSnapshot: f => ts.sys.fileExists(f) ? ts.ScriptSnapshot.fromString(ts.sys.readFile(f)) : undefined,
  getCurrentDirectory: () => process.cwd(),
  getCompilationSettings: () => cfg.options,
  getDefaultLibFileName: o => ts.getDefaultLibFilePath(o),
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
})
const file = 'src/lib/filter-posts.ts'
// 이름이 아니라 정의가 있는 위치(파일과 오프셋)로 묻는다
const pos = ts.sys.readFile(file).indexOf('isHiddenPost')
for (const group of service.findReferences(file, pos) ?? []) {
  for (const ref of group.references) {
    const { line } = service.getProgram().getSourceFile(ref.fileName).getLineAndCharacterOfPosition(ref.textSpan.start)
    console.log(`${path.relative(process.cwd(), ref.fileName)}:${line + 1}${ref.isDefinition ? ' (정의)' : ''}`)
  }
}
```

```text
$ node - < refs.cjs   # typescript 5.9.3, Node 24.16.0
src/lib/filter-posts.ts:12 (정의)
src/lib/filter-posts.ts:24
src/lib/post-navigation.ts:2
src/lib/post-navigation.ts:6
src/app/[lang]/[slug]/opengraph-image.tsx:7
src/app/[lang]/[slug]/opengraph-image.tsx:38
src/app/[lang]/[slug]/page.tsx:5
src/app/[lang]/[slug]/page.tsx:47
src/app/[lang]/[slug]/page.tsx:67
src/app/[lang]/[slug]/page.tsx:74
src/app/[lang]/[slug]/page.tsx:90
```

코드 위치는 양쪽이 같은 11곳이었다. 이 이름은 리포에 하나뿐이라 grep도 코드 위치를 놓치거나 더 잡지 않았다. 차이는 나머지 5곳에서 났다. grep은 `CLAUDE.md` 와 명령 문서, 그 snapshot 속 설명 문장 5줄을 함께 돌려줬다.

Serena는 참조마다 [앞뒤 1줄](https://github.com/oraios/serena/blob/3b99f8b024dafd58c962ea6e74f37c8a730ef532/src/serena/repl/api/lsp_api.py#L367-L369)을 붙여 돌려준다. 그래서 양쪽에 같은 기준을 적용해, 위치마다 `file:line` 과 앞뒤 1줄을 붙인 텍스트의 토큰을 셌다.

```python
# 리포 루트에서 실행한다: python3 count.py (tiktoken 0.13.0)
import subprocess, tiktoken
enc = tiktoken.get_encoding("o200k_base")
def run(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True).stdout.splitlines()
def tokens(locs):  # 위치마다 file:line 과 앞뒤 1줄을 붙여 센다
    total = 0
    for f, n in locs:
        lines = open(f).read().splitlines()
        total += len(enc.encode(f"{f}:{n}\n" + "\n".join(lines[max(0, n - 2):n + 1])))
    return total
grep = [(l.split(":")[0], int(l.split(":")[1])) for l in run("git grep -n isHiddenPost -- ':!content'")]
refs = [(l.rsplit(":", 1)[0], int(l.rsplit(":", 1)[1])) for l in run("node - < refs.cjs") if "(정의)" not in l]
code = [x for x in grep if x[0].startswith("src/")]
print(f"grep {len(grep)}곳 {tokens(grep)} (코드 {len(code)}곳 {tokens(code)}) | 참조 {len(refs)}곳 {tokens(refs)}")
```

```text
$ python3 count.py
grep 16곳 1172 (코드 11곳 453) | 참조 10곳 423
```

| 방식 | 위치 | tokens |
|---|---|---|
| grep | 16곳 (코드 11, 문서 5) | 1,172 (코드 453, 문서 719) |
| findReferences (정의 제외) | 10곳 | 423 |

차이 749 tokens 중 719가 문서 5곳이다. 이 리포에서 LSP가 아낀 것은 코드 위치를 찾는 비용이 아니라 잡음 매치를 읽는 비용이다. 에이전트가 grep에 걸린 파일 9개를 통째로 읽는다면 grep 쪽은 47,737 tokens까지 늘고, 그중 43,318이 문서 5개다. 이것은 상한이다. `CLAUDE.md` 는 실제 세션에서 이미 context에 올라 있어 다시 읽지 않을 가능성이 높다. `isLocale` 처럼 흔한 이름이라면 코드 위치에서도 결과가 갈릴 수 있는데, 이번에는 재지 않았다.

Aider는 LSP를 쓰지 않으므로 함수와 클래스 수준의 인식까지만 한다. [OpenCode](https://opencode.ai/docs/lsp/)는 LSP 서버를 붙여 기본으로 진단 결과를 에이전트에 피드백한다. 정의, 참조, hover, call hierarchy를 묻는 `lsp` 도구는 [`OPENCODE_EXPERIMENTAL_LSP_TOOL=true`](https://opencode.ai/docs/tools/) 일 때만 켜진다. 어느 쪽이든 언어별로 좋은 LSP 서버가 있어야 한다는 조건이 붙는다.


## 마무리

정리하면, 네 계층은 코드를 얼마나 깊이 이해하느냐에 따라 갈리고 줄이는 비용도 다르다. Context packing은 코드를 텍스트로 넘기고, `--compress` 를 줘도 구문까지만 남겨 들어가는 토큰을 줄인다. tree-sitter repo map은 심볼이 있다는 것까지 알고, 들어가는 토큰에 예산으로 상한을 두고, 그 안을 무엇으로 채울지는 그 순간의 대화가 정한다. 지식 그래프는 관계를 미리 저장해 tool call과 처리 토큰을 줄이지만, 제작사 측정으로는 창에 남는 양이 오히려 늘었다. LSP는 심볼이 무엇인지까지 알고, 이 리포에서는 grep이 함께 끌고 오는 잡음 매치를 걸러 처리할 토큰을 줄인 것이 절감의 대부분이었다.

그래서 필자는 도구를 고를 때 계층의 깊이보다 지금 어떤 비용이 문제인지를 먼저 본다. 창이 작고 세션이 길면 남는 양을, 왕복이 느리면 tool call 수를, 문서와 코드가 같은 이름을 공유하는 리포라면 잡음 매치를 본다. Cursor가 의미 검색을 걷어내고 grep으로 돌아간 것도, 깊은 계층이 늘 낫지는 않다는 신호로 읽힌다.

이 도구들이 에이전트가 코드를 찾는 비용을 줄인다면, 에이전트가 처음부터 알아야 할 프로젝트 규칙을 어떤 파일에 얼마나 적을지는 또 다른 문제다. 그 이야기는 [Context file](/260529)에서 다룬다.


## 참고 자료

:::ref
- [repo] [cortexkit/aft](https://github.com/cortexkit/aft)
- [repo] [ast-grep/ast-grep](https://github.com/ast-grep/ast-grep)
- [repo] [ast-grep/ast-grep-mcp](https://github.com/ast-grep/ast-grep-mcp)
:::
