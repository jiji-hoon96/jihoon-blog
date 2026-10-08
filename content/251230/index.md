---
emoji: 🧮
title: "queryKey 비교 원리"
seoTitle: "TanStack Query queryKey 비교 원리: hashKey 직렬화와 키 순서"
date: "2025-12-30"
updatedAt: "2026-10-08"
categories: 프론트엔드 React TanStack-Query queryKey
description: "TanStack Query가 렌더링마다 새로 만들어지는 queryKey 배열을 같은 키로 판단하는 방식을 정리한다. hashKey 직렬화가 키 순서, undefined, Map 같은 값을 어떻게 바꾸는지와 필터가 키 구조를 비교하는 방식까지 다룬다."
keywords: "queryKey 비교, hashKey, queryHash, TanStack Query 캐시 키, React Query queryKey 순서, queryKeyHashFn, JSON.stringify 키 정렬, QueryCache"
---

이번 포스팅에서는 **TanStack Query가 두 queryKey를 같은 키로 판단하는 방식**에 대한 이야기를 해보려고 한다.

렌더링마다 새 배열로 만들어지는 queryKey가 왜 매번 캐시 미스를 내지 않는지, 객체의 키 순서나 `undefined` 값이 캐시에 영향을 주는지 궁금했던 TanStack Query 사용자를 위한 글로, 읽고 나면 키를 같다고 보는 규칙과 그 규칙이 캐시에 주는 영향을 알 수 있다. 결론부터 말하면 TanStack Query는 queryKey를 `hashKey`로 직렬화한 문자열을 캐시의 키로 쓰고, 이 과정에서 객체의 키 순서는 무시되고 배열의 요소 순서는 그대로 남는다.

queryKey는 TanStack Query가 쿼리 캐시를 관리하는 기준이 되는 배열이다. 같은 키는 같은 데이터를 뜻하고, `['user', userId]`의 `userId`가 바뀌어 키가 달라지면 캐시 미스가 나서 새로 fetch한다.


## QueryCache 내부

