---
emoji: 🔌
title: "MCP와 function calling"
seoTitle: "MCP는 function calling과 무엇이 다른가: 프로토콜 구조와 호출 흐름"
date: "2026-05-24"
updatedAt: "2026-10-08"
categories: AI 개발도구 Claude MCP
description: "MCP가 function calling과 무엇이 다른지 프로토콜 구조로 정리한다. 여섯 가지 primitive, stdio와 Streamable HTTP, tools/list에서 tool_use 루프까지의 흐름, Tool Poisoning 같은 보안 문제를 다룬다."
keywords: "MCP, Model Context Protocol, MCP function calling 차이, MCP primitive, tools/list, Streamable HTTP, Tool Poisoning Attack, MCP 보안"
---

이번 포스팅에서는 **MCP(Model Context Protocol)가 function calling과 무엇이 다른지**에 대한 이야기를 해보려고 한다.

Claude Code나 Cursor에 MCP 서버를 붙여 쓰고는 있지만, 그것이 LLM API의 function calling과 어디서 갈리는지 설명하기 어려웠던 개발자를 위한 글이다. 답부터 적으면 MCP는 function calling을 대체하지 않는다. 호스트 애플리케이션이 MCP 서버에서 받은 도구 목록을 function calling의 `tools` 파라미터로 바꿔 넣고, 모델이 고른 호출을 다시 MCP 서버로 넘긴다. 끝까지 읽으면 그 위에서 MCP가 더하는 네 가지 차이가 프로토콜의 어느 부분에서 나오는지, 2026-07-28 개정판 이후에도 남는 차이가 무엇인지, 그리고 그 구조가 어떤 공격면을 여는지 알 수 있다.

필자는 프론트엔드 개발자로 일하면서 일상적으로 Claude를 활용하는데, MCP 서버를 하나씩 추가할 때마다 이 도구들이 어떤 원리로 모델의 시야에 들어오는지가 매번 가물가물했다.


## MCP(Model Context Protocol)

MCP(Model Context Protocol)는 "**에이전트에게 무엇을 할 수 있게 해줄까**"의 문제를 푼다.

조금 풀어쓰면 이렇다. AI 에이전트가 Slack에 메시지를 보내려면 Slack API를 호출할 수 있어야 한다. GitHub 이슈를 만들려면 GitHub API를 호출할 수 있어야 한다. Postgres에 쿼리하려면 DB 연결을 다룰 수 있어야 한다. 이 모든 외부 시스템과의 통합을 **하나의 표준 프로토콜로 묶은 것**이 MCP다. (클라이언트와 서버가 같은 규격으로 연결된다는 뜻이다)

