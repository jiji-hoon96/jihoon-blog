---
emoji: 🔭
title: '浏览器可观测性'
seoTitle: '浏览器性能监测：PerformanceObserver、Web Vitals 与 soft navigation 实测'
date: '2026-09-14'
updatedAt: '2026-09-16'
categories: 观测 前端 浏览器 RUM
description: '梳理不借助浏览器 SDK 就能在页面内看到的信号：Performance Timeline、网络阶段、LCP INP CLS 的计算规则、web-vitals reportSoftNavs 实测，以及这个博客发往 GA4 的数据。'
keywords: '浏览器性能监测, PerformanceObserver 用法, Web Vitals 计算方式, INP 测量, CLS 会话窗口, Soft Navigations API, web-vitals reportSoftNavs, Resource Timing Timing-Allow-Origin'
locale: zh-CN
translationOf: '260914'
sourceHash: 3976b490db6bef1a28388bab84a42d789e23e2df6fc503abd0ac827c7b892867
---

这篇文章想聊聊浏览器可观测性。

在[上一篇文章](/260913)里，我讲了把在公司用了多年的 Sentry 接入这个博客、顺便重新梳理其功能的经过。但那篇文章的配置里有一处显眼的空缺。我只在服务端接入了 Sentry，没有启用浏览器 SDK。

原因是 bundle 体积。（作为依据的实测数据写在第一节）但这并不意味着我打算完全不看浏览器里发生的事。即使没有 SDK，浏览器自己也会记录大量关于加载和渲染的信息。

所以这篇文章的问题是这样的。**不借助外部 SDK，仅凭浏览器在页面内自行给出的加载与渲染信号，能看到什么？** 我会依次看网络阶段、Web Vitals 的计算规则、SPA 中变得模糊的页面边界，最后写下这个博客实际发送了什么、没有发送什么。（CPU 和内存留给下一篇，采集到的数据如何连接到 CrUX 和搜索则留给最后一篇）

## 没有启用浏览器 SDK 的原因

先把决定的依据记下来。我一边切换 Sentry 的配置，一边以 clean build 为基准比较了 `.next/static/chunks/*.js` 的 gzip 总和。

| 配置 | client JS (gzip) | 增量 |
|---|---|---|
| 未接入 Sentry | 181.6 KB | 基准 |
| **仅服务端（当前）** | **182.3 KB** | **+0.7 KB** |
| 仅服务端 + 在错误兜底 UI 中调用 `captureException` | 186.0 KB | +4.4 KB |
| 客户端 + 服务端 | 260.4 KB | +78.8 KB |

这张表是 2026-08-04 基于 Next 16.1.4 测得的。服务端埋点几乎是免费的，浏览器埋点却要 78.8KB。我也试过开启 `bundleSizeOptimizations.excludeTracing`，数值纹丝不动，消除这部分开销的唯一办法就是不放浏览器初始化文件（`src/instrumentation-client.ts`）。第三行也是同样的道理。没有浏览器 SDK 时，兜底 UI 里的 `captureException` 什么也不做，SDK 代码却照样打进 bundle。所以我把这个调用本身也去掉了。

我也重新测了当前状态。2026-09-16 用同样的方法再测，结果是 206.1KB。比基准线大了 23.8KB，但这期间 Next 升到了 16.3.4，后文要讲的 soft navigation 上报也加了进来。Sentry 配置仍然是仅服务端，所以这部分增量不是 Sentry 造成的。（两者各占多少，我没有逐个提交重新构建，所以不知道）

在这个博客上，加载性能就是访客体验，而为 78.8KB 买单的不是我，是访客。我判断个人博客的浏览器错误换不回这笔开销。不过既然这样决定了，浏览器这一侧就得换一种方式来看。出发点是浏览器本来就在留下的记录。

## 浏览器留下的记录

