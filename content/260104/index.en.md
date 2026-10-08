---
emoji: 🔑
title: "queryKey"
seoTitle: "Mastering TanStack Query queryKey and queryOptions"
date: "2026-01-04"
updatedAt: "2026-10-08"
categories: frontend React TanStack-Query queryKey
description: "How TanStack Query queryKey management evolved from inline arrays and constants to key factories and v5 queryOptions, with DataTag and invalidation."
keywords: "queryKey, query key factory, TanStack Query queryKey, queryKey best practices, queryOptions, setQueryData, TkDodo query keys, query-key-factory, React Query v5, query invalidation"
locale: en
translationOf: '260104'
sourceHash: 9a36bf314bac28176dfc2e56aa119d80db0e87fe66e6df7a83ca4350fb6d2a19
---

In this post, I want to explore **TanStack Query's queryKey**.

This is for frontend developers using TanStack Query who are deciding whether to keep queryKeys as inline arrays, gather them into a constant object or a query key factory, or move them to v5's `queryOptions`. By the end, you will know what problem each approach was introduced to solve, and you will have a basis for judging which stage fits your codebase now.

While using TanStack Query in production, I have **completely overhauled how I manage queryKeys several times**. At first, I simply wrote arrays like `['user', userId]` inline inside components. Then I started making typos because I had to repeat the same keys in multiple places whenever I invalidated queries, so I moved them into a constant object such as `QUERY_KEYS`. After reading TkDodo's article, I switched to the query key factory pattern. Much later, I adopted the `@lukemorales/query-key-factory` library. Then v5 arrived, and I overhauled everything once more using `queryOptions`.


## Before queryKey

Before we get into the main discussion, let's establish some context. Today, we take libraries like `TanStack Query` and `SWR` for granted, but how did we handle asynchronous data before they existed?

The most common approach was probably to combine `useState`, `useEffect`, `fetch`, and `axios`.

```tsx
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/users/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ...
}
```

The problem with this code is obvious. If just two components on the page display the same `userId`, **the same request is sent twice.** That happens because there is no cache. If the user navigates to another page and returns, the data is fetched from scratch yet again. There is no way to tell whether the data was fetched one second ago or one hour ago, so even approximating behavior such as "show cached data while refreshing in the background" is difficult. (You could build your own cache system to implement this, but I think it would be quite difficult to maintain.)

Redux combined with redux-thunk (or redux-saga) emerged as a way to solve this. By moving data-fetching logic into a thunk and storing the result in the store, other components could reuse the same data. But every request required defining action types, writing a reducer, and manually managing loading, success, and failure states. The amount of boilerplate needed to fetch a single piece of data was enormous. (I started working professionally during this era and found myself wondering, "Why do I need to create several files just to fetch one piece of data?")

The essence of this progression is ultimately this: **"To avoid repeating a request, we need to be able to identify which request it is."** The identifier for that "which request" is exactly what a queryKey is.

SWR and React Query (now TanStack Query) tackled this problem head-on. "An asynchronous request must have an identifier, and requests with the same identifier share a cache." That single, simple principle eliminated all the boilerplate above.


## The essence of queryKey

So what exactly is a queryKey? TanStack Query's official documentation defines it this way.

::::quote
:::translation
At its core, TanStack Query manages query caching based on query keys. A query key must be an array at the top level... As long as the query key is serializable and **unique to the query's data**, you can use it.
:::

:::original
At its core, TanStack Query manages query caching for you based on query keys. Query keys have to be an Array at the top level... As long as the query key is serializable, and **unique to the query's data**, you can use it.
:::
::::

There are two key requirements. **It must be serializable, and it must be unique to the data.** The same key must represent the same data, and different data must have different keys. This simple rule determines how the entire cache system behaves.

There is one more important point: **a queryKey also acts as a dependency array.** Just as an effect runs again when its dependencies change in React's `useEffect`, TanStack Query automatically fetches new data when the queryKey changes.

```tsx
const { data } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
});
```

The queryKeys for a `userId` of `'A'` and one of `'B'` are different. A different key means a cache miss, and a cache miss triggers a fetch. It is automatic. Thanks to this simplicity, we do not need to write logic that says, "The userId changed, so fetch again."

