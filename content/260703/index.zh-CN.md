---
emoji: 🔭
title: '可观测性'
seoTitle: '借助 AI 接入可观测性：Sentry 服务端埋点、静默失败与 Core Web Vitals'
date: '2026-07-03'
categories: 可观测性 前端 Sentry 稳定性
description: '我在公司一直使用 Sentry，个人博客却没有错误监控。本文整理了我与 AI 一起接入埋点时遇到的问题：藏在 200 响应后的失败、gray failure、卡住 65 秒的 GA 调用，以及搜索数据。'
keywords: 'Sentry Next.js 配置, 前端可观测性, observability 与 monitoring 的区别, gray failure, differential observability, GA Data API timeout, Core Web Vitals 测量, PerformanceObserver, Search Console 数据分析, 仅服务端 Sentry'
locale: zh-CN
translationOf: '260703'
sourceHash: fbcca6aea45957ef4f0764f5fae07c02e1481844e6db69d481df25b28077fd44
---

这篇文章想聊聊可观测性。

我在公司使用 Sentry 已经很久了。issue 出现后打开 stack trace，通过 release 和 tag 缩小范围，再寻找复现条件，都是熟悉的工作。然而，这个博客却一直没有错误 monitoring。我过去为个人博客使用的主要是 Google 系列工具：用 Analytics 查看访客，用 Search Console 查看访客通过哪些搜索词进入，再据此修改标题和描述。也就是说，我有观察用户的工具，却没有观察 server 如何失败的工具。

这并不是因为不了解工具。拖延的原因在别处。公司项目已有别人铺好的 instrumentation，我只需在上面继续做；这个博客却必须从头决定用什么工具、埋在 server 还是浏览器、什么算作失败。这些全是设计判断，而要做出判断，首先得重新梳理博客的运行方式。每次走到这个门槛，我都会把它往后推。

后来，我和 AI agent 一起开始这项工作，一天就做完了：四个已 merge 的 PR，以及两个没有 merge、验证后关闭的 PR。但真正促使我写下本文的并不是“完成得很快”，而是**接入并实际测量后，我发现自己以为知道的几件事是错的**。

我原以为博客运行得很好。响应是 200，页面也能正常打开。可加入 instrumentation 后才看到，访客统计早已悄无声息地变成空值，而 server 在此之前会卡住 1 分钟以上。因此，接入可观测性工具的价值不在于“装上了工具”，而在于知道了那些不接入就无从得知的事情。

所以本文会沿两条线展开：一条关于服务稳定性，另一条关于理解用户。最终，两条线会抵达同一个结论。

## 先厘清“可观测性”这个词

Monitoring 和 observability 经常被混用，但它们指向的对象不同。

