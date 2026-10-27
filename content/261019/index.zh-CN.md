---
emoji: 🔤
title: '韩文网页字体子集与 next/font'
seoTitle: '韩文网页字体优化：子集、next/font 与 font-display 实测对比'
date: '2026-10-19'
categories: 前端 性能
description: '用 TTF、woff2、子集、Google 和 next/font 分别交付使用四种字体的韩文页面并实测。17 MB 降到 0.6 MB 靠的是子集，直连 Google 和 preload 只带来 0.1 秒左右的差异。'
keywords: '韩文网页字体优化, unicode-range, woff2, 字体子集, 可变字体, next/font, font-display, Google Fonts 自托管, 缓存分区, Noto Sans KR, Pretendard'
locale: zh-CN
translationOf: '261019'
sourceHash: 1b0a9fd911ad78782c3081ebe2d0de561cc81a54fa27edf510ef1e8bcd5f29a2
---

这篇文章想聊一聊如何让韩文网页字体传得更轻。

本文写给运营韩文页面、在正文、标题、代码、引用中分别使用不同字体的前端开发者。笔者实际测量了减少网页字体的各种方法分别有多大效果，并整理出应该先从哪种方法入手。

韩文字体字符多，一个字重就有几百 kB 到 MB 级别。让它少下载、快下载、下载期间画面不晃动的方法有好几种：把文件格式换成 woff2，拆成子集，直接从 Google 服务器下载，用 `next/font` 让字体提前下载（preload）并调整后备字体，或者用 `font-display` 决定字体来晚时的画面。

