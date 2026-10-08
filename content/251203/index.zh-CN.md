---
emoji: 🧱
title: 'ErrorBoundary 放在哪里'
seoTitle: "ErrorBoundary 放在哪里：按路由、屏幕与区域划分的标准"
date: '2025-12-03'
updatedAt: "2026-10-08"
categories: 前端 React TanStack-Query 错误处理
description: "在使用 React Router 与 TanStack Query 的页面里，用已安装的源码核对 ErrorBoundary 该放几个、放在哪里的标准：路由、屏幕、区域各自接收的错误与撤回方式，统一 fallback 的方法，以及重试条件。"
keywords: "ErrorBoundary 放在哪里, 嵌套路由 ErrorBoundary, ErrorBoundary 设计, fallbackRender, useRouteError, revalidate, useSuspenseQuery 错误处理, TanStack Query retry 条件"
locale: zh-CN
translationOf: '251203'
sourceHash: 16f5ae7317fc183ba39c02ce385d4e9cc9f6b7fe4f9a13c084ebdfcccf712537
---

这篇文章想聊聊 **`ErrorBoundary` 要放几个、放在哪里**。本文写给用 React Router 和 TanStack Query 搭页面、总在纠结失败该由路由的 `ErrorBoundary`、`react-error-boundary` 还是 `useQuery` 的 `isError` 来接的前端开发者。读完之后，你会得到决定 `ErrorBoundary` 放在哪里的标准，以及让每个位置的 fallback 和重试条件对得上的方法。

先把结论写在前面：`ErrorBoundary` 的数量不由口味决定，而由两件事决定。**是什么在抛出**，以及**它死掉时屏幕上必须留下什么**。这篇文章从后者开始，前者在需要的地方再讲。


## 可以让出的范围

问 `ErrorBoundary` 该放在哪里，人们通常想的是包住哪个组件。这个问题给不出答案。能包的组件总是有好几个，选哪一个代码都照样跑。

得换个问法。**这个死了的话，屏幕上必须留下什么。**

这个问题在每个位置的答案都不一样。构成屏幕骨架的数据没有了，那块屏幕就立不住。名字和状态都没有，只孤零零放着一个操作按钮，没有意义。反过来，一个次要列表失败就把整屏遮住，用户会把本来能好好看到的其余部分全部丢掉。难以撤销的操作又不同，必须在按下去的那个位置告知失败这件事。

**`ErrorBoundary` 做的事不是捕获失败，而是决定 fallback 被画出来的范围。** fallback 就是失败时替代原来屏幕画出来的东西。包了多少就消失多少。所以 `ErrorBoundary` 的位置不由你想捕获什么决定，而由**可以让出的范围**决定。

这个范围分成四级。

| 层的名称 | 接收什么 | 用什么撤回 |
|---|---|---|
| 路由 | loader 抛出的东西，下面没人接住的东西 | `revalidate()` |
| 屏幕 | 渲染过程中抛出的东西 | `resetErrorBoundary()` |
| 区域 | 在它内部抛出的东西 | `resetErrorBoundary()` |
| 组件内部 | `useQuery` 的失败，mutation 的失败 | `refetch()`、toast |

![嵌套的矩形：路由 ErrorBoundary 里面有屏幕 ErrorBoundary，屏幕 ErrorBoundary 里面并排放着区域 ErrorBoundary 和组件内部。左侧有箭头进来：loader 抛出的东西进入路由 ErrorBoundary，渲染过程中抛出的东西进入屏幕 ErrorBoundary，那个区域的失败进入区域 ErrorBoundary，不抛出的东西进入组件内部。从组件内部向上的箭头上打着红叉，并标注为不会往上走](1.png?w=720)

名字有四个，种类只有两种。**只有路由 `ErrorBoundary` 属于路由器，其余两个是放在树里的 `ErrorBoundary`。** 屏幕 `ErrorBoundary` 和区域 `ErrorBoundary` 是同一个组件，只是挂的位置不同。最下面的组件内部不是 `ErrorBoundary`，而是组件自己画的分支。

