---
emoji: 🔎
title: "Four Tiers of Code Intelligence"
seoTitle: "AI Agent Code Search: Repomix, Aider, CodeGraph, Serena"
date: "2026-05-26"
locale: en
translationOf: '260526'
sourceHash: bc95fa9a1eea99621bdce773adb71ff0545702b869b35e911fc65e97307a5faf
categories: AI Developer-Tools Claude MCP CodeGraph
description: "Four tiers of tools that cut an AI agent's code search cost: context packing like Repomix, tree-sitter repo maps, CodeGraph's graph, and LSP-based Serena."
keywords: "code intelligence, CodeGraph, Serena MCP, tree-sitter, LSP, Repomix, Aider repo map, AI coding agent token savings"
---

In this post, I want to talk about **how the tools that cut an AI coding agent's cost of finding relevant code differ from one another**.

This is for developers who have watched an agent burn tokens by repeating grep and file reads in a large codebase, and who are wondering which tool to add, such as Repomix, CodeGraph, or Serena. I divide these tools into four tiers according to how deeply they understand code: context packing, which puts the code in whole as text; tree-sitter repository maps, which know that a symbol exists; knowledge graphs, which store symbol relationships in advance; and LSP, which knows what that symbol is.

Ever since I saw `codegraph` on GitHub Trending and installed it myself, I have wondered, every time I come across a new tool, how exactly it saves tokens.


## Code Intelligence Tools

In a large codebase, most of an AI agent’s cost comes not from changing code but from **finding where the relevant code lives**. If every task begins with a repeated grep → read → filter → grep cycle, tokens, time, and tool calls are wasted. Code intelligence tools represent a variety of attempts to reduce this search cost.

I divide these attempts into the four tiers below. This is not an established industry classification; it is my own grouping, based on how deeply each tool understands code.


### Context Packing

The simplest solution begins with the idea: “**Put everything into one context window.**” It builds no graph and performs no indexing. It simply serializes the entire repository into a block of text and hands the whole thing to the model.

The representative tool is **Repomix**. It packages an entire repository into a structure optimized for Claude’s XML parsing. With a CLI, web interface, extension, and MCP server, it has the most complete ecosystem in the category.

**GitIngest** is known for its zero-friction usability. Change the single word `github.com` to `gitingest.com` in a GitHub URL, and the entire repository is transformed into one text page. (For example, `github.com/facebook/react` → `gitingest.com/facebook/react`.) Changing one word in the browser’s address bar is all it takes, with no installation required. It is optimized for quick, one-off exploration.

**code2prompt**, created by Mufeed VH, is a Rust-based CLI whose strength lies in customization through a template system.

An interesting variant is **rtk** (`rtk-ai/rtk`, about 55k stars). Whereas the tools above “pack the entire repository at once,” rtk **compresses the output of CLI commands in real time**. It is a single binary written in Rust that automatically registers itself with the shell hooks of 13 tools, including Claude Code, Cursor, Copilot, Gemini CLI, and Codex. When an agent invokes `git status`, the hook rewrites it internally as `rtk git status`. (The fact that users do not need to change their workflows is its key differentiator.) It applies smart filtering, grouping, truncation, and deduplication heuristics to more than 100 commands, reducing output tokens by 60–90%. One sentence from the official site neatly summarizes this category: **“70% of your bill is noise the LLM doesn't need.”** While the earlier tools reduce the volume of context going in, rtk reduces the volume of context returned by tool calls.

The limitation of this tier is clear, however: **large repositories hit token limits**. And because code is delivered only as a “block of text,” there is no structural understanding of relationships among symbols.


### tree-sitter Repository Maps

The next tier uses **tree-sitter** to analyze code structure without running a separate index server.

An **AST (Abstract Syntax Tree)** is a data structure that represents source-code structure as a tree. It is the output of a compiler’s parsing stage: superficial details such as whitespace, semicolons, and parentheses are removed, while meaningful elements such as variables, operators, function calls, and control flow remain as nodes. Every precise form of analysis in code intelligence ultimately operates on an AST.

