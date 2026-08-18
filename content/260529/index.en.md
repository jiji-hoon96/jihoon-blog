---
emoji: 🧭
title: 'AI Agent Tools'
seoTitle: 'AI Coding Agent Tools Explained: Context Files, MCP, Code Intelligence, and GitHub Trending'
date: '2026-05-29'
locale: en
translationOf: '260529'
sourceHash: dcdf13a2067a0ae15b501b063ecf0c65202580351b7df388dad34849f41e1c3c
categories: AI Developer-Tools Claude MCP CodeGraph
description: 'A practical map of the AI coding agent ecosystem: the differences between CLAUDE.md, AGENTS.md, and SKILL.md; how MCP, Serena, and CodeGraph work; the layers of code intelligence; and how to discover emerging tools through GitHub Trending.'
keywords: 'CLAUDE.md, AGENTS.md, SKILL.md, MCP, Model Context Protocol, Serena MCP, CodeGraph, code intelligence, GitHub Trending, AI coding agents, Claude Code, Cursor rules, tree-sitter, LSP'
---

In this post, I want to explore the **tooling ecosystem surrounding AI coding agents**.

As a frontend developer, I use Claude in my day-to-day work. At some point, that meant a `CLAUDE.md` appeared at the project root, an `AGENTS.md` created by someone else sat beside it, a `.cursorrules` file lingered elsewhere, and I even created a `.claude/skills/` directory after following an article I had come across. (By the time I stopped to take stock, I had about five files containing roughly the same information.)

The same kind of confusion surfaced in other areas. I added an MCP called `serena`, installed something called `codegraph` after seeing it on GitHub Trending, and every time I discovered another new tool, I found myself asking the same question: “Where exactly does this tool fit, and how does it work?” (I was especially hazy, each time, on details such as who built a given tool and exactly how it saved tokens.)

So rather than recommending tools one by one, I decided to **map the tooling landscape itself**. I divided it into four broad axes.

- The differences among context files (`.md`)
- How MCP works, and Serena
- The layers of code intelligence tools, and CodeGraph
- Paying attention to GitHub Trending

Once you understand these four areas, I believe you can look at a new tool and quickly get a sense of what kind of thing it is.


## Context Files

AI coding agents have a fundamental limitation: **they have no persistent memory**. Every session starts from a blank slate. In the next conversation, they cannot remember a convention you agreed on yesterday or a directory structure you explained an hour ago. Context files are the simplest mechanism for addressing this problem. If a project contains a file that is read automatically whenever a session starts, you no longer need to repeat the same explanation every time.

The problem is that each tool created its own file around the same basic idea. Claude Code reads `CLAUDE.md`, Cursor reads `.cursorrules` (now deprecated, with `.cursor/rules` recommended instead), GitHub Copilot reads `.github/copilot-instructions.md`, and OpenAI Codex reads `AGENTS.md`. When a team uses several tools, it can end up copying the same information into four different places.


### CLAUDE.md

`CLAUDE.md` is a file that Claude Code reads automatically at the start of a session. According to Anthropic’s official documentation (`code.claude.com/docs/en/memory`), Claude Code looks for `CLAUDE.md` at the following three levels.

- **User memory** (`~/.claude/CLAUDE.md`): global defaults that apply to every project on the machine
- **Project memory** (`CLAUDE.md` at the project root): committed to git and shared across the team
- **Local memory** (`CLAUDE.md` in a subdirectory): loaded in addition to the others only when working in that directory

When all three levels exist, Claude **reads and concatenates all of them**. It does not choose only one according to precedence; instead, more specific instructions are layered on top, much like the CSS cascade. (This is a merge, not an override.) As a result, scattering rules about the same topic across several levels can create conflicts. (Anthropic’s official documentation explicitly states that behavior is not guaranteed when instructions conflict.)

There is one frequently overlooked detail here: Claude **reads every `CLAUDE.md` it encounters while walking from the current working directory up to the repository root**. If you work inside `packages/ui/` in a monorepo, both the root `CLAUDE.md` and `packages/ui/CLAUDE.md` are loaded. (That is powerful, but it also means the context can quietly expand without you noticing.)


### AGENTS.md

`AGENTS.md` is a standard created to address the proliferation of tool-specific files described above. In December 2025, Anthropic, Block, and OpenAI donated it to the Linux Foundation’s **Agentic AI Foundation (AAIF)** alongside MCP, making it a de facto industry standard. The official site (`agents.md`) states that **more than 60,000 open-source repositories have adopted the file**.

