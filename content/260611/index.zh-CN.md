---
emoji: 💸
title: 'AI Token 节省方法'
seoTitle: 'AI Token 节省方法：降低 Claude Code 与 Cursor 成本的实证模式'
date: '2026-06-11'
categories: AI Token
description: '用 React POC 测量 AI 编程的 Token 成本，并通过 prompt caching、subagent、精简 MCP、context engineering 与 Cursor Composer 降低成本。'
keywords: 'AI Token 节省, Claude Code 成本, Token 成本优化, prompt caching, context engineering, subagent, MCP Token, Cursor Composer, model routing, context rot, LLM 成本优化'
locale: zh-CN
translationOf: '260611'
sourceHash: e7ea965ce86523995dd6cce198d074d9895e6cd9655469a04591a7f5e2a7f1be
---

这篇文章想聊一聊如何节省 AI Token。

过去，我关注的是结果和过程，而不是性能与成本。AI 产出的内容漏洞不少，必须逐一验证；为了尽快拿到结果，包括我在内的很多人一旦 Token 不够，就会付费或升级到更高档的订阅。我也不例外。（其实最初几个月里，我甚至没有留意 Token 究竟花了多少钱。）

但过了一段时间，我渐渐对 Token 用量警觉起来。个人感到月费负担沉重，企业则开始认真考虑人力和运营成本。正如我在 [AI Agent 工具版图](/260529)中总结的那样，之前的文章与其说在讨论 AI 是什么、怎样工作，不如说更关注如何用好 AI、能从中获得什么帮助、有哪些工具、最近流行什么，以及这些潮流为何出现。我依然认同这个方向，不过随着时间推移，人们最终最想知道的恐怕还是成本。

关于 Token 究竟是什么、如何通过 BPE 生成，以及 prompt caching 降低单价时 Transformer 内部发生了什么，我已在 [Token 的工作原理](/260610)中单独整理。本文以此为基础，先看费用如何计算、低效从何而来，再归纳经过验证的节省模式，最后用一个小型 POC 收尾：采用多种策略执行同一任务，直接测量 Token 用量。

---

## Token 成本是怎样产生的？

先用最简明的方式看看 Token 成本从何而来，又按什么规则计费。

我们发送的所有文本——系统提示词、工具定义、对话记录、用户消息——都会成为输入 Token，模型生成的回复则是输出 Token。对模型来说，每次调用都是从未见过的新输入。无论是昨天的对话还是一分钟前的调用，新调用都会把相同内容作为输入重新完整发送。（这个简单事实正是 Token 成本的核心：模型没有记忆，是我们每次都把内容重新告诉它。）

这里还有一个变量。重复调用时，如果每次都重新传输静态部分，成本实在太高，因此主流 LLM 提供商引入了 prompt caching。静态输入先保存到缓存中一次，后续调用只对从缓存读取的 Token 按低得多的价格计费。（Token 如何由 BPE 生成，以及缓存如何复用 Transformer 的 KV cache 来降低单价，已在“Token 的工作原理”中说明；这里关注这些原理怎样转化为费用。）

### 输入 Token、输出 Token 与缓存 Token

来看 Anthropic SDK 在响应的 `usage` 对象中返回的四个字段。

![1.png](1.png)

- `input_tokens` 已发送输入中除缓存读取之外的部分
- `output_tokens` 模型生成的响应
- `cache_creation_input_tokens` 本次调用首次写入缓存的 Token
- `cache_read_input_tokens` 从已有缓存中再次读取的 Token

这四个字段分别乘以不同单价。输出 Token 最贵，从缓存读取的 Token 最便宜。根据 Anthropic 官方文档，缓存读取价格是基础输入价格的 0.1 倍，也就是整整 10%。缓存写入按 5 分钟 TTL（Time To Live，缓存有效期）计为 1.25 倍，按 1 小时 TTL 计为 2 倍。也就是说，第一次稍微多付一些，从第二次开始便宜 90%。

