---
emoji: 🔑
title: "queryKey"
seoTitle: "TanStack Query queryKey 완전 정복: query key factory 가이드"
date: "2026-01-04"
updatedAt: "2026-10-08"
categories: 프론트엔드 React TanStack-Query queryKey
description: "TanStack Query의 queryKey 관리 방식이 인라인 배열, 상수 객체, query key factory를 거쳐 v5 queryOptions까지 어떻게 진화했는지 정리한다. 작성 규칙과 DataTag 타입 추론, 무효화 패턴을 실무 관점으로 다룬다."
keywords: "queryKey, query key factory, TanStack Query queryKey, queryKey 작성 규칙, queryOptions, setQueryData, TkDodo query keys, query-key-factory, React Query v5, 쿼리 무효화"
---

이번 포스팅에서는 **TanStack Query의 queryKey**에 대한 이야기를 해보려고 한다.

TanStack Query를 쓰면서 queryKey를 인라인 배열로 둘지, 상수 객체나 query key factory로 모을지, v5의 `queryOptions`로 옮길지 고민하는 프론트엔드 개발자를 위한 글이다. 끝까지 읽으면 각 관리 방식이 어떤 문제를 풀려고 등장했는지 알 수 있고, 지금 코드베이스에 어느 단계가 맞는지 판단할 기준을 얻을 수 있다.

필자는 실무에서 TanStack Query를 쓰면서 **queryKey 관리 방식을 몇 번이나 갈아엎었던** 경험이 있다. 처음에는 그냥 컴포넌트 안에서 `['user', userId]` 같은 배열을 인라인으로 박아 썼다가, 무효화할 때마다 같은 키를 여러 곳에 적느라 오타를 내기 시작했고, 그래서 `QUERY_KEYS` 같은 상수 객체로 옮겼다. 그러다 TkDodo의 글을 읽고 query key factory 패턴으로 넘어갔고, 한참 뒤에는 `@lukemorales/query-key-factory` 라이브러리를 도입했고, 그러다 v5가 나오고서 `queryOptions`로 또 한 번 갈아엎었다.


## queryKey가 없던 시절

본격적인 이야기에 앞서 한 가지 짚고 넘어가자. 우리는 지금 너무 당연하게 `TanStack Query`, `SWR` 같은 라이브러리를 쓰고 있지만, 이 라이브러리가 없던 시절에는 비동기 데이터를 어떻게 다뤘을까?

가장 흔한 형태는 `useState`, `useEffect`, `fetch`, `axios` 등을 조합하는 것이었을것이다.

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

이 코드의 문제는 명백하다. 같은 `userId`를 보는 컴포넌트가 페이지에 두 개만 있어도 **동일한 요청이 두 번 나간다.** 이유는 캐시가 없기 때문이다. 그리고 사용자가 다른 페이지로 갔다가 돌아오면 또 다시 처음부터 fetch한다. 데이터가 1초 전에 가져온 것인지 1시간 전에 가져온 것인지 구분할 방법이 없으니, "캐시된 값을 보여주면서 백그라운드에서 갱신"같은 동작을 흉내내기도 어렵다. (이것을 구현하기위해 자체적으로 캐시 시스템을 도입할 수 있지만 관리하기 상당히 까다롭다고 생각한다.)

이걸 해결하려고 등장한 것이 Redux + redux-thunk(혹은 redux-saga) 조합이었다. 데이터 fetching 로직을 thunk로 빼서 store에 결과를 저장해두면, 다른 컴포넌트에서도 같은 데이터를 재사용할 수 있었다. 하지만 매번 액션 타입을 정의하고, reducer를 작성하고, 로딩/성공/실패 상태를 직접 관리해야 했다. 데이터 하나를 가져오기 위한 보일러플레이트가 어마어마했다. (필자는 이 시기에 실무를 시작했고, "왜 데이터 하나 가져오는데 파일을 여러개나 만들어야 하지?"라는 의문을 품었다.)

위 흐름의 본질은 결국 **"이 요청이 어떤 요청인지를 식별할 수 있어야, 같은 요청을 다시 하지 않을 수 있다."** 그리고 그 "어떤 요청인지"의 식별자가 바로 queryKey의 정체이다.

