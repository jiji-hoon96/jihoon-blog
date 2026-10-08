---
emoji: 🔌
title: "MCP and Function Calling"
seoTitle: "How MCP Differs from Function Calling: Protocol and Calls"
date: "2026-05-24"
updatedAt: "2026-10-08"
locale: en
translationOf: '260524'
sourceHash: 40b731774ee30c6a2b8287ddcb0a8bf0acc4f1476512e95a6310a8b8a18e50fa
categories: AI Developer-Tools Claude MCP CodeGraph
description: "How MCP differs from function calling: six primitives, stdio and Streamable HTTP, the tools/list to tool_use loop flow, and risks like Tool Poisoning."
keywords: "MCP, Model Context Protocol, MCP vs function calling, MCP primitives, tools/list, Streamable HTTP, Tool Poisoning Attack, MCP security"
---

In this post, I want to talk about **how MCP (Model Context Protocol) differs from function calling**.

This is for developers who use MCP servers with Claude Code or Cursor but have found it hard to explain where MCP parts ways with the function calling in LLM APIs. The short answer is that MCP does not replace function calling. The host application converts the tool list it receives from an MCP server into the `tools` parameter of function calling, and passes the call the model chooses back to the MCP server. By the end, you will know which part of the protocol each of the four differences MCP adds on top comes from, which differences survive the 2026-07-28 revision, and what attack surface that structure opens.

I work as a frontend developer and use Claude every day, yet each time I added another MCP server, I was never quite sure how these tools actually entered the model's field of view.


## MCP (Model Context Protocol)

MCP (Model Context Protocol) solves the question of “**what should we enable the agent to do?**”

Put more concretely, an AI agent needs to be able to call the Slack API to send a message to Slack. It needs to call the GitHub API to create a GitHub issue. It needs to handle a database connection to query Postgres. MCP **unifies integrations with all these external systems under a single standard protocol**. (The point is that any client can connect to any server through the same interface.)

MCP is an open standard first released by Anthropic on **November 25, 2024**. Then, on **December 9, 2025**, Anthropic, Block, and OpenAI jointly donated the MCP specification to the Linux Foundation’s **Agentic AI Foundation (AAIF)** as founding members. Google, Microsoft, AWS, Cloudflare, and Bloomberg joined as platinum members. (By the time of the December 2025 donation, the SDK had already surpassed 97 million monthly downloads, with more than 10,000 active public MCP servers.)

