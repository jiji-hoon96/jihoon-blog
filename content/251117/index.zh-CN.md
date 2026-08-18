---
emoji: 🛡️
title: '错误处理'
seoTitle: '前端错误处理——Error Boundary 与 TanStack Query throwOnError 组合指南'
date: '2025-11-17'
categories: 프론트엔드 React TanStack-Query 에러핸들링
description: "梳理 React Error Boundary、try/catch 与 TanStack Query 的 throwOnError 各自负责的范围及其组合方式，并区分渲染阶段错误与异步错误，深入说明 react-error-boundary 的 reset 工作原理。"
keywords: "前端错误处理, React Error Boundary, react-error-boundary, TanStack Query throwOnError, React Query 错误处理, 错误边界 reset, try catch 错误, 异步错误处理, React 错误处理"
locale: zh-CN
translationOf: '251117'
sourceHash: 688aa8b21e8068e6d24e46e383d3dddbb24778dff87c065c19b3489cff0380fa
---

这篇文章想谈一谈：**在前端，我们该如何捕获错误**。

笔者在实际工作中编写错误处理代码时，经常会有一种说不清的不踏实感。有些错误用 `try/catch` 捕获，有些由 `ErrorBoundary` 捕获，还有些则交给 TanStack Query 的 `onError`。它们的职责范围既有细微重叠，又存在错位。结果就是，有时错误悄悄漏了出去，有时又传播到了本不希望它抵达的地方。

问题在于，我们很少把这些工具的运行方式放在一起系统梳理。虽然知道“Error Boundary 只能捕获渲染阶段的错误”，但如果被追问这句话在实际运行中究竟意味着什么、调用 `reset` 后内部会发生什么，以及开启 `throwOnError` 后 TanStack Query 会在什么时机重新抛出错误，往往就很难准确回答。

本文将以 React 官方指南、`react-error-boundary` 库和 TanStack Query v5 官方文档为基础，梳理前端错误处理工具**各自负责到哪里**，以及**应该如何组合**。


## React 能捕获与不能捕获的错误

先从最基础的问题开始：**React 能捕获哪些错误？**

React 官方文档明确区分了 Error Boundary 能捕获和不能捕获的错误。

**Error Boundary 能捕获的范围**

- 子组件**渲染（render）**过程中发生的错误
- **生命周期方法（lifecycle method）**中发生的错误
- **构造函数（constructor）**中发生的错误

**Error Boundary 无法捕获的范围**

- **事件处理器（event handler）**中的错误
- `setTimeout`、`requestAnimationFrame`、**Promise 等异步代码**中的错误
- **服务端渲染（SSR）**过程中的错误
- **Error Boundary 自身**发生的错误

为什么这种区分如此重要？因为我们平时处理的大多数错误，其实都属于**第二类**。比如点击按钮触发 mutation 后服务器返回 500、`useEffect` 中的 fetch 失败，或提交表单时校验逻辑抛出异常。这些错误不会被 React 自动捕获，必须由我们显式捕获并处理。

因此，前端错误处理分成两条路径：**渲染阶段的错误交给 Error Boundary**，**其他错误交给 try/catch 或库提供的回调**。TanStack Query 这类异步状态管理库，会在两条路径交汇之处充当桥梁。


## Error Boundary 的本质

Error Boundary 本质上是一个拥有两个生命周期方法的**类组件**。根据 React 官方文档，要成为 Error Boundary，需要实现下面两个方法中的至少一个（通常两个都会实现）。

```js
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  // 에러 발생 시 state를 업데이트해 다음 렌더에서 fallback UI를 보여준다
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  // 에러가 발생한 직후에 호출. 로깅 같은 사이드이펙트는 여기서 처리한다
  componentDidCatch(error, info) {
    logErrorToMyService(error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
```

`getDerivedStateFromError` 必须是**纯函数**。它只负责返回新的 state，不能产生副作用。与之相对，`componentDidCatch` 正是用来执行副作用的地方。向 Sentry 上报错误或在控制台输出组件堆栈，都应该在这里完成。