下面几节要看的是，这张表的每一行为什么都删不掉。


## 删不掉的三层

装上 `react-error-boundary` 之后，路由器那一侧看起来像是可以删。名字一样，做的事看上去也一样。但是任何一个都不该删，理由有三个。这里数的三个是上表里的路由、屏幕、区域。组件内部不算在内，因为它不是 `ErrorBoundary`。

### 在 ErrorBoundary 之外的 loader

`ErrorBoundary` 是用 `getDerivedStateFromError` 和 `componentDidCatch` 造出来的类，所以只有**在 React 树内被捕获的东西**才会到它这里。loader 是在渲染开始之前、在树外运行的函数。它在那里抛出的东西不经过 React，所以包得再多也看不见。从多个位置抛出同一个错误、确认落点的过程，整理在[错误的传播](/251117)里。

所以只要有一条路由用了 loader，**路由 `ErrorBoundary` 就删不掉。** 一删，那个失败就没有地方可去了。

### revalidate 解不开的缓存

反方向也被堵住了。路由 `ErrorBoundary` 的恢复手段是 `revalidate()`，而它只是重新跑一遍 loader，并不碰查询缓存。

设想一条没有 loader 的路由。屏幕里的 `useSuspenseQuery` 失败了，最后路由 `ErrorBoundary` 也确实会接住。因为路由器把路由树包在了自己的一个类 `RenderErrorBoundary` 里，而那个类同样有 `getDerivedStateFromError`。可是在那个 `ErrorBoundary` 上按重试也没用，**既没有可以重跑的 loader，缓存里扎着的错误也还在。** 接是接住了，却没有撤回的手段。

**接收和撤回是两件不同的事。** 布置 `ErrorBoundary` 时不把这两件事一起看，就会做出一个接得住但谁也解不开的 fallback。

### 收窄范围的下层 ErrorBoundary

第三个不是被堵住，而是丢得太多。

失败的时候，路由器会挑一个 `ErrorBoundary`。挑法就在源码里。

```js
function findNearestBoundary(matches, routeId) {
  let eligibleMatches = routeId ? matches.slice(0, matches.findIndex((m) => m.route.id === routeId) + 1) : [...matches];
  return eligibleMatches.reverse().find((m) => m.route.hasErrorBoundary === true) || matches[0];
}
```

它从后往前扫匹配到的路由，挑出第一个带 `ErrorBoundary` 的路由，没有就送到最前面那个。嵌套路由的子路由没有 `ErrorBoundary` 的话，这个位置由**父路由**接手，父路由也没有就由根接手。

根接手的话，整块屏幕都会消失。失败的只是里面的一个区域，页头和导航却一起没了。给子路由挂上 `ErrorBoundary`，fallback 就只画在 `<Outlet />` 的位置上。

**所以在下面再放一个 `ErrorBoundary` 不是重复。** 它不是把同一个失败捕获两次，而是**改变擦掉的范围**。看上去像是三个叠在一起的布置，实际上是让不同的东西以不同的范围被接住。


## 在区域 ErrorBoundary 和组件内部之间

把层分成四个之后，还剩最后一个岔口。对于一个没有它屏幕也立得住的区域，选择是**把它抬到 `ErrorBoundary` 上，还是就地接住**。

无论哪一种，丢掉的都只是那个区域，其余的都保得住。分出高下的不是丢掉的范围，而是**在那个位置改画什么**。

抬到 `ErrorBoundary` 上，代码会变少。在里面调用 `useSuspenseQuery`，那个组件里既没有 `isPending` 也没有 `isError`。等待由外面的 `Suspense` 接，失败由外面的 `ErrorBoundary` 接。组件只画有数据的情况。

下面的 `QueryAsyncBoundary` 是把那个 `Suspense` 和 `ErrorBoundary` 合在一起的组件。它在 `QueryErrorResetBoundary` 里放了 `ErrorBoundary`，把 `onReset` 接到 `reset` 上，再用 `Suspense` 包住里面。名字里加上 `Query` 是有意的。叫 `AsyncBoundary` 的话，读起来像是任何异步都能用，其实不是，因为里面装着 `QueryErrorResetBoundary`。出于同样的理由，我没有给 `pendingFallback` 设默认值。有了默认值，只看调用处那一行就不知道垫在下面的是什么。

