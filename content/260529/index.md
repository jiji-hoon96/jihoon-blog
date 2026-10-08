---
emoji: 🧭
title: 'Context file'
seoTitle: "CLAUDE.md, AGENTS.md, SKILL.md 차이: AI 에이전트 context file 정리"
date: '2026-05-29'
updatedAt: "2026-10-08"
categories: AI 개발도구 Claude MCP CodeGraph
description: "CLAUDE.md, AGENTS.md, SKILL.md, Cursor rules가 언제 어떻게 에이전트에게 읽히는지 정리한다. user message 주입 구조와 context 망각, ETH Zurich 연구로 context file에 무엇을 적을지 기준을 세운다."
keywords: "CLAUDE.md, AGENTS.md, SKILL.md, MEMORY.md, Cursor rules, copilot-instructions.md, context file, AI 코딩 에이전트, Claude Code, ETH Zurich AGENTS.md 연구"
---

이번 포스팅에서는 **AI 코딩 에이전트가 읽는 context file**에 대한 이야기를 해보려고 한다.

한 프로젝트에 `CLAUDE.md`, `AGENTS.md`, `SKILL.md`, `.cursor/rules`가 함께 쌓여 있는데, 각각 언제 읽히고 무엇을 적어야 하는지 헷갈리는 개발자를 위한 글이다. 끝까지 읽으면 파일별 차이와 에이전트가 그 파일을 읽어 들이는 방식, 그리고 ETH Zurich 연구를 근거로 한 "추론할 수 없는 정보만 적는다"는 판단 기준을 얻을 수 있다.

필자는 프론트엔드 개발자로 일하면서 일상적으로 Claude를 활용한다. 그러다 보니 어느 순간부터 프로젝트 루트에 `CLAUDE.md`가 생기고, 옆에 누가 만들어둔 `AGENTS.md`가 있고, `.cursorrules`도 한쪽에 남아있고, 어디선가 본 글을 따라 `.claude/skills/` 폴더를 만들기도 했다. (정신을 차려보니 비슷한 내용을 적어둔 파일이 다섯 개쯤 되어 있었다.)


## 지속 메모리가 없는 에이전트

AI 코딩 에이전트에는 **지속 메모리가 없다는** 근본적인 한계가 있다. 모든 세션은 빈 상태로 시작되고, 어제 합의한 컨벤션이나 한 시간 전에 알려준 폴더 구조 같은 것을 다음 대화에서는 기억하지 못한다. Context file은 이 문제를 해결하기 위한 가장 단순한 장치다. 세션이 시작될 때마다 자동으로 읽히는 파일을 프로젝트에 두면, 매번 같은 설명을 반복할 필요가 없다.

문제는 같은 발상에서 출발한 파일이 도구마다 따로 만들어졌다는 점이다. Claude Code는 `CLAUDE.md`를, Cursor는 `.cursorrules`(현재는 depreacted가 되어 `.cursor/rules` 사용을 권장하고있다)를, GitHub Copilot은 `.github/copilot-instructions.md`를, OpenAI Codex는 `AGENTS.md`를 읽는다. 한 팀이 여러 도구를 쓰면 같은 내용을 네 군데에 복사해 두어야 하는 상황이 벌어지는 것이다.


### CLAUDE.md

`CLAUDE.md`는 Claude Code가 세션 시작 시 자동으로 읽어 들이는 파일이다. Anthropic 공식 문서(`code.claude.com/docs/en/memory`)에 따르면, Claude Code는 다음 세 계층에서 `CLAUDE.md`를 찾는다.

- **사용자 메모리** (`~/.claude/CLAUDE.md`): 머신의 모든 프로젝트에 적용되는 전역 기본값
- **프로젝트 메모리** (프로젝트 루트의 `CLAUDE.md`): 깃에 커밋되어 팀 전체가 공유
- **로컬 메모리** (서브디렉토리의 `CLAUDE.md`): 해당 디렉토리에서 작업할 때만 추가로 로딩