SWR과 React Query(현 TanStack Query)는 이 문제를 정면으로 풀었다. "비동기 요청에는 식별자가 있어야 하고, 같은 식별자라면 캐시를 공유한다." 이 단순한 원칙 하나로 위의 모든 보일러플레이트가 사라진 것이다.


## queryKey의 본질

그렇다면 queryKey는 정확히 무엇일까? TanStack Query 공식 문서는 이렇게 정의한다.

::::quote
:::translation
핵심적으로 TanStack Query는 query key를 기준으로 쿼리 캐싱을 관리한다. query key의 최상위 수준은 배열이어야 한다... query key가 직렬화 가능하고 **쿼리 데이터에 고유하기만 하면**, 사용할 수 있다.
:::

:::original
At its core, TanStack Query manages query caching for you based on query keys. Query keys have to be an Array at the top level... As long as the query key is serializable, and **unique to the query's data**, you can use it.
:::
::::

핵심은 두 가지다. **직렬화 가능해야 하고, 그 데이터에 고유해야 한다.** 같은 키는 같은 데이터를 의미하고, 다른 데이터는 다른 키를 가져야 한다. 이 단순한 규칙이 캐시 시스템의 전체 동작을 결정한다.

그리고 한 가지 더 중요한 점이 있다. **queryKey는 동시에 의존성 배열의 역할을 한다.** React의 `useEffect`에서 deps가 바뀌면 effect가 다시 실행되듯이, queryKey가 바뀌면 TanStack Query가 자동으로 새 데이터를 fetch한다.

```tsx
const { data } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
});
```

`userId`가 `'A'`일 때와 `'B'`일 때 queryKey는 서로 다르다. 다르면 캐시 미스이고, 캐시 미스이면 fetch한다. 자동이다. 이 단순함 덕분에 우리가 직접 "userId가 바뀌었으니 다시 fetch해야 한다"는 로직을 짤 필요가 없다.

그렇다면 렌더링마다 새로 만들어지는 배열을 TanStack Query는 어떻게 같은 키로 알아볼까? 배열의 참조를 비교하지 않고, queryKey를 `hashKey`로 직렬화한 문자열(`queryHash`)을 캐시의 키로 쓴다. 이 함수는 plain object의 키를 정렬하면서 `JSON.stringify`로 직렬화하므로, 객체 안의 키 순서는 해시에 영향을 주지 않고 배열의 요소 순서는 영향을 준다. 값이 `undefined`인 속성은 직렬화 과정에서 사라져서, `{ a: 1, b: undefined }`와 `{ a: 1 }`은 같은 키가 된다. 이 동작을 구현 코드와 함께 따라간 내용은 [hashKey](/251230)에 따로 정리해 두었다.


## queryKey 작성 규칙

queryKey가 캐시의 식별자이자 의존성 배열이라는 점을 이해했다면, 작성 규칙도 자연스럽게 따라온다. 공식 문서가 권하는 규칙을 정리하면 다음과 같다.

**규칙 1. queryKey는 반드시 배열이어야 한다.**

문자열로 넘겨도 동작은 한다(내부적으로 배열로 변환된다). 하지만 일관성을 위해 처음부터 배열로 쓰는 것이 좋다.

```tsx
// 비권장
useQuery({ queryKey: 'todos', queryFn });

// 권장
useQuery({ queryKey: ['todos'], queryFn });
```

**규칙 2. queryFn이 의존하는 모든 변수를 queryKey에 포함한다.**

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

`useEffect`의 deps와 똑같은 사고방식이다. 함수 안에서 사용하는 변수는 모두 키(=의존성)에 들어가야 한다. 이걸 어기면 사용자가 다른 사용자로 바뀌었는데도 이전 사용자의 데이터가 그대로 보이는, 추적하기 어려운 버그가 생긴다.

**규칙 3. 가장 generic한 것에서 가장 specific한 것 순서로 배치한다.**

```tsx
// 좋다
['todos', 'list', { filter: 'done' }]
['todos', 'detail', todoId]

// 안 좋다 (순서가 뒤집혀 있음)
[{ filter: 'done' }, 'list', 'todos']
```

이 순서가 중요한 이유는 **무효화(invalidation)** 때문이다. TanStack Query의 `invalidateQueries`는 기본적으로 **prefix matching**으로 동작한다.

