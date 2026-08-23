---
emoji: 🧠
title: "状态管理"
seoTitle: "前端状态管理的判断力——局部、全局、服务端、表单、URL 等 7 类状态与 React 设计准则"
date: "2026-05-18"
categories: 前端 状态管理 React 架构
description: "状态管理被视为前端开发中最棘手的工作之一。本文将状态分为局部、全局、服务端、表单、URL、外部和守卫 7 类，并从 Single Source of Truth、消除不可能状态、State Colocation 等 4 个判断维度，梳理工具选择与状态建模的准则。"
keywords: "前端状态管理, React 状态管理, Zustand Jotai 对比, TanStack Query, Server State Client State, State Colocation, Single Source of Truth, React 19 useOptimistic"
locale: zh-CN
translationOf: '260518'
sourceHash: 7d2f8d18c54ae7f00c5922a4cb5cd7237792e4fce04be90a498fcdbaca0e3b41
---

这篇文章想聊一聊**状态管理（State Management）**。它不是一篇库的横向对比。相比判断哪个工具更好，本文更想梳理一种感觉：应该**如何看待**状态，又该在哪里**划定边界**。

如今，AI 工具（Claude、ChatGPT、Cursor、Gemini、Copilot）已经深度融入我们的工作。开发速度呈指数级提升，但坦率地说，我感觉服务的完成度并没有同步跟上。功能越多，随之增加的 bug 也越多，我们也越来越常听到“我不知道为什么会变成这样”。

开发越快，我们就越少逐行细看代码。正因如此，我认为我们更需要具备一种**能够为 AI 指明正确方向的基本功**。只有能发现 AI 生成代码中的问题，并重新引导它朝预期方向前进，才能守住交付质量。这些基本功可以包括从领域视角开发、抽象、TDD（Test-Driven Development，测试驱动开发）、善用库，以及建立性能优势等很多方面。

不过，每当我问前端同事以及其他 IT 岗位的同事“前端开发中最棘手的工作是什么？”时，听到最多的答案始终如一：**“管理状态流。”**

本文将梳理为什么状态流管理如此棘手，以及要想做好这件事，需要培养怎样的判断力与感觉。


## 什么是状态（State）

在正式展开之前，先从最基础的问题说起。我们所说的“状态”究竟是什么？