这里有一点很重要：这两个方法**只存在于类组件中**。目前仍没有官方方式可以用函数组件创建 Error Boundary。[React 官方文档](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)也明确说明了这一点。

::::quote
:::translation
目前还无法将 Error Boundary 编写为函数组件。
:::

:::original
There is currently no way to write an Error Boundary as a function component.
:::
::::

每次都亲自编写类组件很麻烦，因此通常会使用 `react-error-boundary` 库。（它由曾任 React 核心维护者的 Brian Vaughn 编写，实际上已经成为一种事实标准。）


## react-error-boundary 的 3 种 fallback

`react-error-boundary` 的 `ErrorBoundary` 组件提供了**三种方式**来通过 prop 指定 fallback UI。下面简单看看各自的用法。


### fallback

这是最简单的形式，直接传入静态 JSX。

```tsx
<ErrorBoundary fallback={<div>문제가 발생했습니다.</div>}>
  <Page />
</ErrorBoundary>
```

不需要访问错误对象或 reset 函数时可以使用。实际项目通常需要显示错误消息或提供重试操作，所以笔者至今还没有在工作中用过这种方式。


### FallbackComponent

将 fallback UI 拆成独立组件，再传入它的**引用**。

```tsx
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert">
      <p>오류가 발생했습니다.</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>다시 시도</button>
    </div>
  );
}

<ErrorBoundary FallbackComponent={ErrorFallback}>
  <Page />
</ErrorBoundary>
```

错误对象和 `resetErrorBoundary` 函数会自动通过 props 注入。如果 fallback UI 可能在其他地方复用，这种方式会很清晰。


### fallbackRender

希望内联编写 fallback 时使用。

```tsx
<ErrorBoundary
  fallbackRender={({ error, resetErrorBoundary }) => (
    <div role="alert">
      <p>오류가 발생했습니다: {error.message}</p>
      <button onClick={resetErrorBoundary}>다시 시도</button>
    </div>
  )}
>
  <Page />
</ErrorBoundary>
```

它与 `FallbackComponent` 本质上做的是同一件事，但可以**不创建独立组件，直接内联处理**。需要访问外部闭包（例如父组件的 state 或处理函数）时很有用。

三种方式没有唯一正确答案。笔者在实际工作中最常用的模式，是**创建一个共用的 ErrorFallback 组件，再通过 `FallbackComponent` 注入**，因为需要保持设计系统和产品语调的一致性。只有当页面需要不同的 fallback 时，才会用 `fallbackRender` 内联编写。


## reset 实际上做了什么？

使用 `react-error-boundary` 时，自然会遇到 `resetErrorBoundary` 函数，也就是在 fallback 中点击“重试”按钮时调用的函数。下面看看它实际做了什么。

先说结论：`resetErrorBoundary` 只是向 ErrorBoundary 组件发出信号，让它**重置自身状态并重新渲染 children**。它不会自动修改 TanStack Query 缓存等任何外部状态。

按步骤展开，内部会发生以下事情。

1. 调用 `resetErrorBoundary()`。
2. ErrorBoundary 内部的 `hasError` 状态恢复为 `false`。
3. （可选）执行 `onReset` 回调，用户自定义的副作用会在这里发生。
4. 重新渲染 children。如果引发错误的根因（状态、缓存等）依然存在，**同一个错误就会再次被抛出。**

关键在最后一步。**reset 只意味着“忘掉错误，再尝试渲染一次”，并不意味着“修复导致错误的原因”。**因此，如果只做 reset，同一个错误可能会无限重复。

为了解决这个问题，还需要另外两个工具。


### onReset

它的作用类似一个在 reset 即将发生前调用的钩子，可在这里清理导致错误的外部状态。

```tsx
<ErrorBoundary
  FallbackComponent={ErrorFallback}
  onReset={() => {
    queryClient.invalidateQueries({ queryKey: ['user'] });
  }}
>
  <Page />
</ErrorBoundary>
```


### resetKeys

当数组中的值发生变化时，ErrorBoundary 会自动 reset。可以传入 URL 参数、搜索词、当前标签页等能够判断“这个值变了，重新尝试就有意义”的键。