So how does TanStack Query recognize an array that is created anew on every render as the same key? It does not compare array references; it uses the string produced by serializing the queryKey with `hashKey` (`queryHash`) as the cache key. This function sorts plain object keys while serializing with `JSON.stringify`, so key order inside an object does not affect the hash, while element order in an array does. A property whose value is `undefined` disappears during serialization, so `{ a: 1, b: undefined }` and `{ a: 1 }` become the same key. I have written up this behavior, following the implementation code, separately in [hashKey](/251230).


## Rules for writing queryKeys

Once you understand that a queryKey is both the cache identifier and a dependency array, the rules for writing queryKeys follow naturally. The official recommendations can be summarized as follows.

**Rule 1. A queryKey must be an array.**

Passing a string still works because it is converted to an array internally. For consistency, however, it is better to use an array from the start.

```tsx
// 비권장
useQuery({ queryKey: 'todos', queryFn });

// 권장
useQuery({ queryKey: ['todos'], queryFn });
```

**Rule 2. Include every variable that the queryFn depends on in the queryKey.**

```tsx
// 잘못된 예: userId가 쿼리키에 없다
useQuery({
  queryKey: ['user'],
  queryFn: () => fetchUser(userId),
});

// 올바른 예
useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
});
```

The mental model is exactly the same as the dependency array in `useEffect`. Every variable used inside the function must be part of the key (= dependency). Violating this rule creates bugs that are difficult to trace, such as continuing to display the previous user's data after switching to another user.

**Rule 3. Arrange the key from the most generic element to the most specific.**

```tsx
// 좋다
['todos', 'list', { filter: 'done' }]
['todos', 'detail', todoId]

// 안 좋다 (순서가 뒤집혀 있음)
[{ filter: 'done' }, 'list', 'todos']
```

This order matters because of **invalidation**. By default, TanStack Query's `invalidateQueries` uses **prefix matching**.

```tsx
// 모든 todos 관련 쿼리 무효화
queryClient.invalidateQueries({ queryKey: ['todos'] });
// → ['todos', 'list', ...], ['todos', 'detail', ...] 모두 매치된다

// list 쿼리만 무효화
queryClient.invalidateQueries({ queryKey: ['todos', 'list'] });
// → ['todos', 'list', ...]만 매치된다
```

When keys are designed as a tree, a single line can express anything from "fetch all data in this domain again" to "fetch only this exact item again." (It may not seem like much at first, but after designing a key hierarchy poorly and seeing invalidation affect an unintended scope, its value becomes painfully clear.)


## The evolution of queryKey management

So far, we have covered how queryKey works and how to use it. Now we can move on to the central question: **how has queryKey management changed over time?**

I will walk through the stages I have used in production, in chronological order.


### 1. Inline arrays

This is the simplest form: combine fixed strings with prop values inside the component.

```tsx
function UserProfile({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });
  // ...
}

function PostList({ filter }: { filter: PostFilter }) {
  const { data } = useQuery({
    queryKey: ['posts', filter],
    queryFn: () => fetchPosts(filter),
  });
  // ...
}
```

This is enough when you are just getting started.

The problems begin as the codebase grows. When a mutation that updates user information needs to invalidate a query, you have to search for the answer to "What was the query key for user data again?" every time. Some places end up using `['user', userId]`, while others use `['users', userId]` in the plural. These are entirely different cache slots, so invalidation affects only one of them.


### 2. A constant object

To prevent typos, gather query keys into constants.

```tsx
// queryKeys.ts
export const QUERY_KEYS = {
  USER: 'user',
  POSTS: 'posts',
  COMMENTS: 'comments',
} as const;

// 사용처
useQuery({
  queryKey: [QUERY_KEYS.USER, userId],
  queryFn: () => fetchUser(userId),
});
```

The typos disappear, but each call site is still responsible for assembling the key. One person may use `[QUERY_KEYS.USER, userId]`, another `[QUERY_KEYS.USER, userId, 'detail']`, and someone else `['user', 'detail', userId]`. Eventually, you need to memorize a separate convention just to know which form is correct.


### 3. Query Key Factory

This pattern was formalized in TkDodo's [Effective React Query Keys](https://tkdodo.eu/blog/effective-react-query-keys). It defines an object that creates keys for each domain and expresses the hierarchy through functions.

