---
emoji: 🧩
title: '从观测到判断'
seoTitle: 'Core Web Vitals 对 SEO 有多大作用？用 CrUX 与 Search Console 核实'
date: '2026-09-16'
updatedAt: '2026-09-19'
categories: 观测 前端 GA4 Search-Console
description: '整理浏览器测得的 Web Vitals 经过 CrUX、PageSpeed Insights、Search Console 时如何被层层筛选，以及 Google 关于排名的表述说到哪里为止。还收录了排名下降但点击增加的真实案例与重新查询的结果。'
keywords: 'CrUX 实测数据, PageSpeed Insights 实测数据, Search Console 核心网页指标报告, Core Web Vitals 对排名的影响, Search Console 查询与网页点击差异, 平均排名下降 点击增加, 抓取速度 5xx 429'
locale: zh-CN
translationOf: '260916'
sourceHash: d915902baa6fa137576867f6f888285a617345599d4169da18c7fb91ab7f72dc
---

这篇文章想聊聊在浏览器里测得的性能数据，是如何一路走到搜索和判断的。

这个系列的前三篇讲的都是我自己直接掌握的信号。[重新打开 Sentry](/260913) 看的是在服务器上悄无声息地失败的调用，[浏览器可观测性](/260914) 看的是网络与渲染，[浏览器的 CPU 与内存](/260915) 看的是主线程与内存。三篇里的数据，都是我自己埋下计测代码、从自己的存储里读出来的。

这一篇的数据性质不同。访问者浏览器里产生的值会被交给 Chrome 的统计管道，其结果再出现在 PageSpeed Insights 和 :term[Search Console]{key="search-console"} 里。统计谁的体验、积累到多少才展示、按什么单位归并，全都由 Google 决定。

所以这篇文章想回答的问题只有一个。**要把已经离开浏览器的数字用于判断，需要先确认什么？** 我的答案是：先为每个数字写下它的样本和聚合规则，不补充官方表述没有说的内容，并且把得出的结论换一个时间段重新测一遍。

## 我收集的 web_vitals

起点是我自己收集的 :term[RUM]{key="rum"}。正如在浏览器可观测性那篇里看到的，这个博客用 `web-vitals` 测量 LCP、INP、CLS、FCP、TTFB，并以 `web_vitals` 事件发送到 GA4。这里要重新审视的不是发送了哪些参数，而是**谁的体验进入了样本**。

这项收集的样本是**真正执行了 gtag.js 的浏览器**。事件先堆积在 `dataLayer` 里，gtag.js 加载后再消费这个队列，所以在脚本请求被拦截的环境中，测量值即使产生了也发不出去。反过来，即便不是 Chrome，只要 gtag.js 能运行、浏览器支持相应指标，也会进入样本。另外，由于 `reportSoftNavs: true`，通过客户端路由切换的页面也会被算作一次独立的页面体验。后面会看到，CrUX 对同一次访问的计法并不一样。

坦白说，写这篇文章时我没有重新查询 GA4 里积累的 `web_vitals` 数值。上一篇搁置的问题，也就是把 `metric_navigation_type` 注册为 GA4 的 custom dimension 后能否真正拆分查看，我同样没有确认。我试过用服务账号查询，但那个项目没有启用 Analytics Admin API。**能发送和能读取是两回事，这个博客目前只确认了前者。**

## CrUX 统计的用户