```tsx
<ErrorBoundary
  FallbackComponent={ErrorFallback}
  resetKeys={[userId]}
>
  <UserProfile userId={userId} />
</ErrorBoundary>
```

`userId` 变化时会自动执行 reset，并重新渲染 children。用户切换到另一个个人资料后，之前的错误也会自然消失。


## 如何捕获事件处理器和异步错误？

前面提到，Error Boundary 无法捕获事件处理器和异步代码中的错误。但我们处理的大多数错误恰恰发生在那里，该怎么办？

为此，`react-error-boundary` 提供了 **`useErrorBoundary` 钩子**。这个钩子返回一个名为 `showBoundary` 的函数，调用它就能将错误强制抛给最近的 ErrorBoundary。

```tsx
import { useErrorBoundary } from 'react-error-boundary';

function MyComponent() {
  const { showBoundary } = useErrorBoundary();

  const handleClick = async () => {
    try {
      await someAsyncOperation();
    } catch (error) {
      showBoundary(error);
    }
  };

  return <button onClick={handleClick}>실행</button>;
}
```

关键是，**开发者必须显式地把错误向上提升**，React 不会自动代劳。如果希望将异步错误转移到 ErrorBoundary 的职责范围，就要用 `try/catch` 捕获，再传给 `showBoundary`。

理解这个模式后，“为什么有些错误能被 ErrorBoundary 捕获，有些却不能”这个问题便迎刃而解。答案很简单：**“有没有把它提升到渲染阶段。”**


## TanStack Query 如何处理错误？

梳理到这里，自然会产生另一个问题。我们每天使用的 `useQuery` 负责异步请求，其中发生的错误究竟如何处理？

TanStack Query 默认会通过 **`error` 字段暴露错误**。

```tsx
const { data, error, isError } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
});

if (isError) {
  return <div>에러: {error.message}</div>;
}
```

这是最简单的形式。即使发生错误，组件仍会正常渲染，只不过 `error` 字段中有了值。ErrorBoundary 不会介入。

这里需要强调一个重要事实：**TanStack Query 的默认行为是“不抛出错误”。**无论 queryFn 中是 throw 还是 reject，错误都只会进入 `error` 字段，不会打断 React 的渲染流程。因此，如果没有额外配置，ErrorBoundary 永远不会被触发。

还有一点，TanStack Query **默认会在出错后自动重试 3 次**。

默认 `retryDelay` 采用指数退避（exponential backoff），最长会增加到 30 秒。也就是说，首次失败后用户不会立刻看到错误。系统会分别间隔 1 秒、2 秒、4 秒重试，如果仍然失败，才会填充 `error` 字段。（如果你在开发时曾疑惑“为什么错误这么晚才出现？”，十有八九就是这个原因。）


### 用 throwOnError 连接 ErrorBoundary

那么，怎样才能让 TanStack Query 的错误流向 ErrorBoundary？答案是 **`throwOnError`** 选项。（在 v4 之前它叫 `useErrorBoundary`，到 v5 更名为 `throwOnError`。）

```tsx
const { data } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  throwOnError: true,
});
```

启用这个选项后，TanStack Query 会在**下一个渲染周期重新 throw 错误**。这样，该 throw 就成为渲染阶段的错误，ErrorBoundary 终于能够捕获它。

`throwOnError` 也可以接收函数。这样就能分流：某些错误交给 ErrorBoundary，另一些由组件自行处理。

```tsx
useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  // 5xx 서버 에러만 ErrorBoundary로 보낸다
  throwOnError: (error) => error.response?.status >= 500,
});
```

这个模式之所以实用，是因为**4xx 之类的客户端错误（例如输入校验失败、权限不足）**通常更适合就地显示消息，而对于**5xx 之类的服务端错误**，则更适合覆盖整个页面并提示“请稍后重试”。


### useSuspenseQuery

如果使用的是 `useSuspenseQuery`，就无需考虑 `throwOnError`。在 Suspense 模式下，**默认行为就是始终抛出错误**。