The list of supported tools makes the picture even clearer. It includes OpenAI Codex, Google Jules, VS Code, GitHub Copilot, Cursor, JetBrains Junie, Aider, Devin, Zed, Factory, Warp, goose, opencode, Amp, RooCode, Gemini CLI, Kilo Code, Phoenix, Semgrep, Ona, Windsurf, and Augment Code, among many others. GitHub Copilot began supporting `AGENTS.md` natively in August 2025. One interesting detail is that **native `AGENTS.md` support in Claude Code is still an active feature request**. Claude Code continues to treat `CLAUDE.md` as its primary file.

You might still wonder whether this supposed standard is actually being adopted. The strongest evidence is **dogfooding**—the organizations behind the standard using it themselves.

- The canary branch of **Vercel/Next.js** has an `AGENTS.md` at its root. It is actually a symbolic link to `CLAUDE.md`, whose contents cover the monorepo structure, one-to-two-second iteration with `pnpm --filter=next dev`, testing guidance for both Turbopack and Webpack, the `pr-status` script, and rules for handling environment variables and secrets. The fact that `create-next-app` now generates both `AGENTS.md` and `CLAUDE.md` for new projects reflects the same trend.
- The **OpenAI/codex** repository maintains its own `AGENTS.md`.

A conventional strategy is beginning to emerge: use **`AGENTS.md` as the single source of truth**, while keeping `CLAUDE.md` minimal, with a one-line reference to `AGENTS.md` plus instructions specific to Claude Code. This eliminates duplication, and because Claude Code reads both files, nothing is lost.


### SKILL.md

`SKILL.md` belongs to a different category from the two files above. Whereas `CLAUDE.md` and `AGENTS.md` are **persistent instructions that are always present in the context**, a Skill is an **on-demand capability invoked only when needed**.

A Skill is organized as a directory. The directory contains one `SKILL.md`, scripts executed by the Skill, and any additional Markdown documents. Claude loads that directory only when the current task matches the Skill’s `description`. This is called **progressive disclosure**, a concept established in the UX field by Jakob Nielsen in 1995: advanced or rarely used functions are deferred to secondary screens so users can focus on one task at a time, reducing cognitive load and errors. In the context of Claude Skills, it refers to the mechanism of bringing a Skill’s body into the context only when needed. The result can be a dramatic reduction in context-window costs.

The frontmatter in `SKILL.md` includes several distinctive fields.

- **`description`**: explains when the Skill is needed and acts as the trigger the model uses to decide whether to invoke it
- **`allowed-tools`**: restricts which tools may be used inside the Skill (for example, `"Read, Glob, Grep, Bash(python:*)"`)
- **`disable-model-invocation: true`**: prevents the model from invoking the Skill; only the user can trigger it with a slash command. This is used for operations with side effects, such as deployments and commits
- **`user-invocable: false`**: hides the Skill from the user’s slash-command menu and allows only Claude to invoke it autonomously, for use as background knowledge

Claude Skills launched simultaneously across Claude.ai, Claude Code, the API, and Agent SDK on October 16, 2025. Then, on December 18, 2025, Anthropic published the Skills specification itself as an open standard (`agentskills.io`). Simon Willison even called it “**Skills are awesome, maybe a bigger deal than MCP**,” citing the format’s dramatic simplicity compared with MCP and its use of progressive disclosure to address context-window costs.


### Files Used by Other Tools

Cursor’s `.cursorrules` has been **deprecated since version 0.43**. The current official recommendation is to use the `.cursor/rules/` directory and place multiple `.mdc` files inside it. Each `.mdc` file has YAML frontmatter.

- **`description`**: information the agent uses to judge whether the rule is relevant
- **`globs`**: automatically attaches the rule when a matching file is included in the conversation (auto-attach)
- **`alwaysApply`**: when `true`, includes the rule in every conversation without exception (`globs` is ignored in this case)

GitHub Copilot has evolved in a similar direction. Repository-wide instructions live in `.github/copilot-instructions.md`; instructions that require path-specific scope go in `.github/instructions/*.instructions.md`, with globs specified through the frontmatter key `applyTo:`. (Copilot code review has officially supported path-scoped instructions since September 2025.)

Tools beyond Cursor and Copilot are converging on similar patterns. The following table summarizes them.

