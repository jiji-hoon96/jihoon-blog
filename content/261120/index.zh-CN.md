---
emoji: 🔎
title: '用 Network 面板追踪 42 MB'
seoTitle: 'DevTools Network 实战：用 Initiator 追踪 Toss Bank 的 42 MB'
date: '2026-11-20'
categories: 前端 性能 DevTools
description: 'Toss Bank 首页传输了 42 MB。我沿着 Network 面板底部摘要、Size 和 Initiator，发现 27 MB 是为读取卡片背景色中的一个像素而下载的原始 PNG。我还测量了 lazy 无法阻止的请求，以及 Disable cache 让传输量增加的 10 MB。'
keywords: 'Chrome DevTools Network 面板用法，开发者工具 Network 请求分析，Initiator 调用栈，Disable cache 首次访问，loading lazy 图片，Resource Timing transferSize，canvas getImageData CORS，图片传输量优化'
locale: zh-CN
translationOf: '261120'
sourceHash: d042953f2b5f612a21f4d2c9e416a9ddd7b509eafa8de9fa080916dede2a3734
---
这篇文章将使用 Chrome DevTools 的 Network 面板，追踪一个页面的传输量到底来自哪里。

这篇文章写给这样的前端开发者：你打开过 Network 标签查找失败的 API，却不知道该从哪里入手弄清页面为什么这么重。我会依次查看底部摘要行、Size 列和 Initiator，追踪到代码中的一行，找出 Toss Bank 首页 42 MB 传输量的来源。在这个过程中，我还会确认 `loading="lazy"` 无法阻止的请求，以及开启 Disable cache 后测得的数字与首次访问不同的情况。

我在公司负责页面性能时每天都会打开 Network 面板，但打开后总是只看那些熟悉的项目。因此，我决定把 DevTools 的面板逐个应用到真实服务上，仔细追踪到底，并选择了第一个目标：无需登录、任何人都能访问的 Toss Bank 首页（`www.tossbank.com`）。我不知道 Toss Bank 为什么这样实现，所以不会对此做判断。这篇文章讨论的是面板显示的数字，以及这些数字产生的原理。

## 底部摘要行

