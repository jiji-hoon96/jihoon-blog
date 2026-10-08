---
emoji: 🔌
title: "MCP 与 function calling"
seoTitle: "MCP 与 function calling 有何不同: 协议结构与调用流程"
date: "2026-05-24"
locale: zh-CN
translationOf: '260524'
sourceHash: c8c4c1ecc1bcc3dec03f51f86523bff1a97cfb134b8b21433ff155fcea071b34
categories: AI 开发工具 Claude MCP CodeGraph
description: "从协议结构梳理 MCP（Model Context Protocol）与 function calling 的区别：六种 primitive、stdio 与 Streamable HTTP、从 tools/list 到 tool_use 循环的调用流程，以及 Tool Poisoning 等安全问题。"
keywords: "MCP, Model Context Protocol, MCP 与 function calling 区别, MCP primitive, tools/list, Streamable HTTP, Tool Poisoning Attack, MCP 安全"
---

本文想聊一聊 **MCP（Model Context Protocol）与 function calling 有什么不同**。

本文写给这样的开发者：在 Claude Code 或 Cursor 中接入了 MCP server，却很难说清它与 LLM API 的 function calling 在哪里分道扬镳。先说答案，区别有四点：在运行时获取工具列表的动态发现、定义了生命周期的 stateful session、Tool 以外的 primitive，以及 server 可以反过来调用 client 端 LLM 的双向性。读完之后，你会知道这四点分别来自协议的哪个部分，以及这种结构会引出哪些安全问题。

笔者作为前端开发者，日常都会使用 Claude，但每次新增一个 MCP server 时，对于这些工具究竟如何进入模型的视野，总是有些模糊。


## MCP（Model Context Protocol）

MCP（Model Context Protocol）解决的是“**该让智能体能做什么**”的问题。

展开来说，AI 智能体若要向 Slack 发送消息，就必须能调用 Slack API；要创建 GitHub issue，就必须能调用 GitHub API；要查询 Postgres，就必须能处理 DB 连接。MCP 就是把所有这些外部系统集成**统一到一个标准协议之下**。（也就是任何 client 与任何 server 都能通过同一个接口连接。）

MCP 是 Anthropic 于 **2024 年 11 月 25 日**首次发布的开放标准。到 **2025 年 12 月 9 日**，Anthropic、Block、OpenAI 三家公司作为共同创始方，将 MCP 规范捐赠给 Linux Foundation 旗下的 **Agentic AI Foundation（AAIF）**。Google、Microsoft、AWS、Cloudflare、Bloomberg 也以 platinum member 身份加入。（截至 2025 年 12 月捐赠时，SDK 月下载量已超过 9,700 万次，活跃的公开 MCP server 超过 1 万个。）

MCP 是建立在 JSON-RPC 之上的有状态（stateful）session 协议。**JSON-RPC** 是一种以 JSON 作为 wire format 的 stateless 轻量级 RPC（Remote Procedure Call）协议。它与传输层无关，可以运行在 HTTP、TCP 或标准输入输出之上，也支持 notification（无需响应的调用）和 batch 调用。


### 协议内部

MCP 中 client 与 server 之间的所有交互，都用六种 primitive 之一表示。这里的 primitive 与 JavaScript 的原始类型（如 string、number）无关，指的是协议所定义的基本交互类型。最初只有 server 侧的三种 primitive，2025-06-18 spec 又补充了 client 侧的三种，如今共计六种标准 primitive。

**Server 侧 primitive**

- **Tool**（model-controlled）：模型自行判断是否调用并执行的操作，可能产生副作用（side effect）
- **Resource**（application-controlled）：由 URI 标识的只读数据。要暴露哪些 resource，由 host application 决定
- **Prompt**（user-controlled）：由用户通过斜杠命令等方式明确触发的可复用模板

**Client 侧 primitive**