```tsx
// features/todos/queries.ts
const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (filters: string) => [...todoKeys.lists(), { filters }] as const,
  details: () => [...todoKeys.all, 'detail'] as const,
  detail: (id: number) => [...todoKeys.details(), id] as const,
};

// 사용
useQuery({ queryKey: todoKeys.detail(1), queryFn: ... });
useQuery({ queryKey: todoKeys.list('done'), queryFn: ... });

// 무효화
queryClient.invalidateQueries({ queryKey: todoKeys.all });        // 전체
queryClient.invalidateQueries({ queryKey: todoKeys.lists() });    // 모든 리스트
queryClient.invalidateQueries({ queryKey: todoKeys.detail(1) });  // 특정 항목
```

This pattern is powerful because **the hierarchy is made explicit in the code**. `todoKeys.all` refers to every query related to todos, `todoKeys.lists()` refers to every list query, and `todoKeys.detail(1)` refers to one specific item. The precise scope of invalidation can be expressed in a single line of code.

Another benefit is **co-location**. TkDodo does not recommend gathering keys into a global file. Instead, he recommends placing `queries.ts` inside the feature directory and keeping keys and hooks together there.

```
src/
└── features/
    └── todos/
        ├── index.tsx
        └── queries.ts   # 키와 훅을 모두 여기에
```

This creates a simple mental model: "To change something about todos, I only need to look in the todos directory." It is a faithful application of the principle of keeping things that change together close together.


### 4. @lukemorales/query-key-factory

