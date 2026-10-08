---
emoji: 🧭
title: '上下文文件'
seoTitle: "CLAUDE.md、AGENTS.md 与 SKILL.md 的区别: AI 编程智能体上下文文件"
date: '2026-05-29'
updatedAt: "2026-10-08"
locale: zh-CN
translationOf: '260529'
sourceHash: bb7924b155b99b2e2f0c86c6ab970989ae0c36a6e40193617be6dd29adb326d3
categories: AI 开发工具 Claude MCP CodeGraph
description: "梳理 CLAUDE.md、AGENTS.md、SKILL.md 与 Cursor rules 何时、如何被智能体读取，并根据 CLAUDE.md 以 user message 注入的机制、上下文遗忘与 ETH Zurich 研究，给出上下文文件该写什么的判断标准。"
keywords: "CLAUDE.md, AGENTS.md, SKILL.md, MEMORY.md, Cursor rules, copilot-instructions.md, 上下文文件, AI 编程智能体, Claude Code, ETH Zurich AGENTS.md 研究"
---

本文想聊一聊**AI 编程智能体读取的上下文文件**。

本文写给这样的开发者：一个项目里同时堆着 `CLAUDE.md`、`AGENTS.md`、`SKILL.md` 和 `.cursor/rules`，却搞不清它们各自何时被读取、该写些什么。读完之后，你会了解这些文件的区别、智能体读取它们的方式，以及基于 ETH Zurich 研究的判断标准：只写智能体无法推断的信息。

作为一名前端开发者，我在日常工作中经常使用 Claude。渐渐地，项目根目录里多出了 `CLAUDE.md`，旁边还有别人创建的 `AGENTS.md`，某个角落仍留着 `.cursorrules`，我也曾照着某篇文章建起 `.claude/skills/` 文件夹。（回过神来，记录着相似内容的文件已经有五个左右了。）


## 没有持久记忆的智能体

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

`AGENTS.md` 是为解决上述各工具专属文件泛滥而创建的标准。2025 年 12 月，Anthropic、Block、OpenAI 三家公司将它与 MCP（把智能体连接到外部系统的协议）一同捐赠给 Linux Foundation 旗下的 **Agentic AI Foundation（AAIF）**，使其成为事实上的行业标准。官方网站（`agents.md`）明确表示，**已有超过 6 万个开源仓库采用该文件**。

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

这里与 Skills 相比较的 MCP（Model Context Protocol），是把智能体与 Slack、GitHub、DB 等外部系统连接起来、使其能够调用这些系统的标准协议。如果说上下文文件关乎该告诉智能体什么，MCP 关乎的就是该让智能体能做什么。MCP 与 function calling 有何不同，另外整理在[MCP 与 function calling](/260524)中。


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


## 总结

上下文文件因工具而异，名称、存放位置和被读取的时机都不一样。仅本文提到的就有 CLAUDE.md、AGENTS.md、SKILL.md、Cursor rules、copilot-instructions.md 和 MEMORY.md，哪个工具支持哪个文件也在不断变化。只记住文件清单，很快就会过时。

所以，我想做的不是推荐某种特定的文件格式，而是培养一种**看清文件如何被智能体读取的眼光**。理解 CLAUDE.md 为何以 user message 注入、不同工具为何以不同方式读取同一个 AGENTS.md、指令为何会在上下文中间变弱之后，新的上下文文件格式出现时，就能快速看懂：“它何时被加载，作用有多强。”

最终留下的，是 ETH Zurich 研究带来的一个直觉：**模型本来就知道很多东西。**把所有内容都塞进上下文文件，并不会让智能体更认真地遵循。更好的做法是，只保留模型很可能不知道的信息——项目专属 convention、非标准工具、过去的错误——删除其余内容。把上下文文件写长，与把它写好，是两回事。

我也建议读者不要急着把 CLAUDE.md 扩展到几百行，不妨先深入了解一下，自己当前使用的工具会在何时、放在哪个位置、以多大的力度读取这个文件。无论文件格式如何变化，这种理解都会成为不易动摇的基础。


## 参考资料

:::ref
- [docs] [Claude Code Memory, Anthropic](https://code.claude.com/docs/en/memory)
- [docs] [Anthropic Tool Use Overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [docs] [Cursor Rules Documentation](https://cursor.com/docs/context/rules)
- [paper] [ETH Zurich, "Evaluating AGENTS.md" (2602.11988)](https://arxiv.org/abs/2602.11988)
- [paper] [Yue Zhang et al., "Siren's Song" (2309.01219)](https://arxiv.org/abs/2309.01219)
- [paper] [Ziwei Xu et al., "Hallucination is Inevitable" (2401.11817)](https://arxiv.org/abs/2401.11817)
- [paper] [Nelson F. Liu et al., "Lost in the Middle" (2307.03172)](https://arxiv.org/abs/2307.03172)
- [article] [Simon Willison, "Claude Skills are awesome"](https://simonwillison.net/2025/Oct/16/claude-skills/)
:::
