---
emoji: 🧮
title: "queryKey 比较原理"
seoTitle: "TanStack Query 如何比较 queryKey：hashKey 序列化与键顺序"
date: "2025-12-30"
updatedAt: "2026-10-08"
categories: 前端 React TanStack-Query queryKey
description: "梳理 TanStack Query 如何把每次渲染新建的 queryKey 数组判定为同一个键：hashKey 序列化如何改变键顺序、undefined、Map 等值，以及过滤器如何比较键的结构。"
keywords: "queryKey 比较, hashKey, queryHash, TanStack Query 缓存键, React Query queryKey 顺序, queryKeyHashFn, JSON.stringify 键排序, QueryCache"
locale: zh-CN
translationOf: '251230'
sourceHash: 24fc2216b382a69ba99c1d4ca8676c6ef3f58966b132171d60acb75e1be1f38c
---

这篇文章想聊一聊 **TanStack Query 如何判断两个 queryKey 是同一个键**。

本文写给曾经好奇这些问题的 TanStack Query 用户：每次渲染都会新建为数组的 queryKey，为什么不会每次都缓存未命中；对象的键顺序或 `undefined` 值会不会影响缓存。读完后，你会知道把两个键视为相同的规则，以及这条规则对缓存的影响。先说结论：TanStack Query 把用 `hashKey` 序列化 queryKey 得到的字符串作为缓存的键，在这个过程中对象的键顺序会被忽略，而数组元素的顺序会原样保留。

queryKey 是 TanStack Query 管理查询缓存时所依据的数组。相同的键意味着相同的数据；当 `['user', userId]` 因为其中的 `userId` 变化而改变时，就会缓存未命中并重新 fetch。


## QueryCache 内部

