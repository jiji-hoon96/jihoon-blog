---
emoji: 🔬
title: 'Token 的工作原理'
seoTitle: 'LLM Token 工作原理：从 BPE tokenizer 与 KV cache 看 AI 成本根源'
date: '2026-06-10'
categories: AI Token
description: 'AI Token 既不是单词也不是字符。本文系统讲解 BPE tokenizer 如何生成 Token、Token 如何变为 embedding 向量并进入模型、为何 decode 输出比 prefill 输入更贵，以及 KV cache 与 prompt caching 降低成本的原理。'
keywords: 'LLM Token 原理, BPE, Byte Pair Encoding, tokenizer, token embedding, prefill decode, KV cache, prompt caching, context window, self-attention, 输入输出 Token 成本, 什么是 AI Token'
locale: zh-CN
translationOf: '260610'
sourceHash: 'a40bef05afd5f7b4cc1894abc929ced40531509eb954c8e78284fc47b3e4b592'
---

这篇文章想聊一聊：AI Token 究竟是什么，又按照怎样的原理工作。

过去，我主要关注如何用好 AI 工具、哪些工具正在流行，以及它们为什么会流行。但在整理 [Token 节省方法](/260611)时，我重新意识到一件事：要讲清怎样降低成本，终究得先说明“Token 是什么、费用又是怎样计算的”，可我此前从未认真补上这块基础。（写着写着，光是 Token 工作原理就已经足够单独成篇了。）

因此，本文是进入节省技巧前的基础篇。我们将依次梳理：如果 Token 既不是单词也不是字符，它到底是什么（BPE）；它以什么形式进入模型（embedding）；为什么输出比输入更贵（prefill/decode）；prompt caching 降低单价的原因来自 Transformer（神经网络架构）的哪个环节（KV cache）；以及上下文越长为什么越贵（注意力的平方成本）。如果更关心实践方法，可以读完本文后继续阅读 [Token 节省方法](/260611)。

---

## Token 既不是单词，也不是字符

先从最基本的事实说起：**Token 既不是单词，也不是字符。** 它是模型把训练数据中频繁出现的字符序列压缩后建立的一种词表单位。

人类凭直觉询问“这句话有几个词”的方式，与模型切分文本的方式并不相同。模型会把经常共同出现的字符组合归为一个单位，并在文本输入时按照这套词表将其切分。因此，同样是一个单词，有的只对应一个 Token，有的却会被拆成多个 Token。

构建这套词表的算法，就是几乎所有现代 LLM 都共同依赖的 BPE。

### BPE 算法

BPE（Byte Pair Encoding，字节对编码）会反复将最常共同出现的相邻符号对合并为一个新符号，从而逐步扩充词表。

有趣的是，它最初并非为自然语言处理而生。Philip Gage 在 1994 年首次将 BPE 作为一种数据压缩技术提出：用数据中未使用的一个字节替换出现频率最高的字节对，并把替换规则单独存入一张表。

后来，爱丁堡大学 Sennrich 团队把它引入了神经机器翻译的词表问题。在 2015 年公开、并于 ACL 2016 发表的论文《Neural Machine Translation of Rare Words with Subword Units》中，他们用 BPE 解决了固定词表无法处理生僻词和陌生词的局限。其思路是：与其完整记住单词，不如用更小的子词片段组合来表示，这样即使词表中没有某个单词，也能用已有片段编码出来。

它的工作流程出乎意料地简单。

1. 一开始，每个字符都是一个 Token。
2. 在语料库中找出最常相邻出现的 Token 对。
3. 把这对 Token 合并成一个新 Token，并在整个语料库中用新 Token 替换它们。
4. 重复第 2～3 步，直到词表达到目标大小。

因此，起初每个字符都是一个 Token；随后，“th”“the”“tion”等频繁出现的组合会逐渐合并成单个 Token。换句话说，越常见的模式，越容易形成更大的块。

![BPE tokenizer 反复合并高频相邻字符对、逐步扩充词表的过程](2.webp?w=500)

GPT 系列在此基础上更进一步，采用**字节级 BPE**。它先把文本转换为 UTF-8 字节流，再应用 BPE。这样既能让基础词表从 256 项（字节的种类数）开始，又能在没有未知 Token 的情况下编码任何可由 UTF-8 表示的文本。无论是表情符号、汉字还是特殊符号，至少在字节层面都一定能够表示。

### 相同文本，不同 Token 数

由于这种结构，同一段文本在不同 tokenizer（把人类书写的文本切成模型可处理 Token 的工具）中可能得到截然不同的 Token 数。词表的训练方式不同，同一句话就可能被切得更细，也可能组成更大的块。