```tsx
// 모든 todos 관련 쿼리 무효화
queryClient.invalidateQueries({ queryKey: ['todos'] });
// → ['todos', 'list', ...], ['todos', 'detail', ...] 모두 매치된다

// list 쿼리만 무효화
queryClient.invalidateQueries({ queryKey: ['todos', 'list'] });
// → ['todos', 'list', ...]만 매치된다
```

키를 트리 구조로 설계해두면, "이 도메인의 모든 데이터를 다시 받아와라"부터 "이 정확한 항목 하나만 다시 받아와라"까지 한 줄로 표현할 수 있다. (이게 처음에 봤을 때는 별 거 아닌 것 같다가, 한 번 잘못 설계해놓고 무효화 범위가 의도와 다르게 동작하는 걸 겪어보면 그 가치가 사무치게 와닿는다.)


## queryKey 관리의 변천사

여기까지가 queryKey의 동작 원리와 사용법에 관한 이야기였다. 이제 본격적으로 **queryKey 관리가 어떤 흐름으로 변경되었을까?** 라는 질문으로 넘어가자.

필자가 실무에서 거쳐온 단계를 시간순으로 정리해보겠다.


### 1. 인라인 배열

가장 단순한 형태이다. 컴포넌트 안에서 고정 문자열과 props 값을 조합한다.

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

처음 시작할 때는 이걸로도 충분하다. 

문제는 코드베이스가 커지면서 시작된다. 사용자 정보를 수정하는 mutation에서 무효화를 걸어야 하는데, "사용자 관련 쿼리 키가 뭐였더라?"를 매번 검색해서 찾아야 한다. 어떤 곳은 `['user', userId]`로 적어놓고, 어떤 곳은 `['users', userId]`(복수형)로 적어놓는 일이 생긴다. 둘은 완전히 다른 캐시 슬롯이라 무효화가 한쪽에만 적용된다. 


### 2. 상수 객체

오타를 막기 위해 쿼리키를 상수로 모아둔다.

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

오타는 사라진다. 그런데 여전히 키를 조립하는 책임은 사용처에 있다. `[QUERY_KEYS.USER, userId]`라는 조합을 누군가는 `[QUERY_KEYS.USER, userId, 'detail']`로 쓰고, 또 누군가는 `['user', 'detail', userId]`로 쓴다. 어떤 게 맞는지 컨벤션을 별도로 외워야 하는 시점이 온다.


### 3. Query Key Factory

