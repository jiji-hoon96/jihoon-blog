---
title: 'as const 한 줄로 만드는 타입 안정성'
date: '2025-06-20'
categories: 프론트엔드 TypeScript
---

프론트엔드 실무에서 `as const`를 단순히 타입 추론을 돕는 보조 수단이 아니라, **불변성 선언과 동시에 타입의 리터럴화를 통해 안정성과 자동완성을 극대화**할 수 있는 툴로 유용하게 사용하고 있다.

이번 글에서는 실무에서 `as const`의 활용 사례를 중심으로 활용과 원리까지 깊이 있게 다뤄보려 한다.

---

## as const

`as const`는 TypeScript에서 **값을 리터럴 타입으로 고정(literal narrowing)** 하기 위한 단언문이다.

```ts
const button = "primary";         // 타입: string
const button = "primary" as const; // 타입: "primary"
```

배열이나 객체에 쓰면 해당 구조를 읽기 전용(readonly)으로 만들면서 각 요소의 타입을 리터럴로 고정한다.

```ts
const status = ["idle", "loading"] as const;
// 타입: readonly ["idle", "loading"]
```

이처럼 **값을 변경 불가능한 상수로 명시**하고, 타입도 좁게 고정되도록 만드는 것이 핵심이다.

---

### TanStack Query – query key 안정성 확보

```ts
const queryKey = ["user", userId] as const;
useQuery({ queryKey, queryFn });
```

여기서 `as const`를 쓰지 않으면 queryKey는 `(string | number)[]`로 추론되어 타입 안정성이 떨어진다.

반면 `as const`를 쓰면 queryKey가 정확히 `readonly ["user", string]`이 되어, **query key가 고정된 식별자로 취급**되고, 캐싱/비교/인밸리데이션에서도 더 안정적으로 작동한다.

---

### React Router – 라우팅과 같은 객체 구조의 키값 고정

```ts
const router = createBrowserRouter([
  { path: "/home", element: <HomePage /> },
  { path: "/about", element: <AboutPage /> }
] as const);
```

React Router는 내부적으로 라우트 배열을 순회하면서 타입을 추론하려고 하기 때문에, `as const`로 선언해주면 각 path의 리터럴 값(`"/home"`, `"/about"`)을 정확히 추론할 수 있다.

이를 통해 **라우트 기반 자동완성, 타입 기반 네비게이션 제어**가 가능해진다.

---

## `as const`를 쓰지 않아야 할 때

무조건 좁은 타입이 좋은 건 아니다. 다음과 같은 경우는 오히려 `as const`를 쓰지 않는 것이 낫다.

```ts
let status = "idle" as const;
```

이렇게 하면 `status`는 절대 다른 문자열을 가질 수 없기 때문에, 동적으로 상태를 변경해야 하는 경우엔 적절치 않다.

--- 

```ts
function update(type: "create" | "delete") {}
update("create" as const); // 불필요
```

함수 시그니처가 리터럴 타입을 받는 경우, 이미 문자열 리터럴을 넣으면 타입이 자동으로 좁혀진다. 명시적 `as const`는 오히려 코드만 장황해질 수 있다.

---

## 내부 동작 원리 – const assertion의 타입화

TypeScript에서 `as const`는 해당 값은 **readonly**로 간주되고, 가능한 한 좁은 타입으로 **리터럴 추론**을 한다.

```ts
const obj = { a: 1, b: "x" } as const;
// 타입: { readonly a: 1; readonly b: "x"; }
```

이는 일종의 **const assertion**으로, 값 자체는 JS에서 변하지 않지만 타입도 함께 고정시키는 것이 특징이다.

배열, 객체, 튜플 등에 모두 적용 가능하며, **유형 안정성(type safety)을 명시적으로 선언하는 수단**이다.

---

### 기술적으로 조금 더 깊게 들어가면

TypeScript는 `as const`를 만나면 해당 값 전체를 readonly로 처리하며, 내부 속성 하나하나를 리터럴 타입으로 고정한다.

이는 내부적으로 `const T: { readonly a: 1, readonly b: "x" }` 같은 형태로 변환된다.

제네릭 함수에서 `as const`된 인자를 넘기면, 추론된 타입이 정확한 리터럴 형태로 유지되기 때문에 타입 제한, 자동완성, 추론 정확도가 크게 향상된다.

특히 readonly 튜플로 바뀐다는 점에서, 배열 기반 추론(예: query key 등)에 매우 큰 이점을 준다.

```ts
const key = ["user", 1] as const;
type Key = typeof key; // readonly ["user", 1]
```

만약 `as const` 없이 선언했다면 `Key`는 `(string | number)[]`이 되었을 것이고, 타입 정합성은 깨졌을 것이다.

---

## `enum`과 비슷하지만 다르다.

`as const`와 `enum`은 모두 **값 집합을 고정시키는** 용도로 사용되지만, 아래와 같은 차이가 있다.

---

| 항목           | `as const`  | `enum`        |
| ------------ | ----------- | ------------- |
| 런타임 존재 여부    | 값 그 자체      | 객체 생성됨        |
| 타입 유추 방식     | 리터럴 타입으로 추론 | 명시적 타입 선언 필요  |
| Tree-shaking | 가능          | 어려움           |
| JS 출력 코드     | 없음          | 존재 (실제 객체 생성) |


```ts
type Mode = (typeof MODES)[number];

const MODES = ["light", "dark"] as const;

enum ModeEnum {
  Light = "light",
  Dark = "dark"
}
```

대부분의 경우 **불필요한 런타임 비용 없이 타입만 고정하고 싶을 때는 `as const`가 더 효율적**이다.



```toc
```