MCP is a protocol built on JSON-RPC. [JSON-RPC 2.0](https://www.jsonrpc.org/specification) is a stateless, lightweight RPC (Remote Procedure Call) protocol that uses JSON as its wire format. It is transport-independent and can run over HTTP, TCP, or standard input/output. It also defines notifications (calls without responses) and batch calls, but MCP removed batching in the [2025-06-18 revision](https://modelcontextprotocol.io/specification/2025-06-18/changelog). This post describes the 2025-11-25 revision, in which MCP is a stateful protocol that sets up a session for each connection. What changed in the revision after that is covered once we have walked through the call flow.


### Inside the Protocol

The overview of the 2025-11-25 specification divides what clients and servers exchange into six primitives. Here, a primitive has nothing to do with JavaScript's primitive types (such as string or number); it refers to a basic type of interaction defined by the protocol. The three server-side primitives and the client-side Sampling and Roots have existed since the first revision (2024-11-05), while Elicitation was added in the 2025-06-18 revision.

**Server-side primitives**

- **Tool** (model-controlled): an action the model autonomously decides whether to invoke. Such actions may have side effects
- **Resource** (application-controlled): data identified by a URI. The specification only has `resources/read` for reading its contents and no method for writing. The host application decides which resources to expose
- **Prompt** (user-controlled): a reusable template explicitly triggered by the user, for example through a slash command

**Client-side primitives**

- **Sampling**: a mechanism that allows the server to request a completion from the client’s LLM, making the client-server architecture bidirectional
- **Roots**: workspace boundary information through which the client tells the server, “This is the extent of the area you may work in”
- **Elicitation**: a feature that allows the server to request additional user input in a structured form while executing a tool

This distinction matters because **who decides to invoke or provide something differs**. A Tool runs at the model’s discretion, so an incorrect invocation carries risk, while a Prompt is explicitly chosen by the user. A Resource is chosen by the application by default, but the specification also allows implementations that include resources automatically, based on heuristics or the model’s selection. So it cannot be said that a Resource is always safer than a Tool. The three client-side primitives run in the opposite direction: the server asks, and the client decides whether to respond.

There are two [standard transport mechanisms](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports), and the specification also allows other custom transports (MAY). The first is **stdio**, which runs an MCP server as a local subprocess and communicates through standard input and output. It is well suited to locally operating tools such as filesystem and git integrations. The second is **Streamable HTTP**, which layers SSE streaming over HTTP POST to create near-bidirectional communication. It is suited to scenarios that occur across a network boundary, such as remote servers, OAuth authentication, multi-client connections, and cloud deployments.

Here, SSE (Server-Sent Events) is a way for a server to push one-way data to a client over an HTTP connection, and it is now defined in the [WHATWG HTML Standard](https://html.spec.whatwg.org/multipage/server-sent-events.html). Its media type is `text/event-stream`, and JavaScript accesses it through the `EventSource` API. Unlike WebSocket, it is unidirectional, but because it operates over HTTP, it works well with proxies and firewalls. Streamable HTTP effectively uses SSE to approximate bidirectional communication. It was introduced in the **March 26, 2025** specification (version `2025-03-26`), replacing the previous HTTP+SSE transport.


### How an LLM Invokes an MCP Tool

Now that we have covered the primitives and transports, let us trace **how an LLM actually discovers and invokes an MCP tool**.

In the 2025-11-25 revision, the following handshake takes place when a connection begins. As of 2026-10-08, the TypeScript SDK’s 1.32.1 and the v2 line’s 2.3.1 also follow this order in their default configuration.

- **Client → server**: `initialize` request (sends the supported protocol version and client capabilities)
- **Server → client**: `initialize` response (server capabilities plus an optional `instructions` field)
- **Client → server**: `notifications/initialized` notification
- **Client → server**: `tools/list` request → receives the list of available tools
- (Later) The LLM decides to invoke a tool → the client sends `tools/call` → receives the result

One detail is frequently overlooked: the **`initialize` response’s `instructions` field**. It is where the server sends text describing how its tools should be used, and the [comment in the specification schema](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2025-11-25/schema.ts) only says this content MAY be added to the system prompt. Whether to add it is up to the host. In the example below, TypeScript SDK 1.32.1 only hands this value out through `getInstructions()` and does not pass it to the model. I see this slot as the same kind of place as the Tool Poisoning discussed later, because text written by the server can end up in front of the model.

How, then, does the tool definition itself enter the LLM’s field of view? An MCP tool definition takes the following JSON Schema form.

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

The host transforms the list returned by `tools/list` into the **`tools` parameter of the Anthropic Messages API** or the **`tools` parameter of OpenAI function calling**, then includes it in the LLM API request. With Anthropic, supplying the tool parameter [automatically adds a special system prompt](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview) that teaches the model how to invoke tools. Its length varies by model. In the documentation table I checked on 2026-10-08, current models added 286 to 675 tokens with `tool_choice: auto`.

When the LLM decides that it should invoke a tool, its response contains a `tool_use` block (`{"type": "tool_use", "name": ..., "input": ...}`), and the response ends with a `stop_reason` of `tool_use`. The host receives this, sends `tools/call` to the actual MCP server, receives the result, places it in a `tool_result` block in the next user message, and sends it back to the LLM. **This loop continues until `stop_reason` changes from `tool_use` to another value, such as `end_turn` or `max_tokens`.** What we commonly describe as “the agent working” is essentially a sequence of these call-result-call loops.

Drawn as a picture, there is no line between the model and the MCP server. The model only sees the definitions it received through `tools`, and the MCP server receives requests from the host, not from the model. What connects the two protocols is the host in the middle.

![Arrows labeled tools, tool_use, and tool_result go between the LLM API on the left and the host in the middle, and arrows labeled tools/list and tools/call go between the host and the MCP server on the right. There is no line between the LLM API and the MCP server](1.png?w=720)

I ran this conversion to see how short it really is. It ran on 2026-10-08 with Node v24.16.0, `@modelcontextprotocol/sdk` 1.32.1, and `zod` 4.6.5. Instead of stdio, the transport is `InMemoryTransport`, which connects the server and client inside one process, and no LLM was called. The `tool_use` block was built by hand in the shape shown in Anthropic’s documentation.

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

The output of `node post-demo.mjs` is as follows.

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

The conversion is nothing more than renaming fields. MCP’s `inputSchema` becomes `input_schema` in Anthropic and `parameters` in OpenAI. The output also shows that the SDK adds `$schema` to the schema. The other direction is just as short. Anthropic’s `tool_use.input` is an object, so it goes straight into `tools/call` as its `arguments`. The OpenAI shape above is the Responses API format. The `arguments` of a call OpenAI returns is a [JSON-encoded string](https://developers.openai.com/api/docs/guides/function-calling), so it needs one pass through `JSON.parse` before being handed over. I confirmed this part from the documentation and did not run it in the code above.


### Four Things MCP Adds

So what does MCP add to function calling? Under the 2025-11-25 revision, there are four things.

- **Dynamic discovery**: the tool list is retrieved at runtime through `tools/list` rather than known at build time. The server can announce through `notifications/tools/list_changed` that the list has changed during a connection
- **Stateful session**: a connection is established with `initialize`, and requests are exchanged within it. There is no dedicated shutdown message; closing the transport is the shutdown
- **Primitives beyond Tool**: Resource, Prompt, Sampling, Roots, and Elicitation are exposed through capability negotiation. Capability negotiation is the step in `initialize` where each side announces the features it supports
- **Bidirectionality**: the server can request a completion from the client’s LLM in reverse through Sampling

However, as of 2026-10-08, the revision the official site opens as latest is the [2026-07-28 revision](https://modelcontextprotocol.io/specification/2026-07-28/changelog), and half of this list changed there. The handshake made of `initialize` and `notifications/initialized` and protocol-level sessions are gone, and every request carries the protocol version and client capabilities in `_meta`. Servers MUST implement `server/discover`, which advertises their supported versions and capabilities. Sampling and Roots were deprecated along with Logging, and the specification recommends integrating directly with LLM provider APIs instead of Sampling. Requests the server used to send first were replaced by a pattern called Multi Round-Trip Requests.

The SDKs’ default behavior, however, still follows the old way. TypeScript SDK 1.32.1 has `2025-11-25` as its latest version constant and does not know the 2026-07-28 revision, and 2.3.1 supports this revision but defaults to `legacy` version negotiation. The first line of the output above, `initialize 2025-11-25`, is the result.

What remains of the four, then, is dynamic discovery and the primitives beyond Tool (Resource, Prompt, Elicitation). Dynamic discovery has changed shape slightly as well: list change notifications go only to clients that opt in to the `subscriptions/listen` stream. In the end, where MCP parts ways with function calling is less about sessions or bidirectionality and more about **a contract for exchanging the tool list and context at runtime**.


### When the API Becomes the MCP Client

Anthropic’s [MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector) shows how much of this contract reaches the model. It is a feature in which the Messages API connects directly to a remote MCP server, and the Limitations section of its documentation says that of the MCP specification’s features, "only tool calls are currently supported", and that "Local STDIO servers cannot be connected directly". The same documentation advises that if you need local servers, MCP prompts, or resources, you manage the connection yourself with an MCP SDK and use the Anthropic SDK’s conversion helpers.

In other words, when MCP is consumed at the function calling layer, only Tool remains. Resource and Prompt mean something only when there is a host to carry them into the screen or the context. OpenAI’s function calling guide also introduces a way to use the functionality of an MCP server as a built-in tool. How far that side accepts primitives beyond Tool was not checked in this post.


### The Attack Surface Dynamic Discovery Opens

**MCP does not automate authorization.** The [tool specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) recommends that a human who can deny tool invocations be in the loop (SHOULD), and requires that tool annotations not be trusted unless they come from trusted servers (MUST). Which servers to trust, and whether a tool will continue to behave the same way over time, is up to the host and the user.

Both representative attacks come from the fact that tool definitions travel at runtime.

- **Tool Poisoning Attack (TPA)**: an attack named and demonstrated in a PoC by [Invariant Labs](https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks) in April 2025. If malicious instructions are hidden inside an MCP server’s tool description, the model may mistake them for user instructions and follow them. The text is invisible to the user but visible to the model.

- **Rug Pull** (Silent Redefinition): an attack in which the server changes a tool definition after the user has approved it. Invariant Labs described it first in the same post, the name Silent Redefinition comes from a post by Elena Cross, and [Simon Willison](https://simonwillison.net/2025/Apr/9/mcp-prompt-injection/) quoted it in his write-up on April 9, 2025. A tool begins as legitimate. The user reviews it, approves it, and integrates it into a workflow. Weeks later, the tool definition quietly changes to include malicious instructions. Because the user is not asked to approve it again, the behavior changes without warning.

A Rug Pull happens in the same place as `notifications/tools/list_changed`, which is what makes dynamic discovery possible. The specification only defines how to announce that the list has changed; it does not require showing the changed definition to the user again. Willison wrote that MCP clients should show users the initial tool descriptions and alert them if those descriptions change. Getting re-approval after a change is the host’s job, not the specification’s.


## Wrapping Up

In short, MCP does not replace function calling; it is a standard layered on top of it. The model still invokes tools through the `tools` parameter and the `tool_use` loop, and the host translates between the two protocols. In the 2025-11-25 revision, what MCP added was dynamic discovery, a stateful session, primitives beyond Tool, and calls that go from the server to the client. With sessions gone and Sampling deprecated in the 2026-07-28 revision, what remains is a contract for exchanging the tool list and context at runtime. Because of that contract, attacks that poison tool definitions or quietly change them arise in the same place. When you add another MCP server, I recommend checking not only what that server can do but also whether your host tells you when its definitions change.

If MCP is about what to enable the agent to do, what to tell the agent is the job of context files such as `CLAUDE.md` and `AGENTS.md`. How those files are read by the agent, and how far their instructions are followed, is covered in [Context Files](/260529).


## References

:::ref
- [docs] [MCP Specification 2025-11-25, Lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle)
- [docs] [MCP Specification 2026-07-28, Versioning](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning)
- [docs] [OpenAI, Remote MCP](https://developers.openai.com/api/docs/guides/tools-remote-mcp)
:::
