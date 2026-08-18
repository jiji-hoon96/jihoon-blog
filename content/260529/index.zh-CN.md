---
emoji: 🧭
title: 'AI 智能体工具'
seoTitle: 'AI 编程智能体工具全景图——Markdown 文件、MCP、代码智能与 GitHub Trending'
date: '2026-05-29'
locale: zh-CN
translationOf: '260529'
sourceHash: dcdf13a2067a0ae15b501b063ecf0c65202580351b7df388dad34849f41e1c3c
categories: AI 开发工具 Claude MCP CodeGraph
description: '从四个角度梳理使用 Claude 进行前端开发时遇到的工具：CLAUDE.md、AGENTS.md 与 SKILL.md 的区别，MCP 的原理，Serena、CodeGraph 等代码智能工具的工作方式，以及如何阅读 GitHub Trending。'
keywords: 'CLAUDE.md, AGENTS.md, SKILL.md, MCP, Model Context Protocol, Serena MCP, CodeGraph, 代码智能, GitHub Trending, AI 编程智能体, Claude Code, Cursor rules, tree-sitter, LSP'
---

本文想聊一聊**围绕 AI 编程智能体形成的工具生态**。

作为一名前端开发者，我在日常工作中经常使用 Claude。渐渐地，项目根目录里多出了 `CLAUDE.md`，旁边还有别人创建的 `AGENTS.md`，某个角落仍留着 `.cursorrules`，我也曾照着某篇文章建起 `.claude/skills/` 文件夹。（回过神来，记录着相似内容的文件已经有五个左右了。）

其他领域也出现了类似的混乱。我试着添加名为 `serena` 的 MCP，看到 `codegraph` 登上 GitHub Trending 后也跟着安装；每当发现新工具，我都会再次疑惑：“它到底属于哪一类，又是怎么工作的？”（尤其是谁开发了它、它究竟以什么原理节省 token，这些细节每次都记不太清。）

因此，这次我不打算逐个推荐工具，而是决定**画出工具生态本身的地图**。我将它分成以下四条主线。
 
- 上下文文件（`.md`）之间的区别
- MCP 的原理与 Serena
- 代码智能工具的层级结构与 CodeGraph
- 关注 GitHub Trending

理解这四个方面后，当新工具出现时，我们应该就能迅速判断：“哦，原来它大概是这种工具。”


## 上下文文件

AI 编程智能体存在一个根本局限：**它没有持久记忆**。每个 session 都从空白状态开始，昨天约定的 convention，或一小时前介绍过的文件夹结构，到了下一次对话就无法记住。上下文文件是解决这个问题最简单的装置：只要在项目中放置一个每次 session 开始时都会自动读取的文件，就不必反复说明同一件事。

问题在于，各种工具围绕同一种思路分别创建了自己的文件。Claude Code 读取 `CLAUDE.md`，Cursor 读取 `.cursorrules`（现已 deprecated，官方建议改用 `.cursor/rules`），GitHub Copilot 读取 `.github/copilot-instructions.md`，OpenAI Codex 则读取 `AGENTS.md`。当一个团队同时使用多种工具时，同样的内容就得复制到四个地方。


### CLAUDE.md

`CLAUDE.md` 是 Claude Code 在 session 开始时自动读取的文件。根据 Anthropic 官方文档（`code.claude.com/docs/en/memory`），Claude Code 会在以下三个层级查找 `CLAUDE.md`。

- **用户记忆**（`~/.claude/CLAUDE.md`）：适用于本机所有项目的全局默认值
- **项目记忆**（项目根目录下的 `CLAUDE.md`）：提交到 git，由整个团队共享
- **本地记忆**（子目录中的 `CLAUDE.md`）：仅在该目录内工作时额外加载

三个层级同时存在时，Claude 会**全部读取并串联（concatenate）**。它并非按优先级只选一个，而是像 CSS cascade 一样，将更具体的内容继续叠加上去。（这是合并，不是覆盖。）因此，如果把同一主题的规则分散到多个层级，就可能产生冲突。（Anthropic 官方文档明确指出，指令冲突时的行为不受保证。）

这里有一点经常被忽略：Claude 会**从当前工作目录一路向上走到仓库根目录，并读取沿途遇到的所有 `CLAUDE.md`**。所以在 monorepo 的 `packages/ui/` 中工作时，根目录的 `CLAUDE.md` 与 `packages/ui/CLAUDE.md` 都会被加载。（这很强大，但也意味着上下文可能在不知不觉间膨胀。）


### AGENTS.md

`AGENTS.md` 是为解决上述各工具专属文件泛滥而创建的标准。2025 年 12 月，Anthropic、Block、OpenAI 三家公司将它与 MCP 一同捐赠给 Linux Foundation 旗下的 **Agentic AI Foundation（AAIF）**，使其成为事实上的行业标准。官方网站（`agents.md`）明确表示，**已有超过 6 万个开源仓库采用该文件**。

