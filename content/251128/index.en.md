---
emoji: 🔁
title: "Why the Retry Button Does Nothing"
seoTitle: "ErrorBoundary Retry Not Working: QueryErrorResetBoundary"
date: '2025-11-28'
categories: frontend React TanStack-Query error-handling
description: "Three cases where retry in a react-error-boundary fallback brings back the same fallback, checked in installed source, and how to clear each one."
keywords: "ErrorBoundary retry not working, QueryErrorResetBoundary, retryOnMount, resetErrorBoundary, onReset, React.lazy chunk load error, useSuspenseQuery error, react-error-boundary"
locale: en
translationOf: '251128'
sourceHash: 9b7369d4cc04cce44463bae3484aac4cfc28f8721890c7216a90b1df3612021d
---

In this post, I want to talk about **why the retry button on an `ErrorBoundary` does nothing**.

This is for frontend developers who put a retry button in a `react-error-boundary` fallback, only to see the same screen come back when they press it, and it lays out the three cases where the failed state remains and how to clear each one. The short answer: an `ErrorBoundary` only resets its own state, and the state that caused the failure stays with whatever threw.

The examples use TanStack Query together with `react-error-boundary`, and I checked the libraries' behavior by opening their installed source.


## Three cases where retry does nothing

I attached a retry button to the fallback. That is the button the user presses to undo a failure. Let us press it. **Nothing happens.** The same screen comes back unchanged.

It arises for three reasons and each is undone differently. They have one thing in common. **An `ErrorBoundary` only undoes its own state.** State held by whatever threw has to be cleared by whatever threw.

### The query error reset clears

All `resetErrorBoundary()` does is flip the `ErrorBoundary`'s internal flag back. The children remount and the query resubscribes. But that query is **stuck in the cache in an error state.** So it immediately throws the same error again and the `ErrorBoundary` draws the fallback again.

Why it uses the old error instead of refetching is in the source too. `errorBoundaryUtils.js` locks it like this.

```js
if (options.suspense || throwOnError) {
  if (!errorResetBoundary.isReset()) options.retryOnMount = false;
}
```

Read the outer guard first. **This lock only applies to queries that throw.** A query with `suspense` on, or with `throwOnError` on, that mounts without a reset marker has its retry turned off. A `useQuery` that does not throw is unaffected and simply refetches when it remounts.

![On top, the flow when onReset is not wired: retry click, EB released, remount, throws the cached error again, and from the last box a red arrow loops back to the first labelled as the same fallback. Below, the flow when onReset is wired: retry click, onReset and lock released, EB released and remount, refetch, connected in one direction by blue arrows](1.png?w=720)

**What gets locked is only a query lifted into an `ErrorBoundary`, and that is why you have to clear both states together.** What raises that marker is `QueryErrorResetBoundary`. Open the source and the state is a single boolean.

```js
reset: () => {
	isReset = true;
},
```

You connect this `reset` to the `ErrorBoundary`'s `onReset`. TanStack Query's docs and source comments also show code that connects them this way as an example.

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

Order matters. And `react-error-boundary` guarantees that order. It is a built file so the names are down to one letter, but the structure still reads.

```js
resetErrorBoundary(...e) {
  const { didCatch: t } = this.state;
  t && (this.props.onReset?.({ args: e, reason: "imperative-api" }), this.setState(d));
}
```

They are joined by a comma operator, so **`onReset` runs first and `setState` comes after**. `d` is the initial state where `didCatch` is `false`. So the children remount after the cache lock has been released. **One line of difference is what turns retry into an actual retry.**

Putting `Query` in the name is deliberate too. Call it `AsyncBoundary` and it reads as usable for any async work, which it is not, because `QueryErrorResetBoundary` sits inside it. For the same reason I gave `pendingFallback` no default value. With a default, a single line at the call site does not tell you what gets laid down.

### The render error reset cannot clear

The second is when the server returns a 200 with a shape other than the one you expected, and the render that reads it throws a `TypeError`. The same `ErrorBoundary` received it and `onReset` is wired, yet retry does nothing.

What `reset` clears is **a query in an error state**. But this query succeeded. The server gave a 200 and the cache holds that value as normal data. What produced the error is the render that read it. So `reset` has nothing to clear, and the remounted component gets the same cache, still within `staleTime`, and throws again on the same line.

The place to fix it is **`queryFn`**.

```ts
queryFn: async () => {
  const data = await getComments(postId)
  if (!Array.isArray(data.comments)) {
    throw new TypeError('comments 가 배열이 아니다')
  }
  return data.comments
},
```

On a `fetch` response, `json()` returns `Promise<any>`, so a type you attach after it is a declaration, not a check, and the runtime check that verifies what the server sent has to be put in yourself. **Lift that check up into `queryFn`** and the same failure becomes **the query's error**. It stays in the cache in an error state, `reset` clears it, and retry refetches.

If you put the runtime check off because the `ErrorBoundary` catches it anyway, you get a fallback that receives but cannot undo.

### The lazy only a reload clears

The third is a chunk load failure. This time neither `reset` nor `queryFn` is involved. What holds the state is `lazy` itself.

React's `lazyInitializer` writes the rejection into `payload` and from then on throws the same thing every time.

```js
throw payload._result;
```

It does not `import()` again. The `lazy()` call happened once at module top level, and that `payload` stays as it is for the life of the app. Release the `ErrorBoundary` and remount, and the same error comes back.

So recovering from this failure means fetching the page again. It also means a new version has been deployed, so it is better to tell the user exactly that.

Put the three cases together and one retry button has to do three different jobs. A query error is cleared with `reset`, a render error by turning it into a query error up in `queryFn` beforehand, a chunk failure by reloading. **The `ErrorBoundary` does none of them for you.**


## Wrapping up

If a retry button does nothing, I hope you will check **what threw and where its state is still held** before looking at the button or the `ErrorBoundary`. Where you clear it depends on whether it is the query cache, the render that read what the server sent, or `lazy`.

Where on the screen to put `ErrorBoundary` and how many, and which failures should not get a retry button at all, are covered in [Placing ErrorBoundary](/251203).

:::ref
- [docs] [TanStack Query, QueryErrorResetBoundary](https://tanstack.com/query/latest/docs/framework/react/reference/QueryErrorResetBoundary)
- [docs] [TanStack Query, Suspense](https://tanstack.com/query/latest/docs/framework/react/guides/suspense)
- [repo] [bvaughn/react-error-boundary](https://github.com/bvaughn/react-error-boundary)
:::
