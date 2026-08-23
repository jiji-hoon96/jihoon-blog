---
emoji: 🛡️
title: 'Error Handling'
seoTitle: 'Frontend Error Handling — A Guide to Combining Error Boundaries with TanStack Query throwOnError'
date: '2025-11-17'
categories: frontend React TanStack-Query error-handling
description: "This article explains the responsibilities of React Error Boundaries, try/catch, and TanStack Query's throwOnError, and how they work together. It distinguishes render-phase errors from asynchronous errors and covers how reset works in react-error-boundary."
keywords: "frontend error handling, React Error Boundary, react-error-boundary, TanStack Query throwOnError, React Query error handling, Error Boundary reset, try catch errors, asynchronous error handling, React error handling"
locale: en
translationOf: '251117'
sourceHash: 688aa8b21e8068e6d24e46e383d3dddbb24778dff87c065c19b3489cff0380fa
---

In this post, I want to discuss **how to catch errors on the frontend**.

In practice, I have often felt vaguely uneasy whenever I wrote error-handling code. Some errors are caught with `try/catch`, some by an `ErrorBoundary`, and others by TanStack Query's `onError`. Their respective domains subtly overlap or fail to line up. As a result, errors sometimes leak out, while at other times they propagate farther than intended.

The problem is that we rarely take the time to examine how all these tools work together. We may know that "Error Boundaries only catch render-phase errors," but if asked exactly what that means in practice, what happens internally when `reset` is called, or at what point TanStack Query rethrows an error when `throwOnError` is enabled, we may struggle to answer.

Based on React's official guide, the `react-error-boundary` library, and the official TanStack Query v5 documentation, this article explains **where the responsibility of each frontend error-handling tool ends** and **how the tools fit together**.


## Errors React Can and Cannot Catch

Let's begin with the most fundamental question: **Which errors does React catch?**

The official React documentation clearly distinguishes between errors that an Error Boundary can catch and those it cannot.

**What an Error Boundary catches**

- Errors thrown while a child component is **rendering**
- Errors thrown inside **lifecycle methods**
- Errors thrown in **constructors**

**What an Error Boundary does not catch**

- Errors inside **event handlers**
- Errors in asynchronous code such as `setTimeout`, `requestAnimationFrame`, and **Promises**
- Errors during **server-side rendering (SSR)**
- Errors thrown by the **Error Boundary itself**

Why does this distinction matter? Most of the errors we deal with every day actually **belong to the second category.** A button click triggers a mutation and the server returns a 500 response; a fetch inside `useEffect` fails; validation logic throws while a form is being submitted. React does not catch these errors automatically. We must catch and handle them explicitly.

Frontend error handling therefore splits into two paths: **use an Error Boundary for render-phase errors**, and **use try/catch or library callbacks for everything else**. At the point where these paths intersect, asynchronous state-management libraries such as TanStack Query serve as a bridge.


## What an Error Boundary Really Is

An Error Boundary is ultimately a **class component** with two lifecycle methods. According to the official React documentation, a component must implement one of the following methods—usually both—to become an Error Boundary.

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

`getDerivedStateFromError` must be a **pure function**. Its sole role is to return new state without side effects. In contrast, `componentDidCatch` is the place for side effects. This is where you send the error to Sentry or log the component stack to the console.

There is one important point here: these two methods **exist only on class components.** There is still no official way to build an Error Boundary as a function component. The [official React documentation](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary) explicitly says so.

::::quote
:::translation
There is currently no way to write an Error Boundary as a function component.
:::

:::original
There is currently no way to write an Error Boundary as a function component.
:::
::::

Writing a class component from scratch every time is cumbersome, so developers typically use the `react-error-boundary` library. (It was created by former React maintainer Brian Vaughn and is effectively treated as the standard.)


## Three Types of Fallback in react-error-boundary

The `react-error-boundary` library's `ErrorBoundary` component offers **three ways** to specify fallback UI through props. Let's take a quick look at how each one is used.


### fallback

This is the simplest form: pass static JSX directly.

```tsx
<ErrorBoundary fallback={<div>문제가 발생했습니다.</div>}>
  <Page />
</ErrorBoundary>
```