**tree-sitter** is an open-source parser generator and incremental parsing library. It has been adopted by GitHub’s code navigation, Neovim, Zed, and Helix. Its key differentiator is that **it reparses only the edited region**. When you change a single line in an editor, it patches only the changed tree instead of parsing the entire file again. This makes it responsive and well suited to rapid code exploration by AI agents.

**Aider**, an AI pair programming tool used in the terminal, is a representative example of this approach. It uses tree-sitter to extract symbol definitions such as functions, classes, and methods from source files; constructs a graph with files as nodes and inter-file dependencies as edges; applies a PageRank-family ranking algorithm—which measures a page’s importance by the number and quality of links pointing to it—and extracts only the most important definitions and signatures within a token budget. (By default, `--map-tokens=1024` creates a 1k-token repository map.)

**AFT** (`cortexkit/aft`) develops this approach with greater precision. In the words of AFT’s official README: **“Reading a 500-line file costs about 375 tokens. But when an agent needs only one function most of the time, passing the symbol name to `aft_zoom` returns only that function and a little context. This costs about 40 tokens.”** Line-number-based editing breaks as soon as code above the target moves, whereas AFT’s symbol-mode editing is stable because it addresses functions by name.

Another tool worth noting in the same tier is **ast-grep** (`ast-grep/ast-grep`, about 13.9k stars). It is a tree-sitter-based structural search and rewriting CLI. Its decisive difference from ordinary grep is that it matches CST (Concrete Syntax Tree) patterns rather than text. A search for the pattern `console.log($A)`, for example, finds every call with the same semantic structure, regardless of how the text is formatted. A separate `ast-grep-mcp` server also lets AI agents use structural search instead of text grep.


### Knowledge Graph

The third tier goes a step further. It **parses the entire codebase in advance, builds a knowledge graph, stores it on disk**, and lets the agent query that stored graph. The most talked-about example is a tool called **CodeGraph**.

Its architecture is surprisingly simple. Code is parsed with **tree-sitter**; the extracted symbols, edges, and file information are stored in SQLite FTS5 full-text search; and the resulting knowledge graph is exposed to AI agents through MCP. One important detail is that **all extraction is performed deterministically through AST parsing, not through LLM summarization**. In other words, there is no room for hallucination to enter the process.

**FTS5 (SQLite Full-Text Search 5)**, mentioned above, is a full-text search extension provided as a SQLite virtual table. It has been included in the SQLite amalgamation since SQLite 3.9.0 (2015-10-14). You create a table with `CREATE VIRTUAL TABLE ... USING fts5(...)` and query it with the `MATCH` operator. Its decisive advantage is that you can operate a full-text index in a single SQLite file without running a separate search engine such as Elasticsearch. This is one reason CodeGraph can advertise “100% local operation.”

The word **deterministic** used just now means that the same code always produces the same result. If an LLM summarizes code to build the graph, the result can differ even for the same code, and there is a risk of hallucination creeping in. Parsing the AST directly, by contrast, extracts symbol relationships only according to the rules of the language's grammar, leaving no room for such interpretation. That is why this principle is central to CodeGraph.

The benchmarks are impressive as well. In a comparison of headless Claude Opus 4.7 runs with and without the CodeGraph MCP enabled, the averages reported in the official README show costs falling by **35%**, token usage by **57%**, runtime by **46%**, and tool calls by **71%**. The gains increase with codebase size: on a large repository such as Tokio, the measurements showed an 82% reduction in cost, an 86% reduction in tokens, a 71% improvement in speed, and a 92% reduction in tool calls. (Without CodeGraph, an agent fans out widely across grep/find/Read; with CodeGraph, a single index query replaces all of that.)

The approach also has deep academic roots. **GraphCoder** (ASE 2024) created a Code Context Graph combining control flow with data/control dependence. **CodexGraph** (NAACL 2025) enabled an LLM agent to write and execute graph-database queries directly. **Prometheus** combined a tree-sitter-based knowledge graph with unified memory and applied it to multilingual issue resolution. Academia and industry are clearly converging on this pattern.

