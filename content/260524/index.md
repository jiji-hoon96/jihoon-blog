---
emoji: 🔌
title: "MCP와 function calling"
seoTitle: "MCP는 function calling과 무엇이 다른가: 프로토콜 구조와 호출 흐름"
date: "2026-05-24"
categories: AI 개발도구 Claude MCP CodeGraph
description: "MCP가 function calling과 무엇이 다른지 프로토콜 구조로 정리한다. 여섯 가지 primitive, stdio와 Streamable HTTP, tools/list에서 tool_use 루프까지의 흐름, Tool Poisoning 같은 보안 문제를 다룬다."
keywords: "MCP, Model Context Protocol, MCP function calling 차이, MCP primitive, tools/list, Streamable HTTP, Tool Poisoning Attack, MCP 보안"
---

이번 포스팅에서는 **MCP(Model Context Protocol)가 function calling과 무엇이 다른지**에 대한 이야기를 해보려고 한다.

Claude Code나 Cursor에 MCP 서버를 붙여 쓰고는 있지만, 그것이 LLM API의 function calling과 어디서 갈리는지 설명하기 어려웠던 개발자를 위한 글이다. 끝까지 읽으면 둘을 가르는 네 가지 차이가 프로토콜의 어느 부분에서 나오는지, 그리고 그 구조가 어떤 보안 문제로 이어지는지 알 수 있다. 네 가지는 도구 목록을 런타임에 가져오는 동적 발견, 수명 주기가 정의된 stateful session, Tool 외의 primitive, 그리고 서버가 클라이언트의 LLM을 거꾸로 호출할 수 있는 양방향성이다.

필자는 프론트엔드 개발자로 일하면서 일상적으로 Claude를 활용하는데, MCP 서버를 하나씩 추가할 때마다 이 도구들이 어떤 원리로 모델의 시야에 들어오는지가 매번 가물가물했다.


## MCP(Model Context Protocol)

MCP(Model Context Protocol)는 "**에이전트에게 무엇을 할 수 있게 해줄까**"의 문제를 푼다.

조금 풀어쓰면 이렇다. AI 에이전트가 Slack에 메시지를 보내려면 Slack API를 호출할 수 있어야 한다. GitHub 이슈를 만들려면 GitHub API를 호출할 수 있어야 한다. Postgres에 쿼리하려면 DB 연결을 다룰 수 있어야 한다. 이 모든 외부 시스템과의 통합을 **하나의 표준 프로토콜로 묶은 것**이 MCP다. (어떤 클라이언트든 어떤 서버든 같은 포트로 연결된다는 의미다)

MCP는 Anthropic이 **2024년 11월 25일**에 처음 공개한 개방형 표준이다. 그리고 **2025년 12월 9일**, Anthropic·Block·OpenAI 세 회사가 공동 창립자로 Linux Foundation 산하 **Agentic AI Foundation(AAIF)** 에 MCP 사양을 기증했다. Google·Microsoft·AWS·Cloudflare·Bloomberg가 플래티넘 멤버로 합류했다. (2025년 12월 기증 시점에 이미 월 9,700만 회 이상의 SDK 다운로드와 1만 개 이상의 활성 공개 MCP 서버가 있었다.)

MCP는 JSON-RPC 위에 만들어진 상태 유지(stateful) 세션 프로토콜이다. **JSON-RPC**는 JSON을 와이어 포맷으로 쓰는 stateless·경량 RPC(Remote Procedure Call) 프로토콜이다. 전송 계층에 독립적이어서 HTTP·TCP·표준 입출력 무엇이든 위에서 동작한다. notification(응답이 없는 호출)과 batch 호출도 지원한다. 


### 프로토콜 내부

MCP에서 클라이언트와 서버가 주고받는 모든 상호작용은 여섯 가지 primitive 중 하나로 표현된다. 여기서 primitive는 JavaScript의 원시 타입(string, number 같은 것)과는 관계가 없고, 프로토콜이 정의해 둔 기본 상호작용 유형을 가리킨다. 처음엔 서버측 3개로 출발했지만, 2025-06-18 spec에서 클라이언트측 primitive 3개가 보강되어 지금은 총 6개가 표준이다.

**서버측 primitive**

- **Tool** (model-controlled): 모델이 호출 여부를 스스로 판단해 실행하는 동작이다. 이런 동작은 부작용(side effect)을 가질 수 있다
- **Resource** (application-controlled): URI로 식별되는 읽기 전용 데이터들을 의미한다. 어떤 리소스를 노출할지는 호스트 애플리케이션이 결정한다.
- **Prompt** (user-controlled): 사용자가 슬래시 명령 등으로 명시적으로 트리거하는 재사용 가능한 템플릿이다.

**클라이언트측 primitive**

- **Sampling**: 서버가 거꾸로 클라이언트의 LLM에게 completion을 요청할 수 있게 해주는 메커니즘으로 클라이언트와 서버를 양방향 구조로 만든다.
- **Roots**: 클라이언트가 서버에게 "여기까지가 작업 가능한 범위"라고 알려주는 워크스페이스 경계 정보
- **Elicitation**: 서버가 도구를 실행하는 도중에 사용자에게 추가 입력을 구조화된 형태로 요청할 수 있게 해주는 기능