```tsx
<section>
  <h2>댓글</h2>
  <QueryAsyncBoundary pendingFallback={<p>불러오는 중</p>}>
    <CommentList postId={postId} />
  </QueryAsyncBoundary>
</section>
```

代价是那个区域整块变成 fallback。如果是列表这种整块消失也没什么可留的位置，那就没有损失。

就地接住则相反。调用 `useQuery`，自己把四种状态（等待、失败、空结果、结果）画出来。分支变多，换来的是可以放**贴合那个位置的文案和动作**。只想在失败的那一行上加一个小小的重试按钮，就走这条路。抬到 `ErrorBoundary` 上，那一行的样子就由 fallback 组件来定，而那个 fallback 通常是和屏幕 `ErrorBoundary` 共用的，对一行的失败来说太重了。

标准可以这样整理。**区域整块消失也无所谓，`ErrorBoundary` 更好；需要贴合那个位置的文案或动作，`useQuery` 更好。** `ErrorBoundary` 帮你把分支从组件里拿掉，但同时也把决定画面的自由一起拿走了。

如果决定不抬到 `ErrorBoundary` 上，**四种状态就都得处理。**

```tsx
const { data, isPending, isError, refetch, isRefetching } = useQuery(commentsOptions(postId))

if (isPending) return <p>불러오는 중</p>

if (isError) {
  return (
    <div role="alert">
      <p>댓글을 불러오지 못했어요</p>
      <button onClick={() => refetch()} disabled={isRefetching}>재시도</button>
    </div>
  )
}

if (data.length === 0) return <p>아직 댓글이 없어요</p>
```

漏掉 `isError`，失败就会悄悄流进空状态。失败的查询的 `data` 是 `undefined`，而 `data == null || data.length === 0` 这样的检查并不区分那个 `undefined` 和空数组。屏幕上显示还没有评论，而服务器在那一刻正返回 500。

先把 `isError` 滤掉，下面的 `data` 就收窄成数组，`== null` 的检查也就没有了。


## 每一层不同的 fallback

层已经放好，接下来要定每一层在屏幕上画什么。路由 `ErrorBoundary` 和放在树里的 `ErrorBoundary` 在这里又分了开来，而**选择的标准不是口味，而是那一层怎样拿到错误**。

### 自己去读的路由 ErrorBoundary

路由 `ErrorBoundary` 不需要把错误传给 fallback。组件用 `useRouteError()` 直接读，恢复手段也自己取。

```tsx
export function RootErrorBoundary() {
  const error = useRouteError()
  const { revalidate, state } = useRevalidator()

  return <ErrorFallback error={error} onRetry={revalidate} retrying={state === 'loading'} />
}
```

所以路由上只要插进组件就行。子路由的 `ErrorBoundary` 也是同样的形状，用同样的 hook。把两者分开的不是代码，而是**挂在哪条路由上**。挂在哪条路由上，就等于 fallback 被画出来的范围。

### 往下传的 ErrorBoundary

`react-error-boundary` 的 `ErrorBoundary` 则相反。错误和 reset 函数都在它自己手里，所以必须往 fallback 那边传。因此有三个 prop，而类型定义把这三个绑成了互斥的。

**`fallback`** 原样接收一个做好的元素，写法是 `fallback={<p role="alert">댓글을 불러오지 못했어요</p>}`。错误和 reset 函数都不给。只有在消息固定、也没有办法重试的时候才用得上。

**`FallbackComponent`** 接收一个组件，把 `error` 和 `resetErrorBoundary` 作为 props 传过去。多个 `ErrorBoundary` 共用同一个 fallback 时很干净，但 props 的名字固定为 `resetErrorBoundary`，所以接收的一方必须知道这个名字。

