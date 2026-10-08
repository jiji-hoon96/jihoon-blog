---
emoji: 🧮
title: "How queryKey Comparison Works"
seoTitle: "How TanStack Query Compares queryKeys: hashKey Explained"
date: "2025-12-30"
updatedAt: "2026-10-08"
categories: frontend React TanStack-Query queryKey
description: "How TanStack Query judges new queryKey arrays equal: hashKey serialization (key order, undefined, Map, cycles) and how filters compare key structure."
keywords: "queryKey comparison, hashKey, queryHash, TanStack Query cache key, React Query queryKey order, queryKeyHashFn, JSON.stringify sorted keys, QueryCache"
locale: en
translationOf: '251230'
sourceHash: ac741f2d85d62c63a48506c66ba0ada891e74b35304a1db40d0da4cb32e2578c
---

In this post, I want to talk about **how TanStack Query decides that two queryKeys are the same key**.

This is for TanStack Query users who have wondered why a queryKey, which is created as a new array on every render, does not cause a cache miss every time, and whether object key order or `undefined` values affect the cache, and by the end you will know the rule that makes two keys equal and how that rule affects the cache. To give the conclusion first, TanStack Query uses the string produced by serializing the queryKey with `hashKey` as the cache key, and in that process object key order is ignored while array element order is preserved.

A queryKey is the array TanStack Query uses as the basis for managing the query cache. The same key means the same data, and when the key `['user', userId]` changes because `userId` changed, a cache miss occurs and the data is fetched again.

This raises a question: how does TanStack Query determine whether two queryKeys are "the same key"? A simple `===` comparison would find different object references and cause a cache miss every time.


## Inside QueryCache

According to TkDodo's [Inside React Query](https://tkdodo.eu/blog/inside-react-query), `QueryCache` is ultimately just **an in-memory data structure**. More precisely, in the v5 [official implementation](https://github.com/TanStack/query/blob/%40tanstack%2Fquery-core%405.104.1/packages/query-core/src/queryCache.ts), that data structure is not a plain object but a `Map<string, Query>`. It is declared inside the class as `#queries = new Map<string, Query>()`, and every write and read goes through `#queries.set(query.queryHash, query)` and `#queries.get(queryHash)`. The key is the serialized form of the queryKey (`queryHash`), and the value is an instance of the `Query` class. The code and output in this post are based on `@tanstack/query-core` 5.104.1.