Use it when you do not need access to the error object or the reset function. In practice, I have not used it yet because an error message or a retry action is usually necessary.


### FallbackComponent

Extract the fallback UI into a separate component and pass its **reference**.

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

The error object and the `resetErrorBoundary` function are automatically injected as props. This approach is clean when the fallback UI may be reused elsewhere.


### fallbackRender

Use this when you want to render the fallback inline.

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

It does essentially the same thing as `FallbackComponent`, but lets you **handle it inline without creating a separate component**. It is useful when you need access to an outer closure, such as parent state or handlers.

There is no single correct choice among the three, but the pattern I use most often in production is to **create one shared ErrorFallback component and inject it through `FallbackComponent`**. This keeps the design system and tone consistent. I use `fallbackRender` inline only when a page needs a different fallback.


## What Does reset Actually Do?

When using `react-error-boundary`, you naturally encounter the `resetErrorBoundary` function. It is the function called when the user clicks the "Try again" button in the fallback. Let's examine what it actually does.

In short, `resetErrorBoundary` only tells the ErrorBoundary component to **reset its own state and render its children again**. It does not automatically touch any external state, such as the TanStack Query cache.

Here is what happens internally, step by step.

1. `resetErrorBoundary()` is called.
2. The ErrorBoundary's internal `hasError` state returns to `false`.
3. Optionally, the `onReset` callback runs. This is where custom side effects happen.
4. The children render again. If the cause of the error—such as state or cache—remains, **the same error is thrown again.**

The final step is the key. **Reset only means "forget the error and try rendering again"; it does not mean "fix the cause of the error."** Calling reset alone can therefore cause the same error to repeat indefinitely.

Two additional tools help solve this problem.


### onReset

This acts like a hook that runs immediately before the reset. Use it to clean up the external state that caused the error.

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

The ErrorBoundary resets automatically when values in this array change. Pass keys for which it makes sense to retry when the value changes, such as URL parameters, a search term, or the selected tab.

```tsx
<ErrorBoundary
  FallbackComponent={ErrorFallback}
  resetKeys={[userId]}
>
  <UserProfile userId={userId} />
</ErrorBoundary>
```

When `userId` changes, the boundary resets automatically and its children render again. If the user navigates to another profile, the previous error naturally disappears.


## How Do We Catch Errors from Event Handlers and Asynchronous Code?

As discussed earlier, Error Boundaries do not catch errors from event handlers or asynchronous code. Yet that is where most of the errors we deal with occur. So how should we handle them?

For this problem, `react-error-boundary` provides the **`useErrorBoundary` hook**. The hook returns a function called `showBoundary`; calling it lets you explicitly send an error to the nearest ErrorBoundary.

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

The key is that **the developer must explicitly promote the error**. React does not do it automatically. If you want to move an asynchronous error into the ErrorBoundary's domain, catch it with `try/catch` and pass it to `showBoundary`.

Once you understand this pattern, the question "Why does the ErrorBoundary catch some errors but not others?" has a clean answer: **"Was the error promoted into the render phase or not?"**


## How Does TanStack Query Handle Errors?

At this point, a natural question arises. The `useQuery` hook we use every day handles asynchronous requests, so what happens to errors thrown inside it?

By default, TanStack Query exposes the error through the **`error` field**.

```tsx
const { data, error, isError } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
});

if (isError) {
  return <div>에러: {error.message}</div>;
}
```

This is the simplest form. Even when an error occurs, the component renders normally; the `error` field simply contains a value. The ErrorBoundary is not involved.

There is one important fact to note here. **TanStack Query's default behavior is not to throw errors.** Whether the queryFn throws or rejects, the error merely enters the `error` field and does not disrupt React's render flow. Without additional configuration, the ErrorBoundary will therefore never run.

TanStack Query also **retries errors three times by default**.

The default `retryDelay` uses exponential backoff, increasing to a maximum of 30 seconds. In other words, an error is not shown to the user immediately after the first failure. TanStack Query retries at intervals of 1, 2, and 4 seconds, and only fills the `error` field after all those attempts fail. (If you have ever wondered during development, "Why does the error appear so late?", this is almost certainly why.)