看看支持工具的名单，这一点就更清楚了。OpenAI Codex、Google Jules、VS Code、GitHub Copilot、Cursor、JetBrains Junie、Aider、Devin、Zed、Factory、Warp、goose、opencode、Amp、RooCode、Gemini CLI、Kilo Code、Phoenix、Semgrep、Ona、Windsurf、Augment Code 等众多工具都提供支持。GitHub Copilot 从 2025 年 8 月起原生支持 `AGENTS.md`。有趣的是，**Claude Code 对 `AGENTS.md` 的原生支持目前仍处于 active feature request 状态**。Claude Code 依然将 `CLAUDE.md` 视为主要文件。

它虽被称为标准，但人们可能仍会怀疑是否真的有人采用。最有力的证据就是 **dogfooding**，也就是亲自使用自己制定的标准。

- **Vercel/Next.js** 的 canary 分支根目录中有一个 `AGENTS.md`。它实际上是指向 `CLAUDE.md` 的符号链接，其中包含 monorepo 结构、通过 `pnpm --filter=next dev` 进行 1～2 秒级迭代、Turbopack 与 Webpack 双端测试指南、`pr-status` 脚本，以及环境变量和 secret 的处理规则。`create-next-app` 后来改为在新项目中同时生成 `AGENTS.md` 和 `CLAUDE.md`，也是同一趋势的体现。
- **OpenAI/codex** 仓库本身也维护着自己的 `AGENTS.md`。

一种标准策略正在逐渐成形：将 **`AGENTS.md` 作为单一信息源（single source of truth）**，尽可能精简 `CLAUDE.md`，只保留一行对 `AGENTS.md` 的引用，以及 Claude Code 专用指令。这样既消除了重复，又因为 Claude Code 会读取两个文件而不会丢失任何信息。


### SKILL.md

`SKILL.md` 与前两个文件性质不同。`CLAUDE.md` 和 `AGENTS.md` 是**始终存在于上下文中的持久指令**，而 Skill 是**只在需要时调用的按需能力**。

Skill 以文件夹为单位组织。文件夹中包含一个 `SKILL.md`、该 Skill 会执行的脚本，以及额外的 Markdown 文档。只有当前任务与 Skill 的 `description` 匹配时，Claude 才会加载该文件夹。这称为 **progressive disclosure（渐进式披露）**。这一概念由 Jakob Nielsen 于 1995 年在 UX 领域确立：把高级或较少使用的功能放到辅助界面，让用户一次只专注于一项任务，从而降低认知负荷和错误。在 Claude Skills 的语境中，它指“只在需要时才把 Skill 正文载入上下文”的机制。这样可以大幅节省上下文窗口成本。

`SKILL.md` 的 frontmatter 中有几个独有字段。

- **`description`**：说明何种情况下需要该 Skill，是模型判断是否调用它的触发条件
- **`allowed-tools`**：限制 Skill 内可使用的工具（例如 `"Read, Glob, Grep, Bash(python:*)"`）
- **`disable-model-invocation: true`**：禁止模型调用，只允许用户通过斜杠命令触发。用于部署、提交等带有副作用的操作
- **`user-invocable: false`**：不在用户的斜杠菜单中显示，仅由 Claude 自主调用，适合作为背景知识

Claude Skills 于 2025 年 10 月 16 日在 Claude.ai、Claude Code、API 与 Agent SDK 中同时推出。随后在 2025 年 12 月 18 日，Anthropic 又将 Skills 规范本身发布为开放标准（`agentskills.io`）。Simon Willison 甚至评价道：“**Skills are awesome, maybe a bigger deal than MCP**。”原因在于，它的形式比 MCP 简洁得多，同时借助 progressive disclosure 解决了上下文窗口成本问题。


### 其他工具使用的文件

Cursor 的 `.cursorrules` 从 **0.43 版本起已 deprecated**。目前官方建议在 `.cursor/rules/` 目录中放置多个 `.mdc` 文件。每个 `.mdc` 文件都带有 YAML frontmatter。

- **`description`**：供智能体判断该规则是否相关
- **`globs`**：当匹配的文件进入对话时自动附加（auto-attach）
- **`alwaysApply`**：设为 `true` 时无条件加入每次对话（此时忽略 `globs`）

GitHub Copilot 也朝着类似方向演进。仓库全局指令放在 `.github/copilot-instructions.md` 中；需要按路径限定作用域的指令，则放进 `.github/instructions/*.instructions.md` 文件，并通过 frontmatter 的 `applyTo:` 键指定 glob。（Copilot code review 从 2025 年 9 月起正式支持 path-scoped instructions。）

Cursor、Copilot 以外的工具也都在向相似模式靠拢。汇总如下。

