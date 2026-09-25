---
emoji: 🛡️
title: '错误的传播'
seoTitle: "前端错误的传播路径，ErrorBoundary 与 throwOnError 接住的东西"
date: '2025-11-17'
updatedAt: '2026-09-24'
categories: 前端 React TanStack-Query 错误处理
description: '把同一个错误从七个位置抛出去，只有四个能到达 ErrorBoundary。这篇文章用官方文档和本地安装的源码确认编译期、渲染与生命周期、服务端数据、页面切换、外部库、事件与异步分别传播到哪里。'
keywords: "前端错误处理, 错误传播, React ErrorBoundary, ErrorBoundary 接不住的东西, startTransition 错误, unhandledrejection, window onerror, React 19 onCaughtError, TanStack Query throwOnError, useSuspenseQuery 错误, react-router loader ErrorBoundary, React.lazy 分块加载失败, fetch 不会因为 404 而 reject"
locale: zh-CN
translationOf: '251117'
sourceHash: 3f6e8fa00d3cc487b5caedfdc24f91ad33196ab0eb9c55899c052ad83bdee38c
---

这篇文章想聊聊**前端里的错误能往上走到哪里**。

画 `ErrorBoundary` 这件事很容易。在路由上放一个，每个页面都用 `ErrorBoundary` 包起来，图画完看不到空白。难的是知道那个 `ErrorBoundary` **实际接住了什么**。

标题里的「传播」指的是**抛出的错误往上走到哪个位置、由谁接住**。抛出的位置和接住的位置并不总是同一个，所以要分开数。

于是我决定数一遍。把同一个 `new Error('boom')` 只换位置抛七次，看它是到达 `ErrorBoundary`，还是直接越过 `ErrorBoundary` 去了别处。

下面的小组件就是那个实验。在左边选一个抛出的位置，虚线框里就会真的抛出那个错误。虚线框就是 `ErrorBoundary`，`ErrorBoundary` 接住的时候里面会变成 fallback。没被接住的看起来像什么都没发生，所以组件同时在 `window` 上监听 `error` 和 `unhandledrejection`，把它去了哪里写在下面。

:::widget-error-propagation
:::

七个里只有四个到达 `ErrorBoundary`。剩下三个明明是在 `ErrorBoundary` 内部抛出的，却照样穿过 `ErrorBoundary` 跑到了全局。

这篇文章按错误的种类逐个确认这个分叉是怎么产生的。编译期就结束的、渲染与生命周期里出现的、来自服务端数据的、页面切换时出现的、外部库抛出的，以及事件与异步里出现的。要查的是它们各自传播到哪里。**接住的位置要分成几层、怎么恢复，这里不讨论**。不了解传播路径就先画层，那些层会变成空盒子，所以顺序是这样安排的。

确认用了两种方式。库的行为不靠记忆，而是打开本地安装的源码来读；能靠抛出来确认的，就在上面的组件里真的跑一遍。


## ErrorBoundary

先把 `ErrorBoundary` 本身说准确。`ErrorBoundary` 就是**类组件的两个生命周期方法**，只是换了个名字来叫而已。

`react-error-boundary` 里也只有两个实现。

```js
static getDerivedStateFromError(e) { ... }
componentDidCatch(e, t) { ... }
```

React 官方文档把两个方法运行的时机分开了。`getDerivedStateFromError` 在**渲染阶段**运行，生成用来画 fallback 的状态；`componentDidCatch` 在**提交阶段**运行，负责日志这类副作用。不管哪一个，它们只接住**React 在树里接住并交过来的东西**。

所以 `ErrorBoundary` 接住什么，定义只有一条。**是不是从 React 能接住的位置抛出来的**。

React 文档也把接不住的那一侧写下来了。下面四种就是。

::::quote
:::translation
事件处理器、服务端渲染、`ErrorBoundary` 自身抛出的、异步代码(比如 `setTimeout` 或 `requestAnimationFrame` 的回调)。有一个例外，就是 `useTransition` 这个 Hook 返回的 `startTransition` 函数。在那个 transition 函数里抛出的错误，Error Boundary 会接住。
:::

:::original
Event handlers, Server side rendering, Errors thrown in the error boundary itself (rather than its children), Asynchronous code (e.g. `setTimeout` or `requestAnimationFrame` callbacks); an exception is the usage of the `startTransition` function returned by the `useTransition` Hook. Errors thrown inside the transition function are caught by error boundaries
:::
::::