TkDodo의 [Inside React Query](https://tkdodo.eu/blog/inside-react-query)에 따르면, `QueryCache`는 결국 **메모리에 들고 있는 자료구조 하나**일 뿐이다. v5의 [공식 구현](https://github.com/TanStack/query/blob/%40tanstack%2Fquery-core%405.104.1/packages/query-core/src/queryCache.ts)에서 그 자료구조는 plain object가 아니라 `Map<string, Query>`이다. 필드 타입은 `QueryStore`이고 생성자에서 `new Map<string, Query>()`를 넣는다. 저장과 조회는 `queryHash`를 키로 한다. 키는 queryKey의 직렬화된 형태(`queryHash`)이고, 값은 `Query` 클래스의 인스턴스이다. 이 글의 코드와 실행 결과는 `@tanstack/query-core` 5.104.1 기준이다.

옛 버전에서 쓰던 plain object와 달리 `Map`은 프로토타입에서 물려받은 키와 부딪힐 일이 없다.

`useQuery`가 호출될 때마다 일어나는 일은 단순하다. **queryKey를 해시값으로 변환하고, 이 해시값으로 Map에서 lookup한다.** 있으면 캐시된 `Query` 인스턴스를 가져오고, 없으면 새로 만들어 `set`한다.

여기서 한 가지 의문이 자연스럽게 따라온다. **왜 굳이 queryKey를 문자열로 직렬화할까?** 그냥 `Map<QueryKey, Query>`처럼 배열 자체를 키로 쓰면 되지 않나?

이 의문의 답은 자바스크립트의 동등성 모델에 있다. 네이티브 `Map`은 키 비교를 **참조 동등성(reference equality)** 으로 한다. 내용이 같아도 메모리상 다른 객체면 다른 키로 본다.

```js
const m = new Map();
m.set(['user', 1], 'alice');
m.get(['user', 1]); // undefined. 새로 만든 배열은 다른 참조다
```

그런데 React 컴포넌트에서 `useQuery({ queryKey: ['user', userId] })`는 **렌더링마다 새 배열 인스턴스를 만든다.** 첫 렌더와 두 번째 렌더의 queryKey 배열은 내용이 같아도 메모리상 별개의 객체이다. 만약 캐시가 참조 동등성에 의존했다면, 같은 데이터를 보는 컴포넌트가 매 렌더마다 캐시 미스를 냈을 것이다.

참조 동등성으로 발생할 문제 해결책은 단순하다. **참조 동등성을 구조적 동등성(structural equality)으로 변환하는 것**이다. queryKey의 내용만으로 결정론적인 문자열을 만들고, 그 문자열을 Map의 키로 쓴다. 그러면 "내용이 같으면 같은 키"라는 우리가 원하던 의미론이 회복된다. `JSON.stringify`는 그 변환을 해주는 가장 단순한 도구일 뿐이다.

## hashKey의 키 정렬

해시값을 만드는 함수는 `hashKey`이다. [`packages/query-core/src/utils.ts`](https://github.com/TanStack/query/blob/%40tanstack%2Fquery-core%405.104.1/packages/query-core/src/utils.ts#L284-L295)에 정의된 공식 구현은 이렇게 생겼다.

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

`JSON.stringify`에 [replacer 콜백](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#the_replacer_parameter)을 끼워 **plain object의 키를 사전순으로 정렬**한 뒤 직렬화한다. 정확히는 `sort()`의 기본 비교인 UTF-16 코드 단위 순서라서 대문자 키가 소문자 키보다 앞에 온다.

이 정렬이 왜 본질적인가 하면, 문자열 직렬화에는 한 가지 더 강한 조건이 따라붙기 때문이다. **의미가 같은 입력은 언제나 같은 문자열로 변환되어야 한다.** 그런데 일반적인 `JSON.stringify`는 키 순서를 그대로 둔다. `{ a: 1, b: 2 }`와 `{ b: 2, a: 1 }`은 의미상 같은 객체인데도 서로 다른 문자열로 직렬화되고, 결국 둘은 서로 다른 캐시 슬롯이 된다. 이러면 같은 데이터를 두 번 요청하는 사태가 다시 발생한다.

이걸 일관되게 막는 기법이 **canonical form(정규형)** 이다. 의미상 같은 입력은 항상 유일한 하나의 표현에 대응되도록 강제하는 것이다. `hashKey`의 replacer가 plain object의 키를 정렬하는 이유가 이것이다. 어떤 순서로 들어왔든 출력이 같아지도록 만들어서, 의미가 같은 객체는 언제나 같은 문자열이 되게 한다. 반대 방향은 보장하지 않는다는 점은 뒤에서 다룬다.

배열을 정렬하지 않는 것도 같은 원리의 뒷면이다. 배열은 순서 자체에 의미가 실린 자료구조라서, 정렬해버리면 정보가 손실된다. 객체의 키 순서는 우연이고, 배열의 요소 순서는 의도이다. `hashKey`는 그 둘을 다르게 취급한다. 메인테이너 TkDodo가 [Effective React Query Keys](https://tkdodo.eu/blog/effective-react-query-keys)에서 queryKey를 가장 일반적인 것부터 가장 구체적인 것 순서로 구성하라고 권하는 것도 배열 순서가 의미를 갖기 때문이다. 그가 드는 이유는 무효화다. 앞부분이 같은 키들을 `['todos']` 하나로 한꺼번에 무효화할 수 있다. 이 비교는 해시가 아니라 뒤에서 볼 prefix 매칭이 맡는다.

키 정렬이 적용되는 대상은 **plain object** 뿐이다. 같은 파일 안의 `isPlainObject`는 `Object.prototype.toString` 결과가 `[object Object]`인지와 프로토타입이 `Object.prototype`(또는 `null`)인지를 검사해서 **순수 객체 리터럴**과 **클래스 인스턴스**를 가른다. 그래서 `{ foo: 1 }` 같은 리터럴은 정렬되지만, `class User { ... }`로 만든 인스턴스는 정렬 없이 통과한다. queryKey에 클래스 인스턴스를 그대로 넣으면 키를 정렬하지 않으므로 필드를 대입한 순서대로 직렬화되어, 값이 같아도 다른 해시가 나올 수 있다.

쓰는 쪽에서 보면 결과는 둘이다.

**1. 객체의 키 순서는 무관하다.**

```tsx
useQuery({ queryKey: ['todos', { status: 'done', page: 1 }], queryFn });
useQuery({ queryKey: ['todos', { page: 1, status: 'done' }], queryFn });
// 두 쿼리는 같은 캐시 슬롯을 공유한다
```

키 정렬이 없었다면 객체 리터럴을 쓸 때마다 키 순서를 외우고 있어야 했을 것이다.

**2. 배열의 요소 순서는 중요하다.**

```tsx
useQuery({ queryKey: ['todos', status, page], queryFn });
useQuery({ queryKey: ['todos', page, status], queryFn });
// 두 쿼리는 다른 캐시이다
```


## 직렬화가 바꾸는 값

`undefined` 값은 직렬화 과정에서 사라진다는 사실도 알아두면 좋다. `{ a: 1, b: undefined }`와 `{ a: 1 }`은 같은 해시값을 만든다. (필자는 이걸 모르고 "undefined를 명시적으로 넣었으니 다른 캐시지!"라고 생각한 실수를 한 적이 있다.)

배열 안에서는 다르게 동작한다. 배열 원소의 `undefined`는 사라지지 않고 `null`이 된다. 그래서 `['user', undefined]`와 `['user', null]`은 같은 키이고, `['user']`와는 다른 키다. `['user', userId]`에서 `userId`가 아직 `undefined`인 경우가 여기에 해당한다. `enabled: false`로 fetch를 막아 두어도 캐시에는 `["user",null]` 슬롯이 만들어진다. `useQuery`가 내부에서 쓰는 `QueryObserver`를 같은 옵션으로 만들어 확인했다.

`undefined`만 그런 것이 아니다. `hashKey`는 `JSON.stringify` 위에 서 있으므로, JSON이 표현하지 못하는 값은 대부분 에러 없이 다른 값으로 바뀐다. 아래 코드를 2026-10-08에 `@tanstack/query-core` 5.104.1, Node v24.16.0으로 돌렸고 주석이 실제 출력이다.

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

같은 방식으로 다른 값들도 돌려 보면 이렇게 정리된다.

| 키에 넣은 값 | 직렬화 결과 | 같은 키로 취급되는 것 |
|---|---|---|
| 배열 원소인 `undefined`, `NaN`, `Infinity`, 함수 | `null` | 그 자리에 `null`을 넣은 키 |
| 객체 속성인 `undefined`, 함수 | 속성이 사라진다 | 그 속성이 없는 키 |
| `Map`, `Set` | `{}` | 내용과 상관없이 모든 `Map`, `Set`, 빈 객체 |
| `Date` | ISO 문자열 | 같은 ISO 문자열 |
| `BigInt` | `TypeError`를 던진다 | 없음 |
| 순환 참조 | 고리가 plain object로만 이어지면 `RangeError`, 배열이나 클래스 인스턴스를 거치면 `TypeError`를 던진다 | 없음 |

가장 위험한 것은 `Map`과 `Set`이다. 위 코드에서 `new Map([['a', 1]])`을 키로 넣은 데이터가 `new Map([['b', 2]])`로 조회되어 나왔다. 에러가 없으니 다른 데이터를 화면에 그리고 있다는 단서도 없다.

에러로 드러나는 것은 `BigInt`와 순환 참조 둘뿐이다. 순환 참조는 무엇이 순환하느냐에 따라 에러가 갈린다. 고리가 plain object로만 이어지면 `RangeError: Maximum call stack size exceeded`로 끝나고, `arr.push(arr)`처럼 배열이나 클래스 인스턴스를 하나라도 거치면 `TypeError: Converting circular structure to JSON`으로 끝난다. replacer가 plain object마다 새 객체를 만들어 돌려주므로 `JSON.stringify`의 순환 감지가 같은 객체를 다시 만나지 못하고, 배열과 클래스 인스턴스는 replacer가 그대로 돌려주므로 순환 감지에 걸린다. 반대로 `Date`는 `toJSON`으로 ISO 문자열이 되므로, 캐시 조회에서는 같은 시각이면 같은 키가 되어 안전한 편이다.

필자는 한 번 `Date`를 그대로 넣어두고 "왜 같은 시점인데 캐시가 갱신되지?"라며 한참을 헤맨 적이 있다. 같은 시각을 가리키는 `Date`는 인스턴스가 달라도 같은 ISO 문자열이 되므로 같은 해시를 만든다. 매번 다른 키가 나왔다면 같은 시점처럼 보여도 시각 자체가 달랐던 것이다. 렌더 중에 `new Date()`를 만들면 렌더마다 밀리초 단위로 다른 시각이 들어가고, 그때마다 새 키가 된다.

그래서 queryKey에는 문자열, 숫자, 불리언, `null`과 이것들로 이루어진 배열과 plain object만 넣는 편이 안전하다.


## queryKeyHashFn

이 제약에는 탈출구가 있다. TanStack Query는 `queryKeyHashFn`이라는 옵션으로 **해시 함수 자체를 갈아끼울 수 있게** 열어둔다. 내부적으로는 `hashQueryKeyByOptions(queryKey, options)`가 옵션에 `queryKeyHashFn`이 있으면 그걸, 없으면 기본 `hashKey`를 호출하도록 분기한다.

갈아끼운다는 것은 `hashKey`를 통째로 대체한다는 뜻이다. 앞에서 본 키 정렬도 함께 사라지므로, 정렬이 필요하면 직접 구현해야 한다. 이 옵션이 쓸모 있는 경우는 `BigInt`처럼 기본 직렬화가 던지는 값이다. 아래 코드도 같은 환경에서 돌렸다.

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

두 번째 출력은 `BigInt`와 같은 숫자를 담은 문자열이 같은 키가 된다는 뜻이다. 마지막 출력은 키 정렬이 사라진 결과로, 키 순서만 다른 객체를 더는 같은 키로 보지 않는다.

등록하는 자리도 결과를 바꾼다. 위처럼 `QueryClient`의 `defaultOptions`나 `setQueryDefaults`로 등록하면 `setQueryData`와 `getQueryData`도 그 함수를 쓴다. 두 API가 해시하기 전에 `defaultQueryOptions`로 기본 옵션을 합치기 때문이다. 반면 `useQuery` 호출에만 적으면 imperative API는 기본 `hashKey`를 써서, 같은 키가 캐시 안에서 두 슬롯으로 갈린다. v3.2.0 베타 시절에는 전역 기본값도 `setQueryData`에 적용되지 않았고, [Issue #1343](https://github.com/TanStack/query/issues/1343)의 제보자가 v3.2.0-beta.30에서 고쳐진 것을 확인했다.

그래서 실무에서는 탈출구를 쓰기보다 **queryKey를 만드는 시점에 직렬화 가능한 형태로 변환해서 넣는 쪽**이 훨씬 안전하다. 해시 함수를 직접 쓰면 키 정렬과 등록 위치를 모두 챙겨야 하기 때문이다.


## 필터의 키 비교

두 키를 같다고 판단하는 방식은 하나 더 있다. 지금까지 말한 "같은 키"는 해시 문자열이 같다는 뜻이고, 해시가 쓰이는 곳은 캐시 조회와 `exact: true` 필터다. `invalidateQueries`나 `findAll` 같은 필터는 기본적으로 `partialMatchKey`로 판단하는데, 이 함수는 해시 문자열이 아니라 원래 queryKey의 구조를 재귀로 비교한다. 배열은 앞에서부터 맞춰 보고, 객체는 필터 쪽에 적힌 키만 본다. 아래 코드도 같은 환경에서 돌렸다.

```js
import { partialMatchKey } from '@tanstack/query-core'

const queryKey = ['todos', { status: 'done', page: 1 }]
console.log(partialMatchKey(queryKey, ['todos'])) // true
console.log(partialMatchKey(queryKey, ['todos', { status: 'done' }])) // true
console.log(partialMatchKey(queryKey, [{ status: 'done' }])) // false
console.log(partialMatchKey(queryKey, ['todos', { status: 'todo' }])) // false
```

해시를 거치지 않으므로 `queryKeyHashFn`을 갈아끼워도 이 매칭은 바뀌지 않는다. 앞 예시처럼 정렬 없는 해시 함수를 등록한 `QueryClient`에서 키 순서만 다른 객체를 `exact: true`로는 찾지 못하지만, prefix 매칭으로는 찾는다.

그래서 해시로 같은 키가 필터에서도 같다는 보장은 없다. `['user', undefined]`로 만든 쿼리는 `['user', null]` 필터의 prefix 매칭에 걸리지 않고, `NaN`이 든 키는 자기 자신으로도 매칭되지 않는다. 반대로 `Date`나 `Map`을 필터에 넣으면 열거할 속성이 없어서 같은 자리의 어떤 `Date`나 객체와도 매칭된다.


## 마무리

정리하면, TanStack Query는 queryKey 배열의 참조를 비교하지 않는다. `hashKey`가 plain object의 키를 정렬하며 `JSON.stringify`로 만든 문자열(`queryHash`)을 `Map`의 키로 쓴다. 그래서 객체의 키 순서는 캐시에 영향을 주지 않고, 배열의 요소 순서는 영향을 주며, 값이 `undefined`인 속성은 해시에서 없는 것과 같다. JSON이 표현하지 못하는 값은 대부분 에러 없이 다른 값으로 바뀌어, 서로 다른 키가 조용히 같은 키가 된다. `queryKeyHashFn`으로 해시 함수를 바꿀 수는 있지만 키 정렬까지 함께 버리게 되므로, 키를 만드는 시점에 직렬화 가능한 값으로 바꿔 넣는 편이 안전하다. 무효화 같은 필터는 기본적으로 해시를 거치지 않고 queryKey의 구조를 앞에서부터 맞춰 보므로, 해시에서 같은 키가 필터에서도 같다고 기대하지 않는 편이 좋다. 결국 캐시 조회는 `hashKey`로 키의 내용을 비교하고 필터는 키의 앞부분을 비교하므로, queryKey에는 직렬화해도 뜻이 바뀌지 않는 단순한 값만 넣으면 두 비교가 모두 예상대로 동작한다.

이 판단 기준이 queryKey를 어떻게 작성하고 관리할지로 이어지는 이야기, 즉 인라인 배열에서 query key factory를 거쳐 `queryOptions`까지 오게 된 흐름은 [queryKey](/260104)에서 다룬다.

이 글을 읽는 독자 분들도 다음에 queryKey에 객체나 `Map`을 넣을 때, 그 값이 어떤 문자열로 직렬화될지 한 번쯤 떠올려 보시길 바란다.


## 참고 자료

:::ref
- [docs] [TanStack Query, Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
- [docs] [TanStack Query, QueryClient](https://tanstack.com/query/latest/docs/framework/react/reference/classes/QueryClient)
:::