이 6가지의 구분이 중요한 이유는, **누가 호출/제공을 결정하는가**의 권한이 다르기 때문이다. Tool은 모델의 자율 판단으로 실행되니 잘못된 호출의 리스크가 있다. Resource는 앱이 큐레이션하니 비교적 안전하다. Prompt는 사용자가 명시적으로 트리거하니 가장 통제 가능하다. Sampling/Roots/Elicitation은 클라이언트 측 제어로 권한 모델을 더 정교하게 만든다.

전송 방식은 **딱 두 가지**다. 이는 의도된 설계인데, 생태계가 수십 개의 경쟁 프로토콜로 분열되지 않도록 하기 위함이다. 하나는 **stdio**로, MCP 서버를 로컬 서브프로세스로 실행하고 표준 입출력으로 통신하는 방식이다. 파일시스템이나 깃처럼 로컬에서 동작하는 도구에 적합하다. 다른 하나는 **Streamable HTTP**인데, HTTP POST 위에 SSE 스트리밍을 얹어서 양방향에 가까운 통신을 만들어내는 방식이다. 원격 서버, OAuth 인증, 다중 클라이언트 연결, 클라우드 배포처럼 네트워크 너머에서 일어나는 시나리오에 적합하다.

여기서 SSE(Server-Sent Events)는 HTTP 연결을 통해 서버가 클라이언트로 단방향 데이터를 푸시하는 W3C 표준이다. media type은 `text/event-stream`이고 자바스크립트에서는 `EventSource` API로 접근한다. WebSocket과 달리 단방향이지만 HTTP 위에서 동작하므로 프록시·방화벽 친화적이라는 장점이 있다. Streamable HTTP는 이 SSE를 활용해서 양방향 통신을 흉내내는 셈인데, **2025년 3월 26일** spec(version `2025-03-26`)에서 도입되어 기존의 HTTP+SSE 전송을 대체했다.


### LLM이 MCP 도구를 호출하는 흐름

primitive와 전송 방식까지 봤으니, 이제 **실제로 LLM이 MCP 도구를 어떻게 발견하고 호출하는지**의 흐름을 따라가보자.

MCP 세션이 시작되면 다음 순서의 핸드셰이크가 일어난다.

- **클라이언트 → 서버**: `initialize` 요청 (지원하는 프로토콜 버전, 클라이언트 capabilities 전달)
- **서버 → 클라이언트**: `initialize` 응답 (서버 capabilities + 선택적으로 `instructions` 필드)
- **클라이언트 → 서버**: `notifications/initialized` 알림
- **클라이언트 → 서버**: `tools/list` 요청 → 사용 가능한 도구 목록 수신
- (이후) LLM이 도구를 호출하기로 결정 → 클라이언트가 `tools/call` 발송 → 결과 수신

여기서 한 가지 자주 간과되는 게 있다. **`initialize` 응답의 `instructions` 필드**다. 서버가 이 필드에 텍스트를 담아 보내면, 그 내용은 사실상 LLM의 시스템 프롬프트에 추가된다. 즉 MCP 서버가 "이 도구들을 어떤 식으로 써야 하는지"에 대한 가이드를 LLM에게 직접 주입할 수 있는 정식 슬롯이 spec에 존재한다는 뜻이다. (뒤에서 다룰 Tool Poisoning Attack이 위험한 이유 중 하나가 바로 이 슬롯의 존재다.)

그러면 tool 정의 자체는 어떻게 LLM의 시야에 들어갈까. MCP의 tool 정의는 다음과 같은 JSON Schema 형태다.

```json
{
  "name": "get_weather",
  "description": "Get current weather information for a location",
  "inputSchema": {
    "type": "object",
    "properties": { "location": { "type": "string" } },
    "required": ["location"]
  }
}
```

클라이언트가 `tools/list`로 받은 이 목록을 **Anthropic Messages API의 `tools` 파라미터** 또는 **OpenAI function calling의 `tools` 파라미터**로 변환해서 LLM API 호출에 같이 넣는다. Anthropic의 경우, tool 파라미터가 들어오면 **special system prompt가 자동으로 추가**되어 모델이 tool 호출 방식을 이해하도록 만든다. (Claude 4.x에서는 `tool_choice: auto` 기준으로 이 프롬프트만 346토큰이 붙는다.)

LLM이 도구를 호출해야 한다고 판단하면 응답 안에 `tool_use` 블록(`{"type": "tool_use", "name": ..., "input": ...}`)이 끼어 있고, 응답의 `stop_reason`이 `tool_use`로 끝난다. 클라이언트는 이걸 받아 실제 MCP 서버로 `tools/call`을 발송하고, 결과를 받아서 다음 user 메시지의 `tool_result` 블록에 담아 다시 LLM에 보낸다. **`stop_reason`이 `tool_use`가 아닌 값(`end_turn`, `max_tokens` 등)으로 바뀔 때까지 이 루프가 반복된다.** 우리가 흔히 "에이전트가 일한다"고 부르는 동작은 사실 이 호출-결과-호출 루프의 연속에 가깝다.

