---
emoji: 🔑
title: "queryKey"
seoTitle: "彻底掌握 TanStack Query queryKey——从 query key factory 到 queryOptions"
date: "2026-01-04"
categories: 前端 React TanStack-Query queryKey
description: "梳理 TanStack Query 的 queryKey 如何工作，以及它为何从内联数组演进到 query key factory 和 queryOptions；并从实践角度讨论 TkDodo 模式、v5 queryOptions，以及 setQueryData 和缓存失效。"
keywords: "queryKey, query key factory, TanStack Query queryKey, React Query 缓存键, queryOptions, setQueryData, TkDodo query keys, query-key-factory, React Query v5, 查询失效"
locale: zh-CN
translationOf: '260104'
sourceHash: beee9a6d46fea46ddca7ab57b452f0182cf37efe534445726d0f3b9d81190400
---

这篇文章想聊一聊 **TanStack Query 的 queryKey**。

我在实际项目中使用 TanStack Query 时，曾多次彻底重构 **queryKey 的管理方式**。最初，我只是在组件里内联写上 `['user', userId]` 这样的数组；后来每次做缓存失效都要在不同地方重复写相同的键，开始频繁出现拼写错误，于是又把它们迁移到 `QUERY_KEYS` 这样的常量对象中。再后来读了 TkDodo 的文章，转向 query key factory 模式；过了很久，又引入了 `@lukemorales/query-key-factory`；等到 v5 发布，又用 `queryOptions` 重构了一遍。

明明只是一个缓存标识符的小数组，为什么会衍生出这么多模式？**为什么一个 queryKey 会留下如此丰富的演进痕迹？** 每一个阶段究竟想解决什么问题？

本文会沿着 TanStack Query 官方文档、TkDodo 的系列博客，以及 v5 引入的 `queryOptions` 内部实现，梳理 queryKey 的工作原理，以及它为何逐步演进成今天的形态。


## 没有 queryKey 的时代

在进入正题之前，先回顾一件事。如今我们使用 `TanStack Query`、`SWR` 之类的库已经习以为常，但在这些库出现之前，异步数据是怎么处理的？

最常见的方式，大概是把 `useState`、`useEffect`、`fetch`、`axios` 等组合起来。

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

这段代码的问题很明显：页面上只要有两个查看同一 `userId` 的组件，**相同的请求就会发送两次。** 原因是没有缓存。用户跳转到其他页面后再回来，也会从头重新获取数据。我们无法判断数据是 1 秒前还是 1 小时前获取的，因此也很难模拟“先展示缓存值，再在后台更新”这样的行为。（当然可以自己引入缓存系统来实现，但我认为它的维护成本相当高。）

为了解决这个问题，后来出现了 Redux + redux-thunk（或 redux-saga）的组合。把数据获取逻辑抽到 thunk 中，再把结果存进状态仓库，其他组件就能复用相同的数据。但每次都要定义 action 类型、编写 reducer，并手动管理加载、成功和失败状态。仅仅获取一份数据，就要写大量样板代码。（我正是在这个时期进入职场的，当时一直困惑：“为什么取一份数据要新建这么多个文件？”）

上述流程的本质归根结底是：**“只有能够识别这个请求究竟是什么请求，才能避免重复发送相同请求。”** 而标识“这是什么请求”的东西，正是 queryKey。

SWR 和 React Query（现 TanStack Query）正面解决了这个问题：“异步请求必须有标识符，相同标识符共享缓存。”就凭这一条简单原则，前面所有的样板代码都消失了。


## queryKey 的本质

那么，queryKey 究竟是什么？TanStack Query 官方文档是这样定义的。

::::quote
:::translation
从根本上说，TanStack Query 根据 query key 管理查询缓存。query key 的顶层必须是数组……只要 query key 可序列化，并且**对查询数据而言是唯一的**，就可以使用。
:::

:::original
At its core, TanStack Query manages query caching for you based on query keys. Query keys have to be an Array at the top level... As long as the query key is serializable, and **unique to the query's data**, you can use it.
:::
::::

