---
emoji: 🔁
title: "重试按钮为什么不起作用"
seoTitle: "ErrorBoundary 重试不起作用时：QueryErrorResetBoundary、queryFn 与 lazy"
date: '2025-11-28'
updatedAt: '2026-10-08'
categories: 前端 React TanStack-Query 错误处理
description: "用已安装的源码核对在 react-error-boundary 的 fallback 上按重试却回到同一个 fallback 的三种情况：查询错误用 QueryErrorResetBoundary，渲染错误用 queryFn 里的检查，React.lazy 分块失败用刷新来解开。"
keywords: "ErrorBoundary 重试不起作用, QueryErrorResetBoundary, retryOnMount, resetErrorBoundary, onReset, React.lazy 分块加载失败, useSuspenseQuery 错误, react-error-boundary"
locale: zh-CN
translationOf: '251128'
sourceHash: 605b77497a1ba7812a26383b7083df57c4f4468c38c802877152ef315fa11f48
---

这篇文章想聊聊 **`ErrorBoundary` 的重试按钮为什么不起作用**。

本文写给在 `react-error-boundary` 的 fallback 上挂了重试按钮，却怎么按都回到同一个画面的前端开发者，整理了失败状态留下来的三种情况，以及每种情况该怎么解开。简单地说，`ErrorBoundary` 只撤回自己的状态，造成失败的状态还原样留在抛出的一方。

例子采用 TanStack Query 与 `react-error-boundary` 一起使用的配置。库的行为是打开已安装的源码确认的，引用的代码与 `@tanstack/react-query` 5.104.1、`react-error-boundary` 6.1.6、React 19.2.3 的构建文件结构一致（2026-10-08 比对）。缩进和换行有几处为便于阅读做了调整。


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

但这并不意味着会永远锁住。fallback 显示期间，没有组件在看那个查询，于是它成了非活跃查询，按 [TanStack Query 的默认值](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)，5 分钟后会从缓存中删除。在那之后再按，缓存里没有错误，就会从头重新请求。所以漏接 `onReset` 的代码，隔很久再按也会像是能用。如果复现时好时坏，先看按下的时刻是在 `gcTime` 之前还是之后。

![上面是没有接上 onReset 时的流程，重试点击、EB 解除、重新挂载、再次抛出缓存里的错误依次相连，最后一格有一条红色箭头折回第一格，标注为同一个 fallback。下面是接上 onReset 时的流程，重试点击、onReset 与解锁、EB 解除与重新挂载、重新请求，用蓝色箭头朝一个方向依次相连](1.png?w=720)

**被锁住的只有抬到 `ErrorBoundary` 上的查询，所以两个状态必须一起解。** 立起那个标记的是 `QueryErrorResetBoundary`。打开源码，状态只是一个布尔值。

```js
reset: () => {
	isReset = true;
},
```

如果标记只立起来却没人放下，之后的错误都会不受锁限制地重新请求。负责放下的是查询的 hook。重新挂载的 hook 在渲染中读取标记，不会关掉 `retryOnMount`。看同一个标记的 `getHasError` 也不会抛出缓存里的错误。然后在挂到屏幕上之后，在 effect 里放下标记。这是同一个 `errorBoundaryUtils.js` 里的函数。

```js
const useClearResetErrorBoundary = (errorResetBoundary) => {
	React.useEffect(() => {
		errorResetBoundary.clearReset();
	}, [errorResetBoundary]);
};
```

所以一个 boolean 就足以表达只重试这一次。把一次重试按顺序写出来是这样的。

1. `reset()` 立起标记。
2. 重新挂载的查询 hook 在渲染中看到标记，不会关掉 `retryOnMount`。
3. `getHasError` 也看到标记，不抛出缓存里的错误，于是查询重新请求。
4. 挂到屏幕上之后，effect 里的 `clearReset()` 放下标记。
5. 标记放下后，之后的错误会再次被锁住。

把这个 `reset` 接到 `ErrorBoundary` 的 `onReset` 上就行。TanStack Query 的文档和源码注释也把这样连接的代码放成了例子。

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

它们用逗号运算符连在一起，所以 **`onReset` 先跑，`setState` 在后**。`d` 是 `didCatch` 为 `false` 的初始状态。所以 children 是在缓存的锁解开之后才重新挂载的。**一行之差，重试才成了真正的重试。**