| 工具 | 文件/目录 | 特点 |
|------|--------------|------|
| **Claude Code** | `CLAUDE.md`（3 个层级） | 沿目录树合并 |
| **Cursor** | `.cursor/rules/*.mdc` | 通过 `globs` 限定文件模式作用域 |
| **GitHub Copilot** | `.github/copilot-instructions.md` + `.github/instructions/*.instructions.md` | 支持 `applyTo` glob |
| **Cline** | `.clinerules/` 目录 | 合并所有 `.md`/`.txt`，通过 `paths` glob 条件激活 |
| **Continue.dev** | `.continue/rules/*.md` | `name`/`globs`/`alwaysApply` frontmatter |
| **Aider** | `CONVENTIONS.md` + `.aider.conf.yml` | 每次请求都包含，**建议控制在 200 行以内** |
| **Windsurf** | `.windsurfrules` + `global_rules.md` | 全局与项目两级 |
| **标准** | `AGENTS.md`（AAIF） | 已被 60,000+ 个仓库采用 |

尤其值得注意的是 **Aider 的 `CONVENTIONS.md`**。官方文档明确指出，由于每次请求都会将该文件完整加入上下文，因此应**“保持在 200 行以内”**。（可以说，Aider 很早就意识到这一限制，并明确提醒了用户。）


### MEMORY.md

除了上述文件，还有一种模式正越来越常见：`MEMORY.md`。它不是官方标准，而是社区自发形成的 convention，用于**记录随时间累积的决策与失误**。

```markdown
## 2026-04-10
Pages Router에서 App Router로 이전. 신규 라우트는 App Router 컨벤션 사용.

## 2026-04-22
Prisma 쿼리 결과에 optional chaining 쓰지 말 것 — null은 if-check로 명시적 처리.
(이전에 옵셔널 체이닝으로 null을 흘려보내 프로덕션 이슈 발생.)
```

如果说 `CLAUDE.md` 或 `AGENTS.md` 记录的是**当前规则**，那么 `MEMORY.md` 记录的就是**这些规则为何形成的历史**。（两者是互补关系，而非替代关系。）


### 智能体如何读取这些文件

到目前为止，我们梳理了有哪些文件。但还有一个经常被遗漏的问题：**智能体究竟把这些文件读到哪里，又是怎样读取的？** 理解这一机制，就更容易明白后文 ETH Zurich 的研究结果——上下文文件中的指令并不会被可靠遵循——为何会出现。

首先要明确一个事实：**`CLAUDE.md` 不是 system prompt，而是以 user message 的形式注入。** Anthropic 官方文档明确写道：

::::quote
:::translation
CLAUDE.md 的内容会在 system prompt 之后以 user message 的形式传递，而不是作为 system prompt 的一部分。Claude 会读取并尝试遵循它，但不保证严格执行。
:::

:::original
CLAUDE.md content is delivered as a user message after the system prompt, not as part of the system prompt itself. Claude reads it and tries to follow it, but there's no guarantee of strict compliance.
:::
::::

也就是说，它不是强制规则，而是“参考上下文”。如果确实要强制某种行为，官方指南也建议使用 `PreToolUse` hook 等额外机制。

加载顺序按 broad → specific 逐层叠加。具体来说，是 managed policy（组织级设置）→ 用户全局文件（`~/.claude/CLAUDE.md`）→ 项目文件（`./CLAUDE.md`）→ 本地文件（`./CLAUDE.local.md`）。在同一目录中，先读 `CLAUDE.md`，再读 `CLAUDE.local.md`。利用**距离最近的指令最后读取**这一点，可以借助 LLM 的 recency bias，让更具体的规则产生更强影响。

这里很有意思的是 `@import` 语法。在 CLAUDE.md 正文的任意位置写入 `@path/to/file`，对应文件就会在原地展开并一同加载。**最大递归深度为 4 hops**，相对路径以写有 import 语句的文件为基准解析。因此，官方建议用 `@AGENTS.md` 建立 bridge。让 `CLAUDE.md` 几乎保持为空，只写一行 `@AGENTS.md`，Claude Code 就能自然读取 AGENTS.md。（在 CLAUDE.md 尚未原生支持 AGENTS.md 的现状下，这是最简洁的变通方案。）

token 方面也值得一提。CLAUDE.md 本身没有明确的 token 上限，因此**只要存在就会完整加载**。不过官方建议**每个文件不超过 200 行**。超过 200 行后，会“consume more context and may reduce adherence”。有趣的是，在 Claude 4.x 中，**仅仅启用 tool use，就会自动通过 special system prompt 增加 346 个 token**（以 `tool_choice: auto` 为准）。上下文就在这些不易察觉的地方不断流失。

Cursor 则采用另一种方式。`.cursor/rules/*.mdc` 中的规则有四种工作模式。

- **Always Apply**：无条件加入每次 chat；忽略 globs/description
- **Apply Intelligently**（Agent Requested）：智能体读取 `description`，判断相关性后自行调用规则
- **Apply to Specific Files**（Auto Attached）：与 glob 模式匹配的文件进入上下文时激活
- **Apply Manually**：用户通过 `@rule-name` 明确调用