上面组件的结果和这句话完全吻合。七个位置分成了两个到达点。

![左边纵向排着七个抛出的位置，右边有两个到达点。渲染中、useEffect 里、startTransition 里、lazy 的 import 被拒绝这四个用蓝色箭头指向 ErrorBoundary，onClick 处理器里、setTimeout 回调里、Promise 被拒绝这三个用灰色箭头指向 window](1.png?w=720)

`startTransition` 之所以是例外，是因为它内部的工作会经过 React 的调度器。React 亲手包住了那次执行，所以能接住并送回树里。同样的道理，`setTimeout` 接不住。那个回调运行的时候，React 已经不在那里了。

先要知道一件事。**函数组件做不出 `ErrorBoundary`**。

React 遇到抛出的错误时，会从那个位置朝父级往上走，寻找接住它的边界。负责这次遍历的 `throwException` 看的是每个 fiber 上挂的 `tag`，而它会停下来的值只有类组件和根两个。函数组件的 `tag` 不是这两个，所以查找就这么走过去了。**它当不了边界，不是因为没有 API，而是因为查找压根就不往里看**。

![横向排着四个方框。从左边起，函数组件 Child 和 FnBoundary 是 tag 0，类组件 ErrorBoundary 是 tag 1，根 HostRoot 是 tag 3。从 Child 出发的箭头经过 FnBoundary 在 ErrorBoundary 停下，继续通向 HostRoot 的线是虚线](2.png?w=720)

那个 `tag` 由有没有继承 `React.Component` 决定。所以把 `getDerivedStateFromError` 当作 `static` 挂到函数上也没有用。我挂上去跑了一遍，那个函数一次都没被调用，错误找不到边界一路走到根，React 把整棵树从画面上撤掉了。

所以装 `react-error-boundary` 并不是在补一个不存在的功能。6.1.6 的 `ErrorBoundary` 同样是继承 `Component` 的类，原样带着那两个方法。库做的事情是把那个类只写一次然后藏起来。


## 编译期就结束的东西

既然在数种类，就从最靠前的开始整理。类型错误。

只有它到不了用户手里。读了不存在的属性，或者参数类型对不上，构建就会卡住，卡住的代码不会发布。所以没有传播路径可追。**类型错误在这篇文章里缺席，不是因为不重要，而是因为它在运行时根本不存在**。

问题在后面。类型检查到底保证到**哪里**。

```ts
async function getComments(postId: string): Promise<Comment[]> {
  const res = await fetch(`/api/posts/${postId}/comments`)
  const data = await res.json()
  return data.comments
}
```

返回类型写着 `Promise<Comment[]>`，所以调用这个函数的所有代码都相信自己拿到的是数组。可是 `Response` 的 `json()` 在 TypeScript 5.9.3 的 `lib.dom.d.ts` 里是这么声明的。

```ts
json(): Promise<any>;
```

是 `any`。类型检查从这里断掉。服务端给的值编译器从来没看过，后面补上的类型参数或返回类型标注是**声明而不是检查**。没有人会替你插入在运行时核对这个声明的代码。

所以服务端用 `200` 返回 `{ commits: null }` 的时候，读 `commits.length` 的那一行会在渲染中抛出 `TypeError`。HTTP 是成功的，类型也通过了，画面却坏了。

**类型结束的位置，就是该放运行时检查的位置**。把这个检查放在哪里，决定了同一个失败走哪条路。在渲染里读着读着炸了，它就变成渲染错误去 `ErrorBoundary`；在接收数据的位置先检查再抛，它就变成那次请求的失败。下面的**渲染与生命周期**一节会讲这部分。


## 渲染与生命周期

在 React 树里抛出的东西，传播很简单。**最近的 `ErrorBoundary` 接住它**。

渲染中的异常属于这一类。上面的 `commits.length` 是一个，对以为是数组的值调用 `map` 也是一个。这一类除了抛出没别的可做，所以任何时候都会到达 `ErrorBoundary`。

在 `useEffect` 里抛出的也能接住。effect 是提交之后 React 直接执行的，所以能把那次执行包住。不过在 effect **里面调用的异步回调**就不一样了。