| Tool | File/Directory | Key Characteristics |
|------|--------------|------|
| **Claude Code** | `CLAUDE.md` (three levels) | Merged along the directory tree |
| **Cursor** | `.cursor/rules/*.mdc` | File-pattern scoping with `globs` |
| **GitHub Copilot** | `.github/copilot-instructions.md` + `.github/instructions/*.instructions.md` | Supports `applyTo` globs |
| **Cline** | `.clinerules/` directory | Combines all `.md`/`.txt` files; conditional activation with `paths` globs |
| **Continue.dev** | `.continue/rules/*.md` | `name`/`globs`/`alwaysApply` frontmatter |
| **Aider** | `CONVENTIONS.md` + `.aider.conf.yml` | Included with every request; **200 lines or fewer recommended** |
| **Windsurf** | `.windsurfrules` + `global_rules.md` | Two levels: global and project |
| **Standard** | `AGENTS.md` (AAIF) | Adopted by 60,000+ repositories |

**Aider’s `CONVENTIONS.md` is particularly interesting**. Because the official documentation says this entire file is included in the context with every request, it explicitly instructs users to **“keep it under 200 lines.”** (In effect, Aider recognized this limitation early and tells users about it directly.)


### MEMORY.md

Separate from the files above, another pattern is appearing with increasing frequency: `MEMORY.md`. It is not an official standard, but an organically developed community convention for **recording decisions and mistakes over time**.

```markdown
## 2026-04-10
Pages Router에서 App Router로 이전. 신규 라우트는 App Router 컨벤션 사용.

## 2026-04-22
Prisma 쿼리 결과에 optional chaining 쓰지 말 것 — null은 if-check로 명시적 처리.
(이전에 옵셔널 체이닝으로 null을 흘려보내 프로덕션 이슈 발생.)
```

If `CLAUDE.md` or `AGENTS.md` records **the rules as they stand today**, `MEMORY.md` records **the history of why those rules were created**. (The two are complementary, not interchangeable.)


### How Agents Read These Files

So far, we have cataloged the files that exist. But one surprisingly common question remains unanswered: **where, exactly, do agents load these files, and how?** Understanding this mechanism makes it easier to see why the ETH Zurich results discussed later—showing that context-file instructions are not followed reliably—emerged.

First, one essential fact: **`CLAUDE.md` is injected as a user message, not as part of the system prompt.** Anthropic’s official documentation states the following.

::::quote
:::translation
CLAUDE.md content is delivered as a user message after the system prompt, not as part of the system prompt itself. Claude reads it and tries to follow it, but there's no guarantee of strict compliance.
:::

:::original
CLAUDE.md content is delivered as a user message after the system prompt, not as part of the system prompt itself. Claude reads it and tries to follow it, but there's no guarantee of strict compliance.
:::
::::

In other words, it is contextual guidance rather than an enforced rule. The official guidance recommends using a separate mechanism, such as a `PreToolUse` hook, when you need to enforce a specific behavior.

The load order progresses from broad → specific. More precisely, it is managed policy (organization-level settings) → the user’s global file (`~/.claude/CLAUDE.md`) → the project file (`./CLAUDE.md`) → the local file (`./CLAUDE.local.md`). Within the same directory, `CLAUDE.md` comes before `CLAUDE.local.md`. By taking advantage of the fact that **the nearest instructions are read last**, you can make more specific rules exert a stronger influence, thanks to the LLM’s recency bias.

The `@import` syntax is especially interesting. If you put `@path/to/file` anywhere in the body of CLAUDE.md, that file is expanded in place and loaded with it. **The maximum recursion depth is 4 hops**, and relative paths are resolved from the file containing the import statement. That is why the official recommendation is to bridge to `@AGENTS.md`. If you leave `CLAUDE.md` almost empty and put only `@AGENTS.md` in it, Claude Code will naturally read AGENTS.md as well. (Given that Claude Code does not yet support AGENTS.md natively, this is the cleanest workaround.)

The token implications also deserve attention. CLAUDE.md has no explicit token limit, so **the entire file is loaded if it exists**. The official recommendation, however, is to keep **each file under 200 lines**. Beyond 200 lines, it is said to “consume more context and may reduce adherence.” Interestingly, in Claude 4.x, **merely enabling tool use automatically adds 346 tokens via a special system prompt** (with `tool_choice: auto`). Context leaks away in ways that are easy to miss.

Cursor takes a different approach. Rules in `.cursor/rules/*.mdc` operate in four modes.

- **Always Apply**: included in every chat without exception; ignores globs/description
- **Apply Intelligently** (Agent Requested): the agent reads `description`, determines relevance, and pulls in the rule
- **Apply to Specific Files** (Auto Attached): activated when a file matching the glob pattern enters the context
- **Apply Manually**: explicitly invoked by the user with `@rule-name`

Other tools differ again. OpenAI Codex walks from the git repository root toward cwd, collects every `AGENTS.md`, and injects them **immediately before the user prompt**. GitHub Copilot inserts `.github/copilot-instructions.md` at a middle priority within the context window: “after edit context and explicit references, but before loosely related open files.” Because the load timing, precedence, and merge rules vary by tool even for the same `AGENTS.md` file, **there is no guarantee that three tools will interpret it in exactly the same way.**