세 계층이 모두 존재하면 Claude는 **모두 읽어 연결(concatenate)** 한다. 우선순위에 따라 하나만 선택되는 게 아니라, CSS의 cascade처럼 더 구체적인 것이 추가로 얹히는 구조다. (오버라이드가 아니라 병합이다.) 따라서 같은 주제의 규칙을 여러 계층에 흩어두면 충돌이 날 수 있다.(Anthropic 공식 문서는 충돌 시 동작이 보장되지 않는다고 명시하고있다.)

여기서 한 가지 자주 놓치는 부분이 있다. **현재 작업 디렉토리에서 레포 루트까지 거슬러 올라가며 만나는 모든 `CLAUDE.md`를 읽는다**는 점이다. 그래서 모노레포에서 `packages/ui/`에 들어가서 작업하면 루트의 `CLAUDE.md`와 `packages/ui/CLAUDE.md`가 둘 다 로딩된다. (이건 강력하지만 동시에 컨텍스트가 부지불식간에 부풀 수 있다는 뜻이기도 하다.)


### AGENTS.md

`AGENTS.md`는 위에서 말한 도구별 파일 난립을 풀기 위해 만들어진 표준이다. 2025년 12월, Anthropic·Block·OpenAI 세 회사가 MCP(에이전트를 외부 시스템에 연결하는 프로토콜)와 함께 Linux Foundation 산하 **Agentic AI Foundation(AAIF)** 에 기증하면서 사실상의 업계 표준이 되었다. 공식 사이트(`agents.md`)에서 **6만 개 이상의 오픈소스 저장소가 이 파일을 채택하고 있다**고 명시하고 있다.

지원하는 도구 목록을 보면 더 분명해진다. OpenAI Codex, Google Jules, VS Code, GitHub Copilot, Cursor, JetBrains Junie, Aider, Devin, Zed, Factory, Warp, goose, opencode, Amp, RooCode, Gemini CLI, Kilo Code, Phoenix, Semgrep, Ona, Windsurf, Augment Code 까지 수많은 도구들을 지원한다. GitHub Copilot은 2025년 8월부터 `AGENTS.md`를 네이티브로 지원하기 시작했다. 한 가지 흥미로운 점은 **Claude Code의 네이티브 `AGENTS.md` 지원은 아직 active feature request 상태**라는 것이다. Claude Code는 여전히 `CLAUDE.md`를 1차 파일로 본다.

표준이라고는 하지만 정말 채택되고 있는지 의심스러울 수도 있다. 가장 강력한 증거는 **dogfooding**(자신이 만든 표준을 자신이 직접 쓴다는 의미)이다.

- **Vercel/Next.js**의 canary 브랜치 루트에는 `AGENTS.md`가 있다. 사실은 `CLAUDE.md`를 가리키는 심볼릭 링크인데, 그 안에 모노레포 구조, `pnpm --filter=next dev`로 1-2초 단위 반복, Turbopack/Webpack 양쪽 테스트 가이드, `pr-status` 스크립트, 환경 변수·시크릿 처리 규칙까지 들어 있다. `create-next-app`이 신규 프로젝트에 `AGENTS.md`와 `CLAUDE.md`를 함께 생성하도록 바뀐 것도 같은 흐름이다.
- **OpenAI/codex** 레포 자체가 자신의 `AGENTS.md`를 운영한다.

전략적으로는 이렇게 운용하는 게 정석으로 굳어지고 있다. **`AGENTS.md`를 단일 정보 출처(single source of truth)로 두고**, `CLAUDE.md`는 최소화해서 `AGENTS.md`를 참조하는 한 줄과 Claude Code 전용 지시만 적어두는 방식이다. 이렇게 하면 중복이 사라지고, Claude Code는 두 파일을 모두 읽기 때문에 잃는 것이 없다.


### SKILL.md

`SKILL.md`는 위 두 파일과는 결이 다르다. `CLAUDE.md`와 `AGENTS.md`가 **항상 컨텍스트에 존재하는 영속적 지시**라면, 스킬(Skill)은 **필요할 때만 호출되는 온디맨드 능력**이다.