Older versions did use a plain object, but by v5 the implementation had settled on the native `Map`. `Map` never collides with keys inherited from a prototype, and it preserves insertion order. As for lookup speed, the [ECMAScript specification](https://tc39.es/ecma262/#sec-map-objects) only requires access times that are sublinear in the number of elements, and V8 [implements it as a hash table](https://v8.dev/blog/hash-code). That makes it a sensible choice for a cache data structure.

What happens each time `useQuery` is called is straightforward. **The queryKey is converted into a hash, and that hash is used to look it up in the Map.** If an entry exists, TanStack Query retrieves the cached `Query` instance. Otherwise, it creates a new one and calls `set`.

This naturally leads to another question: **why serialize the queryKey into a string at all?** Why not use the array itself as the key, as in `Map<QueryKey, Query>`?

The answer lies in JavaScript's equality model. A native `Map` compares keys using **reference equality**. Even when their contents are identical, objects at different locations in memory are treated as different keys.

```js
const m = new Map();
m.set(['user', 1], 'alice');
m.get(['user', 1]); // undefined. 새로 만든 배열은 다른 참조다
```

But in a React component, `useQuery({ queryKey: ['user', userId] })` **creates a new array instance on every render.** The queryKey arrays from the first and second renders are separate objects in memory even if their contents match. If the cache depended on reference equality, a component displaying the same data would tragically miss the cache on every render.

The solution to the problem caused by reference equality is simple: **convert reference equality into structural equality**. Create a deterministic string using only the contents of the queryKey, then use that string as the Map key. This restores the semantics we want: "equal contents mean the same key." `JSON.stringify` is simply the most straightforward tool for that conversion.

The key here is the function that produces the hash: `hashKey`. Its official implementation in [`packages/query-core/src/utils.ts`](https://github.com/TanStack/query/blob/%40tanstack%2Fquery-core%405.104.1/packages/query-core/src/utils.ts#L284-L295) looks exactly like this.

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

It uses `JSON.stringify` with a [replacer callback](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#the_replacer_parameter) that **sorts the keys of plain objects lexicographically** before serialization. Strictly speaking, this is UTF-16 code unit order, the default comparison of `sort()`, so uppercase keys come before lowercase ones.

This sorting is fundamental because string serialization carries an additional, stronger requirement: **semantically equivalent inputs must always produce the same string.** Ordinary `JSON.stringify`, however, preserves key order. `{ a: 1, b: 2 }` and `{ b: 2, a: 1 }` are semantically equivalent objects, but they serialize into different strings and therefore occupy different cache slots. That would bring back duplicate requests for the same data.

The technique that consistently prevents this is a **canonical form**. It forces semantically equivalent inputs to map to exactly one representation. This is precisely why the `hashKey` replacer sorts the keys of plain objects. By producing the same output regardless of input order, it creates a one-to-one relationship between the serialized result and the meaning of the object. In other words, it treats objects that differ only in key order as one group and picks a single form, the one with sorted keys, to represent that group.

The fact that arrays are not sorted is the other side of the same principle. An array is a data structure in which order itself carries meaning, so sorting it would destroy information. Object key order is incidental; array element order is intentional. `hashKey` treats the two accordingly. This is why maintainer TkDodo, in [Effective React Query Keys](https://tkdodo.eu/blog/effective-react-query-keys), recommends structuring a queryKey from the most generic to the most specific. As long as array order carries meaning, the author must define that meaning directly.

There is one more detail worth highlighting: key sorting applies only to **plain objects**. In the same file, `isPlainObject` checks `typeof === 'object'` and also `Object.getPrototypeOf(o) === Object.prototype` to distinguish **plain object literals** from **class instances**. As a result, a literal such as `{ foo: 1 }` is sorted, while an instance created with `class User { ... }` passes through unsorted. (This is where a subtle trap arises: if you put a class instance directly into a queryKey, its interaction with `JSON.stringify`, which outputs only enumerable properties, may produce a hash different from what you intended.)

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


## Values That Serialization Changes

It is also useful to know that `undefined` values disappear during serialization. `{ a: 1, b: undefined }` and `{ a: 1 }` produce the same hash. (I once made the mistake of thinking, "I explicitly included undefined, so this must be a different cache!")

Inside an array, it behaves differently. An `undefined` array element does not disappear; it becomes `null`. So `['user', undefined]` and `['user', null]` are the same key, and both differ from `['user']`. This is the case with `['user', userId]` when `userId` is still `undefined`. Even if you block the fetch with `enabled: false`, a `["user",null]` slot is still created in the cache. I confirmed this by creating the object that `useQuery` uses internally, a `QueryObserver`, with the same options.

`undefined` is not the only such value. Because `hashKey` is built on top of `JSON.stringify`, most values that JSON cannot represent are turned into other values without any error. I ran the code below on 2026-10-08 with `@tanstack/query-core` 5.104.1 and Node v24.16.0, and the comments are the actual output.

```js
import { hashKey, QueryClient } from '@tanstack/query-core'

console.log(hashKey(['user', undefined])) // ["user",null]
console.log(hashKey(['user', null])) // ["user",null]
console.log(hashKey(['user'])) // ["user"]
console.log(hashKey(['f', { cb: () => 1 }])) // ["f",{}]
console.log(hashKey(['m', new Map([['a', 1]])])) // ["m",{}]
console.log(hashKey(['d', new Date('2025-12-30T00:00:00Z')])) // ["d","2025-12-30T00:00:00.000Z"]

const queryClient = new QueryClient()
queryClient.setQueryData(['m', new Map([['a', 1]])], 'mapA')
console.log(queryClient.getQueryData(['m', new Map([['b', 2]])])) // mapA
```

Running other values the same way gives the following summary.

| Value in the key | Serialized result | Treated as the same key as |
|---|---|---|
| `undefined`, `NaN`, `Infinity`, or a function as an array element | `null` | a key with `null` in that position |
| `undefined` or a function as an object property | the property disappears | a key without that property |
| `Map`, `Set` | `{}` | every `Map`, `Set`, and empty object, regardless of contents |
| `Date` | an ISO string | the same ISO string |
| `BigInt` | throws `TypeError` | none |
| circular reference | throws `RangeError` for a plain object, `TypeError` for an array | none |

The most dangerous ones are `Map` and `Set`. In the code above, data stored under `new Map([['a', 1]])` came back when looked up with `new Map([['b', 2]])`. Since there is no error, there is also no clue that the screen is rendering the wrong data.

Only two cases surface as errors: `BigInt` and circular references. For circular references, the error depends on what forms the cycle. A plain object that points to itself ends in `RangeError: Maximum call stack size exceeded`, while an array that contains itself, as in `arr.push(arr)`, ends in `TypeError: Converting circular structure to JSON`. Because the replacer returns a new object for every plain object, the cycle detection in `JSON.stringify` never sees the same object twice, whereas the replacer returns an array as is, so the cycle is caught. `Date`, on the other hand, becomes an ISO string through `toJSON`, so the same instant produces the same key, which actually makes it safe.

So it is safest to put only strings, numbers, booleans, `null`, and arrays and plain objects made of them into a queryKey.


## queryKeyHashFn

There is an escape hatch from this constraint. Through the `queryKeyHashFn` option, TanStack Query lets you **replace the hash function itself**. Internally, `hashQueryKeyByOptions(queryKey, options)` branches: if `queryKeyHashFn` exists in the options, it calls that; otherwise, it calls the default `hashKey`.

Replacing it means substituting `hashKey` entirely. The key sorting described earlier goes away with it, so if you need sorting you have to implement it yourself. The case where this option is truly needed is a value that the default serialization throws on, such as `BigInt`. I ran the code below in the same environment.

```js
import { QueryClient } from '@tanstack/query-core'

const bigintSafeHash = (queryKey) =>
  JSON.stringify(queryKey, (_, v) => (typeof v === 'bigint' ? v.toString() : v))

const queryClient = new QueryClient({
  defaultOptions: { queries: { queryKeyHashFn: bigintSafeHash } },
})

queryClient.setQueryData(['order', 9007199254740993n], 'ok')
console.log(queryClient.getQueryData(['order', 9007199254740993n])) // ok
console.log(queryClient.getQueryData(['order', '9007199254740993'])) // ok

queryClient.setQueryData(['todos', { status: 'done', page: 1 }], 'A')
console.log(queryClient.getQueryData(['todos', { page: 1, status: 'done' }])) // undefined
```

The second output means that a `BigInt` and a string holding the same number become the same key. The last output is the result of losing key sorting: objects that differ only in key order are no longer treated as the same key.

Where you register it also changes the result. If you register it through the `QueryClient` `defaultOptions` or `setQueryDefaults`, as above, `setQueryData` and `getQueryData` use that function too. This is because both APIs merge the default options through `defaultQueryOptions` before hashing. If you put it only on a `useQuery` call, however, the imperative APIs use the default `hashKey`, and the same key splits into two slots in the cache. In the v3.2.0 beta period, even the global default was not applied to `setQueryData`. In [Issue #1343](https://github.com/TanStack/query/issues/1343), a maintainer replied that it should be fixed in v3.2.0-beta.30, and the reporter confirmed that it worked.

In production, it is therefore much safer to avoid the escape hatch and **convert values into a serializable form when constructing the queryKey**. Writing your own hash function means you have to take care of both key sorting and where it is registered.

I once placed a `Date` directly in a key and spent a long time wondering, "Why is the cache refreshing even though it is the same instant?" A `Date` that points to the same instant becomes the same ISO string even if it is a different instance, so it produces the same hash. If a different key came out every time, the time itself was different, even if it looked like the same instant. Creating a `new Date()` during render puts a time that differs by milliseconds into every render, and each one becomes a new key.


## How Filters Compare Keys

There is one more way two keys are judged equal. The "same key" discussed so far means the hash strings are equal, and hashes are used only for cache lookup and `exact: true` filters. Filters such as `invalidateQueries` and `findAll` decide by default with `partialMatchKey`, which recursively compares the structure of the original queryKey rather than the hash string. Arrays are matched from the front, and objects are checked only for the keys written in the filter. I ran the code below in the same environment as well.

```js
import { partialMatchKey } from '@tanstack/query-core'

const queryKey = ['todos', { status: 'done', page: 1 }]
console.log(partialMatchKey(queryKey, ['todos'])) // true
console.log(partialMatchKey(queryKey, ['todos', { status: 'done' }])) // true
console.log(partialMatchKey(queryKey, [{ status: 'done' }])) // false
console.log(partialMatchKey(queryKey, ['todos', { status: 'todo' }])) // false
```

Since this matching does not go through the hash, replacing `queryKeyHashFn` does not change it. In a `QueryClient` registered with an unsorted hash function like the earlier example, an object that differs only in key order cannot be found with `exact: true`, but prefix matching still finds it.


## Conclusion

In short, TanStack Query does not compare queryKey array references. Instead, `hashKey` sorts plain object keys while serializing with `JSON.stringify`, and the resulting string (`queryHash`) becomes the key of a `Map`. As a result, object key order does not affect the cache, array element order does, and a property whose value is `undefined` is the same as an absent one. Most values that JSON cannot represent turn into other values without any error, so different keys silently become the same key. You can swap the hash function with `queryKeyHashFn`, but that also throws away key sorting, so it is safer to convert values into serializable ones when building the key. It is also worth remembering that filters such as invalidation, by default, skip the hash and match the structure of the queryKey from the front.

How this rule carries over to writing and managing queryKeys, that is, the path from inline arrays through query key factories to `queryOptions`, is covered in [queryKey](/260104).

Next time you put an object or a `Map` into a queryKey, I hope you will stop for a moment and think about what string it will be serialized into.


## References

:::ref
- [docs] [TanStack Query, Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
- [docs] [TanStack Query, QueryClient](https://tanstack.com/query/latest/docs/framework/react/reference/classes/QueryClient)
:::
