---
emoji: 🧮
title: "hashKey"
seoTitle: "How TanStack Query Compares queryKeys: hashKey Explained"
date: "2025-12-30"
categories: frontend React TanStack-Query queryKey
description: "How TanStack Query treats new queryKey arrays as the same key via hashKey: object key order is ignored, array order matters, and undefined vanishes."
keywords: "queryKey comparison, hashKey, queryHash, TanStack Query cache key, React Query queryKey order, queryKeyHashFn, JSON.stringify sorted keys, QueryCache"
locale: en
translationOf: '251230'
sourceHash: 7560f02e4d0eed43c223d135356ae58f4451e1b7b0805a2b6baf0caa0f67573d
---

In this post, I want to talk about **how TanStack Query decides that two queryKeys are the same key**.

This is for TanStack Query users who have wondered why a queryKey, which is created as a new array on every render, does not cause a cache miss every time, and whether object key order or `undefined` values affect the cache. To give the conclusion first, TanStack Query uses the string produced by serializing the queryKey with `hashKey` as the cache key, and in that process object key order is ignored while array element order is preserved.

A queryKey is the array TanStack Query uses as the basis for managing the query cache. The same key means the same data, and when the key `['user', userId]` changes because `userId` changed, a cache miss occurs and the data is fetched again.

This raises a question: how does TanStack Query determine whether two queryKeys are "the same key"? A simple `===` comparison would find different object references and cause a cache miss every time.


## Inside QueryCache

According to TkDodo's [Inside React Query](https://tkdodo.eu/blog/inside-react-query), `QueryCache` is ultimately just **an in-memory data structure**. More precisely, in the v5 [official implementation](https://github.com/TanStack/query/blob/main/packages/query-core/src/queryCache.ts), that data structure is not a plain object but a `Map<string, Query>`. It is declared inside the class as `#queries = new Map<string, Query>()`, and every write and read goes through `#queries.set(query.queryHash, query)` and `#queries.get(queryHash)`. The key is the serialized form of the queryKey (`queryHash`), and the value is an instance of the `Query` class.

Older versions did use a plain object, but by v5 the implementation had settled on the native `Map`. (`Map` has no risk of key collisions or prototype pollution, preserves insertion order, and offers average O(1) string-key lookup, making it an almost textbook choice for a cache data structure.)

What happens each time `useQuery` is called is straightforward. **The queryKey is converted into a hash, and that hash is used to look it up in the Map.** If an entry exists, TanStack Query retrieves the cached `Query` instance. Otherwise, it creates a new one and calls `set`.

This naturally leads to another question: **why serialize the queryKey into a string at all?** Why not use the array itself as the key, as in `Map<QueryKey, Query>`?

The answer lies in JavaScript's equality model. A native `Map` compares keys using **reference equality**. Even when their contents are identical, objects at different locations in memory are treated as different keys.

```js
const m = new Map();
m.set(['user', 1], 'alice');
m.get(['user', 1]); // undefined — 새로 만든 배열은 다른 참조다
```

But in a React component, `useQuery({ queryKey: ['user', userId] })` **creates a new array instance on every render.** The queryKey arrays from the first and second renders are separate objects in memory even if their contents match. If the cache depended on reference equality, a component displaying the same data would tragically miss the cache on every render.

The solution to the problem caused by reference equality is simple: **convert reference equality into structural equality**. Create a deterministic string using only the contents of the queryKey, then use that string as the Map key. This restores the semantics we want: "equal contents mean the same key." `JSON.stringify` is simply the most straightforward tool for that conversion. (It is also why TanStack Query, after experimenting with several serialization strategies during the v3 era, ultimately settled on a stable variation of `JSON.stringify`.)

