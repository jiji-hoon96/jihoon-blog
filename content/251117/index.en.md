---
emoji: 🛡️
title: 'Error Propagation'
seoTitle: "How Errors Propagate in React: What ErrorBoundary Catches"
date: '2025-11-17'
updatedAt: '2026-09-24'
categories: frontend React TanStack-Query error-handling
description: 'Throw the same error from seven places and only four reach an ErrorBoundary. This post traces where each kind actually propagates.'
keywords: "React error handling, error propagation, React ErrorBoundary, what ErrorBoundary cannot catch, startTransition error, unhandledrejection, window onerror, React 19 onCaughtError, TanStack Query throwOnError, useSuspenseQuery error, react-router loader ErrorBoundary, React.lazy chunk load failed, fetch does not reject on 404"
locale: en
translationOf: '251117'
sourceHash: 3f6e8fa00d3cc487b5caedfdc24f91ad33196ab0eb9c55899c052ad83bdee38c
---

In this post, I want to talk about **how far an error climbs in the frontend**.

Drawing `ErrorBoundary` is easy. Put one on the route, wrap every screen in an `ErrorBoundary`, and the diagram has no gaps. The hard part is knowing what that `ErrorBoundary` **actually receives**.

The word "propagation" in the title means **how far a thrown error climbs and who ends up receiving it**. The place it is thrown and the place it is received are not always the same, which is why they have to be counted separately.

So I counted. I threw the same `new Error('boom')` seven times, changing only the place, and watched whether it reached the `ErrorBoundary` or went past the `ErrorBoundary` to somewhere else.

The widget below is that experiment. Pick a place to throw on the left and the error is actually thrown inside the dashed box. The dashed box is the `ErrorBoundary`, and when the `ErrorBoundary` receives it the inside turns into a fallback. What is not received looks like nothing happened at all, so the widget also listens to `window` and its `error` and `unhandledrejection` events and writes below where it went.

:::widget-error-propagation
:::

Only four of the seven reach the `ErrorBoundary`. The other three are thrown inside the `ErrorBoundary` and still pass straight through the `ErrorBoundary` out to the global scope.

This post checks why that split happens, one kind of error at a time: the ones that end at compile time, the ones from render and lifecycle, the ones that come from server data, the ones from navigation, the ones third-party libraries throw, and the ones from events and async code. The point is to find out where each of them propagates to. **How many layers to split the receiving side into, and how to recover, are not covered here.** Drawing layers without knowing the propagation paths leaves those layers empty, which is why the order is this way.

I checked in two ways. Library behavior was read from the installed sources rather than from memory, and anything that could be confirmed by throwing was actually run in the widget above.


## ErrorBoundary

First, let me place `ErrorBoundary` precisely. An `ErrorBoundary` is **two lifecycle methods of a class component**. It simply goes by another name.

`react-error-boundary` has only two implementations.

```js
static getDerivedStateFromError(e) { ... }
componentDidCatch(e, t) { ... }
```

The official React docs separate when the two methods run. `getDerivedStateFromError` runs in the **render phase** and produces the state that draws the fallback, while `componentDidCatch` runs in the **commit phase** and takes care of side effects such as logging. Either way, they only receive **what React caught inside the tree and handed over**.

So there is a single definition of what an `ErrorBoundary` receives. **Was it thrown from a place React can catch.**

The React docs also write down the side that is not received. These four are it.

::::quote
:::translation
Event handlers, server side rendering, errors thrown in the `ErrorBoundary` itself rather than in its children, asynchronous code such as `setTimeout` or `requestAnimationFrame` callbacks; there is one exception, the `useTransition` Hook's `startTransition` function. Errors thrown inside that transition function are caught by error boundaries.
:::

:::original
Event handlers, Server side rendering, Errors thrown in the error boundary itself (rather than its children), Asynchronous code (e.g. `setTimeout` or `requestAnimationFrame` callbacks); an exception is the usage of the `startTransition` function returned by the `useTransition` Hook. Errors thrown inside the transition function are caught by error boundaries
:::
::::

The widget results match that sentence exactly. Seven places split into two destinations.

![Seven throw sites are stacked on the left and two destinations sit on the right. During render, inside useEffect, inside startTransition and a rejected lazy import go to ErrorBoundary along blue arrows, while inside an onClick handler, inside a setTimeout callback and a rejected Promise go to window along gray arrows](1.png?w=720)

`startTransition` is the exception because the work inside it goes through React's scheduler. React wraps that execution with its own hands, so it can catch it and route it back into the tree. For the same reason `setTimeout` cannot be caught. By the time that callback runs, React is no longer there.

There is one thing to know first. **You cannot build an `ErrorBoundary` out of a function component.**