One interesting variant deserves mention here. **Cursor’s indexing** takes a different path: semantic search based on vector embeddings rather than an AST graph. Locally, it splits files into chunks at function and class boundaries, synchronizes them with the server through Merkle tree hashes, and stores only the embeddings in a vector database called Turbopuffer. (Its central privacy claim is that the original source code is not stored in the cloud.) At query time, it embeds the question, runs a nearest-neighbor search, then locally reads the file paths and line ranges returned by the search and sends that content to the LLM. Because it seeks **“semantically related code” rather than “exact symbols,”** it has lower precision but performs well with natural-language queries. CodeGraph and Cursor indexing solve the same problem—search cost—from different assumptions.


### LSP

The final tier **depends directly on a language server**. tree-sitter knows “that a symbol exists”; LSP knows “what that symbol is.”

**LSP (Language Server Protocol)** is an open, JSON-RPC-based protocol that standardizes communication between code editors/IDEs and “language intelligence tools” such as code completion, go to definition, find references, and refactoring. Microsoft, Red Hat, and Codenvy jointly standardized it in 2016. Its central idea is simple: instead of reimplementing a language analyzer for every editor, run one server per language and let every editor query that server. (The TypeScript server, Rust analyzer, and Python’s pyright are all LSP servers.)

Consider a concrete example. A TypeScript LSP knows that `UserService` implements the `IUserService` interface, which generic type parameters it accepts, which overloads it has, and what its return type is. tree-sitter cannot go that far.

Serena is a tool that belongs precisely to this tier.

**Serena** (`oraios/serena`) is one of the most frequently discussed MCP servers in the context of coding agents. As of May 2026, it has about 24.7k stars and has risen in roughly a year from a niche tool to a de facto standard code MCP.

Serena’s core idea can be summarized in one sentence: **show the agent symbols, not text.**

To unpack that idea, suppose you need to find every use of a `calculateTotal` function. A conventional text-based tool such as grep or Read works like this.

It greps the entire codebase for `calculateTotal`. It then gathers the line number of every match and reads a fixed range of lines from each file to build context. It also captures accidental matches in variable names, string literals, and comments.

LSP-based Serena makes a single call to `find_referencing_symbols("calculateTotal")` and returns only exact symbol references, without noise from variable-name or comment matches.

Serena’s core tools include `find_symbol`, `find_referencing_symbols`, and `get_symbols_overview`. You can choose between two backends: the default is an LSP-compatible language server, which is free and open source; the other is a paid plugin that uses code analysis from a JetBrains IDE and offers a free trial.

The real reason Serena was adopted so quickly is **token savings**. A text grep-and-file-read loop consumes many tokens, while one precise LSP call consumes very few. The larger the codebase, the greater the difference.

Because Aider does not use LSP and performs its own file analysis, its recognition is limited to the function and class level. By contrast, an LSP integration such as the one in **OpenCode** provides deeper type awareness, though it is limited by its dependence on a good LSP server for each language.


## GitHub Trending

![AI coding agent tools and code intelligence flow](1.webp)

Finally, **GitHub Trending** is where I first discovered many of the tools discussed above. It offers an at-a-glance view of who is building what and which projects are suddenly gaining traction.

At `github.com/trending`, you can browse three time ranges: today, this week, and this month. You can also filter by language and category. (I usually look at weekly results for TypeScript and Python, occasionally expanding to all languages.)


## Wrapping Up

In short, the four tiers solve the same problem, the cost of finding relevant code, differently depending on how deeply they understand code. Context packing passes code only as text, tree-sitter repository maps know that a symbol exists, knowledge graphs store those relationships in advance, and LSP knows what the symbol is. The further down the tiers you go, the more you need to prepare, such as an index or a language server, but as the CodeGraph benchmark shows, the larger the codebase, the more the search cost drops.

If these tools reduce what it costs an agent to find code, deciding which file should hold the project rules the agent needs to know from the start, and how much to write there, is a separate question. That is covered in [AI Agent Tools](/260529).


## References

:::ref
- [repo] [rtk-ai/rtk](https://github.com/rtk-ai/rtk)
- [repo] [colbymchenry/codegraph](https://github.com/colbymchenry/codegraph)
- [repo] [oraios/serena](https://github.com/oraios/serena)
- [repo] [cortexkit/aft](https://github.com/cortexkit/aft)
:::