The key here is the function that produces the hash: `hashKey`. Its official implementation in [`packages/query-core/src/utils.ts`](https://github.com/TanStack/query/blob/main/packages/query-core/src/utils.ts) looks exactly like this.

```typescript
export function hashKey(queryKey: QueryKey | MutationKey): string {
  return JSON.stringify(queryKey, (_, val) =>
    isPlainObject(val)
      ? Object.keys(val)
          .sort()
          .reduce((result, key) => {
            result[key] = val[key]
            return result
          }, {} as any)
      : val,
  )
}
```

It does use `JSON.stringify`, but instead of stringifying directly, it supplies a [replacer callback](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#the_replacer_parameter) that **sorts the keys of plain objects alphabetically** before serialization.

This sorting is fundamental because string serialization carries an additional, stronger requirement: **semantically equivalent inputs must always produce the same string.** Ordinary `JSON.stringify`, however, preserves key order. `{ a: 1, b: 2 }` and `{ b: 2, a: 1 }` are semantically equivalent objects, but they serialize into different strings and therefore occupy different cache slots. That would bring back duplicate requests for the same data.

The technique that consistently prevents this is a **canonical form**. It forces semantically equivalent inputs to map to exactly one representation. This is precisely why the `hashKey` replacer sorts the keys of plain objects. By producing the same output regardless of input order, it creates a one-to-one relationship between the serialized result and the meaning of the object. In other words, it treats objects that differ only in key order as one group and picks a single form, the one with sorted keys, to represent that group.

The fact that arrays are not sorted is the other side of the same principle. An array is a data structure in which order itself carries meaning, so sorting it would destroy information. Object key order is incidental; array element order is intentional. `hashKey` treats the two accordingly. This is why the official guide recommends arranging a queryKey from "generic → specific." As long as array order carries meaning, the author must define that meaning directly.

There is one more detail worth highlighting: key sorting applies only to **plain objects**. In the same file, `isPlainObject` does not merely check `typeof === 'object'`; it goes as far as checking `Object.getPrototypeOf(o) === Object.prototype` to distinguish **plain object literals** from **class instances**. As a result, a literal such as `{ foo: 1 }` is sorted, while an instance created with `class User { ... }` passes through unsorted. (This is where a subtle trap arises: if you put a class instance directly into a queryKey, its interaction with `JSON.stringify`, which outputs only enumerable properties, may produce a hash different from what you intended.)

This behavior has two important consequences.

**1. Object key order does not matter.**

```tsx
useQuery({ queryKey: ['todos', { status: 'done', page: 1 }], queryFn });
useQuery({ queryKey: ['todos', { page: 1, status: 'done' }], queryFn });
// 두 쿼리는 같은 캐시 슬롯을 공유한다
```

That is because the keys are sorted before serialization. Without this behavior, you would have to remember the key order every time you used an object literal.

**2. Array element order matters.**

```tsx
useQuery({ queryKey: ['todos', status, page], queryFn });
useQuery({ queryKey: ['todos', page, status], queryFn });
// 두 쿼리는 다른 캐시이다
```

That is because an array is a data structure where order itself carries meaning. `JSON.stringify` also preserves array order.

It is also useful to know that `undefined` values disappear during serialization. `{ a: 1, b: undefined }` and `{ a: 1 }` produce the same hash. (I once made the mistake of thinking, "I explicitly included undefined, so this must be a different cache!")

Another constraint is that a queryKey cannot contain **circular references or functions**, because `JSON.stringify` cannot handle them. Objects such as `Date`, `Map/Set`, and `BigInt` are likewise not recommended under the default behavior. A queryKey should be a serializable, plain data structure.

Interestingly, this constraint is not absolute. TanStack Query provides an escape hatch through the `queryKeyHashFn` option, allowing you to **replace the hash function itself**. Internally, `hashQueryKeyByOptions(queryKey, options)` branches: if `queryKeyHashFn` exists in the options, it calls that; otherwise, it calls the default `hashKey`.

```tsx
useQuery({
  queryKey: [{ id: userId, fetchedAt: new Date() }],
  queryFn,
  // Date를 ISO 문자열로 바꿔서 해싱
  queryKeyHashFn: (key) =>
    JSON.stringify(key, (_, v) => (v instanceof Date ? v.toISOString() : v)),
});
```

However, this option must be specified separately for each query, and it does not apply to imperative APIs invoked without knowledge of those options, such as `queryClient.setQueryData` ([Issue #1343](https://github.com/TanStack/query/issues/1343)). In production, it is therefore much safer to avoid the escape hatch and **convert values into a serializable form when constructing the queryKey**. (I once placed a `Date` directly in a key and spent a long time wondering, "Why isn't the cache updating even though it represents the same instant?" The answer turned out to be, "That `Date` represents the same instant, but it is a different object instance, so it produces a different hash every time.")


## Conclusion

In short, TanStack Query does not compare queryKey array references. Instead, `hashKey` sorts plain object keys while serializing with `JSON.stringify`, and the resulting string (`queryHash`) becomes the key of a `Map`. As a result, object key order does not affect the cache, array element order does, and a property whose value is `undefined` is the same as an absent one. Values that cannot be serialized can be worked around with `queryKeyHashFn`, but it is safer to convert them into serializable values when building the key.

How this rule carries over to writing and managing queryKeys, that is, the path from inline arrays through query key factories to `queryOptions`, is covered in [queryKey](/260104).

Next time you put an object or a `Date` into a queryKey, I hope you will stop for a moment and think about what string it will be serialized into.


## References

:::ref
- [docs] [TanStack Query, Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
:::