我在 2026 年 11 月 20 日 18 时左右，使用 headless 模式启动 Chrome 157.0.8103.80 进行了测量。每次都使用新配置文件，将窗口大小设为 1600x1000，统计不限制网络速度时 15 秒内收到的数据。重复打开三次后，MB 小数点后两位的数值都相同。Toss Bank 首页会随部署和信息流变化，同日上午有一张卡片不同，因此传输量多了 2 MB。于是我在 [jiji-hoon96/blog-labs](https://github.com/jiji-hoon96/blog-labs/tree/main/image-color-sampling) 中制作了一个复现相同结构的演示，文章后面也会一并测量。

打开 Network 面板并刷新页面后，首先要看的是最底部的一行。Toss Bank 首页显示了 156 个请求、`42,202 kB transferred` 和 `55,603 kB resources`。[Network 面板参考文档](https://developer.chrome.com/docs/devtools/network/reference)说明，这一行汇总了传输大小和解压后的大小。transferred 是响应头和压缩后的正文实际经过网络传输的数据量。resources 是解压后的大小，从缓存中读取、网络传输量为 0 字节的响应也会按其完整大小计入。因此 resources 更大。

应用筛选器后，这一行会变成“筛选结果 / 总计”两个值。在类型筛选器中点击 Img 后，数值变成 `57 / 156 requests` 和 `40,450 kB / 42,202 kB transferred`。按请求数量计算只占 37% 的图片，占了传输量的 96%。所以我先看图片。在同一筛选条件下，resources 为 50,862 kB，比 transferred 大约多出 10 MB。PNG 不会以压缩形式传输，因此这部分差额几乎全是从缓存读取的图片。Disable cache 部分会再次提到这个数字。

![在 Toss Bank 首页的 Network 界面中启用 Img 筛选器，并按 Size 降序排列后，最上方的横幅由 Parser 请求，其下的卡片缩略图由 Script 请求。1 是 Img 筛选器，2 是按降序排列的 Size 列标题，3 是第一行 tossbank-banner-web-Financial-sector.png 的 Size 两个数值，分别为 5,590 kB 和 5,587 kB。4 是同一行的 Initiator，显示为 (index):5 和 Parser，5 是第二行 bankfeed-gold-decline-cover.png 的 Initiator，显示为 index-8989962b29fa3f03.js:1 和 Script。6 是 logo-bank-mono-white.svg 的 Size 两个数值，分别为 1,616 kB 和 2,140 kB。7 是底部摘要行的 40,450 kB / 42,202 kB transferred，8 是 50,862 kB / 55,603 kB resources](1.png?w=720)

## Size 列的两个数值

保持筛选条件不变，点击 Size 列标题，按从大到小排序。Size 列默认只显示一行。点击筛选器行上方、Network 面板工具栏最右侧的齿轮图标，启用 Big request rows 后，就会显示两行。参考文档说明，上方是服务器发送的响应头和正文的总大小，下方是解压后的大小。

最上方的横幅 `tossbank-banner-web-Financial-sector.png` 上方显示 5,590 kB，下方显示 5,587 kB，两者几乎相同。PNG 是已经压缩过的格式，服务器没有再次压缩响应，而且响应头中没有 `content-encoding`。剩下的 3.7 kB 无法仅用响应头来解释。这个响应通过 HTTP/2 传输，HTTP/2 会把正文拆分成帧（默认最大 16 KB），并为每个帧附加 9 字节的头部。Chromium 也会把这些帧头计入接收字节（[`spdy_session.cc`](https://github.com/chromium/chromium/blob/main/net/spdy/spdy_session.cc)）。将 5.6 MB 拆成 16 KB 的帧，大约有 340 个，因此仅帧头就约有 3 kB，再加上响应头，数值就对得上了。相反，logo `logo-bank-mono-white.svg` 上方显示 1,616 kB，下方显示 2,140 kB，差距明显。SVG 是文本，因此传输时经过了 gzip 压缩。这个 logo 达到 2 MB，是因为文件中有两张以 base64 编码的 PNG。

排序列表顶部是横幅和信息流卡片缩略图。三张大横幅的原始尺寸是 5120x2800，显示时绘制为 1600x1000。以 `bankfeed-` 开头的卡片缩略图原始尺寸是 3200x2160，显示时绘制为 302x170。即使按 Retina 屏幕这类将一个 CSS 像素绘制为两个物理像素的环境（设备像素比为 2）计算，横幅需要 3,200 px 宽，却收到了 5,120 px；卡片需要 604 px，却收到了 3,200 px。我通过页面中的 `naturalWidth` 确认了原始尺寸。

我还用其他工具测量了 Size 的上方数值。本文的传输量是将 Chrome DevTools Protocol（CDP）为每个请求提供的 `encodedDataLength` 相加所得，与底部摘要行的数值精确到字节一致。也可以通过页面中的 JavaScript 读取。查看最大的卡片缩略图时，`performance.getEntriesByType('resource')` 显示其 `transferSize` 比 `encodedBodySize` 大 300。[Resource Timing 规范](https://w3c.github.io/resource-timing/#dom-performanceresourcetiming-transfersize)规定，为避免暴露实际响应头大小，要在正文大小上加一个固定的 300。之所以能在来自其他 origin 的图片上看到这个值，是因为请求通过 CORS 发出，而且服务器将 `access-control-allow-origin` 和 `timing-allow-origin` 都设为 `*` 开放访问。

只看大小，这就是常见的图片优化问题。不过同时查看 Initiator 列会发现，卡片缩略图不是由页面上的 `<img>` 请求的，而是由脚本请求的。

## Initiator 与异步调用栈

Initiator 列显示是谁发起了请求。参考文档列出的值有 Parser、Redirect、Script、Early Hints 和 Other。图 1 中，横幅的 Initiator 显示为 `(index):5` 和 Parser。解析器读取 HTML 时遇到 `<img>`，于是发出了请求。卡片缩略图 `bankfeed-gold-decline-cover.png` 的 Initiator 显示为 `index-8989962b29fa3f03.js:1` 和 Script。请求是在脚本执行期间发出的。

页面上显示的卡片是 `<img>`，为什么 Initiator 却是 Script？点击该请求行并打开详情界面的 Initiator 标签后，可以看到发起请求的调用栈。

![同一请求的 Initiator 标签中，调用栈分为 Image、setTimeout、await in fetch 三个异步边界。1 是 Initiator 标签，2 是第一组 Image，其中 T.o、T 和两个 (anonymous) 都位于 index-8989962b29fa3f03.js 中。3 是 setTimeout 组，其中有 main 和 _app bundle 中的 batch、setData、fetch。4 是 await in fetch 组，其中有 H、onSubscribe、subscribe](2.png?w=720)

粗体的 `Image`、`setTimeout` 和 `await in fetch` 是异步边界。每个边界下面的栈帧，是预定该异步任务时的调用栈。因此，从下往上读就是时间顺序。

1. 名为 `fetch` 的函数通过 `await` 等待数据后恢复执行（4）。这里的名字不是浏览器的 `window.fetch`，而是 bundle 中某个函数的名字。下面的 `onSubscribe` 和 `subscribe` 是调用该函数的代码
2. 这个函数通过 `setData` 更改状态，再经过 `batch`，安排一个 `setTimeout`（3）
3. 定时器运行后，经过看起来属于 React 内部的 `framework-*.js` 栈帧，函数 `T` 为图片设置 `src`（2）

最上方的 `Image` 边界表示脚本为图片元素设置 `src` 的时刻。实际请求由浏览器紧接着单独发出，因此 Initiator 显示的是那个时刻的调用栈。仅凭这个名称无法判断它是 DOM 中的 `<img>` 还是 `new Image()`，必须查看代码才能知道。

点击栈中的 `index-8989962b29fa3f03.js:1`，Sources 面板就会打开对应位置。Sources 默认会展开格式化（pretty print）压缩文件，因此即使 bundle 只有一行也可以阅读。bundle 的哈希会随每次部署变化，但沿着 Initiator 的链接就能打开当时的文件。我下载并阅读了同一个文件，发现一个看起来像卡片组件 effect 的回调将缩略图地址传给了 `T`。`T` 会做四件事。

1. 创建 `new Image()`，将 `crossOrigin` 设为 `"anonymous"`，然后填入卡片缩略图的原始地址
2. 加载完成后，创建一个与图片尺寸相同的 canvas
3. 将图片绘制到 canvas 上
4. 使用 `getImageData` 读取距右边缘 20 px、距上边缘 20 px 处的一个像素，并将该颜色用作卡片背景色

`T` 使用缩略图边缘的颜色填充卡片背景。为了读取这一个像素，它会下载整个原始 PNG。首页有 24 张卡片缩略图通过这条路径下载，共 27.14 MB，占图片传输量 40.45 MB 的三分之二。

把这个过程整理成一张图如下。同一个原始图片通过两条路径请求。

![通过两条路径请求同一个原始 PNG。卡片的 img loading lazy 会在接近屏幕时由 Initiator Parser 发起请求。脚本中的 new Image() 会在信息流数据到达后一次请求全部 24 张，Initiator 为 Script；然后将收到的原始图片绘制到同尺寸的 canvas 上，并通过 getImageData 读取一个像素。对于 3200x2160 的原始图片，canvas 约占 27.6 MB。启用缓存时，第二个请求为 0 B；启用 Disable cache 时则会再次下载](3.png?w=720)

只有 DevTools 的 Initiator 能区分这两条路径。页面内的 Resource Timing 无法区分。通过 `new Image()` 下载的缩略图，其 `initiatorType` 也显示为 `"img"`。规范将处理 img 元素 `src` 时产生的请求归类为 `img`，而 `new Image()` 本身也是 img 元素。

### 原始尺寸的 canvas 与 CORS

`T` 将 canvas 的 `width` 和 `height` 设为图片的原始尺寸。[HTML 规范](https://html.spec.whatwg.org/multipage/canvas.html#the-canvas-element)规定，canvas 位图的尺寸由这两个属性决定，因此对于 3200x2160 的图片，会创建一个包含 691 万个像素的位图。按每个像素 RGBA 4 字节计算，约为 27.6 MB。执行 `drawImage` 也需要解码原始 PNG，因此还会额外生成一个相同大小的解码位图，并对每张缩略图重复这个过程。canvas 是函数内的局部变量，会暂时存在，直到 GC 将其清理。我通过计算得出了这些数值。我尝试通过进程内存测量，但由于数值分散在渲染器和 GPU 进程中，并且每次运行都不同，无法辨别各个变体之间的差异。

`crossOrigin="anonymous"` 是因为要使用 `getImageData`。图片来自与页面不同的 origin：`static.toss.im`。[HTML 规范](https://html.spec.whatwg.org/multipage/canvas.html#security-with-canvas-elements)禁止读取未经许可绘制了其他 origin 图片的 canvas，并规定此时调用 `getImageData` 会抛出 `SecurityError`。设置 `crossOrigin` 后，请求会通过 CORS 发出；如果服务器允许，就可以读取 canvas。可以在 Headers 标签的响应头 `access-control-allow-origin: *` 中确认服务器已允许访问。

## lazy 之外的脚本请求

卡片的 `<img>` 带有 `loading="lazy"`。尽管如此，首页仍会下载 24 张图片，因为 lazy 只会延迟该 `<img>` 自身的请求。[HTML 规范](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#lazy-loading-attributes)将 lazy 定义为一种状态，会在条件满足前推迟下载。如果脚本另行请求同一个地址，该请求就与 lazy 无关。

统计请求提前了多少，结果如下。带有 lazy 的 24 个卡片 `<img>` 位于文档位置 760 px 到 3,411 px 之间。15 秒后，加载的是位置在 1,896 px 以内的 12 张；从 2,275 px 开始往下的 12 张尚未加载。根据 [web.dev 的延迟加载文档](https://web.dev/articles/browser-level-image-lazy-loading)，当 Chrome 将连接状态估为 4G 时，会提前下载位于视口 1,250 px 范围内的 lazy 图片。窗口高度 1,000 px 加上 1,250 px，边界就是 2,250 px，因此观测到的界限符合这个标准。那 12 张图片还没到应该由 `<img>` 下载的时候，脚本却先下载了 17.20 MB。其中最大的缩略图为 5,376 kB，位于文档位置 2,654 px，也属于这部分。

在移动屏幕上，这一比例更高。在同一页面上使用 iPhone 用户代理和 390x844 屏幕打开，传输量为 42.17 MB，几乎相同。由于卡片变为每行一张，被推到窗口高度 844 px 加 1,250 px 边界之外的卡片增加到 19 张，共 23.88 MB。

顶部横幅会因为不同于 lazy 的原因，下载屏幕上看不到的图片。在移动屏幕上，下载了四张桌面版横幅，共 10.27 MB；在桌面上，下载了四张移动版横幅，共 1.42 MB。两组图片都是位于 `display: none` 区域内的 `<img>`，并且没有 `loading` 属性。HTML 规范规定图片默认立即下载，因此隐藏的 `<img>` 也会被下载。

## Disable cache 与重复请求

到这里为止，测量时都关闭了 Disable cache。Network 面板参考文档中介绍这个复选框的章节标题是“模拟首次访问者（Emulate a first-time visitor）”。Chrome 157 的 Performance 面板也写道，这项设置会模拟类似首次访问的网络体验。因此，测量首次访问时，很多人会先勾选这个复选框。我在 Toss Bank 首页勾选后重新测量。

![启用 Disable cache 后，同一个缩略图会由 Parser 和 Script 分别下载一次，传输量增加到 52 MB。1 是已勾选的 Disable cache，2 是 bankfeed-ipo-reorganization-cover.png 出现了两行，上面一行的 Initiator 是 (index):5 Parser，下面一行是 index-8989962b29fa3f03.js:1 Script，两行均为 1,625 kB。3 是底部摘要行的 50,391 kB / 52,148 kB transferred](4.png?w=720)

传输量从 42.20 MB 增加到 52.15 MB，增加了 9.95 MB。其中 9.94 MB 来自距离屏幕较近、已加载的 12 张卡片 `<img>`。其余七个请求是体积很小、不是图片的 preflight 请求。首次访问且启用缓存时，这 12 张图片的传输量为 0 字节。脚本已经先下载了相同的文件，随后发出的 `<img>` 请求复用了这些文件。启用 Disable cache 后，相同文件会再下载一次。图 4 中，同一个文件名的行分别以 Parser 和 Script 为 Initiator 出现两次，就是这种情况。底部摘要行中的 resources 比 transferred 大约多出 10 MB，也是由这 12 张图片造成的。

通过这次测量无法确认究竟是哪一种缓存复用了这些文件。12 个请求中有一个在响应信息中被标记为磁盘缓存，其余 11 个没有缓存标记，传输量为 0 字节。响应中有 `cache-control: max-age=86400`，且没有 `Vary` 头。CORS 请求（`crossOrigin`）和普通 `<img>` 请求的 credentials 模式不同。处理 Blink 内存缓存的 [`resource.cc`](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/platform/loader/fetch/resource.cc)指出，如果 credentials 模式与前一个请求不同，就会重新下载；举例来说，服务器提供 `Access-Control-Allow-Origin: *`，但请求中混用了 CORS 请求和非 CORS 请求。另一方面，按 credentials 区分 HTTP 缓存的功能（`kSplitCacheByIncludeCredentials`）在 [`net/base/features.cc`](https://github.com/chromium/chromium/blob/main/net/base/features.cc)中默认关闭。因此，我认为文件是由 HTTP 缓存复用的，但测量本身无法确认这一点。

首次访问者是缓存为空的人，不是没有缓存的人。首次下载的文件会在同一页面中立即再次使用。Disable cache 连这种复用也会阻止，因此如果一个页面会对同一文件发出两次请求，勾选这个复选框测得的数值会高于首次访问的实际数值。要在这种页面上测量首次访问，应清空缓存，取消勾选复选框后刷新。在 Network 面板的请求列表中右键点击，可以找到 Clear browser cache。我通过执行实现同样操作的 CDP 命令确认，打开一次后清空缓存再重新打开，传输量为 42.20 MB，与首次打开时相同。如果不清空就重新打开，则为 0.16 MB。

## 用演示复现相同结构并测量

这篇文章发布后，Toss Bank 首页还会继续变化。因此，我用公开资料重新制作了相同结构。从其他 origin 下载 24 张 3200x2160 PNG 卡片，每张卡片都放置一个 `<img loading="lazy">`。只改变了三种设置卡片背景色的方法。读取颜色的代码如下。

```js
async function sampleColor(src, x, y) {
  const img = await new Promise((ok) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => ok(i);
    i.onerror = () => ok(null);
    i.src = src;
  });
  if (!img) return null;
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const [r, g, b] = ctx.getImageData(img.width - x, y, 1, 1).data;
  return { r, g, b };
}
```

- **从原图读取**：与 Toss Bank 相同的结构。把原图传给 `sampleColor`
- **从缩略图读取**：将同一个函数用于 64x43 缩略图
- **预先计算颜色**：从 JSON 获取颜色后使用

在相同条件下（窗口 1600x1000、新配置文件、测量 3 次），三个变体的传输量分别为 16.80 MB、8.03 MB 和 7.94 MB。从原图读取时，距离屏幕较远的 12 张卡片也会被下载，传输量因此翻倍。从缩略图读取时，只会增加 24 张 64x43 缩略图的传输量，即 98 kB。启用 Disable cache 后，只有从原图读取的变体增加到 24.73 MB。预先计算颜色的变体不会对同一个文件请求两次，因此仍为 7.94 MB。Network 面板中的 Initiator 也与 Toss Bank 相同，24 个读取颜色的请求显示为 Script，卡片 `<img>` 请求显示为 Parser。

## 从底部摘要行追到一行代码

Toss Bank 首页的 42.20 MB 中，40.45 MB 是图片，其中 27.14 MB 是脚本为了读取卡片背景色中的一个像素而下载的 24 张原始 PNG。`loading="lazy"` 只延迟了卡片 `<img>` 的请求，因此距离屏幕较远的 12 张卡片共 17.20 MB 也在首页加载时下载了。启用 Disable cache 后，同一文件会被下载两次，传输量变为 52.15 MB。

得出这个结论用到的功能并不多。先用底部摘要行确认总传输量，再用类型筛选器区分哪类资源较大，按 Size 排序后查看体积最大的资源，接着用 Initiator 列区分请求的发起者，最后通过 Initiator 标签中的异步调用栈追到代码。图片很大这一点只看 Size 列就能发现。为什么会下载这张图片，则要查看 Initiator 才能知道。

也建议你在自己的服务中启用 Img 筛选器并按 Size 排序，或者在筛选框中输入 `larger-than:500k` 只保留较大的响应，然后看看顶部的请求行是由 Parser 还是 Script 发起的。如果是 Script，该请求就不会受 `loading="lazy"` 或 `srcset` 影响。如果需要从图片中读取颜色，就像演示中测量的那样，预先计算颜色并作为数据下发，或者从小缩略图读取，都能让下载量减半。测量首次访问时，也先确认页面是否会对同一文件发出两次请求。如果会，就用清空缓存后的浏览器打开，而不要启用 Disable cache。

这是一个系列的第一篇，我会逐个把 DevTools 面板应用到真实服务上进行检查。下一篇将通过同一个 Network 面板的 Waterfall 和 Timing 标签，查看一个请求的时间都花在哪里。

:::ref
- [docs] [MDN，允许跨源使用图片和 canvas](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image)
- [docs] [Chrome DevTools，检查网络活动](https://developer.chrome.com/docs/devtools/network)
:::