---
emoji: 🔎
title: "代码智能的四个层级"
seoTitle: "AI 编程智能体的代码检索成本: Repomix、Aider、CodeGraph、Serena 对比"
date: "2026-05-26"
locale: zh-CN
translationOf: '260526'
sourceHash: 12ae267abbf5802434861218465e4cbe69856a28051e657f3bd9b0f53a15084c
categories: AI 开发工具 Claude MCP CodeGraph
description: "将降低 AI 编程智能体查找相关代码成本的工具分为四个层级进行比较，梳理 Repomix 等上下文打包、Aider 的 tree-sitter 仓库地图、CodeGraph 知识图谱，以及 Serena 等基于 LSP 的工具分别能理解代码到什么程度。"
keywords: "代码智能, CodeGraph, Serena MCP, tree-sitter, LSP, Repomix, Aider repo map, AI 编程智能体 节省 token"
---

本文想聊一聊**那些降低 AI 编程智能体查找相关代码成本的工具，彼此之间有什么不同**。

本文写给这样的开发者：看到智能体在大型代码库中反复 grep 和读取文件、不断消耗 token，正在犹豫该接入 Repomix、CodeGraph、Serena 中的哪一种。读完之后，你能分辨这些工具如何按照对代码理解的深度区分开来，以及每种方式在哪里降低检索成本。理解的深度分为四种：把代码作为文本整体放入的上下文打包、知道 symbol 存在的 tree-sitter 仓库地图、预先保存 symbol 关系的知识图谱，以及连 symbol 是什么都知道的 LSP。

自从看到 `codegraph` 登上 GitHub Trending 并跟着安装之后，笔者每次看到新工具，都会好奇它究竟靠什么原理节省 token。


## 代码智能工具

在大型代码库中，AI 智能体的大部分成本并不在修改代码本身，而在于**查找相关代码位于何处**。如果每项任务都从 grep → read → 筛选 → 再次 grep 的循环开始，token、时间与 tool call 都会被浪费。代码智能工具正是为了降低这种检索成本而出现的各种尝试。

笔者把这些尝试分为以下四个层级（tier）。这并不是业界既定的分类，而是笔者按照工具对代码理解的深度整理出的划分。


### 上下文打包

最简单的方案是：“**把所有内容都塞进一个上下文窗口。**”既不建图，也不做索引，只是把整个仓库序列化为一大块文本，再整体交给模型。

代表性工具是 **Repomix**。它把整个仓库打包成针对 Claude XML 解析优化的结构，并同时提供 CLI、Web、extension 与 MCP server，是这一类别中生态最完整的工具。

**GitIngest** 以零摩擦的易用性著称。只需把 GitHub URL 中的 `github.com` 换成 `gitingest.com`，整个仓库就会转换成一个文本页面。（例如 `github.com/facebook/react` → `gitingest.com/facebook/react`。）在浏览器地址栏里改一个单词就够了，无需安装，尤其适合一次性的快速探索。

**code2prompt**（由 Mufeed VH 开发）是一款基于 Rust 的 CLI，优势在于可以通过模板系统进行定制。

还有一个值得一提的有趣变体：**rtk**（`rtk-ai/rtk`，约 55k stars）。上述工具是“一次打包整个仓库”，而 rtk 会**实时压缩 CLI 命令本身的输出**。它是用 Rust 编写的单一 binary，可自动注册到 Claude Code、Cursor、Copilot、Gemini CLI、Codex 等 13 种工具的 shell hook 中。当智能体调用 `git status` 时，内部会 rewrite 为 `rtk git status`。（用户无需改变 workflow，是它的核心差异。）它针对 100 多种命令应用 smart filtering、grouping、truncation、deduplication heuristic，可将输出 token 减少 60～90%。官方网站的一句话很好地概括了这个类别——**“70% of your bill is noise the LLM doesn't need.”** 如果说前面的工具减少的是“输入的上下文”，rtk 减少的则是“tool call 返回的上下文”。

不过这一层级的局限很明确：**大型仓库会触及 token 上限**。而且代码只是以“一块文本”的形式交付，不包含 symbol 关系或结构性理解。


### tree-sitter 仓库地图

下一个层级利用 **tree-sitter** 分析代码结构，但不会另外启动 index server。

**AST（Abstract Syntax Tree，抽象语法树）**是用树形结构表示源代码结构的数据结构。它是编译器语法分析阶段的结果：空格、分号、括号等表层细节会被去除，只留下变量、运算符、函数调用、控制流等有意义的元素作为节点。代码智能工具的一切精确分析，最终都建立在 AST 之上。

