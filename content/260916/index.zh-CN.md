---
emoji: 🧩
title: '从观测到判断'
seoTitle: '解读 GA4 与 Search Console 数据：把观测数据变成产品判断的标准'
date: '2026-09-16'
categories: 观测 前端 GA4 Search-Console AI
description: '基于运营 GA4 和 Search Console 的经验，整理把观测数据变成判断的标准：排名下降但点击上升的真实案例、平均排名的陷阱、Measurement Protocol 与 BigQuery Export 的限制，以及告警与反馈循环。'
keywords: 'Search Console 数据分析, GA4 事件设计, 平均排名下降, 提升搜索 CTR, GA4 BigQuery Export 限制, GA4 Measurement Protocol 验证, Consent Mode 区别, 数据驱动决策'
locale: zh-CN
translationOf: '260916'
sourceHash: ac19b6cdbc97066749d5110c0e05c7c797ec307e9d88032f20ac12cc2052d65d
---

这篇文章想聊聊如何把观测数据变成判断。

几年来，我一直在这个博客上亲自运营 GA4 和 Search Console。看访问者通过什么搜索词进来，然后据此修改文章的标题和描述，如此反复。然而事实证明，长期看数据和用这些数据做出好的判断是两个不同的问题。这篇文章后面会讲到，面对同一篇文章的同一批指标，我在两个月之间差点得出截然相反的结论。

此前的[浏览器观测](/260914)看了浏览器产生的性能信息，[系统观测](/260915)看了系统留下的错误、日志和 trace。这些信息积累得足够多之后，服务如何运转比以前清楚得多。但先修什么、那个问题对用户是否真的重要、修完之后体验有没有变好，仍然是不同的问题。

这篇文章的核心不在于把数据强行合并到用户维度，而在于用不同的观测单位去验证同一个产品假设。而且数据源变多，判断并不会自动变好。把样本和聚合规则各不相同的数字放到同一张图上的那一刻，毫无关系的变化也可能被编成一个貌似合理的故事。观测的最后一个阶段需要的不是更多的仪表盘，而是**分辨每份数据看到了什么、没能看到什么的能力**。

## 这个博客观测的三层

与其从抽象的话题开始，不如先摊开我自己的案例。这个博客最终形成了三层观测。

![这个博客的三层观测结构：错误、体感性能、搜索行为](1.png?w=720)

第一层是 Sentry。用仅服务器端的埋点捕获异常和悄悄失败的 GA 调用。第二层是真实用户的体感性能。在浏览器里测量的 Web Vitals 被发送到 GA4 积累起来。第三层是搜索行为。每周自动收集 Search Console 数据，比较最近 28 天和之前 28 天。每一层回答的问题都不一样。什么坏了，访问者等了多久，他们当初是通过什么搜索词进来的。

三层之间无法互相替代。错误为零，访问者也可能觉得慢；速度很好，也可能根本没人来。前两层在前面两篇文章里讲过了，所以这篇文章的重心在第三层，以及把三层放在一起阅读的方法。

坦白说，这个博客的 GA4 并没有被深入用作行为分析工具。它更接近页面浏览量和 `web_vitals` 事件的存储库。所以这篇文章的 GA4 部分，会把我在运营中确认的限制和用官方文档验证过的设计标准放在一起写。哪些是经验、哪些是调研，我会按小节区分清楚。

## 各不相同的观测单位

人们很容易把浏览器 RUM、Sentry、GA4、Search Console 都叫作用户数据，但它们实际的观测单位并不相同。

| 层 | 代表性数据 | 观测单位 | 主要回答的问题 |
|---|---|---|---|
| 浏览器体验 | LCP, INP, CLS, resource timing | 页面访问和交互 | 用户等了什么、等了多久 |
| 系统状态 | error, span, trace, log, profile | 事件和请求 | 哪里的什么失败了或变慢了 |
| 产品行为 | GA4 event, session, key event | 行为和会话 | 用户在服务里做了什么 |
| 搜索意图 | query, impression, click, position | 搜索展示 | 用户带着什么问题进来 |

即使看起来像同一个人的旅程，也不是每一层都在观测同一个用户。广告拦截器可能拦下 GA 和 Sentry 的请求，analytics 的样本会随隐私同意状态而变化。Search Console 提供的是搜索结果的聚合数据，而不是单个用户。CrUX 是满足一定条件的 Chrome 用户的 field data。

