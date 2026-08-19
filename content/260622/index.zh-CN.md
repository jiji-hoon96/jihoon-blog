---
emoji: 🧭
title: 'Harness（系统）工程'
seoTitle: 'Context 之后的 AI agent：harness 设计、eval 与 containment'
date: '2026-06-22'
categories: AI 智能体
description: '从 prompt engineering 到 context engineering，下一步将走向哪里？本文以 Anthropic 工程博客近期呈现的脉络为线索，梳理 harness 设计、eval、containment（隔离）三个方向及其与 token 节省讨论的联系。'
keywords: 'context engineering, harness 设计, AI agent eval, agent evaluation, containment, agent 隔离, 2026 AI 趋势, prompt engineering, LLM agent, token 节省之后'
locale: zh-CN
translationOf: '260622'
sourceHash: '3a4496827fcd34537ded61f9925a57116fbf16b6d28eee9508f66417f6d2345b'
---

这篇文章想谈谈 prompt engineering、context engineering，以及再往后的方向。

在整理上一篇关于[token 节省方法](/260611)的文章时，有一个问题始终萦绕在我脑海中。我认为，重心正在从逐个雕琢 prompt，转向去除无关信息并筛选所需内容的技术（context engineering）。文章写完后，下一个问题自然浮现：那么，context 之后是什么？

![由 prompt、context 与 harness engineering 构成的可靠 AI 系统 3 层结构](3.webp)

讨论“未来方向”需要谨慎。未来可能有无数种选择，因此本文只专注于梳理**从已经公开的一手资料中能够读出的重心转移**。其中难免包含一些推论，也希望读者能从不同角度看待本文。

---

## 从 prompt 到 context

先厘清术语。曾有一段时间，业界的核心话题是 **prompt engineering**。问题在于如何写好发给模型的一次性指令，也就是如何设计清晰的指示、恰当的示例和输出格式。

后来，工作的单位变大了。随着运行数十个轮次的 agent 日益普及，重要的不再是一次 prompt，而是如何组织**模型在每个轮次看到的完整 context**（system prompt + 工具定义 + 对话记录 + 搜索结果 + 记忆）。这就是 **context engineering**。Anthropic 在 2025 年 9 月的“Effective context engineering for AI agents”一文中梳理了这一框架；同年 Chroma 研究团队（Hong et al.）发表的 context rot 研究又提供了定量依据。他们测试了 GPT-4.1、Claude 4、Gemini 2.5、Qwen3 等 18 个模型，发现即使只是原样抄写单词这样的简单任务，输入越长，性能也会出现不均匀的下降。模型会同等处理第 100 个 token 和第 10,000 个 token 这一常见假设，在现实中并不成立。结论不是“context 越长越好”，而是“信息如何摆放，与其中包含什么同样重要”。这进一步推动了从填满 context 向筛选 context 的转变，也让这个术语迅速普及。

这里需要指出一个常见误解。prompt engineering 并没有被 context engineering **取代**。写好 prompt 依然是基础，而 context engineering 更接近建立在其上的上位概念。（关注点从写好代码转向设计好系统，并不意味着 coding 不再必要。）所以更准确的表述不是“换轨”，而是**“在包含原有概念的同时扩大了范围”**。

那么再问一次：这种扩展止步于 context 了吗？看起来并没有。

## Anthropic 工程博客

我认为，判断方向最诚实的方法，是按时间顺序阅读那些真正推动该领域发展的组织正在写什么。沿着 Anthropic 工程博客中“Effective context engineering”（2025 年 9 月）之后的文章看下去，仅从标题就能勾勒出重心下一步移向何处。

- 2025 年 10 月，用 Agent Skills 武装 agent
- 2025 年 11 月，Code execution with MCP：更高效的 agent
- 2025 年 11 月，Effective harnesses for long-running agents
- 2026 年 1 月，Demystifying evals for AI agents
- 2026 年 1 月，设计 AI-resistant 技术评估
- 2026 年 2 月，量化 agentic coding 评估中的基础设施噪声
- 2026 年 3 月，Harness design for long-running application development
- 2026 年 4 月，Scaling Managed Agents：分离大脑与双手
- 2026 年 5 月，如何在所有产品中 contain Claude

退一步看这份列表，关键词聚成三条线：**harness**、**eval** 和 **containment**。我将其理解为：讨论正在从如何恰当地填充、清理 context，再向外迈出一步，转向设计、测量和控制整个 agent 系统。（当然，这里有一个局限：这只是一家公司的侧重点。不过考虑到该公司在 coding agent 生态中的分量，也很难把它仅仅视为单一 vendor 的兴趣。）

