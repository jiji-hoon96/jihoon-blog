---
emoji: 🧱
title: 'ErrorBoundary 放在哪里'
seoTitle: 'ErrorBoundary 放在哪里：分层、让出范围与 QueryErrorResetBoundary'
date: '2025-12-03'
categories: 前端 React TanStack-Query 错误处理
description: '知道了错误会去哪里，接下来就该在那些地方放上接收它的东西。ErrorBoundary 分几层、一次失败该让出多少屏幕、以及要让重试按钮真的重试还得一起解开什么，全部用已安装的源码来核对。'
keywords: 'ErrorBoundary 放在哪里, 嵌套路由 ErrorBoundary, QueryErrorResetBoundary, 重试按钮没反应, retryOnMount, fallbackRender, useRouteError, revalidate, React.lazy 分块加载失败, TanStack Query retry 条件, ErrorBoundary 设计'
locale: zh-CN
translationOf: '251203'
sourceHash: 3494eb97de287571e9a6a2a7003d815dddb21da5a3a048746bef38b8bb6101c4
---

这篇文章想聊聊**在哪里接收收到的错误**。在[错误的传播](/251117)里，我从七个位置抛出同一个错误，数了它们各自的落点。这篇文章讲的是在每个落点上放一个接收的位置。

知道传播路径之后，下一个问题就自己跟上来了。**`ErrorBoundary` 要放几个、放在哪里。** 一个够不够、是不是每屏都要放、库提供的和自己写的会不会重叠，都在这里分出高下。

先把结论写下来：`ErrorBoundary` 的数量不是口味问题，由两件事决定。**什么在抛**，以及**它死掉时屏幕上必须留下什么**。前者在第 1 篇讲过了，所以这篇从后者开始。


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

和第 1 篇看到的一样。`ErrorBoundary` 是用 `getDerivedStateFromError` 和 `componentDidCatch` 造出来的类，所以只有**在 React 树内被捕获的东西**才会到它这里。loader 是在渲染开始之前、在树外运行的函数。它在那里抛出的东西不经过 React，所以包得再多也看不见。

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


## 重试不起作用的三种情况

我在 fallback 上加了重试按钮。就是用户为了撤回失败而按下的那个按钮。按一下试试。**不起作用。** 同样的画面原样又出来了。

它由三个原因造成，解法也各不相同。共同点只有一个。**`ErrorBoundary` 只撤回自己的状态。** 抛出的一方手里握着的状态，必须由抛出的一方来解。

### reset 能解的查询错误

`resetErrorBoundary()` 做的事只是把 `ErrorBoundary` 的内部标志翻回去。children 重新挂载，查询重新订阅。可是那个查询在缓存里**以错误状态扎着**。于是它立刻又抛出同一个错误，`ErrorBoundary` 又画出 fallback。

为什么不重新请求而是用旧的错误，源码里也有。`errorBoundaryUtils.js` 是这样上锁的。

```js
if (options.suspense || throwOnError) {
  if (!errorResetBoundary.isReset()) options.retryOnMount = false;
}
```

得先读外层的守卫。**这把锁只作用在会抛出的查询上。** 开了 `suspense` 或者开了 `throwOnError` 的查询，在没有 reset 标记的情况下挂载，重试就被关掉了。不抛出的 `useQuery` 不在此列，重新挂载后就照常重新请求。

![上面是没有接上 onReset 时的流程，重试点击、EB 解除、重新挂载、再次抛出缓存里的错误依次相连，最后一格有一条红色箭头折回第一格，标注为同一个 fallback。下面是接上 onReset 时的流程，重试点击、onReset 与解锁、EB 解除与重新挂载、重新请求，用蓝色箭头朝一个方向依次相连](2.png?w=720)

**被锁住的只有抬到 `ErrorBoundary` 上的查询，所以两个状态必须一起解。** 立起那个标记的是 `QueryErrorResetBoundary`。打开源码，状态只是一个布尔值。

```js
reset: () => {
	isReset = true;
},
```