### Connecting to an ErrorBoundary with throwOnError

How, then, do we route a TanStack Query error to an ErrorBoundary? The answer is the **`throwOnError`** option. (Until v4, it was named `useErrorBoundary`; in v5, it was renamed to `throwOnError`.)

```tsx
const { data } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  throwOnError: true,
});
```

When this option is enabled, TanStack Query **throws the error again during the next render cycle**. That throw becomes a render-phase error, allowing the ErrorBoundary to catch it.

`throwOnError` can also accept a function. This lets you route some errors to the ErrorBoundary while handling others directly in the component.

```tsx
useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  // 5xx 서버 에러만 ErrorBoundary로 보낸다
  throwOnError: (error) => error.response?.status >= 500,
});
```

This pattern is practical because **client errors such as 4xx responses—for example, validation failures or missing permissions—** are usually best displayed at the point where they occur, while **server errors such as 5xx responses** are better handled by covering the entire page and showing "Please try again later."


### useSuspenseQuery

If you use `useSuspenseQuery`, you do not need to worry about `throwOnError`. In Suspense mode, **errors are always thrown by default**.

In other words, using `useSuspenseQuery` means **Suspense handles loading and ErrorBoundary handles errors**. You no longer need branches such as `if (isError)` or `if (isLoading)` inside the component; instead, you wrap it with the two boundaries externally.


## QueryErrorResetBoundary

By now, another question may have occurred to you. What happens when the user clicks the "Try again" button in the fallback?

As we saw earlier, `resetErrorBoundary` only resets the ErrorBoundary's `hasError` state. But the TanStack Query cache still contains a **query stuck in an error state**. When the children render again, TanStack Query checks the cache, concludes, "This query is already in an error state," and immediately throws the same error again. (It is an infinite loop from hell.)

To solve this problem, TanStack Query provides the **`useQueryErrorResetBoundary` hook** and the **`QueryErrorResetBoundary` component**. Their names are long, but their job is simple: issue the command **"Reset the error state of the queries in this scope."**

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

Let's walk through what happens here in chronological order.