因此，四层的数字对不上是正常的。问题不在于消除差异，而在于**记录每个数字回答的是哪个样本的哪个问题**。

## GA4 的事件模型

:term[GA4 event]{key="ga4-event"} 用名称和 parameter 为用户的交互建模。Google 的[事件设置文档](https://developers.google.com/analytics/devguides/collection/ga4/events)区分了 SDK 自动收集的 event、通过设置开启的 enhanced measurement、推荐使用既定名称和 parameter 的 recommended event，以及服务自行定义的 custom event。同样叫 event，谁拥有它的含义和 schema 却各不相同。

一开始总想把点击和页面切换尽可能多地发出去。但事件多并不等于对用户理解得深。如果像 `button_click`、`button_click_2`、`main_button_clicked` 这样把实现位置做成名字，代码一变，分析的含义也会跟着垮掉。

好的事件表达的是用户的意图，而不是 DOM 上发生的事。

```ts
gtag('event', 'article_reference_open', {
  article_slug: '260916',
  reference_type: 'specification',
  link_position: 'body',
})
```

这个事件记录的不是按下了哪个按钮组件，而是用户打开了文章参考资料这一事实。即使 UI 改了，分析的问题也得以保留。

在设计事件之前，最好先写下这些。

1. 想理解哪种用户行为
2. 用什么事件来判定该行为发生了
3. 分析所需的最小 parameter 是什么
4. 这个数字变化时会做出什么决策
5. 如何验证重复和遗漏

如果最后两个问题没有答案，事件就很容易沦为仪表盘的装饰。（这个博客的 GA4 停留在存储库层面的原因也在这里。能回答第 4 条的事件，目前还只有 `web_vitals` 一个）

## 收集与反映的差异

用 GA4 Measurement Protocol，可以从浏览器之外的服务器或 offline system 发送 event。但 Google 的 [Measurement Protocol reference](https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference) 明确写了一个重要限制。收集 endpoint 收到 HTTP 请求就返回 `2xx`，即使 payload 有误或数据没有被处理，也不会返回错误状态。

HTTP `2xx` 的意思是请求被接收了，并不是 event 准确进入目标报告的证据。系统观测那篇文章讲过的、藏在成功响应里的失败，同样存在于 analytics 的收集环节。就像这个博客在 200 响应背后藏着空统计一样，在 analytics 里，发送成功也不等于反映成功。

所以部署前要用 validation endpoint 或 Event Builder 确认 payload，部署后的 event pipeline 至少要在三个阶段验证。

- 发送：client 或 server 是否发出了请求
- 收集：在 Realtime 和 DebugView 里能否看到 event 和 parameter
- 分析：在最终报告和 export schema 里能否按预期的维度查询

即使发送数据的代码有测试，只要收集设置或 custom dimension 的注册缺了，分析阶段就用不上这个值。analytics 同样是部署后需要验证的运营系统。

## 原始事件打开的问题

GA4 的默认报告适合在不直接处理 :term[raw event]{key="raw-event"} 的情况下快速查看常见问题。但当你想自由组合 event 和 parameter，或与其他数据 join 时，局限就出现了。

[BigQuery Export](https://support.google.com/analytics/answer/9358801) 可以把 GA4 的 raw event 按日或以 streaming 方式导出。Standard property 的 daily export 有每天 100 万 event 的限制。Streaming export 快但是 best-effort，不包含新用户的 attribution，已有用户的 attribution 也可能需要一段时间才能处理完整。这就是当日分析要用 `events_intraday_*`、稳定的按日分析要用已完成的 `events_*` table 的原因。

能访问 raw event 之后，下面这样的问题就成为可能。

- 经历了慢 LCP 的会话里，前往下一页的比例是否发生了变化
- 特定 release 之后出错的会话里，核心行为的完成率是否变了
- 落在 landing page 里的阅读深度是否因搜索 query 类型而不同
- mobile 和 desktop 上同一功能的 interaction pattern 是否不同

不过 raw data 在给你解读自由的同时，也把重复、late arrival、sessionization、时区都交给你自己处理。会写 SQL 这件事并不保证用户模型是对的。

## 搜索呈现的意图

GA4 看的是用户进入网站之后的行为。:term[Search Console]{key="search-console"} 展示的是在那之前，用户通过哪些 query 和搜索结果获得展示并点击进来。

Search Analytics API 可以按 query、page、country、device、search appearance 等 dimension 聚合 click、impression、CTR、position。但[官方 API 文档](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)解释说，它不保证返回所有 row，而是按内部限制返回排名靠前的 row。小 query 的合计可能与整体合计对不上。

这个限制不是只存在于文档里的警告，而是我的 CSV 里每周都能看到的现象。9 月 11 日收集的最近 28 天数据里，page 维度的点击合计是 47 次，query 维度的点击合计却是 8 次。同一时期的同一个网站，大部分点击在 query 维度里却看不到。因为稀少或被匿名化的 query 不会作为 row 返回。如果想用 query 数据解释全部流量，就会用想象去填补这块空白。

平均 position 也不是一张简单的排名表。它是把多个 query、device、国家、search appearance 上产生的展示聚合起来的值。query 构成一变，即使单个关键词的排名不动，平均值也可能移动。

## 排名下降了，点击却上升了

平均 position 的这种性质，我是在这个博客的真实数据里遇到的。[Biome 能取代 ESLint 和 Prettier 吗？](/241201)是 2024 年 12 月写的文章，相对于展示量，它的点击少得奇怪，而且持续了很久。于是今年 6 月，我把这篇文章的 seoTitle 改写得更接近实际搜索查询的形态。是一个以 "Biome vs ESLint vs Prettier" 开头的比较型标题。

在 8 月初收集的 28 天对比里，这篇文章的数字是这样变化的。展示从 230 次减到 204 次，降了 11%，平均 position 从第 8.9 位退到第 11.6 位。只看这两个指标，这是一篇变差的文章。可是 click 从 2 次增加到 13 次，CTR 从 0.87% 变成了 6.37%。

![按 Search Console 统计的 Biome 文章 28 天对比，8 月初收集：展示和排名变差了，但点击和点击率大幅上升](2.png?w=720)

先泼一盆冷水才算诚实。这些数字并不能证明标题修改的效果。平均 position 是按展示加权的平均值，只要那些排得靠前却没人点的展示消失，排名就会变差，CTR 也会机械地上升。各时期的 query mix 和季节性也可能不同，而且点击增加的绝对量是 28 天里的 11 次。按倍数看很大，按绝对量看很小。

即使考虑到这些，仍然有剩下的东西。把排名当成果，这是一篇需要返工的文章；把实际流量当成果，这是一篇变好了的文章。**选择什么作为结果指标，会改变同一份数据的结论。**如果我当时只盯着排名下滑，恐怕会把一篇开始起色的文章重新拆掉。

### 9 月重新查询的数字

整理这个系列时，我重新查询了同一篇文章现在的状态。写过去的工作时，确认那个状态如今是否还维持着是我的规矩，这次也庆幸查了。

在 9 月 11 日收集的最近 28 天里，这篇文章是展示 185 次、click 6 次、CTR 3.24%、平均 position 第 20.8 位。点击从峰值的 13 次跌到一半以下，平均 position 按收集时间的顺序 8.9 → 11.6 → 14.5 → 20.8，整个夏天一路后退。也就是说，"排名下降了但点击上升了" 这个反转叙事，在 8 月初的对比区间里最鲜明，而下一个区间又动摇了这个叙事。

这次重新查询并没有推翻上一节的结论。现在点击仍然多于修改前的 2 次，CTR 也仍然高于 0.87%。这个博客上有点击记录的六个搜索 query 里，五个还是 "eslint vs biome" 这类针对这篇文章的比较型 query。只是教训多了一条。不只是指标的选择，**对比期间的选择同样会改变结论。**用一次 28 天对比写完一个叙事，下一个 28 天就会把它打碎。而平均 position 为什么持续后退，我还不知道。可能是获得展示的 query 构成变了，也可能是竞争文档变多了。在确认之前，先当作未解决。

## 从假设出发的连接

一说连接数据，首先想到的就是统一 user id 和 session id。当然，有 trace id、release、route、timestamp 这类公共维度，分析会容易得多。但把所有数据按个人维度 join 不应该成为目标。

Search Console 的 query 无法和个人关联，也不应该关联。未同意的用户可能没有 GA event。Sentry 的 event 里也有很多不需要识别用户的错误。

所以不如先确定假设的观测单位。

| 假设 | 合适的观测单位 |
|---|---|
| 新 release 之后支付错误变多了 | 按 release 的 error rate 和 key event completion |
| mobile 用户开始阅读文章的时间偏晚 | 按 device 的 LCP 分布和 engagement event |
| landing page 与特定搜索意图不匹配 | 按 query cluster 的 impression、CTR 和按 page 的行为 |
| fallback 在用户看不到的地方反复发生 | 按 fallback reason 的 event 和受影响 session 的比例 |

假设在先的话，很多情况下不需要个人标识符，在聚合层面就足以回答。前面 Biome 文章的案例也是如此。我需要的不是点开那篇文章的一个个用户，而是 query 构成和点击的 28 天粒度对比。观测的精确和用户追踪的精确不是一回事。

## 相关性的局限

连接观测数据时最常见的错误，是把同一时期变动的两个值读成因果关系。

假设 LCP 变差的那一周转化率下降了。性能可能是原因，但 campaign 流量、价格变动、库存、季节性、device mix 的变化也都有可能。如果拿总体平均值互相比较，仅仅是 mobile 流量增加，两个值也可能一起变动。我没有立刻把 seoTitle 修改和点击增加绑成因果，也是同样的理由。两件事在时间上先后相继，仅凭这一点还不够。

按下面的顺序收窄问题，可以减少草率的结论。

1. 是否在同一时间段发生变化
2. 在相同的用户环境和 route 里关系是否仍然存在
3. 是否与特定 release 或变更时点吻合
4. 错误和性能的先后关系能否在 event 层面确认
5. 修复或实验之后，是否朝预期的方向回归

观测数据擅长收窄原因候选。要确定因果关系，还需要受控实验、自然实验或可复现的变更。

## 分布与比例

系统和用户体验被压缩成平均值的程度越高，重要的群体消失得越多。

平均 LCP 是 2 秒，也可能有一部分 mobile 用户在经历 8 秒。整体 error rate 很低，也可能只集中在收到新 release 的特定 browser 上。CTR 上升了，但如果 impression 急剧减少，触达用户的构成本身可能已经变了。Biome 文章 6.37% 的 CTR 正是这种情况。

所以需要下面这样的组合。

- 性能：不只是 median，还要 p75 和 p95
- 错误：不只是 event count，还要 affected user 和 session 比例
- 行为：不只是 event 数，还要相对 eligible user 的完成率
- 搜索：不只是 CTR，还要 impression、click、query mix
- 部署：不只是整个期间，还要 release 前后和灰度发布区间

比例的分母也要一起保存。只看 checkout error 100 件像是大问题，但它是 100 次尝试里的 100 件，还是 100 万次里的 100 件，判断会完全不同。

## 同意与数据质量

对用户观测挖得越深，就越难把隐私和同意问题当作事后附加的法律检查清单。因为能收集什么，直接决定了能做什么分析。

Google 的 :term[Consent Mode]{key="consent-mode"} [官方文档](https://developers.google.com/tag-platform/security/concepts/consent-mode)说明了根据用户的同意状态调整 tag 和 SDK 的存储与发送行为的方式。Basic mode 在同意之前拦下 tag。Advanced mode 以默认同意状态加载 tag，在同意被拒绝期间发送无 cookie 的测量信号，可用于更具体的 modeling。

这里重要的是不把 :term[modeled data]{key="modeled-data"} 和 observed data 当成同一种东西。根据设置和资格条件，报告里可能应用了 behavioral 或 key event modeling，所以不能假定屏幕上的数字永远是直接观测到的 event 的简单合计。

观测设计应当包含这些问题。

- 这份数据对决策真的必要吗
- 不识别个人，在聚合层面能否回答
- 用户拒绝时，哪些东西不会被收集
- 删除和保留期限能否运营起来
- SDK 的默认值与我们服务的政策是否一致

少收集数据可能会减少分析机会。同时，不必要的噪音和风险也会减少。好的观测更接近符合目的的最小收集，而不是最大收集。

## 失败与成功的定义

最小限度收集什么，最终取决于服务如何定义成功与失败。工具会替你计算 error count、latency、session、conversion、CTR，但不会替你决定哪个值是服务的失败、哪个值是成功。

即使返回了 HTTP 200，核心数据是空的也可能是失败。反过来，即使外部 API 失败了，只要快速展示了 fallback、用户达成了目的，服务也可能是成功的。即使搜索 position 下降了，只要目标用户的 click 增加了，产品结果也可能是变好的。

要做这个判断，技术指标和用户结果之间需要明确的句子。我在这个博客实际定下的句子是这些。

- 用户必须能在搜索结果里找到期待的文章。
- 文章的主要内容必须在按 mobile p75 定下的时间内呈现。
- 即使附加统计失败，正文阅读也不得被拖慢。
- 定时收集任务没有执行，视为运营失败。

有了这些句子，需要的 metric、alert、event 就会跟着出现。反过来，如果从工具的默认 dashboard 开起，就容易把可测量的东西错当成重要的东西。

把观测结果变成判断的工程师，其角色不是成为最了解数据的人，而是成为**把用户的期待翻译成系统可验证条件的人**。

## 告警应该挂在什么上面

失败的定义一旦成为句子，下一个问题马上跟来。告警挂在哪里。

Google SRE 早期 Rob Ewaschuk 写的[告警哲学文档](https://docs.google.com/document/d/199PqyG3UsyXlwieHaqbGiWVa8eMWi8zzAn0YfcApr8Q/mobilebasic)一锤定音地说，呼叫人的告警必须紧急、重要、可处置、真实存在。并且建议把告警挂在症状而不是原因上。也就是挂在 500 响应或用户可见错误这类显露在外的信号上。

然而这个原则和我经历的事情之间有一种微妙的张力。正如系统观测那篇文章讲过的，这个博客的失败不是 500，而是 200 响应和空统计。基于症状的告警建立在失败会显露在外这个前提之上，而被归类为成功的失败恰恰打破了这个前提。

所以我并不认为需要反驳这个原则。相反，我得出的结论是，**把什么定义为症状，才是这件事真正难的部分**。在这个博客里，症状不是状态码，而是"统计查询函数返回了默认值"，而它只有靠手工埋点才能成为症状。上一节说要先用句子定下失败与成功，理由就在这里。有了那些句子，才能定下要挂告警的症状。

同一份文档补充的建议也值得记住。对嘈杂的告警，要倾向于删除。因为过度监控是比监控不足更难解决的问题。顺便一提，Google 的 SRE 书把[监控本身的失败](https://sre.google/sre-book/postmortem-culture/)列入了需要撰写事后复盘的触发条件清单。收集观测数据的装置悄悄停摆，同样是失败。对这个博客来说，每周运行的 Search Console 收集在某一周没有运行，就属于那份清单。

## 数据之间的翻译

告警都挂好之后，剩下的工作就是把用户的期待转换成浏览器 RUM、Sentry、GA4、Search Console 各不相同的 query language 和 schema。在这个环节，AI 能承担的角色与其说是生成结论，不如说是把一个问题翻译成在每个数据源里可验证的形式。

比如下面这样的流程是可能的。

1. 把自然语言问题转换成各系统的 API query 和 SQL。
2. 构建对齐不同时区和 dimension 的转换。
3. 寻找分布发生变化的 segment 和意料之外的反例。
4. 把相关的 release、code path、官方文档收集到一起。
5. 提出接下来要确认的假设和追加埋点的候选。

OpenTelemetry 的 semantic convention 之所以重要，原因也在这里。同样含义的属性如果每个服务用不同的名字发送，连 AI 也得先猜 schema。遵守公共的名称、单位和 stability，工具和人连接信号都会更容易。

即使 AI 协助分析，验证的步骤也不会减少。

- 确认生成的 SQL 是否正确处理了重复 event 和时区。
- 确认 API 返回的是全部 row 还是只有 top row。
- 确认没有混淆平均值和分位数、用户数和事件数。
- 区分 modeled data 和直接观测到的数据。
- 不给小样本的偶然变化附加过度的解释。

也就是说，AI 的长处在于把问题变成可执行的 query、拓宽比较的轴。确认结果出自哪个样本和哪套聚合规则的责任，仍然留在原地。

## 作为产品能力的反馈循环

把问题变成 query 的成本降低之后，观测和下一次变更之间的时间也可以缩短。这时重要的是，不要只提高生成速度。

Google Cloud 发布的 [2025 DORA 报告](https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report)基于对全球约五千名技术从业者的问卷，总结出 AI 的采用与 software delivery throughput 和 product performance 呈正向关系，与 delivery stability 呈负向关系。DORA 在[另一篇洞察文章](https://dora.dev/insights/balancing-ai-tensions/)里这样解释其机制。生成阶段省下的时间被重新配置到验证开销上，需要评审的代码被生产出来的速度本身也提高了。正如报告摘要所说，AI 与其说是修复团队，不如说是放大团队已有的东西。（2026 年 4 月更新的 DORA [ROI of AI-assisted Software Development 报告](https://dora.dev/ai/roi/report/)也正面讨论了管理采用初期生产率下滑的问题）

我更看重的依据另有其一。METR 在 2025 年发表的[研究](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/)让 16 名熟练的开源开发者在 246 个真实 issue 上随机分配是否允许使用 AI，结果在允许 AI 的 issue 上，完成时间长了 19%。然而开发者们事先预计会快 24%，即使亲历了实际变慢之后，仍然相信自己快了 20%。我在 [AI 前端工程师](/260302)里把这项研究作为生产力讨论引用过，但在这篇文章的语境里读法不同。它是体感无法替代测量的依据。体感不可信就得去测，而且像前面 Biome 文章的案例那样，测过一次的值也要换个期间再测一次。

生成速度加快，变更量就会增加。即使缺陷按同样的比例发生，绝对数量也会增加，需要评审的代码和对用户的影响也会快速堆积。此时如果观测跟不上，团队就只提高了部署速度，没有提高学习速度。

快速的 :term[feedback loop]{key="feedback-loop"} 是把下面这些步骤紧密衔接的能力。

1. 部署变更。
2. 观测系统和用户身上发生了什么。
3. 找出预期与实际的差异。
4. 收窄原因假设。
5. 用下一次变更验证。

AI 能极大地帮助第 3 步和第 4 步的探索。但如果第 2 步需要的信号缺失，或者没有与第 1 步的 release 信息连接起来，就无从开始。

所以善用 AI 的组织，其基础除了测试，还需要可观测的系统和以用户为中心的结果指标。比起生成能力，feedback loop 的质量才会成为瓶颈。

## 把观测变成判断

把这个系列的三篇文章各折叠成一句话，是这样的。浏览器观测展示用户体感到了什么，系统观测展示那份体验是在系统的哪里被制造出来的，GA4 和 Search Console 展示用户在服务里做了什么、带着什么意图进来。这些信号不是一个人的完整记录，而是从不同样本照亮同一个假设的证据。

因此，连接的标准不是数据量，也不是个人标识符的精确程度。要选择契合假设的观测单位，记录分母和缺漏，用修复或实验重新验证相关性。因隐私和同意而看不见的用户，也要纳入分析的局限。而且从一次对比得到的结论，要换个期间再确认一次。就像我的 Biome 文章数字在两个月之间讲了两次不同的故事那样，观测不是一次查询，而是持续复测的工作。

观测的对象本身也在扩大。OpenTelemetry 正在[单独的仓库](https://github.com/open-telemetry/semantic-conventions-genai)里整理面向生成式 AI 和 MCP 调用的 semantic convention。我们交给 AI 执行的事情越多，那些执行也越会成为同一套原则之下的观测对象。

AI 降低了启动这种验证的成本，但不会替你定下成功与失败的标准。先用句子定下要守护哪种体验、收集需要的信号、用下一次变更确认结果，这些仍然是工程师的份内事。当这个循环短而准确时，观测就不再是仪表盘，而成为产品能力。也希望读这篇文章的读者在各自的服务里挑一个指标，用一句话写下要把什么当成果，并把曾经得出的结论换个期间再查询一次。以我的经验，第二次查询教给你的比第一次更多。

:::ref
- [docs] [Google Analytics, BigQuery Export Schema](https://support.google.com/analytics/answer/7029846)
- [docs] [Google Search Console, Performance Report Data](https://support.google.com/webmasters/answer/7576553)
- [docs] [OpenTelemetry, Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/)
:::
