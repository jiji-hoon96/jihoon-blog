---
emoji: 🔭
title: '浏览器可观测性'
seoTitle: '前端浏览器可观测性：PerformanceObserver、Web Vitals 与 RUM'
date: '2026-09-14'
categories: 观测 前端 浏览器 RUM
description: '从 Performance Timeline 和 Web Vitals 的计算原理到 RUM 的设计标准，分三个阶段梳理浏览器可观测性。文中还记录了我在自己的博客上接入 web-vitals 采集、并放弃 79KB 客户端埋点时实测得到的依据。'
keywords: '前端可观测性, 浏览器性能监控, PerformanceObserver 用法, Web Vitals 测量, RUM 搭建, LCP INP CLS 优化, web-vitals GA4 上报, Soft Navigations API'
locale: zh-CN
translationOf: '260914'
sourceHash: 8777b7334d208ef6328ddb366d187cd5dd7af88a5c4e5368606f2ae46b2e2afb
---

这篇文章想聊聊浏览器可观测性。

我在给这个博客加上直接采集访客体感性能的代码时，发现自己自以为熟悉的浏览器端知识比想象中浅。打开 DevTools 的 Performance 面板、运行 Lighthouse，这些事我做了很久。但要持续采集真实用户经历了什么，问题就变了。你必须知道浏览器在什么时候生成哪些值、这些值包含什么，以及在哪些条件下它们为什么根本不会被生成。

这些知识并不集中在一份文档里。它们分散在 `Performance Timeline`、`Navigation Timing`、`Resource Timing`、`Paint Timing`、`Event Timing` 等多份规范中，Web Vitals 又在其上叠加了一套独立的计算规则。再加上 SPA 的页面切换、通过 :term[bfcache]{key="bfcache"} 恢复页面状态、后台标签页、iframe，同一个页面在不同工具里会得出不同的数字。(当数值与预期不符时，我耗时最久的地方就是分辨到底是网站慢，还是测量规则造成的)

因此这篇文章把观测范围按三个阶段逐步展开：浏览器留下的事件、用户体感到的体验、真实用户群体的分布。在这中间，我也会放上这个博客实际采集的值，以及反过来决定不扩大观测的一个决策。浏览器可观测性的深度不取决于用了多少 API。只有区分原材料、指标和分布，并在这个过程中把漏掉的用户和被扭曲的条件也记录下来，观测值才会变成可用于判断的信息。

## 浏览器留下的信号