MCP는 Anthropic이 **2024년 11월 25일**에 처음 공개한 개방형 표준이다. 그리고 **2025년 12월 9일**, Anthropic은 MCP를 Linux Foundation 산하 [Agentic AI Foundation(AAIF)](https://www.anthropic.com/news/donating-the-model-context-protocol-and-establishing-of-the-agentic-ai-foundation)에 기증했다. AAIF는 Anthropic·Block·OpenAI가 공동 창립했다.

MCP는 JSON-RPC 위에 만들어진 프로토콜이다. [JSON-RPC 2.0](https://www.jsonrpc.org/specification)은 JSON을 와이어 포맷으로 쓰는 stateless·경량 RPC(Remote Procedure Call) 프로토콜이다. 전송 계층에 독립적이어서 HTTP·TCP·표준 입출력 무엇이든 위에서 동작한다. 이 글은 2025-11-25 개정판을 기준으로 설명하고, 이 판에서 MCP는 연결마다 세션을 맺는 stateful 프로토콜이다. 그 뒤에 나온 개정판에서 무엇이 바뀌었는지는 호출 흐름을 본 다음에 다룬다.


### 여섯 가지 primitive

2025-11-25 명세의 개요는 서버가 제공하는 기능 셋과 클라이언트가 제공하는 기능 셋을 든다. 이 글은 이 여섯을 primitive라고 부른다. 여기서 primitive는 JavaScript의 원시 타입(string, number 같은 것)과는 관계가 없고, 프로토콜이 정의해 둔 기본 상호작용 유형을 가리킨다.

#### 서버측 primitive

- **Tool** (model-controlled): 모델이 호출 여부를 스스로 판단해 실행하는 동작이다. 이런 동작은 부작용(side effect)을 가질 수 있다
- **Resource** (application-controlled): URI로 식별되는 데이터다. 스펙에는 내용을 읽어 오는 `resources/read` 만 있고 쓰는 메서드는 없다. 그 리소스를 context에 어떻게 넣을지는 호스트 애플리케이션이 결정한다.
- **Prompt** (user-controlled): 사용자가 슬래시 명령 등으로 명시적으로 트리거하는 재사용 가능한 템플릿이다.

#### 클라이언트측 primitive

- **Sampling**: 서버가 거꾸로 클라이언트의 LLM에게 completion을 요청할 수 있게 해주는 메커니즘으로 클라이언트와 서버를 양방향 구조로 만든다. 서버가 도구를 실행하다 문장 생성이 필요할 때 자기 API 키 없이 클라이언트가 쓰는 모델을 빌리는 용도다. 2026-07-28 개정판에서는 제거 예정인 deprecated 상태가 되었다.
- **Roots**: 클라이언트가 서버에게 "여기까지가 작업 가능한 범위"라고 알려주는 워크스페이스 경계 정보
- **Elicitation**: 서버가 도구를 실행하는 도중에 사용자에게 추가 입력을 구조화된 형태로 요청할 수 있게 해주는 기능

이 구분이 중요한 이유는 **누가 호출이나 제공을 결정하는가**가 다르기 때문이다. Tool은 모델이 판단해 실행하니 잘못된 호출의 리스크가 있고, Prompt는 사용자가 명시적으로 고른다. Resource는 앱이 고르는 것이 기본이지만, 스펙은 heuristic이나 모델의 선택으로 자동 포함하는 구현도 허용한다. 클라이언트측 세 가지는 방향이 반대다. 서버가 요청하고, 응할지는 클라이언트가 정한다.

### 두 가지 전송 방식

[표준 전송 방식](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)은 두 가지이고, 스펙은 그 밖의 커스텀 전송도 허용한다(MAY). 하나는 **stdio**로, MCP 서버를 로컬 서브프로세스로 실행하고 표준 입출력으로 통신하는 방식이다. 파일시스템이나 깃처럼 로컬에서 동작하는 도구에 적합하다. 다른 하나는 **Streamable HTTP**인데, HTTP POST와 GET에 SSE(Server-Sent Events) 스트리밍을 얹어서 양방향에 가까운 통신을 만들어내는 방식이다. SSE는 HTTP 연결 위에서 서버가 클라이언트로 데이터를 한 방향으로 밀어 보내는 방식이다. 원격 서버, OAuth 인증, 다중 클라이언트 연결, 클라우드 배포처럼 네트워크 너머에서 일어나는 시나리오에 적합하다.


### LLM이 MCP 도구를 호출하는 흐름

primitive와 전송 방식까지 봤으니, 이제 **실제로 LLM이 MCP 도구를 어떻게 발견하고 호출하는지**의 흐름을 따라가보자.

2025-11-25 개정판에서 연결이 시작되면 다음 순서의 handshake가 일어난다. 2026-10-08 현재 TypeScript SDK의 1.32.1과 v2 계열 2.3.1도 기본 설정에서는 이 순서로 움직인다.

- **클라이언트 → 서버**: `initialize` 요청 (지원하는 프로토콜 버전, 클라이언트 capabilities 전달)
- **서버 → 클라이언트**: `initialize` 응답 (서버 capabilities + 선택적으로 `instructions` 필드)
- **클라이언트 → 서버**: `notifications/initialized` 알림
- **클라이언트 → 서버**: `tools/list` 요청 → 사용 가능한 도구 목록 수신
- (이후) LLM이 도구를 호출하기로 결정 → 클라이언트가 `tools/call` 발송 → 결과 수신

`initialize` 응답의 `instructions` 필드는 서버가 도구를 어떻게 써야 하는지 텍스트로 적어 보내는 자리다. 아래 데모 출력의 instructions 줄이 이 값이다.

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

호스트는 `tools/list` 로 받은 이 목록을 **Anthropic Messages API의 `tools` 파라미터** 또는 **OpenAI function calling의 `tools` 파라미터**로 변환해서 LLM API 호출에 같이 넣는다. Anthropic의 경우, tool 파라미터가 들어오면 [special system prompt가 자동으로 추가](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)되어 모델이 tool 호출 방식을 이해하도록 만든다. 그 길이는 모델마다 다르다. 2026-10-08 에 본 문서 표에서 `tool_choice: auto` 기준 현행 모델은 286~675토큰이었다.

LLM이 도구를 호출해야 한다고 판단하면 응답 안에 `tool_use` 블록(`{"type": "tool_use", "name": ..., "input": ...}`)이 끼어 있고, 응답의 `stop_reason`이 `tool_use`로 끝난다. 호스트는 이걸 받아 실제 MCP 서버로 `tools/call`을 발송하고, 결과를 받아서 다음 user 메시지의 `tool_result` 블록에 담아 다시 LLM에 보낸다. **`stop_reason`이 `tool_use`가 아닌 값(`end_turn`, `max_tokens` 등)으로 바뀔 때까지 이 루프가 반복된다.** 우리가 흔히 "에이전트가 일한다"고 부르는 동작은 사실 이 호출-결과-호출 루프의 연속에 가깝다.

그림으로 놓으면 모델과 MCP 서버 사이에는 선이 없다. 모델은 `tools` 로 받은 정의만 보고, MCP 서버는 모델이 아니라 호스트의 요청을 받는다. 두 프로토콜을 잇는 것은 가운데의 호스트다.

![왼쪽 LLM API와 가운데 호스트 사이에 tools, tool_use, tool_result 화살표가 오가고, 호스트와 오른쪽 MCP 서버 사이에 tools/list, tools/call 화살표가 오간다. LLM API와 MCP 서버 사이에는 선이 없다](1.png?w=720)

이 변환이 실제로 얼마나 짧은지 돌려 봤다. 2026-10-08 에 Node v24.16.0, `@modelcontextprotocol/sdk` 1.32.1, `zod` 4.6.5로 실행했다. 전송은 stdio 대신 같은 프로세스 안에서 서버와 클라이언트를 잇는 `InMemoryTransport` 이고, LLM은 호출하지 않았다. `tool_use` 블록은 Anthropic 문서의 모양대로 손으로 만들었다.

```js
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { z } from "zod";

// MCP 서버: 도구 하나와 instructions 를 둔다
const server = new McpServer(
  { name: "weather", version: "1.0.0" },
  { instructions: "Use get_weather for current conditions only." }
);
server.registerTool(
  "get_weather",
  { description: "Get current weather information for a location", inputSchema: { location: z.string() } },
  async ({ location }) => ({ content: [{ type: "text", text: `${location}: 15C, partly cloudy` }] })
);

// 호스트: 같은 프로세스 안에서 서버와 잇고, 클라이언트가 보내는 메서드 이름을 찍는다
const [clientT, serverT] = InMemoryTransport.createLinkedPair();
const send = clientT.send.bind(clientT);
clientT.send = (m) => { console.log("C->S", m.method, m.params?.protocolVersion ?? ""); return send(m); };
await server.connect(serverT);
const client = new Client({ name: "demo-host", version: "1.0.0" });
await client.connect(clientT);
console.log("instructions:", client.getInstructions());

// 1. tools/list 결과를 LLM API 의 tools 파라미터 모양으로 바꾼다
const { tools } = await client.listTools();
const anthropicTools = tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema }));
const openaiTools = tools.map((t) => ({ type: "function", name: t.name, description: t.description, parameters: t.inputSchema }));
console.log("anthropic:", JSON.stringify(anthropicTools[0]));
console.log("openai:", JSON.stringify(openaiTools[0]));

// 2. 모델이 이런 tool_use 블록을 돌려줬다고 가정한다. input 이 그대로 tools/call 의 arguments 가 된다
const toolUse = { type: "tool_use", id: "toolu_demo", name: "get_weather", input: { location: "Seoul" } };
const result = await client.callTool({ name: toolUse.name, arguments: toolUse.input });
console.log("tool_result:", JSON.stringify({ type: "tool_result", tool_use_id: toolUse.id, content: result.content }));
await client.close();
```

`node post-demo.mjs` 의 출력은 이렇다.

```text
C->S initialize 2025-11-25
C->S notifications/initialized 
instructions: Use get_weather for current conditions only.
C->S tools/list 
anthropic: {"name":"get_weather","description":"Get current weather information for a location","input_schema":{"type":"object","properties":{"location":{"type":"string"}},"required":["location"],"$schema":"http://json-schema.org/draft-07/schema#"}}
openai: {"type":"function","name":"get_weather","description":"Get current weather information for a location","parameters":{"type":"object","properties":{"location":{"type":"string"}},"required":["location"],"$schema":"http://json-schema.org/draft-07/schema#"}}
C->S tools/call 
tool_result: {"type":"tool_result","tool_use_id":"toolu_demo","content":[{"type":"text","text":"Seoul: 15C, partly cloudy"}]}
```

도구 정의의 변환은 필드 이름을 바꾸는 것이 전부다. MCP의 `inputSchema` 가 Anthropic에서는 `input_schema`, OpenAI에서는 `parameters` 가 된다. SDK가 schema에 `$schema` 를 덧붙인다는 점도 출력에서 보인다. 반대 방향도 짧다. Anthropic의 `tool_use.input` 은 객체라서 그대로 `tools/call` 의 `arguments` 가 된다. 결과 쪽도 text 블록은 모양이 같아 그대로 넘어가지만, 이미지나 에러 결과는 모양이 달라 Anthropic SDK의 MCP helper가 따로 변환한다. 위 OpenAI 쪽 모양은 Responses API의 형식이다. OpenAI가 돌려주는 호출의 `arguments` 는 [JSON 문자열](https://developers.openai.com/api/docs/guides/function-calling)이라서 넘기기 전에 `JSON.parse` 를 한 번 거쳐야 한다. 위 코드는 Anthropic 모양의 `tool_use` 블록만 만들었으므로 이 parse 단계는 출력에 나오지 않는다.


### MCP가 더하는 네 가지

그렇다면 MCP는 function calling에 무엇을 더하는가? 2025-11-25 개정판 기준으로 네 가지다.

- **동적 발견**: 빌드 타임에 도구 목록을 모르고 런타임에 `tools/list` 로 가져온다. 서버는 `notifications/tools/list_changed` 로 연결 도중 목록이 바뀌었다고 알릴 수 있다
- **Stateful session**: `initialize` 로 연결을 맺고 그 안에서 요청이 오간다. 종료용 JSON-RPC 메시지는 따로 없고 전송을 닫는 것으로 끝낸다
- **Tool 외 primitive**: Resource·Prompt·Sampling·Roots·Elicitation을 capability negotiation으로 노출한다. capability negotiation은 `initialize` 에서 양쪽이 지원하는 기능을 서로 알리는 단계다
- **양방향성**: 서버가 Sampling으로 클라이언트의 LLM에게 completion을 거꾸로 요청할 수 있다(2026-07-28 개정판에서 deprecated)

### 2026-07-28 개정판 이후

2026-10-08 현재 공식 사이트에서 latest로 열리는 것은 [2026-07-28 개정판](https://modelcontextprotocol.io/specification/2026-07-28/changelog)이고, 여기서 이 목록의 절반이 바뀌었다. 먼저 `initialize` 와 `notifications/initialized` 로 이루어진 handshake와 프로토콜 수준의 세션이 사라졌다. 대신 매 요청이 `_meta` 에 프로토콜 버전과 클라이언트 capabilities를 싣는다. 이 필드는 메시지의 본래 인자와 별도로 메타데이터를 붙이도록 MCP가 예약해 둔 자리다. 서버는 `server/discover` 를 반드시 구현해야 한다(MUST). 서버가 지원하는 프로토콜 버전, capabilities, 서버 정보를 돌려주는 RPC로, 클라이언트는 다른 요청보다 먼저 이것을 불러 지원 버전과 capabilities를 미리 확인할 수 있다.

서버가 먼저 보내던 요청은 Multi Round-Trip Requests(MRTR)라는 패턴으로 바뀌었다. 서버가 요청을 따로 보내는 대신 추가 입력이 필요하다는 중간 결과(`input_required`)를 돌려주고, 클라이언트가 그 입력을 채워 원래 요청을 다시 보내는 방식이다.

Sampling과 Roots는 Logging과 함께 deprecated 되었다. 명세에 남아 동작은 하지만 새 구현은 채택하지 말라는 뜻이고, 스펙은 Sampling 대신 LLM provider API에 직접 붙으라고 권한다.

다만 SDK의 기본 동작은 아직 옛 방식이다. TypeScript SDK 1.32.1은 최신 버전 상수가 `2025-11-25` 라서 2026-07-28 개정판을 모르고, 2.3.1은 이 개정판을 지원하지만 버전 협상 기본값이 `legacy` 다. 위 출력의 첫 줄 `initialize 2025-11-25` 가 그 결과다.

그러면 네 가지 중 남는 것은 동적 발견과 Tool 외 primitive(Resource, Prompt, Elicitation)다. 동적 발견도 모양이 조금 바뀌어서, 목록 변경 알림은 `subscriptions/listen` stream에 opt-in 한 클라이언트만 받는다. 결국 MCP가 function calling과 갈리는 지점은 세션이나 양방향성보다 **도구 목록과 context를 런타임에 주고받는 계약**에 있다.


### API가 MCP 클라이언트가 될 때

이 계약 중 어디까지가 모델에게 닿는지는 Anthropic의 [MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector)(beta)가 보여 준다. Messages API가 원격 MCP 서버에 직접 붙는 기능인데, 문서의 Limitations는 MCP 명세의 기능 가운데 "only tool calls are currently supported" 라고 적고, "Local STDIO servers cannot be connected directly" 라고 적는다. 같은 문서는 로컬 서버나 MCP prompt, resource가 필요하면 MCP SDK로 연결을 직접 관리하면서 Anthropic SDK의 변환 helper를 쓰라고 안내한다.

즉 function calling layer에서 MCP를 소비하면 Tool만 남는다. Resource와 Prompt는 그것을 화면이나 context로 옮겨 줄 호스트가 있어야 의미를 갖는다. OpenAI도 function calling 가이드에서 MCP 서버의 기능을 built-in tool로 쓰는 길을 소개한다. OpenAI의 [MCP servers 가이드](https://developers.openai.com/api/docs/guides/tools-connectors-mcp)는 도구 목록을 가져오고 호출하는 방법만 설명하고, Resource나 Prompt를 지원하는지는 적지 않는다.


### 동적 발견이 여는 공격면

도구의 description과 도구 호출 결과는 호스트를 거쳐 모델의 context에 들어간다. 그러니 서버가 그 자리에 무엇을 쓰든 모델은 그것을 읽는다. 대표적인 공격 두 가지가 모두 여기서 나온다.

- **Tool Poisoning Attack(TPA)**: [Invariant Labs](https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks)가 2025년 4월에 명명하고 PoC를 공개한 공격이다. MCP 서버의 도구 설명(description)에 악의적 지시사항을 숨겨 두면, 모델은 사용자에게 보이지 않는 그 텍스트를 읽고 사용자 모르게 따를 수 있다.

- **Rug Pull**: Invariant Labs가 같은 글에서 설명한 공격으로, 사용자가 승인한 뒤에 서버가 도구 정의를 바꾼다. [Simon Willison이 인용한](https://simonwillison.net/2025/Apr/9/mcp-prompt-injection/) Elena Cross의 예처럼, 1일 차에 안전해 보이는 도구를 승인했는데 7일 차에는 그 도구가 API 키를 공격자에게 보내도록 바뀌어 있는 식이고, 도구 정의를 설치 시점이 아니라 런타임에 서버에서 받아 오는 구조라서 생긴다. [tool 명세](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)는 어떤 도구가 모델에 노출되는지 보여 주는 UI를 권할(SHOULD) 뿐 바뀐 정의를 다시 승인받으라고 요구하지는 않으므로, 재승인은 호스트의 몫이다.


## 마무리

정리하면, MCP는 function calling을 대체하는 것이 아니라 그 위에 얹힌 표준이다. 모델이 도구를 부르는 방식은 여전히 `tools` 파라미터와 `tool_use` 루프이고, 두 프로토콜 사이는 호스트가 번역한다. 2025-11-25 개정판에서 MCP가 더한 것은 동적 발견, stateful session, Tool 밖의 primitive, 서버에서 클라이언트로 향하는 호출이었다. 2026-07-28 개정판에서 세션이 사라지고 Sampling이 deprecated 되면서 남는 것은 도구 목록과 context를 런타임에 주고받는 계약이다. 그 계약 때문에 도구 정의를 오염시키거나 몰래 바꾸는 공격도 같은 자리에서 생긴다. MCP 서버를 하나 더 붙일 때는 그 서버가 무엇을 할 수 있는지와 함께, 정의가 바뀌었을 때 호스트가 알려 주는지도 확인해 보길 권한다.

MCP가 에이전트에게 무엇을 할 수 있게 해줄지의 문제라면, 무엇을 알려줄지는 `CLAUDE.md`나 `AGENTS.md` 같은 context file의 문제다. 그 파일들이 에이전트에게 어떻게 읽히고 어디까지 지켜지는지는 [Context file](/260529)에서 다룬다.

:::ref
- [docs] [MCP Specification 2025-11-25, Lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle)
- [docs] [MCP Specification 2026-07-28, Versioning](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning)
:::