That leaves a more fundamental question: **why does a model follow only some instructions that are present in its context?** Simply saying “because the instructions are long” is not enough. The phenomenon is rooted in structural limitations of LLMs.

### Hallucination and Context Forgetting

If you have ever seen an AI agent confuse the conversational context or forget something that was clearly stated earlier, that is a form of **hallucination**. People usually think of hallucination first as “making up facts that do not exist,” but the academic literature divides it into three categories. A 2023 survey by Yue Zhang and colleagues (“Siren’s Song in the AI Ocean”) classifies them as **input-conflicting** (generating something inconsistent with what the user explicitly provided), **context-conflicting** (contradicting something the model previously generated), and **fact-conflicting** (disagreeing with world knowledge). Ignoring instructions in a context file belongs to the **first category**, not the third. The model processes the input while treating part of its information as though it were not there.

The deeper problem is that hallucination **cannot be eliminated in principle**. A research team at the National University of Singapore proved this mathematically using learning theory. No LLM can learn every computable function; therefore, as long as it is used as a general-purpose problem solver, it must hallucinate at some point.

Position effects matter as well. Stanford researchers demonstrated experimentally that models reference relevant information most effectively when it appears **at the beginning or end of the context window**, while performance drops sharply when that information is **buried in the middle**. This maps directly onto context files. `CLAUDE.md` is inserted somewhere in the middle by the load order, and as a conversation grows longer, its instructions are pushed further into the “middle” of the context. This also connects to the other side of the recency bias mentioned earlier: within the primacy-recency effect, **the middle is the weakest region**.

Taken together, these phenomena form a coherent picture. A context file is merely **additional text inserted outside the system prompt before the LLM’s first user turn**. It is not a mechanism that forces the model’s decisions; it is simply another block of tokens dropped into the context window. The longer the file and the longer the conversation, the farther its instructions drift toward the “middle,” and the less reliably they are referenced. The ETH Zurich results quantitatively confirm this structural limitation.


### The ETH Zurich Study

Many people may have thought, “Then I should put as much as possible into these files.” A recent study directly challenges that intuition: the ETH Zurich research referenced throughout the preceding section.

The paper, “Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?”, was published by an ETH Zurich research team in February 2026. The researchers evaluated four agents—Claude Code (Sonnet-4.5), Codex (GPT-5.2 / GPT-5.1 mini), and Qwen Code—on a benchmark of 138 real-world Python software-engineering tasks (AGENTBENCH) and on SWE-bench Lite. The results were unexpected.

- **LLM-generated context files** actually **reduced task success rates** by about 0.5% on SWE-bench Lite and 2% on AGENTBENCH
- Even **human-authored files** produced only a modest average improvement of about 4%
- Adding a context file **increased inference costs by more than 20% per instance**
- Context files had an even smaller effect on the stronger model (GPT-5.2), because more capable models already have sufficient parametric knowledge and additional context can become noise

There was one exception: **specifying a nonstandard tool**. When the Python package manager `uv` was named in the context, for example, the agent’s use of `uv` rose from 0.01 times per instance to 1.6 times—an increase of **roughly 160×**.

Aider’s “200-line recommendation”—keep the file short because it enters the context every time—is practical guidance, while the ETH Zurich study quantitatively demonstrates that long context files reduce performance statistically. I see the following practical implications in the research.

- **A huge, automatically generated context file can do more harm than good**. If you cram coding standards, architecture, and workflows into a 300-line `CLAUDE.md`, the agent will follow some of them and ignore the rest. That inconsistency can produce worse results than having no context at all.
- **What absolutely belongs in the file is information that cannot be inferred**. This includes nonstandard tools, project-specific conventions, and past failure cases. The model already knows general coding best practices.
- Use AGENTS.md as the single source, keep CLAUDE.md limited to brief tool-specific instructions, and move detailed workflows into Skills.


## MCP (Model Context Protocol)

If `.md` files solve the question of “what should we tell the agent?”, MCP (Model Context Protocol) solves the question of “**what should we enable the agent to do?**”

Put more concretely, an AI agent needs to be able to call the Slack API to send a message to Slack. It needs to call the GitHub API to create a GitHub issue. It needs to handle a database connection to query Postgres. MCP **unifies integrations with all these external systems under a single standard protocol**. (The point is that any client can connect to any server through the same interface.)

