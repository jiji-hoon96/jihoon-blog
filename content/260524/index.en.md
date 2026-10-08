---
emoji: 🔌
title: "MCP and Function Calling"
seoTitle: "How MCP Differs from Function Calling: Protocol and Calls"
date: "2026-05-24"
locale: en
translationOf: '260524'
sourceHash: f5c56031068e65cfbee19861ae45e0809590a1961be8364a856a0caa02ffedcb
categories: AI Developer-Tools Claude MCP CodeGraph
description: "How MCP differs from function calling: six primitives, stdio and Streamable HTTP, the tools/list to tool_use loop flow, and risks like Tool Poisoning."
keywords: "MCP, Model Context Protocol, MCP vs function calling, MCP primitives, tools/list, Streamable HTTP, Tool Poisoning Attack, MCP security"
---

In this post, I want to talk about **how MCP (Model Context Protocol) differs from function calling**.

This is for developers who use MCP servers with Claude Code or Cursor but have found it hard to explain where MCP parts ways with the function calling in LLM APIs. By the end, you will know which part of the protocol each of the four differences between the two comes from, and what security problems that structure leads to. The four are dynamic discovery, which fetches the tool list at runtime; a stateful session with a defined lifecycle; primitives beyond Tool; and bidirectionality, which lets the server call the client's LLM in the reverse direction.

I work as a frontend developer and use Claude every day, yet each time I added another MCP server, I was never quite sure how these tools actually entered the model's field of view.


## MCP (Model Context Protocol)

MCP (Model Context Protocol) solves the question of “**what should we enable the agent to do?**”

Put more concretely, an AI agent needs to be able to call the Slack API to send a message to Slack. It needs to call the GitHub API to create a GitHub issue. It needs to handle a database connection to query Postgres. MCP **unifies integrations with all these external systems under a single standard protocol**. (The point is that any client can connect to any server through the same interface.)

MCP is an open standard first released by Anthropic on **November 25, 2024**. Then, on **December 9, 2025**, Anthropic, Block, and OpenAI jointly donated the MCP specification to the Linux Foundation’s **Agentic AI Foundation (AAIF)** as founding members. Google, Microsoft, AWS, Cloudflare, and Bloomberg joined as platinum members. (By the time of the December 2025 donation, the SDK had already surpassed 97 million monthly downloads, with more than 10,000 active public MCP servers.)

MCP is a stateful session protocol built on JSON-RPC. **JSON-RPC** is a stateless, lightweight RPC (Remote Procedure Call) protocol that uses JSON as its wire format. It is transport-independent and can run over HTTP, TCP, or standard input/output. It also supports notifications (calls without responses) and batch calls.


### Inside the Protocol

Every interaction between an MCP client and server is expressed through one of six primitives. Here, a primitive has nothing to do with JavaScript's primitive types (such as string or number); it refers to a basic type of interaction defined by the protocol. The protocol began with three server-side primitives; three client-side primitives were added in the 2025-06-18 specification, bringing the standard total to six.

**Server-side primitives**

- **Tool** (model-controlled): an action the model autonomously decides whether to invoke. Such actions may have side effects
- **Resource** (application-controlled): read-only data identified by a URI. The host application decides which resources to expose
- **Prompt** (user-controlled): a reusable template explicitly triggered by the user, for example through a slash command

**Client-side primitives**

- **Sampling**: a mechanism that allows the server to request a completion from the client’s LLM, making the client-server architecture bidirectional
- **Roots**: workspace boundary information through which the client tells the server, “This is the extent of the area you may work in”
- **Elicitation**: a feature that allows the server to request additional user input in a structured form while executing a tool

The distinction among these six primitives matters because **authority over invocation and provision belongs to different actors**. A Tool runs at the model’s discretion, so an incorrect invocation carries risk. A Resource is curated by the application and is therefore relatively safe. A Prompt is explicitly triggered by the user and offers the greatest control. Sampling, Roots, and Elicitation refine the permission model through client-side control.

There are **exactly two transport mechanisms**. This is intentional: it prevents the ecosystem from fragmenting into dozens of competing protocols. The first is **stdio**, which runs an MCP server as a local subprocess and communicates through standard input and output. It is well suited to locally operating tools such as filesystem and git integrations. The second is **Streamable HTTP**, which layers SSE streaming over HTTP POST to create near-bidirectional communication. It is suited to scenarios that occur across a network boundary, such as remote servers, OAuth authentication, multi-client connections, and cloud deployments.

Here, SSE (Server-Sent Events) is a W3C standard that lets a server push one-way data to a client over an HTTP connection. Its media type is `text/event-stream`, and JavaScript accesses it through the `EventSource` API. Unlike WebSocket, it is unidirectional, but because it operates over HTTP, it works well with proxies and firewalls. Streamable HTTP effectively uses SSE to approximate bidirectional communication. It was introduced in the **March 26, 2025** specification (version `2025-03-26`), replacing the previous HTTP+SSE transport.


### How an LLM Invokes an MCP Tool

Now that we have covered the primitives and transports, let us trace **how an LLM actually discovers and invokes an MCP tool**.

When an MCP session begins, the following handshake takes place.