页面打开时，浏览器会生成多种 :term[PerformanceEntry]{key="performance-entry"}。W3C 的 [Performance Timeline](https://www.w3.org/TR/performance-timeline/) 是在同一条时间轴上读取这些条目的通用框架。即使开发者不像掐秒表那样打下开始和结束，浏览器也早已知道文档导航、资源请求、绘制、输入这类事件。

| 观测对象 | entry type | 能回答的问题 |
|---|---|---|
| 文档导航 | `navigation` | 时间耗在了 DNS、连接、响应、DOM 处理中的哪一段 |
| 图片、脚本、CSS | `resource` | 哪个资源慢了，传输大小是多少 |
| 画面显示 | `paint`, `largest-contentful-paint` | 首屏和主要内容是什么时候显示出来的 |
| 布局变化 | `layout-shift` | 正在看的画面是什么时候动了 |
| 用户输入 | `event` | 输入之后到下一帧绘制出来用了多久 |
| 应用自定义阶段 | `mark`, `measure` | 服务自己定义的工作花了多长时间 |

查看长时间占用主线程的帧的 `long-animation-frame` 也属于同一框架，但那是 CPU 的话题，放到下一篇讲。

接收这些记录的标准接口是 :term[PerformanceObserver]{key="performance-observer"}。

```ts
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(entry.entryType, entry.startTime, entry.duration)
  }
})

observer.observe({ type: 'resource', buffered: true })
```

代码很短，但藏着几个条件。根据 MDN 的 [`observe()` 文档](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver/observe)，`buffered` 必须和 `type` 一起使用，不能和一次接收多种类型的 `entryTypes` 同时使用。采集脚本通常在页面进行了好一阵之后才执行，如果不带 `buffered` 注册，就收不到在那之前产生的 LCP 候选和资源记录。

另外，浏览器不支持的 type 会被直接忽略而不抛异常，按同一文档的说法，最多只会在控制台留下一条警告。不用 `PerformanceObserver.supportedEntryTypes` 确认的话，就无法区分**没有 entry** 和**这是一个根本不会生成该 entry 的浏览器**。仪表盘上的空白区间可能不是性能问题，而是浏览器构成的差异。

## 网络时间的构成

页面慢这句话常常被翻译成网络问题。但光凭一个 `duration` 分不清原因。`navigation` entry（`PerformanceNavigationTiming`）和 `resource` entry（`PerformanceResourceTiming`）会把一次请求拆成多个时间戳。

| 阶段 | 计算 | 偏大时该怀疑的地方 |
|---|---|---|
| DNS | `domainLookupEnd - domainLookupStart` | DNS 层 |
| 连接与 TLS | `connectEnd - connectStart` | 连接复用、TLS 协商 |
| 到首字节 | `responseStart - requestStart` | 服务器处理与往返延迟 |
| 正文传输 | `responseEnd - responseStart` | 响应大小与传输速度 |

W3C 的 [Navigation Timing](https://www.w3.org/TR/navigation-timing-2/) 规范里有一张图，展示这些时间戳按什么顺序被记录。如果对阶段名称不熟，看一眼那张图比看表更快。

一个陷阱是 cross-origin 资源。按照 W3C 的 [Resource Timing 规范](https://www.w3.org/TR/resource-timing/)，来自其他 origin 的资源，除非提供它的服务器用 `Timing-Allow-Origin` 响应头放行，否则 DNS、连接、请求与响应开始这类详细时间戳都会被置为 0 隐藏起来。如果觉得外部 CDN 的图片慢，打开一看 DNS 和连接全是 0，那不是它快，而是你没有查看的权限。**在这个领域，0 不一定意味着快。**

这个博客的首字节时间也不轻。2026-09-16 我在韩国的一个地点用 `curl` 各请求了两篇文章和首页一次，`time_starttransfer` 在 0.95 秒到 2.43 秒之间（这个值包含 DNS、连接和 TLS 时间），响应头显示 Netlify Durable 缓存 hit、边缘缓存 miss。样本只有三个，我不做推广，但它和后文实测中 798ms 的 TTFB 是同一量级。有了这样的阶段拆分，才能在 LCP 慢的时候选择是缩小图片，还是让文档更早到达。

## Web Vitals 的计算

如果说网络阶段是原材料，:term[Web Vitals]{key="web-vitals"} 就是在其上叠加计算规则的指标。Google 的 Web Vitals 文档规定的 Core Web Vitals 是 LCP、INP、CLS 三项，良好的标准是 LCP 2.5 秒、INP 200ms、CLS 0.1 及以下。

![LCP、INP、CLS 三个指标的良好、需要改进、较差区间。LCP 以 2.5 秒和 4.0 秒为界，INP 以 200ms 和 500ms 为界，CLS 以 0.1 和 0.25 为界](1.png?w=720)

（图片来源：将 [web.dev, Web Vitals](https://web.dev/articles/vitals) 的三张阈值图横向拼接，[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)）

这三个指标都不是浏览器打一次的时间戳。必须解读多个 entry 和页面生命周期才能得出数值。不了解这一点，当自己写的采集代码与库或工具的数值对不上时，就无法判断哪边是对的。

### LCP 的候选会不断变化

根据 [LCP 文档](https://web.dev/articles/lcp)，每当更大的内容元素被绘制出来，浏览器就会发出一个新的 `largest-contentful-paint` entry。先绘制文本时 `<p>` 成为候选，之后大图加载完成就换成 `<img>`。而在用户点按、滚动或按键的那一刻，浏览器会停止上报新的 entry。所以 LCP 不是第一个 entry，而是输入之前上报的最后一个有效候选，确定这个定稿时间点就成了采集代码的职责。

### INP 是输入三个阶段的总和

web.dev 的 INP 文档把一次交互分成三个阶段。输入进来到事件处理函数开始执行之间的 input delay，处理函数运行的 processing duration，以及到下一帧显示在屏幕上的 presentation delay。

![主线程上处理一次输入的过程。blocking task 导致 input delay，pointerup、mouseup、click 处理函数构成 processing duration，经过 render 和 paint 直到帧显示出来是 presentation delay。paint 下方还接着 compositing、GPU、raster 工作](2.png?w=720)

（图片来源：[web.dev, Interaction to Next Paint (INP)](https://web.dev/articles/inp)，[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)，转换为白色背景的 PNG）

这张图里值得注意的是，用户按下的时候，灰色的 blocking task 已经在运行了。处理函数的代码再快，只要输入前一刻有别的工作占着主线程，INP 就会变差。（找出那个别的工作是什么，正是下一篇的主题）

页面的 INP 接近一次访问期间观察到的交互中最慢的那个值。同一文档说明，每 50 次交互会忽略一个最大值。所以在交互不足 50 次的访问里，最慢的那一次交互就是 INP。

### CLS 把位移分组计算

[CLS 文档](https://web.dev/articles/cls)对 CLS 的定义不是页面生命周期内所有位移之和，而是最大一组（burst）的分数。位移之间间隔不到 1 秒就归入同一个 session window，一个 window 最长 5 秒。这些 window 中分数总和最大的那个就是 CLS。这条规则是为了让长时间开着的标签页里零星产生的位移不会无休止地累加。

三个指标的规则可以自己实现。但要把边界条件一直对到标签页被隐藏、页面被恢复的时刻，并不容易。Google 的 [`web-vitals`](https://github.com/GoogleChrome/web-vitals) 库不是把 entry 原样转交的工具，而是在标准 API 之上应用了这些生命周期规则的实现。这个博客用的也是它。

然而这些规则都以“一个页面”这个单位为前提。这个单位变模糊时会怎样？

## 变得模糊的页面边界

在传统的 navigation 中，浏览器知道文档从哪里开始。SPA 的 client-side navigation 虽然 URL 和画面变了，却不会新建文档。在浏览器看来，这相当于一次首次加载一直延续下去，所以从列表进入文章后的第二个画面没有自己的 LCP。

此前，RUM 工具和框架各自用自己的启发式规则定义“新画面”。Chrome 团队通过 [Soft Navigations API](https://developer.chrome.com/docs/web-platform/soft-navigations) 把这一判断收进了浏览器。当用户输入、URL 变化、画面绘制同时发生时，浏览器会生成 `soft-navigation` entry。这项功能从 Chrome 151 起默认开启，Chrome 151 的 stable 发布日期是 [2026-07-28](https://chromiumdash.appspot.com/fetch_milestone_schedule?mstone=151)。`web-vitals` 也从 6.0 开始通过 `reportSoftNavs` 选项按 soft navigation 上报指标。按 README 的说法，这种上报只在 Chromium 151 及以上版本生效，在其他浏览器中即使开启选项，上报方式也不会改变。

### 开启 reportSoftNavs 后测得的数值

这个博客也是通过 Next.js 的 `Link` 从文章列表进入文章的。2026-09-14 我把 `web-vitals` 升级到 6.2.1 并开启 `reportSoftNavs`（`cc21a0d`）之后，用 CDP 连上打开了生产页面的无头 Chrome，原样查看发往 GA4 的请求。一次会话里发出的数值如下。（表中没有的指标是这次会话的请求里本来就没有的，原因我没有另行确认）

| 指标 | 值 | `navigationType` |
|---|---|---|
| TTFB | 798ms | `navigate` |
| FCP | 1680ms | `navigate` |
| LCP | 1680ms | `navigate` |
| FCP | 542ms | `soft-navigation` |
| TTFB | 0ms | `soft-navigation` |

从列表进入文章的切换如预期那样被记为一次独立的体验。但这张表也说明了为什么一个选项解决不了全部问题。**soft navigation 的 TTFB 是 0。** 既然从未向服务器请求过文档，这正是 README 里写的值，可如果这个 0 和首次加载的 798ms 堆在同一个事件里，TTFB 平均值就会在代码没改的情况下悄悄下降。所以我改了代码，把每个指标附带的 `navigationType` 作为 GA4 参数一起发送。观测单位多一个，用来区分它的维度也要跟着多一个。

测量过程中还发现了两件事。一是 soft navigation **需要真实的用户输入**。在页面里用脚本调用 `click()` 时，虽然 URL 变了、画面也更新了，却没有生成 `soft-navigation` entry，直到用 CDP 的 `Input.dispatchMouseEvent` 发送坐标点击才被捕获。想用测试自动化验证这个功能，就得发送浏览器层面的输入事件，而不是调用 DOM 的 `click()`。

另一件是，这个博客里发生 soft navigation 的地方比想象中窄。列表和页头的链接是 `Link`，所以属于 client-side navigation，但**文章正文里的内部链接是 Markdown 生成的普通 `a` 标签，所以是整页加载**。即便在同一个站点里，有的跳转是 soft navigation，有的不是。

### 首个页面的指标在什么时候被截断

实测之后重读 README，我发现了之前漏看的一句话。

> Note that this will change the way the first page loads are measured as the metrics for the initial URL will be finalized once the first soft nav occurs.

意思是开启选项后，首个页面的指标会在第一次 soft navigation 发生的那一刻定稿。INP 和 CLS 本来是一直观察到离开页面为止的指标，而现在用户在列表里点击文章链接的那一刻，列表页的观察就结束了，新画面的 INP 和 CLS 从 0 重新开始。同一份 README 还写到，LCP 和 FCP 也只统计 soft navigation 之后新绘制的元素。像页头这样在画面之间原样保留的元素，不能成为新画面的候选。

因此，开启选项前后，首次加载指标的分布可能会不同。如果测量同一个站点时 INP 以某次部署为界变好了，那可能不是代码变好了，而是观察窗口变短了。由于只有 Chromium 151 及以上才会这样运作，浏览器之间也会产生差异。（我本该在实测之前就知道这个差异。比起表里的数值，这一句话对解读的影响更大）

### bfcache 恢复也是新的体验

还有一条让页面边界变模糊的路径。:term[bfcache]{key="bfcache"} 会在后退和前进时把页面从内存里整个恢复出来。web.dev 的 [bfcache 文档](https://web.dev/articles/bfcache)写道，在 Chrome 的使用数据中，桌面端每 10 次导航有 1 次、移动端每 5 次有 1 次是后退或前进。恢复不是新的加载，所以本该最快的回访会从加载分布中消失，实际体验变好了，采集到的分布却可能偏向慢的一侧。同一文档建议把 TTFB 这类指标按 navigation type 分开来看。`web-vitals` 在这种情况下会把 `navigationType` 报为 `back-forward-cache`，所以这个博客为 soft navigation 加入的参数也能一并区分 bfcache 恢复。

## 这个博客实际发送的内容

把前面的内容落到这个博客的代码上，就是一个 `src/components/WebVitalsReporter.tsx`。客户端组件动态加载 `web-vitals`，注册 LCP、INP、CLS、FCP、TTFB，并以名为 `web_vitals` 的单个事件发送给 GA4。按 lockfile，安装的版本是 6.2.1。

| 参数 | 内容 |
|---|---|
| `event_label` | 指标名称（`LCP`、`INP` 等） |
| `value` | 指标值。GA4 的 value 是整数，所以 CLS 乘以 1000 后四舍五入 |
| `metric_id` | 在一个页面生命周期内标识某一指标的 id。同一指标再次上报时，用这个值归并 |
| `metric_rating` | 由库判定的 good、needs-improvement、poor |
| `metric_navigation_type` | `navigate`、`soft-navigation`、`back-forward-cache` 等 |

这是不另设采集服务器、直接搭在已在运营的 GA4 上的 :term[RUM]{key="rum"} 配置。如果模块加载本身失败，会留下一个 `web_vitals_unavailable` 事件。这是部署刚完成时旧 HTML 去请求已经不存在的 chunk 所导致的失败，由于浏览器端没有 Sentry，没有这个事件的话，即使采集整个停掉也不会留下任何痕迹。

不发送的内容也很明确。因为用的是 `web-vitals` 的标准构建而不是 attribution 构建，所以不采集 LCP 元素是哪个、INP 的三个阶段各花了多久、哪个元素推动了布局。回想前面那张 INP 的图，这个博客只知道三个阶段的总和，不知道哪个阶段长。而且只在浏览器中发生的 JS 错误也不会被记录在任何地方。这是省下 79KB 的代价。

还有一点要记下来。我确实在发送 `metric_navigation_type`，但写这篇文章时并没有确认 GA4 里是否已把这个参数注册为 custom dimension 并真正拆分查看。GA4 Admin API 在这个 GCP 项目里是关闭的，一时也没有办法确认。发送出去和能够拆开来读，是两回事。

## 浏览器早已在记录

总结一下，即使不启用浏览器 SDK，浏览器也早已在记录网络阶段、绘制、布局位移和输入延迟。`PerformanceObserver` 是读取这些记录的入口，而 Web Vitals 是在此之上叠加候选更新、三个阶段之和、session window 等计算规则的指标。

而这些计算规则以页面这个单位为前提。开启 soft navigation 后，新画面有了自己的指标，代价是首个页面的观察窗口变短，TTFB 里混入 0，bfcache 恢复则从加载分布中消失。我这次新理解到的是，一个选项改变的不只是数值，还有**把什么算作一次体验**。所以在比较数字之前，得先看这些数字是按什么边界截取的。读到这里的各位，也不妨回头确认一下，自己正在看的性能数字是在哪个时间点定稿的。

不过，这篇文章只看到了三个阶段之和为止。输入进来时占着主线程的工作到底是什么，长时间打开的页面又用了多少内存，这些需要别的 API。我打算在下一篇[浏览器的 CPU 与内存](/260915)里继续这个话题。

:::ref
- [docs] [W3C, Event Timing API](https://www.w3.org/TR/event-timing/)
- [docs] [web.dev, Debug performance in the field](https://web.dev/articles/debug-performance-in-the-field)
- [docs] [WICG, Soft Navigations explainer](https://github.com/WICG/soft-navigations)
:::