其他工具又有所不同。OpenAI Codex 会从 git 仓库根目录朝 cwd 方向遍历，收集所有 `AGENTS.md`，并在**用户 prompt 之前紧邻的位置**注入。GitHub Copilot 则将 `.github/copilot-instructions.md` 放在上下文窗口的中等优先级：“位于 edit context 与 explicit references 之后，但在 loosely related open files 之前。”即使使用同一个 `AGENTS.md` 文件，各工具的加载时机、优先级与合并规则仍不相同，因此**不能保证三个工具以完全相同的方式理解该文件。**

但这里还剩下一个根本问题：**为什么模型只遵循上下文中的一部分指令？** 单纯用“指令太长”来解释并不充分。这种现象背后是 LLM 的结构性局限。

### 幻觉与上下文遗忘

如果你见过 AI 智能体混淆对话语境，或忘掉前面明明说过的内容，那么这正是**幻觉（Hallucination）**的一种形式。通常提到幻觉，人们首先想到的是“捏造不存在的事实”，但学术上会将其分为三类。Yue Zhang 等研究者在 2023 年的综述《Siren's Song in the AI Ocean》中将它们归为：**输入冲突型**（生成内容与用户明确提供的内容不一致）、**上下文冲突型**（与自己先前生成的内容矛盾）、**事实冲突型**（与世界知识不符）。忽略上下文文件指令属于**第一类**，而不是第三类。模型在处理输入时，把其中一部分信息当成了“不存在”。

更根本的问题在于，这种幻觉**原则上无法彻底消除**。新加坡国立大学的研究团队利用学习理论对此作出了数学证明：任何 LLM 都无法学习所有可计算函数，因此只要把它当作通用问题求解器，就必然会在某处产生幻觉。

位置效应也很重要。Stanford 的研究团队通过实验证明，当相关信息位于**上下文窗口的开头或结尾**时，模型最容易引用；而当信息**埋在中间**时，性能会显著下降。这与上下文文件直接相关。按照加载顺序，`CLAUDE.md` 会被插入某个中间位置；随着对话变长，其中的指令也会越来越深地被推向上下文的“中部”。这也对应了前文提到的 recency bias 的另一面：在 primacy-recency 效应中，**中间区域最为薄弱**。

把这些现象放在一起，就会得到一幅完整图景。上下文文件不过是**在 LLM 第一个 user turn 之前，从 system prompt 外部额外插入的文本**。它不是强制模型作出某种决策的机制，而只是丢进上下文窗口的另一块 token。文件越长、对话越长，其中的指令就越容易被推向“中间”，引用率也随之下降。ETH Zurich 的结果可以说是对这一结构性局限的量化验证。


### ETH Zurich 的研究

很多人可能会想：“那就尽可能多地往这些文件里写内容吧？”近期一项研究正面反驳了这种直觉，也就是前文不断提到的 ETH Zurich 研究。

ETH Zurich 研究团队于 2026 年 2 月发表论文《Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?》。研究者在由 138 个真实 Python 软件工程任务构成的 benchmark（AGENTBENCH）以及 SWE-bench Lite 上，测试了 Claude Code（Sonnet-4.5）、Codex（GPT-5.2 / GPT-5.1 mini）、Qwen Code 共四种智能体，结果出人意料。

- **由 LLM 自动生成的上下文文件**在 SWE-bench Lite 上反而使**任务成功率降低**约 0.5%，在 AGENTBENCH 上降低约 2%
- 即使是**人工编写的文件**，平均也只带来约 4% 的小幅改善
- 添加上下文文件后，**每个 instance 的推理成本增加了 20% 以上**
- 对更强的模型（GPT-5.2）而言，上下文文件效果更加有限（模型越强，parametric knowledge 越充足，额外上下文就越可能成为噪声）

不过有一个例外：**明确指定非标准工具时**。例如在上下文中指定 Python 包管理器 `uv` 后，智能体使用 `uv` 的频率从每个 instance 0.01 次上升到 1.6 次，**约为原来的 160 倍**。

Aider 的“200 行建议”是实用层面的提醒——文件每次都会进入上下文，所以要保持简短；而 ETH Zurich 的研究则量化证明了“冗长上下文文件会在统计意义上降低性能”。我认为这项研究有以下实践启示。

- **自动生成的巨型上下文文件可能弊大于利**。如果把编码规范、架构、workflow 全塞进 300 行的 `CLAUDE.md`，智能体会遵循其中一部分、忽略其余部分。这种不一致甚至可能比没有上下文更糟。
- **真正必须写下的是“无法推断的信息”**。非标准工具、项目专属 convention、过去的失败案例都属于这一类。一般性的编码最佳实践，模型本来就知道。
- 将 AGENTS.md 作为单一来源，CLAUDE.md 只保留简短的工具专用指令，把细致的 workflow 拆分为 Skill。