그렇다면 MCP는 단순 function calling과 뭐가 다른가? 네 가지 차이로 압축할 수 있다.

- **동적 발견**: 빌드 타임에 도구 목록을 모르고 런타임에 `tools/list`로 가져온다. `notifications/tools/list_changed`로 세션 도중 변경도 가능
- **Stateful session**: lifecycle phase가 정의돼 있어서(initialize → operation → shutdown) 깔끔한 종료가 가능
- **Tool 외 primitive**: Prompt·Resource·Sampling·Roots·Elicitation까지 capability negotiation으로 노출
- **양방향성**: 서버가 거꾸로 클라이언트의 LLM을 sampling으로 호출하는 것도 spec상 가능

(이 차이 때문에 MCP를 "에이전트용 function calling의 일반화된 표준"이라고 부르기도 한다.)


### 그래서 MCP는 안전한가?

여기서 한 가지 짚고 가야 할 게 있다. **MCP는 권한 부여를 자동화하지 않는다.** 에이전트가 어떤 서버를 신뢰할 수 있는지, 어떤 도구가 어떤 부작용을 가지는지, 그 도구가 시간이 지나도 같은 동작을 할지는 모두 사용자가 책임져야 한다.

대표적인 공격 두 가지를 알아두면 좋다.

- **Tool Poisoning Attack(TPA)** : Invariant Labs가 2025년 4월에 명명하고 PoC를 공개한 공격이다. MCP 서버의 도구 설명(description)에 악의적 지시사항을 숨겨두면, 모델은 그것을 사용자 지시로 착각하고 따른다. 사용자에게는 보이지 않는 텍스트지만 모델에는 보이는 것이다.

- **Rug Pull**(Silent Redefinition): Simon Willison이 2025년 4월 9일 공개 분석에서 다룬 개념이다. 도구는 처음엔 합법적으로 시작된다. 사용자가 검토하고 승인하고 워크플로우에 통합한다. 몇 주 뒤, 도구 정의가 조용히 변경되어 악성 지시사항이 포함된다. 사용자는 재승인을 받지 않았으니 그대로 동작이 바뀐다.

보안 관련 사건이 **2026년 4월 15일**에 있었다. OX Security가 모든 주요 MCP SDK(Python·TypeScript·Java·Rust)에 영향을 미치는 시스템적 RCE 취약점들을 공개했다. 1억 5천만 회 이상의 다운로드, 약 7,000개의 공개 서버, 약 20만 개의 추정 취약 배포가 영향권에 들어갔다. 14개 이상의 CVE가 할당되었고, Cursor·VS Code·Windsurf·Claude Code·Gemini-CLI 등이 모두 영향을 받았다.

사후 대응은 어떻게 진행되고 있을까? Anthropic은 **프로토콜 아키텍처 자체는 수정하지 않았다**. 대신 `SECURITY.md`를 업데이트해 stdio adapter 사용 시 입력 sanitization 책임이 다운스트림 개발자에게 있음을 명시했다. spec 차원에서는 **2025-06-18 개정에서 OAuth 2.1 + RFC 8707 Resource Indicators를 의무화**해서 토큰 재사용 공격을 차단했고, **2025-11-25 개정에서는 incremental scope consent**(필요한 최소 권한만 단계적으로 사용자가 동의)를 도입했다. 그럼에도 2026년 1-2월에만 MCP 관련 CVE가 30건 넘게 발행됐고, 그중 **command injection이 43%** 를 차지한다는 통계가 나왔다. **보안 영역은 여전히 진행형인 셈이다.**


## 마무리

정리하면, MCP는 function calling을 대체하는 것이 아니라 그 위에 얹힌 표준이다. 모델이 도구를 부르는 방식은 여전히 `tools` 파라미터와 `tool_use` 루프이고, MCP가 더하는 것은 도구 목록을 런타임에 주고받는 방법, 세션의 수명 주기, Tool 밖의 primitive, 그리고 서버에서 클라이언트로 향하는 호출이다. 도구 정의가 런타임에 오가기 때문에, 그 정의를 오염시키거나 몰래 바꾸는 공격도 같은 자리에서 생긴다.

MCP가 에이전트에게 무엇을 할 수 있게 해줄지의 문제라면, 무엇을 알려줄지는 `CLAUDE.md`나 `AGENTS.md` 같은 context file의 문제다. 그 파일들이 에이전트에게 어떻게 읽히고 어디까지 지켜지는지는 [Context file](/260529)에서 다룬다.


## 참고 자료

:::ref
- [docs] [MCP Specification 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle)
- [docs] [Anthropic Tool Use Overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [article] [Simon Willison, MCP Prompt Injection](https://simonwillison.net/2025/Apr/9/mcp-prompt-injection/)
- [article] [OX Security, MCP Supply Chain Advisory](https://www.ox.security/blog/mcp-supply-chain-advisory-rce-vulnerabilities-across-the-ai-ecosystem/)
:::
