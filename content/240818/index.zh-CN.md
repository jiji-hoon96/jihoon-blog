---
emoji: 🤯
title: 'Zustand，你到底为什么是 ProviderLess？'
seoTitle: '为什么 Zustand 不需要 Provider — 基于 useSyncExternalStore 的运行原理分析'
date: '2024-08-18'
categories: 前端 React
description: "通过源码分析深入探究 Zustand 无需 Provider 即可管理状态的原理，以及它与 React Context API 的区别和基于模块作用域的设计。"
keywords: "Zustand 原理, Zustand 不需要 Provider 的原因, React 状态管理库, Zustand 源码分析, useSyncExternalStore, React Context API"
locale: zh-CN
translationOf: '240818'
sourceHash: 7e4c03efdbf0b5dead93870b853fa5c987ebfd96bb765663ebb98da138417e85
---

这篇文章想聊一聊 Zustand 是如何在没有 Provider 的情况下完成状态管理的。

使用 Zustand 时，我一直把无需 Provider 就能管理状态这件事视为理所当然。直到某天，我突然想到一个问题。在 React 生态中，大多数库都已把用 Provider 包裹应用变成了一种近乎仪式化的做法。TanStack React Query 必须由 `QueryClientProvider` 包裹才能使用 `useQuery`，toss 的 overlay-kit 没有 `OverlayProvider` 也无法调用 `overlay.open()`。React 的 Context API 同样必须用 Provider 包裹组件树。那么 Zustand 究竟施了什么魔法，才省掉了这道流程？

出于好奇，我直接拆解了 Zustand 的源码，发现其中隐藏着比预想更有意思的结构。下面就来整理一下这个过程中了解到的内容。

<hr>

## 状态在 React 中如何流动

在一般的 React 应用中，状态会像下图这样运作。

![3.png](3.png)

组件内部状态使用 React 提供的状态管理 hook（`useState`、`useReducer`）进行管理，状态则通过 props 传递给子组件。到这里都很简单。

问题出现在相距较远的组件需要共享状态时。React 为此提供的官方解决方案就是 Context API，但它要求必须用 Provider 组件包裹下层树。

<hr>

### 为什么 Context API 需要 Provider？

要回答这个问题，需要稍微了解一下 React 的内部运行方式。

React 使用一种名为 Fiber 的内部数据结构来管理组件树。每个 Fiber 节点都以父子关系相连。当 Context 的值发生变化时，React 会自上而下遍历 Fiber 树，找出订阅了该 Context 的组件，并触发重新渲染。

关键在于：**Context 值的传播依赖 Fiber 树的结构。** Provider 位于树中的哪个位置，决定了值的传递范围；调用 `useContext` 的组件会沿着自身上层的 Fiber 树向上查找最近的 Provider。如果没有 Provider 呢？那就只会使用传给 `createContext` 的默认值。

也就是说，Context API 与 React 的渲染系统紧密耦合。状态的存储、传播和订阅全都发生在 React 组件树内部。

那么 Zustand 是如何绕过这个结构的呢？

<hr>

## Zustand 活在 React 外部

![4.png](4.png)

Zustand 基于 Flux 模式运行。闭包内部的 `state` 扮演 Store，用户定义的函数扮演 Action，`set` 函数扮演 Dispatcher，React 组件则扮演 View。决定性的差异就在这里。 

**Zustand 的 Store 存在于 React 组件树之外，也就是 JavaScript 模块的作用域内。**

所谓组件树之外，是指与 React 内部的状态管理不同，Zustand 的状态独立存在，与 React 的 Fiber 树无关。任何组件只要执行 `import` 就能访问 Store，无需用 Provider 包裹应用。（它像全局变量一样可以从任何地方访问，同时又受到闭包的妥善保护。）

为什么能做到这一点？来看下面的代码。

```typescript
import { create } from 'zustand';

const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
```

这段代码中的 `create` 会在模块加载时调用。也就是说，在 React 开始渲染之前，Store 就已经存在于内存中。这就是**模块级单例（Module-level Singleton）模式**。

<hr>

### 什么是模块级单例？

JavaScript 的 ES 模块系统会**仅在首次加载时对模块求值（evaluate），并缓存结果**。之后，无论从哪里 `import` 同一个模块，都不会重新执行，而是返回缓存中的同一个对象。也就是说，无论组件 A 还是组件 B 执行 `import { useStore } from './store'`，二者引用的都是**完全相同的 Store 实例**。