不过缓存还有一些不太为人所知的限制。可缓存的最小 Token 数因模型而异，同一系列的不同版本也不一样。根据 Anthropic 官方文档，Sonnet 4.6 和 Opus 4.8 是 1,024 Token，Opus 4.7 是 2,048 Token，Haiku 4.5 与旧版 Opus 4.5/4.6 则是 4,096 Token。更短的提示词即使设置了 `cache_control`，也不会提示错误，只是不会被缓存。每个请求最多可设置 4 个 `cache_control` 断点，缓存按 `tools` → `system` → `messages` 的层级顺序读取。因此，前方哪怕只改了一项工具定义，后面的全部缓存也会失效。

![prompt cache 必须从前往后依次匹配，前部变化会使后续缓存失效](2.webp)

缓存之所以能让单价降低 90%，源于在多次调用之间复用 Transformer 的 KV cache；内部原理已在“Token 的工作原理”中详述。从成本角度只需记住一点：缓存命中只有在前缀完全相同时才会发生。因此必须把**静态部分放在前面，把每次变化的动态部分放在后面**，才能避免缓存失效。提示词前部哪怕只多了一个时间戳字符，也会使后续缓存全部失效。

此时很自然会想到一个问题：“多轮对话每轮输入都不同，缓存岂不是几乎每次都会失效？”答案是否定的。对话输入并不是每轮重写的一整块内容，而是**保留前面累积的内容，只在末尾追加新发言（append）的结构**。系统提示词、工具定义以及此前各轮的问答一旦确定就保持不变，只有本轮的新问题会加到最后。因此，从开头比较本轮和上一轮输入时，首次出现差异的位置总是末尾的新问题。整体输入每次都不同，但从前缀看，前面绝大部分仍然一致，缓存便能保留。（真正导致每轮缓存失效的，是把动态值塞到提示词前部的错误设计。Claude Code、opencode 等工具都固定前部、只在后面追加，用户也无需专门调整缓存设置。输入中的错别字或拼写差异不影响缓存，道理相同：变化总发生在缓存覆盖范围之外的最末端。）

### AI 对比

把截至 2026 年 6 月 Anthropic、OpenAI、Google 的官方价格放进同一张表，趋势便一目了然。（单位为每百万 Token 的美元价格，主要选取编程工作流中常用的模型。）

| 提供商 | 模型 | 输入 | 缓存输入 | 输出 |
| --- | --- | --- | --- | --- |
| Anthropic | Claude Opus 4.8 | $5.00 | $0.50 | $25.00 |
| Anthropic | Claude Sonnet 4.6 | $3.00 | $0.30 | $15.00 |
| Anthropic | Claude Haiku 4.5 | $1.00 | $0.10 | $5.00 |
| OpenAI | GPT-5.5 | $5.00 | $0.50 | $30.00 |
| OpenAI | GPT-5.5 Pro | $30.00 | $3.00 | $180.00 |
| Google | Gemini 3.1 Pro | $2.00 | $0.20 | $12.00 |
| Google | Gemini 3.5 Flash | $1.50 | $0.15 | $9.00 |

三家提供商的输出价格都是输入的 5～6 倍。也就是说，输出越长，即使答案相同，费用也会陡增。同一档位内，不同模型的价格也可能相差 3～6 倍。只看简单计算就能得出降低 Token 成本的三条主线：**缩短输出；答案相同时选更便宜的模型；把静态输入放进缓存**。（再算一步会更有意思：假设每次调用都复用 1 万 Token 的静态上下文，共调用 100 次，按 GPT-5.5 基础价格需 $5，而从缓存读取只需 $0.50。缓存实际节省 $4.5，且第一次写缓存几乎没有附加成本，所以第二次调用起就开始获益。）

### 缓存机制的差异

即使节省比例相近，各提供商的内部结构也并不相同。了解差异为何出现，会更容易制定策略。