- **Client → server**: `initialize` request (sends the supported protocol version and client capabilities)
- **Server → client**: `initialize` response (server capabilities plus an optional `instructions` field)
- **Client → server**: `notifications/initialized` notification
- **Client → server**: `tools/list` request → receives the list of available tools
- (Later) The LLM decides to invoke a tool → the client sends `tools/call` → receives the result

One detail is frequently overlooked: the **`initialize` response’s `instructions` field**. If the server sends text in this field, that content is effectively added to the LLM’s system prompt. In other words, the specification provides a formal slot through which an MCP server can inject guidance directly into the LLM about how its tools should be used. (The existence of this slot is one reason the Tool Poisoning Attack discussed later is dangerous.)

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

The client transforms the list returned by `tools/list` into the **`tools` parameter of the Anthropic Messages API** or the **`tools` parameter of OpenAI function calling**, then includes it in the LLM API request. With Anthropic, supplying the tool parameter automatically adds a **special system prompt** that teaches the model how to invoke tools. (With Claude 4.x and `tool_choice: auto`, this prompt alone adds 346 tokens.)

When the LLM decides that it should invoke a tool, its response contains a `tool_use` block (`{"type": "tool_use", "name": ..., "input": ...}`), and the response ends with a `stop_reason` of `tool_use`. The client receives this, sends `tools/call` to the actual MCP server, receives the result, places it in a `tool_result` block in the next user message, and sends it back to the LLM. **This loop continues until `stop_reason` changes from `tool_use` to another value, such as `end_turn` or `max_tokens`.** What we commonly describe as “the agent working” is essentially a sequence of these call-result-call loops.

So how does MCP differ from ordinary function calling? The distinction can be condensed into four points.

- **Dynamic discovery**: the tool list is retrieved at runtime through `tools/list` rather than known at build time. `notifications/tools/list_changed` also allows it to change during a session
- **Stateful session**: lifecycle phases are defined (initialize → operation → shutdown), enabling a clean shutdown
- **Primitives beyond Tool**: Prompt, Resource, Sampling, Roots, and Elicitation are exposed through capability negotiation
- **Bidirectionality**: the specification allows a server to invoke the client’s LLM in reverse through sampling

(This is why MCP is sometimes described as “a generalized standard for function calling for agents.”)


### So, Is MCP Safe?

One point needs to be made clearly: **MCP does not automate authorization**. The user remains responsible for deciding which servers an agent can trust, what side effects each tool may have, and whether a tool will continue to behave the same way over time.

It is useful to understand two representative attacks.

- **Tool Poisoning Attack (TPA)**: an attack named and demonstrated in a PoC by Invariant Labs in April 2025. If malicious instructions are hidden inside an MCP server’s tool description, the model may mistake them for user instructions and follow them. The text is invisible to the user but visible to the model.

- **Rug Pull** (Silent Redefinition): a concept Simon Willison discussed in an analysis published on April 9, 2025. A tool begins as legitimate. The user reviews it, approves it, and integrates it into a workflow. Weeks later, the tool definition quietly changes to include malicious instructions. Because the user is not asked to approve it again, the behavior changes without warning.

A security incident occurred on **April 15, 2026**. OX Security disclosed systemic RCE vulnerabilities affecting every major MCP SDK—Python, TypeScript, Java, and Rust. More than 150 million downloads, roughly 7,000 public servers, and an estimated 200,000 vulnerable deployments were potentially affected. More than 14 CVEs were assigned, and Cursor, VS Code, Windsurf, Claude Code, and Gemini-CLI were all affected.

How has the ecosystem responded? Anthropic **did not change the protocol architecture itself**. Instead, it updated `SECURITY.md` to state explicitly that downstream developers are responsible for input sanitization when using stdio adapters. At the specification level, the **2025-06-18 revision mandated OAuth 2.1 plus RFC 8707 Resource Indicators** to block token-reuse attacks, and the **2025-11-25 revision introduced incremental scope consent**, through which users approve only the minimum permissions needed, one step at a time. Even so, more than 30 MCP-related CVEs were issued in January and February 2026 alone, and statistics showed that **command injection accounted for 43%** of them. **Security remains very much a work in progress.**


## Wrapping Up

In short, MCP does not replace function calling; it is a standard layered on top of it. The model still invokes tools through the `tools` parameter and the `tool_use` loop. What MCP adds is a way to exchange the tool list at runtime, a session lifecycle, primitives beyond Tool, and calls that go from the server to the client. Because tool definitions travel at runtime, attacks that poison those definitions or quietly change them arise in the same place.

If MCP is about what to enable the agent to do, what to tell the agent is the job of context files such as `CLAUDE.md` and `AGENTS.md`. How those files are read by the agent, and how far their instructions are followed, is covered in [Context Files](/260529).


## References

:::ref
- [docs] [MCP Specification 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle)
- [docs] [Anthropic Tool Use Overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [article] [Simon Willison, MCP Prompt Injection](https://simonwillison.net/2025/Apr/9/mcp-prompt-injection/)
- [article] [OX Security, MCP Supply Chain Advisory](https://www.ox.security/blog/mcp-supply-chain-advisory-rce-vulnerabilities-across-the-ai-ecosystem/)
:::