## MCP（Model Context Protocol）

如果说 `.md` 文件解决的是“**该告诉智能体什么**”，那么 MCP（Model Context Protocol）解决的就是“**该让智能体能做什么**”。

展开来说，AI 智能体若要向 Slack 发送消息，就必须能调用 Slack API；要创建 GitHub issue，就必须能调用 GitHub API；要查询 Postgres，就必须能处理 DB 连接。MCP 就是把所有这些外部系统集成**统一到一个标准协议之下**。（也就是任何 client 与任何 server 都能通过同一个接口连接。）

MCP 是 Anthropic 于 **2024 年 11 月 25 日**首次发布的开放标准。到 **2025 年 12 月 9 日**，Anthropic、Block、OpenAI 三家公司作为共同创始方，将 MCP 规范捐赠给 Linux Foundation 旗下的 **Agentic AI Foundation（AAIF）**。Google、Microsoft、AWS、Cloudflare、Bloomberg 也以 platinum member 身份加入。（截至 2025 年 12 月捐赠时，SDK 月下载量已超过 9,700 万次，活跃的公开 MCP server 超过 1 万个。）

MCP 是建立在 JSON-RPC 之上的有状态（stateful）session 协议。**JSON-RPC** 是一种以 JSON 作为 wire format 的 stateless 轻量级 RPC（Remote Procedure Call）协议。它与传输层无关，可以运行在 HTTP、TCP 或标准输入输出之上，也支持 notification（无需响应的调用）和 batch 调用。


### 协议内部

MCP 中 client 与 server 之间的所有交互，都用六种 primitive 之一表示。最初只有 server 侧的三种 primitive，2025-06-18 spec 又补充了 client 侧的三种，如今共计六种标准 primitive。

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

了解 primitive 与传输方式后，接下来看看 **LLM 实际如何发现并调用 MCP 工具**。（`.md` 文件的问题是“注入到哪里”，这里的问题则是 MCP “怎样进入 LLM 的视野”。）

MCP session 启动时，会按以下顺序进行 handshake。

- **Client → Server**：发送 `initialize` 请求（传递支持的协议版本和 client capabilities）
- **Server → Client**：返回 `initialize` 响应（server capabilities + 可选的 `instructions` 字段）
- **Client → Server**：发送 `notifications/initialized` 通知
- **Client → Server**：发送 `tools/list` 请求 → 获取可用工具列表
- （之后）LLM 决定调用工具 → client 发送 `tools/call` → 接收结果

这里有一点经常被忽略：**`initialize` 响应中的 `instructions` 字段**。server 若在该字段中返回文本，其内容实际上会被加入 LLM 的 system prompt。换言之，spec 中存在一个正式 slot，允许 MCP server 直接向 LLM 注入“应该如何使用这些工具”的指南。（前文提到的 Tool Poisoning Attack 之所以危险，原因之一正是这个 slot 的存在。）

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

client 会把通过 `tools/list` 获取的列表转换成 **Anthropic Messages API 的 `tools` 参数**，或 **OpenAI function calling 的 `tools` 参数**，再随 LLM API 请求一同发送。以 Anthropic 为例，传入 tool 参数后，系统会自动添加 **special system prompt**，使模型理解工具调用方式。（这正是前文所说额外 346 个 token 的来源。）

当 LLM 判断应该调用工具时，响应中会包含 `tool_use` block（`{"type": "tool_use", "name": ..., "input": ...}`），并以 `stop_reason` 为 `tool_use` 结束。client 收到后，会向实际的 MCP server 发送 `tools/call`，再把返回结果装进下一条 user message 的 `tool_result` block 中发回 LLM。**这个循环会持续进行，直到 `stop_reason` 从 `tool_use` 变成其他值（如 `end_turn`、`max_tokens`）。**我们通常所说的“智能体在工作”，实际上很接近这种调用—结果—调用循环的连续运行。

那么 MCP 与单纯的 function calling 有什么不同？可以归纳为四点。

- **动态发现**：不在 build time 预先知道工具列表，而是在 runtime 通过 `tools/list` 获取。也可通过 `notifications/tools/list_changed` 在 session 中途变更
- **Stateful session**：定义了 lifecycle phase（initialize → operation → shutdown），可以干净地结束
- **Tool 以外的 primitive**：通过 capability negotiation 暴露 Prompt、Resource、Sampling、Roots、Elicitation
- **双向性**：在 spec 层面，server 也可通过 sampling 反向调用 client 的 LLM

（正因如此，MCP 有时也被称为“面向智能体的 function calling 通用标准”。）

### Serena

**Serena**（`oraios/serena`）是 MCP server 中谈到编程智能体时最常被提及的工具之一。截至 2026 年 5 月，它约有 24.7k stars，在大约一年时间里从小众工具跃升为事实上的标准代码 MCP。

