---
emoji: 🔁
title: "Why the Retry Button Does Nothing"
seoTitle: "ErrorBoundary Retry Button Not Working? 3 Causes to Check"
date: '2025-11-28'
updatedAt: '2026-10-08'
categories: frontend React TanStack-Query error-handling
description: "Three cases where retry in a react-error-boundary fallback brings back the same fallback, checked in installed source, and how to clear each one."
keywords: "ErrorBoundary retry not working, QueryErrorResetBoundary, retryOnMount, resetErrorBoundary, onReset, React.lazy chunk load error, useSuspenseQuery error, react-error-boundary"
locale: en
translationOf: '251128'
sourceHash: fcf6001b4010f388052cef96f91df83091e0a33fd111de033ea9cf622021a566
---

In this post, I want to talk about **why the retry button on an `ErrorBoundary` does nothing**.

This is for frontend developers who put a retry button in a `react-error-boundary` fallback, only to see the same screen come back when they press it, and it lays out the three cases where the failed state remains and how to clear each one. The short answer: an `ErrorBoundary` only resets its own state, and the state that caused the failure stays with whatever threw.

The examples use TanStack Query together with `react-error-boundary`. I checked the libraries' behavior by opening their installed source, and the quoted code has the same structure as the build files of `@tanstack/react-query` 5.104.1, `react-error-boundary` 6.1.6, and React 19.2.3 (compared on 2026-10-08). Indentation and line breaks are adjusted in places for readability.


## Three cases where retry does nothing

There are three causes, and each one is undone in a different place. They have one thing in common. **An `ErrorBoundary` only undoes its own state.** State held by whatever threw has to be cleared by whatever threw.

### The query error reset clears

All `resetErrorBoundary()` does is put the `ErrorBoundary`'s internal state (`didCatch`) back. When the children remount, the query hook reads the cache again. But that query is **stuck in the cache in an error state.** So the hook throws the same error right away during render and the `ErrorBoundary` draws the fallback again.

Why it uses the old error instead of refetching is in the source too. `errorBoundaryUtils.js` turns off the refetch on remount like this.

```js
if (options.suspense || throwOnError) {
  if (!errorResetBoundary.isReset()) options.retryOnMount = false;
}
```

Read the outer guard first. **This condition only applies to queries that throw.** When a query with `suspense` on, or with `throwOnError` on, mounts while `isReset()` is false, `retryOnMount` becomes `false` and the refetch is turned off. A `useQuery` that does not throw is unaffected and simply refetches when it remounts.

That said, turning off `retryOnMount` only has an effect on a query that has never had data in the cache, that is, a query that failed on its first load. A query that had data gets `isInvalidated` set to true when it fails, is treated as stale, and refetches on remount through `refetchOnMount`. The query errors this post talks about are first-load failures.

