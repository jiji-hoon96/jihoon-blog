---
emoji: 🧱
title: 'Placing ErrorBoundary'
seoTitle: "Where to Place ErrorBoundary: Route, Screen, and Region"
date: '2025-12-03'
updatedAt: "2026-10-08"
categories: frontend React TanStack-Query error-handling
description: "How many ErrorBoundaries to use and where, checked in source: what route, screen, and region each receive, one shared fallback, and retry conditions."
keywords: "React ErrorBoundary placement, nested route ErrorBoundary, ErrorBoundary design, fallbackRender, useRouteError, revalidate, useSuspenseQuery error handling, TanStack Query retry condition"
locale: en
translationOf: '251203'
sourceHash: 67ce7b3aa827b0db5a574e0b77296d9b06e5d25b01b56c3627979b1a008eee79
---

In this post, I want to talk about **how many `ErrorBoundary` components to have and where to put them**. This is for frontend developers building screens with React Router and TanStack Query who keep weighing whether a failure should be received by the route's `ErrorBoundary`, by `react-error-boundary`, or by `useQuery`'s `isError`. By the end, you will have a criterion for deciding where `ErrorBoundary` goes, and a way to match the fallback and the retry condition to each place.

To give the conclusion first, the number of `ErrorBoundary` components is set not by taste but by two things: **what throws**, and **what has to remain on screen when it dies**. This post starts with the latter and covers the former where it is needed.


## The blast radius you can afford

When people ask where to put an `ErrorBoundary`, they usually think about which component to wrap. That question has no answer. There are always several components you could wrap, and the code runs no matter which one you pick.

Ask it differently. **If this dies, what has to remain on screen?**

The answer differs from place to place. If the data that forms the backbone of a screen is missing, that screen does not hold together. An action button sitting alone, with no name and no status beside it, means nothing. Conversely, if one peripheral list fails and you blank out the whole screen, the user loses everything else they could have seen perfectly well. Actions that are hard to undo are different again. The user has to learn about the failure right where they clicked.

**What an `ErrorBoundary` does is not catch a failure. It decides the area the fallback gets drawn over.** The fallback is what you draw instead of the original screen when something fails. Everything you wrapped disappears. So the position of an `ErrorBoundary` is decided not by what you want to catch, but by **the blast radius you can afford**.

That radius splits into four levels.

| Layer | What it receives | How you undo it |
|---|---|---|
| Route | what the loader threw, whatever nothing below caught | `revalidate()` |
| Screen | what was thrown during render | `resetErrorBoundary()` |
| Region | what was thrown inside it | `resetErrorBoundary()` |
| Inside the component | a failed `useQuery`, a failed mutation | `refetch()`, a toast |