```tsx
useEffect(() => {
  throw new Error('boom')          // ErrorBoundary 가 받는다
}, [])

useEffect(() => {
  setTimeout(() => {
    throw new Error('boom')        // ErrorBoundary 를 지나친다
  }, 0)
}, [])
```

两段代码都在同一个 `useEffect` 里，传播路径却不同。**判断标准不是在不在 `ErrorBoundary` 里面，而是 React 有没有握着那次执行**。

这一类再记住一件事就够了。React 19 的开发模式控制台会给接住的错误加上组件名。跑组件的时候，渲染、effect 和 transition 都是 `The above error occurred in the <Thrower> component`，只有 `lazy` 是 `occurred in one of your React components`。`lazy` 在被拒绝的时刻还没有组件，写不出名字。只能看调用栈找位置的时候，这个差别就是线索。


## 服务端数据

从这里开始是做前端时必须处理的麻烦部分。原因是服务端的失败**不会自动变成错误**。

### fetch 不会因为服务端错误自己 reject

MDN 把这一点写得很清楚。

::::quote
:::translation
`fetch()` 的 promise 只有在请求本身失败时才会被拒绝，比如 URL 格式不正确或者发生了网络错误。服务端用表示错误的 HTTP 状态码(`404`、`504` 等)响应时，它不会被拒绝。
:::

:::original
A `fetch()` promise only rejects when the request fails, for example, because of a badly-formed request URL or a network error. A `fetch()` promise does not reject if the server responds with HTTP status codes that indicate errors (`404`, `504`, etc.).
:::
::::

也就是说只用 `fetch` 的话，`500` 的响应是一个**成功的 Promise**。因为没有抛出，`ErrorBoundary` 不知道，数据请求库也不知道。TanStack Query 的文档也点了这一条。要判定一次查询失败，`queryFn` 必须抛出或者返回被拒绝的 Promise，而 `axios` 会自己抛，`fetch` 不会。

所以把服务端的失败变成错误，是**得自己动手做的事**。

```ts
const response = await fetch('/todos/' + todoId)
if (!response.ok) {
  throw new Error('Network response was not ok')
}
```

没有这三行，这一节剩下的内容全都没有意义。没被抛出的东西哪里也不会传播。

### 一个失败分岔出的五条路

失败成为失败之后，下一个分叉就开始了。同一个 `500` 会因为**是怎么调用的**而散到五个地方。这里的基准是没动过任何选项的默认值。

**`useQuery` 不会抛出错误**。打开 `useQuery.js` 会发现 `throwOnError` 这个字符串压根就不存在。抛不抛是 `query-core` 的 `shouldThrowError` 决定的。

```js
function shouldThrowError(throwOnError, params) {
	if (typeof throwOnError === "function") return throwOnError(...params);
	return !!throwOnError;
}
```

没有值的话就是 `!!undefined`，所以是 `false`。于是失败只进到 `query.error` 里，组件正常渲染。外面的 `ErrorBoundary` 到最后都不知道轮到过自己。

**`useSuspenseQuery` 会抛，但不是每次都抛**。这个 hook 展开选项之后会覆盖 `throwOnError`。

```js
return useBaseQuery({
  ...options,
  enabled: true,
  suspense: true,
  throwOnError: defaultThrowOnError,
  placeholderData: void 0
}, QueryObserver, queryClient);
```

覆盖写在 `...options` 后面，所以**使用者传进来的 `throwOnError` 会被忽略**。而占据那个位置的默认判定，在 `suspense.js` 里只有一行。

```js
const defaultThrowOnError = (_error, query) => query.state.data === void 0;
```

**只要有可以展示的缓存就不抛**。实际工作中这个分支分岔的位置是后台的重新请求。第一次进来的用户缓存是空的，所以失败会去 `ErrorBoundary`，看到 fallback。已经在页面上的用户切到别的标签页再回来，重新请求跑起来并且失败了，这时缓存里还有旧数据，所以不抛。画面照样显示着旧值，自己不会变。

画面不坏通常是好的行为。只是**画面也不会告诉你**这件事是一起来的，知道了再选和不知道就挨着，是两回事。

**mutation 返回的两个函数都不会去 `ErrorBoundary`**。原因各不相同。打开 `useMutation.js`，其中一边直接把拒绝吞掉了。

```js
observer.mutate(args[0], args[1]).catch(noop);
```