MCP is an open standard first released by Anthropic on **November 25, 2024**. Then, on **December 9, 2025**, Anthropic, Block, and OpenAI jointly donated the MCP specification to the Linux Foundation’s **Agentic AI Foundation (AAIF)** as founding members. Google, Microsoft, AWS, Cloudflare, and Bloomberg joined as platinum members. (By the time of the December 2025 donation, the SDK had already surpassed 97 million monthly downloads, with more than 10,000 active public MCP servers.)

MCP is a stateful session protocol built on JSON-RPC. **JSON-RPC** is a stateless, lightweight RPC (Remote Procedure Call) protocol that uses JSON as its wire format. It is transport-independent and can run over HTTP, TCP, or standard input/output. It also supports notifications (calls without responses) and batch calls.


### Inside the Protocol

Every interaction between an MCP client and server is expressed through one of six primitives. The protocol began with three server-side primitives; three client-side primitives were added in the 2025-06-18 specification, bringing the standard total to six.

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

Now that we have covered the primitives and transports, let us trace **how an LLM actually discovers and invokes an MCP tool**. (Where `.md` files raised the question of “where are they injected?”, the question here is “how does MCP enter the LLM’s field of view?”)

When an MCP session begins, the following handshake takes place.

- **Client → server**: `initialize` request (sends the supported protocol version and client capabilities)
- **Server → client**: `initialize` response (server capabilities plus an optional `instructions` field)
- **Client → server**: `notifications/initialized` notification
- **Client → server**: `tools/list` request → receives the list of available tools
- (Later) The LLM decides to invoke a tool → the client sends `tools/call` → receives the result

One detail is frequently overlooked: the **`initialize` response’s `instructions` field**. If the server sends text in this field, that content is effectively added to the LLM’s system prompt. In other words, the specification provides a formal slot through which an MCP server can inject guidance directly into the LLM about how its tools should be used. (The existence of this slot is one reason the Tool Poisoning Attack discussed earlier is dangerous.)

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

The client transforms the list returned by `tools/list` into the **`tools` parameter of the Anthropic Messages API** or the **`tools` parameter of OpenAI function calling**, then includes it in the LLM API request. With Anthropic, supplying the tool parameter automatically adds a **special system prompt** that teaches the model how to invoke tools. (That is the source of the additional 346 tokens mentioned earlier.)

When the LLM decides that it should invoke a tool, its response contains a `tool_use` block (`{"type": "tool_use", "name": ..., "input": ...}`), and the response ends with a `stop_reason` of `tool_use`. The client receives this, sends `tools/call` to the actual MCP server, receives the result, places it in a `tool_result` block in the next user message, and sends it back to the LLM. **This loop continues until `stop_reason` changes from `tool_use` to another value, such as `end_turn` or `max_tokens`.** What we commonly describe as “the agent working” is essentially a sequence of these call-result-call loops.

So how does MCP differ from ordinary function calling? The distinction can be condensed into four points.

- **Dynamic discovery**: the tool list is retrieved at runtime through `tools/list` rather than known at build time. `notifications/tools/list_changed` also allows it to change during a session
- **Stateful session**: lifecycle phases are defined (initialize → operation → shutdown), enabling a clean shutdown
- **Primitives beyond Tool**: Prompt, Resource, Sampling, Roots, and Elicitation are exposed through capability negotiation
- **Bidirectionality**: the specification allows a server to invoke the client’s LLM in reverse through sampling

(This is why MCP is sometimes described as “a generalized standard for function calling for agents.”)

### Serena

**Serena** (`oraios/serena`) is one of the most frequently discussed MCP servers in the context of coding agents. As of May 2026, it has about 24.7k stars and has risen in roughly a year from a niche tool to a de facto standard code MCP.

Serena’s core idea can be summarized in one sentence: **show the agent symbols, not text.**

To unpack that idea, suppose you need to find every use of a `calculateTotal` function. A conventional text-based tool such as grep or Read works like this.

It greps the entire codebase for `calculateTotal`. It then gathers the line number of every match and reads a fixed range of lines from each file to build context. It also captures accidental matches in variable names, string literals, and comments.

LSP-based Serena makes a single call to `find_referencing_symbols("calculateTotal")` and returns only exact symbol references, without noise from variable-name or comment matches.

**LSP (Language Server Protocol)** is an open, JSON-RPC-based protocol that standardizes communication between code editors/IDEs and “language intelligence tools” such as code completion, go to definition, find references, and refactoring. Microsoft, Red Hat, and Codenvy jointly standardized it in 2016. Its central idea is simple: instead of reimplementing a language analyzer for every editor, run one server per language and let every editor query that server. (The TypeScript server, Rust analyzer, and Python’s pyright are all LSP servers.)