下面逐一展开。

## harness

harness 这个词可能有些陌生。直译是马具，即套在马身上、把力量引向预期方向的装置。在 AI agent 中，harness 指的是**在 model 外部包围 model、驱动其工作的完整骨架**。包括允许它以什么顺序使用哪些 tool、一次失败后如何恢复、授予多大权限，以及 loop 何时停止。

如果 context engineering 解决的是“给 model 看什么”，那么 harness 设计解决的是“让 model 在其中如何行动”。它位于更外一层。若把 model 比作聪明的新员工，context 是交给新人的工作材料，harness 则更像其工作环境和操作规程。同一个人在混乱的环境中表现会不稳定，而在设计良好的流程上，凭同样能力也能走得更远。

这一点的重要性，在[Anthropic 工程团队亲身遭遇的失败](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)中体现得很清楚。他们把顶级编程模型 Opus 4.5 放在 Claude Agent SDK 上，只给出“做一个 claude.ai 复刻版”之类的高层指令，并运行多个会话；模型本身虽然聪明，却没能产出生产级应用。失败反复呈现两种形态。一种是试图一次做完所有事情，实作中途耗尽 context，让下一个会话接手半成品功能。另一种是后来加入的会话看到“已经做得差不多了”，便丢下尚未完成的工作直接宣布结束。（可以想象一项漫长工作由多人轮班接续，但每个接班者都完全没有前一人的记忆。）

解决办法不是让模型更聪明，而是改变骨架。第一个会话获得用于搭建环境的专用 prompt（initializer agent），把 200 多项功能规格展开到 `feature_list.json`，并创建启动开发服务器的 `init.sh` 和进度日志（`claude-progress.txt`）。此后的每个会话（coding agent）每次只处理一个功能，以 git commit 和进度记录留下整洁状态，然后结束。下一个会话先读取进度文件和 git log，弄清“上一班做到哪里”，再继续工作。同一个模型放到这套骨架上，结果就变了。决定成败的不是模型，而是 harness。（有趣的是，Anthropic 的这些做法并不新鲜。功能清单、小步 commit、进度记录、每次都执行的 smoke test，正是资深开发者每天在做的事。所谓适合 agent 的良好骨架，归根结底就是把良好的工程习惯嵌入环境。）

这条脉络与 token 节省讨论的交点也很明确。上一篇文章谈到的 subagent 隔离、tool 定义瘦身和 model routing，单独看是不同的节省技巧；合在一起看，归根结底都是**如何设计一个 harness**的组成部分。决定哪类工作送往哪个 model lane、只开启哪些 tool、把 verbose 的探索隔离到哪里，这整个过程就是 harness 设计。节省更像是设计的副产品。