```tsx
function CommentsFallback({ error, resetErrorBoundary }: FallbackProps) {
  return <ErrorFallback error={error} onRetry={resetErrorBoundary} />
}

<ErrorBoundary onReset={reset} FallbackComponent={CommentsFallback}>
  <CommentList postId={postId} />
</ErrorBoundary>
```

代码里的 `reset` 是 TanStack Query 的 `QueryErrorResetBoundary` 传下来的函数。它解开停留在错误状态的查询，让重试真正重新请求；为什么需要它，在[重试按钮为什么不起作用](/251128)中顺着源码讲。

`ErrorFallback` 接收的是 `onRetry`，名字对不上。于是就多出一个只负责搬名字的组件。

**`fallbackRender`** 接收一个函数，就地渲染。

```tsx
<ErrorBoundary
  onReset={reset}
  fallbackRender={({ error, resetErrorBoundary }) => (
    <ErrorFallback error={error} onRetry={resetErrorBoundary} />
  )}
>
```

笔者选了这个。理由是**可以就地把名字换掉**。上面 `resetErrorBoundary` 变成了 `onRetry`。多亏如此，`ErrorFallback` 成了只认识 `error` 和 `onRetry` 的组件，恢复手段是 `revalidate` 的路由 `ErrorBoundary`，和恢复手段是 `resetErrorBoundary` 的 `ErrorBoundary`，**用的是同一个 fallback。**

**两层的画面不会走样，这就是这个选择换来的东西。** 把层分成四个，用户看到的失败画面也有变成四种的风险，而换一次名字就把它们变成了一个。


## 不该挂重试的失败

在 fallback 上挂了重试按钮，也不是所有失败都能解开，因为 `ErrorBoundary` 只撤回自己的状态。查询的错误要把 `QueryErrorResetBoundary` 的 `reset` 接到 `onReset` 上才会重新请求；读服务器用 200 返回的意外值时出的渲染错误，要先在 `queryFn` 里检查、变成查询的错误才能解开；`React.lazy` 的分块加载失败只有刷新才能解开。用源码核对这三种情况的过程，另外整理在前面链接过的「重试按钮为什么不起作用」中。能恢复的失败和不能恢复的失败就这样分开了，所以按钮也得分开。

给所有失败都显示同一个按钮，等于**在引导用户去做他做不到的事**。在 404 上按重试，回来的还是同一个 404。因为没有权限而拿到的 403 也一样。分块加载失败则如上所述，压根就不起作用。

在共用的 fallback 里分一次就够了。

```tsx
function describe(error: unknown) {
  if (isChunkLoadError(error)) {
    return { title: '새 버전이 배포됐어요', description: '새로 고침하면 이어서 볼 수 있어요.', action: 'reload' }
  }

  const status = isHttpError(error) ? error.status : isRouteErrorResponse(error) ? error.status : undefined

  if (status === 404) {
    return { title: '찾을 수 없어요', description: '주소가 바뀌었거나 삭제된 항목이에요.', action: null }
  }
  if (status !== undefined && status >= 400 && status < 500) {
    return { title: '요청을 처리할 수 없어요', description: '입력한 내용을 다시 확인해 주세요.', action: null }
  }
  return { title: '불러오지 못했어요', description: '잠시 후 다시 시도해 주세요.', action: 'retry' }
}
```

`isRouteErrorResponse` 会在这里出现是有原因的。路由 `ErrorBoundary` 和放在树里的 `ErrorBoundary` 共用 fallback，所以这个函数**两种错误都要接**。从路由器抛出的 `Response` 里读状态码的方法，和从自己造的 HTTP 错误里读的方法不一样，所以两个都看。

一开始不必做一大堆分支。只要把**再按一次结果会不一样的失败和不会不一样的失败**分开就够了。


## ErrorBoundary 看到失败的时刻

`ErrorBoundary` 都放好了，还剩下一件事。**`ErrorBoundary` 是什么时候看到的。**

层是自上而下定的，执行的顺序却相反。重试全部耗尽之后，`ErrorBoundary` 才会看到点什么。所以重试的条件是 **`ErrorBoundary` 设计的一部分**。

默认值在不同位置不一样。两边用的都是同一个 `createRetryer`，传进去的值却不同。查询什么都不传，所以拿到 `retryer.js` 里的默认值。

