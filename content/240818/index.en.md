---
emoji: 🤯
title: 'Zustand, What Makes You ProviderLess?'
seoTitle: 'Why Does Zustand Have No Provider? — An Analysis of How It Works with useSyncExternalStore'
date: '2024-08-18'
categories: 프론트엔드 React
description: "A source-code analysis of how Zustand manages state without a Provider, including how its module-scoped design differs from the React Context API."
keywords: "how Zustand works, why Zustand has no Provider, React state management library, Zustand source code analysis, useSyncExternalStore, React Context API"
locale: en
translationOf: '240818'
sourceHash: 7e4c03efdbf0b5dead93870b853fa5c987ebfd96bb765663ebb98da138417e85
---

In this post, I want to explore how Zustand manages state without a Provider.

While using Zustand, I had always taken it for granted that I could manage state without a Provider. Then a question suddenly occurred to me. In most libraries across the React ecosystem, wrapping the app in a Provider has become almost ritualistic. TanStack React Query requires a `QueryClientProvider` before you can use `useQuery`, and toss's overlay-kit requires an `OverlayProvider` before it can call `overlay.open()`. React's Context API likewise requires the component tree to be wrapped in a Provider. So what kind of magic lets Zustand avoid that entire process?

Out of curiosity, I dug directly into Zustand's source code and found a more interesting structure than I had expected. This post organizes what I learned along the way.

<hr>

## How Does State Flow in React?

In a typical React application, state works as shown below.

![3.png](3.png)

State inside a component is managed with the state management hooks React provides (`useState`, `useReducer`). State is then passed to child components through props. So far, this is straightforward.

The problem arises when state must be shared between components that are far apart. React's official solution is the Context API, which requires wrapping the subtree in a Provider component.

<hr>

### Why Does the Context API Need a Provider?

To answer this question, we need to look briefly at React's internals.

React manages the component tree using an internal data structure called Fiber. Each Fiber node is connected through parent-child relationships, and when a Context value changes, React traverses this Fiber tree from top to bottom, finds the components subscribed to that Context, and triggers them to rerender.

The key is this: **Context value propagation depends on the structure of the Fiber tree.** The Provider's position in the tree determines the scope across which its value is delivered, and a component that calls `useContext` walks up its own Fiber ancestry to find the nearest Provider. What if there is no Provider? It simply uses the default value passed to `createContext`.

In other words, the Context API is tightly coupled to React's rendering system. State storage, propagation, and subscription all happen inside React's component tree.

How, then, does Zustand bypass this structure?

<hr>

## Zustand Lives Outside React

![4.png](4.png)

Zustand is based on the Flux pattern. The `state` inside a closure acts as the Store, user-defined functions act as Actions, the `set` function acts as the Dispatcher, and React components act as Views. This is where the decisive difference appears.

**A Zustand Store exists outside the React component tree, within the scope of a JavaScript module.**

Unlike state managed inside React, the phrase "outside the component tree," often used when discussing Zustand, means that the state exists independently of React's Fiber tree. Any component can access the Store simply by using `import`, with no need to wrap the app in a Provider. (It is accessible from anywhere like a global variable, while still being safely protected inside a closure.)

How is this possible? Consider the code below.

```typescript
import { create } from 'zustand';

const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
```

In this code, `create` is called when the module is loaded. In other words, the Store already exists in memory before React even begins rendering. This is the **module-level singleton pattern**.

<hr>

### What Is a Module-Level Singleton?

JavaScript's ES module system **evaluates a module only once and caches the result**. Any subsequent `import` of that module returns the same cached object instead of executing the module again. In other words, whether component A or component B uses `import { useStore } from './store'`, both refer to **the exact same Store instance**.

There is no need to implement a separate singleton class or attach anything to a global variable (`window.store`). The module system itself naturally satisfies the singleton requirements of "created only once and accessible as the same instance from anywhere." Zustand directly leverages this language-level guarantee, enabling every component to share a single Store without a separate Provider.

At this point, one question naturally follows: what exactly does Zustand look like internally?