这就是 `mutate`。同一个文件里 `mutateAsync` 把 `result.mutate` 原样导出，而那个 `result.mutate` 是 `mutationObserver.js` 用 `mutate: this.mutate` 放上去的，所以最后和上面那行包住的是同一个函数。**只有一边经过 `.catch(noop)`**。那个拒绝是在 `await` 的位置炸开，不是在渲染中抛出，所以这一边同样和 `ErrorBoundary` 无关。

**这并不是说 mutation 就永远和 `ErrorBoundary` 无关**。hook 的函数体里还有一个开关。

```js
if (result.error && shouldThrowError(observer.options.throwOnError, [result.error])) throw result.error;
```

给了 `throwOnError`，这一行就会**在渲染中**抛出，那时候它会去 `ErrorBoundary`。拿回来的两个函数够不到 `ErrorBoundary`，和 hook 不抛，是两回事。

![左边服务端的一次 500 伸出五条箭头，分别指向 useQuery、useSuspenseQuery、打开了 throwOnError 的 hook、mutate、mutateAsync，它们又各自指向 query.error、ErrorBoundary、ErrorBoundary、mutation.error、调用处的 catch。中间的两个 ErrorBoundary 用虚线框在一起，标注为 ErrorBoundary 接住的那两个](3.png?w=720)

整理一下，同一个 `500` 的到达点有五个。`query.error` 字段、`mutation.error` 字段、调用处的 `catch`，以及去 `ErrorBoundary` 的两种情况。去 `ErrorBoundary` 的这两个，是 `useSuspenseQuery` 在没有缓存时失败，以及打开了 `throwOnError`。**决定终点的不是失败的种类，而是调用的方式**。


## 页面切换

换页面时出现的失败分成两种。分开的标准是**在 React 树里面还是外面**。

### loader 在树的外面运行

路由的 `loader` 是渲染开始之前执行的函数。它不是 React 组件，所以 `getDerivedStateFromError` 和 `componentDidCatch` 都够不到。不管用 `react-error-boundary` 包多少层，那个 `ErrorBoundary` 都看不到 loader 的失败。

取而代之，路由自己另有一套 `ErrorBoundary` 体系。React Router 的文档是这么写的。

::::quote
:::translation
route module 会自动接住你代码里的错误，并渲染最近的 `ErrorBoundary`。
:::

:::original
route modules will automatically catch errors in your code and render the closest `ErrorBoundary`.
:::
::::

怎么挑最近的那一个，答案在源码里。`findNearestBoundary` 是这么挑的。

```js
function findNearestBoundary(matches, routeId) {
  let eligibleMatches = routeId ? matches.slice(0, matches.findIndex((m) => m.route.id === routeId) + 1) : [...matches];
  return eligibleMatches.reverse().find((m) => m.route.hasErrorBoundary === true) || matches[0];
}
```

它从后往前扫匹配到的路由，挑出第一个带 `ErrorBoundary` 的路由，没有的话就送到最前面的路由。**所以在下层路由再放一个 `ErrorBoundary` 不是重复劳动，而是在收窄 fallback 被画出来的范围**。

读的一侧也不一样。路由的 `ErrorBoundary` 不通过 props 拿错误，而是用 `useRouteError()` 直接取出来。是不是带着状态码，用 `isRouteErrorResponse(error)` 来分。这两个工具在 React 的 `ErrorBoundary` 上是没有的。

### lazy 的拒绝在树的里面

同样是页面切换，晚一点才拿到代码的那一侧正好相反。`lazy(() => import('./Tab'))` 的 `import()` 被拒绝时，React 会接住它并抛给**最近的 `ErrorBoundary`**。组件里第四个按钮走的就是这条路。

发布上线之后旧的分块文件就没了，而发布前就打开着的页面手里还拿着旧地址。在那个状态下要那段代码，`import()` 会被拒绝，Chrome 抛出 `TypeError: Failed to fetch dynamically imported module`。

这里还要再加一条。**`lazy` 会记住拒绝**。React 的 `lazyInitializer` 把结果记在 `payload` 上，被拒绝的话就改状态并把原因存起来。

```js
payload._status = 2;
payload._result = error;
```

在那之后，每次渲染这个组件都会走到最后那个分支。

```js
throw payload._result;
```