When React meets a thrown error it climbs from that spot toward the parent, looking for a boundary to receive it. `throwException`, which owns that walk, reads the `tag` attached to each fiber, and the only values it stops at are class component and root. A function component's `tag` is neither, so the search walks straight past it. **It fails to be a boundary not because the API is missing but because the search never looks at it.**

![Four boxes sit in a row. From the left, the function components Child and FnBoundary are tag 0, the class component ErrorBoundary is tag 1, and the root HostRoot is tag 3. An arrow starting at Child passes FnBoundary and stops at ErrorBoundary, and the line continuing to HostRoot is dashed](2.png?w=720)

That `tag` is decided by whether the component inherits from `React.Component`. So attaching `getDerivedStateFromError` to a function as a `static` does nothing. I attached it and ran it, and the function was never called once; the error found no boundary, climbed to the root, and React removed the tree from the screen.

So installing `react-error-boundary` is not adding a feature that does not exist. The `ErrorBoundary` in 6.1.6 is also a class that inherits from `Component` and carries the same two methods. What the library does is write that class once and hide it.


## What ends at compile time

While counting kinds, let me start with the earliest one. Type errors.

This is the only kind that never reaches the user. Reading a property that does not exist or passing an argument whose type does not match blocks the build, and blocked code is not deployed. So there is no propagation path to trace. **Type errors are left out of this post not because they do not matter but because they do not exist at runtime.**

The problem is what comes next. **How far** does type checking guarantee?

```ts
async function getComments(postId: string): Promise<Comment[]> {
  const res = await fetch(`/api/posts/${postId}/comments`)
  const data = await res.json()
  return data.comments
}
```

The return type says `Promise<Comment[]>`, so every caller of this function believes it receives an array. But `Response` and its `json()` are declared like this in TypeScript 5.9.3's `lib.dom.d.ts`.

```ts
json(): Promise<any>;
```

`any`. Type checking stops here. The compiler has never seen the value the server returned, and the type argument or return type annotation written after it is **a declaration, not a check**. Nobody inserts code that verifies that declaration at runtime.

So when the server returns `200` with `{ commits: null }`, the line that reads `commits.length` throws a `TypeError` during render. HTTP succeeded and the types passed, yet the screen breaks.

**Where types end is where a runtime check belongs.** Where that check goes decides which path the same failure takes. If it blows up while reading during render it becomes a render error and goes to the `ErrorBoundary`, and if you check where the data arrives and throw there it becomes that request's failure. The **Render and lifecycle** section below covers that.


## Render and lifecycle

Anything thrown inside the React tree propagates simply. **The nearest `ErrorBoundary` receives it.**

Exceptions during render belong here. The `commits.length` above is one, and calling `map` on a value you thought was an array is another. This group has nothing to do but throw, so it always reaches an `ErrorBoundary`.

Something thrown inside `useEffect` is caught too. React runs effects itself after commit, so it can wrap that execution. But an **async callback called inside** an effect is different.

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

The two snippets sit inside the same `useEffect`, yet their propagation paths differ. **The test is not whether it is inside an `ErrorBoundary` but whether React is holding on to that execution.**

There is one more thing to remember about this group. React 19's development console attaches the component name to a caught error. When I ran the widget, render and effect and transition all said `The above error occurred in the <Thrower> component`, and only `lazy` said `occurred in one of your React components`. `lazy` has no component yet at the moment it rejects, so it cannot write a name. That difference becomes a clue when you have only a stack to find the spot with.


## Server data

This is where the tricky part of frontend work begins. The reason is that a server failure **does not automatically become an error**.

### fetch does not reject on server errors by itself

MDN writes this down clearly.

::::quote
:::translation
A `fetch()` promise only rejects when the request itself fails, for example because the request URL is badly formed or a network error occurred. It does not reject when the server responds with an HTTP status code that indicates an error, such as `404` or `504`.
:::

:::original
A `fetch()` promise only rejects when the request fails, for example, because of a badly-formed request URL or a network error. A `fetch()` promise does not reject if the server responds with HTTP status codes that indicate errors (`404`, `504`, etc.).
:::
::::

So if you only use `fetch`, a `500` response is a **successful Promise**. Nothing was thrown, so the `ErrorBoundary` does not know and neither does the data library. The TanStack Query docs make the same point. For a query to be judged as failed the `queryFn` has to throw or return a rejected Promise, and while `axios` throws on its own, `fetch` does not.

So turning a server failure into an error is **a job you have to do yourself**.

```ts
const response = await fetch('/todos/' + todoId)
if (!response.ok) {
  throw new Error('Network response was not ok')
}
```

Without these three lines the rest of this section means nothing. What is not thrown propagates nowhere.

### Five ways one failure splits

Once a failure becomes a failure, the next split begins. The same single `500` scatters to five places depending on **how it was called**. This is with the defaults, no options touched.