Google 在搜索这一侧看的 field data，不是来自我的 GA4，而是来自 Chrome User Experience Report（CrUX）。读 [CrUX 方法论文档](https://developer.chrome.com/docs/crux/methodology)就会发现，样本要经过三层条件的筛选。

第一层是用户条件。只有开启了使用情况统计信息发送、同步浏览记录、且没有设置同步密码短语的用户才会被纳入。平台是桌面版 Chrome 和 Android 版 Chrome，**iOS 上的 Chrome、Android WebView，以及 Edge 等其他 Chromium 浏览器都不在其中。** 满足这些条件的用户占全体的百分之多少，并未公开。

第二层是页面条件。页面必须按照与搜索引擎相同的标准可被公开发现。重定向后不是 200 的页面，或带有 `noindex` 的页面，都没有资格。此外还必须超过最低访问者数量，这个数字没有公开，页面和 origin 适用同一个值。

第三层是聚合方式。查询字符串和片段会被去掉，合并为同一个页面。而且文档明确写道，SPA 中由 JavaScript 完成的路由切换，即使在用户看来是新页面，**也会归入最初加载的那一个页面的体验**。这与我的 RUM 单独统计 soft navigation 的做法正好相反。[Chrome 团队的 soft navigation 文档](https://developer.chrome.com/docs/web-platform/soft-navigations)也写道，soft navigation 将如何报告给 CrUX 还没有定下来。

把这些条件套到我的博客上，就会得出具体的结果。2026 年 9 月 11 日，我把只有一篇文章的 126 个分类页面改成了 `noindex, follow`。这些页面现在已经没有资格进入页面级 CrUX。那么它们还会留在 origin 级吗？文档的回答在同一个页面里出现了分歧。Origin 一节写的是，只要 origin 可被发现，就会不论单个页面是否可被发现，把所有页面的体验合并到 origin 级；而同一文档 Eligibility 一节的开头却写着，不满足 Page 条件的体验也不会进入 origin 级数据。我没有找到办法确认哪一种才是实际行为。**所以我在这里写明：改为 noindex 的分类页访问是否仍留在 origin 值里，我不知道。**

以上是我从文档中确认的规则。关键在于，**hooninedev.com 是否超过了最低访问者数量，我并不知道。** 既然门槛不公开，就只能直接去查，而这个尝试在下一节碰了壁。

## PageSpeed Insights 的两种数字

PageSpeed Insights 在同一个界面上展示两种性质不同的数字。根据[官方说明](https://developers.google.com/speed/docs/insights/v5/about)，lab 数据是 Lighthouse 模拟的一次加载，field 数据是 CrUX 最近 28 天的数据。lab 是一组固定设备和网络条件下的结果，field 则是各种环境下真实用户的记录，所以文档也写道，lab 分数好并不保证实际体验好。

field 这边有一条回退规则。页面级数据不足时会降到 origin 级，如果 origin 也不足，就完全无法显示 field 数据。

我曾尝试通过 PSI API 获取这个博客的 field 数据。2026-09-16T08:45:51Z 以移动端请求 `/260914` 时返回了 HTTP 429，2026-09-16T09:11:17Z 再用首页（`/`）请求一次，还是同样的 429。两次的响应正文都是 `Quota exceeded for quota metric 'Queries' and limit 'Queries per day'`。看起来是因为没带 API 密钥调用，撞上了共享配额。**所以这篇文章里没有这个博客的 CrUX field 值。** CrUX API 需要 API 密钥，而我的环境里只有用于 Search Console 的服务账号，所以没有调用。

同一时间，用本地 Lighthouse 测量 `/260914` 则毫无问题。**lab 值随时都能生成，但 field 值只有在访问者数量和资格条件都满足时才存在。** 我的 RUM 里积累了数值，并不意味着 CrUX 里就有值。

## Search Console 的 URL 组

最后一个环节是 Search Console 的 Core Web Vitals 报告。[报告的帮助文档](https://support.google.com/webmasters/answer/9205520)说明数据来自 CrUX，并在其上又叠加了几层规则。

- 把相似的页面归为 **URL group**，组的状态取决于表现最差的指标。
- LCP 和 CLS **两者都**达到数据量标准，组才会出现在报告中。组的数据不足时，会归入上一级的 origin 组显示；origin 组也不足时，就会被排除。
- **只显示已编入索引的 URL**，而且是样本，不是完整列表。
- "No data available" 的意思是该资源是新建的，或者该设备类型的 CrUX 数据不足。

把四个环节串起来，就能看到样本缩小的顺序。RUM 统计 gtag.js 运行过的访问；CrUX 只留下其中有资格的 Chrome 用户，以及可被发现且足够热门的页面；PSI 按页面级或 origin 级展示这些数据；Search Console 则把已编入索引的 URL 归组，只留下超过数据量标准的部分。每个环节的筛选规则都不同，所以**同一个页面的 LCP 在四个地方显示为不同的值，不是错误，而是正常现象。**

我的收集脚本（`scripts/fetch-gsc.js`）只获取 Search Analytics。所以这个博客的 Core Web Vitals 报告现在处于什么状态，这篇文章没有确认。既然存在 origin 组这一回退，也不能仅凭流量小就断定是 "No data available"。在打开报告之前，我不知道。

## 排名表述的边界

既然 field 数据会被这样层层筛选，下一个问题就是这些数据在搜索排名中被用到什么程度。这个话题最容易被夸大，所以我原样引用 Google Search Central [page experience 文档](https://developers.google.com/search/docs/appearance/page-experience)的原文。文档采用 FAQ 形式，对于是否存在单一的 page experience 信号用于排名这个问题，它首先这样回答。

> There is no single signal. Our core ranking systems look at a variety of signals that align with overall page experience.

意思是并不存在 page experience 分数这样的单一信号。紧接着的问题是 page experience 的哪些方面被用于排名，回答如下。

> Core Web Vitals are used by our ranking systems. We recommend site owners achieve good Core Web Vitals for success with Search and to ensure a great user experience generally. Keep in mind that getting good results in reports like Search Console's Core Web Vitals report or third-party tools doesn't guarantee that your pages will rank at the top of Google Search results; there's more to great page experience than Core Web Vitals scores alone.

原文确定的是 Core Web Vitals 被排名系统使用这一事实，并且马上划清界限：报告结果好并不保证排在前列。同一个回答接着说，仅为了 SEO 去追求满分可能不是利用时间的好办法，并写明 Core Web Vitals 以外的 page experience 要素不会直接提升排名。

我更看重的是**这份文档没有说的内容**。权重有多大、跨过阈值的那一刻是否就产生效果、从 needs improvement 变成 good 排名会变动多少，哪里都没有写。所以“改进了 Core Web Vitals，排名就上去了”这句话无法用官方文档来支撑，在这个博客上更是如此。正如前面所见，这个博客连 field 值本身都没能确认。

## 抓取看到的服务器响应

在官方文档中，性能与搜索明确挂钩的地方，反而是抓取。不过这说的也不是排名，而是抓取速度和编入索引。

Google 的 [crawl budget 指南](https://developers.google.com/search/docs/crawling-indexing/large-site-managing-crawl-budget)首先缩小了适用对象：拥有 100 万个以上唯一页面且大约每周变化一次的网站，拥有 1 万个以上唯一页面且每天变化的网站，或者有大量 URL 被 Search Console 归类为“已发现 - 尚未编入索引”的网站。原文直接写道，如果网站没有很多快速变化的页面，或者页面在发布当天就会被抓取，就不需要读这份指南。截至 2026 年 9 月 16 日，sitemap 中有 186 个 URL 的这个博客不在适用范围内。

即便如此，指南里的抓取容量规则还是值得了解。响应时间稳定或变快，上限就会提高；变慢或返回 5xx、429，上限就会降低。[HTTP 状态码文档](https://developers.google.com/search/docs/crawling-indexing/http-network-errors)把后果写得更具体。5xx 和 429 会让抓取工具暂时放慢。已编入索引的 URL 会被保留，但如果持续下去，最终会从索引中移除。429 以外的 4xx 不影响抓取速度。这里必须准确区分路径。长期持续的 5xx 是通往**被移出索引**的路径，而说它是拉低排名的信号的官方表述，我没有找到。

这个博客最大的服务器事故是 JIHOON-BLOG-2，GA Data API 调用挂起了 65 秒以上。响应是 200。现在调用 `src/lib/google-analytics.ts` 的只有 `/api/analytics` 路由，但 8 月时情况不同。当时 GA 调用再次卡住的 JIHOON-BLOG-8，最后一个事件的 transaction 是首页（`GET /`），现在还能查到的 10 个事件中，2 个是 `GET /`，8 个的 transaction 为空。也就是说，在会被抓取的首页请求中，GA 调用也卡住过。但这是否影响了抓取，我不知道，因为写这篇文章时我没有打开 Crawl Stats 报告。**没有确认过的关联，就不去关联。**

## page 与 query 的点击差异

现在换个方向，看看 Search Console 返回的搜索数据。这是我每周以 CSV 形式获取、实际用来修改标题和描述的数据。

![通过 Search Console API 收集的两个 28 天区间里，page 维度的点击合计为 47 次，而 query 维度的点击合计只有 8 次和 9 次](1.png?w=720)

把 2026 年 9 月 11 日获取的 CSV 按维度相加，数字对不上。最近 28 天（8 月 12 日至 9 月 8 日）page 维度的点击合计为 47 次，而 query 维度的点击合计为 8 次。之前 28 天（7 月 15 日至 8 月 11 日）也是 47 次和 9 次。两个区间差距一样大，所以这不是一次偶然，而是结构性的。

我最先怀疑的是行数限制。[Search Analytics API 文档](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)写道，它不保证返回所有行，而是返回排在前面的行。但我的脚本用 `rowLimit: 1000` 请求，返回的 query 行分别是 128 行和 66 行。**没有触及上限，所以截断不是原因。**

剩下的解释有两个，都在 [Search Console 帮助文档](https://support.google.com/webmasters/answer/17010575)里。一个是匿名化。极少被搜索的查询出于隐私保护会从查询表中排除，只计入总合计。另一个是[聚合单位](https://support.google.com/webmasters/answer/7576553)。query 维度按资源统计。按照[资源级聚合说明](https://support.google.com/webmasters/answer/17011364)中的例子，一个用户先后点击同一网站的两个链接，也只算 1 次点击。page 维度按 URL 统计，同样的行为就变成 2 次点击。

所以这两个合计从一开始就不是按同一规则得出的数字。有一个诱惑值得记下来：最近 28 天里有点击的查询共六个，其中五个是 "eslint vs biome"、"biome vs prettier" 这类 Biome 对比型查询。这五个查询的点击加起来是 6 次，恰好 Biome 文章韩语 URL 的 page 点击也是 6 次。看起来严丝合缝，但**不能因为两个聚合规则不同的数字相等，就把它们联系起来。** query 数据不应被读成流量的拆分，而应被读成窥见搜索意图的样本。

## 排名下降了，点击却增加了

我确实用这些搜索数据做过一次判断。[Biome 能取代 ESLint 和 Prettier 吗？](/241201)是我在 2024 年 12 月写的文章，相对于展示次数，点击明显偏少。于是在 2026 年 6 月 11 日，我按照实际搜索查询的形式，给它加上了以 "Biome vs ESLint vs Prettier" 开头的 `seoTitle`。

改完标题后收集的 28 天对比中，这篇文章的数字是这样变化的。展示次数从 230 次降到 204 次，减少了 11%，平均排名从第 8.9 位退到第 11.6 位。只看这两个指标，这是一篇变差了的文章。但点击从 2 次增加到 13 次，CTR 从 0.87% 变成了 6.37%。

这四个数字是当时查询到的值。`.gsc-data/` 每次收集都会被覆盖，所以当时的 CSV 现在不在仓库里，我也没有记下确切的收集日期。能确认的只是：8 月 18 日的提交里包含一份 8 月 16 日的草稿快照，其中已经有这些数字。

![在 Search Console 中 Biome 文章的 28 天对比里，展示次数和平均排名变差了，但点击次数和点击率大幅上升](2.png?w=720)

先泼点冷水才算诚实。这些数字并不能证明改标题的效果。page 维度的平均排名，是每次展示时记录的该页面最高位置的平均值，所以只要那些排在靠前却没人点击的展示消失，排名就会变差、CTR 就会上升。查询构成和季节性在不同时段也不一样。增加的点击绝对量是 28 天 11 次。按倍数看很大，按绝对量看很小。

尽管如此，还是有东西留下来。如果把排名当作成果，这是一篇需要修改的文章；如果把实际流量当作成果，这是一篇变好了的文章。**选什么作为结果指标，会改变同一份数据的结论。** 如果我只看了排名下降，恐怕会把一篇刚开始好转的文章又大改一遍。

### 9 月重新查询的数字

写这篇文章时，我又确认了同一篇文章现在的状态。在 2026 年 9 月 11 日收集的 CSV 里，韩语 URL `/241201` 的情况如下。

| 区间 | 展示 | 点击 | CTR | 平均排名 |
|---|---|---|---|---|
| 之前 28 天（7 月 15 日至 8 月 11 日） | 211 | 11 | 5.21% | 14.5 |
| 最近 28 天（8 月 12 日至 9 月 8 日） | 185 | 6 | 3.24% | 20.8 |

把前面的两个值（8.9、11.6）和这份 CSV 的两个值（14.5、20.8）按收集顺序排列，平均排名整个夏天都在下滑。点击则是 13 次之后 11 次、6 次。前一次对比的最近区间和 9 月收集的之前区间可能有重叠，所以很难把 13 次到 11 次读成下降，但最近区间的 6 次明显是降下来的数字。“排名下降了，点击却增加了”这个故事在第一次对比中最鲜明，而下一个区间动摇了它。

即便如此，前一节的结论并没有被推翻。6 次点击和 3.24% 的 CTR，仍然高于第一次对比的之前区间（2 次，0.87%）。只是多了一条教训。不只是指标的选择，**对比时段的选择也会改变结论。** 用一次 28 天对比就把故事讲圆，下一个 28 天就会把它打破。

另外，最近区间里新加入了我在 8 月 17 日提交的这篇文章的五个翻译版本。英文版 `/en/241201` 展示 84 次、点击 0 次，中文版展示 12 次、点击 1 次。翻译版是否分走了韩语 URL 的展示，平均排名为什么持续下滑，我还不知道。在确认之前，先作为未解决的问题搁着。

## 叠在同一时段的变更

没有给 Biome 文章赋予因果关系，并不只是出于谨慎。这个博客确实存在无法分离因果的条件。

仅 2026 年 9 月 11 日一天，就上线了六项与搜索相关的变更，包括恢复 hreflang、重写 48 个标题、修复 OG 图片、把 126 个分类页设为 noindex；到 16 日又接连进行了 hreflang 的追加修复、IndexNow 的引入、被截断的标题和描述的重写，以及新文章的发布。这篇文章的重写也落在同一时段。

9 月 11 日我留下了一份基准线文档。截至当时的最近 28 天，英文文章页面展示 892 次、点击 0 次，我决定在 10 月初看看这个数字会不会变化。但即使 10 月英文点击增加了，我也无法挑出唯一的原因。可能是 hreflang 修复，可能是 9 月 11 日的标题重写，也可能是 9 月 16 日的截断修复。何况基准线数据里已经有一个反例：被截断的标题只有 1 个的 zh-CN，以 7 次点击成为非韩语语言版本中点击最多的，这很难让人把标题截断看作原因。**所以在 10 月的对比中，我决定只读方向，不主张各项变更各自的贡献。**

## 先为每个数字写下样本和规则

如果说前三篇展示的是服务器上悄无声息的失败、访问者等待的时间，以及这段等待产生的位置，那么这一篇的数据，就是这些体验离开浏览器、经过别人的规则筛选后的结果。所以结论也稍微更保守一些。field 数据经过 RUM、CrUX、PSI、Search Console，在每个环节按不同规则缩减，在这个博客这样的小网站上，可能根本留不到最后。Google 关于排名的表述停在 Core Web Vitals 会被使用这一点上，抓取文档停在慢响应和 5xx 会影响抓取与编入索引这一点上。Search Console 的 page 合计和 query 合计是按不同规则统计的数字，所以加不到一起。**为每个数字先写下统计了谁、用的是什么规则，并在官方表述停下的地方一起停下。** 把观测变成判断，大部分工作就是这两件事。

10 月我也打算在对比基准线和新 CSV 时只读方向。如果一路读完这个系列的你，下次要根据仪表盘上的某个数字做决定，建议先用一行写下这个数字统计了谁、按什么规则统计。然后在一个月后换一个时间段，把这个结论重新查询一遍。

:::ref
- [docs] [web.dev, Why lab and field data can be different](https://web.dev/articles/lab-and-field-data-differences)
- [docs] [Google Search Central, Understanding Core Web Vitals and Google search results](https://developers.google.com/search/docs/appearance/core-web-vitals)
:::