이 패턴은 TkDodo의 [Effective React Query Keys](https://tkdodo.eu/blog/effective-react-query-keys) 글에서 구체화되었다. 도메인별로 키를 만드는 객체를 정의하고, 계층 구조를 함수로 표현한다.

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

이 패턴이 강력한 이유는 **계층 구조가 코드로 명시적으로 드러나기 때문**이다. `todoKeys.all`은 모든 todos 관련 쿼리를, `todoKeys.lists()`는 모든 리스트형 쿼리를, `todoKeys.detail(1)`은 특정 항목을 가리킨다. 무효화의 범위를 코드 한 줄로 정확히 표현할 수 있다.

또 하나의 장점은 **콜로케이션(co-location)** 이다. TkDodo는 키를 전역 파일에 모으는 것을 권하지 않는다. 대신 기능(feature) 디렉토리 안에 `queries.ts`를 두고, 그 안에 키와 hook을 함께 둔다.

```
src/
└── features/
    └── todos/
        ├── index.tsx
        └── queries.ts   # 키와 훅을 모두 여기에
```

이렇게 하면 "todos에 뭘 수정하려면 todos 폴더만 보면 된다"는 단순한 멘탈 모델이 만들어진다. 함께 변하는 것을 함께 둔다는 원칙의 충실한 구현이다.


### 4. @lukemorales/query-key-factory

3번째 패턴을 매번 손으로 짜다 보면 보일러플레이트가 쌓인다. 그리고 여러 도메인의 키를 합쳐 관리하고 싶을 때 표준화된 인터페이스가 아쉬워진다. [@lukemorales/query-key-factory](https://github.com/lukemorales/query-key-factory)는 이 패턴을 라이브러리화한 결과물이다.

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

`createQueryKeys`가 자동으로 prefix를 붙여주고, `mergeQueryKeys`로 도메인을 합칠 수 있다. 그리고 `_def`라는 약속된 속성으로 도메인 전체 키에 접근할 수 있다. 수기 factory에서 매번 `as const`를 붙이며 타입을 직접 좁혀야 했던 작업들이 사라진다.

이 라이브러리는 한동안 사실상 표준처럼 쓰였다. (필자도 한참 즐겨 썼다.) 그런데 queryOptions가 나오면서 상황이 달라졌다.


### 5. queryOptions (v5 공식)

TanStack Query v5의 가장 중요한 변화 중 하나가 바로 `queryOptions` API의 도입이다. v4에서 v5로 넘어오면서 모든 hook의 인자가 단일 객체로 통일되었는데, 이 변화의 진짜 목적은 그 객체를 **재사용 가능한 단위**로 빼낼 수 있게 만드는 것이었다.

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

처음 보면 "이게 뭐가 다르지? 그냥 객체를 함수로 감싼 것 같은데?"라는 생각이 든다. TkDodo도 [The Query Options API](https://tkdodo.eu/blog/the-query-options-api) 글에서 이 점을 인정한다. 런타임에서는 정말로 받은 객체를 그대로 돌려줄 뿐이다.

진짜 효율적인 일은 **타입 시스템 안에서** 일어난다. 이어서 이야기해보자.


## queryOptions의 DataTag

`queryOptions`가 단순한 헬퍼가 아닌 이유는, **반환된 queryKey에 데이터 타입 정보를 심어두기 때문이다.** 이 메커니즘을 TanStack Query 내부에서는 `DataTag`라고 부른다.

대략적인 구현은 이렇다.

```typescript
declare const dataTagSymbol: unique symbol;
declare const dataTagErrorSymbol: unique symbol;

export type DataTag<TType, TValue, TError = unknown> = TType & {
  [dataTagSymbol]: TValue;
  [dataTagErrorSymbol]: TError;
};
```

`unique symbol`을 사용한 **branded type**이다. 런타임에는 아무 영향도 없는 표시일 뿐이지만, TypeScript 입장에서는 "이 배열은 단순한 배열이 아니라, `TValue` 타입의 데이터와 연결된 배열이다"라는 정보를 담고 있다.

여기서 굳이 `unique symbol`을 쓰는 이유가 있다. zenn의 [Uncovering the unique symbol Behind DataTag](https://zenn.dev/tsuboi/articles/tanstack-query-options-unique-symbol?locale=en) 글은 이 장치를 "타입 정보를 위한 전용 주차 공간"에 비유한다. 일반 string 키였다면 다른 라이브러리나 사용자 코드의 키와 충돌할 수 있지만, **각 `unique symbol` 선언은 그 자체로 고유한 타입을 만들기 때문에** 다른 어떤 선언과도 같은 타입이 되지 않는다. 절대 충돌하지 않는 식별자가 되는 셈이다.

이 한 가지 장치가 만들어내는 차이는 크다.

```tsx
const data = queryClient.getQueryData(['user', 'abc']); // unknown
const data = queryClient.getQueryData(userDetailOptions('abc').queryKey); // User | undefined
```

`getQueryData`나 `setQueryData`는 queryKey 하나만 받지만, 그 queryKey 안에 데이터 타입이 이미 새겨져 있으니 반환 타입이 자동으로 추론된다. 제네릭을 직접 넘길 필요가 없고, 잘못된 타입을 `setQueryData`에 넣으려 하면 컴파일러가 즉시 잡아준다.

물론 한계도 있다. `getQueriesData`처럼 여러 쿼리를 한 번에 가져오는 메서드는 결과가 이질적인 튜플 배열이라 타입 추론이 적용되지 않는다. 그리고 `unique symbol`을 사용하기 때문에 `.d.ts` 생성 시 모노레포 환경에서 TS4023 에러가 날 수 있는데, 이는 `dataTagSymbol`을 명시적으로 import해서 우회한다.

여기까지의 메커니즘을 정리하면 한 가지 사실이 분명해진다. **queryOptions의 타입 추론은 queryKey와 queryFn이 한 자리에서 함께 선언되어 있다는 사실에 전적으로 의존한다.** queryFn의 반환 타입을 queryKey에 새겨 넣으려면, 둘이 같은 곳에서 선언되어야 하기 때문이다.

이 점은 query key factory의 설계 방향에 묵직한 함의를 던진다. 이전 세대의 패턴들은 queryKey 관리를 별도의 추상화 단위로 떼어내는 데 무게를 두었다. 그런데 v5의 권고는 정반대이다. **queryKey와 queryFn을 한 단위로 다시 묶는 것**이다. TkDodo는 이를 두고 "queryKey와 queryFn을 분리한 것은 실수였다"고까지 표현한다. 키는 결국 함수가 사용하는 의존성의 모음이고, 둘은 떼어놓을 수 없는 관계이기 때문이다.


## 실무에서 쓰는 queryOptions 합성 패턴

`queryOptions`의 진가는 도메인별 factory와 결합할 때 드러난다. v5 공식 문서가 권장하는 형태는 다음과 같다.

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

이 패턴이 좋은 이유를 하나씩 풀어보자.

**1. 계층 구조와 타입 추론을 동시에 얻는다.**

`todoQueries.all()`이나 `todoQueries.lists()`는 그냥 배열을 반환하지만, `todoQueries.detail(1)`은 `queryOptions`를 통해 만들어진 데이터 태그가 붙은 객체를 반환한다. 무효화에는 배열을, 쿼리 호출에는 옵션 객체를 쓰면 된다.

```tsx
useQuery(todoQueries.detail(1));                                // 옵션 객체
queryClient.invalidateQueries({ queryKey: todoQueries.all() }); // 배열
```

**2. 컴포넌트에서 옵션을 부분적으로 덮어쓸 수 있다.**

`queryOptions`의 결과는 결국 객체이니, 호출 시점에서 일부 옵션을 합성할 수 있다.

```tsx
const { data: title } = useQuery({
  ...todoQueries.detail(1),
  select: (todo) => todo.title,  // 컴포넌트별로 다른 select 적용
});
```

이 패턴이 특히 강력한 이유는, `select`의 반환 타입이 자동으로 추론되어 `data`의 타입이 `string`으로 좁혀진다는 점이다. 컴포넌트 입장에서는 필요한 부분만 골라쓰면서, 도메인 정의는 한 곳에 그대로 둘 수 있다.

**3. `useQuery`를 감싼 커스텀 훅이 점점 사라진다.**

v4 시절의 일반적인 패턴은 도메인별 커스텀 훅을 만드는 것이었다.

이 방식의 문제는, **prefetch가 필요해지는 순간 같은 정의를 또 한 번 작성해야 한다는 것**이었다. `useTodoDetail`은 hook이라 컴포넌트 밖에서 호출할 수 없으니, 라우터의 loader나 이벤트 핸들러에서는 다시 `queryClient.prefetchQuery({ queryKey: [...], queryFn: ... })`를 적어야 했다.

`queryOptions`를 쓰면 이 중복이 사라진다.

같은 정의 하나가 어디서든 동작한다. 그래서 TkDodo는 "v5에서는 hook을 만들기보다 queryOptions를 정의하라"고 권한다. hook은 필요할 때만 얇게 감싸는 도구가 되고, 도메인 정의는 hook 없이도 자족적으로 존재한다.


## Mutation Invalidation

queryKey의 계층 구조가 진짜로 빛을 발하는 자리는 mutation 후 무효화이다. TanStack Query의 [Query Invalidation](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation) 문서에 따르면 `invalidateQueries`는 **prefix matching**을 기본으로 한다.

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

키가 계층적으로 설계되어 있으면 **무효화의 범위가 코드의 의미와 일치한다.** "todos를 다 갱신해줘"는 `all()`로, "리스트만 갱신해줘"는 `lists()`로, "이 항목만 갱신해줘"는 `detail(id)`로 표현된다.

만약 키가 `['todoList']`, `['todoDetail', 1]`처럼 평면적으로 흩어져 있었다면, "todos 도메인 전체"를 무효화하려고 두 줄을 따로 호출하거나, 별도 prefix 상수를 만들어 관리해야 했을 것이다. (그리고 새 도메인 키가 추가될 때마다 그 상수에 추가하는 걸 깜빡하면, 무효화에서 누락되는 버그가 발생한다.)


## queryFn 안에서 queryKey 다시 꺼내쓰기

마지막으로 한 가지 더 짚어볼 패턴이 있다. `queryFn`은 사실 `QueryFunctionContext`라는 객체를 인자로 받는데, 그 안에는 호출 시점의 queryKey가 그대로 들어있다.

```tsx
queryOptions({
  queryKey: ['user', userId, { include: 'profile' }] as const,
  queryFn: ({ queryKey }) => {
    const [, id, options] = queryKey;
    return fetchUser(id, options);
  },
});
```

이 패턴이 왜 유용할까? TkDodo의 [Leveraging the Query Function Context](https://tkdodo.eu/blog/leveraging-the-query-function-context)에 따르면, **queryKey와 queryFn의 의존성을 강제로 동기화**할 수 있기 때문이다.

```tsx
const sortBy = 'name';

queryOptions({
  queryKey: ['users'],
  queryFn: () => fetchUsers({ sortBy }),
});
```

이 코드는 queryFn이 외부 변수에 의존하고 있는 위험한 코드다. 그리고 `sortBy`가 바뀌어도 캐시가 갱신되지 않는다. 키에 의존성을 안 넣었기 때문이다. 그런데 `queryFn`이 외부 클로저에서 변수를 끌어다 쓰는 한, 이런 실수는 언제든 일어날 수 있다.

해결책은 단순하다. `queryFn`이 외부 변수에 의존하지 않게 만드는 것이다. **모든 의존성을 queryKey에서 꺼내 쓰면**, queryKey에 안 들어간 변수는 애초에 함수 안에서 쓸 수 없게 된다.

```tsx
queryOptions({
  queryKey: ['users', { sortBy }] as const,
  queryFn: ({ queryKey: [, { sortBy }] }) => fetchUsers({ sortBy }),
});
```

이렇게 짜두면 의존성이 새로 생겼을 때 queryKey에 안 넣고는 함수 안에서 쓸 방법이 없다. 컴파일러가 "그런 키 없는데?"라고 잡아준다. 키와 함수의 동기화를 컨벤션이 아니라 **타입 시스템에 위임**하는 것이다.


## 어디까지 분리할 것인가

여기까지 읽으면 한 가지 의문이 들 수 있다. "그럼 모든 쿼리를 다 `queryOptions`로 빼야 하나?"

필자의 답은 늘 그렇듯, **"상황에 따라 다르다"** 이다.

기억해둘 것은, **추상화가 늘 좋은 것은 아니라는 점**이다. 한 번만 쓰이는 쿼리를 굳이 도메인 factory로 빼면, 코드를 읽는 사람이 두 파일을 오가야 할 뿐이다. queryKey 관리 패턴의 진화는 "더 정교한 도구를 항상 써야 한다"가 아니라, **"필요해진 시점에 사다리를 한 칸씩 올라갈 선택지가 있다"** 는 의미로 받아들이는 게 좋다.


## 마무리

정리하면, queryKey는 **TanStack Query가 비동기 데이터를 식별하고 캐싱하는 가장 근본적인 단위**이다. 그 작은 배열 안에는 캐시 슬롯의 식별자, 의존성 배열, 무효화의 범위, v5에 들어와서는 데이터 타입 정보까지 응축되어 있다. 그리고 이 한 점에 그렇게 많은 책임이 모여 있기 때문에, 어떻게 작성하고 어떻게 관리할지가 코드베이스 전체의 인지 부하에 직결된다.

각 단계는 그 시점에 누군가가 마주친 실제 문제에 대한 답이었다. 그래서 단순히 "지금은 v5니까 무조건 `queryOptions`만 쓰면 된다"가 아니라, **"내 코드베이스가 지금 어떤 단계의 문제를 겪고 있는가"** 를 먼저 보는 게 맞는 순서이다. 인라인 배열로도 충분한 프로젝트에 도메인 factory를 도입하는 것은 그 자체로 과잉 설계가 될 수 있다.

이 글을 읽는 독자 분들도 자신의 프로젝트에서 한 번쯤 점검해보시길 바란다. queryKey가 코드 전체에 어떻게 흩어져 있는지, 무효화는 어떤 방식으로 이루어지고 있는지, 그리고 그 구조가 지금의 팀 규모와 도메인 복잡도에 맞는지를 말이다.


## 참고 자료

:::ref
- [docs] [TanStack Query, Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
- [docs] [TanStack Query, Query Options](https://tanstack.com/query/v5/docs/framework/react/guides/query-options)
- [docs] [TanStack Query, TypeScript](https://tanstack.com/query/v5/docs/framework/react/typescript)
- [article] [TanStack, Announcing TanStack Query v5](https://tanstack.com/blog/announcing-tanstack-query-v5)
:::