**`useQuery` does not throw.** Open `useQuery.js` and the string `throwOnError` is not there at all. Whether to throw is decided by `query-core` and its `shouldThrowError`.

```js
function shouldThrowError(throwOnError, params) {
	if (typeof throwOnError === "function") return throwOnError(...params);
	return !!throwOnError;
}
```

With no value it is `!!undefined`, so `false`. The failure only lands in `query.error` and the component renders normally. The outer `ErrorBoundary` never learns that its turn came.

**`useSuspenseQuery` throws, but not always.** This hook spreads the options and then overwrites `throwOnError`.

```js
return useBaseQuery({
  ...options,
  enabled: true,
  suspense: true,
  throwOnError: defaultThrowOnError,
  placeholderData: void 0
}, QueryObserver, queryClient);
```

The overwrite comes after `...options`, so **a `throwOnError` passed by the caller is ignored.** And the default decision that takes its place is one line in `suspense.js`.

```js
const defaultThrowOnError = (_error, query) => query.state.data === void 0;
```

**If there is a cache to show, it does not throw.** In practice the place this branch splits is a background refetch. A first-time visitor has an empty cache, so the failure goes to the `ErrorBoundary` and they see the fallback. A visitor already on the screen who leaves for another tab and comes back triggers a refetch, and if that fails the cache still holds the old data, so nothing is thrown. The screen keeps showing the stale value and does not change on its own.

Not breaking the screen is mostly good behavior. **What comes along with it is that the screen does not tell you**, and choosing that knowingly is different from being caught by it.

**Neither of the two functions a mutation returns goes to the `ErrorBoundary`.** The reasons differ. Open `useMutation.js` and one side swallows the rejection directly.

```js
observer.mutate(args[0], args[1]).catch(noop);
```

This is `mutate`. In the same file `mutateAsync` exports `result.mutate` as is, and that `result.mutate` is what `mutationObserver.js` shipped with `mutate: this.mutate`, so it ends up being the same function the line above wrapped. **Only one side goes through `.catch(noop)`.** That rejection blows up where it is `await` ed rather than being thrown during render, so this side has nothing to do with the `ErrorBoundary` either.

**That does not mean a mutation is forever unrelated to the `ErrorBoundary`.** There is one more switch in the hook body.

```js
if (result.error && shouldThrowError(observer.options.throwOnError, [result.error])) throw result.error;
```

Give it `throwOnError` and this line throws **during render**, and then it goes to the `ErrorBoundary`. The two returned functions not reaching the `ErrorBoundary` and the hook not throwing are two different stories.