- **Sampling**：让 server 反向请求 client 的 LLM 生成 completion，从而在 client 与 server 之间建立双向结构
- **Roots**：client 向 server 说明“可操作范围到这里为止”的 workspace 边界信息
- **Elicitation**：server 在执行工具的过程中，以结构化形式向用户请求补充输入

区分这六种 primitive 很重要，因为**由谁决定调用或提供**，其权限各不相同。Tool 由模型自主判断并执行，因此存在误调用风险；Resource 由应用负责筛选，相对安全；Prompt 由用户明确触发，可控性最高。Sampling、Roots、Elicitation 则通过 client 侧控制进一步细化权限模型。

传输方式**恰好只有两种**。这是有意为之，目的是避免生态分裂成数十种相互竞争的协议。一种是 **stdio**：将 MCP server 作为本地子进程运行，通过标准输入输出通信，适合文件系统、git 等在本地工作的工具。另一种是 **Streamable HTTP**：在 HTTP POST 上叠加 SSE streaming，形成近似双向的通信方式，适合远程 server、OAuth 认证、多 client 连接、云端部署等跨网络场景。

这里的 SSE（Server-Sent Events）是让 server 通过 HTTP 连接向 client 单向推送数据的 W3C 标准。它的 media type 是 `text/event-stream`，在 JavaScript 中通过 `EventSource` API 访问。与 WebSocket 不同，它是单向的，但由于运行在 HTTP 之上，对 proxy 和 firewall 更友好。可以说 Streamable HTTP 正是利用 SSE 模拟双向通信；它在 **2025 年 3 月 26 日**的 spec（version `2025-03-26`）中引入，取代了原有的 HTTP+SSE 传输方式。


### LLM 调用 MCP 工具的流程

了解 primitive 与传输方式后，接下来看看 **LLM 实际如何发现并调用 MCP 工具**。

MCP session 启动时，会按以下顺序进行 handshake。

- **Client → Server**：发送 `initialize` 请求（传递支持的协议版本和 client capabilities）
- **Server → Client**：返回 `initialize` 响应（server capabilities + 可选的 `instructions` 字段）
- **Client → Server**：发送 `notifications/initialized` 通知
- **Client → Server**：发送 `tools/list` 请求 → 获取可用工具列表
- （之后）LLM 决定调用工具 → client 发送 `tools/call` → 接收结果

这里有一点经常被忽略：**`initialize` 响应中的 `instructions` 字段**。server 若在该字段中返回文本，其内容实际上会被加入 LLM 的 system prompt。换言之，spec 中存在一个正式 slot，允许 MCP server 直接向 LLM 注入“应该如何使用这些工具”的指南。（后文将介绍的 Tool Poisoning Attack 之所以危险，原因之一正是这个 slot 的存在。）

那么 tool 定义本身怎样进入 LLM 的视野？MCP tool 定义采用以下 JSON Schema 形式。

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

client 会把通过 `tools/list` 获取的列表转换成 **Anthropic Messages API 的 `tools` 参数**，或 **OpenAI function calling 的 `tools` 参数**，再随 LLM API 请求一同发送。以 Anthropic 为例，传入 tool 参数后，系统会自动添加 **special system prompt**，使模型理解工具调用方式。（在 Claude 4.x 中，以 `tool_choice: auto` 为准，仅这段 prompt 就会增加 346 个 token。）

当 LLM 判断应该调用工具时，响应中会包含 `tool_use` block（`{"type": "tool_use", "name": ..., "input": ...}`），并以 `stop_reason` 为 `tool_use` 结束。client 收到后，会向实际的 MCP server 发送 `tools/call`，再把返回结果装进下一条 user message 的 `tool_result` block 中发回 LLM。**这个循环会持续进行，直到 `stop_reason` 从 `tool_use` 变成其他值（如 `end_turn`、`max_tokens`）。**我们通常所说的“智能体在工作”，实际上很接近这种调用、结果、调用的循环的连续运行。