**tree-sitter** 是一个开源 parser generator 与增量（incremental）解析库，GitHub 的代码导航、Neovim、Zed、Helix 都采用了它。其核心差异是**只重新解析被编辑的部分**。即使在编辑器中只改一行，它也不会重新解析整个文件，而只 patch 发生变化的树。因此响应速度很快，也适合 AI 智能体快速浏览代码。

在终端中使用的 AI 结对编程工具 **Aider** 是这一方案的代表。它用 tree-sitter 从源文件中提取函数、class、method 等 symbol 定义，以文件为 node、文件间依赖为 edge 构建 graph，再应用 PageRank 系列排名算法（通过指向页面的链接数量与质量衡量页面重要性），按 token budget 只提取核心定义与 signature。（默认通过 `--map-tokens=1024` 创建 1k token 的仓库地图。）

**AFT**（`cortexkit/aft`）进一步提高了这种方法的精度。照 AFT 官方 README 的说法：**“读取一个 500 行文件约需 375 个 token。但当智能体大多数时候只需要一个函数时，把 symbol 名称交给 `aft_zoom`，就只会返回该函数及少量上下文，约需 40 个 token。”** 基于行号的编辑会在目标上方代码移动时立即失效，而 AFT 的 symbol mode 编辑按名称寻址函数，因此更加稳定。

同一层级还有一个值得额外介绍的工具：**ast-grep**（`ast-grep/ast-grep`，约 13.9k stars）。它是基于 tree-sitter 的结构化搜索与 rewriting CLI。它与普通 grep 的决定性区别，是匹配 CST（Concrete Syntax Tree）模式而非文本。例如搜索 `console.log($A)` 模式时，无论文本写法如何，都能准确找到具有相同语义结构的全部调用。它也提供独立的 `ast-grep-mcp` server，让 AI 智能体能用结构化搜索代替文本 grep。


### Knowledge Graph

第三个层级更进一步：**预先解析整个代码库，将知识图谱构建并存储到磁盘**，智能体再向已存储的图发送查询。最受关注的例子就是 **CodeGraph**。

它的架构出乎意料地简单：先用 **tree-sitter** 解析代码，再把提取出的 symbol、edge 与文件信息存入 SQLite 的 FTS5 全文搜索，最后通过 MCP 将知识图谱暴露给 AI 智能体。值得强调的是，**所有信息提取都来自 AST 的确定性解析，而不是 LLM 摘要**，这意味着其中没有幻觉介入的空间。

这里提到的 **FTS5（SQLite Full-Text Search 5）**是以 SQLite 虚拟表形式提供的全文搜索扩展。从 SQLite 3.9.0（2015-10-14）起，它已被纳入 amalgamation；可以用 `CREATE VIRTUAL TABLE ... USING fts5(...)` 创建表，再通过 `MATCH` 运算符查询。它的决定性优势是，不必运行 Elasticsearch 之类的独立搜索引擎，仅凭一个 SQLite 文件就能维护全文索引。这也是 CodeGraph 得以宣传“100% 本地运行”的原因之一。

刚才用到的**确定性**（deterministic）一词，意思是输入同样的代码，总会得到同样的结果。让 LLM 总结代码并建立 graph，即使是同一段代码，结果也可能不同，还有混入幻觉的风险。相比之下，直接解析 AST 只会按照语言语法规定的规则提取 symbol 关系，没有这类解释介入的余地。这正是该原则成为 CodeGraph 核心的原因。

benchmark 同样令人印象深刻。官方 README 比较了在 headless 模式下运行 Claude Opus 4.7 时启用与不启用 CodeGraph MCP 的结果：按平均值计算，成本**降低 35%**、token **减少 57%**、速度**提升 46%**、tool call **减少 71%**。收益还会随代码库规模增大而提高；在 Tokio 这样的大型仓库中，测得成本降低 82%、token 减少 86%、速度提升 71%、tool call 减少 92%。（没有 CodeGraph 时，智能体会大范围 fan-out 到 grep/find/Read；有了 CodeGraph，一次 index query 就能取代这一切。）

这一方向也有深厚的学术背景。**GraphCoder**（ASE 2024）创建了结合 control flow 与 data/control dependence 的 Code Context Graph。**CodexGraph**（NAACL 2025）让 LLM 智能体直接编写并执行 graph database query。**Prometheus** 则将基于 tree-sitter 的知识图谱与统一记忆结合，用于多语言 issue 解决。学界与工业界显然都在向这一模式靠拢。