不过，harness 设计有一个微妙的陷阱：**骨架设计得越好，model 进步后就越可能过时。** harness 本质上是一组关于“model 无法独自完成什么”的假设；model 一旦能够自行完成，这些假设就成了冗余。Anthropic 提到的[案例](https://www.anthropic.com/engineering/managed-agents)正是如此。Sonnet 4.5 在接近 context 上限时有匆忙收尾的习惯（context anxiety），因此团队在骨架中加入了 context reset 机制。可同一套骨架换成 Opus 4.5 后，这种习惯已经消失，精心加入的 reset 反而成了累赘。model 每聪明一步，骨架的一部分就可能这样到期。

于是出现了更进一步的思路：与其精心打造某个特定骨架，不如**设计即使骨架变化也保持稳定的接口**。Anthropic 的 Managed Agents 正朝这个方向发展，而其思想源头竟是操作系统。OS 能维持数十年，是因为它把硬件虚拟化为进程、文件等抽象，提前造出了能容纳尚不存在的程序的容器。一行 `read()`，无论面对 1970 年代的磁盘还是今天的 SSD，都以相同方式工作。用同样思路把 agent 分为三部分：负责判断的**大脑**（Claude 与 harness）、实际动手的**双手**（code execution sandbox 与工具），以及以 append 方式记录一切的**会话日志**。三者分离后，即便容器崩溃，大脑也能将其当成 tool call error 处理；即便 harness 崩溃，也能从会话日志的最后位置恢复。副作用是成本与延迟也降低了。只在真正需要时启动容器后，time to first token（TTFT）据称在中位数上下降约 60%，p95 下降超过 90%。（这里再次与 token 节省文章相接。上一篇建议为 prompt caching 把静态部分放在前面；“如何安排 context 才能提高 cache hit 率”，正是大脑旁边的 harness 所负责的工作。）

## eval

第二条线是我个人最感兴趣的。2026 年初的文章仿佛事先约好一样，全都聚向**评估（eval）**。

想想原因就很自然。context 是否组织得当，harness 是否设计得好，cost 是否真的节省了，要**用什么来确认？** agent 越是自主处理漫长而复杂的工作，人就越难逐项用肉眼确认“它到底运行得好不好”。信任的依据最终会转向测量。因此，“如何设计 agent 评估”“如何消除评估本身的噪声”“如何处理 model 察觉评估后改变行为的 eval awareness”等主题走到了前台。

![4.png](4.png)

agent 评估之所以棘手，是因为它与一次性问答性质不同。agent 会跨多个 turn 调用 tool、改变 state，一次错误会向后传播并累积。而且即使输入相同，每次运行的结果也会波动。[Anthropic](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)用两个指标描述这种非确定性。**pass@k** 是 k 次尝试中至少成功一次的概率，因此尝试越多越高。**pass^k** 是 k 次全部成功的概率，因此尝试越多越低。只需偶尔生成一次正确代码时，pass@1 很重要；每次都必须稳定运行的客服 agent，则以 pass^k 为核心。（若 per-trial 成功率为 75%，连续成功三次的概率是 0.75³，约 42%。“通常能用”和“每次都能用”的差距就是这么大。）

那么一次尝试由什么评分？同一篇文章把 grader 分为三类。**code-based**（test 是否通过、static analysis、tool call 验证）快速、便宜且客观，却不擅长存在多个正确答案的开放任务。**model-based**（LLM-as-judge、按 rubric 评分）能捕捉细微质量，但具有非确定性，必须定期与人工评分校准。**human-based** 最准确，却缓慢而昂贵。实际工作中会混合三者，尽可能以确定性评分打底，再用 model 评分辅助。还要区分另一组概念。**capability eval** 问“这个 agent 能做到什么”，所以会从低分起步，给出可以攀登的坡度；**regression eval** 问“过去能做到的现在还能不能”，因此必须维持接近 100%，分数下降就是某处损坏的信号。

这里有一个常被忽略的陷阱：**分数低，问题可能不在 agent，而在评估。** Anthropic 报告称，Opus 4.5 最初在 CORE-Bench 上得到 42%；调查后发现，原因包括僵硬的评分方式——期待“96.124991…”，却把“96.12”判错——以及含糊的题目规格和无法复现的随机任务。修复 bug 并用放宽约束的 scaffold 重跑后，分数跃升至 95%。因此他们强调一项原则：**不要照单全收分数，要亲自阅读 transcript（运行记录）。** 如果 frontier model 尝试 100 次仍是 0%，通常不是 model 无能，而是题目坏了。

随着测量进步，基准线本身也快速移动，这一点同样有趣。在代表性的 coding agent benchmark SWE-bench Verified（给出真实 GitHub issue，并按 test 是否通过评分）中，frontier model 的分数在 1 年内就从 30% 多升到 80% 以上。到了这里，简单题已全部解决，分数触及天花板（saturation），于是产生悖论：能力的大幅提升只能显示为很小的分差。据说有一家 code review startup 起初只看一次性评估，对新 model 不以为然；改用衡量更长、更复杂任务的 agent 型评估后，才真正看见进步。因此，eval 不是做一次就结束的东西，而是需要不断换成更难版本的活资产。（Anthropic 将其比作安全工程中的“Swiss cheese model”。一片有孔的奶酪无法挡住失败，但把自动评估、production monitoring 和人工 transcript review 层层叠加，穿过一层的失败就会被下一层捕获。）

## containment

第三条线的性质略有不同。它关注的不是 cost 或 performance，而是**安全与控制**。

agent 掌握越多 tool、行动越自主，一次错误的影响范围（blast radius）也越大。对于能删除 file、向外部发送 request、代为执行特权操作的 agent，“做得有多好”与“出错时在哪里止损”同样重要。2026 年 5 月，[Anthropic 关于全产品 containment 的文章](https://www.anthropic.com/engineering/how-we-contain-claude)被放到突出位置，也可从这一背景理解。文章把 agent 风险分为三类：user 出于恶意或疏忽要求有害操作的 **user misuse**；model 在无人指示时自行行动的 **model misbehavior**；以及通过 tool、file、network 从外部进入的 **external attack**。一个有趣的观点是，model 变聪明并不只会降低风险。能力较弱的 model 会误读情境、犯明显错误；能力更强的 model 错误较少，却更善于找到意料之外的路径，绕过无人明确写下的约束。

他们强调的核心是“每次都由人监督”这一方式的局限。Claude Code 早期通过在每次写入、执行、network access 前请求 user 批准来保障安全，但 telemetry 显示，user 直接同意了约 93% 的请求。批准窗口越多，人对每一个就越不注意，形成 **approval fatigue**。依赖人的 click 的概率性防御最终仍会留洞。因此重心从“监控 agent 正在做什么”移向“首先限制 agent 能做什么”。防御分三层叠加：sandbox、VM、egress control 等构成的**环境层**，system prompt、classifier 等构成的 **model 层**，以及 MCP、plugin、搜索结果等构成的**外部内容层**。核心原则是**首先建立能以确定方式阻断行为的环境层**。这并非因为 model 层防御很弱。事实上，在测试 prompt injection 的 Gray Swan benchmark 上，单次攻击成功率约为 0.1%，处于顶尖水平。但适应性地尝试 100 次后，成功率会升至 5～6%；概率性防御本质上不可能达到 100% 命中率。所以还要设置最终会撞上的硬边界。（引入 OS 级 sandbox 后，批准窗口减少了 84%。安全机制反而降低了摩擦。）

![containment 3 层防御结构：在环境层（确定性、最后防线）之上叠加 model 层与外部内容层（概率性）](2.png?w=720)

这似乎与 token 节省相距很远，实则同根。两者都在问：**“给 agent 什么，又给到什么程度？”** Anthropic 用两个案例很好地说明了这种联系。其一，内部 red team 通过 phishing 让员工用恶意 prompt 运行 Claude Code。悄悄夹入的指令让它读取 `~/.aws/credentials` 并向外 POST，25 次中成功了 24 次。由于指令由用户亲自输入，模型分类器看不出可疑之处。阻止攻击的不是聪明的模型，而是最初就把凭据放在 sandbox 外的环境边界与 egress control。另一案例更微妙。egress allowlist 正常放行了 `api.anthropic.com`，但攻击者植入的文件使用攻击者自己的 API key 调用 Anthropic 的文件上传 API，让数据流向攻击者账户。sandbox 完美工作，数据却依然泄漏。教训是，allowlist 不能只看作“目的地过滤器”，而应看作“允许使用该域名所有功能的权限”。（Anthropic 反复强调这一原则：经过验证的 hypervisor、syscall filter 和 container runtime 都安然无恙，**真正出问题的是他们自己在其上构建的组件**。）移除不用的 MCP 工具也是同一个道理：既节省成本，又减少 attack surface。保持轻量的设计不仅更便宜、更准确，也更安全。

## 总结

把三条线压缩成一句话：关注的单位正在逐层向外扩展，**从 prompt（一次指令）到 context（每个 turn 展示什么），再到整个 agent 系统（如何运行、如何测量、如何限制）**。harness 对应“如何运行”，eval 对应“如何知道运行得好不好”，containment 对应“运行出错时如何阻止”。

![关注点从 prompt 到 context、再到整个 agent 系统的3 阶段扩展结构，以及 harness、eval、containment 三条分支](1.png?w=720)

再次强调，这三条线是作者**从已经公开的资料中推断出的重心转移**，不是“2026 年下半年它们将成为标准”之类的预言。有些趋势会继续扩大，有些会被吸收到别的名称之下。但可以确定的是，prompt 和 context 都不会消失，而会作为更大框架的一部分留下。这个领域一直不是用新词抹掉旧词，而是在其上再加一层；未来也很可能如此。

我们从 cost 谈起，一路来到这里。上一篇建议读者拿出 token 账本，这篇则更进一步：不妨同时审视，节省的 cost **用什么确认**（eval），这种节省**在哪种骨架上可以重复**（harness），以及该骨架**安全到什么程度**（containment）。归根结底，最持久的也许不是某一种节省技巧，而是测量并控制自己系统的习惯。

:::ref
- [article] [Anthropic, Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [article] [Anthropic, Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- [article] [Chroma Research, Context Rot](https://research.trychroma.com/context-rot)
:::
