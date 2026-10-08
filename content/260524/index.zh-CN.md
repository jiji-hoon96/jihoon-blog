---
emoji: 🔌
title: "MCP 与 function calling"
seoTitle: "MCP 与 function calling 有何不同: 协议结构与调用流程"
date: "2026-05-24"
updatedAt: "2026-10-08"
locale: zh-CN
translationOf: '260524'
sourceHash: 2293f3e018d512db6374f7146c812d706079a5d30ab86c875e6a6dd19b522ea4
categories: AI 开发工具 Claude MCP CodeGraph
description: "从协议结构梳理 MCP（Model Context Protocol）与 function calling 的区别：六种 primitive、stdio 与 Streamable HTTP、从 tools/list 到 tool_use 循环的调用流程，以及 Tool Poisoning 等安全问题。"
keywords: "MCP, Model Context Protocol, MCP 与 function calling 区别, MCP primitive, tools/list, Streamable HTTP, Tool Poisoning Attack, MCP 安全"
---

本文想聊一聊 **MCP（Model Context Protocol）与 function calling 有什么不同**。

本文写给这样的开发者：在 Claude Code 或 Cursor 中接入了 MCP server，却很难说清它与 LLM API 的 function calling 在哪里分道扬镳。先说答案：MCP 并不取代 function calling。host 应用把从 MCP server 拿到的工具列表转换成 function calling 的 `tools` 参数传入，再把模型选中的调用转交回 MCP server。读完之后，你会知道 MCP 在此之上增加的四点差异分别来自协议的哪个部分，哪些差异在 2026-07-28 修订版之后依然存在，以及这种结构会打开怎样的攻击面。

笔者作为前端开发者，日常都会使用 Claude，但每次新增一个 MCP server 时，对于这些工具究竟如何进入模型的视野，总是有些模糊。


## MCP（Model Context Protocol）

MCP（Model Context Protocol）解决的是“**该让智能体能做什么**”的问题。

展开来说，AI 智能体若要向 Slack 发送消息，就必须能调用 Slack API；要创建 GitHub issue，就必须能调用 GitHub API；要查询 Postgres，就必须能处理 DB 连接。MCP 就是把所有这些外部系统集成**统一到一个标准协议之下**。（也就是任何 client 与任何 server 都能通过同一个接口连接。）

MCP 是 Anthropic 于 **2024 年 11 月 25 日**首次发布的开放标准。到 **2025 年 12 月 9 日**，Anthropic、Block、OpenAI 三家公司作为共同创始方，将 MCP 规范捐赠给 Linux Foundation 旗下的 **Agentic AI Foundation（AAIF）**。Google、Microsoft、AWS、Cloudflare、Bloomberg 也以 platinum member 身份加入。（截至 2025 年 12 月捐赠时，SDK 月下载量已超过 9,700 万次，活跃的公开 MCP server 超过 1 万个。）

