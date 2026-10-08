---
emoji: 🧮
title: "queryKey 比较原理"
seoTitle: "TanStack Query 如何比较 queryKey：hashKey 与序列化"
date: "2025-12-30"
categories: 前端 React TanStack-Query queryKey
description: "通过 hashKey 的实现，梳理 TanStack Query 如何把每次渲染新建的 queryKey 数组判定为同一个键：为什么对象键顺序无关、数组顺序重要、undefined 会消失，以及 queryKeyHashFn 的局限。"
keywords: "queryKey 比较, hashKey, queryHash, TanStack Query 缓存键, React Query queryKey 顺序, queryKeyHashFn, JSON.stringify 键排序, QueryCache"
locale: zh-CN
translationOf: '251230'
sourceHash: 7e26877fcdd3f1c85b67751a911900b36ff424cb43b408fb640fb8aa3075e22a
---

这篇文章想聊一聊 **TanStack Query 如何判断两个 queryKey 是同一个键**。

本文写给曾经好奇这些问题的 TanStack Query 用户：每次渲染都会新建为数组的 queryKey，为什么不会每次都缓存未命中；对象的键顺序或 `undefined` 值会不会影响缓存。读完后，你会知道把两个键视为相同的规则，以及这条规则对缓存的影响。先说结论：TanStack Query 把用 `hashKey` 序列化 queryKey 得到的字符串作为缓存的键，在这个过程中对象的键顺序会被忽略，而数组元素的顺序会原样保留。

queryKey 是 TanStack Query 管理查询缓存时所依据的数组。相同的键意味着相同的数据；当 `['user', userId]` 因为其中的 `userId` 变化而改变时，就会缓存未命中并重新 fetch。

这里自然会产生一个疑问：TanStack Query 如何判断 queryKey 是“同一个键”？如果只是用 `===` 比较，对象引用会不同，那岂不是每次都会缓存未命中？


## QueryCache 内部