既不需要另外实现 singleton 类，也不需要把它挂到全局变量（`window.store`）上。模块系统本身就自然满足了单例“只创建一次，并且从任何地方访问的都是同一个实例”这一条件。Zustand 直接利用这种语言层面的保证，让所有组件无需单独的 Provider 也能共享同一个 Store。

读到这里，自然会产生一个问题：Zustand 的内部究竟是什么样的？

<hr>

## Zustand 的内部结构

查看 [Zustand 的 GitHub 仓库](https://github.com/pmndrs/zustand/tree/main/src)就会发现，其核心逻辑简洁得令人惊讶。核心主要由两个文件组成：`vanilla.ts` 负责 Store 本身，`react.ts` 负责与 React 建立连接。

<hr>

### vanilla.ts

[vanilla.ts](https://github.com/pmndrs/zustand/blob/main/src/vanilla.ts) 是 Zustand 的心脏。Store 如何创建、状态如何管理，全都包含在这一个文件里。说得更简单一些，封闭在闭包里的状态以及操作该状态的函数，都定义在这个文件中。

```typescript
const createStoreImpl: CreateStoreImpl = (createState) => {
  type TState = ReturnType<typeof createState>
  type Listener = (state: TState, prevState: TState) => void
  let state: TState
  const listeners: Set<Listener> = new Set()

  const setState: StoreApi<TState>['setState'] = (partial, replace) => {
    const nextState =
      typeof partial === 'function'
        ? (partial as (state: TState) => TState)(state)
        : partial
    if (!Object.is(nextState, state)) {
      const previousState = state
      state =
        (replace ?? (typeof nextState !== 'object' || nextState === null))
          ? (nextState as TState)
          : Object.assign({}, state, nextState)
      listeners.forEach((listener) => listener(state, previousState))
    }
  }

  const getState: StoreApi<TState>['getState'] = () => state

  const getInitialState: StoreApi<TState>['getInitialState'] = () =>
    initialState

  const subscribe: StoreApi<TState>['subscribe'] = (listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  const api = { setState, getState, getInitialState, subscribe }
  const initialState = (state = createState(setState, getState, api))
  return api as any
}
```

逐行拆解这段代码，就能看清 Zustand 的核心机制。

- **通过闭包封装状态**

  - 变量 `let state: TState` 被声明为 `createStoreImpl` 函数的局部变量。即使函数执行结束，`setState`、`getState` 等内部函数仍然引用着这个变量，所以它不会被垃圾回收。这就是闭包的本质。

  - 外部没有任何办法直接访问 `state` 变量。只能通过 `getState()` 读取，通过 `setState()` 写入。（相当于用闭包实现了面向对象中的 private 字段。）

- **利用 `Object.is` 检测变化**

  - `setState` 计算出新状态后，会通过 `Object.is(nextState, state)` 与原状态进行比较。如果引用相同，就什么都不会发生。这是防止不必要重新渲染的第一道防线。

  - 不过，这种 `Object.is` 比较检查的是**严格引用相等（strict reference equality）**，因此使用方需要留意一个问题。只取出一个原始值（如数字、字符串等）时没有问题。

    ```typescript
    const count = useStore((state) => state.count);
    ```

    但如果 selector **返回一个新对象**，情况就不同了。

    ```typescript
    const { count, name } = useStore((state) => ({
      count: state.count,
      name: state.name,
    }));
    ```

    `{ count, name }` 对象即使值相同，每次调用也会创建新的引用。`Object.is` 不比较内部属性，只比较引用，因此在 Zustand 看来，每次都会被判断为“状态变了”，从而触发重新渲染。

    为了解决这个问题，Zustand 提供了 **`useShallow`** hook。

    ```typescript
    import { useShallow } from 'zustand/react/shallow';

    const { count, name } = useStore(
      useShallow((state) => ({ count: state.count, name: state.name }))
    );
    ```

    `useShallow` 会逐一比较返回对象的**顶层属性**，只有值真正发生变化时才触发重新渲染。这与 Redux 的 `useSelector` 默认使用引用比较、同时允许将 `shallowEqual` 作为第二个参数传入的思路相似。（不过，顾名思义，`useShallow` 只做“浅层”比较，不会追踪嵌套对象的内部。）

- **采用 Pub/Sub 模式的 listener 系统**

  - `const listeners: Set<Listener> = new Set()` 这一行就是 Zustand 的整个订阅系统。状态发生变化时，通过 `listeners.forEach` 通知所有订阅者。 
  - 调用 `subscribe` 时，listener 会被添加到 `Set`；调用其返回的函数时，则从 `Set` 中删除。
  - 这个模式之所以重要，是因为它构成了一个**完全独立于 React Fiber 树的通知系统**。并不是由 Provider 遍历树来寻找订阅者，而是由 Store 直接管理订阅者列表。

- **创建初始状态**

  - 来看一下处理初始状态的最后一行代码。

    ```typescript
    const initialState = (state = createState(setState, getState, api))
    ```
    
    一行里压缩了很多内容。在 JavaScript 中，赋值运算符（`=`）是一个会**返回所赋值本身**的表达式（expression）。也就是说，括号中的 `state = createState(...)` 会先执行，把初始状态赋给 `state`，其返回值再赋给 `const initialState`。最终，`state` 与 `initialState` **引用同一个对象**。

    可为什么要特意用两个变量保存同一个值呢？关键在于两个变量的职责不同。

    - **`state`** 是用 `let` 声明的变量。每当调用 `setState` 时，它都会被替换成新值。也就是说，它表示**当前时刻仍在变化的状态**。
    - **`initialState`** 是用 `const` 声明的变量。Store 创建时的状态会被永久保存。之后无论调用何种 `setState`，这个值都不会改变。它相当于**Store 的第一个快照**。

    这个 `initialState` 通过 `getInitialState()` 方法暴露给外部，并在 `react.ts` 中作为 `useSyncExternalStore` 的**第三个参数（服务端快照）**传入。

    ```typescript
    const slice = React.useSyncExternalStore(
      api.subscribe,
      () => selector(api.getState()),       
      () => selector(api.getInitialState()), 
    )
    ```

    服务端渲染（SSR）环境中没有浏览器 API，也没有用户交互，因此不会调用 `setState`。所以服务端始终使用 `initialState`（= 初始状态）作为快照。当客户端开始 hydration 时，React 会比较服务端渲染的 HTML 与客户端初次渲染的结果。因为两边都基于同一个 `initialState` 渲染，所以能够**防止 hydration 不一致**。

<hr>

### react.ts

[react.ts](https://github.com/pmndrs/zustand/blob/main/src/react.ts) 负责把上面创建的纯 JavaScript Store 连接到 React 的渲染系统。

```typescript
export function useStore<TState, StateSlice>(
  api: ReadonlyStoreApi<TState>,
  selector: (state: TState) => StateSlice = identity as any,
) {
  const slice = React.useSyncExternalStore(
    api.subscribe,
    React.useCallback(() => selector(api.getState()), [api, selector]),
    React.useCallback(() => selector(api.getInitialState()), [api, selector]),
  )
  React.useDebugValue(slice)
  return slice
}
```

这里的核心是 `useSyncExternalStore`。这个 hook 在 React 18 中引入，旨在**把存在于 React 外部的状态存储安全地集成到 React 渲染周期中**。

看看 `useSyncExternalStore` 接收的三个参数，结构就很清晰了。（与前面讨论 vanilla.ts 时的内容几乎相同。）

- **`api.subscribe`**：订阅 Store 变化的函数。React 通过它提出“状态变化时请通知我”的请求。
- **`() => selector(api.getState())`**：返回当前状态的快照。React 每次渲染都会调用它来获取最新状态。
- **`() => selector(api.getInitialState())`**：服务端渲染时使用的初始快照。它可以防止 hydration 过程中服务端与客户端的状态不一致。

尤其是，`useSyncExternalStore` 解决了 React 并发模式（Concurrent Mode）中可能发生的 **tearing 问题**。Tearing 是指在同一次渲染过程中，不同组件显示了**同一数据源的不同快照**的现象。

看一个具体场景会更容易理解。组件 A 读取 `store.value`（= 10）并开始渲染。这时，React 在并发模式下**暂时暂停（yield）**渲染，并把控制权交还给浏览器。就在这个空档，WebSocket 消息抵达，把 `store.value` 改成了 11。React 恢复渲染后，组件 B 读取 `store.value`（= 11）。结果，同一帧中 A 显示 10，B 显示 11，形成了**撕裂（teared）的 UI**。React 18 以前的渲染始终是同步的，所以不会出现这个问题。

`useSyncExternalStore` 会记录渲染开始时的快照（`getSnapshot`）。如果外部 Store 在渲染过程中发生变化，导致快照不同，它就会检测到这一点，并**从头重新开始渲染**。这样就能保证所有组件都基于同一个快照进行渲染。

然后，`createImpl` 函数把这一切组合到一起。

```typescript
const createImpl = <T>(createState: StateCreator<T, [], []>) => {
  const api = createStore(createState)
  const useBoundStore: any = (selector?: any) => useStore(api, selector)
  Object.assign(useBoundStore, api)
  return useBoundStore
}
```

它通过 `createStore` 创建 vanilla Store，用名为 `useBoundStore` 的自定义 hook 包裹，然后通过 `Object.assign` 把 Store API 的方法（`setState`、`getState`、`subscribe` 等）直接附加到 hook 函数本身。最终返回的 `useBoundStore` 具有双重性质：**既是 React hook，同时也是 Store API**。（明明是函数却还有方法，是一种很有 JavaScript 风格的模式。）

<hr>

## 其他状态管理库又如何？

理解到这里，自然会想和其他库做一番比较。

Jotai、Recoil、MobX、Xstate、Redux 等状态管理库有很多，这里主要比较一下我亲自使用过的库。

> 顺带一提，经常与 Jotai 比较的 **Recoil**（Meta）在 2025 年 1 月归档了仓库，事实上已经停止开发，也没有支持 React 19。如果需要原子化状态模型，那么现阶段可以说 Jotai 是唯一现实的选择。

<hr>

### Redux

Redux 内部同样使用模块级 Store。那么它为什么需要 Provider？

Redux 的 `<Provider store={store}>` 通过 React Context 将 Store 实例**注入（inject）**组件树。`useSelector` 和 `useDispatch` 会在内部调用 `useContext`，访问 Provider 提供的 Store。这里的重要之处在于，Redux 使用 Context **不是作为状态传播通道，而是作为依赖注入（Dependency Injection）手段**。通过 Context 传递的并非状态值本身，而是管理状态的**Store 对象引用**。实际的状态订阅和更新则由 Store 内部的 Pub/Sub 处理。

这种设计带来的好处很明确。测试时，用 Provider 包裹另一个 Store 实例即可实现完全隔离；在同一个应用中，也可以通过 `context` prop 构建多个彼此独立的 Store 树。正如 Redux 维护者 Mark Erikson 所强调的，“Context 是一种传输机制（transport mechanism），而不是状态管理工具”。

<hr>

### Jotai

Jotai 采用了与 Redux、Zustand 有根本差异的**原子化（atomic）状态模型**。它不会把状态集中在一个大型 Store 对象里，而是采用**将每个状态片段拆分成独立 atom**的方式。（Jotai 官方文档也解释说：“如果 Zustand 类似 Redux，那么 Jotai 就类似 Recoil。”）

这种结构的核心差异在于**渲染优化的方式**。Zustand 是一种**自上而下（top-down）**的方法，通过 selector 从单个 Store 中只提取所需部分。开发者必须像 `useStore((state) => state.count)` 这样亲自编写 selector，有时还要通过 memoization 来保持引用相等（referential equality）。而 Jotai 会自动构建 atom 之间的**依赖图（dependency graph）**。当某个 atom 变化时，它会进行**自下而上（bottom-up）**的传播，只精确地重新渲染依赖该 atom 的组件。在电子表格或画布编辑器这类数十个状态相互交织的场景中，这种自动依赖追踪会发挥很大作用。

从 Provider 的角度看，Jotai 处于一个有趣的中间位置。它默认使用全局 Store，无需 Provider 即可运行；需要时，也能用 `<Provider>` 包裹，创建隔离的 Store 作用域。借用 Jotai 官方文档的说法，Jotai 是 **“context first, module second”**，Zustand 则是 **“module first, context second”**。

<hr>

### Zustand 的选择

Zustand 做出了最激进的选择。它默认是模块级单例，完全没有 Provider。这种选择带来的是**极其简单的 API**：用 `create` 创建 Store，再在组件中调用 hook，就结束了。

不过，“完全没有 Provider”准确来说是在描述它的**默认设计**。从 v4 开始，可以把 `createStore`（vanilla Store）与 React 的 `createContext` 组合起来，实现 **Scoped Store** 模式。

[React Query 维护者 TkDodo 的博客](https://tkdodo.eu/blog/zustand-and-react-context)深入讨论了这个模式。他提出的核心观点是，全局 singleton Store 有三个限制。

- **无法通过 Props 初始化**：Store 在模块加载时创建，因此无法把服务端返回的数据或父组件的 props 用作初始值。
- **测试隔离困难**：每次测试都必须手动重置 Store。
- **无法复用**：如果在同一个页面渲染两个需要相同 Store 结构的组件，它们会共享状态。

Scoped Store 模式可以解决全部三个问题。核心思路是：**通过 Context 传递的不是状态值，而是 Store 实例的引用**。（这与 Redux Provider 所做的事结构完全相同。）

具体实现如下。

```typescript
import { createStore, useStore } from 'zustand';
import { createContext, useContext, useState } from 'react';

// 1. 스토어 팩토리 함수 — props를 받아 스토어를 생성
const createSelectionStore = (initialItems: string[]) =>
  createStore<SelectionState>((set) => ({
    items: initialItems,
    selected: new Set<string>(),
    toggle: (id) =>
      set((state) => {
        const next = new Set(state.selected);
        next.has(id) ? next.delete(id) : next.add(id);
        return { selected: next };
      }),
  }));

// 2. Context 생성
type SelectionStore = ReturnType<typeof createSelectionStore>;
const SelectionContext = createContext<SelectionStore | null>(null);

// 3. Provider — useState로 스토어를 한 번만 생성
const SelectionProvider = ({
  children,
  initialItems,
}: {
  children: React.ReactNode;
  initialItems: string[];
}) => {
  const [store] = useState(() => createSelectionStore(initialItems));
  return (
    <SelectionContext.Provider value={store}>
      {children}
    </SelectionContext.Provider>
  );
};

// 4. 커스텀 훅 — Context에서 스토어를 꺼내 useStore로 구독
const useSelectionStore = <T,>(selector: (state: SelectionState) => T) => {
  const store = useContext(SelectionContext);
  if (!store) throw new Error('SelectionProvider가 필요합니다');
  return useStore(store, selector);
};
```

现在，可以在同一个页面中随意渲染任意数量的独立多选组件。

```tsx
// 각 SelectionProvider가 자신만의 스토어 인스턴스를 가진다
<SelectionProvider initialItems={['A', 'B', 'C']}>
  <MultiSelect />
</SelectionProvider>

<SelectionProvider initialItems={['X', 'Y', 'Z']}>
  <MultiSelect />  {/* 위 컴포넌트와 상태가 완전히 독립 */}
</SelectionProvider>
```

这里值得注意的是，通过 Context 传递的**不是状态值，而是 Store 对象**。即使状态值发生变化，Context 的 `value`（= Store 引用）也不会变化，因此**不会因 Context 值变化而发生不必要的重新渲染。** 真正的重新渲染由 `useStore` 内部的 `useSyncExternalStore` 基于 selector 处理。Context 的传输职责与 Zustand 的订阅职责得到了清晰分离。

TkDodo 还介绍了一个在 design system 的多选组件中实际采用该模式的案例。原本使用 `useState` + Context 管理内部状态的结构，在条目超过 50 个后出现性能下降；改为 Zustand 基于 selector 的订阅后，问题得到了解决。

v3 通过 `zustand/context` 提供的 `createContext` helper 在 v4 被删除后，这个模式逐渐固定为**直接组合 React 原生 `createContext` 与 Zustand 的 `createStore`/`useStore`**。该 API 在 v5 中也保持不变，[Zustand 官方文档](https://github.com/pmndrs/zustand/blob/main/docs/previous-versions/zustand-v3-create-context.md)也在 v4+ 迁移指南中介绍了这一模式。

<hr>

## ProviderLess 的阴影

当然，没有 Provider 并不全是优点。下面整理一下我认为需要注意的地方。

<hr>

### SSR 中的状态共享问题

模块级 singleton 在服务端环境中可能很危险。Node.js 服务器会在同一个进程中处理多个请求，而模块在进程内只加载一次。这意味着不同用户的请求可能会**共享同一个 Store 实例**。

这正是 Zustand 提供 `getInitialState`，并把服务端快照作为 `useSyncExternalStore` 第三个参数传入的原因。但仅凭这一点，未必能彻底隔离请求之间的状态。因此在 SSR 环境中，建议使用前面提到的 Scoped Store 模式（`createStore` + React Context），为每个请求创建新的 Store。

<hr>

### 测试隔离的困难

基于 Provider 的库只要在每个测试中用不同的 Provider 包裹，就能自然地隔离 Store。相反，Zustand 的模块级 singleton 可能导致状态在测试之间泄漏。因此，必须在每个测试的 `beforeEach` 中明确重置 Store。（我也曾经被这个问题折腾过一次。）

```typescript
// 테스트 파일에서의 스토어 리셋 예시
beforeEach(() => {
  useStore.setState(useStore.getInitialState());
});
```

在这里，Scoped Store 模式同样是解决方案。如果采用 Provider 包裹的方式，就能在每个测试中创建并注入新的 Store，从而无需重置逻辑即可实现完全隔离。

<hr>

### 缺少多实例

如果一个应用需要两个结构相同但彼此独立的 Store，使用 Provider 模式时，分别用不同 Provider 包裹即可。但在模块级 singleton 中，必须另行调用 Store 创建函数，生成不同的 Store 实例。例如，同一个页面里有两个独立的 tab panel，且各自的选择状态需要分开管理时，用全局 singleton 就很难自然地表达。

这种情况下，`createStore` + Context 模式同样是正确答案。只要每个 tab panel 组件渲染自己的 Provider，就能创建结构相同却完全独立的实例。Zustand 官方文档也建议在“可复用组件需要 Store”时使用这一模式。

## 总结

总结目前讨论的内容，Zustand 的 ProviderLess 设计由以下四种机制共同实现。

- **模块级单例**：Store 创建在 React 组件树之外，即 JavaScript 模块的作用域内。
- **通过闭包封装状态**：`vanilla.ts` 的 `createStoreImpl` 中，`state` 变量与 `listeners` Set 被封闭在闭包内，阻止外部访问。
- **自有 Pub/Sub 系统**：它不遍历 Fiber 树，而是直接管理 `Set<Listener>`，向订阅者通知状态变化。
- **通过 `useSyncExternalStore` 集成 React**：把外部 Store 的状态变化安全地同步到 React 的渲染周期。

归根结底，Zustand 提出的问题是：“状态一定要活在 React 里面吗？”Zustand 的回答很明确：把状态放在 React 外，需要时搭一座桥就好。这座桥就是 `useSyncExternalStore`。

当然，这种方式并非在所有场景下都是最佳选择。面对 SSR、测试隔离、多实例等情况，基于 Provider 的设计可能更合适。没有唯一的正确答案，但如果理解了各个库选择了怎样的设计 trade-off，就能根据场景选出合适的工具。

也建议读到这里的各位，有机会亲自打开正在使用的某个库的源码看一看。你可能会发现官方文档中没有的深度。

<hr>

![7.jpeg](7.jpeg)

### 另外，还有一则新消息

在查找上述内容时得知，**Zustand v5.0.0 已于 2024 年 10 月正式发布**。

有意思的是，v5 几乎没有新功能。v4.x 已经在添加新功能的同时逐步将原有 API 标记为 deprecated，因此 v5 更像是一次**整理（cleanup）版本**。主要变更如下。（详细内容请参阅**[发布页面](https://github.com/pmndrs/zustand/releases)**和**[迁移指南](https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5)**。）

- 最低要求提升至 **React 18、TypeScript 4.5 及以上版本**。
- **删除了 `getServerState`**。（由 `useSyncExternalStore` 的第三个参数取代）
- **停止支持 ES5**。
- 删除了在 `create` 函数中**指定自定义 equality 函数**的功能。
- **改进了 `shallow` 函数**，使其支持 iterable 对象。

从 v4 迁移到 v5 时，建议先升级至 v4 的最新版本。v4 最新版会显示 deprecation 警告，因此先解决这些警告，再升级到 v5，就能顺利完成迁移。

<hr>

### 参考资料

:::ref
- [docs] [React useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)
- [docs] [Jotai Comparison](https://jotai.org/docs/basics/comparison)
- [article] [InterBolt, Concurrent React, External Stores, and Tearing](https://interbolt.org/blog/react-ui-tearing/)
:::