![同一文本在不同 tokenizer 中产生不同 Token 数；对非英语文本，o200k_base 比 cl100k_base 使用更少 Token](3.png)

OpenAI 随 GPT-4o 一起发布的资料清楚展示了这种差异。GPT-4o 系列的新 tokenizer o200k_base，比 GPT-4 系列的 cl100k_base 能用更少 Token 表示同一文本。英语的效率只提高约 1.1 倍，但越到非英语语言，差距越明显。在官方公布的短例句中，中文和日文的 Token 数约减少 1.4 倍，韩文约 1.7 倍，印地语最多约 2.9 倍。（从韩语用户的角度看，tokenizer 代际差异比英语用户感受到的更明显，这一点很有意思。）

从更广的范围看，语言本身也存在差异。Yennie Jun 使用 cl100k_base 比较多种语言后发现，表达相同含义时，英语几乎总是需要最少的 Token，而采用独立文字体系的语言往往会被切成更多 Token。印地语和孟加拉语可能需要英语的 5 倍，缅甸语甚至超过 10 倍。韩语和中文也比英语使用更多 Token，但没有那些语言那么极端。

这带来一个重要的实践结论。Anthropic 从 Opus 4.7 起引入新 tokenizer，并在官方定价文档中明确指出：“相同文本相较旧模型，最多可能按多 35% 的 Token 计费。”**即使每 Token 单价不变，Token 数增加也会让账单同比增加。** 因此，诚实地比较模型不能只看单价，还必须看“单价 × 预期 Token 数”。

不过，这些被切分的 Token 进入模型时，并不是以字符或单词原样进入。那么，Token 究竟以什么形态作为模型输入？

## Token 如何进入模型

神经网络不能直接处理文本。模型最终能够计算的只有数字，更准确地说，是向量（由多个数字组成的数组）。所以 Token 在进入模型前，要经过若干步骤转换为数值。

按顺序来看，流程如下。

1. **文本 → Token**：BPE tokenizer 将文本切分为 Token 片段。
2. **Token → Token ID**：每个 Token 都会映射到一个整数 ID，指向它在词表中的位置。例如，如果 `" the"` 是词表中的第 1,234 个 Token，它的 ID 就是 `1234`。
3. **Token ID → embedding 向量**：用这个 ID 取出 embedding 矩阵中对应的一行。embedding 矩阵是一张尺寸为 `vocabulary size × model dimension (d_model)` 的巨大表，每个 Token ID 对应其中一行，也就是一个向量。可以把这个向量理解为承载 Token“含义”的一组坐标。
4. **加入位置信息**：自注意力本身并不知道 Token 的顺序。也就是说，它会把“我喜欢你”和“你我喜欢”看成相同内容。因此，需要向每个 Token 向量注入位置信息，让模型知道排列顺序。

仅靠文字会显得抽象，因此这里放了一个可以亲手操作这四个步骤的交互工具。改变输入句子或点击某个 Token，就能沿着它从 ID 变成 embedding 向量、再加入位置信息成为最终输入向量的路径查看。（展示时减少了维度数量，但实际 GPT-4 的向量有 12,288 维，可以带着这个概念观察。）

这里的模型维度（d_model）是表示一个 Token 的向量长度。最初的 Transformer 论文中，这个值是 512；如今的 LLM 则大得多。（仅 Llama 2 的 7B 模型就有 4,096 维。）模型维度越大，越能丰富地表达 Token 含义的细微差别，但计算量和内存占用也会随之增加。

![Token ID 查询 embedding 矩阵中的一行，并转换为 d_model 维向量的结构](4.png)

注入位置信息的方式也随着技术演进而变化。最初的 Transformer 直接把用正弦和余弦函数构造的位置向量加到 embedding 上；如今公开 LLM 事实上普遍采用 RoPE（Rotary Position Embedding，旋转位置 embedding），通过旋转 Query/Key 向量，在注意力计算阶段注入相对位置。（方式虽不同，目的都是“让 Transformer 获得顺序感”。）

简而言之，完整流程是：**文本 → Token → Token ID → embedding 向量（+ 位置信息）→ Transformer 输入**。账单上的“Token 数”，就是这个流程第二步的数量，也就是文本被切成了多少个 Token。

至此，我们已经知道 Token 如何生成，又以什么形式进入模型。那么模型处理这些 Token 时，输入和输出成本为何相差如此悬殊？重复发送相同输入的成本又如何降低？

## 为什么输入便宜、输出昂贵