| 项目 | Anthropic | OpenAI | Google Gemini |
| --- | --- | --- | --- |
| 触发方式 | 显式 `cache_control` 断点 | 自动（无需改代码） | 同时支持自动（implicit）与显式（explicit） |
| 最小缓存 Token | 1,024 ~ 4,096（因模型而异） | 1,024+（按 128 递增） | 2,048 ~ 4,096（因模型而异） |
| 缓存写入费用 | 输入单价的 1.25x（5 分钟）/ 2x（1h） | 免费 | 免费（另收按小时计算的存储费） |
| 缓存读取费用 | 输入单价的 0.1x | 输入单价的约 0.1x | 输入单价的 0.1x |
| TTL | [5 分钟或 1 小时（用户选择）](https://github.com/anthropics/claude-code/issues/46829) | 默认闲置 5～10 分钟，最长 1 小时（扩展后 24 小时） | 用户指定（按小时收取存储费） |
| 额外费用 | 无 | 无 | 存储费 Flash $1/M·小时，Pro $4.50/M·小时 |

三家的设计理念清晰可见。**Anthropic**要求用户明确指定缓存范围，第一次调用收取少量溢价（1.25 倍），之后则大幅降价。前缀的位置容易控制，缓存读取率也更可预测。**OpenAI**恰好相反，一切自动处理。超过 1,024 Token 就自动缓存且没有附加费用，但用户几乎无法干预缓存行为。**Google**同时提供两种方式，用户显式控制缓存时另收存储费。短小而频繁的缓存适合隐式方式，需要保存一小时以上的大型上下文则适合显式缓存加存储费的模式。

### 工具定义与分词器

此外，还有两个影响出乎意料地大的变量。

第一是工具定义。在连接多个 MCP 服务器的环境中，每次调用都会把所有工具名称与参数模式定义一同作为输入发送（后文会直接测量这会膨胀多少）。即使工具不变，只换模型也会影响费用，这一点值得注意。Anthropic 官方价格文档显示，工具系统提示词的长度本身就因模型而异。Sonnet 4.6 与 Haiku 4.5 在 `tool_choice: auto` 下约为 497 Token，Opus 4.7 在同一位置使用 675 Token，Opus 4.8 又降到 290 Token。在 model routing 前先确认“当前模型会把工具定义展开多长”，常常能发现数量级不小的差异。

第二是分词器（把人类文本切分为模型可处理 Token 单位的工具）自身的效率。正如“Token 的工作原理”所述，同一文本经过不同分词器，Token 数也会不同。OpenAI 的 o200k_base 与 cl100k_base 相比，能显著减少非英语文本的 Token；Anthropic 则明确说明，从 Opus 4.7 起换用新分词器后，同一文本最多可能多用 35% 的 Token。只按单价选模型，可能又从分词器效率差异中漏掉成本。诚实的模型比较，应看单价×预计 Token 数的乘积。

实际比较时，韩语上的差异尤其明显。我用 OpenAI 的两种分词器处理同样的句子，英语技术句在新旧版本中的 Token 数相同，但韩语使用旧版（cl100k_base）时比新版（o200k_base）多出 31～43%。尤其值得注意的是一段韩语：167 个字符在旧版中变成 169 Token，出现了**Token 数比字符数还多**的结果，相当于一个韩文字平均消耗超过一个 Token。

![不同 tokenizer 下韩语与英语 Token 数对比：cl100k 与 o200k](3.png?w=720)

原因是旧版会把韩语按字节细细拆开，而新版能把“개발”“입니다”等常见片段整体合并为一个 Token。即使单价相同，以韩语为主的任务仅凭分词器效率差异，也可能让账单相差 1.5 倍以上。

看到这里，一个问题自然浮现：“那么，我们究竟在哪里制造了低效？”

## 浪费 Token 的常见模式

即使自认为很会使用 AI，Token 低效流失的情况仍然很常见。把我自己和身边开发者的习惯归纳起来，大致有以下几类。

### 过多的 MCP 服务器与工具定义

前面虽已提到，这里仍想再次强调。MCP 服务器（Linear、GitHub、Notion、Figma、Slack、Sentry）一旦接入，往往就很少移除。未使用的工具模式定义会在每次调用时膨胀为输入 Token。Claude Code 默认启用的 MCP Tool Search 正是为了解决这个问题：会话开始时只加载工具名称和服务器描述，直到真正调用某个工具时才加载完整模式定义。

我直接测量了这种差异。以工作中的 Claude Code 会话里 27 个 MCP 工具（serena 10 个、claude.ai OAuth 四组共 8 个、figma 2 个、agentmemory 7 个）为对象，使用**同一条用户消息在两种配置下调用**。一边完全没有安装 MCP，另一边已挂载了全部 27 个，但模型无法调用；两边的工具调用次数都设为 0。

![6.png](6.png)

问题相同、模型相同、回复含义也相同，输入 Token 却从 **41 → 10,335（+10,294）**（Opus 4.7）暴增。换算为单次费用，就是从 **$0.0048 → $0.0563，约 12 倍**。输入膨胀 250 倍，预填充负担也随之增加，响应时间多出 **+783ms**。比金额本身更直观的是：**即使用户这一轮一次 MCP 工具都没有调用，这笔费用仍会在每次调用时产生**。上一段的 Tool Search 防住的正是这笔成本。（完成这次测量后，我一直在清理平时不用的 MCP 服务器。）

### 上下文累积与 Lost in the Middle

![4.jpg](4.jpg)

原封不动地延续长对话，不仅会增加每次调用的输入 Token，还会降低模型本身的正确率。Stanford 的 Liu 团队在“Lost in the Middle”论文中定量展示了一条 U 形曲线：关键信息位于上下文开头或末尾时最容易被找到，埋在中间时性能明显下降。于是出现最糟糕的组合——花更多 Token，得到更差的答案。Transformer 的自注意力计算量随 Token 数平方增长；上下文越长，每个 Token 能分到的绝对注意力越稀薄。再加上训练数据的重要信息往往集中在首尾，中间便最先变弱。

再深入一点，模型处理 Token“位置”的方式本身，就包含两种会让中间内容被淹没的习性。听起来复杂，用比喻解释却很简单。

第一，模型会**更加留意附近的 Token**。如今大多数公开模型采用的位置表示方式 RoPE（Rotary Position Embedding，旋转位置嵌入）被设计为：两个 Token 距离越远，彼此联系越弱（距离越远，信号越淡的 decay effect），因此远处 Token 自然更少受到关注。

第二，模型会**把过多注意力无意义地流向第一个 Token**。模型受到一种约束：每时每刻都必须把自己的注意力以 100% 的总量分配完毕（softmax 强制注意力总和为 1）。即使当前没有特别需要关注的地方，剩余注意力也必须丢到某处，而那个位置通常是句首的第一个 Token。第一个 Token 吸收多余注意力的现象称为 attention sink，即“注意力排水口”。（MIT 的 Xiao 团队在 StreamingLLM 论文中首次对其进行定量分析。它并非因为第一个 Token 包含重要信息，更像是把剩余注意力排出去所产生的副作用。）

两种习性叠加后，注意力会集中在两端（邻近的近期 Token＋第一个 Token），真正埋在中间的信息反而最弱。重要的是，这不是某个特定模型的缺陷。LLaMA、Mistral、Qwen 等多数公开模型采用 RoPE 系列，Claude、GPT 等闭源模型也被认为使用类似方法，因此 lost-in-the-middle 更像是现代 Transformer 共有的偏差。

![5.png](5.png)

近来，这种现象被称为 **context rot**。[Chroma 研究团队](https://research.trychroma.com/context-rot)让包括 GPT-4.1、Claude 4、Gemini 2.5、Qwen3 在内的 18 个前沿模型完成同一项 NIAH（needle in a haystack，大海捞针）任务。分析定量显示，当输入从 10k 增至 100k 以上时，正确率会因模型不同而降至 20～50%。18 个模型都随着长度增加而性能下降，下降最慢的是 Claude 系列。Anthropic 也将其解释为 Transformer 的 n² 注意力机制导致“注意力预算”被每个 Token 消耗的问题。保持上下文轻量，既是在省钱，也是在守住正确率。

### 无节制地调用 subagent

因为 subagent 好用就把所有任务都交出去，同样是个陷阱。subagent 在独立于父级的上下文中启动，因此要从头装载系统提示词和工具定义，产生固定成本。把短 shell 命令、简单 git 查询之类的小任务交给 subagent，启动成本可能超过整理主上下文所省下的费用。Anthropic 公布的 multi-agent research system 报告显示，与普通对话相比，单个智能体约使用 4 倍 Token，multi-agent system 约使用 15 倍。只有正确率提升足以抵偿这 4～15 倍的额外费用时，委派才有意义。

同样的陷阱也适用于 MCP 工具挂载。每启用一个工具，其模式定义都会在每一轮进入系统提示词，即使模型当轮不用，也照样计费。“说不定会用，干脆全开”直觉上似乎安全，实测却并非如此。

我针对 facebook/react v19 的 reconciler 源码，把相同问题分成以下三种配置，测量正确率与费用。

- 不使用工具
- 只使用一个工具（CodeGraph、Serena、ripgrep、bare grep）
- 同时挂载四个工具

![codesearch-bench 不同工具场景的正确率与 Token 对比](9.png?w=500)

结果清楚显示了三个特点。（这里的召回率指正确答案被完整找出的程度。）

- **不使用工具**的平均召回率只有 0.31，证明工具本身确实有价值。
- **只使用 Serena（LSP）**的召回率为 1.00，费用 $0.38，是所有单工具策略中效率最高的。
- **挂载全部四个工具**时，召回率反而降至 0.89，费用升至 $0.47。尤其在多跳问题中，全挂载配置的分数与单独使用 CodeGraph（0.78 / 0.88）精确到小数点后两位都相同。模型偏向四个工具中的一个，也完整继承了它的弱点。

subagent 与工具挂载遵循同一条原则：只有额外成本能换来足够的正确率提升，才有意义。**准确选择一个适合任务领域的工具，比“也许会用”而全部开启更便宜，也更准确。**

那么，经过验证的节省方法究竟是什么？真的存在可行的办法吗？

## 经过验证的 Token 节省方法

每种节省模式针对不同的成本维度：有的减少输入，有的降低相同输入的单价，有的把相同任务交给更便宜的模型。下面逐一来看。

### Prompt caching

这是见效最快的方法。正如前文所述，缓存读取只需基础输入价格的 0.1 倍。第一次调用支付少量写入溢价（1.25 倍）后，从第二次起，相同静态部分便能以十分之一的价格重复使用。

从节省角度还要再强调一点：无论采用哪种方式，真正适合缓存的都是**每次调用几乎不变的部分**（工具定义、代码片段、RAG 上下文）。只要不把静态块与动态内容（本轮问题、刚得到的工具结果）混在一起，效果就不会打折。直接使用 API 时，把静态块集中放在前面、动态部分放到后面，便能实现大部分节省；使用 Claude Code、opencode 等成熟工具时，排列工作会由工具自动完成。

### 用 Batch API 汇总异步任务

如果调用不必立即完成，Batch API 是直接降低单价最简单的工具。Anthropic、OpenAI、Google 都对输入和输出 Token 提供同样的 50% 折扣，代价是结果会在最长 24 小时内返回。Anthropic 的实测中，大多数批次会在一小时内完成，但 SLA 本身仍是 24 小时。调用内容完全不变，单价直接减半，采用成本几乎为零。

这 50% 最有意思之处在于，它会与其他节省机制相乘叠加。Anthropic 官方文档明确说明，缓存与批处理折扣会相乘（stack）。静态输入价格可降为标准价格×0.5（批处理）×0.1（缓存读取）＝0.05 倍，也就是标准价格的 5%。关键在于两项折扣不是相加，而是相乘。

我直接计算了差异。假设有 100 个任务，每个任务包含 1 万 Token 的静态上下文、500 Token 的动态输入和 1,000 Token 的输出，然后按 Opus 4.8 的价格比较四种策略。

![Batch API 与 Prompt caching 的 Token 成本节省对比：两项折扣相乘叠加](12.png?w=720)

只用缓存可节省 57%，只用批处理可节省 50%，两者结合则可节省 79%。原因是折扣并非简单相加，而是在静态输入部分相乘。（输出 Token 不属于缓存对象，只享受批处理的 50% 折扣，所以输出占比越高，整体节省幅度就越低于 79%；静态输入占比越高，相乘效果越明显。）夜间建立代码库索引、发布前文章评估、数据提取、定期报告等场景，并不需要人守在屏幕前等待，其范围比想象中更广。

但并非所有任务都能延后异步处理。在编程智能体主会话或交互式聊天界面中，用户需要根据回答决定下一步行动，响应时间本身就是价值，Batch 并不适合。仅仅把任务分为“必须马上看到结果”和“下次上班前收到即可”两类，就可能让账单减半。

### 用 Subagent 隔离高输出量任务

![Subagent 上下文隔离结构](7.webp?w=500)

[直接引用 Claude Code 官方文档的表述，](https://www.anthropic.com/engineering/multi-agent-research-system)subagent“在自己隔离的上下文窗口中运行，中间工具调用及其结果留在 subagent 内，只有最终消息返回父级”。也就是说，把高输出量任务整体委派出去，父级上下文中只会留下整洁的摘要。[Anthropic 的 context engineering 文章](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)指出，即便 subagent 在探索中使用数万 Token，通常也只会向父级返回一份压缩到 1,000～2,000 Token 的摘要。保持父级上下文轻量的效果非常明确。

> 高输出量任务是指为了得到一行答案，在过程中吐出大量 Token 的任务，例如运行测试、搜索文档、分析日志等。

不过有一点需要澄清：subagent 并不等于总成本下降。Anthropic 自己的报告称，智能体使用的 Token 约为普通对话的 4 倍，multi-agent system 则约为 15 倍。subagent 是把大量输出从昂贵的长期上下文中移走，从而守住正确率和父级成本的机制，并非无条件削减总 Token 开支的魔法。因此，应遵循前文的原则：只有“整理主上下文所省费用高于启动成本”时才委派；短任务由父级直接完成更便宜。

还需要考虑适用领域。Anthropic 的 multi-agent research system 报告称，在内部评估中，Opus 4（负责人）＋Sonnet 4（多个 subagent）的组合相较单个 Opus 4 智能体性能提高了 90.2%。但这种提升并非在所有领域都一样。同一篇文章明确指出，“需要智能体共享同一上下文，或智能体之间依赖关系很多的领域不适合多智能体”，并把编程工作列为典型例子。研究任务可以沿独立方向并行探索，代码则运行在依赖图上，一个函数的变化会影响其他函数。（如果你正在把多智能体用于编程，不妨重新确认工作流是否真的接近并行探索。单个智能体加一个隔离的探索 subagent，或许是编程领域更安全的默认方案。）

### compact 与 progressive disclosure

Claude Code 的 `/compact` 会把截至当前的整段对话压缩成摘要，再以新上下文重新开始。按 Anthropic 官方说明，压缩并非简单截断，而是按语义总结：保留正在进行的任务背景与近期变更，丢弃重复工具输出等不太需要再次引用的内容。`/clear` 会清空一切，而 `/compact` 会留下摘要；当上下文窗口接近占满 95% 时，auto-compact 会自动执行相同操作。在适当节点整理过长会话，就能切断输入 Token 的累积。

再深入一点，`/compact` 只是用户显式调用的最后阶段，在它之前还有四级自动上下文压缩流程。根据分析 Claude Code 内部机制的外部研究[《Dive into Claude Code》](https://github.com/VILA-Lab/Dive-into-Claude-Code)，每次调用前，`query.ts` 都会依次检查以下五个阶段。

![8.png](8.png)

- **Budget Reduction** 会截掉单个工具输出超过大小上限的部分。
- **Snip** 会按时间轴截去较旧的历史记录。
- **Microcompact** 在保留缓存感知能力的同时进行细粒度压缩。
- **Context Collapse** 在 read-time 重新投影超长历史记录，以降低维度。
- **Auto-Compact** 在达到 95% 时作为最后手段，按语义执行压缩。

越靠上越轻量、越便宜，越靠下越重但效果也越强。五级结构的设计依据是：单一压缩策略无法解决所有上下文压力。用户显式调用 `/compact`，近似于提前触发自动流程的最后一级。

相似思路也体现在 Claude Code 的 Skills 结构中。`/compact` 是事后缩减已累积的上下文，而 `/skills` 的三级加载则从一开始就避免累积。

根据 Anthropic 文档，技能分三阶段加载。会话开始时，上下文中只有名称和一行说明（约 100 Token）；正文（`SKILL.md`，少于 5,000 Token）直到技能被触发才加载；打包脚本或资源通过 bash 执行时，只把输出返回上下文，代码本身不会进入。因此，即使安装几十个技能，初始上下文也几乎不会增加。

### model routing：答案相同，就交给更便宜的模型

![13.png](13.png)

Opus 4.8 与 Haiku 4.5 的输入价格相差 5 倍。如果连简单搜索、探索、短摘要都一律交给最大的模型，成本损失会很大。按照任务难度沿 Haiku → Sonnet → Opus 逐级路由，只在真正需要重度推理的阶段调用 Opus，正在成为标准模式。[LMSYS 的 RouteLLM 研究](https://lmsys.org/blog/2024-07-01-routellm/)展示了一种路由器：在保持 GPT-4 质量 95% 的同时，把强模型调用比例降至 14%（需要注意，这项基准针对一般推理，并非编程专项）。

工具版图也在迅速稳定。商业网关有 OpenRouter、Martian、NotDiamond，开源自托管阵营则有 LMSYS 的 RouteLLM，以及 LiteLLM、Bifrost 等成本可视化层。在 Anthropic 生态中，Agent SDK 的模型选择参数、Claude Code subagent 的 `model` 字段（Explore 默认使用 Haiku）、`/model` 斜杠命令，都是为路由准备的机制。不过需要指出，直接调用 API 时，并不会根据输入难度自动选择模型。Anthropic、OpenAI、Google API 默认都会严格使用用户指定的模型名；自动路由只在产品层（Cursor 的 Auto、ChatGPT 的自动模式、OpenRouter 的 `openrouter/auto`）作为可选项存在。想通过路由降低费用，无论接入网关还是部署分类器，都要自行构建。

但也不能盲目接入外部自动路由器。OpenRouter Auto Router 这类每次调用都动态换模型的路由器，与前文的 prompt caching 正面冲突。Anthropic 的 ephemeral cache 只有在模型相同、前缀相同时才能命中；每次调用改变模型键，缓存键就会错位。缓存读取原本能降低九成单价，这个效果会完全丢失。用路由省下近一半，又因缓存未命中全部吐回去的情况并不少见。OpenRouter 意识到了这一点，才会推荐基于 `session_id` 的粘性选项。

因此，业界最终形成的方案反而很简单：不要每次调用都动态分类，而应按任务类型静态分支。前文 subagent 的 `model` 字段就是这种模式。Explore subagent 始终走 Haiku 的代码探索通道，代码审查 subagent 始终走 Opus 的审查通道。每条通道内重复相同模型、系统提示词和工具定义，各模型便能分别积累并命中自己的缓存。所以“路由正在成为标准”更接近这样的含义：标准并非每次运行分类器的动态路由，而是“协调者＋执行者”形式、按任务类型划分的静态分支。路由与缓存能在同一设计中不矛盾地共存，原因就在这里。

### Cursor Composer 2.5

![10.webp](10.webp)

这是一种稍有不同的节省方法：使用 Cursor 这样的智能体。[Cursor 于 2026 年 5 月 18 日发布的自研模型 Composer 2.5](https://cursor.com/blog/composer-2-5)以 Moonshot AI 的开源检查点 Kimi K2.5 为基础，针对编程任务进行了微调。Cursor 团队称，在自有基准中，它以大约十分之一的价格实现了可与 Claude Opus 4.7 相当的编程性能。公开基础价格为输入 $0.50、输出 $2.50；与 Opus 4.8 的输入 $5.00、输出 $25.00 相比，正好低一个数量级。

专用模型的基准数值由 Cursor 自己测量，因此与其照单全收绝对值，不如把它看作一种趋势：“面向编程训练的小模型，可以在与通用前沿模型相同的任务上达到相近的实用性能，同时把成本降低一个数量级。”这是 2026 年最明显的节省趋势之一。

真正有趣的不只是单价，而是**与 IDE 共同设计时，输入 Token 本身也会减少**。Composer、Cascade 等模型经过训练，可以高效消化 IDE 发送的代码库上下文（当前文件、相邻文件、已建立索引的符号）。同一任务中，通用模型往往要求“再给我看看相关文件”，反复执行 grep、read，输入 Token 随之膨胀；专用模型可减少这部分开销。单价降低一个数量级，再叠加 Token 数略减，实际节省会超过单纯的价格差。

### 把上下文移到上下文之外

2026 年最值得关注的趋势，是只在“需要的时候，放入需要的内容”。Anthropic 称之为 **just in time（JIT）上下文**。它不把全部资料预先塞进上下文，而是只保留文件路径、查询等轻量引用，真正需要时再通过工具取回。Claude Code 不会把整个代码库建立索引后全部装载，而是通过 glob、grep 随用随读，正是这一模式。

Anthropic 随 Sonnet 4.5 一同发布的 memory tool 与 context editing，也源于相同理念。这里要特别说明：memory tool 的“记忆”与常见理解不同。它既不是会话内累积的对话记录（存在于上下文窗口中，会话结束便消失），也不是 `CLAUDE.md` 这类由人预先编写、启动时自动加载的配置文件。memory tool 是**由模型直接读写文件的工具**。

深入来看，两种工具的设计接口出乎意料地简单。memory tool 让 Claude 对用户基础设施中的专用记忆目录执行创建、读取、更新、删除文件四类操作。模型不是把内容“写到某段文本里”，而是像使用普通文件系统一样管理记忆。保存位置放在用户基础设施中是关键：Claude 得以在上下文窗口外持久保留记忆，而数据如何存储和保管仍由用户控制。会话记忆在上下文内会消失，这类记忆却留在外部并延续到下一会话。context editing 从相反方向完成同一件事：接近 Token 上限时，自动清除陈旧且不再引用的工具调用结果，保留对话脉络，让智能体能运行更久。

Anthropic 自己的评估显示，两者结合后相较基线性能提升 39%，单用 context editing 提升 29%；在 100 轮网页搜索评估中，Token 消耗减少 84%。（应考虑这是供应商自有基准，但方向十分明确：上下文设计的重点正从填满转向腾空。）这一趋势与 Claude Code 的 `/compact` 五级流程一脉相承。区别在于，`/compact` 在上下文内部做减法，memory tool 则在上下文外设置独立存储。两者并不冲突，而是互相补充。

## 结语

![14.webp](14.webp)

梳理到这里，节省 Token 最终可归结为三条轴线：**同一件事，发送更少；同一份输入，用更低价格发送；同一个答案，交给更便宜的模型**。Prompt caching、Batch API、subagent 隔离、`/compact`、memory tool 与 context editing、model routing、专用模型等模式，区别只在于它们攻击三条轴线中的哪一条。若用一句话概括 2026 年的趋势，那就是上下文的重心正从“填入内容的技术”转向“腾空并筛选内容的技术”，也就是 context engineering。正如 context rot 所示，轻量上下文不仅省钱，也有利于正确率。

当然，不存在唯一答案。不同团队的工作模式不同，同一个人写文章和写代码时，成本结构也不同。但有一点可以确定：生态变化越快，“昨天有效的节省模式今天仍然有效”这个假设就越危险。持续追踪新模型、新工具和新价格表，并在自己的任务上用小型 POC 验证，或许才是最不起眼却最持久的节省方法。也建议读者试着翻开自己的 Token 账本看一看。（如果想了解这些策略为何有效，可以到“Token 的工作原理”中继续阅读 BPE 与 KV cache。）

最后还剩下一个问题：当我们已经学会腾空和筛选上下文，下一步会走向哪里？沿着公开资料看，重心正向上下文再外移一层，扩展到如何运行智能体整体系统（harness 设计）、如何衡量它是否运行良好（eval），以及出错时如何限制它（containment）。有趣的是，本文一直强调的“亲自用 POC 测量”，一旦扩展到系统层面，就恰好成为 eval。关于接下来的方向，我准备在 [上下文之后](/260622)中另行详述。

:::ref
- [docs] [Anthropic Prompt Caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [docs] [Anthropic Batch Processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- [docs] [Anthropic Claude API Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [docs] [Anthropic Claude Code Subagents](https://code.claude.com/docs/en/sub-agents)
- [docs] [Anthropic Claude Code MCP Tool Search](https://docs.claude.com/en/docs/claude-code/mcp)
- [docs] [Anthropic Agent Skills](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)
- [docs] [OpenAI Prompt Caching](https://developers.openai.com/api/docs/guides/prompt-caching)
- [docs] [OpenAI API Pricing](https://openai.com/api/pricing/)
- [docs] [Google Gemini Context Caching](https://ai.google.dev/gemini-api/docs/caching)
- [docs] [Google Gemini API Pricing](https://ai.google.dev/pricing)
- [article] [Anthropic, Managing context on the Claude Developer Platform](https://www.anthropic.com/news/context-management)
- [paper] [LLMRouterBench (Findings of ACL 2026)](https://arxiv.org/abs/2601.07206)
- [paper] [VILA-Lab, Dive into Claude Code](https://arxiv.org/abs/2604.14228)
:::
