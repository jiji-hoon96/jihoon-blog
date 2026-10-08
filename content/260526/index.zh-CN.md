---
emoji: 🔎
title: "代码智能的四个层级"
seoTitle: "AI 编程智能体的代码检索成本: Repomix、Aider、CodeGraph、Serena 对比"
date: "2026-05-26"
updatedAt: "2026-10-08"
locale: zh-CN
translationOf: '260526'
sourceHash: 304a68bf926e1e4a57305879af694146757f66c9c9fc0156071532ede8230aff
categories: AI 开发工具 Claude MCP CodeGraph
description: "将降低 AI 编程智能体查找相关代码成本的工具分为四个层级进行比较，梳理 Repomix 等上下文打包、Aider 的 tree-sitter 仓库地图、CodeGraph 知识图谱，以及 Serena 等基于 LSP 的工具分别能理解代码到什么程度。"
keywords: "代码智能, CodeGraph, Serena MCP, tree-sitter, LSP, Repomix, Aider repo map, AI 编程智能体 节省 token"
---

这篇文章想聊聊：**降低 AI 编程智能体查找相关代码成本的这些工具，彼此到底有什么不同**。

本文写给这样的开发者：看到智能体在大型代码库中反复 grep 和读取文件、不断消耗 token，正在犹豫该接入 Repomix、CodeGraph、Serena 中的哪一种。这些工具按对代码理解的深度，分为 context packing、tree-sitter repo map、知识图谱、LSP 四个层级，每个层级降低检索成本的位置各不相同。知识图谱附上开发方的基准测试，其余三个层级附上笔者用这个博客仓库的 `src/` 直接测得的结果。

自从看到 `codegraph` 登上 GitHub Trending 并跟着安装之后，笔者每次看到新工具，都会好奇它究竟靠什么原理节省 token。本文出现的工具，很多也是笔者在 GitHub Trending 上第一次看到的；笔者平时按 weekly 浏览，并筛选 TypeScript 和 Python。


## 代码智能工具

智能体在修改代码之前，会先去找相关代码在哪里。用 grep 查找、读取文件、筛选、再 grep，如此循环。在后文要看的 CodeGraph 基准测试中，不用该工具作答的一方，回答一个问题最多用了 43 次 tool call。代码智能工具就是为了降低这种检索成本而出现的各种尝试。

不过，“成本”指的并不是一样东西。模型处理的 token、tool call 的次数，以及工作结束后仍留在 context window 里的 token，三者各自变化。本文逐个层级来看它减少的是这三者中的哪一个。

笔者按照工具对代码理解的深度，把这些尝试分为以下四个层级（tier）。业界并没有既定的分类，这一划分是笔者自己整理的。笔者亲自测得的数值，都是 2026-10-08 在本仓库的提交 `36e5cfa` 上得到的，token 用 tiktoken 的 `o200k_base` 计数。它与 Claude 的 tokenizer 数值不同，因此用于比较，而不是当作绝对值。


### 上下文打包

最简单的方案是：“**把所有内容都塞进一个 context window。**”既不建图，也不做索引，只是把整个仓库序列化为一大块文本，再整体交给模型。

代表性工具是 **Repomix**。它的默认输出格式是 XML，README 附上了 Anthropic 关于 XML 标签的文档链接。它同时提供 CLI、Web、浏览器扩展与 MCP server。

**GitIngest** 以零摩擦的易用性著称。只需把 GitHub URL 中的 `github.com` 换成 `gitingest.com`，整个仓库就会转换成一个文本页面。（例如 `github.com/facebook/react` → `gitingest.com/facebook/react`。）在浏览器地址栏里改一个单词就够了，无需安装，尤其适合一次性的快速探索。

**code2prompt**（由 Mufeed VH 开发）是一款基于 Rust 的 CLI，优势在于可以通过模板系统进行定制。

**rtk**（`rtk-ai/rtk`）的方向略有不同。上述工具是一次打包整个仓库，而 rtk 压缩的是智能体所执行 CLI 命令的输出。它是用 Rust 编写的单一 binary，注册在 Claude Code、Cursor、Copilot、Gemini CLI、Codex 等多种智能体的 hook 中，当智能体调用 `git status` 时，会改为执行 `rtk git status`。它对 100 多种命令应用 filtering、grouping、truncation、deduplication。这个 hook 只作用于 Bash 的 tool call。Claude Code 的 `Read`、`Grep`、`Glob` 会直接绕过。