Serena 的核心思路可以用一句话概括：**给智能体看 symbol，而不是文本。**

具体来说，假设要查找 `calculateTotal` 函数的所有使用位置。一般的文本工具（如 grep、Read）会这样工作：

在整个代码库中 grep `calculateTotal`，收集所有匹配行的行号，再从每个文件中读取固定范围的行来构建上下文。变量名、字符串字面量、注释中偶然出现的匹配也会一并抓取。

基于 LSP 的 Serena 只需调用一次 `find_referencing_symbols("calculateTotal")`，便可排除变量名匹配、注释匹配等噪声，只返回准确的 symbol 引用。

**LSP（Language Server Protocol）**是一种基于 JSON-RPC 的开放协议，用于标准化代码编辑器/IDE 与“语言智能工具”（代码补全、转到定义、查找引用、重构等）之间的通信。2016 年，Microsoft、Red Hat、Codenvy 共同将其标准化。核心思路是：“不要为每个编辑器重复实现语言分析器，而是每种语言只运行一个 server，让所有编辑器都向它查询。”（TypeScript server、Rust analyzer、Python 的 pyright 都属于 LSP server。）

Serena 的核心工具包括 `find_symbol`、`find_referencing_symbols`、`get_symbols_overview` 等。backend 可二选一：默认使用实现 LSP 的 language server（免费、开源）；另一个选项是利用 JetBrains IDE 代码分析能力的付费 plugin（提供免费试用）。

Serena 能快速普及的真正原因是**节省 token**。文本 grep + 文件 read 的循环会消耗大量 token，而一次精准的 LSP 调用几乎不耗多少。代码库越大，差距越明显。


### 那么 MCP 安全吗？

这里必须明确一点：**MCP 不会自动完成授权管理。** 哪些 server 值得智能体信任、哪些工具会产生何种副作用、工具日后是否仍保持相同行为，都需要用户自行负责。

最好了解两种代表性攻击。

- **Tool Poisoning Attack（TPA）**：Invariant Labs 于 2025 年 4 月命名并公开 PoC 的攻击。若把恶意指令隐藏在 MCP server 的工具 description 中，模型可能会把它误认为用户指令并照做。这段文本对用户不可见，对模型却可见。

- **Rug Pull**（Silent Redefinition）：Simon Willison 在 2025 年 4 月 9 日发布的分析中讨论的概念。工具起初完全合法，用户检查、批准并将它集成进 workflow。几周后，工具定义被悄悄修改，加入恶意指令。用户不会被要求重新批准，行为却已暗中改变。

**2026 年 4 月 15 日**发生了一起安全事件。OX Security 披露了影响所有主流 MCP SDK（Python、TypeScript、Java、Rust）的系统性 RCE 漏洞。超过 1.5 亿次下载、约 7,000 个公开 server、估计约 20 万个存在漏洞的 deployment 都处于影响范围。相关漏洞获分配超过 14 个 CVE，Cursor、VS Code、Windsurf、Claude Code、Gemini-CLI 均受影响。

生态事后如何应对？Anthropic **并未修改协议架构本身**，而是更新 `SECURITY.md`，明确规定使用 stdio adapter 时，下游开发者须负责 input sanitization。在 spec 层面，**2025-06-18 修订强制采用 OAuth 2.1 + RFC 8707 Resource Indicators**，以阻止 token 重用攻击；**2025-11-25 修订则引入 incremental scope consent**，让用户逐步同意当下所需的最小权限。即便如此，仅 2026 年 1～2 月就发布了 30 多个 MCP 相关 CVE，其中 **command injection 占 43%**。**安全领域依然处于持续演进之中。**


## 代码智能工具

如果 `.md` 文件讨论的是“该告诉智能体什么”，MCP 讨论的是“该让智能体能做什么”，那么代码智能工具解决的就是“**如何快速找到相关代码**”。

在大型代码库中，AI 智能体的大部分成本并不在修改代码本身，而在于**查找相关代码位于何处**。如果每项任务都从 grep → read → 筛选 → 再次 grep 的循环开始，token、时间与 tool call 都会被浪费。代码智能工具正是为了降低这种检索成本而出现的各种尝试。

把它分为四个层级（tier），会更容易理解。


### 上下文打包

最简单的方案是：“**把所有内容都塞进一个上下文窗口。**”既不建图，也不做索引，只是把整个仓库序列化为一大块文本，再整体交给模型。

代表性工具是 **Repomix**。它把整个仓库打包成针对 Claude XML 解析优化的结构，并同时提供 CLI、Web、extension 与 MCP server，是这一类别中生态最完整的工具。

**GitIngest** 以零摩擦的易用性著称。只需把 GitHub URL 中的 `github.com` 换成 `gitingest.com`，整个仓库就会转换成一个文本页面。（例如 `github.com/facebook/react` → `gitingest.com/facebook/react`。）在浏览器地址栏里改一个单词就够了，无需安装，尤其适合一次性的快速探索。