Writing the third pattern by hand every time accumulates boilerplate. And when you want to combine keys from multiple domains, the lack of a standardized interface becomes apparent. [@lukemorales/query-key-factory](https://github.com/lukemorales/query-key-factory) is the library form of this pattern.

```tsx
import { createQueryKeys, mergeQueryKeys } from '@lukemorales/query-key-factory';

const users = createQueryKeys('users', {
  detail: (userId: string) => ({
    queryKey: [userId],
    queryFn: () => api.getUser(userId),
  }),
  list: (filters: UserFilters) => ({
    queryKey: [{ filters }],
    queryFn: () => api.getUsers(filters),
  }),
});

const todos = createQueryKeys('todos', {
  detail: (id: number) => ({
    queryKey: [id],
    queryFn: () => api.getTodo(id),
  }),
});

export const queries = mergeQueryKeys(users, todos);

// 사용
useQuery(queries.users.detail('abc'));
useQuery(queries.todos.detail(1));

// 무효화
queryClient.invalidateQueries(queries.users._def);            // 모든 user 쿼리
queryClient.invalidateQueries(queries.users.detail('abc'));   // 특정 항목
```

`createQueryKeys` automatically adds the prefix, and `mergeQueryKeys` can combine domains. The conventional `_def` property provides access to the key for an entire domain. This eliminates the manual work of repeatedly adding `as const` to narrow types in a hand-written factory.

For a while, this library was effectively the standard. (I was a happy user for quite some time.) Then queryOptions changed the landscape.


### 5. queryOptions (official in v5)

One of the most important changes in TanStack Query v5 was the introduction of the `queryOptions` API. During the transition from v4 to v5, every hook's arguments were unified into a single object. The real purpose of this change was to make it possible to extract that object into **a reusable unit**.

```tsx
import { queryOptions } from '@tanstack/react-query';

export const userDetailOptions = (userId: string) =>
  queryOptions({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    staleTime: 5 * 60 * 1000,
  });

// 어디서나 사용 가능
useQuery(userDetailOptions('abc'));
useSuspenseQuery(userDetailOptions('abc'));
queryClient.prefetchQuery(userDetailOptions('abc'));
queryClient.setQueryData(userDetailOptions('abc').queryKey, newUser);
```

At first glance, you might think, "What is different about this? It looks like an object wrapped in a function." TkDodo acknowledges this in [The Query Options API](https://tkdodo.eu/blog/the-query-options-api). At runtime, it truly does nothing more than return the object it receives.

The real work happens **inside the type system**. Let us continue.


## DataTag in queryOptions

`queryOptions` is more than a simple helper because it **embeds data type information in the returned queryKey**. TanStack Query calls this mechanism `DataTag` internally.

A simplified implementation looks like this.

```typescript
declare const dataTagSymbol: unique symbol;
declare const dataTagErrorSymbol: unique symbol;

export type DataTag<TType, TValue, TError = unknown> = TType & {
  [dataTagSymbol]: TValue;
  [dataTagErrorSymbol]: TError;
};
```

This is a **branded type** built with a `unique symbol`. It is merely a marker with no runtime effect, but to TypeScript it carries the information that "this array is not just an array; it is an array associated with data of type `TValue`."

There is a reason for using a `unique symbol` here. The Zenn article [Uncovering the unique symbol Behind DataTag](https://zenn.dev/tsuboi/articles/tanstack-query-options-unique-symbol?locale=en) compares this mechanism to "a dedicated parking space for type information." An ordinary string key could collide with a key from another library or from user code, but **each `unique symbol` declaration creates a type unique to itself**, so it cannot have the same type as any other declaration. In effect, it becomes an identifier that can never collide.

The difference this one mechanism makes is significant.

```tsx
const data = queryClient.getQueryData(['user', 'abc']); // unknown
const data = queryClient.getQueryData(userDetailOptions('abc').queryKey); // User | undefined
```

`getQueryData` and `setQueryData` receive only a queryKey. But because that queryKey already carries the data type, the return type is inferred automatically. There is no need to pass a generic explicitly, and if you try to provide `setQueryData` with a value of the wrong type, the compiler catches it immediately.

There are limitations, of course. Methods such as `getQueriesData`, which retrieve multiple queries at once, return a heterogeneous array of tuples, so this type inference does not apply. And because the implementation uses a `unique symbol`, generating `.d.ts` files in a monorepo can produce a TS4023 error; importing `dataTagSymbol` explicitly provides a workaround.

The mechanism so far makes one fact clear: **the type inference provided by queryOptions depends entirely on declaring the queryKey and queryFn together in one place.** To embed the return type of the queryFn in the queryKey, they must be declared together.

This has a major implication for the design direction of query key factories. Earlier patterns emphasized separating queryKey management into its own abstraction. The v5 recommendation takes the opposite direction: **bring the queryKey and queryFn back together as a single unit**. TkDodo goes so far as to say that separating the queryKey and queryFn was a mistake. After all, the key is a collection of the function's dependencies, and the two are inseparable.


## A practical queryOptions composition pattern

The real value of `queryOptions` emerges when it is combined with a domain-specific factory. The form recommended by the official v5 documentation looks like this.

```tsx
import { queryOptions } from '@tanstack/react-query';

export const todoQueries = {
  all: () => ['todos'] as const,
  lists: () => [...todoQueries.all(), 'list'] as const,
  list: (filters: TodoFilters) =>
    queryOptions({
      queryKey: [...todoQueries.lists(), filters],
      queryFn: () => fetchTodos(filters),
      staleTime: 30 * 1000,
    }),
  details: () => [...todoQueries.all(), 'detail'] as const,
  detail: (id: number) =>
    queryOptions({
      queryKey: [...todoQueries.details(), id],
      queryFn: () => fetchTodo(id),
      staleTime: 5 * 60 * 1000,
    }),
};
```

Let us unpack the strengths of this pattern one by one.

**1. You get hierarchy and type inference at the same time.**

`todoQueries.all()` and `todoQueries.lists()` return plain arrays, while `todoQueries.detail(1)` returns an object created through `queryOptions` with a data tag attached. Use the arrays for invalidation and the options object for query calls.

```tsx
useQuery(todoQueries.detail(1));                                // 옵션 객체
queryClient.invalidateQueries({ queryKey: todoQueries.all() }); // 배열
```

**2. Components can partially override the options.**

The result of `queryOptions` is ultimately an object, so individual options can be composed at the call site.

```tsx
const { data: title } = useQuery({
  ...todoQueries.detail(1),
  select: (todo) => todo.title,  // 컴포넌트별로 다른 select 적용
});
```

What makes this especially powerful is that the return type of `select` is inferred automatically, narrowing the type of `data` to `string`. The component can select only the piece it needs while leaving the domain definition centralized.

**3. Custom hooks wrapping `useQuery` gradually disappear.**

A common pattern in v4 was to create a custom hook for each domain.

The problem with that approach was that **the moment prefetching became necessary, you had to write the same definition again**. Because `useTodoDetail` is a hook, it cannot be called outside a component, so a router loader or event handler had to repeat `queryClient.prefetchQuery({ queryKey: [...], queryFn: ... })`.

With `queryOptions`, that duplication disappears.

The same definition works everywhere. That is why TkDodo recommends, "In v5, define queryOptions instead of creating hooks." Hooks become thin wrappers used only when needed, while the domain definition stands on its own without them.


## Mutation Invalidation

The queryKey hierarchy truly shines when invalidating queries after a mutation. According to TanStack Query's [Query Invalidation](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation) documentation, `invalidateQueries` uses **prefix matching** by default.

```tsx
// 모든 todos 관련 쿼리 (list, detail, lists 모두)
queryClient.invalidateQueries({ queryKey: todoQueries.all() });

// 모든 list만 (detail은 건드리지 않음)
queryClient.invalidateQueries({ queryKey: todoQueries.lists() });

// 정확히 이 키만 (자식 키 매치 안 함)
queryClient.invalidateQueries({
  queryKey: todoQueries.detail(1).queryKey,
  exact: true,
});

// 더 복잡한 조건은 predicate으로
queryClient.invalidateQueries({
  predicate: (query) =>
    query.queryKey[0] === 'todos' &&
    (query.queryKey[2] as any)?.version >= 10,
});
```

When keys are designed hierarchically, **the scope of invalidation matches the meaning of the code.** "Refresh all todos" is expressed with `all()`, "refresh only the lists" with `lists()`, and "refresh only this item" with `detail(id)`.

If the keys were scattered in a flat structure such as `['todoList']` and `['todoDetail', 1]`, invalidating the entire todos domain would require two separate calls or a separately managed prefix constant. (And if you forgot to update that constant whenever a new domain key was added, the new key would be omitted from invalidation, causing a bug.)


## Reading the queryKey back inside queryFn

There is one final pattern worth examining. A `queryFn` actually receives an object called `QueryFunctionContext`, which contains the queryKey used for that invocation.

```tsx
queryOptions({
  queryKey: ['user', userId, { include: 'profile' }] as const,
  queryFn: ({ queryKey }) => {
    const [, id, options] = queryKey;
    return fetchUser(id, options);
  },
});
```

Why is this pattern useful? According to TkDodo's [Leveraging the Query Function Context](https://tkdodo.eu/blog/leveraging-the-query-function-context), it can **force the dependencies of queryKey and queryFn to stay synchronized**.

```tsx
const sortBy = 'name';

queryOptions({
  queryKey: ['users'],
  queryFn: () => fetchUsers({ sortBy }),
});
```

This code is risky because the queryFn depends on an external variable. The cache will not update when `sortBy` changes because the dependency was omitted from the key. As long as the `queryFn` pulls variables from an external closure, this mistake can happen at any time.

The solution is simple: make the `queryFn` independent of external variables. **If every dependency is read from the queryKey**, a variable omitted from the queryKey cannot be used inside the function in the first place.

```tsx
queryOptions({
  queryKey: ['users', { sortBy }] as const,
  queryFn: ({ queryKey: [, { sortBy }] }) => fetchUsers({ sortBy }),
});
```

With this structure, when a new dependency is introduced, there is no way to use it inside the function without adding it to the queryKey. The compiler catches the mistake by saying, in effect, "That key does not exist." Synchronization between the key and the function is delegated to **the type system** rather than left to convention.


## How much should you extract?

After reading this far, you may be wondering, "Should every query be extracted into `queryOptions`?"

As always, my answer is **"it depends."**

The important thing to remember is that **abstraction is not always beneficial**. Extracting a query used only once into a domain factory merely forces readers to jump between two files. The evolution of queryKey management patterns does not mean "always use the most sophisticated tool." It means **"you have the option to move up one rung of the ladder when the need arises."**


## Conclusion

In summary, a queryKey is **the fundamental unit TanStack Query uses to identify and cache asynchronous data**. That small array serves as a cache-slot identifier, a dependency array, and a definition of invalidation scope. In v5, it even carries data type information. Because so many responsibilities converge in this one place, how queryKeys are written and managed directly affects the cognitive load of the entire codebase.

Each stage was an answer to a real problem someone encountered at the time. So the right approach is not simply, "This is v5, so always use `queryOptions`." Instead, first ask: **"What stage of this problem is my codebase currently facing?"** Introducing a domain factory into a project where inline arrays are sufficient can itself be overengineering.

I hope this article encourages you to examine your own project: how queryKeys are distributed throughout the codebase, how invalidation is performed, and whether that structure fits the current size of your team and the complexity of your domain.


## References

:::ref
- [docs] [TanStack Query, Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
- [docs] [TanStack Query, Query Options](https://tanstack.com/query/v5/docs/framework/react/guides/query-options)
- [docs] [TanStack Query, TypeScript](https://tanstack.com/query/v5/docs/framework/react/typescript)
- [article] [TanStack, Announcing TanStack Query v5](https://tanstack.com/blog/announcing-tanstack-query-v5)
:::