Honeycomb 创始人、长期引领这一领域讨论的 Charity Majors 在[自己的博客](https://charity.wtf/2020/03/03/observability-is-a-many-splendored-thing/)中解释，monitoring 是预先决定检查项目并设置阈值，例如 CPU 超过 90%时告警、错误率超过 1%时告警。与之相对，observability 的定义是：

::::quote
:::translation
能否仅仅从外部提出问题，就理解系统内部正在发生什么——理解系统可能进入的**任何**内部状态？
:::

:::original
can you understand what is happening inside the system — can you understand ANY internal state the system may get itself into, simply by asking questions from the outside?
:::
::::

能否通过从外部提问，理解系统可能进入的**任意**内部状态？这里的关键是“任意”。Monitoring 是预先确定要问的问题，observability 则是连未预先设定的问题也能回答的状态。Majors 在[另一篇文章](https://www.honeycomb.io/blog/observability-a-manifesto)中将这种区别概括为 known-unknowns 与 unknown-unknowns：知道自己不知道的事，与连“不知道”本身都不知道的事。

我的经历恰好属于后者。我没有提前问过“GA 调用失败会怎样？”，甚至没想到要问。

另外，我们常看到把可观测性介绍为“日志、指标、trace 三大支柱”的说法，但 Majors 本人在多篇文章中都批判过这种框架。OpenTelemetry 官方文档也使用 signal 而非 pillar。若把它理解成集齐三者就有了可观测性，很容易陷入工具齐全却回答不了问题的状态。（我起初也是从工具清单入手，到这里才重新调整方向。）

## 可观测性工具实在太难用了

那么，接入可观测性工具究竟难在哪里？回头看我一直拖延的原因，困难有两类。

第一，**必须知道浏览器如何生成数值**。在前端观察用户侧情况时尤其如此。比如，要直接测量访客感知到的性能，首先得了解 `PerformanceObserver`。但这项 API 对选项组合有限制。根据 MDN 文档，用于获取已发生条目的 [buffered 选项](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver/observe)只能与 `type` 搭配，不能和 `entryTypes` 同用。脚本若没有放在页面最上方，会不会彻底错过初始指标，差别就在这里。

指标本身的定义也与直觉不同。衡量布局偏移程度的 CLS 并不是页面上所有偏移的总和。web.dev 的 [CLS 文档](https://web.dev/articles/cls)把它定义为会话窗口中**最大的一个分组**。两次偏移间隔少于 1 秒就归为一组，每组最长 5 秒。此外，用户输入后 500 毫秒内发生的偏移会带上 `hadRecentInput` 标记并被排除，因为用户点击按钮后展开手风琴并不是错误。不知道这些规则而自行求和，结果会不同，也很难判断错在哪里。

指标的组成也会变化。衡量输入延迟的 FID 已[从 2024 年 3 月 12 日起](https://web.dev/blog/inp-cwv-march-12)被 INP 取代。它从只看一次交互的首次响应，变成观察页面整个生命周期内的交互响应性。

当然，这些计算不必自己实现，使用 Google 的 `web-vitals` 库即可。不过阅读[它的文档](https://github.com/GoogleChrome/web-vitals)会发现，即使用库也仍有不少陷阱。这些 API 无法观察 iframe 内部，因此使用 iframe 的页面中，库测得的值会与 Chrome 用户体验报告（CrUX）不同。在后台标签页加载的页面根本不会报告 CLS、FCP 和 LCP。从后退/前进缓存恢复时，指标又会重新报告。因此，当数值与预期不符时，要判断究竟是网站慢还是测量规则所致，最终仍需要浏览器知识。

第二，**必须判断 instrumentation 应该放在哪里**。OpenTelemetry 文档清楚解释了这种区分。它把不修改源代码、以 agent 形式接入的方法称为 zero-code instrumentation，并这样[说明其范围](https://opentelemetry.io/docs/concepts/instrumentation/zero-code/)：

::::quote
:::translation
通常，zero-code instrumentation 会为你使用的库添加 instrumentation。这意味着请求与响应、数据库调用、消息队列调用等会被自动纳入观测。然而，应用程序代码通常不会被自动纳入。要为自己的代码添加观测，需要使用 code-based instrumentation。
:::

:::original
Typically, zero-code instrumentation adds instrumentation for the libraries you're using. This means that requests and responses, database calls, message queue calls, and so forth are what are instrumented. Your application's code, however, is not typically instrumented. To instrument your code, you'll need to use code-based instrumentation.
:::
::::

自动 instrumentation 免费告诉你的是库的边界：HTTP 请求进来了，DB 调用出去了。**它通常不会告诉你应用程序代码做出了什么判断。**要知道这一点，必须手动埋点。

而我需要的恰恰是后者。我要知道的不是“GA client 被调用了”，而是“这个博客的统计查询函数吞掉失败并返回了默认值”。

### 使用 AI 后发生了什么变化

那么 AI 改变了什么？先说明，我没有对照组，因为从未独自完成过同样的工作。因此，“一天”这个数字不应理解为绩效，只能说明开始动手的门槛降低了。在这个前提下，变化有两点。

一是**不必把上面的规则全部背下来**。过去数值异常时，光判断是我的代码有问题还是测量规则所致，就会耗掉半天。现在可以带着观察到的值，对照文档逐步缩小“这个指标在这些条件下如何计算”的范围。当然，不能照单全收。写这篇文章时，我就抓到过一次 AI 煞有介事地编造论文中不存在的句子。因此，所有作为依据的句子我都重新核对了原文。不过，**知道去哪里核实与把一切都背下来是两回事**，后者的负担确实减轻了。

另一点是共同梳理 instrumentation 位置。列出候选点、互相说明为什么应该放在那里，比独自完成快得多。但**决定什么算作失败，直到最后仍是我的责任。**接下来的故事，正是这项判断曾经出错的记录。

## 明明失败，却被报告成成功

最初的计划很简单：在统计 API route handler 的 `catch` 中加入错误报告。这样 GA 调用失败时就能知道。听起来很合理。

然而，我在本地 production build 中注入错误的 service account key 来故意触发失败时，**错误并没有抵达 route 的 `catch`。**下一层统计查询模块中的四个 `catch` block 先捕获了错误并返回默认值。最终响应如下。

```
HTTP 200 OK
{ "slug": "/260610", "views": 0 }
```

访客看到统计值为 0，server 却回答一切正常。这是没有 instrumentation 就无从得知的状态。（我曾在[错误处理](/251117)中讨论过这种层级结构，当时谈的是“应该在哪里捕获”，这次遇到的则是“已经捕获，却没人知道”。）

于是，我把 instrumentation 从 route 移到那四个位置，并加上 tag，以区分错误发生在哪条查询。之后，这些 tag 发挥了决定性作用。

### 观测的不对称

我原本只把它称为“失败看起来不像失败的情况”，查找后才发现它早已有准确名称：Microsoft 与 Azure 团队在 2017 年 HotOS 发表的论文 [Gray Failure: The Achilles' Heel of Cloud-Scale Systems](https://www.microsoft.com/en-us/research/wp-content/uploads/2017/06/paper-1.pdf)。

论文指出，云环境中的重大可用性事故通常不是彻底停摆。基于简单失败模型的恢复机制假设组件要么正常工作、要么完全停止；面对这类情况，它们并不合适，有时甚至会使问题恶化。论文这样界定其核心特征：

::::quote
:::translation
我们认为，gray failure 的一个关键特征是 differential observability：即便应用已经受到问题影响，系统的故障检测器也可能没有察觉。
:::

:::original
we argue that a key feature of gray failure is differential observability: that the system's failure detectors may not notice problems even when applications are afflicted by them.
:::
::::

Differential observability，也就是观测不对称。一个主体受到失败影响，另一个主体却无法察觉，而问题在于后者正是负责故障检测与恢复的一方。论文的例子很有启发性：如果请求处理模块停止，但 heartbeat 模块仍然存活，依赖 heartbeat 的错误处理模块会判断系统健康，请求服务的 client 却会判断它已经失败。

论文也给出了解决方向：应着力弥合不同组件对于“什么是失败”的认知差距。我把 instrumentation 从 route 下移一层，做的正是弥合这道差距。

## 随后，真正的故障被捕获了

接入 instrumentation 后出现的第一个真实 production issue，是故事的下一幕。

GA 调用在 **65.877 秒**后以 `DEADLINE_EXCEEDED` 失败。然而，因为前述结构，响应依旧是 200。首页采用动态渲染，统计区域通过流式传输输出，所以页面本身会立即出现；但**统计区域会保持加载状态超过 1 分钟，随后悄无声息地填入 0。**

深入调查后，我在所用 GA client 库的配置文件里发现了这一段。

```json
"RunReport": { "timeout_millis": 60000, "retry_params_name": "default" }
```

该库的默认 RPC timeout 是 60 秒，而我的代码在五个调用点都没有传入 timeout。当时，我把观测到的 65.877 秒理解为 60 秒加上连接和 load balancer 的 overhead。（这个解释后来受到动摇，下文还会谈到。）

我由此认识到，这不是只有我会犯的错误，而是早已被广泛警告的一类错误。Google SRE 团队的 Gráinne Sheerin 在 [gRPC 官方博客的 deadline 文章](https://grpc.io/blog/deadlines/)中，标题下第一句就是“TL;DR: Always set a deadline”。文章解释，不设置 deadline 时，所有进行中的请求都可能占用资源直至最大 timeout，进而耗尽内存、增加延迟，最坏情况下还会导致进程终止。我使用的 GA client 同样基于 gRPC；文档早已警告过相同原理，只是我没有在调用点遵守。

修复方法是将 timeout 固定为 5 秒，并传给所有五个调用点。随后，我搭建了一个不响应的本地 TCP server，进行了确定性复现。

| 条件 | 经过时间 | 错误消息 |
|---|---|---|
| 未指定 timeout（修复前） | **60.04 秒** | `Deadline exceeded after 60.000s` |
| `timeout: 5000`（修复后） | **5.00 秒** | `Deadline exceeded after 5.000s` |

数字完全按说明变化。拿到这张表后，我才可以说，至少已经确认 timeout 配置确实抵达了代码。（此前只能猜测“应该是因为没有 timeout”。不过，后面会看到，这并不等于确认了 production 中的原因。）

还有一点：数字 5 本身并没有依据。我没有测量 GA 正常时的响应延迟分布，因此 5 秒实际上是任意选择。不过，判断方向有据可循。Google SRE 一书在[第 3 章 Embracing Risk](https://sre.google/sre-book/embracing-risk/)中指出，100%绝不是正确的可靠性目标：它不但无法实现，而且通常超过用户想要或能够察觉的程度。在这个博客里，访客数只是附加信息。与其准确取得数值，不如尽快放弃并显示默认值，这对访客体验更好。这相当于决定不把可靠性目标设为 100%。

## 以为修好后，我又测了一遍

到这里，原本应该是本文的结尾：找到了原因，完成了复现，也进行了修复。

但写作时，我习惯性地再次打开 issue 列表。包含修复 commit 的 release 中，同一类 `DEADLINE_EXCEEDED` 已积累了一百多条，最近一条就在几小时前。

我取出最近 100 条，查看报告时间的分布。需要强调，这个值不是 GA 实际响应所花的时间，而是从设置 deadline 到 timer 真正触发之间的 wall-clock time（实际经过时间）。这个区别在后文很重要。

![修复 timeout 后上报的 100 条 DEADLINE_EXCEEDED 的报告时间分布](2.png?w=720)

可以这样解读：**下限得到了遵守。**没有一次在 5 秒内结束，最短为 5.16 秒。与未设置上限时 60 秒的复现值相比，5 秒配置确实抵达了代码。但上方数值最高达到 8 分 24 秒，中位数为 61 秒。更奇怪的是，数值没有集中在任何区间。如果延迟确由 GA 缓慢造成，它们应该堆积在上限附近，事实却并非如此。

Tag 提供了更多信息。100 条记录中只有 `stats` 和 `popular` 两种 tag，而且大多成对出现。这两条路径有一个共同点：**它们都是位于一小时缓存之后的重新验证路径。**相比之下，另外两条不经过缓存、收到请求后当场调用 GA 的路径（`page`、`pages`）在这 100 条里一次都没有出现。

这很重要，因为它说明失败并非发生在处理访客请求期间，而是**只发生在响应结束后重新填充缓存的任务中**。

这项观察也动摇了上一节中的一句话。我说统计区域会保持加载超过 1 分钟；但如果失败只出现在响应后的路径，访客也许根本没有等待那么久。缓存为空时的首次请求可能不同，但现有数据无法区分两种情况。又有一句话是在没有测量的情况下写下的。

还有一个疑点。上一节中，我把 65.877 秒理解为 60 秒 timeout 加上 overhead；重新打开该事件的 overhead 项目后，却发现总共只有约 2 毫秒。现在看来，当时的解释同样依据薄弱。那时也可能存在同类的时间膨胀。

我目前的假设如下。这个博客运行在 serverless 函数上，而 serverless 函数发送响应后，执行环境会冻结直至下一次调用。若 timer 也在这期间停止，并在函数苏醒时延迟触发，按 wall-clock time 记录的数值就可能被放大，而不代表实际等待时间。这样既能解释下限精确贴近 5 秒，也能解释上方数值没有集中区间，同时还符合“失败只发生在响应后任务中”的观察。

不过，这里还要再谨慎一次：**分布不违背假设，与分布支持假设并不是一回事。**timer 延迟触发有多种可能。除了 serverless 冻结，还可能是繁重渲染占用了 event loop，或 container 限制了 CPU。三者都会产生与当前所见形状相同的分布，因此这张图无法缩小候选范围。

我也保留着另一个解释。库的设置中，包含 retry 在内的总预算是 600 秒，而观测到的最大值 504 秒位于其中。不过，这个 method 的可 retry 状态码列表为空，按理不会走那条路径。无论哪种解释，**目前都只是尚未验证的假设。**选择验证方法时也有陷阱。我最先想到记录调用前后的时间，但这得不到答案：即使函数冻结，wall-clock time 仍会流逝，只会再次生成已有数字。真正能区分情况的是**同一区间的 CPU 使用时间**。如果 wall-clock time 过去 61 秒，而 CPU 时间几乎为 0，那段时间就不是在等待，而是在停止。下一步似乎应该测这个。

我特意保留本节是有原因的。我原以为已经修好了问题：做过复现，甚至做了表格，因此觉得结论确定无疑。但重新打开数据后，事实并非如此。接入 instrumentation 是一次性工作，可观测性则是不断重新测量。把二者混为一谈，就会犯下和我一样的错误。

再补充一点：上面的 issue 列表、tag 分布和时间值不是我打开 dashboard 查看后得到的，而是向 agent 询问的。Sentry 推出了[官方 MCP server](https://github.com/getsentry/sentry-mcp)，接入后可以直接在编辑器中查询 issue 和事件。这意味着，不用经过多次点击，就能在查看代码的位置同时展开 production issue。**降低的不只是接入 instrumentation 的成本，也包括打开并查看已积累数据的成本。**

## 接入与使用是两回事

走到这里，我又做了一件事：从头重读文档，看看这项工具究竟能用到什么程度。毕竟，本次调查中起决定作用的最终只是一枚 tag，而它只是我接入 instrumentation 时顺手加上的。随手之举都有如此价值，那些有意启用的功能又能回答什么？

![Sentry 能回答的问题层级，以及本博客已启用的范围](3.png?w=720)

**Release 与 commit**是第一块。这个博客会把部署 commit hash 附到 release 上，所以我知道问题从哪次部署开始。再往前一步，可以把 commit 列表一并上传到 release，从而启用 [suspect commits](https://docs.sentry.io/product/issues/suspect-commits/)。它会针对 stack trace 中每个应用 frame，查看对应文件与行号的 blame 信息；若最新 commit 在 1 年以内，就将其列为嫌疑对象，还会建议把 commit 作者设为负责人，甚至自动分配。[将 commit 关联到 release](https://docs.sentry.io/product/releases/associate-commits/)后，commit 消息中的 issue ID 有时还能让该 issue 在该 release 中被标记为已解决。博客已经上传 sourcemap，算是具备了一半条件，但还未设置 commit 关联。

**归属规则**对个人博客用处不大，结构却很有趣。[文档](https://docs.sentry.io/product/issues/ownership-rules/)显示，它可以用 Unix glob 匹配文件路径、模块、请求 URL 或特定 tag 值，再指定负责人或团队，例如 `path:src/api/*` 归后端团队。我第一次看到时想到的是，这不是告警路由功能，而是**把所有权写成代码的机制**。如果每个 issue 出现时都由人临时决定谁来看，忙碌的日子里就会无人查看。

**Tracing**回答的是另一类问题。[Sentry 文档](https://docs.sentry.io/concepts/key-terms/tracing/)把 trace 定义为应用产生的一组相互关联的事件与操作记录，把 span 定义为一个有名称与时长的操作。沿着一次请求跨越多个服务、数据库和函数，可以看到**每一段花费了多少时间**。错误报告回答“什么坏了”，tracing 则回答“时间消失在哪里”。上一节卡住我的正是后一个问题。要区分报告的经过时间是否是真实等待时间，就需要调用区间的起点和终点。为了节约成本，这个博客只采集 10%的 trace 样本，此刻我开始遗憾这个决定。

而**定时任务 monitor**是最契合本文主旨的功能。错误报告只能捕获发生过的事，无法捕获没有发生的事。Cron monitor 会在任务开始时报告正在进行，并在结束时报告成功或失败，关键是第三种状态。[文档](https://docs.sentry.io/product/crons/job-monitoring/)把预定时间未收到信号的情况单独归类为 missed execution，包括 scheduler 配置错误或任务根本没有启动。

这对我并非别人的故事。博客每周一会自动收集 Search Console 数据，后面将介绍的一整层可观测性都建立在这项任务之上。但如果某周它悄无声息地没有运行，我目前无从得知。它不是失败，而是**什么都没有发生**，所以不会产生错误。收集可观测性数据的装置本身反而处于盲区。

总结来说，接入工具一天即可完成，但扩展工具能够回答的问题仍是持续的工作。要启用哪一层，也不是浏览功能列表就能决定。**必须先定义什么算作失败，才能知道需要哪一层。**对这个博客而言，一旦承认“每周采集没有运行”属于失败，就多出了一层需要开启的能力。

## 当选项没有完成文档暗示的工作

还有一个性质稍有不同的旁支案例值得记录。

上传 sourcemap 后，我需要从 build 产物中删除 `.map` 文件，原因是体积。server sourcemap 达到 **57MB**，比 server JS（15MB）还大；若保留，它们会全部进入部署函数的 bundle。正好有一个选项能在上传后删除 sourcemap，于是我将它开启。

然而实测发现，上传结束后 server `.map` 文件仍完整保留着 57MB。该选项只删除静态产物目录，却不触碰真正占用空间的 server 目录。最终，我改为直接指定删除路径。

出于同样原因，我也改成有条件地保留上传日志。如果日志始终关闭，token 过期时整个上传都可能静默失败，而在下一次看到无法阅读的 stack trace 前，不会有人察觉。

这不是故障检测问题，而是名称与实际行为范围不一致的问题，因此我不把它归为 gray failure。但教训指向同一方向：**阅读文档并开启选项，与确认选项完成了预期工作，是两回事。**

## 错误并非唯一的观测对象

以上是稳定性这一条线。但妥善使用可观测性信息的价值并不止于捕获故障。现在转向开头提到的另一条线：理解用户。

OpenTelemetry 文档对可靠性的定义很好地衔接了这种转变：可靠性回答“服务是否在做用户期待的事”。基准不是 server 指标，而是**用户的期待**。因此，我们也必须测量用户实际经历了什么。

这个博客最终形成了三层观测。

![本博客的三层可观测性结构：错误、感知性能与搜索行为](4.png?w=720)

三层各自回答不同的问题：第一层回答什么坏了，第二层回答访客等了多久，第三层回答访客最初通过什么搜索词进入。

第二层有一项重要判断。测量性能可以在受控环境中打开页面，也可以观察所有真实访客。web.dev 把前者称为 lab data、后者称为 field data，并在[说明二者差异的文档](https://web.dev/articles/lab-and-field-data-differences)中建议，当两者都有时，应使用 field data 来确定优先级，因为它代表真实用户的经历。Lighthouse 分数很好，真实访客的分布也可能不同。因此，这个博客没有止步于评分，而是把真实用户数据发送到 GA4。

基线来自 [web.dev 的 Web Vitals 文档](https://web.dev/articles/vitals)：LCP 不超过 2.5 秒，INP 不超过 200 毫秒，CLS 不超过 0.1；判断时将移动端和桌面端分开，查看页面加载的第 75 百分位数。也就是说，我们看的不是平均值，而是较慢的 25%所越过的界线。（理解这个标准后，我才意识到平均值会把慢速用户整个抹去。）

### 排名下降，点击却增加了

在第三层搜索数据中，我的预期又一次被推翻。

博客会定期收集 Search Console 数据，比较最近 28 天与此前 28 天。在长期积累的数据里，一篇旧文章引起了我的注意。

![Search Console 中某篇文章的 28 天对比：曝光和排名变差，点击与点击率却大幅上升](5.png?w=720)

曝光减少了 11%，平均排名从 8.9 位降至 11.6 位。只看这两个指标，文章表现变差了。但点击从 2 次增加到 13 次，点击率从 0.87%升至 6.37%。

坦诚地说，应该先给这个故事降降温。熟悉搜索数据的人并不陌生这种模式。平均排名是按曝光加权的平均值；如果排名靠前但无人点击的曝光减少，平均排名就会下降，而点击率会机械性上升。也就是说，可能只是搜索词构成变化，却看起来像一次逆转。而且，增加的绝对数量只是 28 天内 11 次点击，很小。

即便如此，仍有事实留下：进入这篇文章的人确实增加了，如果只看曝光与排名，我不会知道。这个数字带给我的不是关于某篇文章的结论，而是**选择什么作为指标会颠倒结论**。把排名当作成果，这篇文章就需要修改；把点击当作成果，它就表现良好。这与上一节的可靠性定义是同一件事：把基准放在用户侧，看到的东西会改变。

我长期在博客中修改标题与描述，也就是根据真实搜索词重写展示在结果页中的文案。这些数据并不能证明那项工作的效果。排名下降而点击率上升，完全可能有季节性、搜索词构成变化等其他原因。但**如果没有测量，我甚至不会知道发生过这种方向的变化**。

### 放弃 79KB 的决定

讲三层结构时，不能漏掉我没有加入浏览器 instrumentation 的决定。

我也想开启 client 错误 monitoring。一直看不到只在浏览器中发生的错误，让我很在意。于是我开启功能并实测 bundle。以下是在 clean build 下比较 client JS gzip 总量的结果。

| 配置 | client JS (gzip) | 增量 |
|---|---|---|
| 未启用 | 181.6 KB | 基准 |
| **仅 server（当前）** | **182.3 KB** | **+0.7 KB** |
| 包含 client | 260.4 KB | +78.8 KB |

server instrumentation 几乎免费，浏览器 instrumentation 却需要 78.8KB。我也尝试过 bundle 优化选项，数值依旧不变。降低 client 成本的唯一方法，是完全不创建浏览器初始化文件。

现在回看，这次测量也有缺陷。开启选项后一字节都没减少，或许正说明选项没有生效，只是当时我只顾着解读结论。此外，这个数值是全部静态产物的总和，与单个访客实际下载的量也不同。因此，准确说法不是“浏览器可观测性占 79KB”，而是**“在我的配置中，没能把它降到更低”**。

这次接入的目的，是捕获 server 中静默失败的调用，而这部分没有成本。对这个博客来说，加载性能既是用户体验，也是获得搜索曝光的前提，所以我放弃了。值得玩味的是，这个决定与上一节逻辑相连：**如果按照用户期待定义可靠性，更细致的可观测性就并非总是正确选择。**可观测性本身也可能损害用户体验。

但这样写，又似乎与此前后悔把 trace 采样降到 10%相矛盾。两者都是因为成本减少可观测性，为什么一个后悔，另一个却是好决定？我后来整理出的标准是：**谁来支付成本**。减少 trace 采样节省的是我的账单，浏览器 instrumentation 增加的 78.8KB 消耗的则是访客的数据与时间。如果成本由我承担，通常多买一些更好；如果由用户承担，就必须问这种观测能为用户带回什么。

## 告警应该设在哪里？

接入 instrumentation 后，下一个问题立刻出现：该在哪里设置告警？

Rob Ewaschuk 在 Google SRE 早期撰写的[告警哲学文档](https://docs.google.com/document/d/199PqyG3UsyXlwieHaqbGiWVa8eMWi8zzAn0YfcApr8Q/mobilebasic)明确指出，呼叫人的告警必须紧急、重要、可操作且真实。它还建议针对症状而非原因告警，也就是 500 响应或用户可见错误等外在信号。

然而，这项原则与我的经历之间存在微妙张力。**我的症状并不是 500。**而是 200 加空统计。基于症状的告警预设失败会体现在 status code 上，前面谈到的 differential observability 恰恰会打破这项前提。

我并不认为应该反驳这项原则。相反，我得出的结论是，**“把什么定义为症状”才是这项工作真正困难的部分**。在这个博客中，症状不是 status code，而是“统计查询函数返回了默认值”；只有手动 instrumentation 才能让它成为症状。

同一文档还有一条值得牢记的建议：倾向于删除嘈杂告警，因为过度 monitoring 比 monitoring 不足更难解决。顺带一提，SRE 一书把**monitoring 本身失败**也列入应撰写 postmortem 的触发条件。为了不让 sourcemap 上传静默失败而有条件地保留日志，也是同一方向的判断。

## 为什么这件事在 AI 时代更加重要

读到这里，自然会有一个问题：这不就是要把可观测性工具接好吗？与 AI 有什么关系？

在我看来关系很大，原因有二。

第一，行业数据如此显示。由 Nathen Harvey 和 Derek DeBellis 领导的 [2025 DORA 报告](https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report)，基于对全球约 5 千名技术从业者的调查与超过 100 小时的定性数据。报告指出，采用 AI 与吞吐量、产品成果呈正相关，紧接着又写下这句话。

::::quote
:::translation
然而，采用 AI 与软件交付稳定性仍然持续呈负相关。
:::

:::original
However, AI adoption does continue to have a negative relationship with software delivery stability.
:::
::::

也就是说，它与交付稳定性依然负相关：速度变快的同时，波动也在增加。DORA 在[另一篇洞察文章](https://dora.dev/insights/balancing-ai-tensions/)中这样解释其机制：生成阶段节省的时间被重新分配给验证 overhead，而需要 review 的代码本身也在以更快速度产生。同一报告的总结最能表达这种处境：AI 不会修好团队，只会放大已有的一切。在没有可观测性的状态下只提高部署速度，放大的将是静默失败。

第二，也是对我冲击更大的一点：有**证据表明不能相信自己的体感**。METR 在 2025 年发布的[研究](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/)让 16 名经验丰富的开源开发者处理 246 个真实 issue，并针对每个 issue 随机决定是否允许使用 AI。

::::quote
:::translation
当开发者获准使用 AI 工具时，他们完成 issue 所需的时间会增加 19%……
:::

:::original
When developers are allowed to use AI tools, they take 19% longer to complete issues…
:::
::::

真正引人注目的是后面的内容。开发者事先预计 AI 会让自己快 24%，而且**即使实际经历了变慢，仍相信自己快了 20%。**我在写[AI 前端工程师](/260302)时也引用过这项研究，当时是在生产力讨论中阅读它。现在我的理解不同：这个数字不是“不应使用 AI”的依据，而是**体感与现实不一致的证据**。

如果不能相信体感，就只剩一种方法：测量。我感觉博客运行良好，测量后才发现 GA 调用卡住 1 分钟以上；我感觉已经修好，再测后才发现还没有。

## 可观测性的对象也在扩展

最后，我想记录一个近期趋势。

需要观测的对象本身正在变化。OpenTelemetry 正在一个[独立仓库](https://github.com/open-telemetry/semantic-conventions-genai)中整理生成式 AI 的 semantic convention，instrumentation 对象不仅包括 GenAI client，也包括 MCP（Model Context Protocol）调用。它仍处于早期阶段，schema 也在整理中，因此我认为还不到建议现在采用的时候。但方向很明确：当我们开始给 AI agent 接上工具，那些调用也会成为观测对象。我在 [AI agent 工具](/260529)中介绍过 MCP 的运行原理，也在 [Harness(Systems) Engineering](/260622)中谈过 eval；两者似乎正是在这里相遇。

错误 monitoring 服务也在朝同一方向发展。Sentry 推出了名为 [Seer](https://docs.sentry.io/product/ai-in-sentry/seer/) 的 AI debugging agent，据称会结合 issue 详情、trace、日志与 profiling context 查找根因，甚至创建修复 PR。我还没有认真使用它，也没有在文档中找到官方准确率数据，所以无法断言其性能。但它显然与前面通过 MCP 打开 issue 的体验方向一致：解释可观测性数据的成本正在下降。

## 结语

总结如下。

与 AI 一起工作，确实降低了接入可观测性工具的门槛。拖延已久的事情一天就完成了，理解浏览器如何生成指标等知识负担也不再像过去那么重。但我得到的并不只是工具。我发现，认为只捕获 route 的 `catch` 就够了、认为一个选项会完成其名称暗示的事、认为加上 timeout 就结束了，这些假设全都错误。而在重新测量之前，这些错误无从得知。

因此，我开始这样理解可观测性：它固然是故障发生时寻找原因的工具，但在那之前，它更是**测量我对系统的认知与现实之间差距的工具**。借用 Gray Failure 论文的表达，就是弥合不同主体对于“什么是失败”的认知差距。这道差距既存在于稳定性中，也存在于用户实际经历了什么之中。

生成越便宜，这道差距就越容易扩大，因为创造速度提高了，确认速度却未必同步提高。所以我现在认为，要更积极地使用 AI，需要的是可观测性。顺序看似颠倒，但既然能够快速创造，就必须也能快速确认。

当然，本文记录的是在个人博客这一小规模环境中得到的观察。流量和团队规模不同，判断也会不同；放弃 78.8KB 的决定在其他服务中也可能反过来做。这似乎不是一个有标准答案的领域。但至少可以说，感觉一切运行良好与实际运行良好并不相同，而要知道差别，只有测量。希望读者也能想一想：在自己的服务中，有什么是尚未测量就深信不疑的，又有什么是以为修好后便再也没有重新打开看过的。

:::ref
- [docs] [OpenTelemetry，可观测性入门](https://opentelemetry.io/docs/concepts/observability-primer/)
- [docs] [Google SRE Book，Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- [docs] [Google SRE Book，Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- [docs] [Google SRE Book，Postmortem Culture](https://sre.google/sre-book/postmortem-culture/)
- [docs] [web.dev，Interaction to Next Paint](https://web.dev/articles/inp)
- [article] [Martin Fowler，CircuitBreaker](https://martinfowler.com/bliki/CircuitBreaker.html)
:::
