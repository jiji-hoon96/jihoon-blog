---
emoji: 🧮
title: '浏览器的 CPU 与内存'
seoTitle: '浏览器主线程与内存观测：Long Task、LoAF、性能分析与内存测量 API'
date: '2026-09-15'
updatedAt: '2026-09-19'
categories: 观测 前端 浏览器
description: '梳理浏览器主线程与内存的观测方法。long task 与 TBT、LoAF、JS Self-Profiling、内存测量 API、crash report 分别能看到什么，我用这个博客的 Lighthouse 实测和响应头做了验证。'
keywords: '浏览器主线程, long task 50ms, Long Animation Frames API, Total Blocking Time, JS Self-Profiling API, Sentry 浏览器性能分析, measureUserAgentSpecificMemory, 浏览器内存泄漏'
locale: zh-CN
translationOf: '260915'
sourceHash: a6c2a00e7d6b4f9d29de83090c3f3b829145afc5d29df4b16fd073292c191961
---

这篇文章想聊聊如何观测浏览器的主线程和内存。

在[上一篇文章](/260914)里，我沿着网络、渲染和 Web Vitals，看了浏览器针对加载和交互留下的值。但顺着这些指标变差的原因往下追，通常会落到两个地方。要么是主线程忙于别的工作，没能及时处理输入和渲染；要么是内存不断累积，页面变慢，最终崩溃。

这两个领域比 Web Vitals 更难观测。API 大多只在 Chromium 中可用，有的 API 要改响应头才能开启，有的信号从结构上就无法被 JavaScript 接收。在[系列第一篇文章](/260913)的 Sentry 功能表里，我把浏览器 profiling 的判断推迟到了这篇文章，它的前提条件也在这里一并梳理。

我亲自确认过的，是两次 Lighthouse 运行、生产环境的响应头，以及已安装的 `web-vitals` 构建文件。先说结论：这个博客只通过 lab 测量看到了主线程的轮廓，而内存和 crash 则没有任何观测手段。

## 主线程繁忙意味着什么

浏览器的主线程把 JavaScript 执行、样式计算、布局和用户输入处理排成一列依次处理。一个任务运行期间，其他工作无法插入，所以如果用户在这时按下按钮，输入事件就要等到该任务结束。