这里还值得介绍一个有趣的变体。**Cursor 的 indexing** 走的是不同路线：它不是 AST graph，而是**基于 vector embedding 的语义搜索**。它在本地按函数、class 对文件进行 chunk splitting，通过 Merkle tree hash 与 server 同步，只将 embedding 存入名为 Turbopuffer 的 vector DB。（核心隐私模式是不在云端存储原始源代码。）查询时，它把问题转换成 embedding，执行 nearest-neighbor search，再根据结果返回的文件路径和行范围在本地读取内容并交给 LLM。由于寻找的是**“语义相关的代码”而不是“精确的 symbol”**，精度较低，但擅长自然语言查询。CodeGraph 与 Cursor indexing 是基于不同假设解决同一个问题——检索成本。


### LSP

最后一个层级是**直接依赖 language server**。tree-sitter 知道“某个 symbol 存在”，LSP 则知道“这个 symbol 是什么”。

**LSP（Language Server Protocol）**是一种基于 JSON-RPC 的开放协议，用于标准化代码编辑器/IDE 与“语言智能工具”（代码补全、转到定义、查找引用、重构等）之间的通信。2016 年，Microsoft、Red Hat、Codenvy 共同将其标准化。核心思路是：“不要为每个编辑器重复实现语言分析器，而是每种语言只运行一个 server，让所有编辑器都向它查询。”（TypeScript server、Rust analyzer、Python 的 pyright 都属于 LSP server。）

举个具体例子。TypeScript 的 LSP 知道 `UserService` 实现了 `IUserService` interface、接受哪些 generic type parameter、有哪些 overload、返回类型是什么。tree-sitter 做不到这么深入。

Serena 正是属于这一层的工具。

**Serena**（`oraios/serena`）是 MCP server 中谈到编程智能体时最常被提及的工具之一。截至 2026 年 5 月，它约有 24.7k stars，在大约一年时间里从小众工具跃升为事实上的标准代码 MCP。

Serena 的核心思路可以用一句话概括：**给智能体看 symbol，而不是文本。**

具体来说，假设要查找 `calculateTotal` 函数的所有使用位置。一般的文本工具（如 grep、Read）会这样工作：

在整个代码库中 grep `calculateTotal`，收集所有匹配行的行号，再从每个文件中读取固定范围的行来构建上下文。变量名、字符串字面量、注释中偶然出现的匹配也会一并抓取。

基于 LSP 的 Serena 只需调用一次 `find_referencing_symbols("calculateTotal")`，便可排除变量名匹配、注释匹配等噪声，只返回准确的 symbol 引用。

Serena 的核心工具包括 `find_symbol`、`find_referencing_symbols`、`get_symbols_overview` 等。backend 可二选一：默认使用实现 LSP 的 language server（免费、开源）；另一个选项是利用 JetBrains IDE 代码分析能力的付费 plugin（提供免费试用）。

Serena 能快速普及的真正原因是**节省 token**。文本 grep + 文件 read 的循环会消耗大量 token，而一次精准的 LSP 调用几乎不耗多少。代码库越大，差距越明显。

Aider 不使用 LSP，而是自行分析文件，因此识别能力只到函数、class 层级。相比之下，**OpenCode** 等工具的 LSP 集成能提供更深入的类型理解，但也受限于是否有适合各语言的优秀 LSP server。


## GitHub Trending

![本月 GitHub Trending 仓库列表，最上方是 colbymchenry/codegraph](1.webp)

最后再补充一点：上文介绍的许多工具，我最初都是通过 **GitHub Trending** 了解到的。这里可以一眼看出谁在开发什么，以及哪些工具突然开始流行。

进入 `github.com/trending`，可以按 today、this week、this month 三种时间范围浏览，也可按语言和类别筛选。（我通常会看 weekly + TypeScript / Python，偶尔再扩展到所有语言。）


## 总结

总而言之，这四个层级按照对代码理解的深度，用不同方式解决同一个问题，即查找相关代码的成本。上下文打包只把代码作为文本传递，tree-sitter 仓库地图知道 symbol 存在，知识图谱预先保存这些关系，LSP 则连 symbol 是什么都知道。越往下层，需要准备的东西越多，比如索引或 language server。不过，CodeGraph 的 benchmark 展示的，是知识图谱这一层与不使用工具检索时的对比结果。在这项对比中，代码库越大，节省的幅度越大，但其他层级能否以同样幅度降低成本，这个 benchmark 无法说明。

如果说这些工具降低的是智能体查找代码的成本，那么智能体一开始就该知道的项目规则要写在哪个文件、写多少，则是另一个问题。这部分在[上下文文件](/260529)中讨论。


## 参考资料

:::ref
- [repo] [rtk-ai/rtk](https://github.com/rtk-ai/rtk)
- [repo] [colbymchenry/codegraph](https://github.com/colbymchenry/codegraph)
- [repo] [oraios/serena](https://github.com/oraios/serena)
- [repo] [cortexkit/aft](https://github.com/cortexkit/aft)
:::