接触过 Token 的人多半都疑惑过：定价表上，**输出 Token 往往比输入 Token 贵好几倍。** Anthropic 的所有模型中，输出单价都恰好是输入单价的 5 倍。（Opus 输入 $5／输出 $25，Haiku 输入 $1／输出 $5。）明明是同一个 Token，为什么进入与输出时价格不同？

答案在于，模型处理输入和输出 Token 的方式完全不同。LLM 推理分为两个阶段。

- **prefill（输入处理）**：把提示词中的全部 Token **一次性并行**处理。无论是 1,000 个还是 10,000 个 Token，GPU 都会一并扫描，计算每个 Token 的 K/V（Key/Value）。虽然总计算量很大，但并行处理让每 Token 的效率很高。
- **decode（输出生成）**：响应 Token **一次一个、按顺序**生成。每生成一个 Token，就把它追加到输入中，再生成下一个，直到响应结束。

这种不对称造成了成本差异。Databricks 的推理性能分析指出，prefill 是受计算能力限制的阶段，而 decode 是受内存带宽限制的阶段。decode 每生成一个 Token，都必须从 GPU 内存重新读取整个模型的权重，可一次却只得到一个 Token。GPU 庞大的计算能力大部分都处于闲置状态。（借用 Databricks 的说法，就是花钱开着 GPU，却没能利用可用的计算能力。）

也就是说，**输入 Token 能在并行 prefill 中一次高效处理，输出 Token 却必须逐个低效地挤出来。** 需求、利润等商业因素当然也可能影响定价，但至少从技术上看，decode 阶段的这种低效构成了底层原因。因此，“缩短输出”不只是一条普通的省钱技巧，而是在直接削减最昂贵的阶段。

那么，有没有办法让低效的 decode 稍微高效一些？KV cache 正是在这里登场。

## 缓存降低单价的原理

prompt caching 会先把静态输入存入缓存，让后续调用以低得多的价格再次读取。按照 Anthropic 官方文档，缓存读取的价格是基础输入单价的 0.1 倍，也就是 10%。缓存写入在 5 分钟 TTL（Time To Live，缓存有效期）下为 1.25 倍，在 1 小时 TTL 下为 2 倍。也就是第一次调用多付一点，从第二次起节省 90%。

但为什么价格能下降 90%？为什么“前缀必须完全一致”的条件如此严格？只要看一眼 Transformer 内部，两者的答案就会清晰起来。

### KV cache

模型处理输入 Token 时，会为每个 Token 创建对应的 Query/Key/Value（Q/K/V）向量。自注意力用 Query 与 Key 的点积计算注意力分数，再用这些分数对 Value 做加权和得到输出。可以把它理解为决定一个 Token 应该“参考”其他 Token 多少的计算。

前面提到的 decode 阶段正是在这里遇到问题。每生成一个新 Token，都需要前面所有 Token 的 K/V；如果每次都从头计算，同样的 K/V 就会无休止地重复计算。

![Transformer KV cache 的工作结构](1.webp)

KV cache 正是为了消除这种重复而引入。它会存储计算过的 K/V；生成新 Token 时，不再重新计算前面 Token 的 K/V，而是从缓存读取并复用。这样，在一个序列中多生成一个 Token 的成本，就从每一步都重算整个序列的 O(n²)，降为只需读取缓存的 O(n)。（严格说来，这是每一步的成本；核心思想很简单：“已经算过的就不要再算。”）decode 之所以受内存限制，也因为每一步都要从内存重新读取这份 KV cache。

### 跨调用复用

如果说 KV cache 最初是为了加速单次响应内部的 decode，那么 prompt caching 的想法就是把这套内存结构**不只用于一次调用内部，而是在调用与调用之间继续复用**。

静态前缀（系统提示词、工具定义、代码片段等每次基本相同的开头部分）的 K/V，会在 5 分钟或 1 小时 TTL 内留在 GPU 内存中。下一次调用若从相同前缀开始，模型就会完全跳过这部分 K/V 计算，直接从缓存读取。准确地说，并不是输入 Token 单价凭空变低，而是**计算这些 Token 所需的 GPU 工作本身消失了。** 90% 的降价，是把节省的计算反映到价格上的结果。

理解这一机制后，也就能自然明白“前缀必须完全一致”为何如此严格。缓存命中通过比较前缀的累计哈希来判断；而自注意力具有因果性，只要前面的一个 Token 改变，后面所有 Token 的 K/V 都会改变。哪怕只在提示词最前面加入一行时间戳，它每次调用时变化，都会让前缀哈希不同，使后续整段缓存失效。

Anthropic 的缓存按 `tools` → `system` → `messages` 的层级顺序读取。因此，前部哪怕只改动一个工具定义，后面的全部缓存也会失效。结论很简单：**静态内容放前面，每次变化的动态内容放后面，缓存才能存活。**