```js
const retry = config.retry ?? (isServer() ? 0 : 3);
```

mutation 则在 `mutation.js` 里直接放了 0。

```js
retry: this.options.retry ?? 0,
```

**mutation 是 0，意思是请求一旦以错误结束，那个操作马上就失败。** 难以撤销的操作不重试是个安全的默认值，不过如果那个操作是幂等的，多送一次对用户更好。

两边都把同样的条件写明白更好。

```ts
const MAX_RETRY = 2

export function retryOnServerError(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRY) return false
  return !isHttpError(error) || error.status >= 500
}
```

`failureCount` 从 0 开始，**第一次失败时是拿 0 来问的。** 所以 `MAX_RETRY` 是 2 的话，总共送三次然后停下。这是重试的次数，不是尝试的次数。

**把 4xx 排除掉是关键。** 请求本身就是错的，送多少次回来的答案都一样。但排除它的理由不只是浪费，默认的延迟还是指数增长的。

```js
function defaultRetryDelay(failureCount) {
	return Math.min(1e3 * 2 ** failureCount, 3e4);
}
```

第一次重试是 1 秒，下一次是 2 秒，所以只重试两次就过去了 3 秒。不把 4xx 滤掉，就等于**把一个修不好的失败藏了 3 秒**。

渲染错误和分块失败没有这段时间。不发请求就没有重试可言，抛出的那一刻 `ErrorBoundary` 就看到了。**同一个 fallback 在有些失败上 3 秒后才出现、在有些失败上立刻出现，原因就在这里。**

打开重试之前有一个前提要确认。那个请求是**幂等的吗。** 同一个请求送两次，结果必须一样。服务器不保证这一点的话，重试就是一个制造 bug 的功能。


## 结尾

这篇文章定了在每个接收失败的位置放什么。内容整理如下。

- `ErrorBoundary` 的位置由可以让出的范围决定。问的不是要包住什么，而是这个死了之后必须留下什么。
- 三层 `ErrorBoundary` 一个也删不掉。loader 抛出的东西树里的 `ErrorBoundary` 接不到，`revalidate` 解不开查询缓存，而在下面再放一个是在收窄范围。
- 区域整块丢掉也无所谓就用 `ErrorBoundary`，需要那个位置专属的文案就用 `useQuery`。选了后者，四种状态就都得处理。
- 用 `fallbackRender` 把名字换掉，层不同 fallback 也能统一成一个。
- 重试要把抛出一方的状态解开才起作用。查询是 `reset`，渲染错误抬到 `queryFn` 里，分块是刷新。
- `ErrorBoundary` 看到失败的时刻由重试条件决定。不把 4xx 滤掉，就会把修不好的失败藏上几秒。

有人会问，一个 `ErrorBoundary` 加一个 toast 不就够了吗。对只有两三屏的产品来说这话说得通，而且事实上**层的数量由产品决定。** 屏幕只有一张，要让出的也只有一张，范围的差别就看不出来。屏幕里独立的区域越多，那个差别就越大。

不过有些东西与数量无关地留了下来。树里放多少个 `ErrorBoundary` 都好，`loader` 抛出的东西不会去那里，而重试不把抛出一方的状态解开就不起作用。**能减少的是层，不是这些事实。**

:::ref
- [docs] [TanStack Query, QueryErrorResetBoundary](https://tanstack.com/query/latest/docs/framework/react/reference/QueryErrorResetBoundary)
- [docs] [TanStack Query, Suspense](https://tanstack.com/query/latest/docs/framework/react/guides/suspense)
- [docs] [React Router, Error Boundaries](https://reactrouter.com/how-to/error-boundary)
- [repo] [bvaughn/react-error-boundary](https://github.com/bvaughn/react-error-boundary)
- [article] [TkDodo, React Query Error Handling](https://tkdodo.eu/blog/react-query-error-handling)
- [article] [TkDodo, Mastering Mutations in React Query](https://tkdodo.eu/blog/mastering-mutations-in-react-query)
:::
