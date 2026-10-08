---
emoji: 🔎
title: "Four Tiers of Code Intelligence"
seoTitle: "AI Agent Code Search: Repomix, Aider, CodeGraph, Serena"
date: "2026-05-26"
updatedAt: "2026-10-08"
locale: en
translationOf: '260526'
sourceHash: 9a33115d344f82b9a1e409d899e5e6da01038a2ca2503ea140cf69b7034b52c5
categories: AI Developer-Tools Claude MCP CodeGraph
description: "Four tiers of tools that cut an AI agent's code search cost: context packing like Repomix, tree-sitter repo maps, CodeGraph's graph, and LSP-based Serena."
keywords: "code intelligence, CodeGraph, Serena MCP, tree-sitter, LSP, Repomix, Aider repo map, AI coding agent token savings"
---

In this post, I want to talk about **how the tools that cut an AI coding agent's cost of finding relevant code differ from one another**.

This is for developers who have watched an agent burn tokens by repeating grep and file reads in a large codebase, and who are wondering which tool to add, such as Repomix, CodeGraph, or Serena. By the end, you will be able to tell how these tools differ by how deeply they understand code, and where each approach cuts the search cost. That depth falls into four levels: context packing, which puts the code in whole as text; tree-sitter repository maps, which know that a symbol exists; knowledge graphs, which store symbol relationships in advance; and LSP, which knows what that symbol is. For the three tiers other than the knowledge graph, I include what I measured directly on this blog's own `src/`; for the knowledge graph, I include its maker's benchmark.

Ever since I saw `codegraph` on GitHub Trending and installed it myself, I have wondered, every time I come across a new tool, how exactly it saves tokens. Many of the tools in this post, too, I first came across on GitHub Trending, which I usually browse weekly, filtered to TypeScript and Python.


## Code Intelligence Tools

Before an agent changes any code, it first has to find where the relevant code lives. It greps, reads files, filters, and greps again. In the CodeGraph benchmark we will look at later, the side answering without the tool used up to 43 tool calls for a single question. Code intelligence tools are attempts to cut this search cost.

"Cost" does not point to one thing, though. Tokens the model processed, the number of tool calls, and tokens still sitting in the context window after the work is done all move separately. For each tier, this post looks at which of the three it cuts.

I divide these attempts into the four tiers below. This is not an established industry classification; it is my own grouping, based on how deeply each tool understands code. Every value I measured myself was taken on 2026-10-08 at commit `36e5cfa` of this repository, and tokens were counted with tiktoken's `o200k_base`. The values differ from Claude's tokenizer, so use them for comparison rather than as absolute numbers.


### Context Packing

The simplest solution begins with the idea: "**Put everything into one context window.**" It builds no graph and performs no indexing. It simply serializes the entire repository into a block of text and hands the whole thing to the model.

The representative tool is **Repomix**. Its default output format is XML, and its README links to Anthropic's documentation on XML tags. It ships a CLI, a web app, a browser extension, and an MCP server.

**GitIngest** is known for zero-friction usability. In a GitHub URL, change just one word, `github.com` to `gitingest.com`, and the whole repository becomes a single text page. (For example: `github.com/facebook/react` → `gitingest.com/facebook/react`.) Since all you do is change one word in the browser's address bar, no installation is needed. It is built for quick one-off exploration.

**code2prompt** (made by Mufeed VH) is a Rust-based CLI whose strength is customization through a template system.

**rtk** (`rtk-ai/rtk`) takes a slightly different direction. Where the tools above pack the whole repository at once, rtk compresses the output of the CLI commands an agent runs. It is a single Rust binary, registered in the hooks of several agents including Claude Code, Cursor, Copilot, Gemini CLI, and Codex, so when the agent calls `git status`, it runs `rtk git status` instead. It applies filtering, grouping, truncation, and deduplication to more than 100 commands. The hook only fires on Bash tool calls. Claude Code's `Read`, `Grep`, and `Glob` pass straight through.