**code2prompt**（由 Mufeed VH 开发）是一款基于 Rust 的 CLI，优势在于可以通过模板系统进行定制。

还有一个值得一提的有趣变体：**rtk**（`rtk-ai/rtk`，约 55k stars）。上述工具是“一次打包整个仓库”，而 rtk 会**实时压缩 CLI 命令本身的输出**。它是用 Rust 编写的单一 binary，可自动注册到 Claude Code、Cursor、Copilot、Gemini CLI、Codex 等 13 种工具的 shell hook 中。当智能体调用 `git status` 时，内部会 rewrite 为 `rtk git status`。（用户无需改变 workflow，是它的核心差异。）它针对 100 多种命令应用 smart filtering、grouping、truncation、deduplication heuristic，可将输出 token 减少 60～90%。官方网站的一句话很好地概括了这个类别——*“70% of your bill is noise the LLM doesn't need.”* 如果说前面的工具减少的是“输入的上下文”，rtk 减少的则是“tool call 返回的上下文”。

不过这一层级的局限很明确：**大型仓库会触及 token 上限**。而且代码只是以“一块文本”的形式交付，不包含 symbol 关系或结构性理解。


### tree-sitter 仓库地图

下一个层级利用 **tree-sitter** 分析代码结构，但不会另外启动 index server。

**AST（Abstract Syntax Tree，抽象语法树）**是用树形结构表示源代码结构的数据结构。它是编译器语法分析阶段的结果：空格、分号、括号等表层细节会被去除，只留下变量、运算符、函数调用、控制流等有意义的元素作为节点。代码智能工具的一切精确分析，最终都建立在 AST 之上。

**tree-sitter** 是一个开源 parser generator 与增量（incremental）解析库，GitHub 的代码导航、Neovim、Zed、Helix 都采用了它。其核心差异是**只重新解析被编辑的部分**。即使在编辑器中只改一行，它也不会重新解析整个文件，而只 patch 发生变化的树。因此响应速度很快，也适合 AI 智能体快速浏览代码。

前文提到的 **Aider** 是这一方案的代表。它用 tree-sitter 从源文件中提取函数、class、method 等 symbol 定义，以文件为 node、文件间依赖为 edge 构建 graph，再应用 PageRank 系列排名算法（通过指向页面的链接数量与质量衡量页面重要性），按 token budget 只提取核心定义与 signature。（默认通过 `--map-tokens=1024` 创建 1k token 的仓库地图。）

**AFT**（`cortexkit/aft`）进一步提高了这种方法的精度。照 AFT 官方 README 的说法：**“读取一个 500 行文件约需 375 个 token。但当智能体大多数时候只需要一个函数时，把 symbol 名称交给 `aft_zoom`，就只会返回该函数及少量上下文，约需 40 个 token。”** 基于行号的编辑会在目标上方代码移动时立即失效，而 AFT 的 symbol mode 编辑按名称寻址函数，因此更加稳定。

同一层级还有一个值得额外介绍的工具：**ast-grep**（`ast-grep/ast-grep`，约 13.9k stars）。它是基于 tree-sitter 的结构化搜索与 rewriting CLI。它与普通 grep 的决定性区别，是匹配 CST（Concrete Syntax Tree）模式而非文本。例如搜索 `console.log($A)` 模式时，无论文本写法如何，都能准确找到具有相同语义结构的全部调用。它也提供独立的 `ast-grep-mcp` server，让 AI 智能体能用结构化搜索代替文本 grep。


### Knowledge Graph

第三个层级更进一步：**预先解析整个代码库，将知识图谱构建并存储到磁盘**，智能体再向已存储的图发送查询。最受关注的例子就是 **CodeGraph**。

它的架构出乎意料地简单：先用 **tree-sitter** 解析代码，再把提取出的 symbol、edge 与文件信息存入 SQLite 的 FTS5 全文搜索，最后通过 MCP 将知识图谱暴露给 AI 智能体。值得强调的是，**所有信息提取都来自 AST 的确定性解析，而不是 LLM 摘要**，这意味着其中没有幻觉介入的空间。

这里提到的 **FTS5（SQLite Full-Text Search 5）**是以 SQLite 虚拟表形式提供的全文搜索扩展。从 SQLite 3.9.0（2015-10-14）起，它已被纳入 amalgamation；可以用 `CREATE VIRTUAL TABLE ... USING fts5(...)` 创建表，再通过 `MATCH` 运算符查询。它的决定性优势是，不必运行 Elasticsearch 之类的独立搜索引擎，仅凭一个 SQLite 文件就能维护全文索引。这也是 CodeGraph 得以宣传“100% 本地运行”的原因之一。