不会再 `import()` 一次。`lazy()` 的调用在模块顶层只发生过一次，那个 `payload` 在应用活着期间一直不变。**把 `ErrorBoundary` 复位重新挂载，回来的还是同一个错误**。这个失败只能靠重新加载页面来恢复，原因就在这里。

同样是页面切换，loader 的失败由路由接住，`lazy` 的失败由 React 接住。**在决定 `ErrorBoundary` 放在哪里之前不把这两个分开，其中一个就会无处可去**。


## ErrorBoundary 之外的全局处理器

`ErrorBoundary` 没接住的那三个去了哪里。去了**浏览器的全局处理器**。

从事件处理器和 `setTimeout` 回调里抛出的东西，最后会到 `window` 的 `error` 事件。Promise 的拒绝去的是另一个事件。MDN 的定义是这样的。

::::quote
:::translation
`unhandledrejection` 事件会在一个没有拒绝处理器的 JavaScript Promise 被拒绝时，发送到脚本的全局作用域。通常是 `window`，也可能是 `Worker`。
:::

:::original
The `unhandledrejection` event is sent to the global scope of a script when a JavaScript Promise that has no rejection handler is rejected; typically, this is the `window`, but may also be a `Worker`.
:::
::::

这两个是浏览器最后接住的地方。错误监控工具接住浏览器错误的位置，大多也在这里。

React 19 在树这一侧也多加了一个接住的位置，就是 `createRoot` 的选项。官方文档把三个分成这样。

| 选项 | 什么时候调用 |
|---|---|
| `onCaughtError` | React 在 Error Boundary 内部接住错误时 |
| `onUncaughtError` | 错误被抛出但 Error Boundary 没能接住时 |
| `onRecoverableError` | React 自己恢复过来时 |

接住和修好是两回事。**全局处理器接住了，并不等于画面恢复了**。就算 `onClick` 里抛出的错误被 `window` 接住并送到监控工具，那一刻用户的画面上看到的也只是按钮没有反应。上报和恢复是不同的工作。


## 结语

把前端的错误处理当成一份工具清单来背，窟窿会一直留着。`ErrorBoundary`、`throwOnError`、`useRouteError`、`lazy`、`unhandledrejection` 全都知道了也一样。不是因为不知道工具，而是因为**没数过什么会去哪里**。

这篇文章讲过的内容整理如下。

- `ErrorBoundary` 只接住 React 接住并交过来的东西。事件处理器和异步回调不在那个位置上。
- 类型检查在响应处结束。从 `json()` 返回 `any` 的那一点开始，是声明而不是检查。
- 服务端的失败不会自己变成错误。`fetch` 不会因为 `500` 而 reject，所以抛出这件事得自己做。
- 抛出之后，调用方式决定终点。同一个失败会去字段，也会去调用处，也会去 `ErrorBoundary`。
- 页面切换分成两边。loader 在树外面所以由路由接住，`lazy` 在树里面所以由 React 接住。
- `ErrorBoundary` 外面还有全局处理器。接是接得住，画面却不会恢复。

所以画 `ErrorBoundary` 之前要做的，不是挑一个组件来包。而是**把这个页面可能失败的位置全写出来，标出每一个属于上面六种里的哪一种**。没被标到的位置就是窟窿。

不妨看看现在你的页面上可能失败的位置有几个，其中几个能到达 `ErrorBoundary`，到不了的那些又去了哪里。

[下一篇](/251203)讲每个到达点用什么来接。要分成几层，一个失败要怎么处理它占掉的画面范围，以及要让 fallback 上的重试按钮真的能重试，还得一起解开什么。


:::ref
- [docs] [React，Component 的 Error Boundary](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [docs] [React，createRoot 的错误回调](https://react.dev/reference/react-dom/client/createRoot)
- [docs] [React, lazy](https://react.dev/reference/react/lazy)
- [docs] [React Router, Error Boundaries](https://reactrouter.com/how-to/error-boundary)
- [docs] [TanStack Query, Query Functions](https://tanstack.com/query/latest/docs/framework/react/guides/query-functions)
- [docs] [MDN, unhandledrejection](https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event)
- [docs] [MDN, fetch](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch)
- [docs] [axios, Error handling](https://axios.rest/pages/advanced/error-handling)
- [repo] [bvaughn/react-error-boundary](https://github.com/bvaughn/react-error-boundary)
:::