即使不用 `QueryErrorResetBoundary` 包裹，从 `useQueryErrorResetBoundary()` 取出 `reset` 接到 `onReset` 上，重试也能生效。没有外层边界时，这个 hook 会返回模块级的全局默认值。代价是，正如 [Suspense 指南](https://tanstack.com/query/latest/docs/framework/react/guides/suspense)所写，重置会作用于全局，整个应用共享同一个标记。

名字里加上 `Query` 也是有意的。叫 `AsyncBoundary` 的话，读起来像是任何异步都能用，其实不是，因为里面装着 `QueryErrorResetBoundary`。出于同样的理由，我没有给 `pendingFallback` 设默认值。有了默认值，只看调用处那一行就不知道垫在下面的是什么。

### reset 解不开的渲染错误

第二种是服务器用 200 返回了与预期不同的形状，读它的渲染抛出 `TypeError` 的情况。同一个 `ErrorBoundary` 接住了，`onReset` 也接上了，可重试就是不起作用。

`reset` 能解的是**处于错误状态的查询**。可是这个查询成功了。服务器给了 200，缓存里把那个值当作正常数据存着。出错的是读了那个值的渲染。所以 `reset` 没有可解的东西，重新挂载的组件在渲染中读到缓存里同一个值，又在同一行抛出。因为在挂到屏幕上之前就抛出了，连订阅查询的机会都没有。这就是把 `staleTime` 设为 0 也不会重新请求的原因。

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

`fetch` 响应的 `json()` 返回的是 `Promise<any>`，所以之后加上的类型是声明而不是检查，确认服务器所给值的运行时检查得自己放。**把那个检查抬到 `queryFn` 里**，同样的失败就变成了**查询的错误**。它以错误状态留在缓存里，`reset` 把它解开，重试就重新请求。

想着反正 `ErrorBoundary` 会接住就把运行时检查往后拖，就会做出一个接得住却撤不回的 fallback。

### 只有刷新能解的 lazy

第三种是分块加载失败。这一次 `reset` 和 `queryFn` 都不相干。握着状态的是 `lazy` 本身。

React 的 `lazyInitializer` 把拒绝记在 `payload` 里，之后每次都抛出同一个东西。

```js
throw payload._result;
```

它不会再 `import()` 一次。`lazy()` 的调用在模块顶层只发生过一次，那个 `payload` 在应用活着的期间就一直保持原样。解开 `ErrorBoundary` 重新挂载，同样的错误还是会来。

那么新建一个 `lazy`，再调用一次 `import()` 行不行？到目前为止是浏览器挡住了。模块映射记住了失败的结果，不会重新获取同一个 URL。改变这一行为的 [HTML 规范变更](https://github.com/whatwg/html/pull/10327)已于 2026-07-15 合并。2026-10-08 确认的各引擎状态如下。Firefox [在 155 中加入](https://bugzilla.mozilla.org/show_bug.cgi?id=2055211)，于 2026-09-01 发布。WebKit 于 2026-08-19 [进入 main](https://bugs.webkit.org/show_bug.cgi?id=319492)，该 bug 记录中没有写明包含这一变更的 Safari 稳定版版本。Chrome 在 [chromestatus](https://chromestatus.com/feature/5214647044145152) 上仍是 Proposed。所以在 Chrome 里，新的 `import()` 也会返回同样的失败。

所以这种失败的恢复方式是把页面重新取一遍。即使浏览器以后会重新获取，也不是都能解开。分块加载失败可能来自网络中断，也可能如 [Vite 文档](https://vite.dev/guide/build#load-error-handling)所说，是新的部署删掉了旧分块。被删掉的分块再请求一次也还是不存在，所以那种情况下的恢复依然是刷新。既然没法断定唯一的原因，fallback 的文案与其断言新版本已发布，不如建议用户刷新。

总结起来，查询的错误用 `reset` 解，渲染错误在 `queryFn` 里预先变成查询的错误，分块失败用刷新解。


## 结尾

如果重试按钮不起作用，希望你在看按钮或 `ErrorBoundary` 之前，先确认 **是什么抛出的、那个状态留在哪里**。是查询缓存、读了服务器所给值的渲染，还是 `lazy`，解开的地方各不相同。

`ErrorBoundary` 在页面上放在哪里、放几个，以及哪些失败根本不该挂重试按钮，在[ErrorBoundary 放在哪里](/251203)中讨论。

:::ref
- [docs] [TanStack Query, QueryErrorResetBoundary](https://tanstack.com/query/latest/docs/framework/react/reference/QueryErrorResetBoundary)
- [repo] [bvaughn/react-error-boundary](https://github.com/bvaughn/react-error-boundary)
:::