![Nested rectangles: a route ErrorBoundary contains a screen ErrorBoundary, which in turn contains a region ErrorBoundary and an inside-the-component box side by side. Arrows enter from the left: what the loader threw goes to the route ErrorBoundary, what was thrown during render goes to the screen ErrorBoundary, that region's failure goes to the region ErrorBoundary, and what never throws goes to the inside-the-component box. An arrow pointing upward out of the inside-the-component box is crossed out in red and labeled as not travelling upward](1.png?w=720)

There are four names but only two kinds. **Only the route `ErrorBoundary` belongs to the router; the other two are `ErrorBoundary` you place in the tree.** The screen `ErrorBoundary` and the region `ErrorBoundary` are the same component, differing only in where they are attached. The bottom row, inside the component, is not an `ErrorBoundary` at all but a branch the component draws itself.

The sections below look at why you cannot delete any row of this table.


## Three layers you cannot delete

Once you install `react-error-boundary`, the router's side starts to look deletable. The names match, so the jobs look like they match too. But there are three reasons you cannot delete any one of them. The three counted here are route, screen, and region from the table above. Inside the component is excluded because it is not an `ErrorBoundary`.

### The loader lives outside ErrorBoundary

An `ErrorBoundary` is a class built from `getDerivedStateFromError` and `componentDidCatch`, so only **what React caught inside the tree** reaches it. A loader is a function that runs outside the tree, before rendering even starts. What it throws never passes through React, so no amount of wrapping makes it visible. How I confirmed the destinations by throwing the same error from several places is written up in [Error propagation](/251117).

That means if even one route uses a loader, **you cannot delete the route `ErrorBoundary`.** The moment you do, that failure has nowhere to go.

### The cache revalidate cannot clear

The opposite direction is blocked too. The recovery mechanism of the route `ErrorBoundary` is `revalidate()`, and that only re-runs the loader. It does not touch the query cache.

Consider a route with no loader. If a `useSuspenseQuery` inside the screen fails, the route `ErrorBoundary` does end up receiving it. The router wraps the route tree in a class of its own called `RenderErrorBoundary`, and that class also has `getDerivedStateFromError`. But pressing retry in that `ErrorBoundary` gets you nowhere: **there is no loader to re-run, and the error stuck in the cache is still there.** It received the failure but has no way to undo it.

**Receiving and undoing are different jobs.** If you do not look at both when placing an `ErrorBoundary`, you end up with a fallback that catches things nobody can clear.

### A lower ErrorBoundary narrows the radius

The third one is not about being blocked. It is about losing too much.

When something fails, the router picks one `ErrorBoundary`. The way it picks is in the source.

```js
function findNearestBoundary(matches, routeId) {
  let eligibleMatches = routeId ? matches.slice(0, matches.findIndex((m) => m.route.id === routeId) + 1) : [...matches];
  return eligibleMatches.reverse().find((m) => m.route.hasErrorBoundary === true) || matches[0];
}
```

It walks the matched routes from the back, picks the first route that has an `ErrorBoundary`, and falls back to the very first one if there is none. If a child in a nested route has no `ErrorBoundary`, **the parent** takes that job, and if the parent has none either, the root takes it.

When the root takes it, the whole screen disappears. Only one inner region failed, yet the header and the navigation go with it. Attach an `ErrorBoundary` to the child route and the fallback is drawn only in the `<Outlet />` slot.

**So adding one more `ErrorBoundary` below is not duplication.** It does not catch the same failure twice; it **changes how much gets erased**. A layout that looks like three overlapping boundaries is really three different things being received at three different radii.


## Between a region ErrorBoundary and inside the component

Once the layers are split four ways, one last fork remains. For a region the screen holds together without, you choose whether to **lift it into an `ErrorBoundary` or handle it in place**.

Either way you lose only that region and keep the rest. What differs is not how much you lose but **what you draw there instead**.

Lifting it into an `ErrorBoundary` shrinks the code. Call `useSuspenseQuery` inside and that component has neither `isPending` nor `isError`. The outer `Suspense` takes the waiting, the outer `ErrorBoundary` takes the failure. The component only draws the case where data exists. The `QueryAsyncBoundary` below is a component that bundles that `Suspense` and `ErrorBoundary` together.

```tsx
<section>
  <h2>댓글</h2>
  <QueryAsyncBoundary pendingFallback={<p>불러오는 중</p>}>
    <CommentList postId={postId} />
  </QueryAsyncBoundary>
</section>
```

In exchange, that whole region turns into the fallback. For a spot like a list, where nothing is worth keeping if the whole thing goes, that costs nothing.

Handling it in place is the opposite. You call `useQuery` and draw the four states (pending, failed, empty, present) yourself. The branches multiply, but in return you can put **wording and actions tailored to that spot**. If you want a small retry button on just the row that failed, this is the way. Lift it into an `ErrorBoundary` and the shape of that row gets decided by the fallback component, which is usually the one shared with the screen `ErrorBoundary` and is far too heavy for a single failed row.

The criterion comes out like this. **If the region can vanish whole, `ErrorBoundary` is better; if you need wording or actions tailored to that spot, `useQuery` is better.** An `ErrorBoundary` takes the branches out of your component, but it takes the freedom to decide the screen along with them.

If you decide not to lift it into an `ErrorBoundary`, **you have to handle all four states.**

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

Leave out `isError` and the failure quietly flows into the empty state. The `data` of a failed query is `undefined`, and a check like `data == null || data.length === 0` does not distinguish that `undefined` from an empty array. The screen says there are no comments yet while the server is handing out a 500 at that very moment.

Filter `isError` out first and `data` narrows to an array below it, and the `== null` check disappears.


## A different fallback per layer

Now that the layers are placed, decide what each one draws on screen. Here the route `ErrorBoundary` and the `ErrorBoundary` you place in the tree diverge again, and **the criterion for choosing is not taste but how that layer is handed the error**.

### The route ErrorBoundary reads it itself

A route `ErrorBoundary` does not need the error passed down to its fallback. The component reads it directly with `useRouteError()` and fetches its recovery mechanism on its own.

```tsx
export function RootErrorBoundary() {
  const error = useRouteError()
  const { revalidate, state } = useRevalidator()

  return <ErrorFallback error={error} onRetry={revalidate} retrying={state === 'loading'} />
}
```

So all a route needs is the component plugged in. A child route's `ErrorBoundary` has the same shape and uses the same hooks. What separates the two is not the code but **the route it is attached to**. Which route it sits on is exactly the radius the fallback is drawn over.

### The ErrorBoundary that hands it down

In `react-error-boundary`, the `ErrorBoundary` is the opposite. It holds both the error and the reset function itself, so it has to hand them down to the fallback. That is why there are three props, and the type definition binds the three as mutually exclusive.

**`fallback`** takes a finished element as is. You write it like `fallback={<p role="alert">댓글을 불러오지 못했어요</p>}`. It gives you neither the error nor the reset function. It is only usable when the message is fixed and there is no way to retry anyway.

**`FallbackComponent`** takes a component and passes `error` and `resetErrorBoundary` to it as props. It is tidy when several `ErrorBoundary` share the same fallback, but the prop name is fixed as `resetErrorBoundary`, so the receiving side has to know that name.

```tsx
function CommentsFallback({ error, resetErrorBoundary }: FallbackProps) {
  return <ErrorFallback error={error} onRetry={resetErrorBoundary} />
}

<ErrorBoundary onReset={reset} FallbackComponent={CommentsFallback}>
  <CommentList postId={postId} />
</ErrorBoundary>
```

`ErrorFallback` takes `onRetry`, so the names do not line up. That costs one more component whose only job is to move the name across.

**`fallbackRender`** takes a function and renders it right there.

```tsx
<ErrorBoundary
  onReset={reset}
  fallbackRender={({ error, resetErrorBoundary }) => (
    <ErrorFallback error={error} onRetry={resetErrorBoundary} />
  )}
>
```

I picked this one. The reason is **that you can swap the name right there**. Above, `resetErrorBoundary` became `onRetry`. Thanks to that, `ErrorFallback` becomes a component that knows only `error` and `onRetry`, and the `revalidate`-backed route `ErrorBoundary` and the `resetErrorBoundary`-backed tree `ErrorBoundary` **use the same fallback.**

**Two layers whose screens do not drift apart is what this choice buys.** Split the layers four ways and the failure screens the user sees risk becoming four as well, and swapping one name makes them one.


## Failures you do not attach retry to

Putting a retry button in the fallback does not clear every failure, because an `ErrorBoundary` only resets its own state. A query's error is refetched only once `QueryErrorResetBoundary`'s `reset` is connected to `onReset`; a render error from reading an unexpected value the server sent with a 200 clears only once `queryFn` checks it first and turns it into the query's error; and a chunk load failure of `React.lazy` clears only with a reload. How I checked the three cases in the source is written up separately in [Why the Retry Button Does Nothing](/251128). Since failures split into recoverable and unrecoverable this way, the button has to be split too.

Showing the same button on every failure means **guiding the user toward an action they cannot take**. Press retry on a 404 and you get the same 404. A 403 from missing permissions is the same. A chunk load failure does nothing at all, as shown above.

Splitting it once inside the shared fallback is enough.

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

There is a reason `isRouteErrorResponse` is in here too. The route `ErrorBoundary` and the `ErrorBoundary` in the tree share a fallback, so this function **receives both kinds of error.** Reading the status code off a `Response` the router threw and reading it off an HTTP error you built yourself work differently, so it checks both.

You do not need a huge branch from the start. Separating **failures that will come out differently when pressed again from those that will not** is enough.


## When the ErrorBoundary sees the failure

The `ErrorBoundary` are all placed, and one thing is still missing. **When does an `ErrorBoundary` see anything?**

The layers were decided top down, but the execution order is the reverse. The `ErrorBoundary` sees something only after every retry has been exhausted. So the retry condition is **part of designing the `ErrorBoundary`**.

The default differs per place. Both use the same `createRetryer`, but they pass different values into it. A query passes nothing and takes the default from `retryer.js`.

```js
const retry = config.retry ?? (isServer() ? 0 : 3);
```

A mutation puts 0 in directly, in `mutation.js`.

```js
retry: this.options.retry ?? 0,
```

**A mutation at 0 means that once a request ends in an error, the action fails right away.** No retries for actions that are hard to undo is a safe default, but if the action is idempotent, sending it once more is better for the user.

Stating the same condition on both sides is better.

```ts
const MAX_RETRY = 2

export function retryOnServerError(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRY) return false
  return !isHttpError(error) || error.status >= 500
}
```

`failureCount` starts at 0 and **asks with 0 on the first failure.** So with `MAX_RETRY` at 2 it sends three requests in total and stops. It is a retry count, not an attempt count.

**Excluding 4xx is the key part.** The request itself is wrong, so the same answer comes back however many times you send it. But waste is not the only reason to exclude them. The default delay grows exponentially.

```js
function defaultRetryDelay(failureCount) {
	return Math.min(1e3 * 2 ** failureCount, 3e4);
}
```

The first retry is 1 second and the next is 2, so two retries alone burn 3 seconds. Fail to filter out 4xx and you are **hiding an unfixable failure for 3 seconds**.

Render errors and chunk failures have no such delay. No request goes out, so there is no retry at all, and the `ErrorBoundary` sees it the moment it is thrown. **This is why the same fallback appears 3 seconds later for some failures and immediately for others.**

There is one premise to confirm before turning retries on. Is that request **idempotent?** Sending the same request twice has to produce the same result. If the server does not guarantee that, retrying is a feature that manufactures bugs.


## Wrapping up

In this post I decided what to put in each place that receives a failure. To summarize:

- The position of an `ErrorBoundary` is decided by the blast radius you can afford. You ask not what to wrap, but what has to remain when this dies.
- You cannot delete any of the three layers of `ErrorBoundary`. What the loader threw cannot reach the `ErrorBoundary` in the tree, `revalidate` cannot clear the query cache, and adding one more below narrows the radius.
- If the region can be thrown away whole, `ErrorBoundary`; if you need wording specific to that spot, `useQuery`. Choose the latter and you have to handle all four states.
- Swap the name with `fallbackRender` and the fallback becomes one even across different layers.
- Retry works only once you clear the state held by whatever threw. A query is `reset`, a render error is lifted into `queryFn`, a chunk is a reload.
- When an `ErrorBoundary` sees the failure is decided by the retry condition. Fail to filter out 4xx and you hide an unfixable failure for seconds.

You could ask whether one `ErrorBoundary` and a toast are not enough. For a product with two or three screens that is a fair point, and in fact **the number of layers is decided by the product.** If there is only one screen, there is only one screen to give up, so differences in radius are invisible. The more independent regions there are inside a screen, the larger that difference gets.

Something survives regardless of the number, though. However many `ErrorBoundary` you put in the tree, what `loader` threw does not go there, and retry does nothing unless you clear the state held by whatever threw. **What you can reduce is the layers, not these facts.**

:::ref
- [docs] [TanStack Query, QueryErrorResetBoundary](https://tanstack.com/query/latest/docs/framework/react/reference/QueryErrorResetBoundary)
- [docs] [TanStack Query, Suspense](https://tanstack.com/query/latest/docs/framework/react/guides/suspense)
- [docs] [React Router, Error Boundaries](https://reactrouter.com/how-to/error-boundary)
- [repo] [bvaughn/react-error-boundary](https://github.com/bvaughn/react-error-boundary)
- [article] [TkDodo, React Query Error Handling](https://tkdodo.eu/blog/react-query-error-handling)
- [article] [TkDodo, Mastering Mutations in React Query](https://tkdodo.eu/blog/mastering-mutations-in-react-query)
:::