那么这些方法实际差多少？做一个使用四种字体的页面，按方法分别部署，测一测下载多少字体、全部下载完要几秒、画面偏移多少。顺便看看韩国国内五家服务在用哪些方法。演示和测量脚本在 [jiji-hoon96/blog-labs](https://github.com/jiji-hoon96/blog-labs/tree/main/web-fonts)，部署好的页面可以在 [hooninedev-web-fonts.netlify.app](https://hooninedev-web-fonts.netlify.app/full-d-google/) 直接打开查看。

## 使用四种字体的页面

实验页面把本博客 [overlay-kit 一文](/260921)的正文连同代码块和引用原样搬了过来。之所以选一篇真实文章而不是简短示例，是因为韩文字体的传输量随页面所用字符的种类而变。字体按技术博客常见的配置分成四种。

![实验页面各部位的字体。标题 h1 和 h2 是 Noto Serif KR 700，首段是 Inter 300 和 Noto Sans KR 300，正文是 Inter 400 和 Noto Sans KR 400，粗体是 700，小标题 h3 是 Inter 500 和 Noto Sans KR 500，引用是 Inter italic 400，其中韩文为合成倾斜，代码是 JetBrains Mono 400，韩文注释用 Noto Sans KR](1.png?w=720)

正文是 `font-family: 'Inter', 'Noto Sans KR'`。拉丁字母和数字由 Inter 绘制，韩文由 Noto Sans KR 绘制，字重用 300、400、500、700 四种。标题只用宋体（明朝）系的 Noto Serif KR 700 一种，代码只用等宽的 JetBrains Mono 400 一种。引用用 Inter 的斜体绘制。Noto Sans KR 没有斜体，所以引用里的韩文由浏览器把字形倾斜合成。

按字体家族算是四个，算上字重和样式则是十一种字体。Inter 五种（300、400、500、700、斜体 400），Noto Sans KR 四种，其余两个各一种。

## 浏览器下载字体的规则

网页字体并不是在读取 CSS 的那一刻就下载。`@font-face` 规则只声明字体名、字重、文件地址以及该文件包含的字符范围（`unicode-range`），浏览器在绘制文本时，到需要这个字体的那一刻才请求文件。[CSS Fonts Level 4 规范](https://www.w3.org/TR/css-fonts-4/#font-face-loading)把这种延迟请求写成设计意图。同一规范的 [unicode-range 一节](https://www.w3.org/TR/css-fonts-4/#unicode-range-desc)规定，对范围外的字符既不得下载也不得使用该字体（must not）。

因此，只要把一种字体按字符范围拆成多个文件，并给每个文件写上 `unicode-range`，浏览器就只会下载包含页面所用字符的文件。这种只截取部分字符的文件叫作子集（subset），本文把这样拆出来的每一个文件称为分片。下面是本次实验中一个分片的规则。其中包含 `U+ac00`（가）、`U+c774`（이）、`U+d558`（하）这类常用韩文字，以及空格和部分拉丁字母。

```css
@font-face {
  font-family: 'Noto Sans KR';
  font-style: normal;
  font-weight: 300 700;
  font-display: swap;
  src: url(nskr-119.woff2) format('woff2');
  unicode-range: U+20-22, U+27-2a, U+2c-38, U+3a-3b, U+3f, U+41-47, U+4a-4c, U+4f-5d, U+61-7b, U+7d, U+a1, U+ab, U+ae, U+b7, U+bb, U+bf, U+2013-2014, U+201c-201d, U+2122, U+ac00, U+ace0, U+ae30, U+b2e4, U+b85c, U+b9ac, U+c0ac, U+c2a4, U+c2dc, U+c774, U+c778, U+c9c0, U+d558;
}
```

![子集的工作方式。把一种字体切成多个带有 unicode-range 的分片，页面只下载包含所用字符的几个分片](2.png?w=720)

在韩文字体上，这个差距必然很大。仅韩文音节就有 11,172 个，Noto Sans KR 连同汉字共收录 23,174 个字符。没有子集的话，为了绘制一篇文章就要把这些全部下载下来。

## 对比的五个页面

前面提到的方法中，先看格式和子集。笔者把同一个页面只改变字体交付方式做成五个版本，其中也包括直接使用 Google 已经拆好的分片的情况。五个版本的正文和 `font-family` 声明都一样，变化的只有 `fonts.css` 这一个文件以及它指向的字体文件。

起点是 Google Fonts CSS API。[Google Fonts 文档](https://developers.google.com/fonts/docs/technical_considerations)写道，这个 API 会返回适配请求浏览器的样式表。像 curl 这样无法被识别为浏览器的客户端请求时，每个字重返回一个 TTF 地址；最新版 Chrome 请求时，返回的是每个分片各带一个 `@font-face` 的 woff2 响应。如果从前一种响应里只摘出 TTF 地址并固定在 CSS 里，那么无论用哪个浏览器访问，拿到的都是 TTF。

- **A. TTF**: 把 API 返回给 curl 的 TTF 文件原样下载下来托管。与固定 TTF 地址的情况形态相同。
- **B. woff2**: 只把 A 的 TTF 转成 woff2。没有子集。
- **C. 静态分片**: 把 A 的 TTF 按 Google 为每个字体家族使用的字符范围切开，做成 woff2 分片。每个字重分别切。
- **D. Google 响应**: 把同一 API 返回给最新版 Chrome 的 CSS 和字体文件原样下载下来托管。每个分片都是包含多个字重的可变字体。
- **D-range**: 与 D 相同，但向 API 请求字重时不像 `wght@300;400;500;700` 那样逐一列出，而是像 `wght@300..700` 那样按范围请求。

A、B、C 从同一个 TTF 出发。从 A 到 B 只变了格式，从 B 到 C 只变了子集，所以可以分开看各自减少了多少。转换和切分使用的是处理字体文件的 Python 库 fontTools。不过 Google 的范围并没有覆盖字体包含的全部字符。Noto Sans KR 的 23,174 个字符中只覆盖了 17,655 个，缺的大多是罕用汉字。因此 C 包含的字符比 B 少，但这个页面用到的字符在四个字体家族中都落在范围内，所以对下载量没有影响。

五个版本都放在同一个 Netlify 站点上，从同一主机通过 HTTP/2 下载。D 也不是从 Google 服务器而是从同一站点下载，所以下载来源的差异不会混进结果。直接从 Google 服务器下载时的差异会在后面单独测量。所有文件都加上了 `Cache-Control: public, max-age=31536000, immutable`，让 CDN（把文件复制到离用户近的位置的缓存服务器）不必再询问源服务器就能返回文件。

## 各变体的字体传输量

先把五个版本的字体传输量并排列出。

| 变体 | 字体文件 | 字体传输量 | CSS 传输量 |
|---|---|---|---|
| A. TTF | 11 | 17,200 kB | 0.4 kB |
| B. woff2 | 11 | 12,045 kB | 0.4 kB |
| C. 静态分片 | 58 | 679 kB | 107 kB |
| D. Google 响应 | 28 | 579 kB | 107 kB |
| D-range | 28 | 579 kB | 43 kB |

从 A 到 C，字体传输量减少了 96%。下面按变体逐一在 Network 面板上看看这些数字出自 DevTools 的哪里。

### 固定 TTF 的 A

![A 变体的 DevTools Network 面板。1 是 Font 筛选器，2 是 Disable cache，3 是从 serif-normal-700.ttf 到 nskr-normal-500.ttf 共十一个 TTF 文件的名称，4 是 Size 列，serif 为 4,949 kB，四个 nskr 各为 2,811 kB 到 2,909 kB，inter 和 mono 约在 50 kB 到 150 kB 之间。5 是 Content-Encoding 列，全部为 br。6 是底部栏的 17,206 kB / 17,243 kB transferred，7 是 40,490 kB / 40,571 kB resources](3.png?w=720)

读面板之前先调好三项设置。打开 Font 筛选器(1)才会只剩字体请求，打开 Disable cache(2)才会在每次刷新时像首次访问的用户一样全部重新下载。Content-Encoding 列默认不显示，需要右键点击列标题，在 Response headers 里打开 Content-Encoding。

名称(3)的扩展名是 `.ttf`，每个字重和样式各一个文件，共十一个。看大小(4)，韩文字体文件每个有 2.8 MB 到 2.9 MB。因为不管页面有多少字，这个文件里都装着全部 23,174 个字符。

最大的文件不是正文字体，而是标题字体。仅 Noto Serif KR 700 一个就有 4,949 kB，解压后是 14 MB。这个页面用这个字体绘制的韩文，只有九个标题（一个 h1 和八个 h2）里的 50 个不同字符。

底部栏每项显示两个数字。在“17,206 kB / 17,243 kB transferred”(6)中，前一个值只合计匹配筛选器的请求，后一个值是整个页面。transferred 是经过网络的量，resources(7)是下载后解压的大小。两者相差两倍多，是因为 Content-Encoding(5)是表示 Brotli（Google 开发的压缩方式）的 `br`。TTF 文件本身没有压缩，所以 Netlify 用 Brotli 压缩后再发送。用户等待的是 transferred 这一项，所以本文的数值全部以 transferred 为准。

### 只改格式的 B

按照常听到的建议把 TTF 换成 woff2，能减少多少？B 就是这种情况。

![B 变体的同一面板。1 是名称以 woff2 结尾的十一个文件，2 是 Size 列，serif 为 3,215 kB，四个 nskr 各约 2,000 kB。3 是空着的 Content-Encoding 列，4 是底部栏的 12,045 kB / 12,082 kB transferred，5 是 12,037 kB / 12,118 kB resources](4.png?w=720)

17,200 kB 变成了 12,045 kB，减少了 30%。这次 Content-Encoding(3)是空的，transferred(4)和 resources(5)几乎相同。woff2 是在文件内部已经压缩过的格式，所以 Netlify 没有再压缩。

这 30% 并不是与未压缩文件相比的值。A 也是经 Brotli 压缩后传来的，所以剩下的差异来自压缩方式和压缩级别。根据 [W3C WOFF2 规范](https://www.w3.org/TR/WOFF2/)，woff2 先把字形数据转换成便于压缩的形式，再用 Brotli 压缩。可是 Netlify 对 TTF 施加的 Brotli 压缩级别较低。Brotli 的压缩级别可以在 0 到 11 之间选择，级别越高文件越小，但压缩耗时越长。同一个 Noto Sans KR 400 TTF，Netlify 以 2,866 kB 发送，与用级别 4 压缩的大小几乎相同。用最高级别 11 预先压缩是 2,475 kB，woff2 是 2,053 kB。服务器如何压缩 TTF，决定了换成 woff2 能减少多少。Google 的 gstatic 用 gzip 以 3,023 kB 发送同一个文件。

比较基准选错，这个数字就会被夸大。拿 A 的 resources 40,490 kB 与 B 比较，看起来像是减少了 70%，但用户从未下载过那么大的数据。反过来，如果自己的服务器不压缩就发送 TTF，用户就真的要下载 40 MB。是哪一种，在 Content-Encoding 列一眼就能看出来。

即便如此，B 为了绘制一篇文章仍要下载 12 MB。一个文件里装着全部字符，所以换了格式，下载的字符数也不变。

### 拆成子集的 C

C 把同一个 TTF 按 Google 使用的字符范围切开。Noto Sans KR 和 Noto Serif KR 是 124 个范围，Inter 是 7 个，JetBrains Mono 是 6 个。划分韩文范围的标准，Google Fonts 团队在 2018 年[宣布支持日文的文章](https://developers.googleblog.com/en/google-fonts-launches-japanese-support/)中一并公开了：把常用的 2,000 个字按频率顺序分成 20 个分片，其余按 Unicode 码位顺序分成 100 个分片。Google 的 CSS 里没有韩文分片的编号，所以笔者按 CSS 中出现的顺序从 0 号开始编号。0 号到 99 号是按码位划分的分片（CSS 中码位大的字符的分片先出现），100 号到 119 号是按频率划分的分片。最后再加上拉丁、扩展拉丁、西里尔、越南语四个分片，共 124 个。C 的文件名也沿用了这个编号。

C 的 CSS 中每个分片、每个字重各有一条规则，共 661 条。Noto Sans KR 是 124 个范围乘四个字重共 496 条，Noto Serif KR 是 124 条，Inter 是 7 个范围乘五种共 35 条，JetBrains Mono 是 6 条。

![C 变体的同一面板按名称排序。1 是 inter 的五个分片，斜体 400 和 300、400、500、700 各一个。下一行没有标记，是一个 mono 分片。2 是 nskr-normal-300 的五个分片，3 是 nskr-normal-400 的十九个分片，4 是 nskr-normal-500 的九个分片，5 是 nskr-normal-700 的十三个分片，6 是 serif-normal-700 的六个分片。7 是底部栏的 679 kB / 823 kB transferred](5.png?w=720)

661 条规则中只下载了 58 个文件，合计(7)为 679 kB，是 A 的 4%。文件名里带有字重，所以按名称排序就能一眼看出每个字重下载了几个分片。

正文字重 400 有 19 个分片(3)，最多；首段的 300 有 5 个(2)，小标题的 500 有 9 个(4)，粗体的 700 有 13 个(5)。大部分是装着常用字的 100 号段分片。也有像 400 的 56 号这样编号离得很远的分片。这个页面中落在 56 号范围里的字，只有“나눴다”中的“눴”一个字，为了这一个字下载了一个分片。

在 A 中有 4,949 kB 的标题字体，变成了 6 个分片(6)、113 kB。因为只下载了包含标题那 50 个字的分片。Inter 每个字重和样式各下载一个拉丁分片(1)，共五个。

Noto Sans KR 的拉丁分片一个也没有下载。因为空格、数字、英文字母全都由排在前面的 Inter 绘制了。在这次测量的 Chrome 中，`font-family` 的顺序连下载哪些文件都改变了。

把 woff2 转换和子集各自减少的量分开来看是这样的。

| 阶段 | 传输量 | 减少量 |
|---|---|---|
| A. TTF (Brotli) | 17,200,139 B | 基准 |
| B. woff2，无子集 | 12,045,102 B | 换成 woff2 减少了 5,155,037 B |
| C. woff2，子集 | 678,925 B | 拆成子集又减少了 11,366,177 B |

减少量的 69% 来自子集。这个比例是按先换 woff2、后拆子集的顺序计算的，是对 woff2 转换最有利的算法。如果先拆子集，woff2 要压缩的对象本身就变小了，子集所减少的量的占比会更大。

### 使用 Google 响应的 D

D 是 Google 实际返回给最新版 Chrome 的结果。范围与 C 相同，但文件数只有一半。

![D 变体的同一面板按名称排序。1 是 inter-italic-latin 和 inter-latin 两个。下一行没有标记，是一个 mono-latin。2 是 nskr-101 到 nskr-119 以及 nskr-56 共十九个，3 是 serif-114 到 serif-latin 共六个。4 是底部栏的 579 kB / 723 kB transferred](6.png?w=720)

差异出在 Noto Sans KR。C 每个字重分别下载分片，共 46 个，而 D 是 19 个(2)。因为 D 的分片是可变字体（variable font）。可变字体是把字重当作 `wght` 这条轴上的值来处理的字体。

![把部署好的 D 的 nskr-119.woff2 放进 Wakamai Fondue 的画面。1 是可变字体、只有一条轴的摘要，2 是文件名 nskr-119.woff2、大小 16 KB、格式 WOFF2，3 是 Variable axes 中的 wght 轴，最小值 100，最大值 900](7.png?w=720)

把部署好的 `nskr-119.woff2` 放进字体检查工具 [Wakamai Fondue](https://wakamaifondue.com/)，会显示为可变字体(1)，`wght` 轴上包含 100 到 900(3)。300、400、500、700 都是这之间的值，所以这一个 16 KB 的文件(2)就能绘制全部四个字重。不想安装工具的话，打开 Google 的 CSS 看看就行。如果四个字重不同的 `@font-face` 指向同一个文件地址，那就是可变文件。D 下载的 19 个分片，与 C 中字重 400 下载的 19 个分片编号完全相同。这说明用其他字重绘制的字符，全都和用 400 绘制的字符落在同一批分片里。

代价是 D 的单个分片比 C 大。同一个 119 号分片的传输量，C 的 400 是 9.0 kB，D 是 16.7 kB，约 1.9 倍。可变字体要多装绘制字重轴的数据，而且笔者用的 fontTools 与 Google 的制作流程也不同。所以单看 Noto Sans KR，文件数从 46 个大幅减到 19 个，字节却只从 441 kB 减到 370 kB，减少 16%。单个分片约大 1.9 倍，所以平均每个分片要被接近两个字重共用，可变分片才会下载得更少。

Inter 从五个变成了两个(1)。常规样式的四个字重合并成一个可变文件，斜体原本就只有 400 一个，所以仍是一个。这个斜体文件不是可变文件而是静态文件。因为只请求一个字重时，Google 会返回只包含该字重的静态文件。

出于同样的原因，标题字体(3)在 C 和 D 中几乎相同，都是 6 个分片、113 kB。这个页面只请求了 Noto Serif KR 的 700 一个字重。像本文四个字体家族这样有可变版本的字体，要请求两个以上字重才会返回可变文件，而且轴不会被裁成请求的范围，返回的是字体拥有的全部范围（Noto Serif KR 为 200 到 900）。JetBrains Mono 也只有 400 一个，所以是静态文件。

### 按范围请求字重的 D-range

D 和 D-range 下载的是同样的 28 个字体文件。连同不下载的分片在内，把两份 CSS 指向的 268 个文件逐一比对，连字节都相同。不同的只有 CSS。

![上为 D、下为 D-range 的同一面板打开 CSS 筛选器后的样子。1 是 D 的 fonts.css 大小 107 kB，2 是解压后的 429 kB。3 是 D-range 的 fonts.css 大小 43.1 kB，4 是解压后的 173 kB](8.png?w=720)

像 `wght@300;400;500;700` 这样逐一列出字重请求时，Google 会为每个字重各写一条指向同一文件的规则。仅 Noto Sans KR 一个就是 124 乘以四个字重，共 496 条。像 `wght@300..700` 这样按范围请求时，就像前面看到的代码那样，每个分片只返回一条写着 `font-weight: 300 700` 的规则。所以解压后的 CSS 从 429 kB 减到 173 kB(2, 4)，传输量从 107 kB 减到 43 kB(1, 3)。

不过这个传输量是 Netlify 压缩后发送的结果。Netlify 只压缩到解压后大小的四分之一左右就发送了，而把同一份 D 的 CSS 用 Brotli 预先压缩，即使用最低级别 0 也只有 41 kB。用最高级别 11 时，D 是 14.9 kB，D-range 是 14.3 kB。在级别 11 下差距缩小到 0.6 kB。因为反复出现相同字符串的规则很好压缩。范围请求确实减少的，与其说是传输量，不如说是浏览器需要读取的 CSS 的量。

## Fast 4G 下的字体到达时间

字节差这么多，时间会差多少？笔者用 DevTools 的 Fast 4G 条件把同一批部署重新测了一遍。看 [DevTools 源码](https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/core/sdk/NetworkManager.ts)，这个 preset 的基准值是延迟 60 ms、9 Mbps，实际应用时会乘以倍数，变成延迟 165 ms、下载 8.1 Mbps。测量也使用了这个实际应用值。时间从文档请求开始，到最后一个字体响应结束为止；每个变体用关闭缓存的新浏览器打开 9 次，取测量值的中位数。这个条件只模拟了每个请求的延迟和带宽，并不包含真实移动网络的丢包或手机 CPU。

![Fast 4G 下最后一个字体到达的时间。每个变体有 9 次测量的点和中位数柱。A 集中在 17.9 秒到 18.8 秒之间，中位数 18.5 秒；B 在 12.8 秒到 13.7 秒之间，13.2 秒。C 在 1.6 秒到 2.7 秒之间，2.4 秒；D 在 1.5 秒到 2.5 秒之间，2.1 秒；D-range 在 1.5 秒到 3.0 秒之间，2.2 秒](9.png?w=720)

A 是 18.5 秒，B 是 13.2 秒。这两个值接近字节除以带宽的结果。以 8.1 Mbps 下载 17.2 MB 要 17 秒，12.0 MB 要 12 秒。9 次测量集中在 1 秒以内，同一天另外分三次测，两个变体的中位数也在 0.3 秒以内一致。

有子集的 C、D、D-range 都在 2 秒左右。在带宽成为瓶颈的条件下，时间直接跟着字节走，所以子集减少的 11 秒比格式减少的 5 秒更大。

另一方面，C、D、D-range 之间的先后，这次测量无法确定。即使是同一个变体，每次也会在 1.5 秒到 3.0 秒之间波动，这个幅度比变体之间的差异还大。波动大多来自 Netlify 的 CDN。

10 月 27 日，笔者在同样条件下把同一个 D 又打开了 8 次，每次都截取了 Network 标签页。这次把响应头 `cache-status` 显示为一列。把其中两次并排放在一起是这样的。

![用 Fast 4G 打开两次 D 的 Network 面板。上面是字体来自 CDN 缓存的一次，1 是 Cache-Status 列中的 "Netlify Edge"; hit，2 是 Waterfall，每根条的绿色短、蓝色长。3 是底部栏的 DOMContentLoaded 373 ms、Load 1.42 s。下面是一路请求到源服务器的一次，4 是 "Netlify Edge"; fwd=miss; fwd-status=200; stored，5 是 Waterfall，大部分条是绿色。6 是 DOMContentLoaded 889 ms、Load 2.21 s](10.png?w=720)

上图(1)是字体全部来自 CDN 缓存的一次，所以标着 `hit`。下图(4)是 `fwd=miss`，即 CDN 上没有文件、要到源服务器走一趟的一次。这一次 HTML 和 CSS 也去了源服务器。Waterfall(2, 5)的条中，绿色是等待服务器首个响应的时间，蓝色是接收内容的时间。来自缓存的那次绿色短，28 个字体分享带宽，所以蓝色长。去了源服务器的那次，条的大部分是绿色。两张 Waterfall 各自按自己的总时长绘制，所以不能上下比较条的长度。时间要看底部栏(3, 6)来比较。HTML 从源服务器来得晚，DOMContentLoaded 从 373 ms 推迟到 889 ms，字体请求也相应推迟开始。这个页面最后一个字体结束的时间与 Load 相同，所以这个差距体现为 Load 的 1.42 秒和 2.21 秒。8 次中有 6 次全部来自缓存，在 1.39 秒到 1.44 秒之间结束；去了源服务器的 2 次是 2.21 秒和 4.00 秒。一个字体都没改，仅缓存状态就造成了比变体之间更大的差距。

10 月 26 日，笔者把预热 CDN 的次数增加到 6 次后重新测量。从响应头 `cache-status` 来看，字体不在 CDN 缓存中、去了源服务器的那些次，最后一个字体的首字节到达通常需要 370 ms 到 750 ms，有一次需要 1.3 秒。来自缓存的那些次中位数约为 210 ms。最慢的几次（2.3 秒到 3.3 秒）全都是字体、HTML、CSS 中有某一项去了源服务器的那些次。即使只保留字体全部来自缓存的那些次，每个变体仍有 0.2 秒到 0.8 秒的波动，而 C 在 9 次中只有 3 次属于这种情况。所以 C 和 D 的差异不用时间来说，只用字节和文件数来说。

首次绘制的时间点（FCP）这次测量也无法判定。中位数分别是 A 1.0 秒、B 1.0 秒、C 1.4 秒、D 1.1 秒、D-range 1.3 秒，但同一天的另一次测量中 C 是 1.0 秒，CSS 最小的 D-range 反而比 D 慢。变体之间的差异比每次之间的差异小。这个页面写了 `font-display: swap`，所以在字体到达之前先用其他字体绘制。因此 A 的用户也在 1 秒内就开始阅读，之后的 17 秒里，字体每到一个，文字就换成那个字体。

## 子集留下的代价

拆子集是答案，但并非没有代价。代价有五个。

第一，CSS 变大。A 的 `fonts.css` 传输量是 0.4 kB，而 C 和 D 是 107 kB。因为 661 条规则各自带着一个字符范围。解压后 C 是 434 kB，D 是 429 kB。用 `<link>` 引入的 CSS 在全部下载完之前浏览器不会绘制画面，所以必须比字体文件先下载。如果自托管，最好把这份 CSS 用高级别预先压缩。正如前面所见，这份 CSS 在 Netlify 发送的大小与用最高级别预先压缩的大小之间相差七倍。

第二，请求数增加。B 的 11 个文件在 C 中变成了 58 个。在 HTTP/2 及以上，一条连接上可以同时发送多个请求，多一个请求的代价很小，但不是 0。请求数超过多少时这个代价会超过字节上的节省，这次没有测量。

第三，各分片之间会产生重复数据。每个分片里都会重复装入字体的公共数据，所以下载的分片越多，这种重复就累积得越多。把 Google 范围覆盖的 Noto Sans KR 的 17,655 个字符切成一个 400 字重的文件是 1,302,420 B，而把同样的字符拆成 124 个分片后全部加起来是 1,823,312 B，大约多 40%。如果页面几乎要下载所有分片，就会比一个文件下载得更多。这个页面每个字重最多只下载了 124 个分片中的 19 个，离那种情况还很远。

第四，要部署的文件变多。这个演示的 C 文件夹里有 661 个分片。浏览器下载的是 58 个，但服务器上必须全部上传。浏览器下载的量和服务器上传的量要分开算。

第五，范围外的字符会用后备字体绘制。Google 的范围只覆盖 Noto Sans KR 23,174 个字符中的 17,655 个，所以剩下的 5,519 个字符一旦出现，就会用非网页字体的字体绘制。它们大多是罕用汉字，对这个页面没有影响，但如果是人名或地名里夹杂汉字的服务，就需要确认。

此外，在输入框或聊天这类文字后来才出现的画面中，新字符出现时，才会在那一刻下载该字符所在的分片。每篇文章用到的字符不同，所以跳到下一篇文章时也可能下载新的分片。首屏测得的传输量并不是全部。第二个页面会额外下载多少，这次没有测量。

## 应用子集的途径

如果使用 Google Fonts，直接引入 CSS API 即可。Next.js 的 `next/font/google` 也会在构建时取得这个响应，原样自托管。这两条途径的差异会在后面单独测量。

如果自托管，像 Fontsource（把开源字体打包成 npm 包的项目）这样的包会一并提供子集。截至 2026-10-22 最新的 `@fontsource/noto-sans-kr` 5.3.1 的 CSS 是与 Google 相同的、按 124 个范围拆分的 C 形态，这个结构从 5.2.8 开始。5.2.7 的默认 CSS 里没有韩文规则，韩文单独放在一个没有范围的文件里。如果需要可变分片，`@fontsource-variable/noto-sans-kr` 是在相同范围上只用一条 `font-weight: 100 900` 声明的 D-range 形态。稳妥的做法是打开所用版本的 CSS，确认 `unicode-range`。

如果是 Google 上没有的字体，就自己切。C 就是这种情况。取来 Google 的范围列表，用 fontTools 的 subset 模块（与 `pyftsubset` 同一个引擎）按范围切开并存为 woff2，再为每个分片生成写有 `unicode-range` 的规则。演示仓库 `scripts/` 里的构建脚本做的就是这件事。

在自己的服务上确认时，不要依赖文件名。本文的图为了便于阅读改过文件名，但实际的 Google 响应和 `next/font` 产物的文件名是哈希值，看不出字重和分片编号。应该打开 Font 筛选器，看文件数和大小。如果每个字重各有一个 MB 级别的文件，就是没有子集。如果分片有几十个且随字重数量成比例增加，就是静态分片；在 CSS 筛选器中打开 `fonts.css` 的响应，如果 `font-weight` 写成 `100 900` 这样的范围，就是可变分片。

## 从 Google 服务器下载的代价

下载量已经靠子集减下来了。剩下的方法几乎无法减少下载量，它们决定的是何时下载字体，以及下载期间画面是什么样子。其中第一个是从哪里下载字体。

前面的 D 是把 Google 的响应下载下来，从同一站点发送。实际服务中，很多时候是直接引用 Google 的 CSS 地址。这样浏览器会从 `fonts.googleapis.com` 下载 CSS，从 `fonts.gstatic.com` 下载字体，要连接的地方多了两个。为了看这个代价，笔者又做了两个直接向 Google 发出与 D 相同请求的页面。一个只放了 CSS 链接，另一个按照 fonts.google.com 提供的嵌入代码，在两处额外加了提前建立连接的 `preconnect`。

10 月 26 日在同样的 Fast 4G 条件下测量，取字体全部来自缓存的那些次的中位数。D 是 9 次中的 7 次，其余页面 9 次全部符合。与前面的图相比，测量日期和预热次数不同，所以 D 的值也不同（2.1 秒和 1.74 秒）。只在这张表内部比较。

只挑来自缓存的那些次，是对从同一站点下载一方有利的条件。流量少的网站 CDN 缓存经常是空的，就像前面看到的 C 那样，去源服务器的次数很多。这个代价由自托管承担。

| 页面 | 字体传输量 | 最后一个字体到达 |
|---|---|---|
| D，从同一站点下载 | 579 kB | 1.74 秒 |
| 直连 Google | 576 kB | 1.73 秒 |
| 直连 Google，添加 preconnect | 576 kB | 1.76 秒 |

三者的差异在 0.03 秒以内，比多次打开同一页面时产生的差异（0.2 秒到 0.8 秒）还小。连接的代价确实存在。首次连接 `fonts.googleapis.com`（包括建立加密连接的 TLS）每次约需 80 ms 到 190 ms，这段时间加在下载 CSS 之前。但在字体请求中，`fonts.gstatic.com` 的连接时间显示为 0。因为 Google 的 CSS 响应里带有 `Link: <https://fonts.gstatic.com>; rel=preconnect; crossorigin` 头，浏览器在下载 CSS 期间就提前打开了与字体服务器的连接。HTML 中加入的 `preconnect` 里，gstatic 那一行没有带来差异，看来也是同样的原因。googleapis 那一行也没有带来差异，但其原因，以及 googleapis 的连接时间为何没有体现在最后一个字体的到达时间上，笔者没有分开查明。

![从同一站点下载与直连 Google 时的连接顺序。从同一站点下载时，在一条站点连接上依次下载 HTML、CSS 和 28 个字体。直连 Google 时，下载 HTML 后新连接 googleapis 下载 CSS，下载 CSS 期间因 Link 头提前打开 gstatic 连接，然后下载 28 个字体](11.png?w=720)

不过，这张表把连接点增加的代价显得偏小。DevTools 的 Fast 4G 是对每个请求添加延迟的方式，建立连接的过程（DNS、TCP、TLS）不会被加上延迟。这次测量中，开着 Fast 4G 连接 Netlify 通常需要 147 ms 左右（其中 TLS 74 ms 左右），这就是笔者线路（首尔）本身的数值。[Lighthouse 的 throttling 文档](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md)也写道，按请求施加的延迟不如按数据包施加的准确。一次连接包含多次往返，所以往返时间越长的网络，多一个连接点的代价也越大。这个代价有多大，这次没有测量。

过去人们认为直连 Google 有一个好处：很多网站使用同一个 Google 字体地址，所以在别的网站已经下载过的字体可以从浏览器缓存中复用。Chrome 从 86 开始阻止了这种共享。根据 [Chrome 的缓存分区说明](https://developer.chrome.com/blog/http-cache-partitioning)，缓存键中除了资源地址，还包含顶级站点和框架所在的站点。也就是说，站点不同，即使地址相同也各用各的缓存。

实际上，即使是同一地址的字体，换了站点也会从头重新下载。笔者用同一个 Chrome 配置文件，在部署了直连 Google 页面的站点上打开两次，接着在笔者的本地服务器（另一个站点）上打开两次。在同一站点重新打开时，28 个字体全部来自缓存；换了站点后，同一地址的 28 个字体、576 kB 被重新下载。用关闭缓存分区的 Chrome（`--disable-features=SplitCacheByNetworkIsolationKey`）按同样顺序运行，换了站点后 28 个也全部来自缓存。现在的 Chrome 中，不存在跨站点共享字体的缓存。HTTP Archive 的 [2024 Web Almanac 字体章节](https://almanac.httparchive.org/en/2024/fonts)也写道，缓存分区让共享字体 CDN 的好处消失了，并指出只从自己站点发送字体的网站，按桌面端计算从 2022 年的 22% 增加到 2024 年的 28%。

## next/font 的 preload 与后备字体

Next.js 的 `next/font` 在构建阶段代为做出这个选择。构建时下载 Google 的 CSS 和字体并从自己的站点发送，对指定的字体进行 preload，并把字体到达前使用的后备字体大小调整到与网页字体一致。16.3.4 的加载器用 Chrome 104 的 User-Agent 获取 CSS，下载其中所有分片文件后只替换地址，所以 `unicode-range` 原样保留。2026-10-21 笔者用同样的 User-Agent 请求，得到了与 D 相同的规则和相同的文件。

笔者用同样的正文和同样的四个字体家族做了一个 Next.js 16.3.4 页面，导出为静态文件，放到同一站点上。Noto Sans KR 列出了四个字重，四个字体家族都是 `subsets: ['latin']`。Noto Sans KR 的 `subsets` 可填的值只有 cyrillic、latin、latin-ext、vietnamese，没有办法选择韩文。即便如此，韩文也不会缺失。`subsets` 只决定对哪些分片做 preload，韩文分片的 `@font-face` 全都留在 CSS 里。产物中有 268 个字体文件。

下载量为 631 kB，比 D 多 52 kB。它下载了这个页面用不到的 Noto Sans KR latin 分片（26 kB），而且 Inter 斜体以可变文件形式传来，比 D 的静态文件大 26 kB。在与前表相同的条件下，最后一个字体在 1.81 秒到达（7 次的中位数）。与表中的 D（1.74 秒）相差 0.07 秒，比多次打开时产生的差异小。`next/font` 在此之上增加的是 preload 和后备字体校正。

preload 没有作用于韩文分片。HTML 中的 preload 有 5 个，全都是 latin 分片。因为用 `next/font` 的 `subsets` 无法选择韩文分片。可以把 20 个频率分片这类每篇文章都会下载的分片直接写进 HTML 的 preload，但这次没有测量。而且这 5 个中，Noto Sans KR 的 latin 分片（25,804 B）对这个页面来说是不需要的文件。关闭 preload 构建时，这个文件根本不会被请求。正如前面所见，拉丁字符先由 Inter 绘制了。关闭 preload 的构建，最后一个字体在 1.87 秒到达，与 D 相差 0.13 秒。

后备字体校正只作用于拉丁字符。`next/font` 为每个字体生成 `Noto Sans KR Fallback` 这样的规则，用 `size-adjust` 和 `ascent-override` 把后备字体的大小调整到与网页字体一致。可是它的基础是 `local("Arial")`（Noto Serif KR 则是 Times New Roman）。Arial 没有韩文，所以韩文会落到没有校正的下一个后备字体。看看首次绘制刚完成时实际绘制正文段落的字体，拉丁字符已经是 Inter，而分片尚未到达的韩文是 macOS 的默认韩文字体 Apple SD Gothic Neo。这个值也可以在 DevTools Elements 面板 Computed 标签页最下方的 Rendered Fonts 中看到，测量时使用的是提供相同信息的 Chrome DevTools Protocol 的 `CSS.getPlatformFontsForNode`。

## 选择 next/font 的理由

看到这里，`next/font` 并没有让韩文页面变得更快。子集 Google 已经做好了，preload 和后备字体校正都不作用于韩文。尽管如此，它仍被广泛使用，是有别的原因的。

`next/font` 于 2022 年 10 月随 [Next.js 13](https://nextjs.org/blog/next-13) 首次推出，当时名为 `@next/font`。发布文章介绍说，这个工具通过消除外部网络请求兼顾隐私与性能，在构建时获取字体并自托管，并用 `size-adjust` 消除布局偏移。发布文章还特别强调，浏览器不会向 Google 发出任何请求。

隐私方面，同一年年初有一份德国判决。2022 年 1 月 20 日的[慕尼黑地方法院判决](https://www.gesetze-bayern.de/Content/Document/Y-300-Z-GRURRS-B-2022-N-612)（案号 3 O 17493/20）认定，网站在加载 Google Fonts 时未经同意将访客的 IP 地址传给 Google 属于违法，并判赔 100 欧元。判决以不连接 Google 服务器也能使用 Google Fonts 作为依据。自托管的话，这个问题就无从产生。

其余理由也与前面看到的内容相连。直连 Google 所能获得的共享缓存，在 Chrome 中已经消失。连接点增加的代价在这次测量中显得很小，但那是因为 Fast 4G 不对连接时间加延迟。而且，如果手动完成下载 Google 响应、替换地址、设置 preload、调整后备字体这些工作，就像本文的演示一样需要好几个脚本。`next/font` 把这些工作简化成一次函数调用。

## 字体来晚时的画面

`font-display` 决定字体到达前绘制什么。如果不写，默认值是 `auto`，根据 [web.dev 的字体文章](https://web.dev/articles/font-best-practices)，Chromium 系和 Firefox 此时会等待字体，最多 3 秒不绘制文字。Google 的 CSS 如果地址里不加 `display=swap`，返回的规则里也没有 `font-display`。到目前为止的页面都写了 `swap`：先用后备字体绘制，字体到达后再替换。替换时如果字宽和行高不同，段落就会偏移，把这种偏移累积测量的值就是 CLS（Cumulative Layout Shift）。

`swap` 的 D 系页面的 CLS 中位数为 0.018 到 0.020，单次最高到 0.024。远低于 [web.dev 的 CLS 文章](https://web.dev/articles/cls)定为“良好”标准的 0.1。偏移不是一次发生，而是分成多次发生。因为各分片到达的时间不同，首次绘制刚完成时，同一段落里会出现部分字符是 Noto Sans KR、其余是 Apple SD Gothic Neo 的情况。

`next/font` 关闭后备字体校正的构建与开启的构建，CLS 也是 0.017 和 0.018，相同。受校正作用的拉丁字符与偏移无关。只有关闭 preload 的构建是 0.009，约为一半，看起来是大的偏移从两次减为一次，原因没有确认。

笔者还测了 D 的文件保持不变、只改成 `font-display: optional` 的页面。CLS 在 9 次中全部为 0.0002 以下。代价是首次访问时，字体即使全部下载完，也一直用后备字体绘制到最后。韩文是 Apple SD Gothic Neo，拉丁字符是系统字体，另外打开三次首次访问也一样。在 [CSS Fonts 4 规范的 font-display 一节](https://www.w3.org/TR/css-fonts-4/#font-display-desc)中，`optional` 对于没能及时就绪、赶不上首次绘制的字体，在该页面中不予使用。这次测量的 Chrome 把字体下载到了最后，所以首次来访的用户只是下载了字体却看不到它。留在缓存中的字体可以在下次访问时使用。按 2024 Web Almanac 的桌面端数据，使用 `swap` 的网站约 44%，`optional` 不到 1%。

这个 CLS 是用 macOS 的后备字体测得的值。在 Windows 上后备字体是 Malgun Gothic（맑은 고딕），数值可能不同。`next/font` 调不了的韩文后备字体，也可以自己调。方法是以 `local("Apple SD Gothic Neo")` 或 `local("Malgun Gothic")` 为基础写一个 `@font-face`，加上 `size-adjust` 和 `ascent-override`，作为后备字体使用。这次没有测量。真实用户那里发生的偏移大小以及偏移最大的元素，用 `web-vitals` 库的 attribution 构建来收集，比实验室测量更准确。

## 韩国服务的字体

实际的服务是怎么做的？2026 年 10 月 26 日，笔者用 headless Chrome 以首次访问的方式打开几家韩国服务的首页，在不限速的网络下测量了字体传输量。每家各测 2 次，两次的差异在几百字节以内。

| 服务 | 字体 | 子集 | 字体文件 | 字体传输量 |
|---|---|---|---|---|
| MUSINSA | Pretendard，四个字重 | 无 | 4 | 3,279 kB |
| Toss | Toss Product Sans，四个字重 | 无 | 5 | 2,049 kB |
| Kakao 公司介绍 | Kakao 字体两种，各两个字重 | 无 | 4 | 1,395 kB |
| Kurly | Pretendard 可变字体 | 92 个分片 | 19 | 501 kB |
| Karrot（당근） | Pretendard 可变字体 | 92 个分片 | 10 | 262 kB |

![韩国服务首页首次访问字体传输量的柱状图。没有子集的 MUSINSA 3,279 kB、Toss 2,049 kB、Kakao 公司介绍 1,395 kB 为灰色，使用子集的 Kurly 501 kB、Karrot 262 kB 为蓝色](12.png?w=720)

没有子集的一方与本文的 B 处于相同状态：虽然是 woff2，但一个文件装着一个字重的全部字符。MUSINSA 的 Pretendard 一个字重就超过 800 kB。Toss 的五个文件中，四个是 Toss Product Sans 各字重的文件，剩下一个是 10 kB 的另一个字体。相反，Kurly 和 Karrot 使用把 Pretendard 可变字体拆成 92 个分片的 CSS，只下载包含页面所用字符的分片。用 Fast 4G 的 8.1 Mbps 来除，3,279 kB 约 3.2 秒，262 kB 约 0.3 秒。这不是测得的值而是计算值，但比本文测得的直连 Google、preload 带来的时间差大十倍以上。

这是只以首次访问测量首页一个页面得到的值，会随页面和时间点而变。每个字重一个文件的方式，下载一次后下次访问就从缓存中使用，所以对回访多的服务来说差距会变小。

也有没放进表里的。NAVER 正文用系统字体绘制，只在部分地方下载了一个 NanumSquare Neo 文件（389 kB）。外卖民族（Baemin）声明了 Pretendard，但首页并没有下载，只下载了一个自有字体文件（140 kB）。

## 先看子集的顺序

没有子集的字体，不管页面用多少字，每个文件都要下载全部字符。在这个使用四种字体的页面上，这个量用 TTF 是 17.2 MB，用 woff2 是 12.0 MB，在 Fast 4G 下最后一个字体到达分别需要 18.5 秒和 13.2 秒。拆成子集后，下载量就跟着页面所用的字符走。同一个页面变成了 0.6 MB、2 秒左右。

子集对韩文页面尤其重要，原因在于文件大小。换成 woff2 能减少三分之一左右，但这个页面的韩文字体每个字重仍剩 2 MB 到 3.2 MB。为了绘制几个标题而加入的一个宋体字体，比正文字体还大。

拆成子集之后的各种选择，这次测量无法用时间分出高下。静态分片与可变分片无法排出先后；直连 Google 还是从自己的站点发送，以及 preload、后备字体校正带来的差异，都比多次打开同一页面时产生的差异小。不过，Fast 4G 不对建立连接的时间加延迟，所以连接点增加的直连 Google 的代价，在这次测量中可能显得偏小。因此这些选择最好按别的标准来定。从隐私和缓存分区来看，自托管更好，而替你省去这些工作的工具就是 `next/font`。`font-display` 则只需决定是用 `swap` 接受小幅偏移，还是用 `optional` 在首次访问时显示后备字体。

也有这次没有比较的方法。减少所用字重和字体家族的数量，在没有子集时下载量会按减少的文件数相应减少。本博客也只用 400 和 700 两个字重。也可以不拆子集，用一个可变字体文件交付四个字重。这两种这次都没有测量。

还有没能确认的事情：在往返时间长的网络中多一个连接点带来的代价，用 Windows 的 Malgun Gothic 绘制时的 CLS，关闭 preload 后 CLS 减半的原因，跳到下一篇文章时新下载的分片量，以及来自缓存的那些次之间仍残留的波动的原因。笔者认为，这些都不足以推翻子集带来的差异。不过这是推论，不是测得的值。

韩国的大型服务中，也还有不拆子集、每个字重发送几百 kB 文件的。建议读到这篇文章的各位，也在自己服务的 Network 面板里用 Font 筛选器看一看有没有这样的文件。如果有，先看子集，再考虑 `next/font` 或 preload。

:::ref
- [docs] [MDN, unicode-range](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/unicode-range)
- [repo] [Fontsource](https://github.com/fontsource/fontsource)
- [docs] [fontTools, pyftsubset](https://fonttools.readthedocs.io/en/latest/subset/index.html)
:::