核心有两点：**必须可序列化，并且必须对该数据唯一。** 相同的键代表相同的数据，不同的数据必须拥有不同的键。这条简单规则决定了整个缓存系统的行为。

还有一点同样重要：**queryKey 同时也扮演依赖数组的角色。** 就像 React 的 `useEffect` 会在依赖变化时重新执行副作用一样，queryKey 变化后，TanStack Query 会自动获取新数据。

```tsx
const { data } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
});
```

当 `userId` 为 `'A'` 和 `'B'` 时，queryKey 彼此不同。不同就意味着缓存未命中，进而触发数据获取，而且这一切都是自动的。得益于这种简洁性，我们无需亲自编写“userId 变了，所以要重新获取”的逻辑。

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

稳定避免这一问题的技术叫作 **canonical form（规范形式）**：强制语义相同的输入始终对应唯一的一种表示。`hashKey` 的 replacer 对普通对象的键进行排序，正是出于这个原因。无论输入顺序如何，都让输出保持一致，使序列化结果与对象语义形成一一对应。用数学语言来说，就是从键顺序不同的对象构成的等价类（equivalence class）中，选出排序后的形式作为代表元。

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


## queryKey 编写规则

理解了前面较为复杂的内部机制后，编写规则也就顺理成章了。官方文档推荐的规则可以归纳如下。

**规则 1：queryKey 必须是数组。**

传入字符串也能工作（内部会转换成数组），但为了保持一致，最好从一开始就使用数组。

```tsx
// 비권장
useQuery({ queryKey: 'todos', queryFn });

// 권장
useQuery({ queryKey: ['todos'], queryFn });
```

**规则 2：把 queryFn 依赖的所有变量都放进 queryKey。**

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

思路和 `useEffect` 的依赖完全一样：函数内部使用的所有变量，都必须进入键（也就是依赖）中。违反这条规则，就可能出现用户已经切换，界面上却仍显示前一个用户数据的隐蔽缺陷。

**规则 3：按照从最 generic 到最 specific 的顺序排列。**

```tsx
// 좋다
['todos', 'list', { filter: 'done' }]
['todos', 'detail', todoId]

// 안 좋다 (순서가 뒤집혀 있음)
[{ filter: 'done' }, 'list', 'todos']
```

这种顺序之所以重要，是因为**缓存失效（invalidation）**。TanStack Query 的 `invalidateQueries` 默认采用 **prefix matching**。

```tsx
// 모든 todos 관련 쿼리 무효화
queryClient.invalidateQueries({ queryKey: ['todos'] });
// → ['todos', 'list', ...], ['todos', 'detail', ...] 모두 매치된다

// list 쿼리만 무효화
queryClient.invalidateQueries({ queryKey: ['todos', 'list'] });
// → ['todos', 'list', ...]만 매치된다
```

把键设计成树状结构后，从“重新获取这个领域的所有数据”到“只重新获取这个确切条目”，都可以用一行代码表达。（初看时可能觉得没什么特别，但只要经历过一次键设计不当、失效范围与预期不符，就会切身体会到它的价值。）


## queryKey 管理方式的演进

到这里，我们讨论了 queryKey 的工作原理和使用方法。接下来正式进入另一个问题：**queryKey 的管理方式是怎样一步步变化的？**

下面按时间顺序整理我在实际项目中经历过的阶段。


### 1. 内联数组

这是最简单的形式：在组件内部组合固定字符串和 props 值。

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

项目刚起步时，这样已经足够。

问题会随着代码库扩大而出现。在修改用户信息的 mutation 中需要做缓存失效时，每次都要搜索“用户相关的 query key 到底是什么来着？”有的地方写成 `['user', userId]`，另一些地方却写成 `['users', userId]`（复数）。它们是完全不同的缓存槽，因此失效只会作用于其中一边。


### 2. 常量对象

为了避免拼写错误，把 query key 集中到常量中。

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