Serena’s core tools include `find_symbol`, `find_referencing_symbols`, and `get_symbols_overview`. You can choose between two backends: the default is an LSP-compatible language server, which is free and open source; the other is a paid plugin that uses code analysis from a JetBrains IDE and offers a free trial.

The real reason Serena was adopted so quickly is **token savings**. A text grep-and-file-read loop consumes many tokens, while one precise LSP call consumes very few. The larger the codebase, the greater the difference.


### So, Is MCP Safe?

One point needs to be made clearly: **MCP does not automate authorization**. The user remains responsible for deciding which servers an agent can trust, what side effects each tool may have, and whether a tool will continue to behave the same way over time.

It is useful to understand two representative attacks.

- **Tool Poisoning Attack (TPA)**: an attack named and demonstrated in a PoC by Invariant Labs in April 2025. If malicious instructions are hidden inside an MCP server’s tool description, the model may mistake them for user instructions and follow them. The text is invisible to the user but visible to the model.

- **Rug Pull** (Silent Redefinition): a concept Simon Willison discussed in an analysis published on April 9, 2025. A tool begins as legitimate. The user reviews it, approves it, and integrates it into a workflow. Weeks later, the tool definition quietly changes to include malicious instructions. Because the user is not asked to approve it again, the behavior changes without warning.

A security incident occurred on **April 15, 2026**. OX Security disclosed systemic RCE vulnerabilities affecting every major MCP SDK—Python, TypeScript, Java, and Rust. More than 150 million downloads, roughly 7,000 public servers, and an estimated 200,000 vulnerable deployments were potentially affected. More than 14 CVEs were assigned, and Cursor, VS Code, Windsurf, Claude Code, and Gemini-CLI were all affected.

How has the ecosystem responded? Anthropic **did not change the protocol architecture itself**. Instead, it updated `SECURITY.md` to state explicitly that downstream developers are responsible for input sanitization when using stdio adapters. At the specification level, the **2025-06-18 revision mandated OAuth 2.1 plus RFC 8707 Resource Indicators** to block token-reuse attacks, and the **2025-11-25 revision introduced incremental scope consent**, through which users approve only the minimum permissions needed, one step at a time. Even so, more than 30 MCP-related CVEs were issued in January and February 2026 alone, and statistics showed that **command injection accounted for 43%** of them. **Security remains very much a work in progress.**


## Code Intelligence Tools

If `.md` files answer “what should we tell the agent?” and MCP answers “what should we enable it to do?”, code intelligence tools answer the question of “**how can we find relevant code quickly?**”

In a large codebase, most of an AI agent’s cost comes not from changing code but from **finding where the relevant code lives**. If every task begins with a repeated grep → read → filter → grep cycle, tokens, time, and tool calls are wasted. Code intelligence tools represent a variety of attempts to reduce this search cost.

The landscape becomes clearer when divided into four tiers.


### Context Packing

The simplest solution begins with the idea: “**Put everything into one context window.**” It builds no graph and performs no indexing. It simply serializes the entire repository into a block of text and hands the whole thing to the model.

The representative tool is **Repomix**. It packages an entire repository into a structure optimized for Claude’s XML parsing. With a CLI, web interface, extension, and MCP server, it has the most complete ecosystem in the category.

**GitIngest** is known for its zero-friction usability. Change the single word `github.com` to `gitingest.com` in a GitHub URL, and the entire repository is transformed into one text page. (For example, `github.com/facebook/react` → `gitingest.com/facebook/react`.) Changing one word in the browser’s address bar is all it takes, with no installation required. It is optimized for quick, one-off exploration.

**code2prompt**, created by Mufeed VH, is a Rust-based CLI whose strength lies in customization through a template system.

An interesting variant is **rtk** (`rtk-ai/rtk`, about 55k stars). Whereas the tools above “pack the entire repository at once,” rtk **compresses the output of CLI commands in real time**. It is a single binary written in Rust that automatically registers itself with the shell hooks of 13 tools, including Claude Code, Cursor, Copilot, Gemini CLI, and Codex. When an agent invokes `git status`, the hook rewrites it internally as `rtk git status`. (The fact that users do not need to change their workflows is its key differentiator.) It applies smart filtering, grouping, truncation, and deduplication heuristics to more than 100 commands, reducing output tokens by 60–90%. One sentence from the official site neatly summarizes this category: *“70% of your bill is noise the LLM doesn't need.”* While the earlier tools reduce the volume of context going in, rtk reduces the volume of context returned by tool calls.

The limitation of this tier is clear, however: **large repositories hit token limits**. And because code is delivered only as a “block of text,” there is no structural understanding of relationships among symbols.


