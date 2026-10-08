---
emoji: 🧮
title: "hashKey"
seoTitle: "TanStack Query queryKey 비교 원리: hashKey와 직렬화"
date: "2025-12-30"
categories: 프론트엔드 React TanStack-Query queryKey
description: "TanStack Query가 렌더링마다 새로 만들어지는 queryKey 배열을 같은 키로 판단하는 방법을 hashKey 구현으로 정리한다. 객체 키 순서는 무관하고 배열 순서는 중요한 이유, undefined가 사라지는 동작, queryKeyHashFn의 한계까지 다룬다."
keywords: "queryKey 비교, hashKey, queryHash, TanStack Query 캐시 키, React Query queryKey 순서, queryKeyHashFn, JSON.stringify 키 정렬, QueryCache"
---

이번 포스팅에서는 **TanStack Query가 두 queryKey를 같은 키로 판단하는 방식**에 대한 이야기를 해보려고 한다.

렌더링마다 새 배열로 만들어지는 queryKey가 왜 매번 캐시 미스를 내지 않는지, 객체의 키 순서나 `undefined` 값이 캐시에 영향을 주는지 궁금했던 TanStack Query 사용자를 위한 글이다. 결론부터 말하면 TanStack Query는 queryKey를 `hashKey`로 직렬화한 문자열을 캐시의 키로 쓰고, 이 과정에서 객체의 키 순서는 무시되고 배열의 요소 순서는 그대로 남는다.

queryKey는 TanStack Query가 쿼리 캐시를 관리하는 기준이 되는 배열이다. 같은 키는 같은 데이터를 뜻하고, `['user', userId]`의 `userId`가 바뀌어 키가 달라지면 캐시 미스가 나서 새로 fetch한다.

여기서 한 가지 의문이 생긴다. queryKey가 "같은 키"인지를 어떻게 판단할까? 단순히 `===`로 비교하면 객체 참조가 다를 텐데, 그러면 매번 캐시 미스가 날 텐데 말이다.


## QueryCache 내부