学习前端开发时，我常读 [hoseung.me](https://blog.hoseung.me/2021-12-05-state-management) 的文章。其中将状态定义为**“所有可能影响 UI 的数据”**。点赞数、购物车列表、模态框是否打开、输入值、当前登录用户的信息、当前选中的标签页、搜索结果、是否正在加载——这些全都是状态。

React 官方文档给出了更形式化的定义。页面标题就是 [“State: A Component's Memory”](https://react.dev/learn/state-a-components-memory)，展开来说，大致是指**“组件在多次渲染之间保留（retain）数据，并在数据更新时触发 React 重新渲染的机制”**。也就是说，这类数据不会随时间消失，会因某个事件而更新，并在更新时让 UI 重新绘制。还有一点需要指出：状态**按组件实例彼此隔离。** 即使页面上存在十个相同组件，它们也各自拥有独立状态。这个事实与后文“状态应该放在哪里”的讨论直接相关。

两种定义指向的是同一件事：**“会影响渲染，并随时间变化的值”**就是状态。不变的常量（constant）不是状态。构建时就固定下来的原始设计 token 不是状态，但由用户切换的深色模式是状态。（严格来说，值本身会根据深色/浅色主题这一状态完成 resolve，因此更准确的理解是，“主题选择”才是状态，token 则是映照该状态的镜子。）

这里还有一点需要明确：**并非所有状态都存在于组件中。** 有些状态存在 Cookie 中，有些存在 localStorage、sessionStorage 或 IndexedDB 中，还有些存在 URL 中。把服务端数据带到客户端并加以缓存，也会形成一种状态。浏览器自身维护的滚动位置和历史记录栈，在它们会决定应用行为时，也需要被当作状态处理。


## 为什么如此棘手

先简单想一想，处理状态为什么困难。创建需要的状态，把它传到需要的地方，再妥善处理更新与初始化，不就可以了吗？

把这个问题留在脑中，然后打开你正在开发的服务中的任意一个页面。

这个页面有多少个组件？即使是简单页面，也可能由少则几十、多则几百个组件组成一棵树。每个组件可能持有自己的状态，可能与兄弟组件共享状态，也可能从父组件接收状态。状态还会在页面之间迁移：有些状态刷新后必须保留，有些状态则应在关闭标签页时消失。

状态真正难以管理的原因就在这里：**我们无法一眼看清大量状态分别在哪里声明、如何更新，又在何时消亡。** 职责相似的组件越多，给状态命名以及追踪修改状态的代码就越困难。

于是，一张看不见的蛛网形成了。A 组件中的某次点击使 B 的数据失效，B 的失效又让 C 的 UI 关闭，C 关闭时表单输入随之消失。如果这种连锁关系没有在代码的任何地方明确表达，那么调试 bug 时，我们就只能在脑中重新画出这张蛛网。

那么，该如何整理这张蛛网？在我看来，第一步是意识到：**“状态有不同的种类。”**


## 并非所有状态都是同一种状态

[Kent C. Dodds](https://kentcdodds.com/blog/application-state-management-with-react) 将状态分为 **Server Cache**（服务端保存信息，客户端为便于快速访问而持有的副本）与 **UI State**（只存在于 UI 中，用于控制界面行为）。我们经常在把两者混为一谈时犯错。

[TanStack Query 官方文档](https://tanstack.com/query/latest/docs/framework/react/guides/does-this-replace-client-state)将 TanStack Query 定义为 Server State 库，用于管理服务端与客户端之间的异步工作；Redux、MobX、Zustand 等工具则被定义为 Client State 库。（它们虽然能够存储异步数据，但这样做效率不高。）

关键点很明确：**Server State 与 Client State 是不同的问题。** Server State 是异步的，可能被其他用户修改，并会随时间变得 stale。Client State 是同步的、受我们控制，并会在刷新后消失。（准确地说，页面 unload 时，**JavaScript 运行时会重新启动，heap 内存中的组件树及其状态会一并被回收。** 因此再次 mount 时，会从 `useState` 的初始值重新开始。）如果试图用同一种工具管理两者，就必须亲手实现缓存失效、后台刷新、乐观更新等模式。

在此基础上，我会更进一步，把前端状态分为**七个类别**。需要提前说明的是，这七类并不能沿单一维度整齐划分。存储位置、来源、生命周期和职责彼此交织，因此一个状态可能同时属于多个类别。请不要把它看作一张完美的分类表，而应把它理解为**决定如何管理状态时需要提出的一组问题**。

- **局部状态（Local State）** — 只在一个组件或较小子树中使用的状态
- **全局状态（Global State）** — 需要由整个应用共享的状态
- **服务端状态（Server State）** — 以服务器为 Single Source of Truth、客户端副本仅作为缓存的状态
- **表单状态（Form State）** — 用户输入期间暂时存在的状态
- **URL 状态（URL State）** — 位于地址栏中、可分享且刷新后仍保留的状态
- **外部状态（External State）** — 位于 React 外部的状态，如 Cookie、localStorage、sessionStorage 和 IndexedDB
- **状态守卫（State Guard）** — 根据状态组合阻止、允许或校验访问与操作的逻辑，而不是状态本身

除此之外，还有适合用状态机精细建模的工作流状态，以及基于 WebSocket 或 CRDT 的实时协作状态。

下面逐一说明为什么它们需要不同的工具，以及应以怎样的判断力来对待它们。


## 局部状态（Local State）

这是最简单的一类状态。它只在一个组件内使用，外部既不需要知道，也无权知道。例如模态框是否打开、切换按钮的 on/off、悬停状态、正在输入的搜索词。

```tsx
function SearchBox() {
  const [query, setQuery] = useState("");
  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

这些大家应该已经很熟悉了。但局部状态真正棘手的地方，是**“这个状态应该放在哪里”**这一位置决策。

[Kent C. Dodds 的 State Colocation](https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster)一文指出：**人们习惯于把状态“提升（lift up）”，却不擅长在代码发生变化后，重新把状态“就近放置（colocate）”。**

当兄弟组件需要共享同一状态时，提升状态是我们很自然的做法。既然两个兄弟组件要读取同一份数据，就把状态提升到共同父组件，再通过 props 向下传递。

问题出在兄弟组件不再需要该状态时。我们通常不会把状态重新**下移**到子组件中。结果，父组件积累了大量实际上与自身无关的状态，每次父组件重新渲染时，整棵子树也会随之重新渲染。

因此，处理局部状态的第一条判断准则是：**为了让代码更快、更简单，应让状态尽可能靠近使用它的代码。** 如果某个状态只被一个组件的某个子组件使用，父组件就没有理由持有它。把它移到该子组件内部，父组件也会因此变得更轻。


## 全局状态（Global State）

全局状态是需要在应用任意位置访问的状态。登录信息、主题、语言、通知（toast）等都可能属于这一类。

局部状态与全局状态的区别，并不只是“存在于哪里”。二者对**引用方式的承诺**不同。局部状态向代码承诺的是**“只在这个组件内部有意义”**；全局状态则向整个代码库发布一项承诺：**“应用中的任何位置，都可以用这个名字引用这个值。”** 这项承诺成本高昂，正是全局状态的本质。

创建一个全局状态，实际上就是为**整个应用增加一项隐式依赖**。


## 服务端状态（Server State）

把 API 返回的数据塞进 Client State，亲自用 boolean 管理加载与错误，做着做着便会产生疑问：**“为什么每次都在写同样的样板代码？”**

TanStack 的主要维护者 Tanner Linsley 曾表示：**“Client State 是同步且可预测的。Server State 是异步的，会被多个组件共享，必须谨慎处理缓存、后台刷新与错误状态。”** 也就是说，Server State 与 Client State **本质上是不同的物种**，不应使用同一种工具处理。

Server State 的棘手之处，不在于工具，而在于**数据的本质**。

客户端看到的数据属于服务端。客户端持有的只是**某一时刻的快照**。随着时间推移，这份数据会产生 staleness。它还是异步的，可能失败，并拥有 pending、error、success 等状态。

最重要的本质是：**响应无法保证按照请求发出的顺序返回。** 假设用户在搜索框中快速输入“react”。r → re → rea → reac → react 的请求会依次发出，但如果“react”的响应先到，随后“rea”的响应才到，页面最终显示的就会是“rea”的结果。要避免这类问题，每次都得手动编写 AbortController 或请求 ID 追踪逻辑，因此必须关注这种**并发风险（race conditions）**。


## 表单状态（Form State）

表单是一类微妙的状态。用户输入期间，它会剧烈变化；一旦提交，通常就会消失。它不会与其他地方共享，也（大多）没有需要保存的去处。

问题在于，这种“剧烈变化”代价不菲。如果每次按键都触发 React 重新渲染，那么在大型表单中，输入延迟会明显到可以被用户察觉。而且表单不只是“持有值”。**校验、dirty check、提交状态、错误信息、多步骤流程**等多种状态，会同时在一个表单内部运转。

像三步支付流程这样的多步骤表单，通常会被期待**“即使中途刷新，进度状态也能保留”**。如果只用 useState 保存表单值，刷新后所有内容都会丢失。更自然的做法是保存在 **sessionStorage**（标签页级临时存储）或 **URL**（可分享的步骤）中。也就是说，表单状态会根据生命周期要求，与**外部状态**或 **URL 状态**结合。


## URL 状态（URL State）

假设我们正在搜索页面中按分类、排序方式和页码进行筛选。如果用 useState 保存这些状态，会同时出现三个问题。

- 刷新后，所有筛选条件都会重置
- 即使把 URL 分享给朋友，对方看到的仍是没有应用筛选条件的页面
- 点击后退，也无法回到之前的筛选条件

解决这些问题时，**把状态放进 URL 是很自然的选择。** URL 本身就是一种无需额外成本的持久存储，天然支持刷新、分享和历史记录。

```
/products?category=shoes&sort=price-desc&page=2
```

这一行 URL 中已经包含了**“鞋类商品按价格降序排列后的第 2 页”**这一完整状态，无需再用 useState 单独保存。

那么，什么时候适合用 URL 管理状态？**URL 是公开接口。** 密码、认证 token、用户不愿让他人看到的临时备忘等信息，都不应放入 URL。此外，如果把变化过于频繁的值（每次输入都会变化的搜索词）直接写进 URL，历史记录栈就会被垃圾填满。这种情况下，应在 debounce 后再同步，仅在合适时使用 `push`，而对不应新增历史记录的更新使用 `replace`。

URL 中的值**始终是字符串**。数字、boolean、数组、对象都必须经过序列化与反序列化。并且 URL 必须遵循[百分号编码（percent-encoding）](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)规则，`&`、`=`、韩文、空格等字符都需要特殊处理。如果每次都手写这些逻辑，很快就会成为 bug 的温床。

```tsx
const params = new URLSearchParams(location.search);
const page = Number(params.get("page") ?? "1");
params.set("page", String(page + 1));
navigate(`?${params.toString()}`);

const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
```

[nuqs](https://nuqs.dev/) 之类的库通过*解析器（parser）*概念解决了这两个问题。`parseAsInteger`、`parseAsBoolean`、`parseAsJson` 等解析器统一负责序列化、反序列化与类型。它支持 Next.js（App/Pages Router）、React Router v6/v7、TanStack Router、Remix 等大多数环境。


那么，可以把任意多的状态都塞进 URL 吗？除了序列化和类型问题之外，还有最后一个约束需要注意。[RFC 7230](https://datatracker.ietf.org/doc/html/rfc7230) 并未规定精确上限，但建议“服务器至少应支持 8,000 个 octet（在网络或数据通信中，用于明确指代由 8 Bit 组成的 1 Byte 的单位）”。不同浏览器的限制也各不相同。现代浏览器大多允许 8KB 到数万字符，但**搜索引擎、社交媒体的 OG/分享处理，以及部分网关，可能在接近 2KB 时就截断内容**。因此，不要无限制地往 URL 中塞数据。只保留**可分享的核心筛选条件**，其余内容交给 sessionStorage 或服务端存储会更安全。


## 外部状态（External State）

React 只知道自身内部的状态，但我们的应用也在不断与 React 之外的世界交互。存在于那个世界中的状态，不受 React 生命周期约束，会独立存续，也会发生变化。这里所说的外部状态包括 **Cookie、localStorage、sessionStorage、IndexedDB**。

应该如何选择存储方式？我通常从**生命周期、容量、同步性、安全性**四个维度思考。

对于**认证 token**，[OWASP 的建议](https://owasp.org/www-community/HttpOnly)首选 **HttpOnly + Secure Cookie**。localStorage 可由 JavaScript 访问，因此**一旦暴露于 XSS，token 就会被直接窃取**。部分安全指南建议采用混合模式：**access token 放在内存中，refresh token 放在 HttpOnly Cookie 中**。需要持久保存、不敏感且不经常变化的数据，可以放在 localStorage；应随标签页关闭而消失的数据，则可以使用 sessionStorage。离线缓存、大体量数据和文件通常使用 IndexedDB。

Cookie 与 Web Storage（local/session）**只能存储字符串**。因此，要存入对象就必须经过 `JSON.stringify`/`JSON.parse`。但 JSON 存在局限。

```ts
JSON.stringify({ when: new Date() });
// → { "when": "2026-05-19T..." } — Date becomes a string

JSON.stringify({ map: new Map([["a", 1]]) });
// → { "map": {} } — Map is lost entirely

JSON.stringify({ value: undefined });
// → "{}" — the undefined field is omitted
```

`Date` 在 JSON 往返转换后会变成字符串，`Map`、`Set` 和 `undefined` 则可能丢失数据。默认情况下，`BigInt` 会让 `JSON.stringify` 抛出 `TypeError`，导致序列化直接失败。把对象存入外部存储时，必须始终留意**哪些类型可能消失、改变或导致序列化失败**，必要时应提供序列化适配器。

外部状态真正的难点是：**React 无法自动检测它的变化。** 即使向 localStorage 写入值，React 组件也不会重新渲染。解决这一问题通常有三种模式。

- **用自定义 hook（useLocalStorage）再封装一层，把外部状态同步为 React state。** 这种方式轻量，但如果自行实现，就必须处理多标签页、SSR、tearing 等各种边界情况。
- 使用 React 18 引入的 `useSyncExternalStore` hook，**“与 React 外部状态同步”。** 借此可以**确保并发渲染中不会发生 tearing。** 它是连接 localStorage、浏览器 API 与外部 store 的标准工具。
- Zustand 的 `persist` middleware、Jotai 的 `atomWithStorage` 等状态库，把外部存储集成作为一等能力提供，因此也可以直接使用已有的库。

这里再补充一条判断准则：**一旦把外部状态带入 React，同步责任就落到了我们身上。** 如果另一个标签页更新了它呢？如果服务端修改了 Cookie 呢？如果用户通过浏览器开发者工具直接修改 localStorage 呢？这些情况往往会成为最严重的 bug 温床。


## 状态守卫（State Guard）

最后一类稍有不同。它不是状态本身，而是**根据状态组合来阻止、允许或校验某个流程的逻辑**。

最常见的例子是**认证守卫（Auth Guard）**。

```tsx
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <Spinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}
```

这里，`isAuthenticated` 状态控制了路由流程，这就是守卫逻辑。守卫有很多种，包括认证守卫（是否已认证）、权限守卫（特定角色、权限）、流程守卫（进入分支）、校验守卫（启用步骤）等。

守卫逻辑很容易堆积在一个地方。常见的情况是，一个组件里同时写满了**“未登录就去登录页、无权限就去 403、购物车为空就去商品页、用户被封禁就显示封禁提示”**。守卫越臃肿，就越难调试究竟是哪个条件在哪里阻断了流程。

好的守卫**只检查一件事。** 组合则通过 Composition 完成。

```tsx
<AuthGuard>
  <RoleGuard role="admin">
    <FlowGuard require={["cartHasItems"]}>
      <CheckoutPage />
    </FlowGuard>
  </RoleGuard>
</AuthGuard>
```

每个守卫只作出一个决定，组合关系由树形结构负责。添加新守卫时，无需修改现有守卫。

处理守卫时，比“是否拦截”更需要仔细考虑的是：**拦截后把用户送到哪里，以及后续如何处理。** 只会拦截、没有 fallback 的守卫，最终只会留下白屏或无限 spinner。

最常见的 bug 是：**“在守卫的异步检查完成前，受保护内容会短暂闪现。”** 认证 token 校验、权限查询大多是异步操作，在此期间，`isAuthenticated` 会有一小段时间处于 `undefined` 或 `false`。**如果不显式处理加载状态，受保护页面就可能在这个间隙暴露，或用户可能被错误重定向到登录页。**

```tsx
// Ignores loading and handles only missing data => incorrect
if (!user) return <Navigate to="/login" />;

// Treat loading as a first-class state (early return) => correct
if (isLoading) return <Spinner />;
if (!user) return <Navigate to="/login" replace />;
return children;
```

编写权限守卫时，常见的模型有两种。

- **RBAC（Role-Based Access Control）**：按角色授予权限，例如“admin 可以查看所有用户信息”。它简单、快速，但随着角色不断细分，角色数量会爆炸式增长
- **ABAC（Attribute-Based Access Control）**：根据属性组合决定权限，例如“用户是该帖作者、与作者属于同一团队，或用户是 admin”。它表达能力强，但实现和调试更困难

如 [TanStack Router 的 RBAC 指南](https://tanstack.com/router/v1/docs/framework/react/how-to/setup-rbac)所示，推荐在路由层的 `beforeLoad` 中设置守卫。关键在于：**权限检查不应散落在代码各处，而应能表达为数据（角色/权限列表）**。这样一来，权限策略调整只需变更*数据*。


## 总结

总结一下。状态管理之所以困难，不是因为库难用，而是因为我们经常忘记：**状态有不同种类**，也容易忽略不同种类需要不同的工具与思考方式。

局部状态应尽量就近放置；面对全局状态，要再确认一次它是否真的需要全局；Server State 应作为缓存处理；表单应与领域分离；URL 应更积极地使用；外部存储需要明确意识到自身责任；守卫则应拆薄后进行组合。这就是处理七类状态的基本功。

而凌驾于这些具体做法之上的判断力，最终可以浓缩为四个问题。

- 这份数据的 Single Source of Truth 在哪里？
- 这是可以计算得到的值，还是确实必须存储的值？
- 这些状态的组合中，是否存在不可能的组合？
- 这个状态真的应该位于这里吗？

每次开发新页面、审查 PR、接收 AI 生成的代码时，都把这些问题问上一遍。我相信，这是培养判断力与感觉最可靠的方式。

正如开头所说，AI 会长久地留在我们身边。我们逐行查看代码的时间会越来越少。但越是如此，能够回答**“这个状态应该放在哪里？”**这类小问题的能力就越有价值。让 AI“在这里再加一个 useState”很容易；但那一行代码会在应用的蛛网上增添一根怎样的丝线，只有阅读代码的人凭借自己的判断力才能看清。

不存在唯一正确答案。但至少，**“不知道状态是什么就创建状态”**与**“意识到状态的种类和位置后再创建状态”**之间，有着明确的区别。希望读者下次写下一行 `useState` 之前，也能暂时停一下，问问自己：“它属于哪一类状态？”


### 参考资料

:::ref
- [docs] [React, Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure)
- [docs] [React, You Probably Don't Need Derived State](https://legacy.reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html)
- [docs] [XState](https://xstate.js.org/)
- [article] [Top 5 React State Management Tools in 2026](https://www.syncfusion.com/blogs/post/react-state-management-libraries)
:::