스킬은 폴더 단위로 구성된다. 폴더 안에 `SKILL.md` 한 개와 그 스킬이 실행할 스크립트, 추가 마크다운 문서들이 들어있다. Claude는 현재 태스크가 스킬의 `description`과 매칭될 때만 그 폴더를 로딩한다. 이걸 **progressive disclosure(점진적 노출)** 라고 부르는데, 1995년 UX 분야의 Jakob Nielsen이 정립한 개념으로 고급·드물게 쓰이는 기능을 보조 화면으로 미뤄두고 사용자가 한 번에 하나의 작업에만 집중하게 해서 인지 부하와 에러를 줄이는 기법이다. Claude Skills 맥락에서는 "필요할 때만 그 스킬의 본문을 컨텍스트로 가져오는" 메커니즘을 가리킨다. 결과적으로 컨텍스트 윈도우 비용을 극적으로 아낄 수 있다.

`SKILL.md`의 frontmatter에는 몇 가지 고유한 필드가 있다.

- **`description`**: 어떤 상황에서 이 스킬이 필요한지 설명. 모델이 호출 여부를 판단하는 트리거가 된다
- **`allowed-tools`**: 스킬 안에서 사용 가능한 도구를 제한 (예: `"Read, Glob, Grep, Bash(python:*)"`)
- **`disable-model-invocation: true`**: 모델은 호출 불가, 사용자만 슬래시 명령으로 트리거 가능하다. 부작용 있는 작업(배포·커밋 등)에 사용한다
- **`user-invocable: false`**: 사용자에게는 슬래시 메뉴에서 안 보이고 Claude만 자율 호출하여 배경 지식용에 사용한다.

Claude Skills는 2025년 10월 16일 Claude.ai, Claude Code, API, Agent SDK에 동시 출시되었다. 그리고 2025년 12월 18일, Anthropic은 Skills 사양 자체를 오픈 표준(`agentskills.io`)으로 발표했다. Simon Willison은 "**Skills are awesome, maybe a bigger deal than MCP**"라는 평가를 내놓기도 했는데, 그 이유는 형식이 MCP보다 극적으로 단순하면서 컨텍스트 윈도우 비용 문제를 progressive disclosure로 해결한다는 점에 있었다.

여기서 Skills와 비교된 MCP(Model Context Protocol)는 에이전트가 Slack, GitHub, DB 같은 외부 시스템을 호출할 수 있게 연결하는 표준 프로토콜이다. Context file이 에이전트에게 무엇을 알려줄지의 문제라면, MCP는 무엇을 할 수 있게 해줄지의 문제다. MCP가 function calling과 무엇이 다른지는 [MCP와 function calling](/260524)에 따로 정리해 두었다.


### 다른 도구들의 파일

Cursor의 `.cursorrules`는 **0.43 버전부터 deprecated** 되었다. 현재 공식 권장은 `.cursor/rules/` 디렉토리 안에 여러 `.mdc` 파일을 두는 것이다. 각 `.mdc` 파일은 YAML frontmatter를 가진다.

- **`description`**: 에이전트가 이 룰의 관련성을 판단할 때 참고
- **`globs`**: 매칭되는 파일이 대화에 포함될 때 자동 첨부(auto-attach)
- **`alwaysApply`**: `true`면 모든 대화에 무조건 포함 (이 경우 `globs`는 무시)

GitHub Copilot도 비슷한 방향으로 진화했다. 저장소 전역 지시는 `.github/copilot-instructions.md`에 두고, 경로별 스코프가 필요한 지시는 `.github/instructions/*.instructions.md` 파일을 만들어 frontmatter의 `applyTo:` 키로 glob을 지정한다. (Copilot code review는 2025년 9월부터 path-scoped instructions를 공식 지원한다.)

Cursor·Copilot 외의 도구들도 모두 비슷한 패턴으로 수렴하고 있다. 표로 정리하면 이렇다.