1. The user clicks the "Try again" button → `resetErrorBoundary()` is called
2. The ErrorBoundary runs its `onReset` callback → `reset()` is called (resetting TanStack Query's error state)
3. The ErrorBoundary resets its own state and renders its children again
4. The `useQuery` inside the children runs → with the error state cleared, it tries to fetch again

The key is the connection from `onReset` to `reset`. That single line synchronizes the state of the ErrorBoundary and TanStack Query.


### Using the Component Form

You can achieve the same result with a component instead of the hook. You only need one of the two.

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

The biggest difference from the hook version is that it passes the `reset` function down to its child through the **render prop pattern**. `QueryErrorResetBoundary` accepts a function as its children, passes `{ reset }` as an argument, and renders that function's return value. This lets you connect it directly with `onReset={reset}` inside.

When there is no nearest `QueryErrorResetBoundary`, the hook version **resets errors in the global cache**. The component version limits the reset scope to its own child subtree. If you want tighter control over the scope, the component version is safer.

One point is worth emphasizing here: **reset does not clear the cache.** It does not discard all the data; it is closer to releasing queries from their "errored" state. If you actually want to invalidate the data, you must call `queryClient.invalidateQueries()` separately.


## Mutation Errors

Almost all the patterns discussed so far have focused on `useQuery`. But **`useMutation` works somewhat differently.**

The biggest difference is that a mutation is usually triggered by an **explicit user action, such as a click or submission**. It is therefore natural to handle the error close to that action. Rather than covering the whole page with a fallback, it is more appropriate to show something like "Payment failed: please check your card information" in a toast or next to the form.

TkDodo's [Mastering Mutations in React Query](https://tkdodo.eu/blog/mastering-mutations-in-react-query) summarizes the essence of this difference in one sentence: **queries are declarative, while mutations are imperative.** A query runs automatically when its component mounts, can be subscribed to by other components using the same key, and is cached for reuse. In contrast, a mutation only runs when the user presses a button, is not cached, and is tied one-to-one to the component instance that invoked it. This fundamental difference divides their error-handling approaches.

`useQuery` uses a default `retry` value of `3`, but **`useMutation` uses a default `retry` value of `0`.** The reason is simple: mutations cause **side effects**. If a payment request fails because of a network timeout and the library automatically invokes it twice more, the user's card might be charged three times.

The rule, therefore, is to enable retries for a mutation explicitly **only when you are certain that the operation is idempotent**. This applies to safe GET-style reads whose result is guaranteed to remain the same when the same request is sent twice, or when the server prevents duplicates with an idempotency key.

An error from `useQuery` is **stored in the cache**. It therefore propagates immediately to other components subscribing to the same `queryKey`, and must be reset collectively with a mechanism such as `QueryErrorResetBoundary`.

Mutations are different. An error from a mutation instance in one component **remains only in that instance's state.** It has no effect on a mutation in another component using the same `mutationFn`. This is why TanStack Query has no equivalent such as `MutationErrorResetBoundary`: **there is no need for one.**

This distinction has one practical consequence. When two components call the same `useMutation`, an error in one is not visible in the other. If you want "the entire app to know about errors from this mutation," component-level `onError` is insufficient; you need to promote them through `MutationCache.onError`.


### mutate vs mutateAsync

`useMutation` returns two execution functions. The difference between them determines how errors are handled.

The return type of mutate is `void`. It does not return a Promise. You therefore cannot await its result, and can receive the outcome only through callbacks such as `onSuccess/onError`.


```tsx
const mutation = useMutation({
  mutationFn: createPost,
  onError: (error) => {
    toast.error(`등록 실패: ${error.message}`);
  },
});

mutation.mutate(newPost);
```


In contrast, `mutateAsync` returns a Promise. You can handle errors with `try/catch`.

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

When should you use each one? I distinguish between them using the following criteria.

- **A follow-up action is required after the mutation finishes** (for example, routing on success or using the returned value) → `mutateAsync`
- **You only need to invoke it and can leave side effects to callbacks** (for example, toggling a like or only showing a toast) → `mutate` + `onError`

There is one common mistake here. **If you use `mutateAsync` without `try/catch`, an unhandled promise rejection occurs.** The callback-based `mutate` absorbs the error, but `mutateAsync` throws it to the caller by default. Mixing the two without understanding this difference fills the console with red warnings.


### onError

There is another detail that is often overlooked. `useMutation`'s `onError` callback can be defined in **two places**: at the hook level and at the mutate level.

```tsx
const mutation = useMutation({
  mutationFn: createPost,
  onError: (error) => {
    Sentry.captureException(error);
  },
});
```

The hook-level callback always runs, while the mutate-level callback is defined at the call site.

```tsx
mutation.mutate(newPost, {
  onError: (error) => {
    setFormError(error.message);
  },
});
```

The official documentation specifies this execution order: **hook level → mutate level.** If both callbacks are defined, the hook-level callback runs first, followed by the mutate-level callback.


## Global Error Handling

All the patterns discussed so far operate at the component level. But you may have requirements such as "log every query error in one place" or "always log out on a 401 error." For these cross-cutting concerns, you can attach callbacks to `QueryCache`/`MutationCache` when creating the **QueryClient**.

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

The key is that `QueryCache.onError` is called **only once for each query**. Even if multiple components subscribe to the same query, the callback runs only once, preventing problems such as duplicate toasts.

You can also check `query.state.data !== undefined`, as in the example above. If a **refetch fails while cached data already exists**, the user can still see data on the screen. Covering the page with an ErrorBoundary at that point is excessive; it is more appropriate simply to notify the user that the refresh failed. Conversely, if the initial load fails when no cached data exists, the ErrorBoundary should catch it and show a fallback.

Combining these two flows lets you design a clean policy: "Use an ErrorBoundary for initial-load failures and a toast for background refetch failures."


## A Shared Component

At this point, it is tempting to think: wrapping everything in `QueryErrorResetBoundary`, `ErrorBoundary`, and `Suspense` every time is cumbersome, so why not **combine them into one reusable component**?

It is a natural idea. In fact, I once built and used an `AsyncBoundary` component like this.

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

On a page, it can be reduced to a single line.

```tsx
<AsyncBoundary>
  <Content />
</AsyncBoundary>
```

It looks clean. But a colleague gave me the following feedback.

> The name AsyncBoundary is not such a universally established term that having different things inside it would feel especially strange, but **the presence of React Query's ResetBoundary is somewhat hard to anticipate.**

> And the default values for `pendingFallback` and `rejectedFallback` also bother me a little. From the single line `<AsyncBoundary>`, there is no way to tell which fallbacks are applied inside, so **I don't think readers will even realize that these props have default values.**


### The Name Hides a Dependency

This component is named `AsyncBoundary`. The name conveys only the idea of an asynchronous boundary. But its implementation is **strongly coupled to TanStack Query**. It includes `QueryErrorResetBoundary`, with `onReset` connected to `reset`. In other words, this component is really **"a boundary for asynchronous regions that use React Query,"** but its name does not reveal that at all.

Why is this a problem? Because it **violates the reader's expectations**. We do not read code by interpreting it one line at a time; we read by **predicting** from patterns built through experience. When those predictions fail, cognitive load rises sharply.

When a colleague first sees the name `AsyncBoundary`, they picture "a general-purpose boundary for asynchronous work." It seems as though it could be used with SWR or direct fetch calls too. In reality, however, `QueryErrorResetBoundary` is embedded inside it, introducing a **meaningless coupling in contexts that do not use TanStack Query**. There is a mismatch between the name and the implementation.

You could view this as the reverse of a leaky abstraction. An ordinary leak exposes details that should have been hidden behind the abstraction; here, **a dependency that should be visible is hidden too effectively behind the name.** It may be worse. (You use it without realizing.)


### Reveal the Dependency in the Name

The simplest remedy is to rename it. Instead of `AsyncBoundary`, make the dependency explicit with a name such as **`QueryAsyncBoundary`**. Looking at the [Suspensive](https://suspensive.org/) library built by Toss, I found that it makes this dependency explicit. `@suspensive/react` contains only the general-purpose `ErrorBoundary` and `Suspense`, while `@suspensive/react-query` provides the TanStack Query-integrated `QueryAsyncBoundary` component as a separate package.

That one-word difference communicates a great deal to readers. The moment the `Query` prefix appears, it immediately signals, **"This is specifically for a TanStack Query environment."** It prevents accidental use in the wrong context.


### Break It Down into Composable Units

A more fundamental approach is **not to bundle them at all**.

ErrorBoundary and Suspense are fundamentally **different concerns**, and combining them into a single component can reduce compositional flexibility. Some pages may need only an ErrorBoundary, others only Suspense, and still others may want two Suspense boundaries inside one ErrorBoundary. Bundling them into `AsyncBoundary` makes such variations awkward. Keeping them separate allows free composition.

This pattern adds one more line of code, but has the advantage that **each boundary's responsibility is directly visible in the code**. And when using `useSuspenseQuery`, the unit you usually want to handle as a single loading state differs from the unit whose errors you want to catch, so separating them tends to feel more natural.

My conclusion is this: **bundle the boundaries if the repeated composition pattern is truly identical; separate them if you need variations.** Even when you bundle them, make the dependency visible in the name. Following these two principles alone will reduce review feedback along the lines of, "I don't know what is inside AsyncBoundary."


### Default Props

Fixing the naming issue is not enough. Look again at the code above.

```tsx
pendingFallback = <Spinner />,
rejectedFallback = ErrorFallback,
```

The reason a single line such as `<QueryAsyncBoundary>...</QueryAsyncBoundary>` works is that `Spinner` and `ErrorFallback` are automatically supplied internally. **That is not information you can infer from the name.**

This is another version of the earlier criticism that "the name hides a dependency." The `Query` prefix now reveals the Query dependency, but the UI dependencies on `Spinner` and `ErrorFallback` remain hidden behind default props. **The hiding has merely moved one layer deeper.**

The solution is simple: **make both fallbacks required props and inject them at every call site.**

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

This makes the code two lines longer. The reason to accept that cost is clear: **it increases the cost for the author while reducing the tracing cost for every reader.** At the call site, you can immediately see which fallbacks will appear. There is no need to open another file to check, "What were this component's defaults again?" The familiar principle that code is read far more often than it is written applies here too.


## ErrorFallback

There is one more point to consider. An `ErrorFallback` is usually created as a single component like this.

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

It is a clean implementation that even includes `role="alert"` and `aria-live="assertive"`. But consider one question: **"Is it okay to show the same screen for a 401, a 404, a 500, and a network outage?"**

In most cases, the answer is **no**. The action the user should take differs by error type.

| Error type | User action | Does "Try again" make sense? |
| --- | --- | --- |
| Network outage | Check the connection and retry | O |
| 5xx server error | Try again later | O |
| 401 authentication failure | Go to the login screen | X |
| 403 forbidden | Go to another screen | X |
| 404 resource not found | Return to the list | △ |
| 422 validation failure | Correct the input | X |

Showing a "Try again" button in every case incorrectly tells the user **"which action can resolve the error."** Pressing "Try again" for a 401 only produces the same 401 again. The action the user actually needs to take is logging in.

The error fallback should therefore **render differently depending on the error type**. There is no need to start with a giant `if/else`; you can create small components and branch between them.

Each fallback component should expose only the message and action appropriate for that error. Only actions the user can actually take should remain on the screen.


### shouldCatch

Taking this one step further, there is also a pattern that **distinguishes errors to catch from errors to let through at the component level**. Suspensive's `ErrorBoundary` provides a `shouldCatch` prop.

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

The inner ErrorBoundary catches only network errors and does not catch 5xx errors. Following React's default behavior, uncaught errors **propagate to the parent ErrorBoundary**. The outer ErrorBoundary can then catch the 5xx errors. Compared with implementing the same error handling using if/else, the appeal of this approach is that it **gives semantic meaning to the boundaries themselves**.

`react-error-boundary` does not have this prop, but you can achieve the same effect by branching inside the fallback. The pattern matters, not the library.


## Conclusion

In summary, frontend error handling **cannot be solved with a single tool**. Error Boundaries handle render-phase errors; `try/catch` or `showBoundary` handles errors from event handlers; TanStack Query's `throwOnError` and `useQueryErrorResetBoundary` handle asynchronous data-fetching errors; `mutateAsync` or `onError` handles mutation errors; and `QueryCache`/`MutationCache` handles cross-cutting concerns. On top of that, you must design **the names and composition boundaries of shared components** and **the domain modeling of the error types themselves** to arrive at a consistent error policy.

Once you understand what each tool is responsible for, you can make explicit decisions such as **"Catch this error here and let that error flow there."** The accumulation of those decisions is ultimately what makes the user experience reliable: preventing blank screens, avoiding the same toast appearing five times, keeping a transient network error from taking down the whole page, and showing the login screen instead of "Try again" for a 401. Details like these add up to the impression of a well-built service.

Of course, not every project needs every pattern. For a simple admin tool, one ErrorBoundary and a toast may be enough. In a domain such as payments, where one mistake directly costs money, every mutation may require fine-grained error handling. The domain determines the right answer.

I encourage readers to examine their own projects and ask, "Which errors does our service catch, where does it catch them, and what are the components called?" You may find a surprising number of errors that you believed were handled properly but are actually leaking out or reaching the wrong fallback. (That has happened to me every time.)


## References

:::ref
- [docs] [React, Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [docs] [TanStack Query, Suspense](https://tanstack.com/query/latest/docs/framework/react/guides/suspense)
- [docs] [TanStack Query, QueryErrorResetBoundary](https://tanstack.com/query/latest/docs/framework/react/reference/QueryErrorResetBoundary)
- [docs] [TanStack Query, Important Defaults](https://tanstack.com/query/v5/docs/framework/react/guides/important-defaults)
- [article] [TkDodo, React Query Error Handling](https://tkdodo.eu/blog/react-query-error-handling)
- [article] [TkDodo, Breaking React Query's API on Purpose](https://tkdodo.eu/blog/breaking-react-querys-api-on-purpose)
- [repo] [toss/suspensive, @suspensive/react-query](https://github.com/toss/suspensive)
- [docs] [React Router, Error Boundaries](https://reactrouter.com/how-to/error-boundary)
:::