把这个 `reset` 接到 `ErrorBoundary` 的 `onReset` 上就行。TanStack Query 的文档和源码注释都把同样的接线放成了例子。

```tsx
export function QueryAsyncBoundary({ children, pendingFallback }: Props) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <ErrorFallback error={error} onRetry={resetErrorBoundary} />
          )}
        >
          <Suspense fallback={pendingFallback}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}
```

顺序很重要。而这个顺序由 `react-error-boundary` 保证。这是打包后的文件，名字缩成了一个字母，但结构照样读得出来。

```js
resetErrorBoundary(...e) {
  const { didCatch: t } = this.state;
  t && (this.props.onReset?.({ args: e, reason: "imperative-api" }), this.setState(d));
}
```

它们用逗号运算符连在一起，所以**`onReset` 先跑，`setState` 在后**。`d` 是 `didCatch` 为 `false` 的初始状态。所以 children 是在缓存的锁解开之后才重新挂载的。**一行之差，重试才成了真正的重试。**

名字里加上 `Query` 也是有意的。叫 `AsyncBoundary` 的话，读起来像是任何异步都能用，其实不是，因为里面装着 `QueryErrorResetBoundary`。出于同样的理由，我没有给 `pendingFallback` 设默认值。有了默认值，只看调用处那一行就不知道垫在下面的是什么。

### reset 解不开的渲染错误

第二种是第 1 篇里看到的情况。服务器用 200 返回了与预期不同的形状，读它的渲染抛出了 `TypeError`。同一个 `ErrorBoundary` 接住了，`onReset` 也接上了，可重试就是不起作用。

`reset` 能解的是**处于错误状态的查询**。可是这个查询成功了。服务器给了 200，缓存里把那个值当作正常数据存着。出错的是读了那个值的渲染。所以 `reset` 没有可解的东西，重新挂载的组件拿到 `staleTime` 还没过的同一份缓存，又在同一行抛出。

要改的位置是 **`queryFn`**。

```ts
queryFn: async () => {
  const data = await getComments(postId)
  if (!Array.isArray(data.comments)) {
    throw new TypeError('comments 가 배열이 아니다')
  }
  return data.comments
},
```

第 1 篇说过，类型结束的地方就是放运行时检查的地方。**那个地方就是这里。** 把那个检查抬到 `queryFn` 里，同样的失败就变成了**查询的错误**。它以错误状态留在缓存里，`reset` 把它解开，重试就重新请求。

想着反正 `ErrorBoundary` 会接住就把运行时检查往后拖，就会做出一个接得住却撤不回的 fallback。

### 只有刷新能解的 lazy

第三种是分块加载失败。这一次 `reset` 和 `queryFn` 都不相干。握着状态的是 `lazy` 本身。

正如第 1 篇所见，React 的 `lazyInitializer` 把拒绝记在 `payload` 里，之后每次都抛出同一个东西。

```js
throw payload._result;
```

它不会再 `import()` 一次。`lazy()` 的调用在模块顶层只发生过一次，那个 `payload` 在应用活着的期间就一直保持原样。解开 `ErrorBoundary` 重新挂载，同样的错误还是会来。

所以这种失败的恢复方式是把页面重新取一遍。这也意味着有新版本发布了，所以不如就这样告诉用户。

把三种情况摆在一起看，一个重试按钮得做三件不同的事。查询的错误用 `reset` 解，渲染错误在 `queryFn` 里预先变成查询的错误，分块失败用刷新解。**这三件 `ErrorBoundary` 一件也不会替你做。**


## 不该挂重试的失败

把能恢复的失败和不能恢复的失败分开之后，按钮也得分开。

给所有失败都显示同一个按钮，等于**在引导用户去做他做不到的事**。在 404 上按重试，回来的还是同一个 404。因为没有权限而拿到的 403 也一样。分块加载失败则因为上一节说的理由，压根就不起作用。

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

第 1 篇讲了错误会去哪里，这篇则定了在那些位置放什么。内容整理如下。

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