| 도구 | 파일/디렉토리 | 특징 |
|------|--------------|------|
| **Claude Code** | `CLAUDE.md` (3계층) | 디렉토리 트리 따라 병합 |
| **Cursor** | `.cursor/rules/*.mdc` | `globs`로 파일 패턴 스코핑 |
| **GitHub Copilot** | `.github/copilot-instructions.md` + `.github/instructions/*.instructions.md` | `applyTo` glob 지원 |
| **Cline** | `.clinerules/` 디렉토리 | 모든 `.md`/`.txt` 통합, `paths` glob 조건부 활성화 |
| **Continue.dev** | `.continue/rules/*.md` | `name`/`globs`/`alwaysApply` frontmatter |
| **Aider** | `CONVENTIONS.md` + `.aider.conf.yml` | 매 요청마다 포함, **200줄 이내 권장** |
| **Windsurf** | `.windsurfrules` + `global_rules.md` | 글로벌과 프로젝트 2단계 |
| **표준** | `AGENTS.md` (AAIF) | 60,000+ 저장소 채택 |

특히 **Aider의 `CONVENTIONS.md`가 흥미롭다**. 공식 문서는 매 요청마다 이 파일을 통째로 컨텍스트에 포함하기 때문에 **"200줄 이내로 유지하라"** 고 명시한다. (Aider는 이 한계를 일찍 인지하고 사용자에게 명시적으로 알려주는 셈이다.)


### MEMORY.md

위 파일들과는 별개로, 점점 자주 보이는 패턴이 하나 더 있다. `MEMORY.md`다. 공식 표준은 아니지만 커뮤니티에서 자생적으로 생겨난 컨벤션인데, **시간이 흐르는 동안의 의사결정과 실수를 기록**하는 용도다.

```markdown
## 2026-04-10
Pages Router에서 App Router로 이전. 신규 라우트는 App Router 컨벤션 사용.

## 2026-04-22
Prisma 쿼리 결과에 optional chaining 쓰지 말 것 — null은 if-check로 명시적 처리.
(이전에 옵셔널 체이닝으로 null을 흘려보내 프로덕션 이슈 발생.)
```

`CLAUDE.md`나 `AGENTS.md`가 **현재 시점의 규칙**을 적는 곳이라면, `MEMORY.md`는 **그 규칙이 왜 만들어졌는지의 역사**를 적는 곳이다. (둘은 보완 관계지 대체 관계가 아니다.)


### 에이전트는 이 파일들을 어떻게 읽는가

지금까지 어떤 파일이 있는지를 정리했다. 그런데 의외로 자주 빠지는 질문이 하나 있다. **이 파일들을 에이전트는 정확히 어디로, 어떻게 읽어들이는 걸까?** 사실 이 메커니즘을 알면 뒤에 이어질 ETH Zurich 결과(context file이 잘 안 따라진다는 결과)가 왜 나왔는지가 좀 더 깔끔하게 이해된다.

가장 먼저 짚어둘 사실 하나. **`CLAUDE.md`는 system prompt가 아니라 user message로 주입된다.** Anthropic 공식 문서가 아래와 같이 명시한다

::::quote
:::translation
CLAUDE.md 콘텐츠는 시스템 프롬프트의 일부가 아니라 시스템 프롬프트 뒤에 사용자 메시지로 전달된다. Claude는 이를 읽고 따르려 하지만, 엄격히 준수한다는 보장은 없다.
:::

:::original
CLAUDE.md content is delivered as a user message after the system prompt, not as part of the system prompt itself. Claude reads it and tries to follow it, but there's no guarantee of strict compliance.
:::
::::

즉 강제 규칙이 아니라 "참고용 컨텍스트"인 셈이다. 정확히 어떤 동작을 강제하고 싶다면 `PreToolUse` 훅 같은 별도 장치를 써야 한다고 공식 가이드도 권장한다.