减少的幅度需要小心解读。[rtk README](https://github.com/rtk-ai/rtk/blob/8533612180c60efbcb5827c7db4e910aba096705/README.md#L66-L70) 写着能把 Bash 输出最多减少 90%，随即补充说这并不等于账单减少 90%。从模型的角度看，命令输出只是输入 token 的一部分，而输入 token 又只是账单的一部分，所以每经过一步都会被稀释。[官方网站](https://www.rtk-ai.app/) 主打的数字是：在 rtk 改写执行的命令上平均减少 56%。如果说前面的工具减少的是输入的文本，rtk 减少的则是作为 tool call 结果返回的文本。

这一层级的局限是：**大型仓库会触及 token 上限**。仅打包这个博客 `src/` 中的 109 个文件，就有 94,596 tokens。Repomix 用 `--compress` 来应对这个问题。根据 [README](https://github.com/yamadashy/repomix/blob/8d6429121e98ed178e4d3a975c2bdbbecc958c4a/README.md#L797-L831)，它用 Tree-sitter 保留函数与类的签名，丢弃实现主体。

```bash
# repomix 1.18.1, 이 리포 커밋 36e5cfa, 2026-10-08
npx -y repomix@1.18.1 src -o out.xml              # Total Tokens: 94,596 tokens
npx -y repomix@1.18.1 src --compress -o out.xml   # Total Tokens: 30,320 tokens
```

减少了 68%。注释会原样保留，因此 JSDoc 较长的 `visit-counter.ts` 只从 1,642 降到约 1,220 tokens，仅减少 26%。压缩结果中留下的是每个文件的语法，没有“谁调用谁”这样的关系。因此，这一层级与下一层级的边界，与其说在于是否看得到语法，不如说在于能否就关系发问。


### tree-sitter 仓库地图

下一个层级利用 **tree-sitter** 分析代码结构，但不会另外启动 index server。

**AST**（Abstract Syntax Tree，抽象语法树）是用树形结构表示源代码结构的数据结构。它是编译器语法分析的结果，会丢掉括号、分号等表层信息，只把变量、运算符、函数调用等元素留作节点。但这一层级的工具所使用的 tree-sitter，构建的其实是 **CST**（Concrete Syntax Tree）。[tree-sitter 官方文档](https://tree-sitter.github.io/tree-sitter/) 也写着它构建的是 concrete syntax tree。这是一棵连括号和标点都保留为节点的树，下面这些工具处理的也正是这棵树。

**tree-sitter** 是一个开源 parser generator 与增量（incremental）解析库。[GitHub 的 code navigation](https://docs.github.com/en/repositories/working-with-files/using-files/navigating-code-on-github) 使用了 tree-sitter。由于它只重新解析被编辑的部分，在编辑器中改一行也不会重新解析整个文件，而只修补发生变化的那部分树。这个优势属于编辑不断发生的编辑器。下文的 Aider 则按文件修改时间做缓存，不会重新解析没有变化的文件。

在终端中使用的 AI 结对编程工具 **Aider** 是这种方法的代表。Aider 用 tree-sitter 从每个文件中提取函数、类、方法的定义与引用。然后构建以文件为节点的图。当文件 A 引用了文件 B 中定义的标识符时，就会产生一条从 A 指向 B 的边。

为了在这张图中挑出重要的文件，Aider 使用 PageRank。PageRank 是一种算法，节点收到的链接越多、越重，得分就越高。Aider 用的是它的变体 personalized PageRank，会让分数向指定节点倾斜。然后按 token 预算，从排名靠前的文件开始放入定义与签名。

预算里放进什么，会随当前对话而变化。在 Aider 的 [`repomap.py`](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/aider/repomap.py#L487-L525) 中，边的权重是引用次数的平方根乘以倍数。对话中出现的标识符乘 10，8 个字符以上的 camelCase、snake_case 或 kebab-case 标识符也乘 10。以 `_` 开头的标识符和在超过 5 个文件中被定义的标识符各乘 0.1，从当前加入聊天的文件出发的边乘 50。加入聊天的文件和对话中提到的文件，还会得到 PageRank 的 personalization 分数。

预算也不是固定值。[Aider 文档](https://aider.chat/docs/repomap.html) 写的 `--map-tokens` 默认值是 1k，但 [代码](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/aider/models.py#L782-L789) 会把模型输入上限的 1/8 截取到 1,024 到 4,096 之间。而且聊天中没有文件时，会放大到 `--map-multiplier-no-files`（默认 2）倍。笔者用本仓库的 `src/` 验证了这一点。实际运行的 0.86.1 与上面链接的提交，排序代码相同。

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

| 条件 | Aider 采用的预算 | 输出的 map | 包含的文件 |
|---|---|---|---|
| 默认值，聊天中无文件 | 4,096 | 7,370 tokens | 61 个 |
| `--map-tokens 1024`，聊天中无文件 | 1,024 | 2,019 tokens | 27 个 |
| `--map-tokens 1024`，把 `filter-posts.ts` 加入聊天 | 1,024 | 983 tokens | 12 个 |

gpt-4o 的输入上限是 128k，所以 1/8 被截到 4,096；聊天为空，map 就在其两倍以内输出。把一个文件加入聊天后，map 缩到预算以内，原来 27 个文件中只留下 10 个，`PostList.tsx` 和 `SearchModal.tsx` 则是新加入的。repo map 不是仓库的固定摘要，而是按那一刻的对话裁出的摘录。

**AFT**（`cortexkit/aft`）以 symbol 为单位进行读取和编辑。基于行号的编辑一旦目标上方的代码移动就会失效，而 AFT 的 symbol 模式编辑按名称定位函数，因此不受影响。

同一层级里还有一个值得一提的工具：**ast-grep**（`ast-grep/ast-grep`）。它是基于 tree-sitter 的结构化搜索与 rewrite CLI，匹配的是语法树节点而不是文本。例如，`console.log($A)` 这个模式会抓住所有以单个参数调用 `console.log` 的地方，不管换行和空白长什么样。它抓住的是相同的语法结构。它不知道 `$A` 的类型，也不知道 `console` 这个名字从哪里来。另外还有 `ast-grep-mcp` server，可以让智能体用结构化搜索代替文本 grep。


### Knowledge Graph

第三个层级更进一步：**预先解析整个代码库，构建知识图谱并保存到磁盘**，智能体再向保存好的图谱发出查询。最受关注的例子是名为 **CodeGraph** 的工具。

[CodeGraph README](https://github.com/colbymchenry/codegraph/blob/b635dd467f0578926a9c01a37b9d28d2b26689f1/README.md) 描述的结构很简单。用 tree-sitter 解析代码，提取 symbol、边与文件信息，并把它们保存到本地 SQLite 数据库中。名称搜索通过 SQLite 的 FTS5 索引完成。智能体通过 MCP 向这张图发问。README 描述的步骤中没有出现 LLM。因此笔者认为，这种提取是确定性的。

这里出现的 **FTS5**（SQLite Full-Text Search 5）是 SQLite 以虚拟表形式提供的全文搜索扩展。根据 [SQLite 文档](https://www.sqlite.org/fts5.html)，它自 3.9.0（2015-10-14）起被纳入 amalgamation，可用 `CREATE VIRTUAL TABLE ... USING fts5(...)` 建表，再用 `MATCH` 运算符查询。无需另外启动 Elasticsearch 之类的搜索引擎，用一个 SQLite 文件就能持有全文索引。

刚才用到的 **确定性**（deterministic）一词，是指输入相同的代码，总会得到相同的结果。如果由 LLM 摘要代码来构建图谱，即便是相同的代码，结果也可能不同，还可能混入幻觉。反之，直接解析语法树，就只会按语言文法规定的规则提取 symbol 关系，这类解释没有插足的余地。

不过，确定性不等于没有遗漏。同一份 README 把依赖约定和反射的框架的路由识别率记为 Spring 83.3%、ASP.NET 83.9%，并称之为静态分析的上限（honest static-analysis ceiling）。相同的代码会得到相同的结果，但这个结果里可能缺了一些边。

基准测试是 CodeGraph 自己测的。同一份 README 中 2026-08-05 的重新测量，以 headless 方式运行 Claude Opus 4.8，向 7 个开源仓库各提一个架构问题。启用 CodeGraph MCP 的一方，平均成本降低 44%，处理的 token 减少 62%，tool call 减少 88%。这次重新测量在双方都禁止通过 Bash 调用 `codegraph` CLI。在没有这一限制的测试框架中，不用该工具的一方在 28 次运行中有 26 次找到并用上了 CLI，README 也说明此前公布的数字是在没有这一限制的情况下得出的。

节省幅度并没有跟随仓库规模。在不用该工具的一方用了 28～43 次 tool call 的问题上，成本降低了 57～78%；而在 7 次就结束的 Gin 上，几乎持平。约 11k 个文件的 VS Code 是 71%，约 640 个文件的 Excalidraw 是 78%。问题需要的探索越多，收益越大。

README 也记录了方向相反的数字。处理的 token 减少了，但在多轮会话结束时，仍留在 context window 中的 retrieval 结果，在 7 个仓库整体上 CodeGraph 一方多出约 80%。各仓库之间差距很大，仅 VS Code 一个仓库就是 67k 对 18k tokens，约 3.7 倍。原因是它一次返回密集的原文，而这些原文会原样留在窗口里。这一层级以窗口中留存更多为代价，减少了 tool call 和处理的 token。

学术界也有同一方向的研究。[GraphCoder](https://arxiv.org/abs/2406.07003)（ASE 2024）构建了融合 control flow 与 data/control dependence 的 Code Context Graph，[CodexGraph](https://aclanthology.org/2025.naacl-long.7/)（NAACL 2025）让 LLM 智能体自己编写并执行图数据库查询。未经同行评审的预印本 [Prometheus](https://arxiv.org/abs/2507.19942) 在基于 tree-sitter 的知识图谱上加入 working memory，用于多种语言的 issue 解决。

**Cursor** 走了另一条路，后来又改变了方向。[2026 年 1 月 Cursor 博客](https://cursor.com/blog/secure-codebase-indexing) 介绍的索引不是语法图，而是**基于向量嵌入的语义搜索**。它在本地把文件切成 chunk，用 Merkle tree 哈希与服务器同步，并把 chunk 转成嵌入，用于语义搜索。2026 年 7 月，Cursor 的 Community Support Engineer 在[论坛](https://forum.cursor.com/t/what-do-you-think-about-cursor-removing-the-codebase-indexing-settings/165899)上回答：“Semantic/embeddings indexing is being turned down in favor of grep-based retrieval”。同一帖子里，另一位员工写道，随着模型越来越会用 grep，以前的语义搜索路径已不再有实质帮助。现在的 [Cursor 文档](https://cursor.com/docs/context/codebase-indexing) 写着：Instant Grep 在本机构建并查询索引，不保存代码库的嵌入。


### LSP

最后一个层级**直接依赖语言服务器**。如果说 tree-sitter 知道“symbol 存在”，那么 LSP 知道“这个 symbol 是什么”。

**[LSP](https://microsoft.github.io/language-server-protocol/)**（Language Server Protocol）是一种基于 JSON-RPC 的开放协议，用来标准化编辑器与语言分析工具（代码补全、跳转到定义、查找引用、重构等）之间的通信。2016 年，[Microsoft、Red Hat、Codenvy 宣布了合作](https://www.redhat.com/en/about/press-releases/red-hat-codenvy-and-microsoft-collaborate-language-server-protocol)。核心思路是：“不要为每个编辑器重新实现语言分析器，而是每种语言放一个服务器，让所有编辑器都去问它。”rust-analyzer 和 Python 的 pyright 是 LSP 服务器，而 TypeScript 使用的是 typescript-language-server，它用 LSP 包装了使用自有协议的 `tsserver`。

**Serena**（`oraios/serena`）是属于这一层级的 MCP server。截至 2026-10-08 有 30,093 stars，仓库创建于 2025 年 3 月。Serena 的核心思路可以用一句话概括：**以 symbol 为单位给智能体看代码。** 主要工具有 `find_symbol`、`find_referencing_symbols`、`get_symbols_overview` 等。后端可以二选一：默认是实现了 LSP 的语言服务器（免费/开源），另一个选项是利用 JetBrains IDE 代码分析的付费插件（提供免费试用）。

在本仓库里测一下，就能看出差异从哪里来。笔者用两种方式查找了过滤非公开文章的 `isHiddenPost`（`src/lib/filter-posts.ts:12`）的使用位置。文本这一侧是 grep。

```bash
# 커밋 36e5cfa, 2026-10-08. 이 글도 같은 이름을 담고 있어 content/ 는 뺐다
git grep -n isHiddenPost -- ':!content'   # 16줄, 파일 9개
```

LSP 这一侧，typescript-language-server 回答 `textDocument/references` 时用的是 TypeScript 的 `findReferences` API，笔者直接调用了这个 API。并不是启动 Serena 测出来的。LSP 的查找引用按位置（文件、行、列）来问。所以 Serena 的 [`find_referencing_symbols`](https://github.com/oraios/serena/blob/3b99f8b024dafd58c962ea6e74f37c8a730ef532/src/serena/tools/symbol_tools.py#L169-L172) 也要同时接收 `name_path` 和 `relative_path`。在这个例子里就是 `find_referencing_symbols(name_path="isHiddenPost", relative_path="src/lib/filter-posts.ts")`。

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

两侧找到的代码位置都是同样的 11 处。这个名字在仓库中只有一个，所以 grep 既没有漏掉也没有多抓代码位置。差异来自其余 5 处。grep 还一并返回了 `CLAUDE.md`、命令文档及其快照中的 5 行说明文字。

Serena 会给每个引用附上[前后各 1 行](https://github.com/oraios/serena/blob/3b99f8b024dafd58c962ea6e74f37c8a730ef532/src/serena/repl/api/lsp_api.py#L367-L369)再返回。因此笔者对两侧采用同一标准，统计每个位置加上 `file:line` 和前后各 1 行之后的文本 token 数。grep 也会把定义所在的行当作匹配返回，所以引用一侧也把定义算在内。

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
refs = [(l.rsplit(":", 1)[0], int(l.rsplit(":", 1)[1])) for l in (x.removesuffix(" (정의)") for x in run("node - < refs.cjs"))]
code = [x for x in grep if x[0].startswith("src/")]
print(f"grep {len(grep)}곳 {tokens(grep)} (코드 {len(code)}곳 {tokens(code)}) | 참조 {len(refs)}곳 {tokens(refs)}")
```

```text
$ python3 count.py
grep 16곳 1172 (코드 11곳 453) | 참조 11곳 453
```

| 方式 | 位置 | tokens |
|---|---|---|
| grep | 16 处（代码 11，文档 5） | 1,172（代码 453，文档 719） |
| findReferences（含定义） | 11 处 | 453 |

719 tokens 的差距全部来自 5 处文档。在这个仓库里，LSP 省下的不是寻找代码位置的成本，而是阅读噪声匹配的成本。如果智能体把 grep 命中的 9 个文件整个读一遍，要读的量是 47,034 tokens，其中 43,318 来自 5 个文档。这是上限。在实际会话中，`CLAUDE.md` 很可能已经在 context 中，不会再读一次。如果是 `isLocale` 这样常见的名字，连代码位置的结果都可能出现分歧。

Aider 不使用 LSP，所以只能识别到函数与类的层面。[OpenCode](https://opencode.ai/docs/lsp/) 接入 LSP 服务器，默认把诊断结果反馈给智能体。查询定义、引用、hover、call hierarchy 的 `lsp` 工具，只有在 [`OPENCODE_EXPERIMENTAL_LSP_TOOL=true`](https://opencode.ai/docs/tools/) 时才会启用。无论哪种，都附带一个条件：每种语言都需要有好的 LSP 服务器。


## 总结

总之，四个层级按对代码理解的深度区分，减少的成本也各不相同。context packing 把代码作为文本交出去，即使加上 `--compress` 也只保留到语法，减少的是输入的 token。tree-sitter repo map 知道 symbol 存在，用预算给输入的 token 设上限，至于用什么填满这个上限，则由那一刻的对话决定。知识图谱预先保存关系，减少 tool call 和处理的 token，但按厂商自己的测量，留在窗口里的量反而增加了。LSP 连 symbol 是什么都知道，在这个仓库里，节省的全部来自过滤掉 grep 一并带来的噪声匹配，从而减少了要处理的 token。

所以，笔者在挑选工具时，比起层级有多深，会先看现在出问题的是哪一种成本。窗口小而会话长，就看留存的量；往返慢，就看 tool call 次数；如果仓库里文档和代码共用同样的名字，就看噪声匹配。笔者把 Cursor 拿掉语义搜索、回到 grep 这件事，也读作“层级越深不一定越好”的信号。

如果这些工具降低的是智能体查找代码的成本，那么智能体从一开始就该知道的项目规则要写在哪个文件、写多少，就是另一个问题了。这部分内容在[上下文文件](/260529)中讨论。


## 参考资料

:::ref
- [repo] [cortexkit/aft](https://github.com/cortexkit/aft)
- [repo] [ast-grep/ast-grep](https://github.com/ast-grep/ast-grep)
- [repo] [ast-grep/ast-grep-mcp](https://github.com/ast-grep/ast-grep-mcp)
:::