划分这段等待的标准是 50ms。W3C 的 [Long Tasks API 规范](https://w3c.github.io/longtasks/)把占用主线程超过 50ms 的任务定义为 long task(引言部分写的是"50ms or more"，边界的表述略有不同)，并写明了依据。要在 100ms 内响应输入，输入那一刻正在运行的任务必须在 50ms 内结束，处理该输入的任务也必须在 50ms 内结束。

### TBT 累加 long task 的超出部分

如果只数个数，60ms 和 600ms 的任务就没有区别，所以 lab 工具使用 Total Blocking Time(TBT)。根据 web.dev 的 TBT 文章，单个 long task 的 blocking time 是超过 50ms 的那部分，TBT 则是 FCP 之后各个 long task 的 blocking time 之和。Lighthouse 默认只统计到 TTI(Time to Interactive)为止。

![主线程时间线上的五个任务中，超过 50ms 的三个任务的超出部分分别标为 200、40、105ms 的示意图](1.png?w=720)

(图片来源：[web.dev, Total Blocking Time (TBT)](https://web.dev/articles/tbt), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)，已将 SVG 转换为白色背景的 PNG)

黄色部分是每个任务的前 50ms，红色部分是 blocking time。在同一篇文章的例子中，任务执行时间总和是 560ms，但 TBT 是 345ms。短于 50ms 的任务无论出现得多频繁，都不会计入 TBT。

### TBT 无法替代 INP

TBT 是 lab 指标，而 Core Web Vitals 中的响应性指标是 INP。web.dev 的 [INP 文章](https://web.dev/articles/inp)划清了界限：在不做交互、只看加载的 lab 工具里，TBT 可以是合理的代理指标，但不是替代品。

因为 TBT 不知道用户什么时候按了什么。即使主线程被严重阻塞，只要用户在脚本执行完之后才按，INP 也可能很低。long task 拉长 INP 的路径不止一条。处理函数本身很长时，processing duration 会变长；随后的渲染很长时，presentation delay 会变长。其中与 TBT 最直接相关的路径，是按下那一刻正在运行的任务还剩多少时间，就把上一篇文章里讲过的 input delay 拉长多少。所以低 TBT 只能告诉你"加载期间主线程没有被严重阻塞"。实际输入被什么阻塞了，要在 field 中观察任务和帧才能知道。

## Long Tasks 与 Long Animation Frames

在 field 中观察主线程的浏览器 API 有两个：从 Chrome 58 就有的 Long Tasks API(`PerformanceLongTaskTiming`)，以及在 Chrome 123 中发布的 Long Animation Frames API(`PerformanceLongAnimationFrameTiming`，简称 LoAF)。两者都通过 :term[PerformanceObserver]{key="performance-observer"} 订阅。

### LoAF 是另一种选择，而不是取而代之

Chrome 团队的 LoAF 文章(下图来源)把 LoAF 介绍为 Long Tasks API 的"update"和"alternative"，并在 FAQ 中回答"at this time, there are no plans to deprecate the Long Tasks API"。在 MDN 的兼容性数据中，`PerformanceLongTaskTiming` 也没有 deprecated 标记，两个 API 都是 experimental，Firefox 和 Safari 都不支持。

之所以需要新 API，原因在于归因(attribution)。根据同一篇文章，Long Tasks API 的归因"at best only tells you the container"，也就是只能告诉你是顶层文档还是某个 iframe，却不会告诉你是哪个脚本花掉了时间。

LoAF 报告的 entry 不是单个任务，而是**渲染更新被延迟超过 50ms 的帧**。即使是多个短任务加上渲染合起来超过了阈值，也能被捕捉到。

### blockingDuration 与脚本归因

LoAF 中与 INP 直接相关的字段是 `blockingDuration`。它累加帧内超过 50ms 的任务的超出部分，但对最长的那个任务，会把最后的渲染时间也算进去。在文章的例子中，55ms、65ms 两个任务之后接着 20ms 的渲染时，`duration` 约为 140ms，`blockingDuration` 为 (55 - 50) + (65 + 20 - 50) = 40ms。可以说是把 TBT 的思路从加载阶段搬到了整个页面的所有帧上。

![页面时间线上有多个 long frame，其中与被选为 INP 的交互重叠的那一帧用虚线突出显示的示意图](2.png?w=720)

(图片来源：[Chrome for Developers, Long Animation Frames API](https://developer.chrome.com/docs/web-platform/long-animation-frames), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)，已缩小尺寸)

页面上会产生很多 long frame，但能解释 INP 数值的，是与 INP 交互重叠的那一帧。该帧的 `scripts` 数组里，对每个执行超过 5ms 的脚本都记录了调用位置、源 URL 和执行时间。Long Tasks API 所缺少的"是谁"，在这里出现了。

不过，脚本归因只覆盖主线程和 same-origin iframe。cross-origin iframe、worker 和浏览器扩展的代码即使拉长了帧，也不会留下名字。这个博客文章页里 utteranc.es 评论 iframe 内部的工作，即使用 LoAF 也无法归因。

### 这个博客没有采集 LoAF

也有不直接订阅就能使用 LoAF 的方法。`web-vitals` 在 [v4.0.0(2024-05-13) 的 changelog](https://github.com/GoogleChrome/web-vitals/blob/main/CHANGELOG.md) 中加入了"Add INP breakdown timings and LoAF attribution"，之后又加入了最长脚本(`longestScript`)以及脚本、布局、绘制时间的合计。但这些只来自 attribution 构建(`web-vitals/attribution`)。

正如上一篇文章所述，这个博客的 `src/components/WebVitalsReporter.tsx` 通过 `import('web-vitals')` 使用 standard 构建。**它采集 INP 的值，但不采集这个 INP 被哪个脚本阻塞。** 在已安装的 `web-vitals@6.2.1` 中，`long-animation-frame` 这个字符串在 `dist/web-vitals.js` 中出现 0 次，在 `dist/web-vitals.attribution.js` 中出现 1 次。standard 构建根本不会注册 LoAF observer。(这个事实在内存一节会再次变得重要)

根据 [README](https://github.com/GoogleChrome/web-vitals#attribution-build)，attribution 构建在 brotli 压缩后大约大 1.5K，但让我犹豫的与其说是体积，不如说是数据的去向。我没有确认以这个博客的流量，GA4 里能否得到有意义的按脚本分布，所以决定在扩大采集之前先看 lab。

## 这个博客里捕获到的 long task

于是我在 lab 里跑了一个文章页面。Lighthouse 12.8.2(`npx lighthouse@12`)，本地 Chrome headless，默认 mobile 设备类型，simulated throttling(RTT 150ms，1638.4kbps，CPU 4 倍降速)，目标是 `https://hooninedev.com/260914`，于 2026-09-16 间隔 25 分钟运行了两次。

| 项目 | 第 1 次 (08:46:15Z) | 第 2 次 (09:11:01Z) |
|---|---|---|
| Performance score | 0.92 | 0.93 |
| FCP、LCP | 2501ms | 2415ms |
| TBT | 40ms | 47ms |
| TTI | 5489ms | 5375ms |
| 主线程工作总计 | 916ms | 1035ms |
| 其中 Style & Layout | 343ms | 344ms |
| 其中 Script Evaluation | 254ms | 292ms |

两次的 LCP 元素都不是图片，而是第一段(`div#post-content > p`)，所以 FCP 和 LCP 相同，主线程上占比最大的项目也不是脚本，而是 Style & Layout。

![两次 Lighthouse 运行中，文档、Next 代码块、两个 gtag 共四个 long task 以相同顺序出现的时间线图表](3.png?w=720)

两次都是四个 long task，顺序也相同：文档任务(104ms、122ms)，一个 Next.js 代码块(68ms、69ms)，以及 `googletagmanager.com/gtag/js` 的两个任务(第 1 次为 66ms 和 56ms，第 2 次为 69ms 和 59ms)。时间点是 Lighthouse 假设 CPU 4 倍降速后计算出的时间轴，不应读作真实设备上的绝对时间。

TBT 与 FCP 之后三个任务的超出部分完全吻合。第 1 次是 (68 - 50) + (66 - 50) + (56 - 50) = 40ms，第 2 次是 (69 - 50) + (69 - 50) + (59 - 50) = 47ms。低 TBT 的意思不是"没有 long task"，而是"FCP 之后的超出部分很小"。

接下来是 gtag 的位置。根布局(`src/app/[lang]/layout.tsx`)通过 `next/script` 的 `strategy="afterInteractive"` 加载 gtag。因此两个 gtag 任务在 LCP 之后 2.8 秒多一点连续执行，最后一个任务结束的时间点被记为 TTI。比起加载指标，这个位置更可能与**页面刚显示出来时按下的输入的 input delay** 重叠。不过这是在 lab 时间轴上的推论，真实用户当时按了什么，这个博客并没有采集。

而且这只是 n=2 的 lab 测量。同样的形态再次出现，只是说明这个结构并非偶然的弱证据，无法代替真实用户的设备和网络分布。

那么，怎样才能知道 gtag 那个 66ms 的任务里是哪个函数花掉了时间？

## 采样分析器

函数级别的答案由分析器(profiler)给出。JS Self-Profiling API 想做的，就是在真实用户的浏览器里完成 DevTools Performance 面板的工作。

### JS Self-Profiling API

WICG 的 [JS Self-Profiling 规范](https://wicg.github.io/js-self-profiling/)定义了让 Web 应用控制浏览器采样分析器的 API。示例是 `new Profiler({ sampleInterval: 10, maxBufferSize: 10000 })`，意思是每 10ms 记录一次调用栈，最多收集 1 万个样本。它不对每次调用做埋点，而是进行:term[采样]{key="sampling"}，所以开销小，但可能漏掉比间隔更短的调用。规范会从结果中剔除未经 CORS 允许的 cross-origin 脚本的栈帧。像 gtag 这样来自其他 origin 的脚本，其内部即使用这个 API 也可能看不到。

这份规范的状态不是标准轨道，而是 WICG Community Group Draft。根据 MDN 的兼容性数据，`Profiler` 从 Chrome 94 起只在 Chromium 系浏览器中可用。而且正如 [MDN](https://developer.mozilla.org/en-US/docs/Web/API/JS_Self-Profiling_API) 所写，文档必须随附包含 `js-profiling` 的 Document Policy 一起响应。也就是说，HTML 响应里需要有 `Document-Policy: js-profiling` 响应头。

### 开启响应头本身也有代价

调研过程中，我遇到了文档之间互相矛盾的地方。2026 年 1 月合入规范仓库的一项变更把 `js-profiling` 标为 **deprecated**，并改为定义 `js-profiling-mode`(`eager`、`lazy`)。实现应当为了向后兼容而支持 `js-profiling`(SHOULD)，但也可以将其移除(MAY)。

根据规范，`eager`(与原先的 `js-profiling` 含义相同)会在加载过程中预先准备分析基础设施，所以即使不使用分析器，也可能影响 FCP 和 LCP。`lazy` 会把准备工作推迟到第一次创建 `Profiler` 时，但如果这次初始化发生在处理交互的过程中，就可能影响 INP。这等于规范承认了**为测量而开启的响应头，可能给被测量的指标带来代价**。另一方面，截至 2026-09-16 查阅时，Sentry 的文档仍然只介绍 `Document-Policy: js-profiling`。ChromeStatus 上 `js-profiling-mode` 条目的状态是 Proposed，也没有发布里程碑，但我没有直接确认 Chrome 是否实现了它，所以没法断言现在应该用哪个响应头。

### Sentry 浏览器 profiling 的前提条件

Sentry 的 [JavaScript profiling 文档](https://docs.sentry.io/platforms/javascript/profiling/)把条件写得很清楚。浏览器 profiling 处于 beta 阶段，因为使用 JS Self-Profiling API，所以只在 Chrome、Edge 等 Chromium 系浏览器中可用，并且服务器必须发送 `Document-Policy: js-profiling`。文档明确指出，如果托管环境无法修改响应头，就无法使用。SDK 需要 `@sentry/browser` 10.27.0 及以上版本，使用 `browserProfilingIntegration()` 和以会话为单位的比例 `profileSessionSampleRate`。FAQ 回答说，只从 Chrome 用户那里收到 profile 是正常的。也就是说，不能把收集到的 profile 当作全体用户的代表。

计费以 [UI Profile Hours](https://docs.sentry.io/pricing/quotas/manage-ui-profile-hours/) 为单位。包体积方面，按 `sentry-javascript` 仓库 `.size-limit.js`(develop 分支，2026-09-16 查阅)中的 gzip 上限值计算，Tracing 组合为 56 KB，加上 Profiling 则为 59 KB。

### 这个博客里有两层关闭

第一，没有浏览器 SDK。这个博客的 Sentry 是纯服务端配置，没有 `src/instrumentation-client.ts`。这是根据 2026-08-04 的实测，即客户端 SDK 会让 client JS 在 gzip 下增加 78.8 KB，而做出的决定(上一篇文章讲过)。

第二，没有响应头。2026-09-16T09:10:42Z 用 `curl -sI https://hooninedev.com/260914` 确认的响应里没有 `document-policy`。这个仓库给 HTML 添加的响应头，是 `next.config.ts` 的 `headers()` 里的 `Content-Security-Policy`、`X-Frame-Options`、`Referrer-Policy`、`Permissions-Policy` 这四个，响应中也能确认到这四个。(我已经在这个仓库里实测过，`public/_headers` 只作用于静态资源，碰不到 HTML)

所以，在这个博客里开启浏览器 profiling 并不是改一个选项的事。它意味着推翻 78.8KB 的决定，给所有 HTML 加上响应头，再重新测量这个响应头给 FCP、LCP、INP 带来的代价。目前还没有证据表明，前面看到的两个 gtag 任务是值得付出这种代价的问题。

## 测量内存意味着什么

如果说 CPU 关心的是"现在是什么在阻塞"，那么内存关心的是"随着时间推移什么在累积"，所以需要观察一个会话内的变化。然而，从 field 获取这个值的途径比 CPU 更窄。

### performance.memory 是非标准的

`performance.memory` 在 [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory) 中是"non-standard and legacy"属性，兼容性数据里标注为 deprecated、仅限 Chromium。连"堆"究竟指什么都还没有标准化。

### measureUserAgentSpecificMemory 要求隔离

替代方案是 `performance.measureUserAgentSpecificMemory()`。web.dev 的[页面内存测量文章](https://web.dev/articles/monitor-total-page-memory-usage)说，它在垃圾回收期间测量，所以结果会延迟返回，并建议以平均 5 分钟的随机间隔调用。它从 Chrome 89 起只在 Chromium 系浏览器中受支持。

决定性的条件在别处。[MDN](https://developer.mozilla.org/en-US/docs/Web/API/Performance/measureUserAgentSpecificMemory) 明确规定，文档必须是 secure context，并且是 **cross-origin isolated**。也就是说，要通过 `Cross-Origin-Opener-Policy` 和 `Cross-Origin-Embedder-Policy` 响应头实现隔离，使 `window.crossOriginIsolated` 为 `true`。

前面的 `curl` 响应里没有这两个响应头，所以在这个博客里无法调用这个 API。我估计开启它的代价也会比 profiling 响应头更大。开启 COEP 后，页面加载的 cross-origin 资源必须遵守该策略，而这个博客加载了 gtag 脚本和 utteranc.es iframe。这两者是否真的会失效，我没有实际开启来确认。

field 行不通时，剩下的就是用 DevTools Memory 面板在本地复现。Chrome 团队的[内存问题排查文档](https://developer.chrome.com/docs/devtools/memory-problems)把 detached DOM 树列为内存泄漏的常见原因，可以用 Heap snapshot 来查找，不过我并没有在这个博客上做过。

### 观测代码造成的泄漏

在内存这个话题里，我觉得最有意思的案例来自一个观测库。`web-vitals` v6.2.2(2026-09-14)changelog 的第一行是"Cap pending LoAFs to avoid memory leak"。

根据 [issue #795](https://github.com/GoogleChrome/web-vitals/issues/795) 的描述，attribution 构建的 `onINP` 为了找出与 INP 重叠的 LoAF，会把 LoAF entry 收集到 `pendingLoAFs` 中。作为清理基准的"最近处理的事件"时间点，只有在有用户输入时才会向前推进，所以在视频播放这类长时间没有输入的页面上，LoAF 只会不断堆积。[修复 PR #796](https://github.com/GoogleChrome/web-vitals/pull/796) 把事件分组列表中已经在用的上限 `MAX_PENDING_FRAMES`(10)也应用到 LoAF 列表上，使得除了与 INP 候选重叠的帧之外，只保留最近 10 个。

这个博客用的是 6.2.1，那它有没有这个泄漏？没有。这个 PR 修改的源文件只有 `src/attribution/onINP.ts` 一个(其余是测试文件)，而且如前所述，这个博客的 standard 构建里没有 LoAF observer。**不采集 LoAF attribution 的同一个决定，也恰好堵住了这个泄漏的路径。** 但这并不意味着结论是"那就不要采集"。重点是，观测代码的代价有时要到 changelog 里才会暴露，而如果换成 attribution 构建，前提是使用 6.2.2 及以上版本。

## 当浏览器崩溃时

内存耗尽，页面就会崩溃。这时留下的信号是 Reporting API 的 crash report。

### crash report 的形态

WICG 的 [Crash Reporting 规范](https://wicg.github.io/crash-reporting/)定义了 report type `"crash"`，并自己说明它既不是 W3C 标准，也不在标准轨道上。body 的 `reason` 包括表示页面耗尽内存的 `oom`，以及表示因无响应而被终止的 `unresponsive`。投递时，如果 `Reporting-Endpoints` 响应头里有 `crash-reporting` 端点就发往那里，否则发往 `default`，两者都没有就不发送。

### JavaScript 无法接收

这个信号的核心性质，就在规范里的一句话中。

> Crash reports are not observable to JavaScript, as the page which would receive them is, by definition, not able to.

本应接收报告的页面已经因为这次 crash 而崩溃，所以按定义，JavaScript 没有办法观察到这份报告。浏览器只是在页面之外向服务器端点发起 POST。

这对浏览器 SDK 意味着什么，可以从代码中看出。`sentry-javascript` 的 [`reportingObserverIntegration` 源码](https://github.com/getsentry/sentry-javascript/blob/develop/packages/browser/src/integrations/reportingobserver.ts)在默认订阅类型中放了 `'crash'`、`'deprecation'`、`'intervention'`，还有 `report.type === 'crash'` 的分支。但这个集成使用的是页面内的 `ReportingObserver`，所以如果规范成立，在真实的 OOM crash 中这个分支就没有被执行的路径。不过这是我从规范推导出的推论，并没有真的触发 crash 来验证。

那在服务端，Sentry 能否成为 `Reporting-Endpoints` 的目标？请求这个功能的 [getsentry/sentry#38940](https://github.com/getsentry/sentry/issues/38940) 于 2022-09-15 开启，到 2026-09-16 查阅时仍是 open 状态。目前能用的办法，只到自己搭一个端点再转发给 Sentry 为止。

### 这个博客的 crash 不会被记录

前面的 `curl` 响应里也没有 `reporting-endpoints` 响应头。按照规范的投递规则，没有端点就不会发送报告。即使有人在阅读这个博客时标签页因内存不足而崩溃，这件事也不会在任何地方留下记录。这与 Sentry 是否支持无关，原因是我没有声明接收的地方。

这是用来阅读长篇静态文章的页面，所以我暂时不打算改动。只是想记下一点："没有 crash"和"没有观测 crash 的手段"，在仪表盘上是一模一样的空白画面。

## 有条件才能打开的观测

浏览器 CPU 与内存的观测，大多**要满足条件才能打开**。long task 和 LoAF 只来自 Chromium，LoAF 的脚本归因看不到 cross-origin iframe。采样分析器要求 `Document-Policy` 响应头，而这个响应头的名称在规范中正在变化，响应头本身也可能给指标带来代价。内存测量 API 要求 cross-origin isolation，crash report 则要求 JavaScript 之外的服务器端点。

这个博客一个条件都没有开启。这种状态不是放任不管，而是 78.8KB 的决定、standard 构建、不增加响应头的选择累积起来的结果，其中 standard 构建还顺带避开了 web-vitals 的 LoAF 泄漏。扩大观测本身也是把有代价的代码放进页面，这一点在这个领域里尤其清楚。

这篇文章里的数字全部来自 lab 或我在本地的确认。从真实用户那里收集的 field data 离开浏览器之后，在 CrUX、Search Console 和搜索中有什么意义，我打算在[下一篇文章](/260916)里继续讲。

:::ref
- [docs] [MDN, PerformanceLongAnimationFrameTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongAnimationFrameTiming)
- [docs] [web.dev, Optimize Interaction to Next Paint](https://web.dev/articles/optimize-inp)
:::