拼写错误消失了，但组装键的责任依然落在使用方。有人把它写成 `[QUERY_KEYS.USER, userId]`，有人写成 `[QUERY_KEYS.USER, userId, 'detail']`，还有人写成 `['user', 'detail', userId]`。到了这个阶段，还得额外记住究竟哪一种才符合约定。


### 3. Query Key Factory

这一模式在 TkDodo 的 [Effective React Query Keys](https://tkdodo.eu/blog/effective-react-query-keys) 一文中得到了具体化：为每个领域定义一个创建键的对象，再用函数表达层级结构。

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

这个模式的强大之处在于，**层级结构会明确地体现在代码中**。`todoKeys.all` 指向所有 todos 相关查询，`todoKeys.lists()` 指向所有列表型查询，`todoKeys.detail(1)` 则指向某个具体条目。只用一行代码，就能准确表达失效范围。

另一个优点是 **co-location（共置）**。TkDodo 不建议把键全部集中到一个全局文件中，而是建议在功能目录内放置 `queries.ts`，将键和 hook 一起放在其中。

```
src/
└── features/
    └── todos/
        ├── index.tsx
        └── queries.ts   # 키와 훅을 모두 여기에
```

这样一来，就形成了一个简单的心智模型：“要修改 todos，只看 todos 文件夹就够了。”这正是“把共同变化的内容放在一起”这一原则的忠实实现。


### 4. @lukemorales/query-key-factory

如果每次都手写第三种模式，样板代码会逐渐堆积。而当我们想合并管理多个领域的键时，也会需要一个标准化接口。[@lukemorales/query-key-factory](https://github.com/lukemorales/query-key-factory) 正是把这一模式库化后的产物。

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

`createQueryKeys` 会自动添加前缀，`mergeQueryKeys` 可以合并多个领域。还可以通过约定好的 `_def` 属性访问整个领域的键。手写 factory 时每次都要加 `as const`、手动收窄类型的工作也随之消失。

这个库一度几乎被当作事实标准使用。（我自己也用了很长时间。）但 queryOptions 出现后，情况发生了变化。


### 5. queryOptions（v5 官方）

TanStack Query v5 最重要的变化之一，就是引入 `queryOptions` API。从 v4 升级到 v5 后，所有 hook 的参数统一成了单个对象，而这一变化真正的目的，是让这个对象可以被抽取为**可复用单元**。

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

第一眼看到它时，可能会想：“这有什么不同？不就是把对象包进一个函数吗？”TkDodo 在 [The Query Options API](https://tkdodo.eu/blog/the-query-options-api) 一文中也承认了这一点：在运行时，它确实只是把收到的对象原样返回。

真正高效的工作发生在**类型系统内部**。接下来继续展开。


## queryOptions 的 DataTag

`queryOptions` 不只是一个普通辅助函数，因为它会**把数据类型信息嵌入返回的 queryKey 中。** 在 TanStack Query 内部，这套机制叫作 `DataTag`。

大致实现如下。

```typescript
declare const dataTagSymbol: unique symbol;
declare const dataTagErrorSymbol: unique symbol;

export type DataTag<TType, TValue, TError = unknown> = TType & {
  [dataTagSymbol]: TValue;
  [dataTagErrorSymbol]: TError;
};
```

这是一个使用 `unique symbol` 的 **branded type**。它在运行时不会产生任何影响，只是一个标记；但对 TypeScript 来说，它携带着这样一条信息：“这个数组不是普通数组，而是与 `TValue` 类型数据相连的数组。”

这里使用 `unique symbol` 是有原因的。zenn 的 [Uncovering the unique symbol Behind DataTag](https://zenn.dev/tsuboi/articles/tanstack-query-options-unique-symbol?locale=en) 一文把它比作“类型信息的专属停车位”。如果使用普通字符串键，就可能与其他库或用户代码中的键冲突；而**每个 `unique symbol` 声明本身都会创建独一无二的类型**，所以它不会与其他任何声明成为同一种类型，相当于一个绝不会冲突的标识符。

仅凭这一个机制，就能带来很大的差异。

```tsx
const data = queryClient.getQueryData(['user', 'abc']); // unknown
const data = queryClient.getQueryData(userDetailOptions('abc').queryKey); // User | undefined
```

`getQueryData` 和 `setQueryData` 虽然只接收一个 queryKey，但数据类型已经刻在 queryKey 里，因此返回类型可以自动推断。无需手动传入 generic；如果向 `setQueryData` 传入错误类型，编译器也会立即捕获。

当然，它也有局限。`getQueriesData` 这类一次获取多个查询的方法，返回结果是异构的元组数组，无法应用这种类型推断。另外，由于使用了 `unique symbol`，在单体仓库环境生成 `.d.ts` 时可能出现 TS4023 错误，可以通过显式导入 `dataTagSymbol` 规避。

梳理到这里，有一点已经十分明确：**queryOptions 的类型推断完全依赖于 queryKey 和 queryFn 在同一处声明。** 要把 queryFn 的返回类型刻进 queryKey，两者就必须在同一个地方定义。

这一点对 query key factory 的设计方向有着重要启示。上一代模式更注重把 queryKey 管理拆分成独立的抽象单元，而 v5 的建议恰好相反：**重新把 queryKey 和 queryFn 绑定为一个单元。** TkDodo 甚至表示，“拆开 queryKey 和 queryFn 是一个错误”。键归根结底是函数依赖的集合，两者本来就无法割裂。


## 实践中的 queryOptions 组合模式

当 `queryOptions` 与 domain factory 结合时，它的真正价值才会体现出来。v5 官方文档推荐的形式如下。

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

下面逐一解释这个模式的优点。

**1. 同时获得层级结构和类型推断。**

`todoQueries.all()` 和 `todoQueries.lists()` 只返回数组，而 `todoQueries.detail(1)` 返回通过 `queryOptions` 创建、带有 data tag 的对象。做缓存失效时使用数组，调用查询时则使用 options 对象。

```tsx
useQuery(todoQueries.detail(1));                                // 옵션 객체
queryClient.invalidateQueries({ queryKey: todoQueries.all() }); // 배열
```

**2. 可以在组件中局部覆盖 options。**

`queryOptions` 的结果归根结底是对象，因此可以在调用时组合一部分 options。

```tsx
const { data: title } = useQuery({
  ...todoQueries.detail(1),
  select: (todo) => todo.title,  // 컴포넌트별로 다른 select 적용
});
```

这个模式尤其强大的一点是，`select` 的返回类型会被自动推断，`data` 的类型也随之收窄为 `string`。对组件来说，可以只选择自己需要的部分，同时把 domain 定义完整保留在同一处。

**3. 包装 `useQuery` 的自定义 hook 会逐渐消失。**

在 v4 时代，常见模式是为每个 domain 创建自定义 hook。

这种方式的问题在于：**一旦需要 prefetch，就必须再写一遍相同定义。** `useTodoDetail` 是 hook，无法在组件外调用，因此在 router loader 或 event handler 中，还得重新写一遍 `queryClient.prefetchQuery({ queryKey: [...], queryFn: ... })`。

使用 `queryOptions` 后，这种重复就消失了。

同一份定义可以在任何地方工作。因此，TkDodo 建议“在 v5 中，与其创建 hook，不如定义 queryOptions”。hook 只在需要时作为一层薄封装，而 domain 定义即使没有 hook 也能自成一体。


## 变更后的缓存失效

queryKey 的层级结构真正大放异彩的场景，是 mutation 之后的缓存失效。根据 TanStack Query 的 [Query Invalidation](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation) 文档，`invalidateQueries` 默认采用 **prefix matching**。

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

如果键按层级设计，**缓存失效的范围就会与代码语义一致。** “更新全部 todos”用 `all()` 表达，“只更新列表”用 `lists()` 表达，“只更新这个条目”则用 `detail(id)` 表达。

如果键像 `['todoList']`、`['todoDetail', 1]` 那样扁平地散落各处，要让“整个 todos 领域”失效，就必须分别调用两行代码，或者另行创建并维护前缀常量。（每次新增领域键时，一旦忘记把它加进那个常量，就会发生缓存失效遗漏的问题。）


## 在 queryFn 中重新取出 queryKey

最后还有一种模式值得介绍。`queryFn` 实际上会接收一个名为 `QueryFunctionContext` 的对象作为参数，其中原样包含调用时的 queryKey。

```tsx
queryOptions({
  queryKey: ['user', userId, { include: 'profile' }] as const,
  queryFn: ({ queryKey }) => {
    const [, id, options] = queryKey;
    return fetchUser(id, options);
  },
});
```

这个模式为什么有用？根据 TkDodo 的 [Leveraging the Query Function Context](https://tkdodo.eu/blog/leveraging-the-query-function-context)，它可以**强制同步 queryKey 与 queryFn 的依赖关系**。

```tsx
const sortBy = 'name';

queryOptions({
  queryKey: ['users'],
  queryFn: () => fetchUsers({ sortBy }),
});
```

这段代码存在风险，因为 queryFn 依赖外部变量；而且即便 `sortBy` 发生变化，缓存也不会更新，因为没有把这个依赖放进键。只要 `queryFn` 仍从外部闭包取值，这类失误就随时可能发生。

解决方案很简单：不要让 `queryFn` 依赖外部变量。**如果所有依赖都从 queryKey 中取出，**那么没有放进 queryKey 的变量，从一开始就无法在函数内部使用。

```tsx
queryOptions({
  queryKey: ['users', { sortBy }] as const,
  queryFn: ({ queryKey: [, { sortBy }] }) => fetchUsers({ sortBy }),
});
```

采用这种写法后，出现新依赖时，如果不把它加入 queryKey，函数内部就根本无法使用。编译器会直接提示：“键里没有这个属性。”也就是说，我们把键与函数的同步从编码约定交给了**类型系统**。


## 应当拆分到什么程度

读到这里，可能会有一个疑问：“那么，所有查询都应该抽成 `queryOptions` 吗？”

我的回答一如既往：**“视情况而定。”**

需要记住的是，**抽象并不总是好事**。对于只使用一次的查询，如果也硬要抽进领域工厂，只会让读代码的人不得不在两个文件间来回切换。queryKey 管理模式的演进并不意味着“始终都要使用更精细的工具”，而应该理解为：**“在需要时，可以选择逐级采用更复杂的方案。”**


## 总结

总而言之，queryKey 是 **TanStack Query 识别并缓存异步数据最根本的单元**。这个小数组中浓缩了缓存槽标识符、依赖数组、缓存失效范围；到了 v5，甚至还包含数据类型信息。正因为如此多的责任都聚集在这一点上，queryKey 的编写和管理方式会直接影响整个代码库的认知负担。

每一个阶段，都是对当时某位开发者所遇到真实问题的回答。因此，正确的顺序不是“现在已经是 v5，所以一律只用 `queryOptions`”，而是先看：**“我的代码库现在正面临哪一阶段的问题？”** 对一个内联数组已经足够的项目引入 domain factory，本身就可能是过度设计。

也希望读到这里的各位，能抽时间检查一下自己的项目：queryKey 如何散落在整个代码库中，缓存失效以什么方式进行，以及当前结构是否与团队规模和 domain 复杂度相匹配。


## 参考资料

:::ref
- [docs] [TanStack Query, Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
- [docs] [TanStack Query, Query Options](https://tanstack.com/query/v5/docs/framework/react/guides/query-options)
- [docs] [TanStack Query, TypeScript](https://tanstack.com/query/v5/docs/framework/react/typescript)
- [article] [TanStack, Announcing TanStack Query v5](https://tanstack.com/blog/announcing-tanstack-query-v5)
:::