刚才提到的**确定性（deterministic）解析**，指的是无需 backtracking、每个阶段只允许唯一选择的解析算法。LL(1)、LR parser 是典型代表，均在线性时间内运行。在 CodeGraph 的语境中，它意味着“从 AST 提取的 symbol 关系并非来自 LLM 的解释，而是数学上精确的”。让 LLM 总结代码并建立 graph 会有幻觉风险，直接解析 AST 则能得到**数学上精确的 symbol 关系**，这一原则正是该方案的核心。

benchmark 同样令人印象深刻。官方 README 比较了在 headless 模式下运行 Claude Opus 4.7 时启用与不启用 CodeGraph MCP 的结果：按平均值计算，成本**降低 35%**、token **减少 57%**、速度**提升 46%**、tool call **减少 71%**。收益还会随代码库规模增大而提高；在 Tokio 这样的大型仓库中，测得成本降低 82%、token 减少 86%、速度提升 71%、tool call 减少 92%。（没有 CodeGraph 时，智能体会大范围 fan-out 到 grep/find/Read；有了 CodeGraph，一次 index query 就能取代这一切。）

这一方向也有深厚的学术背景。**GraphCoder**（ASE 2024）创建了结合 control flow 与 data/control dependence 的 Code Context Graph。**CodexGraph**（NAACL 2025）让 LLM 智能体直接编写并执行 graph database query。**Prometheus** 则将基于 tree-sitter 的知识图谱与统一记忆结合，用于多语言 issue 解决。学界与工业界显然都在向这一模式靠拢。

这里还值得介绍一个有趣的变体。**Cursor 的 indexing** 走的是不同路线：它不是 AST graph，而是**基于 vector embedding 的语义搜索**。它在本地按函数、class 对文件进行 chunk splitting，通过 Merkle tree hash 与 server 同步，只将 embedding 存入名为 Turbopuffer 的 vector DB。（核心隐私模式是不在云端存储原始源代码。）查询时，它把问题转换成 embedding，执行 nearest-neighbor search，再根据结果返回的文件路径和行范围在本地读取内容并交给 LLM。由于寻找的是**“语义相关的代码”而不是“精确的 symbol”**，精度较低，但擅长自然语言查询。CodeGraph 与 Cursor indexing 是基于不同假设解决同一个问题——检索成本。


### LSP

最后一个层级是**直接依赖 language server**。tree-sitter 知道“某个 symbol 存在”，LSP 则知道“这个 symbol 是什么”。

举个具体例子。TypeScript 的 LSP 知道 `UserService` 实现了 `IUserService` interface、接受哪些 generic type parameter、有哪些 overload、返回类型是什么。tree-sitter 做不到这么深入。

前文在 MCP 部分介绍的 **Serena** 正属于这一层。Aider 不使用 LSP，而是自行分析文件，因此识别能力只到函数、class 层级。相比之下，**OpenCode** 等工具的 LSP 集成能提供更深入的类型理解，但也受限于是否有适合各语言的优秀 LSP server。


## GitHub Trending

![AI 编程智能体工具与代码智能流程](1.webp)

最后再补充一点：上文介绍的许多工具，我最初都是通过 **GitHub Trending** 了解到的。这里可以一眼看出谁在开发什么，以及哪些工具突然开始流行。

进入 `github.com/trending`，可以按 today、this week、this month 三种时间范围浏览，也可按语言和类别筛选。（我通常会看 weekly + TypeScript / Python，偶尔再扩展到所有语言。）

连续几周追踪 Trending 后，我发现了一个有趣现象：**本季度排名靠前的仓库形成了明确的 cluster**。了解这些 cluster，能帮助我们更好地定位单个工具。

## 总结

写这篇文章时，我最常想到的是：**工具增长得实在太快了**。就在写作期间，新的 MCP server 又登上 GitHub Trending，AGENTS.md 的支持状态发生变化，新的安全 CVE 也不断发布。写到一半的段落转眼就过时，是技术写作特有的宿命，但 AI 智能体生态的速度尤其惊人。

所以，我想做的不是推荐某个特定工具，而是培养一种**看清工具之间关系的眼光**。理解 CLAUDE.md 为何以 user message 注入、MCP 与 function calling 具体有何不同、tree-sitter 和 LSP 为何位于不同层级之后，新工具出现时就能快速看懂：“它属于哪个层级，以什么方式解决什么问题。”

最终留下的，是 ETH Zurich 研究带来的一个直觉：**模型本来就知道很多东西。**把所有内容都塞进上下文文件，并不会让智能体更认真地遵循。更好的做法是，只保留模型很可能不知道的信息——项目专属 convention、非标准工具、过去的错误——删除其余内容。安装更多工具，与把工具用好，是两回事。

我也建议读者不要立刻添加十个 MCP server，或把 CLAUDE.md 扩展到几百行；不妨先花点时间，深入了解自己当前使用的工具究竟如何运作。无论生态将走向何方，这种理解都会成为不易动摇的基础。


## 参考资料

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