缓存还有一些不太为人熟知的限制。可缓存的最少 Token 数会因模型而异，同一系列的不同版本也可能不同。短于这一阈值的提示词即使开启缓存，也会悄无声息地不被保存。（这些最少 Token 数和不同服务商的缓存策略直接关系到成本设计，因此我在 Token 节省方法一文中结合定价表作了详细说明。）

## 上下文窗口为什么形成 Token 上限

最后，谈 Token 绕不开的概念是上下文窗口：模型一次最多能够接收多少 Token。理解这项限制为何存在，也就能看清“上下文越长越贵”这句常见警告背后的原因。

关键在自注意力的计算结构。注意力会让每个 Token 各自参考所有其他 Token 一次。若有 n 个 Token，Token 对的数量就是 n × n，也就是说，**自注意力的计算量与内存需求会随序列长度 n 的平方增长。** Token 数翻倍，注意力成本就变为 4 倍。（需要说明的是，并非整个模型都是 O(n²)，而是注意力阶段如此。）

![每个 Token 都参考所有其他 Token 的自注意力矩阵；n 个 Token 会产生 n×n 个 Token 对](5.png)

[Hugging Face 的估算](https://huggingface.co/docs/transformers/en/llm_tutorial_optimization)清楚展示了这种平方增长有多陡。在未经优化的标准注意力中，仅保存注意力分数矩阵，输入为 1,000 个 Token 时约需 50MB；16,000 个 Token 时约需 19GB；100,000 个 Token 时则接近 1TB。

此外，前面提到的 KV cache 也会按 Token 数量占用内存。上下文越长，必须保存的 K/V 就越多，并呈线性累积。因此，上下文窗口上限本质上是模型面对“再长下去，内存和计算就无法承受”这一物理限制所划出的边界。

所以，原样保留一段很长的对话，不只是增加输入 Token 数这么简单。注意力成本按平方增长，而且 Token 数越接近上限，模型准确处理信息的能力也会下降。（这种准确率下降与 Token 节省方法一文所谈的上下文退化直接相关；保持上下文精简之所以同时有利于成本和答案质量，原因就在这里。）

## 总结

梳理到这里，Token 的工作原理可以浓缩为几个简单事实：**Token 是 BPE 把高频模式合并后形成的词表单位**，它经过 Token ID 映射，变为 embedding 向量后进入模型。**输入可以通过并行 prefill 一次处理，而输出必须逐个 Token 挤出，因此更加昂贵**；KV cache 则通过复用 K/V 来缓解这种低效。**缓存能降低单价并不是魔法，而是 Transformer 不必重新计算已经算过的 K/V**；前缀必须完全一致这一严格条件，也直接源自这种结构。最后，上下文越长越贵，是因为注意力成本按 Token 数的平方增长。

掌握这层基础后，成本问题就清楚得多。为什么输出贵、怎样安排提示词才不会破坏缓存、为什么应当保持上下文精简、在答案相同时为什么应该换用更便宜的模型——这些节省策略都建立在上述原理之上。如果你是为了理解工作机制读到这里，不妨继续阅读 Token 节省方法，看看这些原理如何真正降低费用。

:::ref
- [paper] [Philip Gage, A New Algorithm for Data Compression (1994)](https://en.wikipedia.org/wiki/Byte-pair_encoding)
- [paper] [Sennrich, Haddow, Birch, Neural Machine Translation of Rare Words with Subword Units (ACL 2016)](https://arxiv.org/abs/1508.07909)
- [article] [Jay Alammar, The Illustrated Transformer](https://jalammar.github.io/illustrated-transformer/)
- [docs] [HuggingFace, Byte-Pair Encoding tokenization](https://huggingface.co/learn/nlp-course/en/chapter6/5)
- [docs] [HuggingFace, Transformers KV Cache strategies](https://huggingface.co/docs/transformers/en/kv_cache)
- [repo] [OpenAI, tiktoken](https://github.com/openai/tiktoken)
- [article] [OpenAI, Hello GPT-4o (Language tokenization)](https://openai.com/index/hello-gpt-4o/)
- [article] [Yennie Jun, All languages are NOT created (tokenized) equal](https://www.artfish.ai/p/all-languages-are-not-created-tokenized)
- [article] [Databricks, LLM Inference Performance Engineering Best Practices](https://www.databricks.com/blog/llm-inference-performance-engineering-best-practices)
- [article] [Baseten, A guide to LLM inference and performance](https://www.baseten.co/blog/llm-transformer-inference-guide/)
- [docs] [Anthropic, Prompt Caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
:::