로드 순서는 broad → specific 으로 쌓인다. 구체적으로는 managed policy(조직 차원의 설정) → 사용자 글로벌(`~/.claude/CLAUDE.md`) → 프로젝트(`./CLAUDE.md`) → 로컬(`./CLAUDE.local.md`) 순이다. 같은 디렉토리에서는 `CLAUDE.md` 다음 `CLAUDE.local.md` 순. **가장 가까운 곳의 지시가 가장 나중에 읽힌다**는 점을 활용하면 (LLM의 recency bias 덕에) 더 구체적인 규칙이 더 강하게 작용하는 효과를 노릴 수 있다.

여기서 흥미로운 게 `@import` 문법이다. CLAUDE.md 본문 어디에 `@path/to/file`을 적으면 그 파일이 자리에 그대로 펼쳐져서 같이 로드된다. **최대 재귀 깊이는 4 hops**까지 허용되고, 상대경로는 import문이 적힌 파일 기준으로 풀린다. 그래서 공식 권장이 `@AGENTS.md`로 브리지하는 방식이다. `CLAUDE.md`는 거의 비워두고 `@AGENTS.md` 한 줄만 쓰면 Claude Code도 자연스럽게 AGENTS.md를 읽는다. (CLAUDE.md가 아직 AGENTS.md를 네이티브 지원하지 않는 현 상황에서 가장 깔끔한 우회다.)

토큰 측면도 짚고 가자. CLAUDE.md 자체에는 명시적 토큰 한도가 없어서 **있으면 전부 로드된다**. 다만 공식 권고는 **파일당 200줄 이내**다. 200줄을 넘기면 "consume more context and may reduce adherence"라고 명시되어 있다. 흥미롭게도 Claude 4.x에서는 **tool use를 활성화하는 것만으로 special system prompt가 자동 +346토큰**(`tool_choice: auto` 기준) 추가된다. 컨텍스트는 알게 모르게 새고 있는 셈이다.

Cursor는 또 다른 방식이다. `.cursor/rules/*.mdc`의 룰은 네 가지 타입으로 작동한다.

- **Always Apply**: 모든 채팅에 무조건 포함. globs/description 무시
- **Apply Intelligently**(Agent Requested): 에이전트가 `description`을 읽고 관련성을 판단해 끌어다 씀
- **Apply to Specific Files**(Auto Attached): glob 패턴 매칭 파일이 컨텍스트에 들어왔을 때 활성화
- **Apply Manually**: `@rule-name`으로 사용자가 명시 호출

다른 도구들은 또 다르다. OpenAI Codex는 git 레포 루트에서 cwd 방향으로 walk하며 모든 `AGENTS.md`를 수집해 **사용자 프롬프트 직전에** 주입하고, GitHub Copilot은 `.github/copilot-instructions.md`를 "edit context와 explicit references 다음, loosely related open files보다는 앞"이라는 컨텍스트 윈도우의 중간 우선순위로 끼워 넣는다. 같은 `AGENTS.md` 파일이라도 로드 시점, 우선순위, 머지 규칙이 도구마다 다르기 때문에 **세 도구가 정확히 같은 방식으로 그 파일을 본다는 보장은 없다.**

그런데 여기서 한 가지 근본적인 질문이 남는다. **왜 모델은 컨텍스트에 있는 지시를 일부만 따르는 걸까?** 단순히 "지시가 길어서"라는 설명은 충분하지 않다. 이 현상의 밑에는 LLM의 구조적 한계가 있다.

### 환각과 context 망각

AI 에이전트가 대화 맥락을 혼동하거나 앞에서 분명히 말한 내용을 뒤에서 잊어버리는 경험을 해본 적이 있다면, 그게 바로 **환각(Hallucination)** 의 한 형태다. 일반적으로 환각이라고 하면 "없는 사실을 지어내는 것"을 먼저 떠올리지만, 학술적으로는 세 가지로 구분한다. Yue Zhang 외 연구팀의 2023년 설문("Siren's Song in the AI Ocean")은 이를 **입력 충돌형**(사용자가 명시한 내용과 다르게 생성), **맥락 충돌형**(이전에 자신이 생성한 내용과 모순), **사실 충돌형**(세계 지식과 불일치)으로 나눈다. Context file 지시를 무시하는 현상은 세 번째가 아니라 **첫 번째 유형**이다. 모델이 입력을 처리하면서 그 안의 정보 일부를 "없던 것처럼" 다루는 것이다.