网页打开后，浏览器会在内部生成多种 :term[PerformanceEntry]{key="performance-entry"}。W3C 的 [Performance Timeline](https://www.w3.org/TR/performance-timeline/) 是让这些条目可以在同一条时间轴上处理的公共基础。

重要的一点是，开发者不必像用秒表那样自己去打开始和结束的点。浏览器已经知道文档导航、资源请求、绘制、用户输入这些事件。前端观测的起点，就是读取这份内部记录。

| 观测对象 | 代表性 entry | 能回答的问题 |
|---|---|---|
| 文档导航 | `navigation` | 时间花在了 DNS、连接、TLS、响应、DOM 处理中的哪一段 |
| 图片、脚本、CSS | `resource` | 哪个资源慢了，缓存和传输大小是什么情况 |
| 画面呈现 | `paint`, `largest-contentful-paint` | 首屏和主要内容是什么时候可见的 |
| 布局变化 | `layout-shift` | 用户看到的画面是什么时候、因为什么移动的 |
| 用户输入 | `event` | 输入之后到浏览器绘制下一帧之间，延迟发生在哪里 |
| 长渲染任务 | `long-animation-frame` | 一帧之内哪些脚本和渲染阶段消耗了时间 |
| 应用自定义区间 | `mark`, `measure` | 服务自己定义的操作花了多长时间 |

看这张表就能发现，浏览器观测并不是简单地测页面加载时间。网络、主线程、渲染管线、用户输入都可以放到同一条时间轴上。

但每一个 entry 都不是现成的结论。它们更接近浏览器提供的原材料。

## 采集性能 entry

实时接收这些原材料的标准接口是 :term[PerformanceObserver]{key="performance-observer"}。

```ts
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    sendPerformanceEntry(entry)
  }
})

observer.observe({ type: 'resource', buffered: true })
```

代码很短，但里面藏着几个重要条件。

第一，正如 MDN 的 [`observe()` 文档](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver/observe)所说，`buffered` 必须和 `type` 搭配使用。它不能与一次接收多种类型的 `entryTypes` 同用。如果需要拿到初始脚本执行之前生成的 LCP 候选或资源记录，这个差别就决定了数据会不会丢。

第二，浏览器不支持的 entry 可能被悄悄忽略。因此采集端必须检查 `PerformanceObserver.supportedEntryTypes`。如果假设最新 Chrome 里能看到的值在所有 Safari 和 Firefox 上也会到达，就会把仪表盘上的空白区间误解成性能问题。

第三，entry 有缓冲区上限。观测代码启动得晚，或者应用请求的资源非常多时，较早的条目可能被挤出缓冲区。就像"没有发生错误"和"没有收到错误"是两回事一样，"没有 entry"和"entry 没有被生成"也必须区分。

观测代码本身同样运行在主线程上。如果在回调里序列化大对象并立刻发出网络请求，测量用户体验的代码就可能恶化用户体验。这就是为什么要把采集和上报分离、只归一化必要的属性、并设计好批量和采样。

## 网络时间的构成

"页面慢"这句话常常第一时间被翻译成网络问题。但只看 `duration` 很难区分原因。

`PerformanceNavigationTiming` 和 `PerformanceResourceTiming` 里包含了请求前后的多个边界。DNS 查询、TCP 连接、TLS 协商、请求发送、首字节、响应完成都可以分开看。还能确认浏览器是否经过了 Service Worker、传输大小和解码后大小差多少、资源是否阻塞了渲染。

这种区分会改变应对方式。

- `domainLookupEnd - domainLookupStart` 大，就看 DNS 这一层。
- `connectEnd - connectStart` 大，就看连接和 TLS。
- `responseStart - requestStart` 大，就同时怀疑服务器处理和网络往返。
- `responseEnd - responseStart` 大，就看响应大小和传输速度。
- `transferSize` 为 0，就确认缓存复用的可能性，但也要一并考虑 cross-origin 的公开限制和浏览器实现条件。

不过 cross-origin 资源的细分区间默认是被遮蔽的。正如 W3C 的 [Resource Timing 规范](https://www.w3.org/TR/resource-timing/)所说，只有提供方服务器通过 `Timing-Allow-Origin` 响应头允许，部分细分值才会暴露。即使 CDN 或外部图片看起来很慢，在浏览器里这些区间也可能显示为 0。

所以在 RUM 数据里，0 并不总是意味着快。它可能是因为权限而看不见的值。

## Web Vitals 的解读

:term[Web Vitals]{key="web-vitals"} 中包含的 LCP、INP、CLS，并不是浏览器简单记录一次的时间戳。它们是解读多个 entry 和页面生命周期后得出的以用户为中心的指标。

LCP 会在屏幕上可见的主要内容候选发生变化时不断更新。INP 观察页面生命周期内的点击、触摸、键盘交互，然后挑一个接近最慢值的作为代表值。交互超过 50 次时会剔除部分极端值，但在大多数页面上，最慢的那次交互就是 INP。CLS 不会把所有位移无限相加，而是在按固定时间间隔分组的会话窗口中选择最大的那个值。

自己计算并非不可能，但要把页面被隐藏或恢复的时刻也算进去、对齐所有边界条件，很难。Google 的 [`web-vitals`](https://github.com/GoogleChrome/web-vitals) 库并不是把浏览器 entry 原样转发的工具，而是在标准 API 之上应用这些生命周期处理和各指标计算规则的实现。

再往深一步，就会遇到只有分数还不够的问题。知道了 LCP 是 4 秒，但不知道是哪个元素、哪个资源造成了这个值，就找不到修复点。`web-vitals/attribution` 构建会补充更接近原因的信息，比如 LCP 元素、INP 的事件目标和处理区间、对 CLS 有贡献的元素。

也就是说，观测按下面三个阶段逐步加深。

1. 采集指标。
2. 找出慢用户和慢环境的分布。
3. 归因到造成指标的元素、脚本和请求。

只做第一阶段得到的是报表，走到第三阶段才会得到可以动手修复的信息。

## 实验室与真实用户

Lighthouse 和 DevTools 适合在受控条件下反复测量同一个页面。在部署代码前抓回归，或深入分析某个特定画像时很有用。但它们无法展示真实用户到底在什么设备、什么网络上做了哪些交互。

:term[RUM]{key="rum"}(Real User Monitoring) 在真实访客的浏览器里采集数值。Google 的 [Web Vitals 文档](https://web.dev/articles/vitals)建议在页面访问的第 75 百分位上评估 Core Web Vitals，并把移动端和桌面端分开看。因为一个平均值可能把慢用户群体抹掉。

尤其是 INP，必须有真实输入才能计算。没有用户的 Lighthouse 用 TBT 作为 INP 的代理指标。两者相关，但不是同一个值。

Chrome UX Report(CrUX) 也是 RUM，但性质与服务内部的 RUM 不同。[CrUX API](https://developer.chrome.com/docs/crux/api) 按页面或 origin 提供 Chrome 用户的聚合 field data。用来和行业基准比较很合适，但没法同时看到具体的某次发布、用户流程或应用状态。

反过来，自建 RUM 可以附加任何想要的上下文，但样本偏差和实现错误也要自己负责。广告拦截器挡掉采集请求、排除未同意的用户、某些浏览器不支持某个 API，被观测到的用户就会和全体用户不一样。

我的博客就是这个选择的一个小例子。这个博客里，一个叫 `WebVitalsReporter` 的客户端组件动态加载 `web-vitals`，测量 LCP、INP、CLS、FCP、TTFB，并作为一个名为 `web_vitals` 的单一事件发给 GA4。指标名用 `event_label` 区分，同时带上 `metric.id`，避免把同一页面生命周期内更新的值重复统计。GA4 事件的 value 是整数，所以 CLS 乘以 1000 后四舍五入。这是在已经运营的 GA4 上叠加的配置，没有单独的采集服务器。

诚实地记一笔：到目前为止，我用这套配置确认到的只是值确实被发送了这一步。专门的 RUM 产品默认就给的 p75 分布或慢页面排行，要想在 GA4 里看到，得另外搭一份探索报告，而那件事我还没做。也就是说，这一层是开着的，数据在积累，但读取它的那一侧还是空的。而且上面说的偏差它也原样继承。广告拦截器挡掉 GA 请求，那位访客就会从我的分布中消失。

两者并非谁对谁错，而是回答的问题不同。

- 部署前这次改动有没有变慢：lab data
- 真实用户的慢点在哪里：自建 RUM
- 在公开 Web 上这个 origin 处于什么水平：CrUX

选择自建 RUM 之后，下一个问题就是把什么算作一次页面体验。只有先定下这个边界，采集的值和上下文才能设计得前后一致。

## 变得模糊的页面边界

传统的 navigation 中，浏览器知道文档的开始和结束。SPA 的 client-side navigation 里，URL 和画面变了，文档却没有重新创建。从浏览器的视角看，它很容易只留下一段漫长的页面生命周期。

为了解决这个问题，各个 RUM 工具和框架一直在用自己的启发式规则。但每种实现对"新画面"的定义不同，难以互相比较。Chrome 团队通过 [Soft Navigations API](https://developer.chrome.com/docs/web-platform/soft-navigations)，把用户输入、URL 变化、画面更新捆在一起，推动由浏览器直接识别 soft navigation 的方向。

这个 API 从 2026 年 8 月发布的 Chrome 151 起默认提供。`web-vitals` 库也从 6.0 开始通过 `reportSoftNavs` 选项支持按 soft navigation 为单位上报指标。不过它目前只在 Chromium 系浏览器上工作，Firefox 和 Safari 没有对应实现，所以还不能立刻替换现有的 route 埋点。我的博客也是用 Next.js 的 client-side navigation 从文章列表进入文章的，在采集代码还基于 5.x 的那段时间里，这个切换并没有被算作单独的页面体验。写这篇文章时我升级到 6.2.1、开启 `reportSoftNavs` 之后，把无头 Chrome 接到生产环境，原样打开了发往 GA4 的请求。一次会话里发出了这些值。

| 指标 | 值 | `navigationType` |
|---|---|---|
| TTFB | 798ms | `navigate` |
| FCP | 1680ms | `navigate` |
| LCP | 1680ms | `navigate` |
| FCP | 542ms | `soft-navigation` |
| TTFB | 0ms | `soft-navigation` |

如愿以偿，从列表进入文章的切换被算作了单独的体验。但同一张表也展示了为什么一个选项解决不了问题。**soft navigation 的 TTFB 是 0。**从没向服务器发过请求，这个值理所当然，但如果这个 0 和首次加载的 798ms 堆在同一个位置，TTFB 的平均值就会在没人改代码的情况下悄悄下降。所以我还得把每个指标附带的 `navigationType` 作为事件参数一起发送。观测每多一项，用来区分它的维度也会跟着增加。

重新测量时又弄清了两件事。一是浏览器要认定一次 soft navigation，**必须有用户输入**。用脚本调用 `click()` 时，即使 URL 变了、画面也更新了，`soft-navigation` entry 也没有生成，直到发送真实的鼠标输入才被捕捉到。二是在这个博客上，这种切换发生的位置比想象中窄。列表和页头的链接是 Next 的 `Link`，属于 client-side navigation，但**文章正文里的内部链接是 Markdown 生成的普通 `a` 标签，走的是整页加载**。即使在同一个网站内，有的跳转是 soft navigation，有的不是。

这个案例揭示的更重要的事实是，SPA 性能测量不是单纯的库配置问题，而是**由谁来定义页面边界**的问题。

定下页面边界之后，route、metric id、session 上下文按什么单位存储也就能定下来了。现在把这个问题搬到 RUM 数据模型上。

## RUM 数据模型

用 `navigator.sendBeacon()` 发送数值的代码并不长。难的是在不丢失日后想回答的问题的前提下，控制成本和 :term[cardinality]{key="cardinality"}。

至少要一并考虑以下上下文。

| 上下文 | 需要的理由 |
|---|---|
| 页面与 route | 区分慢的页面 |
| release 与 commit | 找到引入回归的那次部署 |
| navigation type | 区分新导航、刷新、bfcache 恢复 |
| device 与 connection | 观察不同环境下的分布差异 |
| metric id | 避免重复统计同一页面生命周期内更新的值 |
| session 与 trace id | 把行为、错误、服务器请求串起来 |
| visibility state | 过滤后台标签页中被扭曲的值 |

如果在这之上不加选择地附上完整的 DOM selector、完整 URL、用户 ID，分析看起来变容易了，成本和隐私风险却会变大。动态 URL 会让 cardinality 爆炸，selector 和网络报文里可能混入个人信息。

观测数据并不是越多越好。**与日后要做的决策连不上的属性，不如不采集。**

## 采集与存储的选项

浏览器观测不需要从零自己造。

- `web-vitals` 提供 Core Web Vitals 的计算和 attribution。
- [Boomerang](https://github.com/akamai/boomerang) 是历史悠久的开源 RUM 采集器，提供多种性能插件和 beacon 上报方式。
- [Grafana Faro Web SDK](https://grafana.com/docs/grafana-cloud/monitor-applications/frontend-observability/) 在浏览器中采集性能、错误、日志和 trace，并与后端观测衔接。
- OpenTelemetry JavaScript 可以生成浏览器 trace，但[官方文档](https://opentelemetry.io/docs/languages/js/)仍把浏览器 client instrumentation 标注为 experimental。

选工具时，比起功能数量，更应该先看你要拥有的范围。只用 SDK，还是连采集 endpoint 和存储也一起运营，还是连个人信息删除和保留策略也要自己负责，选择会因此不同。

用 SaaS 能减轻运维负担，自己运营开源栈则能更细致地掌控数据路径和成本模型。哪一边都不是免费的。

## 放弃 79KB 的决定

既然聊到了成本，就顺便记下我在这个博客上实际做出的一个决定。这个博客的错误埋点(Sentry)只在服务端。我一直介意看不到只在浏览器里发生的错误，于是开启了客户端埋点，并以 clean build 为基准比较了客户端 JS 的 gzip 总量。

| 配置 | client JS (gzip) | 增量 |
|---|---|---|
| 未接入 Sentry | 181.6 KB | 基准 |
| **仅服务端 (当前)** | **182.3 KB** | **+0.7 KB** |
| 仅服务端 + 在错误回退 UI 中调用 `captureException` | 186.0 KB | +4.4 KB |
| 客户端 + 服务端 | 260.4 KB | +78.8 KB |

服务端埋点几乎是免费的，浏览器埋点却要价 78.8KB。我也试过 bundle 优化选项，数字纹丝不动，降低客户端成本的唯一办法就是干脆不放浏览器初始化文件。第三行占 4.4KB 的原因也是同一个结构。没有浏览器 SDK 时，错误回退 UI 里的 `captureException` 是什么都不做的 no-op，SDK 代码却仍会打进 bundle。所以我把调用本身去掉了。

这个测量也有瑕疵。它是把全部静态产物加总的值，和一位访客实际下载的量不同；而开了优化选项却一个字节都没少，也可能是那个选项根本没生效的信号。所以严格地说，正确的表述不是"浏览器观测要 79KB"，而是"在我的配置下没能降到那以下"。

即便如此，决定还是清晰的。在这个博客上，加载性能既是用户体验本身，也是搜索曝光的前提，而为这 78.8KB 买单的不是我，是访客。如果是由用户付费的观测，就必须问这份观测能还给用户什么，而对于个人博客的客户端错误埋点，我的答案是"还得不够多"。前面说过，测量用户体验的代码可能恶化用户体验；把这个原则扩展到工具引入的层面，就是这样。**把观测做得更密，并不总是正确的选择。**

## 提问的门槛

把前面看过的 API 和工具连接到实际问题时，AI 有用的地方有三处。

第一，收窄从现象到规范的路径。"LCP 来了两次"、"cross-origin 资源的区间全是 0"、"SPA 跳转后值不更新"这类现象，可以被连接到相关的 API 和条件上。

第二，帮忙把不同工具的结果翻译到同一条时间轴上。当 DevTools trace、RUM event、Sentry span、服务器日志指向的时刻和标识符各不相同时，可以快速生成用于比对的候选。

第三，可以在采集到的数据中探索分布和异常区间。不再只看简单平均，而是提议按浏览器、route、release、device 拆分差异，构造下一条查询的成本随之下降。

但这个过程做的是生成候选，不能替代依据。没被采集的用户不在数据里，定义错误的 metric 再精细地分析也会得出错误的结论。个人信息能不能发送、观测代码的成本该不该由用户承担，也不是只靠技术文档就能决定的。

与其说 AI 是让浏览器观测得更好的新传感器，不如说它是降低阅读现有传感器说明书、提出问题的成本的工具。

## 观测始于提问

总结一下，浏览器已经在详细记录网络、渲染、输入和布局变化。`PerformanceObserver` 是读取这些记录的起点，Web Vitals 是把它解读成用户体验语言的指标，RUM 则是在真实用户环境中持续采集其分布的体系。

三个阶段看起来相似，回答的问题却不同。entry 告诉你浏览器里发生了什么，Web Vitals 压缩了用户体感到了什么，RUM 展示这种体验在谁身上重复了多少次。

阅读多份规范、组合各种工具的门槛降低了，但能轻松采集和能正确解读是两码事。当你能解释清楚哪些用户被漏掉了、在什么条件下值会被扭曲时，观测数据才终于成为可用于判断的信息。也希望读到这里的读者回头想一想，眼前的性能数字到底是把谁的体验、按什么规则汇总出来的值。

在下一篇文章[系统可观测性](/260915)中，我打算看看这些浏览器数据如何与错误、trace、profile、服务器日志连接起来。那是一个追踪从用户屏幕出发的一次请求在系统内部延伸到了哪里的故事。

:::ref
- [docs] [W3C, Event Timing API](https://www.w3.org/TR/event-timing/)
- [docs] [W3C, Long Animation Frames API](https://www.w3.org/TR/long-animation-frames/)
- [docs] [web.dev, Debug Performance in the Field](https://web.dev/articles/debug-performance-in-the-field)
- [docs] [Chrome for Developers, Back Forward Cache](https://developer.chrome.com/docs/web-platform/bfcache)
:::