根据 TkDodo 的 [Inside React Query](https://tkdodo.eu/blog/inside-react-query)，`QueryCache` 归根结底只是**保存在内存中的一个数据结构**。在 v5 的[官方实现](https://github.com/TanStack/query/blob/%40tanstack%2Fquery-core%405.104.1/packages/query-core/src/queryCache.ts)中，这个数据结构不是普通对象，而是 `Map<string, Query>`。字段类型是 `QueryStore`，构造函数中赋值为 `new Map<string, Query>()`。存储和查询都以 `queryHash` 为键。键是 queryKey 的序列化形式（`queryHash`），值是 `Query` 类的实例。本文的代码和运行结果以 `@tanstack/query-core` 5.104.1 为准。

与旧版本使用的普通对象不同，`Map` 不会与从原型继承的键冲突。

每次调用 `useQuery` 时发生的事情很简单：**把 queryKey 转换成哈希值，再用这个哈希值在 Map 中查找。** 如果存在，就取出缓存的 `Query` 实例；如果不存在，就创建新的实例并 `set` 进去。

这里又自然会产生一个疑问：**为什么一定要把 queryKey 序列化成字符串？** 直接像 `Map<QueryKey, Query>` 那样把数组本身当作键不行吗？

答案藏在 JavaScript 的相等性模型里。原生 `Map` 使用**引用相等**（reference equality）比较键。即便内容相同，只要是内存中不同的对象，就会被视为不同的键。

```js
const m = new Map();
m.set(['user', 1], 'alice');
m.get(['user', 1]); // undefined. 새로 만든 배열은 다른 참조다
```

而在 React 组件中，`useQuery({ queryKey: ['user', userId] })` 会在**每次渲染时创建新的数组实例。** 第一次和第二次渲染得到的 queryKey 数组，即使内容相同，也是内存中彼此独立的对象。如果缓存依赖引用相等，那么查看同一数据的组件每次渲染都会缓存未命中。

解决引用相等问题的方法很简单：**把引用相等转换为结构相等（structural equality）**。只根据 queryKey 的内容生成确定性的字符串，再用这个字符串作为 Map 的键。这样就恢复了我们想要的“内容相同即键相同”的语义。`JSON.stringify` 只是完成这种转换最简单的工具。

## hashKey 的键排序

生成哈希值的函数是 `hashKey`。[`packages/query-core/src/utils.ts`](https://github.com/TanStack/query/blob/%40tanstack%2Fquery-core%405.104.1/packages/query-core/src/utils.ts#L284-L295) 中的官方实现如下。

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

它在 `JSON.stringify` 中加入 [replacer callback](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#the_replacer_parameter)，先将**普通对象的键按字典序排序**后再序列化。严格来说，这是 `sort()` 默认比较所用的 UTF-16 码元顺序，所以大写键会排在小写键前面。

这种排序之所以至关重要，是因为字符串序列化还必须满足一个更强的条件：**语义相同的输入，必须始终转换为相同的字符串。** 但普通的 `JSON.stringify` 会保留键的原始顺序。`{ a: 1, b: 2 }` 和 `{ b: 2, a: 1 }` 在语义上是同一个对象，却会序列化为不同的字符串，最终落入两个不同的缓存槽。这样一来，相同的数据又会被请求两次。

稳定避免这一问题的技术叫作 **canonical form（规范形式）**：强制语义相同的输入始终对应唯一的一种表示。`hashKey` 的 replacer 对普通对象的键进行排序，就是出于这个原因。无论输入顺序如何，都让输出保持一致，使语义相同的对象总是变成同一个字符串。反方向并不保证，这一点后面会讲到。

不对数组排序，也是同一原则的另一面。数组是一种顺序本身承载语义的数据结构，一旦排序就会丢失信息。对象的键顺序是偶然的，数组的元素顺序则是有意的。`hashKey` 对二者作了区分。维护者 TkDodo 在 [Effective React Query Keys](https://tkdodo.eu/blog/effective-react-query-keys) 中建议按从最通用到最具体的顺序组织 queryKey，也是因为数组顺序承载语义。他给出的理由是失效：前半部分相同的键可以用一个 `['todos']` 一次性失效。这种比较不是由哈希完成的，而是由后面会看到的 prefix 匹配负责。

键排序只作用于**普通对象**。同一文件中的 `isPlainObject` 会检查 `Object.prototype.toString` 的结果是否为 `[object Object]`，以及原型是否为 `Object.prototype`（或 `null`），以区分**纯对象字面量**和**类实例**。因此，`{ foo: 1 }` 这样的字面量会被排序，而通过 `class User { ... }` 创建的实例不会排序，直接进入下一步。如果把类实例直接放进 queryKey，由于键不会排序，它会按字段赋值的顺序序列化，即使值相同也可能得到不同的哈希值。

从使用者的角度看，结果有两个。

**1. 对象的键顺序无关紧要。**

```tsx
useQuery({ queryKey: ['todos', { status: 'done', page: 1 }], queryFn });
useQuery({ queryKey: ['todos', { page: 1, status: 'done' }], queryFn });
// 두 쿼리는 같은 캐시 슬롯을 공유한다
```

如果没有键排序，每次使用对象字面量时都得记住键的顺序。

**2. 数组的元素顺序很重要。**

```tsx
useQuery({ queryKey: ['todos', status, page], queryFn });
useQuery({ queryKey: ['todos', page, status], queryFn });
// 두 쿼리는 다른 캐시이다
```


## 序列化会改变的值

另外还应知道，`undefined` 值会在序列化过程中消失。`{ a: 1, b: undefined }` 和 `{ a: 1 }` 会生成相同的 hash。（我以前不知道这一点，还犯过“既然显式写了 undefined，那肯定是不同的 cache！”这样的错误。）

在数组中则不同。数组元素中的 `undefined` 不会消失，而是变成 `null`。所以 `['user', undefined]` 和 `['user', null]` 是同一个键，而与 `['user']` 是不同的键。`['user', userId]` 中 `userId` 仍是 `undefined` 的情况就属于这一种。即使用 `enabled: false` 阻止了 fetch，缓存中依然会创建 `["user",null]` 这个槽位。我用相同的选项创建了 `useQuery` 内部使用的 `QueryObserver` 来确认这一点。

不只是 `undefined`。`hashKey` 建立在 `JSON.stringify` 之上，所以 JSON 无法表示的值大多会在没有任何错误的情况下变成别的值。下面的代码于 2026-10-08 在 `@tanstack/query-core` 5.104.1、Node v24.16.0 上运行，注释就是实际输出。

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

用同样的方式测试其他值，结果整理如下。

| 放进键里的值 | 序列化结果 | 被视为同一个键的对象 |
|---|---|---|
| 作为数组元素的 `undefined`、`NaN`、`Infinity`、函数 | `null` | 在该位置放入 `null` 的键 |
| 作为对象属性的 `undefined`、函数 | 属性消失 | 没有该属性的键 |
| `Map`、`Set` | `{}` | 不论内容如何，所有 `Map`、`Set` 和空对象 |
| `Date` | ISO 字符串 | 相同的 ISO 字符串 |
| `BigInt` | 抛出 `TypeError` | 无 |
| 循环引用 | 循环只经过普通对象时抛出 `RangeError`，经过数组或类实例时抛出 `TypeError` | 无 |

最危险的是 `Map` 和 `Set`。在上面的代码中，以 `new Map([['a', 1]])` 为键存入的数据，用 `new Map([['b', 2]])` 查出来了。因为没有错误，也就没有任何线索提示页面上画的是别的数据。

会以错误形式暴露的只有 `BigInt` 和循环引用两种。循环引用的错误取决于形成循环的是什么。循环只经过普通对象时以 `RangeError: Maximum call stack size exceeded` 结束，而像 `arr.push(arr)` 这样只要经过一个数组或类实例，就以 `TypeError: Converting circular structure to JSON` 结束。由于 replacer 对每个普通对象都返回一个新对象，`JSON.stringify` 的循环检测始终遇不到同一个对象；而数组和类实例会被 replacer 原样返回，因此会被循环检测捕获。相反，`Date` 会通过 `toJSON` 变成 ISO 字符串，所以在缓存查询中同一时刻就得到同一个键，相对安全。

我曾把 `Date` 直接放进键里，然后困惑了很久：“明明是同一时刻，为什么缓存会刷新？”指向同一时刻的 `Date` 即使是不同实例，也会变成相同的 ISO 字符串，因此生成相同的 hash。如果每次都得到不同的键，那么即使看起来是同一时刻，时间本身其实也不同。在渲染过程中创建 `new Date()`，每次渲染都会放入精确到毫秒的不同时间，每次都会成为新的键。

因此，queryKey 中最好只放字符串、数字、布尔值、`null`，以及由它们组成的数组和普通对象。


## queryKeyHashFn

这项约束有一个逃生口。TanStack Query 通过 `queryKeyHashFn` 选项，允许**替换 hash 函数本身**。内部的 `hashQueryKeyByOptions(queryKey, options)` 会判断：选项中有 `queryKeyHashFn` 就调用它，没有就调用默认的 `hashKey`。

替换意味着整体取代 `hashKey`。前面看到的键排序也会一起消失，所以如果需要排序，就得自己实现。这个选项有用的场景，是像 `BigInt` 这样默认序列化会抛错的值。下面的代码同样在相同环境中运行。

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

第二个输出表示，`BigInt` 和装着同一个数字的字符串会变成同一个键。最后一个输出是失去键排序的结果：只有键顺序不同的对象不再被视为同一个键。

注册的位置也会改变结果。像上面那样通过 `QueryClient` 的 `defaultOptions` 或 `setQueryDefaults` 注册时，`setQueryData` 和 `getQueryData` 也会使用这个函数。这是因为这两个 API 在计算 hash 之前会通过 `defaultQueryOptions` 合并默认选项。反之，如果只写在 `useQuery` 调用上，命令式 API 会使用默认的 `hashKey`，同一个键会在缓存中分成两个槽位。在 v3.2.0 的 beta 阶段，连全局默认值都不会应用到 `setQueryData`，[Issue #1343](https://github.com/TanStack/query/issues/1343) 的报告者确认了这一问题已在 v3.2.0-beta.30 修复。

因此在实践中，与其使用逃生口，不如**在创建 queryKey 时就把值转换成可序列化的形式**，这样要安全得多。自己写 hash 函数，就得同时照顾键排序和注册位置。


## 过滤器的键比较

判断两个键相同的方式还有一种。到目前为止所说的“同一个键”指的是 hash 字符串相同，而 hash 只用于缓存查找和 `exact: true` 过滤器。`invalidateQueries`、`findAll` 这类过滤器默认用 `partialMatchKey` 判断，它递归比较的是原始 queryKey 的结构，而不是 hash 字符串。数组从头开始比对，对象只看过滤器一侧写出的键。下面的代码同样在相同环境中运行。

```js
import { partialMatchKey } from '@tanstack/query-core'

const queryKey = ['todos', { status: 'done', page: 1 }]
console.log(partialMatchKey(queryKey, ['todos'])) // true
console.log(partialMatchKey(queryKey, ['todos', { status: 'done' }])) // true
console.log(partialMatchKey(queryKey, [{ status: 'done' }])) // false
console.log(partialMatchKey(queryKey, ['todos', { status: 'todo' }])) // false
```

由于这种匹配不经过 hash，替换 `queryKeyHashFn` 也不会改变它。在像前面的例子那样注册了不排序 hash 函数的 `QueryClient` 中，只有键顺序不同的对象用 `exact: true` 找不到，但用 prefix 匹配仍能找到。

因此，哈希相同的键在过滤器中并不保证也相同。用 `['user', undefined]` 创建的查询不会被 `['user', null]` 过滤器的 prefix 匹配命中，包含 `NaN` 的键连自身都匹配不上。反过来，如果把 `Date` 或 `Map` 放进过滤器，由于它们没有可枚举的属性可供比较，会与同一位置上的任何 `Date` 或对象匹配。


## 总结

总而言之，TanStack Query 并不比较 queryKey 数组的引用。`hashKey` 在用 `JSON.stringify` 序列化的同时对普通对象的键进行排序，得到的字符串（`queryHash`）被用作 `Map` 的键。因此，对象的键顺序不会影响缓存，数组元素的顺序会影响，值为 `undefined` 的属性在哈希中等同于不存在。JSON 无法表示的值大多会在没有错误的情况下变成别的值，使不同的键悄无声息地变成同一个键。可以用 `queryKeyHashFn` 替换 hash 函数，但这样也会一并丢掉键排序，所以在创建键的时候就把值转换成可序列化的值会更安全。失效这类过滤器默认不经过 hash，而是从头比对 queryKey 的结构，所以不要指望哈希相同的键在过滤器中也相同。归根结底，缓存查找通过 `hashKey` 比较键的内容，过滤器比较键的前半部分，所以只要 queryKey 里只放序列化后含义不变的简单值，两种比较就都会按预期工作。

这个判断标准如何延伸到 queryKey 的编写与管理，也就是从内联数组经过 query key factory 走到 `queryOptions` 的过程，会在 [queryKey](/260104) 中讨论。

希望各位读者下次往 queryKey 里放对象或 `Map` 时，也能想一想这个值会被序列化成什么样的字符串。


## 参考资料

:::ref
- [docs] [TanStack Query, Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
- [docs] [TanStack Query, QueryClient](https://tanstack.com/query/latest/docs/framework/react/reference/classes/QueryClient)
:::