MCP 是建立在 JSON-RPC 之上的协议。[JSON-RPC 2.0](https://www.jsonrpc.org/specification) 是一种以 JSON 作为 wire format 的 stateless 轻量级 RPC（Remote Procedure Call）协议。它与传输层无关，可以运行在 HTTP、TCP 或标准输入输出之上。它也定义了 notification（无需响应的调用）和 batch 调用，但 MCP 在 [2025-06-18 修订版](https://modelcontextprotocol.io/specification/2025-06-18/changelog)中去掉了 batch。本文以 2025-11-25 修订版为准，在这一版中，MCP 是为每个连接建立 session 的 stateful 协议。之后的修订版改了什么，等看完调用流程再讨论。


### 协议内部

2025-11-25 规范的概览把 client 与 server 交换的功能分为六种 primitive。这里的 primitive 与 JavaScript 的原始类型（如 string、number）无关，指的是协议所定义的基本交互类型。server 侧的三种以及 client 侧的 Sampling、Roots 从第一个修订版（2024-11-05）起就已存在，Elicitation 则是在 2025-06-18 修订版中加入的。

**Server 侧 primitive**

- **Tool**（model-controlled）：模型自行判断是否调用并执行的操作，可能产生副作用（side effect）
- **Resource**（application-controlled）：由 URI 标识的数据。规范中只有读取内容的 `resources/read`，没有写入方法。要暴露哪些 resource，由 host application 决定
- **Prompt**（user-controlled）：由用户通过斜杠命令等方式明确触发的可复用模板

**Client 侧 primitive**

- **Sampling**：让 server 反向请求 client 的 LLM 生成 completion，从而在 client 与 server 之间建立双向结构。它的用途是让 server 在执行工具时需要生成文本，可以不用自己的 API key，借用 client 所用的模型。在 2026-07-28 修订版中，它成为计划移除的 deprecated 状态
- **Roots**：client 向 server 说明“可操作范围到这里为止”的 workspace 边界信息
- **Elicitation**：server 在执行工具的过程中，以结构化形式向用户请求补充输入

这种区分之所以重要，是因为**由谁决定调用或提供**各不相同。Tool 由模型判断并执行，因此存在误调用风险；Prompt 由用户明确选择。Resource 默认由应用选择，但规范也允许依据启发式规则或模型的选择自动纳入的实现。因此不能说 Resource 总是比 Tool 更安全。client 侧的三种方向正好相反：由 server 发出请求，是否响应由 client 决定。

[标准传输方式](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)有两种，规范也允许其他自定义传输（MAY）。一种是 **stdio**：将 MCP server 作为本地子进程运行，通过标准输入输出通信，适合文件系统、git 等在本地工作的工具。另一种是 **Streamable HTTP**：在 HTTP POST 上叠加 SSE streaming，形成近似双向的通信方式，适合远程 server、OAuth 认证、多 client 连接、云端部署等跨网络场景。

这里的 SSE（Server-Sent Events）是让 server 通过 HTTP 连接向 client 单向推送数据的方式，如今定义在 [WHATWG HTML 标准](https://html.spec.whatwg.org/multipage/server-sent-events.html)中。它的 media type 是 `text/event-stream`，在 JavaScript 中通过 `EventSource` API 访问。与 WebSocket 不同，它是单向的，但由于运行在 HTTP 之上，对 proxy 和 firewall 更友好。可以说 Streamable HTTP 正是利用 SSE 模拟双向通信；它在 **2025 年 3 月 26 日**的 spec（version `2025-03-26`）中引入，取代了原有的 HTTP+SSE 传输方式。


### LLM 调用 MCP 工具的流程

了解 primitive 与传输方式后，接下来看看 **LLM 实际如何发现并调用 MCP 工具**。

在 2025-11-25 修订版中，连接开始时会按以下顺序进行 handshake。截至 2026-10-08，TypeScript SDK 的 1.32.1 和 v2 系列的 2.3.1 在默认配置下也按这个顺序运行。

- **Client → Server**：发送 `initialize` 请求（传递支持的协议版本和 client capabilities）
- **Server → Client**：返回 `initialize` 响应（server capabilities + 可选的 `instructions` 字段）
- **Client → Server**：发送 `notifications/initialized` 通知
- **Client → Server**：发送 `tools/list` 请求 → 获取可用工具列表
- （之后）LLM 决定调用工具 → client 发送 `tools/call` → 接收结果

这里经常被忽略的是 **`initialize` 响应中的 `instructions` 字段**。这是 server 用文字说明工具该如何使用的位置，而[规范 schema 的注释](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2025-11-25/schema.ts)只写了这些内容可以（MAY）加入 system prompt。是否加入由 host 决定。在下面的示例中，TypeScript SDK 1.32.1 只是通过 `getInstructions()` 把这个值交出来，并不会把它传给模型。笔者认为这个位置与后面要讲的 Tool Poisoning 属于同一性质，因为 server 写下的文字可能被放到模型面前。

那么，tool 定义本身又是如何进入 LLM 视野的？MCP 的 tool 定义采用如下 JSON Schema 形式。

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

host 会把通过 `tools/list` 获取的列表转换成 **Anthropic Messages API 的 `tools` 参数**，或 **OpenAI function calling 的 `tools` 参数**，再随 LLM API 请求一同发送。以 Anthropic 为例，传入 tool 参数后，[系统会自动添加 special system prompt](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)，使模型理解工具调用方式。它的长度因模型而异。在 2026-10-08 查看的文档表格中，以 `tool_choice: auto` 为准，现行模型为 286～675 个 token。

当 LLM 判断应该调用工具时，响应中会包含 `tool_use` block（`{"type": "tool_use", "name": ..., "input": ...}`），并以 `stop_reason` 为 `tool_use` 结束。host 收到后，会向实际的 MCP server 发送 `tools/call`，再把返回结果装进下一条 user message 的 `tool_result` block 中发回 LLM。**这个循环会持续进行，直到 `stop_reason` 从 `tool_use` 变成其他值（如 `end_turn`、`max_tokens`）。** 我们通常所说的“智能体在工作”，实际上很接近这种调用、结果、调用的循环的连续运行。

画成图的话，模型与 MCP server 之间没有连线。模型只看到通过 `tools` 收到的定义，MCP server 接收的是 host 的请求，而不是模型的请求。连接两个协议的是中间的 host。

![左侧 LLM API 与中间 host 之间有 tools、tool_use、tool_result 箭头往来，host 与右侧 MCP server 之间有 tools/list、tools/call 箭头往来。LLM API 与 MCP server 之间没有连线](1.png?w=720)

为了看看这个转换实际有多短，笔者把它跑了一遍。2026-10-08 使用 Node v24.16.0、`@modelcontextprotocol/sdk` 1.32.1、`zod` 4.6.5 运行。传输用的不是 stdio，而是在同一进程内连接 server 与 client 的 `InMemoryTransport`，也没有调用 LLM。`tool_use` block 是按照 Anthropic 文档中的形状手工构造的。

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

代码中间覆盖 `clientT.send` 的两行，只是为了打印 client 发出的每条消息的方法名，与转换无关。`node post-demo.mjs` 的输出如下。

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

转换只不过是改字段名。MCP 的 `inputSchema` 在 Anthropic 中变成 `input_schema`，在 OpenAI 中变成 `parameters`。从输出中还能看到 SDK 会在 schema 里加上 `$schema`。反方向同样简短。Anthropic 的 `tool_use.input` 是对象，所以直接成为 `tools/call` 的 `arguments`。上面 OpenAI 一侧的形状是 Responses API 的格式。OpenAI 返回的调用中的 `arguments` 是 [JSON 字符串](https://developers.openai.com/api/docs/guides/function-calling)，因此在转交之前需要先经过一次 `JSON.parse`。上面的代码只构造了 Anthropic 形状的 `tool_use` 块，所以这个 parse 步骤不会出现在输出中。


### MCP 增加的四点

那么，MCP 给 function calling 增加了什么？以 2025-11-25 修订版为准，有四点。

- **动态发现**：构建时并不知道工具列表，而是在运行时通过 `tools/list` 获取。server 可以通过 `notifications/tools/list_changed` 通知连接期间列表发生了变化
- **Stateful session**：用 `initialize` 建立连接，请求在其中往来。没有专门的结束消息，关闭传输本身就是结束
- **Tool 以外的 primitive**：通过 capability negotiation 暴露 Resource、Prompt、Sampling、Roots、Elicitation。capability negotiation 是在 `initialize` 中双方互相告知所支持功能的阶段
- **双向性**：server 可以通过 Sampling 反向请求 client 的 LLM 生成 completion（2026-07-28 修订版中已 deprecated）

然而截至 2026-10-08，官方网站作为 latest 打开的是 [2026-07-28 修订版](https://modelcontextprotocol.io/specification/2026-07-28/changelog)，这份列表在其中变了一半。首先，由 `initialize` 与 `notifications/initialized` 构成的 handshake 以及协议层面的 session 消失了。取而代之的是，每个请求都在 `_meta` 中携带协议版本和 client capabilities。这个字段是 MCP 预留的位置，用于在消息本身的参数之外附加元数据。server 必须（MUST）实现 `server/discover`。这是 client 可以在其他请求之前调用的 RPC，用来获取 server 支持的协议版本、capabilities 和 server 信息。

原先由 server 先发出的请求，被一种名为 Multi Round-Trip Requests（MRTR）的模式取代。server 不再单独发出请求，而是返回一个表示还需要额外输入的中间结果（`input_required`），client 补上这些输入后重新发送原来的请求。

Sampling 和 Roots 与 Logging 一起被标为 deprecated。它们仍留在规范中并且可以工作，但新的实现不应采用，规范建议不要用 Sampling，而是直接对接 LLM provider 的 API。

不过，SDK 的默认行为仍是旧方式。TypeScript SDK 1.32.1 的最新版本常量是 `2025-11-25`，因此并不知道 2026-07-28 修订版；2.3.1 支持这一修订版，但版本协商的默认值是 `legacy`。上面输出的第一行 `initialize 2025-11-25` 就是其结果。

这样一来，四点中留下的是动态发现和 Tool 以外的 primitive（Resource、Prompt、Elicitation）。动态发现的形态也略有变化：列表变更通知只发给 opt-in 了 `subscriptions/listen` 流的 client。归根结底，MCP 与 function calling 分道扬镳之处，与其说在 session 或双向性，不如说在于**在运行时交换工具列表与 context 的约定**。


### 当 API 成为 MCP client

这份约定中有多少能到达模型，Anthropic 的 [MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector) 给出了答案。这是 Messages API 直接连接远程 MCP server 的功能，而文档的 Limitations 写道，在 MCP 规范的功能中 "only tool calls are currently supported"，并写道 "Local STDIO servers cannot be connected directly"。同一份文档还说明，如果需要本地 server 或 MCP 的 prompt、resource，就用 MCP SDK 自行管理连接，同时使用 Anthropic SDK 的转换 helper。

也就是说，在 function calling 层消费 MCP 时，只剩下 Tool。Resource 和 Prompt 要有 host 把它们带到界面或 context 中才有意义。OpenAI 也在 function calling 指南中介绍了把 MCP server 的功能当作 built-in tool 使用的方式。OpenAI 的 Remote MCP 指南只说明了如何列出和调用工具，没有写明是否支持 Resource 或 Prompt。


### 动态发现打开的攻击面

**MCP 不会自动完成授权管理。** [tool 规范](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)建议在循环中保留一个能够拒绝 tool 调用的人（SHOULD），并要求除非来自可信 server，否则不得信任 tool annotation（MUST）。信任哪些 server、工具日后是否仍保持相同行为，由 host 和用户负责。

两种代表性攻击都源于工具定义在运行时传递这一点。

- **Tool Poisoning Attack（TPA）**：[Invariant Labs](https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks) 于 2025 年 4 月命名并公开 PoC 的攻击。若把恶意指令隐藏在 MCP server 的工具 description 中，模型可能会把它误认为用户指令并照做。这段文本对用户不可见，对模型却可见。

- **Rug Pull**（Silent Redefinition）：在用户批准之后，server 修改工具定义的攻击。Invariant Labs 在同一篇文章中最先描述了它，Silent Redefinition 这个名字来自 Elena Cross 的文章，[Simon Willison](https://simonwillison.net/2025/Apr/9/mcp-prompt-injection/) 在 2025 年 4 月 9 日引用并整理了它。工具起初完全合法，用户检查、批准并将它集成进 workflow。几周后，工具定义被悄悄修改，加入恶意指令。用户不会被要求重新批准，行为却已暗中改变。

Rug Pull 发生的位置，与让动态发现成为可能的 `notifications/tools/list_changed` 相同。这个名称属于 2025-11-25 修订版；在 2026-07-28 修订版中，如前所述，只有 opt-in 的 client 才会收到这个通知。规范只规定了如何通知列表已变化，并没有要求把变化后的定义重新展示给用户。Willison 写道，MCP client 应当一开始就向用户展示工具描述，并在描述变化时发出警告。变更之后重新取得批准，是 host 的职责，而不是规范的职责。


## 总结

总而言之，MCP 并不是要取代 function calling，而是建立在它之上的标准。模型调用工具的方式仍然是 `tools` 参数和 `tool_use` 循环，两个协议之间由 host 负责翻译。在 2025-11-25 修订版中，MCP 增加的是动态发现、stateful session、Tool 以外的 primitive，以及从 server 发往 client 的调用。在 2026-07-28 修订版中 session 消失、Sampling 被标为 deprecated 之后，留下的是在运行时交换工具列表与 context 的约定。正因为有这份约定，污染工具定义或悄悄修改它们的攻击也从同一个地方产生。再接入一个 MCP server 时，建议不仅确认这个 server 能做什么，也确认定义变化时 host 是否会提醒你。

如果说 MCP 关乎该让智能体能做什么，那么该告诉它什么，就是 `CLAUDE.md`、`AGENTS.md` 这类上下文文件的问题。这些文件如何被智能体读取、其中的指令能被遵守到什么程度，在[上下文文件](/260529)中讨论。


## 参考资料

:::ref
- [docs] [MCP Specification 2025-11-25, Lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle)
- [docs] [MCP Specification 2026-07-28, Versioning](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning)
- [docs] [OpenAI, Remote MCP](https://developers.openai.com/api/docs/guides/tools-remote-mcp)
:::