换句话说，使用 `useSuspenseQuery` 就意味着：**加载状态由 Suspense 处理，错误由 ErrorBoundary 处理**。组件内部不再需要 `if (isError)` 或 `if (isLoading)` 之类的分支，但需要在外部用这两个边界包裹组件。


## QueryErrorResetBoundary

读到这里，又会产生一个问题：用户在 fallback 中点击“重试”按钮后会发生什么？

如前所述，`resetErrorBoundary` 只会重置 ErrorBoundary 的 `hasError` 状态。但 TanStack Query 缓存里仍然留着**持续处于错误状态的查询**。children 重新渲染后，TanStack Query 查看缓存，判断“这个查询已经出错”，便会立即再次抛出同一个错误。（这会形成可怕的无限循环。）

为了解决这个问题，TanStack Query 提供了 **`useQueryErrorResetBoundary` 钩子**和 **`QueryErrorResetBoundary` 组件**。名字虽长，作用却很简单：发出一条命令，**“重置这个区域内所有查询的错误状态”。**

```tsx
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

function App() {
  const { reset } = useQueryErrorResetBoundary();

  return (
    <ErrorBoundary
      onReset={reset}
      fallbackRender={({ resetErrorBoundary }) => (
        <div>
          <p>에러가 발생했습니다.</p>
          <button onClick={resetErrorBoundary}>다시 시도</button>
        </div>
      )}
    >
      <Page />
    </ErrorBoundary>
  );
}
```

下面按时间顺序梳理这里发生的事情。

1. 用户点击“重试”按钮 → 调用 `resetErrorBoundary()`
2. ErrorBoundary 执行 `onReset` 回调 → 调用 `reset()`（重置 TanStack Query 的错误状态）
3. ErrorBoundary 重置自身状态并重新渲染 children
4. children 中的 `useQuery` 开始运行 → 错误状态已清除，因此重新尝试 fetch

关键是把 `onReset` 与 `reset` 连接起来的部分。正是这一行代码让 ErrorBoundary 和 TanStack Query 的状态保持同步。


### 使用组件形式

不用钩子，也可以通过组件完成同样的事情。两者选择一个即可。

```tsx
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

function App() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <div role="alert">
              <p>에러가 발생했습니다: {error.message}</p>
              <button onClick={resetErrorBoundary}>다시 시도</button>
            </div>
          )}
        >
          <Page />
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
```

它与钩子版本最大的区别，是通过 **render prop 模式**把 `reset` 函数传给子组件。`QueryErrorResetBoundary` 将函数作为自己的 children，调用时传入 `{ reset }`，再渲染该函数的返回值。因此，可以在函数内部直接连接 `onReset={reset}`。

如果找不到最近的 `QueryErrorResetBoundary`，钩子版本会**重置全局缓存中的错误**。组件版本则只会在自己的子组件区域内限定 reset 范围。如果希望精确控制作用域，组件版本更稳妥。

这里还要说明一点：**reset 不会清空缓存。**它不会删除全部数据，而更接近于“解除被标记为错误的查询状态”。如果确实要让数据失效，需要另行调用 `queryClient.invalidateQueries()`。


## Mutation 的错误

到目前为止，讨论的模式几乎都以 `useQuery` 为基准。但 **`useMutation` 的情况有所不同。**

最大的区别在于，mutation 通常由**用户的显式操作（点击、提交）**触发。因此，在靠近操作发生的位置处理错误更自然。与其用 fallback 覆盖整个页面，不如通过 toast 消息或表单旁的错误文字提示“支付失败：请重新检查银行卡信息”。