### tree-sitter Repository Maps

The next tier uses **tree-sitter** to analyze code structure without running a separate index server.

An **AST (Abstract Syntax Tree)** is a data structure that represents source-code structure as a tree. It is the output of a compiler’s parsing stage: superficial details such as whitespace, semicolons, and parentheses are removed, while meaningful elements such as variables, operators, function calls, and control flow remain as nodes. Every precise form of analysis in code intelligence ultimately operates on an AST.

**tree-sitter** is an open-source parser generator and incremental parsing library. It has been adopted by GitHub’s code navigation, Neovim, Zed, and Helix. Its key differentiator is that **it reparses only the edited region**. When you change a single line in an editor, it patches only the changed tree instead of parsing the entire file again. This makes it responsive and well suited to rapid code exploration by AI agents.

**Aider**, discussed earlier, is a representative example of this approach. It uses tree-sitter to extract symbol definitions such as functions, classes, and methods from source files; constructs a graph with files as nodes and inter-file dependencies as edges; applies a PageRank-family ranking algorithm—which measures a page’s importance by the number and quality of links pointing to it—and extracts only the most important definitions and signatures within a token budget. (By default, `--map-tokens=1024` creates a 1k-token repository map.)

**AFT** (`cortexkit/aft`) develops this approach with greater precision. In the words of AFT’s official README: **“Reading a 500-line file costs about 375 tokens. But when an agent needs only one function most of the time, passing the symbol name to `aft_zoom` returns only that function and a little context. This costs about 40 tokens.”** Line-number-based editing breaks as soon as code above the target moves, whereas AFT’s symbol-mode editing is stable because it addresses functions by name.

Another tool worth noting in the same tier is **ast-grep** (`ast-grep/ast-grep`, about 13.9k stars). It is a tree-sitter-based structural search and rewriting CLI. Its decisive difference from ordinary grep is that it matches CST (Concrete Syntax Tree) patterns rather than text. A search for the pattern `console.log($A)`, for example, finds every call with the same semantic structure, regardless of how the text is formatted. A separate `ast-grep-mcp` server also lets AI agents use structural search instead of text grep.


### Knowledge Graph

The third tier goes a step further. It **parses the entire codebase in advance, builds a knowledge graph, stores it on disk**, and lets the agent query that stored graph. The most talked-about example is a tool called **CodeGraph**.

Its architecture is surprisingly simple. Code is parsed with **tree-sitter**; the extracted symbols, edges, and file information are stored in SQLite FTS5 full-text search; and the resulting knowledge graph is exposed to AI agents through MCP. One important detail is that **all extraction is performed deterministically through AST parsing, not through LLM summarization**. In other words, there is no room for hallucination to enter the process.

**FTS5 (SQLite Full-Text Search 5)**, mentioned above, is a full-text search extension provided as a SQLite virtual table. It has been included in the SQLite amalgamation since SQLite 3.9.0 (2015-10-14). You create a table with `CREATE VIRTUAL TABLE ... USING fts5(...)` and query it with the `MATCH` operator. Its decisive advantage is that you can operate a full-text index in a single SQLite file without running a separate search engine such as Elasticsearch. This is one reason CodeGraph can advertise “100% local operation.”

The **deterministic parsing** just mentioned refers to parsing algorithms that allow only one choice at each stage, without backtracking. LL(1) and LR parsers are representative examples and run in linear time. In the context of CodeGraph, it means that “the symbol relationships extracted from the AST are mathematically precise rather than based on an LLM’s interpretation.” An LLM-generated code summary can hallucinate, while direct AST parsing yields **mathematically precise symbol relationships**; this principle is central to the approach.

The benchmarks are impressive as well. In a comparison of headless Claude Opus 4.7 runs with and without the CodeGraph MCP enabled, the averages reported in the official README show costs falling by **35%**, token usage by **57%**, runtime by **46%**, and tool calls by **71%**. The gains increase with codebase size: on a large repository such as Tokio, the measurements showed an 82% reduction in cost, an 86% reduction in tokens, a 71% improvement in speed, and a 92% reduction in tool calls. (Without CodeGraph, an agent fans out widely across grep/find/Read; with CodeGraph, a single index query replaces all of that.)

The approach also has deep academic roots. **GraphCoder** (ASE 2024) created a Code Context Graph combining control flow with data/control dependence. **CodexGraph** (NAACL 2025) enabled an LLM agent to write and execute graph-database queries directly. **Prometheus** combined a tree-sitter-based knowledge graph with unified memory and applied it to multilingual issue resolution. Academia and industry are clearly converging on this pattern.