<hr>

## Zustand's Internal Structure

Looking through [Zustand's GitHub repository](https://github.com/pmndrs/zustand/tree/main/src), its core logic is surprisingly concise. Two files are central: `vanilla.ts` contains the Store itself, while `react.ts` provides the bridge to React.

<hr>

### vanilla.ts

[vanilla.ts](https://github.com/pmndrs/zustand/blob/main/src/vanilla.ts) is the heart of Zustand. Everything about how a Store is created and how its state is managed is contained in this one file. Put more simply, it defines the state enclosed in a closure and the functions that manipulate that state.

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

Breaking down this code line by line reveals Zustand's core mechanisms.

- **State encapsulation through a closure**

  - The variable `let state: TState` is declared locally inside `createStoreImpl`. Even after the function finishes executing, internal functions such as `setState` and `getState` continue to reference it, so it is not garbage-collected. This is the essence of a closure.

  - External code has no way to access the `state` variable directly. It can only read it through `getState()` and write it through `setState()`. (This is effectively an object-oriented private field implemented with a closure.)

- **Change detection with `Object.is`**

  - After calculating the next state, `setState` compares it with the existing state using `Object.is(nextState, state)`. If the references are identical, nothing happens. This is the first line of defense against unnecessary rerenders.

  - However, because this `Object.is` comparison performs a **strict referential equality** check, consumers need to be careful in one particular area. There is no issue when selecting a single primitive value, such as a number or string.

    ```typescript
    const count = useStore((state) => state.count);
    ```

    But the situation changes when a selector **returns a new object**.

    ```typescript
    const { count, name } = useStore((state) => ({
      count: state.count,
      name: state.name,
    }));
    ```

    Even when the values are identical, the `{ count, name }` object receives a new reference on every call. Because `Object.is` compares only the reference rather than the object's properties, Zustand considers the state "changed" and triggers a rerender every time.

    To solve this problem, Zustand provides the **`useShallow`** hook.

    ```typescript
    import { useShallow } from 'zustand/react/shallow';

    const { count, name } = useStore(
      useShallow((state) => ({ count: state.count, name: state.name }))
    );
    ```

    `useShallow` compares the returned object's **top-level properties one by one**, triggering a rerender only when a value actually changes. This is similar to how Redux's `useSelector` uses reference comparison by default but accepts `shallowEqual` as its second argument. (As its name suggests, however, `useShallow` performs a "shallow" comparison, so remember that it does not track changes inside nested objects.)

- **A Pub/Sub listener system**

  - The single line `const listeners: Set<Listener> = new Set()` constitutes Zustand's entire subscription system. When state changes, `listeners.forEach` notifies every subscriber.
  - Calling `subscribe` adds a listener to the `Set`, and calling the returned function removes it from the `Set`.
  - This pattern matters because it is **a notification system completely independent of React's Fiber tree**. Rather than having a Provider traverse the tree to find subscribers, the Store manages its subscriber list directly.

- **Creating the initial state**

  - Consider the final line that handles the initial state.

    ```typescript
    const initialState = (state = createState(setState, getState, api))
    ```
    
    A great deal is compressed into this one line. In JavaScript, the assignment operator (`=`) is an expression that **returns the assigned value itself**. This means `state = createState(...)` inside the parentheses runs first and assigns the initial state to `state`, after which its return value is assigned again to `const initialState`. As a result, `state` and `initialState` **refer to the same object**.

    Why store the same value in two separate variables? The key is that the variables have different roles.

    - **`state`** is declared with `let`. It is replaced with a new value every time `setState` is called. In other words, it represents **the live state at the current point in time**.
    - **`initialState`** is declared with `const`. It permanently preserves the state from the moment the Store was created. No later call to `setState` changes this value. It is **the Store's original snapshot**.

    This `initialState` is exposed through the `getInitialState()` method and passed in `react.ts` as the **third argument (the server snapshot)** to `useSyncExternalStore`.

    ```typescript
    const slice = React.useSyncExternalStore(
      api.subscribe,
      () => selector(api.getState()),       
      () => selector(api.getInitialState()), 
    )
    ```

    In a server-side rendering (SSR) environment, browser APIs are unavailable and there is no user interaction, so `setState` is never called. The server therefore always uses `initialState` (= the original state) as its snapshot. When hydration begins on the client, React compares the HTML rendered on the server with the client's initial rendering result. Because both sides rendered from the same `initialState`, this **prevents a hydration mismatch**.

<hr>

### react.ts

[react.ts](https://github.com/pmndrs/zustand/blob/main/src/react.ts) connects the pure JavaScript Store created above to React's rendering system.

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

The key here is `useSyncExternalStore`. Introduced in React 18, this hook was designed to **safely integrate a state store that exists outside React with React's rendering cycle**.

Its structure becomes clear when we examine the three arguments accepted by `useSyncExternalStore`. (They are almost identical to what we covered earlier in vanilla.ts.)

- **`api.subscribe`**: The function that subscribes to Store changes. Through this function, React asks to be notified when the state changes.
- **`() => selector(api.getState())`**: Returns a snapshot of the current state. React calls this function on every render to retrieve the latest state.
- **`() => selector(api.getInitialState())`**: The initial snapshot used during server-side rendering. It prevents server and client state from diverging during hydration.

In particular, `useSyncExternalStore` solves the **tearing problem** that can arise in React's Concurrent Mode. Tearing occurs when different components show **different snapshots of the same data source** within a single render pass.

A concrete scenario makes this easier to understand. Component A reads `store.value` (= 10) and begins rendering. In Concurrent Mode, React then **yields**, pausing the render and returning control to the browser. In the meantime, a WebSocket message arrives and changes `store.value` to 11. When React resumes rendering, component B reads `store.value` (= 11). The result is a **teared UI** in which A displays 10 and B displays 11 in the same frame. Before React 18, rendering was always synchronous, so this problem did not occur.

`useSyncExternalStore` records the snapshot (`getSnapshot`) from the start of the render. If the external Store changes during rendering and the snapshot no longer matches, it detects the change and **restarts the render from the beginning**. This guarantees that every component renders from the same snapshot.

The `createImpl` function ties all of this together.

```typescript
const createImpl = <T>(createState: StateCreator<T, [], []>) => {
  const api = createStore(createState)
  const useBoundStore: any = (selector?: any) => useStore(api, selector)
  Object.assign(useBoundStore, api)
  return useBoundStore
}
```

It creates a vanilla Store with `createStore`, wraps it in a custom hook called `useBoundStore`, and then uses `Object.assign` to attach the Store API methods (`setState`, `getState`, `subscribe`, and so on) directly to the hook function. The returned `useBoundStore` consequently has a dual nature: it is **both a React hook and the Store API**. (A function that also has methods is a distinctly JavaScript-like pattern.)

<hr>

## What About Other State Management Libraries?

Now that we understand this much, it is natural to compare Zustand with other libraries.

There are many state management libraries, including Jotai, Recoil, MobX, Xstate, and Redux, but I will focus on the ones I have personally used.

> For reference, **Recoil** (Meta), which was often compared with Jotai, was effectively discontinued when its repository was archived in January 2025. It also never received React 19 support. If you want an atomic state model, Jotai is arguably the only practical choice today.

<hr>

### Redux

Redux also uses a module-level Store internally. Why, then, does it need a Provider?

Redux's `<Provider store={store}>` **injects** the Store instance into the component tree through React Context. Internally, `useSelector` and `useDispatch` call `useContext` to access the Store supplied by the Provider. The important point is that Redux uses Context **not as a state propagation channel, but as a means of Dependency Injection**. What Context carries is not the state value itself, but a **reference to the Store object** that manages the state. Actual state subscriptions and updates are handled by the Store's internal Pub/Sub system.

The benefits of this design are clear. Tests can be completely isolated by wrapping them in a Provider with a different Store instance, and a single app can use the `context` prop to construct multiple independent Store trees. As Mark Erikson, a Redux maintainer, emphasizes, "Context is a transport mechanism, not a state management tool."

<hr>

### Jotai

Jotai adopts an **atomic state model** that is fundamentally different from Redux or Zustand. Rather than collecting state in one large Store object, it **separates each piece of state into an independent atom**. (Jotai's official documentation likewise explains that "Zustand is similar to Redux, while Jotai is similar to Recoil.")

The central difference in this structure is **how rendering is optimized**. Zustand takes a **top-down** approach, extracting only the required portion from a single Store through a selector. Developers must write selectors themselves, as in `useStore((state) => state.count)`, and memoization is sometimes necessary to preserve referential equality. Jotai, by contrast, automatically builds a **dependency graph** among atoms and performs **bottom-up** propagation: when a particular atom changes, only the components that depend on that atom rerender. This automatic dependency tracking is especially powerful when dozens of pieces of state are intertwined, as in a spreadsheet or canvas editor.

From a Provider perspective, Jotai occupies an interesting middle ground. It uses a global Store by default and works without a Provider, but it can also be wrapped in `<Provider>` to create an isolated Store scope when needed. Borrowing the wording of Jotai's official documentation, Jotai is **"context first, module second,"** whereas Zustand is **"module first, context second."**

<hr>

### Zustand's Choice

Zustand made the most radical choice. By default, it is a module-level singleton and has no Provider at all. What this choice delivers is an **extremely simple API**: create a Store with `create`, call the hook from a component, and you are done.

Strictly speaking, however, "there is no Provider at all" describes only the **default design**. Since v4, you can combine `createStore` (a vanilla Store) with React's `createContext` to implement the **Scoped Store** pattern.

[TkDodo's blog (the React Query maintainer)](https://tkdodo.eu/blog/zustand-and-react-context) explores this pattern in depth. His central argument is that a global singleton Store has three limitations.

- **It cannot be initialized from props**: Because the Store is created when the module loads, there is no way to use server-provided data or a parent component's props as initial values.
- **Test isolation is difficult**: The Store must be reset manually for every test.
- **It cannot be reused**: If two components that need Stores with the same structure are rendered on one page, they end up sharing state.

The Scoped Store pattern solves all three problems. Its central idea is to pass **a reference to the Store instance through Context, rather than the state value**. (This is exactly the same structure used by Redux's Provider.)

Here is a concrete implementation.

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

You can now render as many independent multi-select components as you want on the same page.

```tsx
// 각 SelectionProvider가 자신만의 스토어 인스턴스를 가진다
<SelectionProvider initialItems={['A', 'B', 'C']}>
  <MultiSelect />
</SelectionProvider>

<SelectionProvider initialItems={['X', 'Y', 'Z']}>
  <MultiSelect />  {/* 위 컴포넌트와 상태가 완전히 독립 */}
</SelectionProvider>
```

The point to notice is that Context carries **the Store object, not the state value**. Because the Context `value` (= the Store reference) does not change when the state value changes, **changes to the Context value do not cause unnecessary rerenders.** For actual rerendering, `useStore` uses its internal `useSyncExternalStore` with the selector. Context's transport role and Zustand's subscription role remain cleanly separated.

TkDodo described a real-world application of this pattern in a design system's multi-select component. The previous architecture, which managed internal state with `useState` + Context, suffered performance degradation with more than 50 items; switching to Zustand's selector-based subscription solved the problem.

After v4 removed `zustand/context` and its `createContext` helper from v3, this pattern settled on **directly combining React's native `createContext` with Zustand's `createStore`/`useStore`**. The API remains unchanged in v5, and [Zustand's official documentation](https://github.com/pmndrs/zustand/blob/main/docs/previous-versions/zustand-v3-create-context.md) presents this pattern in its v4+ migration guide.

<hr>

## The Shadow Side of ProviderLess

Of course, having no Provider does not bring only advantages. Here are the points that I believe require caution.

<hr>

### State Sharing Problems in SSR

A module-level singleton can be dangerous in a server environment. A Node.js server handles multiple requests in a single process, while a module is loaded only once within that process. This means that requests from different users may **share the same Store instance**.

This is why Zustand provides `getInitialState` and passes the server snapshot as the third argument to `useSyncExternalStore`. Even so, this alone may not fully isolate state between requests. In SSR environments, the recommended approach is therefore to use the Scoped Store pattern mentioned earlier (`createStore` + React Context) and create a new Store for each request.

<hr>

### The Difficulty of Test Isolation

With a Provider-based library, wrapping each test in a different Provider naturally isolates the Store. Zustand's module-level singleton, on the other hand, can leak state between tests. You must explicitly reset the Store in each test's `beforeEach`. (I once struggled with this issue myself.)

```typescript
// 테스트 파일에서의 스토어 리셋 예시
beforeEach(() => {
  useStore.setState(useStore.getInitialState());
});
```

The Scoped Store pattern is also a solution here. When using a Provider, each test can create and inject a new Store, providing complete isolation without reset logic.

<hr>

### The Lack of Multiple Instances

If one application needs two independent Stores with the same structure, the Provider pattern can simply wrap them in separate Providers. With a module-level singleton, however, the Store creation function must be called separately to create distinct Store instances. For example, if one page contains two independent tab panels and each must manage its selection state separately, a global singleton cannot express that arrangement naturally.

Once again, the `createStore` + Context pattern is the answer. When each tab panel component renders its own Provider, it creates a completely independent instance with the same Store structure. Zustand's official documentation also recommends this pattern "when a reusable component needs a Store."

## Conclusion

To summarize what we have examined, Zustand's ProviderLess design is made possible by the combination of four mechanisms.

- **Module-level singleton**: The Store is created outside the React component tree, within the scope of a JavaScript module.
- **State encapsulation through a closure**: In `vanilla.ts`, `createStoreImpl` encloses the `state` variable and `listeners` Set in a closure, preventing external access.
- **Its own Pub/Sub system**: Instead of traversing the Fiber tree, it directly manages a `Set<Listener>` to notify subscribers of state changes.
- **React integration through `useSyncExternalStore`**: It safely synchronizes changes in the external Store with React's rendering cycle.

Ultimately, Zustand asks this question: "Does state really have to live inside React?" Zustand's answer is clear. State can remain outside React, with a bridge added only when needed. That bridge is `useSyncExternalStore`.

Of course, this approach is not the best choice in every situation. A Provider-based design may be more appropriate for SSR, test isolation, or multiple instances. There is no single correct answer, but understanding the design trade-offs each library has chosen helps you select the right tool for the situation.

I also encourage readers to open the source code of a library they use at least once. You may discover a depth that the official documentation does not reveal.

<hr>

![7.jpeg](7.jpeg)

### One More Piece of News

While researching the material above, I learned that **Zustand v5.0.0 was officially released in October 2024**.

Interestingly, v5 contains almost no new features. New features had already been added throughout v4.x while existing APIs were deprecated, so v5 is primarily a **cleanup release**. The major changes are listed below. (For details, see the **[release page](https://github.com/pmndrs/zustand/releases)** and the **[migration guide](https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5)**.)

- The minimum requirements were raised to **React 18 and TypeScript 4.5 or later**.
- **`getServerState` was removed**. (It was replaced by the third argument to `useSyncExternalStore`.)
- **ES5 support was dropped**.
- Support for specifying **a custom equality function was removed** from the `create` function.
- The **`shallow` function was improved** to support iterable objects.

When migrating from v4 to v5, the recommended approach is to update to the latest v4 release first. The latest v4 release displays deprecation warnings, so addressing those warnings before upgrading to v5 makes the transition straightforward.

<hr>

### References

:::ref
- [docs] [React useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)
- [docs] [Jotai Comparison](https://jotai.org/docs/basics/comparison)
- [article] [InterBolt, Concurrent React, External Stores, and Tearing](https://interbolt.org/blog/react-ui-tearing/)
:::