The size of the reduction needs careful reading. The [rtk README](https://github.com/rtk-ai/rtk/blob/8533612180c60efbcb5827c7db4e910aba096705/README.md#L66-L70) says it cuts Bash output by up to 90%, then immediately adds that this does not mean cutting your bill by 90%. From the model's side, command output is part of the input tokens, and input tokens are part of the bill, so the reduction dilutes at each step. The figure the [official site](https://www.rtk-ai.app/) puts forward is 56% on average, for the commands rtk rewrites. Where the tools above shrink the text going in, rtk shrinks the text coming back as tool call results.

The limit of this tier is that **large repositories hit the token ceiling**. Packing just the 109 files in this blog's `src/` comes to 94,596 tokens. Repomix answers this with `--compress`. According to the [README](https://github.com/yamadashy/repomix/blob/8d6429121e98ed178e4d3a975c2bdbbecc958c4a/README.md#L797-L831), it uses Tree-sitter to keep function and class signatures and drop the implementation bodies.

```bash
# repomix 1.18.1, 이 리포 커밋 36e5cfa, 2026-10-08
npx -y repomix@1.18.1 src -o out.xml              # Total Tokens: 94,596 tokens
npx -y repomix@1.18.1 src --compress -o out.xml   # Total Tokens: 30,320 tokens
```

That is a 68% reduction. Comments stay, so `visit-counter.ts`, which has long JSDoc, only went from 1,642 to about 1,220 tokens, a 26% cut. What the compressed output keeps is each file's syntax, without relationships such as who calls whom. So the boundary between this tier and the next lies less in whether a tool sees syntax than in whether it can be asked about relationships.


### tree-sitter Repository Maps

The next tier uses **tree-sitter** to analyze code structure without running a separate index server.

An **AST (Abstract Syntax Tree)** is a data structure that represents the structure of source code as a tree. It is the output of a compiler's parsing stage, dropping surface details such as parentheses and semicolons and keeping only elements like variables, operators, and function calls as nodes. What tree-sitter, the tool this tier relies on, actually builds is a **CST (Concrete Syntax Tree)**. The [official tree-sitter documentation](https://tree-sitter.github.io/tree-sitter/) also says it builds a concrete syntax tree. That tree keeps even parentheses and punctuation as nodes, and it is the tree the tools below work with.

**tree-sitter** is an open-source parser generator and incremental parsing library. [GitHub's code navigation](https://docs.github.com/en/repositories/working-with-files/using-files/navigating-code-on-github) uses tree-sitter. Because it reparses only the edited part, changing one line in an editor does not reparse the whole file; it fixes only the changed part of the tree. That advantage belongs to editors, where edits keep happening. Aider, below, keeps a cache keyed on file modification time so it does not reparse files that have not changed.

**Aider**, an AI pair programming tool used in the terminal, is the representative example of this approach. It uses tree-sitter to extract definitions and references of functions, classes, and methods from each file, and builds a graph with files as nodes. When file A references an identifier defined in file B, an edge runs from A to B. It runs personalized PageRank on this graph (a variant that scores node importance by the number and weight of links, tilted toward chosen nodes), then fits the definitions and signatures of the top-ranked files into the token budget.

What goes into the budget changes with the current conversation. In Aider's [`repomap.py`](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/aider/repomap.py#L487-L525), an edge weight is the square root of the reference count times a multiplier. Identifiers mentioned in the conversation get 10x, camelCase or snake_case identifiers of 8 or more characters also get 10x, identifiers starting with `_` get 0.1x, and edges going out of files currently added to the chat get 50x. Files in the chat and files mentioned in the conversation also receive PageRank personalization scores.

The budget is not fixed either. [Aider's documentation](https://aider.chat/docs/repomap.html) gives the `--map-tokens` default as 1k, but the [code](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/aider/models.py#L782-L789) clamps one eighth of the model's input limit to between 1,024 and 4,096. And when no files are in the chat, it grows up to `--map-multiplier-no-files` (default 2) times. I checked this with this repository's `src/`. The 0.86.1 release I ran and the commit linked above have the same ranking code.

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

| Condition | Budget Aider chose | Map printed | Files included |
|---|---|---|---|
| Defaults, no file in chat | 4,096 | 7,370 tokens | 61 |
| `--map-tokens 1024`, no file in chat | 1,024 | 2,019 tokens | 27 |
| `--map-tokens 1024`, `filter-posts.ts` added to chat | 1,024 | 983 tokens | 12 |

gpt-4o has a 128k input limit, so one eighth was clamped to 4,096, and with an empty chat the map came out within twice that. Once one file was added to the chat, the map shrank to fit the budget; only 10 of the earlier 27 files remained, and `PostList.tsx` and `SearchModal.tsx` came in new. A repo map is not a fixed summary of the repository but an excerpt fitted to the conversation at that moment.

**AFT** (`cortexkit/aft`) reads and edits at the symbol level. Line-number-based edits break the moment code above the target shifts, but AFT's symbol-mode edits address functions by name, so they are unaffected.

There is one more tool worth noting in this tier: **ast-grep** (`ast-grep/ast-grep`). It is a tree-sitter-based CLI for structural search and rewrite, and it matches syntax tree nodes rather than text. For example, the pattern `console.log($A)` catches every call to `console.log` with a single argument, regardless of how line breaks or whitespace look. What it catches is the same syntactic structure. It does not know the type of `$A` or where the name `console` comes from. There is also an `ast-grep-mcp` server, so you can make an agent use structural search instead of text grep.


### Knowledge Graph

The third tier goes one step further. It **parses the entire codebase in advance, builds a knowledge graph, and stores it on disk**; the agent then sends queries to that stored graph. The most talked-about example is a tool called **CodeGraph**.

The structure the [CodeGraph README](https://github.com/colbymchenry/codegraph/blob/b635dd467f0578926a9c01a37b9d28d2b26689f1/README.md) describes is simple. It parses code with tree-sitter to extract symbols, edges, and file information, and stores them in a local SQLite database. Name search goes through SQLite's FTS5 index. The agent asks this graph through MCP. And **this extraction happens deterministically from syntax tree parsing, not from LLM summaries.**

**FTS5 (SQLite Full-Text Search 5)**, which appears here, is a full-text search extension provided as an SQLite virtual table. According to the [SQLite documentation](https://www.sqlite.org/fts5.html), it has been included in the amalgamation since 3.9.0 (2015-10-14); you create a table with `CREATE VIRTUAL TABLE ... USING fts5(...)` and query it with the `MATCH` operator. You can keep a full-text index in a single SQLite file without running a separate search engine such as Elasticsearch.

The word **deterministic** I just used means that the same code always produces the same result. If an LLM summarizes code to build the graph, results can vary even for the same code, and hallucinations can creep in. Parsing the syntax tree directly, by contrast, extracts symbol relationships only by the rules of the language grammar, leaving no room for that kind of interpretation.

Deterministic is not the same as complete, though. The same README lists route recognition for frameworks that lean on convention and reflection at 83.3% for Spring and 83.9% for ASP.NET, and calls this the honest static-analysis ceiling. The same code gives the same result, but that result can be missing edges.

The benchmark was measured by CodeGraph itself. The same README's 2026-08-05 re-measurement ran Claude Opus 4.8 headless and asked one architecture question each on 7 open-source repositories. The side with CodeGraph MCP enabled cut average cost by 44%, processed tokens by 62%, and tool calls by 88%. This re-measurement blocked both sides from calling the `codegraph` CLI through Bash. On a harness without that block, the side without the tool found and used the CLI in 26 of 28 runs, and the README states that earlier published figures were produced without the block. The Opus 4.7 figures this post first carried (35% cheaper, 71% fewer tool calls) are those earlier figures.

The size of the savings did not follow repository size. On questions where the side without the tool used 28 to 43 tool calls, cost fell by 57 to 78%, and on Gin, which finished in 7, it was about even. VS Code, with about 11k files, came in at 71%, and Excalidraw, with about 640, at 78%. The more searching a question needed, the bigger the gain.

The README also records a number pointing the other way. Processed tokens go down, but at the end of a multi-turn session, the retrieval results still sitting in the context window are about 80% larger on the CodeGraph side. On VS Code it is 67k versus 18k tokens. It returns dense source text in one go, and that text stays in the window. This tier cuts tool calls and processed tokens, at the price of more left in the window.

Academia has research in the same direction. [GraphCoder](https://arxiv.org/abs/2406.07003) (ASE 2024) built a Code Context Graph combining control flow with data/control dependence, and [CodexGraph](https://aclanthology.org/2025.naacl-long.7/) (NAACL 2025) had LLM agents write and run graph database queries themselves. [Prometheus](https://arxiv.org/abs/2507.19942), a preprint that has not gone through peer review, attached working memory to a tree-sitter-based knowledge graph and applied it to issue resolution across multiple languages.

**Cursor** took a different road and then changed course. The indexing described in the [January 2026 Cursor blog post](https://cursor.com/blog/secure-codebase-indexing) was not a syntax graph but **semantic search based on vector embeddings**. It split files into chunks locally, synced with the server via Merkle tree hashes, and stored embeddings in a vector DB called Turbopuffer. In July 2026, a Cursor Community Support Engineer replied on the [forum](https://forum.cursor.com/t/what-do-you-think-about-cursor-removing-the-codebase-indexing-settings/165899): "Semantic/embeddings indexing is being turned down in favor of grep-based retrieval". In the same thread, another staff member wrote that as models got good at using grep, the older semantic search path was no longer helping in a meaningful way. The [Cursor documentation](https://cursor.com/docs/context/codebase-indexing) now says Instant Grep builds and queries its index on your machine and does not store embeddings of your codebase.


### LSP

The last tier **relies directly on a language server**. If tree-sitter knows "that a symbol exists," LSP knows "what that symbol is."

**[LSP (Language Server Protocol)](https://microsoft.github.io/language-server-protocol/)** is an open, JSON-RPC-based protocol that standardizes communication between editors and language analysis tools (code completion, go to definition, find references, refactoring, and so on). In 2016, [Microsoft, Red Hat, and Codenvy announced a collaboration on it](https://www.redhat.com/en/about/press-releases/red-hat-codenvy-and-microsoft-collaborate-language-server-protocol). The core idea is "don't reimplement a language analyzer for every editor; keep one server per language and have every editor query it." rust-analyzer and Python's pyright are LSP servers, while TypeScript uses typescript-language-server, which wraps `tsserver` (which speaks its own protocol) in LSP.

**Serena** (`oraios/serena`) is an MCP server in this tier. As of 2026-10-08 it has 30,093 stars, and the repository was created in March 2025. Serena's core idea fits in one line: **show the agent symbols, not text.** Its core tools include `find_symbol`, `find_referencing_symbols`, and `get_symbols_overview`. You can choose one of two backends. The default is a language server implementing LSP (free/open source); the other option is a paid plugin that uses JetBrains IDE code analysis (with a free trial).

Measuring on this repository shows where the difference comes from. I looked for usages of `isHiddenPost` (`src/lib/filter-posts.ts:12`), which filters out private posts, in two ways. The text side is grep.

```bash
# 커밋 36e5cfa, 2026-10-08. 이 글도 같은 이름을 담고 있어 content/ 는 뺐다
git grep -n isHiddenPost -- ':!content'   # 16줄, 파일 9개
```

On the LSP side, typescript-language-server answers `textDocument/references` with TypeScript's `findReferences` API, and I called that API directly. I did not measure by running Serena. LSP's find references asks by position (file, line, and column), not by name. That is why Serena's [`find_referencing_symbols`](https://github.com/oraios/serena/blob/3b99f8b024dafd58c962ea6e74f37c8a730ef532/src/serena/tools/symbol_tools.py#L169-L172) takes both `name_path` and `relative_path`. For this example, it is `find_referencing_symbols(name_path="isHiddenPost", relative_path="src/lib/filter-posts.ts")`.

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

Both sides found the same 11 code locations. This name is unique in the repository, so grep neither missed nor added any code location. The difference came from the other 5. grep also returned 5 lines of explanatory text from `CLAUDE.md`, the command docs, and their snapshots.

Serena returns each reference with [one line before and after](https://github.com/oraios/serena/blob/3b99f8b024dafd58c962ea6e74f37c8a730ef532/src/serena/repl/api/lsp_api.py#L367-L369). So I applied the same rule to both sides and counted the tokens of each location's `file:line` plus one line before and after.

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

| Method | Locations | tokens |
|---|---|---|
| grep | 16 (code 11, docs 5) | 1,172 (code 453, docs 719) |
| findReferences (definition excluded) | 10 | 423 |

Of the 749-token difference, 719 comes from the 5 doc locations. What LSP saved in this repository was not the cost of finding code locations but the cost of reading noise matches. If the agent read all 9 files grep hit in full, the grep side would grow to 47,737 tokens, 43,318 of them from the 5 doc files. That is an upper bound. In a real session, `CLAUDE.md` is likely already in context and would not be read again. With a common name like `isLocale`, results could differ even in code locations, but I did not measure that this time.

Aider does not use LSP, so its awareness stops at the function and class level. [OpenCode](https://opencode.ai/docs/lsp/) attaches LSP servers and by default feeds diagnostics back to the agent. Its `lsp` tool, which asks for definitions, references, hover, and call hierarchy, is only enabled when [`OPENCODE_EXPERIMENTAL_LSP_TOOL=true`](https://opencode.ai/docs/tools/). Either way, there is the condition that each language needs a good LSP server.


## Wrapping Up

To sum up, the four tiers split by how deeply they understand code, and they cut different costs. Context packing hands over code as text, and even with `--compress` it keeps only syntax, cutting the tokens going in. A tree-sitter repository map knows that a symbol exists puts a budget cap on the tokens going in, and lets the conversation at that moment decide what fills it. A knowledge graph stores relationships in advance and cuts tool calls and processed tokens, but by the vendor's measurement, what stays in the window actually grew. LSP knows what a symbol is, and in this repository most of its savings came from filtering out the noise matches grep drags along, which cut the tokens to process.

So when I pick a tool, I look first at which cost is the problem right now, rather than at how deep the tier goes. If the window is small and sessions are long, I look at what stays behind; if round trips are slow, at the number of tool calls; if docs and code share names in the repository, at noise matches. I read Cursor stripping out semantic search and going back to grep as a sign that the deeper tier is not always better.

If these tools cut the cost of an agent finding code, how much of the project rules an agent should know from the start to write, and in which file, is a separate problem. I cover that in [Context Files](/260529).


## References

:::ref
- [repo] [cortexkit/aft](https://github.com/cortexkit/aft)
- [repo] [ast-grep/ast-grep](https://github.com/ast-grep/ast-grep)
- [repo] [ast-grep/ast-grep-mcp](https://github.com/ast-grep/ast-grep-mcp)
:::