One interesting variant deserves mention here. **Cursor’s indexing** takes a different path: semantic search based on vector embeddings rather than an AST graph. Locally, it splits files into chunks at function and class boundaries, synchronizes them with the server through Merkle tree hashes, and stores only the embeddings in a vector database called Turbopuffer. (Its central privacy claim is that the original source code is not stored in the cloud.) At query time, it embeds the question, runs a nearest-neighbor search, then locally reads the file paths and line ranges returned by the search and sends that content to the LLM. Because it seeks **“semantically related code” rather than “exact symbols,”** it has lower precision but performs well with natural-language queries. CodeGraph and Cursor indexing solve the same problem—search cost—from different assumptions.


### LSP

The final tier **depends directly on a language server**. tree-sitter knows “that a symbol exists”; LSP knows “what that symbol is.”

Consider a concrete example. A TypeScript LSP knows that `UserService` implements the `IUserService` interface, which generic type parameters it accepts, which overloads it has, and what its return type is. tree-sitter cannot go that far.

**Serena**, discussed in the MCP section, belongs precisely to this tier. Because Aider does not use LSP and performs its own file analysis, its recognition is limited to the function and class level. By contrast, an LSP integration such as the one in **OpenCode** provides deeper type awareness, though it is limited by its dependence on a good LSP server for each language.


## GitHub Trending

![AI coding agent tools and code intelligence flow](1.webp)

Finally, **GitHub Trending** is where I first discovered many of the tools discussed above. It offers an at-a-glance view of who is building what and which projects are suddenly gaining traction.

At `github.com/trending`, you can browse three time ranges: today, this week, and this month. You can also filter by language and category. (I usually look at weekly results for TypeScript and Python, occasionally expanding to all languages.)

One interesting pattern I noticed while tracking Trending over the past few weeks is that **this quarter’s leading repositories form clear clusters**. Understanding those clusters makes it easier to place individual tools in context.

## So, What Does This Mean?

The thought that occurred to me most often while writing this article was that **the number of tools is growing extraordinarily fast**. Even as I wrote, new MCP servers appeared on GitHub Trending, the status of AGENTS.md support changed, and new security CVEs were issued. Half-finished paragraphs quickly becoming outdated is a familiar fate of technical writing, but the pace of the AI agent ecosystem is unusually steep.

That is why my goal here was not to recommend a particular tool, but to develop **an eye for the relationships among tools**. Once you understand why CLAUDE.md is injected as a user message, exactly how MCP differs from function calling, and why tree-sitter and LSP occupy different tiers, a new tool becomes much easier to read: “This belongs to that tier, and it solves this problem in this way.”

What remains, ultimately, is one intuition from the ETH Zurich study: **the model already knows a great deal**. Stuffing a context file with everything you can think of does not make the agent follow it more faithfully. It is better to keep only what the model is unlikely to know—project-specific conventions, nonstandard tools, and past mistakes—and remove the rest. Installing more tools and using tools well are different problems.

Rather than immediately adding ten MCP servers or expanding CLAUDE.md to hundreds of lines, I encourage readers to spend some time investigating how the tools they already use actually work. I believe that understanding provides a stable foundation, no matter which direction the ecosystem takes next.


## References

:::ref
- [docs] [Claude Code Memory, Anthropic](https://code.claude.com/docs/en/memory)
- [docs] [MCP Specification 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle)
- [docs] [Anthropic Tool Use Overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [docs] [Cursor Rules Documentation](https://cursor.com/docs/context/rules)
- [paper] [ETH Zurich, "Evaluating AGENTS.md" (2602.11988)](https://arxiv.org/abs/2602.11988)
- [paper] [Yue Zhang et al., "Siren's Song" (2309.01219)](https://arxiv.org/abs/2309.01219)
- [paper] [Ziwei Xu et al., "Hallucination is Inevitable" (2401.11817)](https://arxiv.org/abs/2401.11817)
- [paper] [Nelson F. Liu et al., "Lost in the Middle" (2307.03172)](https://arxiv.org/abs/2307.03172)
- [article] [Simon Willison, "Claude Skills are awesome"](https://simonwillison.net/2025/Oct/16/claude-skills/)
- [article] [Simon Willison, MCP Prompt Injection](https://simonwillison.net/2025/Apr/9/mcp-prompt-injection/)
- [article] [OX Security, MCP Supply Chain Advisory](https://www.ox.security/blog/mcp-supply-chain-advisory-rce-vulnerabilities-across-the-ai-ecosystem/)
- [repo] [rtk-ai/rtk](https://github.com/rtk-ai/rtk)
:::