TkDodo의 [Inside React Query](https://tkdodo.eu/blog/inside-react-query)에 따르면, `QueryCache`는 결국 **메모리에 들고 있는 자료구조 하나**일 뿐이다. 좀 더 정확히 말하면, v5의 [공식 구현](https://github.com/TanStack/query/blob/main/packages/query-core/src/queryCache.ts)에서 그 자료구조는 plain object가 아니라 `Map<string, Query>`이다. 클래스 내부에 `#queries = new Map<string, Query>()`로 선언되어 있고, 모든 쓰기/읽기는 `#queries.set(query.queryHash, query)`와 `#queries.get(queryHash)`를 통해 일어난다. 키는 queryKey의 직렬화된 형태(`queryHash`)이고, 값은 `Query` 클래스의 인스턴스이다.

옛 버전에서는 plain object를 쓰던 시절도 있었지만 v5 시점에서는 네이티브 `Map`으로 정리되었다. (`Map`은 키 충돌이나 프로토타입 오염 위험이 없고, 삽입 순서를 보존하며, 문자열 키 lookup(조회)이 평균 O(1)이라 캐시 자료구조로는 거의 정석에 가까운 선택이다.)

`useQuery`가 호출될 때마다 일어나는 일은 단순하다. **queryKey를 해시값으로 변환하고, 이 해시값으로 Map에서 lookup한다.** 있으면 캐시된 `Query` 인스턴스를 가져오고, 없으면 새로 만들어 `set`한다.

여기서 한 가지 의문이 자연스럽게 따라온다. **왜 굳이 queryKey를 문자열로 직렬화할까?** 그냥 `Map<QueryKey, Query>`처럼 배열 자체를 키로 쓰면 되지 않나?

이 의문의 답은 자바스크립트의 동등성 모델에 있다. 네이티브 `Map`은 키 비교를 **참조 동등성(reference equality)** 으로 한다. 내용이 같아도 메모리상 다른 객체면 다른 키로 본다.

```js
const m = new Map();
m.set(['user', 1], 'alice');
m.get(['user', 1]); // undefined — 새로 만든 배열은 다른 참조다
```

그런데 React 컴포넌트에서 `useQuery({ queryKey: ['user', userId] })`는 **렌더링마다 새 배열 인스턴스를 만든다.** 첫 렌더와 두 번째 렌더의 queryKey 배열은 내용이 같아도 메모리상 별개의 객체이다. 만약 캐시가 참조 동등성에 의존했다면, 같은 데이터를 보는 컴포넌트가 매 렌더마다 캐시 미스를 내는 비극이 벌어졌을 것이다.

참조 동등성으로 발생할 문제 해결책은 단순하다. **참조 동등성을 구조적 동등성(structural equality)으로 변환하는 것**이다. queryKey의 내용만으로 결정론적인 문자열을 만들고, 그 문자열을 Map의 키로 쓴다. 그러면 "내용이 같으면 같은 키"라는 우리가 원하던 의미론이 회복된다. `JSON.stringify`는 그 변환을 해주는 가장 단순한 도구일 뿐이다. (TanStack Query가 v3 시절에 여러 직렬화 전략을 시험하다가 결국 안정적인 `JSON.stringify` 변형으로 정착한 이유이기도 하다.)

여기서 핵심은 그 해시값을 만드는 함수, `hashKey`이다. [`packages/query-core/src/utils.ts`](https://github.com/TanStack/query/blob/main/packages/query-core/src/utils.ts)에 정의된 공식 구현은 정확히 이렇게 생겼다.

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

`JSON.stringify`이긴 한데, 그냥 stringify가 아니라 [replacer 콜백](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#the_replacer_parameter)을 끼워 **plain object의 키를 알파벳순으로 정렬**해서 직렬화한다. 

이 정렬이 왜 본질적인가 하면, 문자열 직렬화에는 한 가지 더 강한 조건이 따라붙기 때문이다. **의미가 같은 입력은 언제나 같은 문자열로 변환되어야 한다.** 그런데 일반적인 `JSON.stringify`는 키 순서를 그대로 둔다. `{ a: 1, b: 2 }`와 `{ b: 2, a: 1 }`은 의미상 같은 객체인데도 서로 다른 문자열로 직렬화되고, 결국 둘은 서로 다른 캐시 슬롯이 된다. 이러면 같은 데이터를 두 번 요청하는 사태가 다시 발생한다.

이걸 일관되게 막는 기법이 **canonical form(정규형)** 이다. 의미상 같은 입력은 항상 유일한 하나의 표현에 대응되도록 강제하는 것이다. `hashKey`의 replacer가 plain object의 키를 정렬하는 이유가 정확히 이거다. 어떤 순서로 들어왔든 출력이 같아지도록 만들어서, 직렬화의 결과가 객체의 의미와 일대일로 묶이게 한다. 다시 말해, 키 순서만 다르고 내용은 같은 객체들을 한 묶음으로 보고, 그 묶음을 대표하는 표현으로 키를 정렬한 형태 하나를 고르는 작업이다.

배열을 정렬하지 않는 것도 같은 원리의 뒷면이다. 배열은 순서 자체에 의미가 실린 자료구조라서, 정렬해버리면 정보가 손실된다. 객체의 키 순서는 우연이고, 배열의 요소 순서는 의도이다. `hashKey`는 그 둘을 정확히 다르게 취급한다. 이래서 공식 가이드가 queryKey를 "generic → specific 순서로 배치하라"고 권하는 것이다. 배열의 순서가 의미를 짊어지는 한, 그 의미는 작성자가 직접 정해주어야 하기 때문이다.

여기서 한 가지 더 짚어야 할 디테일이 있다. 키 정렬이 적용되는 대상은 **plain object** 뿐이라는 점이다. 같은 파일 안의 `isPlainObject`는 단순히 `typeof === 'object'`를 보는 게 아니라, `Object.getPrototypeOf(o) === Object.prototype`까지 검사해서 **순수 객체 리터럴**과 **클래스 인스턴스**를 가른다. 그래서 `{ foo: 1 }` 같은 리터럴은 정렬되지만, `class User { ... }`로 만든 인스턴스는 정렬 없이 통과한다. (queryKey에 클래스 인스턴스를 그대로 넣으면, `JSON.stringify`가 enumerable property만 뱉어내는 동작과 맞물려 의도와 다른 해시가 나올 수 있다는 함정이 여기서 나온다.)

이 동작 방식에서 두 가지 중요한 결과가 나온다.

**1. 객체의 키 순서는 무관하다.**

```tsx
useQuery({ queryKey: ['todos', { status: 'done', page: 1 }], queryFn });
useQuery({ queryKey: ['todos', { page: 1, status: 'done' }], queryFn });
// 두 쿼리는 같은 캐시 슬롯을 공유한다
```

키를 정렬해서 직렬화하기 때문이다. 이게 없었다면 객체 리터럴을 쓸 때마다 키 순서를 외우고 있어야 했을 것이다.

**2. 배열의 요소 순서는 중요하다.**

```tsx
useQuery({ queryKey: ['todos', status, page], queryFn });
useQuery({ queryKey: ['todos', page, status], queryFn });
// 두 쿼리는 다른 캐시이다
```

배열은 순서 자체에 의미가 있는 자료구조이기 때문이다. `JSON.stringify`도 배열의 순서는 그대로 둔다.

그리고 `undefined` 값은 직렬화 과정에서 사라진다는 사실도 알아두면 좋다. `{ a: 1, b: undefined }`와 `{ a: 1 }`은 같은 해시값을 만든다. (필자는 이걸 모르고 "undefined를 명시적으로 넣었으니 다른 캐시지!"라고 생각한 실수를 한적이 있다.)

또 한 가지, queryKey는 **순환 참조나 함수**를 포함할 수 없다. `JSON.stringify`가 처리하지 못하기 때문이다. `Date` 객체나 `Map/Set`, `BigInt` 같은 것도 마찬가지로 기본 동작에서는 권장되지 않는다. 직렬화 가능한, 순수한 데이터 구조여야 한다.

흥미로운 점은 이 제약이 완전한 강제는 아니라는 것이다. TanStack Query는 `queryKeyHashFn`이라는 옵션을 통해 **해시 함수 자체를 갈아끼울 수 있는 탈출구**를 열어둔다. 내부적으로는 `hashQueryKeyByOptions(queryKey, options)`가 옵션에 `queryKeyHashFn`이 있으면 그걸, 없으면 기본 `hashKey`를 호출하도록 분기한다.

```tsx
useQuery({
  queryKey: [{ id: userId, fetchedAt: new Date() }],
  queryFn,
  // Date를 ISO 문자열로 바꿔서 해싱
  queryKeyHashFn: (key) =>
    JSON.stringify(key, (_, v) => (v instanceof Date ? v.toISOString() : v)),
});
```

다만 이 옵션은 쿼리별로 따로 지정해야 하고, `queryClient.setQueryData`처럼 옵션을 모르는 채 호출되는 imperative API에서는 적용되지 않는다는 한계가 있다([Issue #1343](https://github.com/TanStack/query/issues/1343)). 그래서 실무에서는 탈출구를 쓰기보다, **queryKey를 만드는 시점에 직렬화 가능한 형태로 변환해서 넣는 쪽**이 훨씬 안전하다. (필자도 한 번 `Date`를 그대로 넣어두고 "왜 같은 시점인데 캐시가 갱신되지?"라며 한참을 헤맨 적이 있다. 결국 답은 "그 `Date`는 같은 시점이지만 다른 객체 인스턴스라 매번 다른 해시였다"였다.)


## 마무리

정리하면, TanStack Query는 queryKey 배열의 참조를 비교하지 않는다. `hashKey`가 plain object의 키를 정렬하며 `JSON.stringify`로 만든 문자열(`queryHash`)을 `Map`의 키로 쓴다. 그래서 객체의 키 순서는 캐시에 영향을 주지 않고, 배열의 요소 순서는 영향을 주며, 값이 `undefined`인 속성은 없는 것과 같다. 직렬화할 수 없는 값은 `queryKeyHashFn`으로 우회할 수 있지만, 키를 만드는 시점에 직렬화 가능한 값으로 바꿔 넣는 편이 안전하다.

이 판단 기준이 queryKey를 어떻게 작성하고 관리할지로 이어지는 이야기, 즉 인라인 배열에서 query key factory를 거쳐 `queryOptions`까지 오게 된 흐름은 [queryKey](/260104)에서 다룬다.

이 글을 읽는 독자 분들도 다음에 queryKey에 객체나 `Date`를 넣을 때, 그 값이 어떤 문자열로 직렬화될지 한 번쯤 떠올려 보시길 바란다.


## 참고 자료

:::ref
- [docs] [TanStack Query, Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
:::