더 근본적인 문제는 이 환각이 **원천적으로 제거 불가능**하다는 점이다. 싱가포르 국립대학교 연구팀은 학습 이론을 이용해 이를 수학적으로 증명했다. 어떤 LLM도 모든 계산 가능한 함수를 학습할 수 없고, 따라서 일반 문제 해결기로 쓰이는 한 반드시 어느 지점에서 환각이 발생한다는 것이다.

위치 효과도 중요하다. Stanford 연구팀은 관련 정보가 **컨텍스트 윈도우의 앞이나 끝에 위치할 때** 모델이 가장 잘 참조하고, **중간에 묻혔을 때** 성능이 크게 떨어진다는 것을 실험으로 보였다. 이게 context file에 직접 연결된다. `CLAUDE.md`가 로드 순서상 중간 어딘가에 끼어 들어가고, 그 뒤로 대화가 길어질수록 파일의 지시는 점점 컨텍스트의 "중간"으로 밀려난다. 앞서 언급한 recency bias(최근 것을 더 잘 따르는 경향)의 반대편, 즉 **primacy-recency 효과의 중간 구간이 가장 취약하다**는 사실과도 맞닿아 있다.

결국 이 현상들을 한데 놓으면 하나의 그림이 된다. Context file은 LLM의 **첫 user 턴 이전에 시스템 외부에서 추가로 끼어 들어가는 텍스트**일 뿐이다. 모델의 결정을 강제하는 메커니즘이 아니라 그저 컨텍스트 윈도우에 떨어지는 또 하나의 토큰 덩어리인 것이다. 길수록, 그리고 대화가 길어질수록 그 지시는 점점 "중간"으로 밀려나며 참조율이 떨어진다. ETH Zurich 결과는 이 구조적 한계를 정량적으로 확인한 셈이다.


### ETH Zurich의 연구

많은 사람들은 "그럼 이 파일들에 최대한 많이 적어두면 좋겠네?" 하는 생각을 했을 것이다. 그런데 이 직관을 정면으로 반박하는 연구가 최근에 나왔다. 바로 앞에서 계속 이야기한 ETH Zurich 연구이다.

ETH Zurich 연구팀이 2026년 2월에 발표한 논문("Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?")이다. 138개의 실제 Python 소프트웨어 엔지니어링 태스크 벤치마크(AGENTBENCH)와 SWE-bench Lite에서 Claude Code(Sonnet-4.5), Codex(GPT-5.2 / GPT-5.1 mini), Qwen Code 네 가지 에이전트로 측정했는데, 결과가 의외였다.

- **LLM이 자동 생성한 context file**은 SWE-bench Lite에서 0.5%, AGENTBENCH에서 2% 가량 **태스크 성공률을 오히려 낮췄다**
- **사람이 직접 작성한 파일**조차 평균 4% 정도의 마이너 개선에 그쳤다
- Context file을 추가했을 때 **추론 비용이 인스턴스당 20% 이상 증가**했다
- 더 강력한 모델(GPT-5.2)에서는 context file의 효과가 더 미미했다 (강력한 모델일수록 파라메트릭 지식이 충분해서 추가 컨텍스트가 노이즈로 작용)

다만 한 가지 예외가 있었다. **비표준 도구를 명시했을 때**다. 예를 들어 Python 패키지 매니저인 `uv`를 컨텍스트에 명시하니, 에이전트가 `uv`를 사용하는 빈도가 인스턴스당 0.01회 => 1.6회로 **약 160배 증가했다**