That does not mean the refetch stays off forever. While the fallback is showing, no component is watching that query, so it becomes an inactive query, and under [TanStack Query's defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults) it is removed from the cache after 5 minutes. Press the button after that and there is no error in the cache, so it requests from scratch. That is why code that forgot `onReset` can seem to work when you press it much later. If your repro is inconsistent, first check whether you pressed before or after `gcTime`.

![On top, the flow when onReset is not wired: retry click, ErrorBoundary released, remount, throws the cached error again, and from the last box a red arrow loops back to the first labelled as the same fallback. Below, the flow when onReset is wired: retry click, onReset and the reset() call, ErrorBoundary released and remount, refetch, connected in one direction by blue arrows](1.png?w=720)

**`retryOnMount` is turned off only for a query lifted into an `ErrorBoundary`, and that is why you have to clear the `ErrorBoundary` and the query together.** What raises the flag that `isReset()` reads is `QueryErrorResetBoundary`. Open the source and the state is a single boolean.

```js
reset: () => {
	isReset = true;
},
```

If the flag were only ever raised and nobody lowered it, later errors would not turn off `retryOnMount` either, and every one would request again. The one that lowers it is the query hook. The remounted hook reads the flag during render and does not turn off `retryOnMount`. `getHasError`, which looks at the same flag, does not throw the cached error either. Then, after it is attached to the screen, it lowers the flag in an effect. The function lives in the same `errorBoundaryUtils.js`.

```js
const useClearResetErrorBoundary = (errorResetBoundary) => {
	React.useEffect(() => {
		errorResetBoundary.clearReset();
	}, [errorResetBoundary]);
};
```

So a single boolean is enough to mean retry just this once. In order, one retry goes like this:

1. `reset()` raises the `isReset` flag.
2. The remounted query hook sees the flag during render and does not turn off `retryOnMount`.
3. With the flag raised, the hook sees a pending state instead of the cached error and requests again (`useSuspenseQuery` sends the request during render and suspends).
4. If the request succeeds and the component is attached to the screen, `clearReset()` in an effect lowers the flag; if it fails again, that request's `catch` lowers it.
5. With the flag lowered, later errors turn off `retryOnMount` again.

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

Here is how `react-error-boundary` implements `resetErrorBoundary`. It is a built file so the names are down to one letter, but the structure still reads.

```js
resetErrorBoundary(...e) {
  const { didCatch: t } = this.state;
  t && (this.props.onReset?.({ args: e, reason: "imperative-api" }), this.setState(d));
}
```

Only when `didCatch` is true does it call `onReset` and set the state back to the initial value `d` (`didCatch: false`). `setState` renders after the handler finishes, so by the time the children remount, the flag that `reset()` raised is already up. That is why it is enough to wire `onReset` to `reset`.

Even without wrapping in `QueryErrorResetBoundary`, if you take `useQueryErrorResetBoundary()` and pass its `reset` to `onReset`, retry works. With no enclosing boundary, the hook returns a module-global default. The cost, as the [Suspense guide](https://tanstack.com/query/latest/docs/framework/react/guides/suspense) notes, is that the reset applies globally and the whole app shares one `isReset` flag.

### The render error reset cannot clear

The second is when the server returns a 200 with a shape other than the one you expected, and the render that reads it throws a `TypeError`. The same `ErrorBoundary` received it and `onReset` is wired, yet retry does nothing.

What `reset` clears is **a query in an error state**. But this query succeeded. The server gave a 200 and the cache holds that value as normal data. What produced the error was the render that read it. So `reset` has nothing to clear, and the remounted component reads the same cached value during render and throws again on the same line. Because it throws before it is attached to the screen, it never gets to subscribe to the query. That is why it does not request again even with `staleTime` set to 0. This query too is removed from the cache once `gcTime` passes and is requested again, but as long as the server sends the same value it throws again on the same line.

The place to fix it is **`queryFn`**.

```ts
queryFn: async () => {
  const res = await fetch(`/api/posts/${postId}/comments`)
  const data = await res.json()
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

Then why not create a new `lazy` and call `import()` again? Until now the browser blocked that. The module map remembered the failed result and did not fetch the same URL again. An [HTML spec change](https://github.com/whatwg/html/pull/10327) that changes this was merged on 2026-07-15. Engine status as checked on 2026-10-08: Firefox [shipped it in 155](https://bugzilla.mozilla.org/show_bug.cgi?id=2055211), released 2026-09-01. WebKit [landed it in main](https://bugs.webkit.org/show_bug.cgi?id=319492) on 2026-08-19, and the bug record does not name a stable Safari release that includes it. Chrome is still Proposed on [chromestatus](https://chromestatus.com/feature/5214647044145152). So in Chrome, a fresh `import()` returns the same failure.

This applies to builds that load chunks with the browser's native `import()`, such as Vite. The webpack runtime loads chunks with script tags and clears the record of a failed chunk, so calling it again through a new `lazy` requests it again.

Either way, a `lazy` you already created does not try again, so the default recovery from this failure is fetching the page again. Even once browsers do refetch, not every case clears. A chunk load failure can come from a dropped network, or, as the [Vite docs](https://vite.dev/guide/build#load-error-handling) explain, from a new deployment deleting the old chunks. A deleted chunk is still missing when requested again, so in that case recovery is still a reload. Since you cannot pin down a single cause, the fallback text is better off suggesting a reload than asserting that a new version is out.

In short, a query error is cleared with `reset`, a render error by turning it into a query error in `queryFn` beforehand, and a chunk failure by reloading.


## Wrapping up

If a retry button does nothing, I hope you will check **what threw and where its state is still held** before looking at the button or the `ErrorBoundary`. Where you clear it depends on whether it is the query cache, the render that read what the server sent, or `lazy`.

Where on the screen to put `ErrorBoundary` and how many, and which failures should not get a retry button at all, are covered in [Placing ErrorBoundary](/251203).

:::ref
- [docs] [TanStack Query, QueryErrorResetBoundary](https://tanstack.com/query/latest/docs/framework/react/reference/QueryErrorResetBoundary)
- [repo] [bvaughn/react-error-boundary](https://github.com/bvaughn/react-error-boundary)
:::