根据 TkDodo 的 [Inside React Query](https://tkdodo.eu/blog/inside-react-query)，`QueryCache` 归根结底只是**保存在内存中的一个数据结构**。更准确地说，在 v5 的[官方实现](https://github.com/TanStack/query/blob/main/packages/query-core/src/queryCache.ts)中，这个数据结构不是普通对象，而是 `Map<string, Query>`。它在类内部声明为 `#queries = new Map<string, Query>()`，所有读写都通过 `#queries.set(query.queryHash, query)` 和 `#queries.get(queryHash)` 完成。键是 queryKey 的序列化形式（`queryHash`），值是 `Query` 类的实例。

旧版本也曾使用普通对象，但到 v5 已统一为原生 `Map`。（`Map` 不存在键冲突或原型污染风险，能保留插入顺序，而且字符串键的查找平均为 O(1)，作为缓存数据结构几乎是标准答案。）

每次调用 `useQuery` 时发生的事情很简单：**把 queryKey 转换成哈希值，再用这个哈希值在 Map 中查找。** 如果存在，就取出缓存的 `Query` 实例；如果不存在，就创建新的实例并 `set` 进去。

这里又自然会产生一个疑问：**为什么一定要把 queryKey 序列化成字符串？** 直接像 `Map<QueryKey, Query>` 那样把数组本身当作键不行吗？

答案藏在 JavaScript 的相等性模型里。原生 `Map` 使用**引用相等（reference equality）**比较键。即便内容相同，只要是内存中不同的对象，就会被视为不同的键。

```js
const m = new Map();
m.set(['user', 1], 'alice');
m.get(['user', 1]); // undefined — 새로 만든 배열은 다른 참조다
```

而在 React 组件中，`useQuery({ queryKey: ['user', userId] })` 会在**每次渲染时创建新的数组实例。** 第一次和第二次渲染得到的 queryKey 数组，即使内容相同，也是内存中彼此独立的对象。如果缓存依赖引用相等，那么查看同一数据的组件每次渲染都会缓存未命中，后果将不堪设想。

解决引用相等问题的方法很简单：**把引用相等转换为结构相等（structural equality）**。只根据 queryKey 的内容生成确定性的字符串，再用这个字符串作为 Map 的键。这样就恢复了我们想要的“内容相同即键相同”的语义。`JSON.stringify` 只是完成这种转换最简单的工具。（这也是 TanStack Query 在 v3 时期尝试多种序列化策略后，最终采用稳定版 `JSON.stringify` 的原因。）

这里的关键是生成哈希值的函数 `hashKey`。[`packages/query-core/src/utils.ts`](https://github.com/TanStack/query/blob/main/packages/query-core/src/utils.ts) 中的官方实现正是如此。

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

虽然用的是 `JSON.stringify`，但不是直接序列化，而是通过 [replacer callback](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#the_replacer_parameter)，先将**普通对象的键按字母顺序排序**后再序列化。

这种排序之所以至关重要，是因为字符串序列化还必须满足一个更强的条件：**语义相同的输入，必须始终转换为相同的字符串。** 但普通的 `JSON.stringify` 会保留键的原始顺序。`{ a: 1, b: 2 }` 和 `{ b: 2, a: 1 }` 在语义上是同一个对象，却会序列化为不同的字符串，最终落入两个不同的缓存槽。这样一来，相同的数据又会被请求两次。

稳定避免这一问题的技术叫作 **canonical form（规范形式）**：强制语义相同的输入始终对应唯一的一种表示。`hashKey` 的 replacer 对普通对象的键进行排序，正是出于这个原因。无论输入顺序如何，都让输出保持一致，使序列化结果与对象语义形成一一对应。换句话说，就是把只有键顺序不同、内容相同的对象看作一组，并选出键排序后的那一种形式来代表这一组。

不对数组排序，也是同一原则的另一面。数组是一种顺序本身承载语义的数据结构，一旦排序就会丢失信息。对象的键顺序是偶然的，数组的元素顺序则是有意的。`hashKey` 对二者作了准确区分。正因如此，官方指南才建议按“通用 → 具体”的顺序组织 queryKey。只要数组顺序承载语义，这层语义就必须由开发者亲自定义。

还有一个细节值得说明：键排序只作用于**普通对象**。同一文件中的 `isPlainObject` 并不只是检查 `typeof === 'object'`，还会检查 `Object.getPrototypeOf(o) === Object.prototype`，以区分**纯对象字面量**和**类实例**。因此，`{ foo: 1 }` 这样的字面量会被排序，而通过 `class User { ... }` 创建的实例不会排序，直接进入下一步。（如果把类实例直接放进 queryKey，`JSON.stringify` 又只会输出可枚举属性，两者结合后可能得到违背预期的哈希值，这正是一个容易踩坑的地方。）

这种工作方式会带来两个重要结果。

**1. 对象的键顺序无关紧要。**

```tsx
useQuery({ queryKey: ['todos', { status: 'done', page: 1 }], queryFn });
useQuery({ queryKey: ['todos', { page: 1, status: 'done' }], queryFn });
// 두 쿼리는 같은 캐시 슬롯을 공유한다
```

因为键会先排序再序列化。否则，每次使用对象字面量时都得记住键的顺序。

**2. 数组的元素顺序很重要。**

```tsx
useQuery({ queryKey: ['todos', status, page], queryFn });
useQuery({ queryKey: ['todos', page, status], queryFn });
// 두 쿼리는 다른 캐시이다
```

因为数组是一种顺序本身就有意义的数据结构。`JSON.stringify` 也会保留数组顺序。

另外还应知道，`undefined` 值会在序列化过程中消失。`{ a: 1, b: undefined }` 和 `{ a: 1 }` 会生成相同的 hash。（我以前不知道这一点，还犯过“既然显式写了 undefined，那肯定是不同的 cache！”这样的错误。）

此外，queryKey 不能包含**循环引用或函数**，因为 `JSON.stringify` 无法处理它们。`Date` 对象、`Map/Set`、`BigInt` 等，在默认行为下同样不建议使用。queryKey 应当是可序列化的纯数据结构。

有趣的是，这项约束并非完全不可绕过。TanStack Query 提供了 `queryKeyHashFn` 选项，留出了一个**替换 hash 函数本身的逃生口**。内部的 `hashQueryKeyByOptions(queryKey, options)` 会判断 options 中是否有 `queryKeyHashFn`：有则调用它，没有则调用默认的 `hashKey`。

```tsx
useQuery({
  queryKey: [{ id: userId, fetchedAt: new Date() }],
  queryFn,
  // Date를 ISO 문자열로 바꿔서 해싱
  queryKeyHashFn: (key) =>
    JSON.stringify(key, (_, v) => (v instanceof Date ? v.toISOString() : v)),
});
```

但这个选项必须为每个查询单独指定，而且通过 `queryClient.setQueryData` 之类不掌握选项信息的命令式 API 调用时不会生效，这是它的局限（[Issue #1343](https://github.com/TanStack/query/issues/1343)）。因此在实践中，与其使用这个逃生口，**更安全的做法是在创建 queryKey 时就将值转换为可序列化的形式。**（我也曾直接放入 `Date`，然后困惑了很久：“明明是同一个时间点，为什么缓存没有更新？”最终答案是：“虽然那个 `Date` 表示同一时间点，但它是不同的对象实例，所以每次哈希值都不同。”）


## 总结

总而言之，TanStack Query 并不比较 queryKey 数组的引用。`hashKey` 在用 `JSON.stringify` 序列化的同时对普通对象的键进行排序，得到的字符串（`queryHash`）被用作 `Map` 的键。因此，对象的键顺序不会影响缓存，数组元素的顺序会影响，值为 `undefined` 的属性等同于不存在。无法序列化的值可以用 `queryKeyHashFn` 绕过，但在创建键的时候就把它转换成可序列化的值会更安全。

这个判断标准如何延伸到 queryKey 的编写与管理，也就是从内联数组经过 query key factory 走到 `queryOptions` 的过程，会在 [queryKey](/260104) 中讨论。

希望各位读者下次往 queryKey 里放对象或 `Date` 时，也能想一想这个值会被序列化成什么样的字符串。


## 参考资料

:::ref
- [docs] [TanStack Query, Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
:::