TkDodo 在 [精通 React Query 中的 Mutation](https://tkdodo.eu/blog/mastering-mutations-in-react-query)一文中，用一句话概括了这种差异的本质：**Query 是声明式（declarative）的，而 Mutation 是命令式（imperative）的。**Query 会在组件挂载后自动执行，其他组件也能订阅同一个键，并且结果会被缓存复用。相对地，mutation 只有在用户点击按钮后才会执行，既不缓存，也与调用它的组件实例一一绑定。这种本质差异将两者的错误处理方式分开了。

`useQuery` 的默认 `retry` 是 `3`，但 **`useMutation` 的默认 `retry` 是 `0`。**原因很简单：mutation 会产生**副作用（side effect）**。如果支付请求因网络超时失败，而库自动再调用两次，用户的银行卡可能会被扣款三次。

因此，原则上只有在开发者**确信操作具有幂等性（idempotent）时**，才应显式开启 mutation 重试。例如，重复发送同一请求也能保证结果一致的 GET 类安全查询，或者服务端接收幂等键（idempotency key）并能阻止重复操作的情况。

`useQuery` 的错误会**写入缓存**。因此，它会立即传播给订阅相同 `queryKey` 的其他组件，必须使用 `QueryErrorResetBoundary` 等机制统一重置。

mutation 则不同。某个组件的 mutation 实例发生错误后，错误**只会保留在该实例的状态中**，不会影响其他使用同一 `mutationFn` 的组件。因此，TanStack Query 中没有 `MutationErrorResetBoundary` 这种东西，**因为根本不需要。**

这一差异会给实际工作带来一个影响：如果两个组件调用同一个 `useMutation`，其中一个组件发生的错误不会出现在另一个组件中。如果希望“在应用全局感知这次 mutation 的错误”，组件级 `onError` 就不够了，需要将它提升到 `MutationCache.onError`。


### mutate 与 mutateAsync

`useMutation` 会返回两种执行函数，它们的差异决定了错误处理方式。

mutate 的返回类型是 `void`，不返回 Promise。因此不能用 await 等待结果，只能通过 `onSuccess/onError` 等回调获取调用结果。


```tsx
const mutation = useMutation({
  mutationFn: createPost,
  onError: (error) => {
    toast.error(`등록 실패: ${error.message}`);
  },
});

mutation.mutate(newPost);
```


相对地，`mutateAsync` 返回 Promise，可以用 `try/catch` 处理错误。

```tsx
const mutation = useMutation({ mutationFn: createPost });

const handleSubmit = async () => {
  try {
    const result = await mutation.mutateAsync(newPost);
    router.push(`/posts/${result.id}`);
  } catch (error) {
    // 여기서 처리
  }
};
```

应该在什么情况下使用哪一个？笔者按以下标准区分。

- **mutation 结束后需要执行后续操作**（例如成功后跳转、使用返回值）→ `mutateAsync`
- **只需发起调用，副作用交给回调处理**（例如切换点赞状态、只显示 toast）→ `mutate` + `onError`

这里有一个常见错误：**使用 `mutateAsync` 却没有添加 `try/catch`，会引发 unhandled promise rejection。**基于回调的 `mutate` 会自行吸收错误，而 `mutateAsync` 默认会把错误抛给调用方。如果不了解这个差异而混用两者，控制台就会充满红色警告。


### onError

还有一个经常被忽略的细节：`useMutation` 的 `onError` 可以在**两个位置**（hook、mutate）定义。

```tsx
const mutation = useMutation({
  mutationFn: createPost,
  onError: (error) => {
    Sentry.captureException(error);
  },
});
```

钩子级回调始终会执行，而 mutate 调用级回调只针对当前调用执行。

```tsx
mutation.mutate(newPost, {
  onError: (error) => {
    setFormError(error.message);
  },
});
```

官方文档明确规定的执行顺序是：**钩子级 → mutate 调用级。**如果两个回调都已定义，会先执行钩子级回调，再执行 mutate 调用级回调。


## 全局错误处理

目前为止的模式都在组件层面。但实际也可能有“希望集中记录所有查询错误”或“遇到 401 错误必须退出登录”等需求。对于这类横切关注点，可以在创建 **QueryClient 时为 `QueryCache`/`MutationCache` 注册回调。**

```tsx
import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.state.data !== undefined) {
        toast.error(`데이터 갱신 실패: ${error.message}`);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (error.status === 401) {
        redirectToLogin();
      }
    },
  }),
});
```

关键在于，`QueryCache.onError` **对每个查询只调用一次**。即使有多个组件订阅同一个查询，回调也只执行一次，因此不会出现重复 toast 等问题。

也可以像上面的例子一样检查 `query.state.data !== undefined`。如果是**已有缓存数据时 refetch 失败**，用户至少还能在页面上看到数据。这时用 ErrorBoundary 覆盖整个页面就有些过度，只需告知用户刷新失败即可。相反，如果首次加载就在没有缓存数据的情况下失败，则应该由 ErrorBoundary 捕获并显示 fallback。

将两条流程结合起来，就能设计出一套清晰的策略：“首次加载失败交给 ErrorBoundary，后台 refetch 失败则显示 toast”。


## 共用组件

读到这里，很自然会产生一个想法：每次都用 `QueryErrorResetBoundary`、`ErrorBoundary` 和 `Suspense` 包三层太麻烦，能否**组合成一个组件复用**？

这个想法很自然。笔者过去也曾创建并使用过下面这样的 `AsyncBoundary` 组件。

```tsx
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { Suspense, type ComponentType, type ReactNode } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { ErrorFallback } from './ErrorFallback';
import { Spinner } from './Spinner';

interface Props {
  children: ReactNode;
  pendingFallback?: ReactNode;
  rejectedFallback?: ComponentType<FallbackProps>;
}

export function AsyncBoundary({
  children,
  pendingFallback = <Spinner />,
  rejectedFallback = ErrorFallback,
}: Props) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} FallbackComponent={rejectedFallback}>
          <Suspense fallback={pendingFallback}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
```

在页面中，只需这样一段代码即可。

```tsx
<AsyncBoundary>
  <Content />
</AsyncBoundary>
```

看上去很简洁，但同事给出了这样的反馈。

> AsyncBoundary 这个名称并不是一种约定俗成到像代名词一样的叫法，所以无论里面有什么，似乎都不会特别违和。不过，**里面还有 React Query 的 ResetBoundary，这一点确实有些难以预料。**

> 另外，`pendingFallback` 和 `rejectedFallback` 带有默认值也让我有点在意。只看 `<AsyncBoundary>` 这一行，无法知道内部会使用哪种 fallback，甚至可能**根本意识不到它们来自 props 的默认值。**


### 名称隐藏了依赖

这个组件名为 `AsyncBoundary`，只传达了“异步边界”的含义。但它的内部实现与 **TanStack Query 强耦合**：其中包含 `QueryErrorResetBoundary`，并在 `onReset` 中接入 `reset`。也就是说，这个组件其实是**“面向 React Query 异步区域的边界”**，名称却完全没有体现这一点。

这为什么是个问题？因为它会**打破阅读者的预期**。阅读代码并不是逐行解读，而是依据经验形成的模式不断进行**预测**。一旦预测落空，认知负担就会骤然上升。

同事第一次看到 `AsyncBoundary` 这个名字时，脑海中浮现的是“用于异步处理的通用边界”。看起来无论使用 SWR，还是直接调用 fetch，都可以拿来使用。但它实际上内置了 `QueryErrorResetBoundary`，所以即使在**没有使用 TanStack Query 的上下文中，也会带入毫无意义的耦合**。名称与实现之间出现了裂缝。

可以把这种情况看作抽象泄漏（leaky abstraction）的反方向。通常的泄漏是“本应藏在抽象背后的细节露了出来”，这里却是**本应显式存在的依赖，被名称隐藏得过于彻底。**这或许是更糟的一类问题。（因为使用者会在不知情的情况下直接拿来用。）


### 在名称中体现依赖

最简单的解决方式是改名。不要叫 `AsyncBoundary`，而应改成 **`QueryAsyncBoundary`** 之类能在名称中明确依赖的名字。笔者查看了 Toss 开发的 [Suspensive](https://suspensive.org/) 库，发现它也明确表达了依赖。`@suspensive/react` 只包含通用的 `ErrorBoundary` 和 `Suspense`，与 TanStack Query 结合的组件则被拆到独立的 `@suspensive/react-query` 包中，命名为 `QueryAsyncBoundary`。

只多了这几个字符，传递给代码阅读者的信息量却大不相同。看到 `Query` 前缀的瞬间，就能立刻明白：**“这是 TanStack Query 环境专用的。”**它能提前阻止将组件误用到错误上下文中的情况。


### 拆分成可组合单元

更根本的做法是：**不要捆绑。**

ErrorBoundary 和 Suspense 本质上属于**不同的关注点**。把它们捆成一个组件，可能会失去组合的灵活性。有些页面可能只需要 ErrorBoundary，有些只需要 Suspense，还有些可能希望在一个 ErrorBoundary 中放入两个 Suspense。一旦组合成 `AsyncBoundary`，这些变体都会变得别扭；保持拆分，则可以自由组合。

这种模式会让代码多一行，但优点是**可以直接从代码中读出每个边界负责什么**。而且，使用 `useSuspenseQuery` 时，希望同时处理的加载单元与希望捕获错误的单元往往并不相同，因此拆开反而更自然。

笔者最终的结论是：**如果反复出现的组合模式确实完全相同，就把它们组合起来；如果需要变化，就保持拆分。**即使组合，也要通过名称显式体现依赖。只要遵守这两条原则，就不太容易再收到“看不出 AsyncBoundary 里面有什么”的代码审查意见。


### 默认 Props

只解决名称问题还不够。再看一次上面的代码。

```tsx
pendingFallback = <Spinner />,
rejectedFallback = ErrorFallback,
```

只写一行 `<QueryAsyncBoundary>...</QueryAsyncBoundary>` 就能工作，是因为内部会自动使用 `Spinner` 和 `ErrorFallback`。**这是无法根据名称预料的信息。**

这正是前面所批评的“名称隐藏依赖”的另一种表现。虽然通过 `Query` 前缀让名称体现了依赖，但 `Spinner` 和 `ErrorFallback` 这两个 UI 依赖仍然藏在默认 prop 后面，**只是把隐藏的位置向内挪了一层。**

解决方式很简单：**将两个 fallback 都设为必填 prop，并在每个调用位置显式注入。**

```tsx
interface Props {
  children: ReactNode;
  pendingFallback: ReactNode;                    
  rejectedFallback: ComponentType<FallbackProps>;
}
```

```tsx
<QueryAsyncBoundary
  pendingFallback={<Spinner />}
  rejectedFallback={ErrorFallback}
>
  <Content />
</QueryAsyncBoundary>
```

代码会多两行，但接受这项成本的理由很明确：**增加编写者的成本，换取所有阅读者更低的追踪成本。**在调用位置就能直接看到会显示哪种 fallback，无需再打开另一个文件确认“这个组件的默认值是什么来着？”那句我们熟悉的观点——代码被阅读的次数远多于被编写的次数——在这里同样成立。


## ErrorFallback

还有一个值得讨论的地方。通常，我们会把 `ErrorFallback` 创建为如下所示的单一组件。

```tsx
const DEFAULT_ERROR_MESSAGE = '문제가 발생했어요. 잠시 후 다시 시도해주세요';

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const message = getErrorMessage(error, DEFAULT_ERROR_MESSAGE);

  return (
    <Flex direction="column" alignItems="center" role="alert" aria-live="assertive">
      <Text>{message}</Text>
      <Spacing size={16} />
      <Button onClick={resetErrorBoundary}>다시 시도</Button>
    </Flex>
  );
}
```

这是一个连 `role="alert"` 和 `aria-live="assertive"` 都考虑周全的清晰实现。但不妨问一个问题：**“无论是 401、404、500，还是网络断开，都显示同一个页面真的合适吗？”**

大多数情况下，答案是**不合适**，因为用户针对不同错误应该采取不同的行动。

| 错误类型 | 用户操作 | “重试”是否有意义？ |
| --- | --- | --- |
| 网络断开 | 检查连接后重试 | O |
| 5xx 服务端错误 | 稍后重试 | O |
| 401 身份验证失败 | 前往登录页面 | X |
| 403 权限不足 | 前往其他页面 | X |
| 404 资源不存在 | 返回列表 | △ |
| 422 校验失败 | 修改输入值 | X |

在所有情况下都显示“重试”按钮，相当于向用户错误地提示了**“能够解决该错误的操作”**。遇到 401 时，无论点击多少次“重试”，都只会再次得到相同的 401。用户真正应该做的是登录。

因此，错误 fallback 应当**根据错误类型采用不同的呈现方式**。无需一开始就写一个庞大的 `if/else`，只要创建一些小型组件再进行分流即可。

每个 fallback 组件只展示适合该错误的消息和操作，让页面上只留下用户真正能够采取的行动。


### shouldCatch

再进一步，还可以在组件层面区分**“要捕获的错误”与“要继续传播的错误”**。Suspensive 的 `ErrorBoundary` 提供了 `shouldCatch` prop。

```tsx
<ErrorBoundary
  shouldCatch={(error) => isHttpError(error) && error.status >= 500}
  fallback={ServerErrorFallback}
>
  <ErrorBoundary shouldCatch={NetworkError} fallback={NetworkErrorFallback}>
    <Page />
  </ErrorBoundary>
</ErrorBoundary>
```

内层 ErrorBoundary 只捕获网络错误，不捕获 5xx 错误。未被捕获的错误会按照 React 的默认行为**继续向上传播到上层 ErrorBoundary**，再由外层 ErrorBoundary 捕获 5xx。与用 if/else 编写相同的错误处理相比，这种方式的吸引力在于可以**赋予边界本身明确的含义**。

`react-error-boundary` 没有这个 prop，但可以在 fallback 内部分流，实现相同效果。重要的是模式本身，而不是具体使用哪个库。


## 总结

总而言之，前端错误处理**无法靠单一工具完成**。渲染阶段的错误由 Error Boundary 负责；事件处理器中的错误由 `try/catch` 或 `showBoundary` 负责；异步数据获取错误由 TanStack Query 的 `throwOnError` 与 `useQueryErrorResetBoundary` 负责；mutation 错误由 `mutateAsync` 或 `onError` 负责；横切关注点则由 `QueryCache`/`MutationCache` 负责。在这些基础之上，还需要一并设计**共用组件的命名与组合粒度**以及**错误类型本身的领域建模**，才能形成一致的错误处理策略。

了解这些工具各自的职责之后，才能明确决定：**“这个错误在这里捕获，那个错误继续传播到那里。”**这些决定不断累积，最终构成稳定的用户体验：不让用户看到白屏，不让同一条 toast 弹出五次，不让短暂的网络故障拖垮整个页面，在遇到 401 时显示登录页面而不是“重试”。正是这些细节共同塑造了“这个服务做得很好”的印象。

当然，并非所有项目都需要用上所有模式。简单的后台管理工具可能只需一个 ErrorBoundary 加 toast 就足够；而在支付这种一次失误就意味着真金白银的领域，则需要为每个 mutation 配置细致的错误处理。答案最终由业务领域决定。

也希望读者能借此检查一下自己的项目：“我们的服务目前在哪里、用什么名称的组件捕获哪些错误？”有些错误看似已经被妥善捕获，实际上却可能悄悄漏出，或抵达了错误的 fallback，这类情况或许比想象中更多。（笔者自己也总是如此。）


## 参考资料

:::ref
- [文档] [React：错误边界](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [文档] [TanStack Query：Suspense](https://tanstack.com/query/latest/docs/framework/react/guides/suspense)
- [文档] [TanStack Query：QueryErrorResetBoundary](https://tanstack.com/query/latest/docs/framework/react/reference/QueryErrorResetBoundary)
- [文档] [TanStack Query：重要默认配置](https://tanstack.com/query/v5/docs/framework/react/guides/important-defaults)
- [文章] [TkDodo：React Query 错误处理](https://tkdodo.eu/blog/react-query-error-handling)
- [文章] [TkDodo：有意打破 React Query API](https://tkdodo.eu/blog/breaking-react-querys-api-on-purpose)
- [仓库] [toss/suspensive：@suspensive/react-query](https://github.com/toss/suspensive)
- [文档] [React Router：错误边界](https://reactrouter.com/how-to/error-boundary)
:::