那么 MCP 与单纯的 function calling 有什么不同？可以归纳为四点。

- **动态发现**：不在 build time 预先知道工具列表，而是在 runtime 通过 `tools/list` 获取。也可通过 `notifications/tools/list_changed` 在 session 中途变更
- **Stateful session**：定义了 lifecycle phase（initialize → operation → shutdown），可以干净地结束
- **Tool 以外的 primitive**：通过 capability negotiation 暴露 Prompt、Resource、Sampling、Roots、Elicitation
- **双向性**：在 spec 层面，server 也可通过 sampling 反向调用 client 的 LLM

（正因如此，MCP 有时也被称为“面向智能体的 function calling 通用标准”。）


### 那么 MCP 安全吗？

这里必须明确一点：**MCP 不会自动完成授权管理。** 哪些 server 值得智能体信任、哪些工具会产生何种副作用、工具日后是否仍保持相同行为，都需要用户自行负责。

最好了解两种代表性攻击。

- **Tool Poisoning Attack（TPA）**：Invariant Labs 于 2025 年 4 月命名并公开 PoC 的攻击。若把恶意指令隐藏在 MCP server 的工具 description 中，模型可能会把它误认为用户指令并照做。这段文本对用户不可见，对模型却可见。

- **Rug Pull**（Silent Redefinition）：Simon Willison 在 2025 年 4 月 9 日发布的分析中讨论的概念。工具起初完全合法，用户检查、批准并将它集成进 workflow。几周后，工具定义被悄悄修改，加入恶意指令。用户不会被要求重新批准，行为却已暗中改变。

**2026 年 4 月 15 日**发生了一起安全事件。OX Security 披露了影响所有主流 MCP SDK（Python、TypeScript、Java、Rust）的系统性 RCE 漏洞。超过 1.5 亿次下载、约 7,000 个公开 server、估计约 20 万个存在漏洞的 deployment 都处于影响范围。相关漏洞获分配超过 14 个 CVE，Cursor、VS Code、Windsurf、Claude Code、Gemini-CLI 均受影响。

生态事后如何应对？Anthropic **并未修改协议架构本身**，而是更新 `SECURITY.md`，明确规定使用 stdio adapter 时，下游开发者须负责 input sanitization。在 spec 层面，**2025-06-18 修订强制采用 OAuth 2.1 + RFC 8707 Resource Indicators**，以阻止 token 重用攻击；**2025-11-25 修订则引入 incremental scope consent**，让用户逐步同意当下所需的最小权限。即便如此，仅 2026 年 1～2 月就发布了 30 多个 MCP 相关 CVE，其中 **command injection 占 43%**。**安全领域依然处于持续演进之中。**


## 总结

总而言之，MCP 并不是要取代 function calling，而是建立在它之上的标准。模型调用工具的方式仍然是 `tools` 参数和 `tool_use` 循环，MCP 增加的是在运行时交换工具列表的方法、session 的生命周期、Tool 以外的 primitive，以及从 server 发往 client 的调用。正因为工具定义在运行时传递，污染这些定义或悄悄修改它们的攻击也从同一个地方产生。

如果说 MCP 关乎该让智能体能做什么，那么该告诉它什么，就是 `CLAUDE.md`、`AGENTS.md` 这类上下文文件的问题。这些文件如何被智能体读取、其中的指令能被遵守到什么程度，在[AI 智能体工具](/260529)中讨论。


## 参考资料

:::ref
- [docs] [MCP Specification 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle)
- [docs] [Anthropic Tool Use Overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [article] [Simon Willison, MCP Prompt Injection](https://simonwillison.net/2025/Apr/9/mcp-prompt-injection/)
- [article] [OX Security, MCP Supply Chain Advisory](https://www.ox.security/blog/mcp-supply-chain-advisory-rce-vulnerabilities-across-the-ai-ecosystem/)
:::