![From a single server 500 on the left, five arrows fan out to useQuery, useSuspenseQuery, a hook with throwOnError on, mutate and mutateAsync, and each of those leads on to query.error, ErrorBoundary, ErrorBoundary, mutation.error and the caller's catch. Only the two middle ErrorBoundary boxes are tied together with a dashed line, marked as the two that ErrorBoundary receives](3.png?w=720)

To sum up, the same `500` has five destinations. The `query.error` field, the `mutation.error` field, the caller's `catch`, and the two cases that go to the `ErrorBoundary`. The two that go to the `ErrorBoundary` are `useSuspenseQuery` failing with no cache, and `throwOnError` being turned on. **The calling style, not the kind of failure, decides the destination.**


## Navigation

Failures that happen while moving between screens split in two. The dividing line is **inside or outside the React tree**.

### loader runs outside the tree

A router `loader` is a function that runs before rendering starts. It is not a React component, so neither `getDerivedStateFromError` nor `componentDidCatch` reaches it. No matter how much you wrap things with `react-error-boundary`, that `ErrorBoundary` cannot see a loader failure.

Instead the router keeps its own `ErrorBoundary` system. The React Router docs put it this way.

::::quote
:::translation
Route modules automatically catch errors in your code and render the closest `ErrorBoundary`.
:::

:::original
route modules will automatically catch errors in your code and render the closest `ErrorBoundary`.
:::
::::

How the closest one is picked is in the source. `findNearestBoundary` picks like this.

```js
function findNearestBoundary(matches, routeId) {
  let eligibleMatches = routeId ? matches.slice(0, matches.findIndex((m) => m.route.id === routeId) + 1) : [...matches];
  return eligibleMatches.reverse().find((m) => m.route.hasErrorBoundary === true) || matches[0];
}
```

It scans the matched routes from the back, picks the first route that has an `ErrorBoundary`, and sends the error to the frontmost route when there is none. **So putting one more `ErrorBoundary` on a lower route is not duplication, it narrows the area the fallback is drawn over.**

The reading side differs too. A route `ErrorBoundary` does not receive the error as props, it pulls it out directly with `useRouteError()`. Whether a status code came with it is decided by `isRouteErrorResponse(error)`. Neither of these exists on React's `ErrorBoundary`.

### A lazy rejection is inside the tree

Within the same navigation, the side that receives code late is the opposite. When `lazy(() => import('./Tab'))` has its `import()` rejected, React takes it and throws it to the **nearest `ErrorBoundary`**. The fourth button in the widget is this path.

When a deploy ships, the old chunk files disappear, while a screen opened before the deploy still holds the old addresses. Ask for that code in that state and `import()` rejects, and Chrome throws `TypeError: Failed to fetch dynamically imported module`.

One more thing attaches here. **`lazy` remembers the rejection.** React's `lazyInitializer` writes the result into `payload`, and on rejection it changes the status and stores the reason.

```js
payload._status = 2;
payload._result = error;
```

From then on, every time this component renders, the last branch runs.

```js
throw payload._result;
```

It does not `import()` again. The `lazy()` call happened once at module top level and that `payload` stays for as long as the app lives. **Resetting the `ErrorBoundary` and remounting brings the same error back.** That is why recovering from this failure means loading the page again.

Within the same navigation, a loader failure is received by the router and a `lazy` failure by React. **Unless you separate these two before deciding where to put an `ErrorBoundary`, one of them has nowhere to go.**


## Global handlers outside ErrorBoundary

Where did the three the `ErrorBoundary` failed to catch go? To **the browser's global handlers**.

What is thrown from an event handler or a `setTimeout` callback ends up at `window` and its `error` event. A Promise rejection goes to a different event. MDN defines it this way.

::::quote
:::translation
The `unhandledrejection` event is sent to the global scope of a script when a JavaScript Promise that has no rejection handler is rejected. Typically this is the `window`, but it may also be a `Worker`.
:::

:::original
The `unhandledrejection` event is sent to the global scope of a script when a JavaScript Promise that has no rejection handler is rejected; typically, this is the `window`, but may also be a `Worker`.
:::
::::

These two are the last places the browser receives anything. They are also where most error monitoring tools catch browser errors.

React 19 added one more receiving spot on the tree side as well. It is an option on `createRoot`. The official docs separate the three like this.

| Option | When it is called |
|---|---|
| `onCaughtError` | When React caught an error inside an Error Boundary |
| `onUncaughtError` | When an error was thrown and no Error Boundary caught it |
| `onRecoverableError` | When React recovered on its own |

Receiving and fixing are different. **A global handler catching something does not restore the screen.** Even when an error thrown inside `onClick` is received by `window` and sent to a monitoring tool, at that moment the user simply sees a button that did not respond. Reporting and recovering are different jobs.


## Wrapping up

Memorizing frontend error handling as a list of tools keeps leaving holes. It happens even after you know `ErrorBoundary`, `throwOnError`, `useRouteError`, `lazy` and `unhandledrejection`. Not because the tools are unknown, but because **what goes where was never counted**.

Here is what this post covered.

- An `ErrorBoundary` only receives what React caught and handed over. Event handlers and async callbacks are not in that spot.
- Type checking ends at the response. From the point `json()` returns `any`, it is a declaration, not a check.
- A server failure does not become an error by itself. `fetch` does not reject on `500`, so throwing is a job you do yourself.
- Once thrown, the calling style decides the destination. The same failure goes to a field, to the caller, or to an `ErrorBoundary`.
- Navigation splits in two. A loader is outside the tree so the router receives it, and `lazy` is inside the tree so React does.
- Outside the `ErrorBoundary` there are global handlers. Things are caught, but the screen is not restored.

So the job before drawing an `ErrorBoundary` is not choosing a component to wrap. It is **writing down every place this screen can fail and marking which of the six above each one belongs to**. An unmarked place is a hole.

It would be good to find out how many places your own screen can fail in, how many of those reach an `ErrorBoundary`, and where the ones that do not are going.

[The next post](/251203) covers what receives each destination. How many layers to split into, how to handle the screen area one failure takes, and what else has to be reset for the retry button in a fallback to actually retry.


:::ref
- [docs] [React, Error Boundary in Component](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [docs] [React, error callbacks on createRoot](https://react.dev/reference/react-dom/client/createRoot)
- [docs] [React, lazy](https://react.dev/reference/react/lazy)
- [docs] [React Router, Error Boundaries](https://reactrouter.com/how-to/error-boundary)
- [docs] [TanStack Query, Query Functions](https://tanstack.com/query/latest/docs/framework/react/guides/query-functions)
- [docs] [MDN, unhandledrejection](https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event)
- [docs] [MDN, fetch](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch)
- [docs] [axios, Error handling](https://axios.rest/pages/advanced/error-handling)
- [repo] [bvaughn/react-error-boundary](https://github.com/bvaughn/react-error-boundary)
:::