앞서 다룬 Aider의 "200줄 권고", "매번 컨텍스트에 들어가니까 짧게 유지하라"라는 실용성을 안내한 거고, ETH Zurich 연구는 "긴 context file이 통계적으로 성능을 떨어뜨린다"는 걸 정량적으로 보여줬다. 필자가 생각하는 이 연구의 실천적 함의는 아래와같다.

-  **자동 생성된 거대한 context file은 도움보다 해가 될 수 있다**. 300줄짜리 `CLAUDE.md`에 코딩 표준·아키텍처·워크플로우를 다 욱여넣으면, 에이전트는 일부만 따르고 나머지를 무시한다. 그 불일관성은 차라리 컨텍스트가 없는 것보다 나쁜 결과로 이어진다.
- **반드시 적어야 하는 것은 "추론할 수 없는 정보"** 다. 비표준 도구, 프로젝트 고유의 컨벤션, 과거 실패 사례 같은 것들이 여기에 속한다. 일반적인 코딩 베스트 프랙티스는 모델이 이미 안다.
- AGENTS.md를 단일 출처로, CLAUDE.md는 도구 전용 짧은 지시만, 세한 워크플로우는 Skill로 분리한다.


## 그래서

Context file은 도구마다 이름도, 놓이는 위치도, 읽히는 시점도 다르다. 이 글에서 본 것만 해도 CLAUDE.md, AGENTS.md, SKILL.md, Cursor rules, copilot-instructions.md, MEMORY.md가 있고, 어떤 도구가 어떤 파일을 지원하는지도 계속 바뀐다. 파일 목록을 외워 두는 것만으로는 금세 낡는다.

그래서 필자가 이 글에서 하려 했던 것은 특정 파일 형식을 추천하는 것이 아니라, **파일이 에이전트에게 어떻게 읽히는지 보는 눈**을 만드는 것이었다. CLAUDE.md가 왜 user message로 주입되는지, 같은 AGENTS.md를 도구마다 왜 다르게 읽는지, 지시가 왜 컨텍스트 중간에서 약해지는지를 알고 나면, 새로운 context file 형식이 등장했을 때 "이건 언제 로드되고 얼마나 강하게 작용하는구나"가 빠르게 읽힌다.

결국 남는 건 ETH Zurich 연구가 건넨 한 가지 직관이다. **모델은 이미 많은 것을 안다.** context file에 온갖 것을 욱여넣는다고 에이전트가 더 잘 따르지 않는다. 모델이 모를 가능성이 높은 것, 즉 프로젝트 고유의 컨벤션·비표준 도구·과거의 실수만 남기고 나머지는 걷어내는 것이 오히려 낫다. Context file을 길게 쓰는 것과 잘 쓰는 것은 다른 문제다.

이 글을 읽는 독자들도 지금 당장 CLAUDE.md를 수백 줄로 늘리기보다는, 지금 쓰고 있는 도구가 그 파일을 언제, 어느 자리에, 얼마나 강하게 읽어 들이는지 한 번쯤 파고들어 보기를 권한다. 그게 파일 형식이 어떻게 바뀌든 흔들리지 않는 기반이 된다고 생각한다.


## 참고 자료

:::ref
- [docs] [Claude Code Memory, Anthropic](https://code.claude.com/docs/en/memory)
- [docs] [Anthropic Tool Use Overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [docs] [Cursor Rules Documentation](https://cursor.com/docs/context/rules)
- [paper] [ETH Zurich, "Evaluating AGENTS.md" (2602.11988)](https://arxiv.org/abs/2602.11988)
- [paper] [Yue Zhang et al., "Siren's Song" (2309.01219)](https://arxiv.org/abs/2309.01219)
- [paper] [Ziwei Xu et al., "Hallucination is Inevitable" (2401.11817)](https://arxiv.org/abs/2401.11817)
- [paper] [Nelson F. Liu et al., "Lost in the Middle" (2307.03172)](https://arxiv.org/abs/2307.03172)
- [article] [Simon Willison, "Claude Skills are awesome"](https://simonwillison.net/2025/Oct/16/claude-skills/)
:::
