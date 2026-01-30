---
title: 'TS infer 에 대해서 깊이 탐구해보자'
date: '2025-04-24'
categories: 프론트엔드 TypeScript
---

요즘 Type Challenge 를 통해 TypeScript를 공부하고있는데 빈번하게, infer 을 자주 다루게 되었다.

 ![1.png](/content/250424/1.png)

단순하게, infer 가 어떻게 사용되는지 뿐 아니라, 어떤 목적으로 만들어지고 사용되고 동작하는지 알아보도록 하자.

---

# 특정 타입을 찾는 infer

```ts
type ElementType<T> = T extends (infer U)[] ? U : never;
```

위 예시 코드를 보고, infer의 역할을 추론해보자.

infer라는 단어 자체가 '추론하다'라는 의미를 가지고 있어, 프로그래머 입장에서는 타입스크립트에서 자동으로 무언가를 추론하거나, let U = 추론된 값과 같이 변수를 선언하는 키워드로 오해할 수도 있다.

하지만 실제로 infer는 변수 선언 키워드가 아니라, 조건부 타입 내부에서만 사용되는 특수한 키워드로, TypeScript 컴파일러에게 '이 위치에서 타입을 추론하라'고 지시하는 역할을 한다.

즉, 프로그래머가 직접 값을 추론하는 것이 아니라, 컴파일러가 해당 위치의 타입을 자동으로 추론하도록 위임하는 구문이다.

---

## What is Infer?

infer 키워드는 TypeScript의 조건부 타입(conditional types) 내에서만 사용할 수 있으며, 타입 매칭 과정에서 특정 위치의 타입을 타입 변수로 캡처하는 역할을 한다.

이는 복잡한 타입에서 특정 부분을 추출하여 재사용할 수 있게 해주는 강력한 타입 추론 메커니즘이다.

앞서 본 예시 코드를 보기 쉽게 바꿔놓으면 아래와 같다. 

```ts
type 결과타입<T> = T extends 패턴<infer U> ? U : 대체타입
```

이것을 글로 쉽게 풀어보면, infer U는 패턴 매칭 과정에서 U라는 타입 변수를 선언하고, 그 위치에 해당하는 실제 타입을 캡처하겠다는 의미다.

---

## TypeScript 컴파일러 내부에서 어떻게 Infer 를 처리할까?

Infer는 컴파일러 내부에서 타입 추론을 위한 주요 역할은 다음과 같다.

- 타입 분해 (Type Decomposition) : 함수, 튜플, 객체 등 복합 타입에서 특정 부분을 추출하여, 중첩된 타입 구조에서 내부 타입 접근 용이하다.

- 패턴 매칭 기반 타입 추론 : 구조적 패턴을 기반으로 타입 변수에 값 바인딩하여, 선언적 방식으로 복잡한 타입 관계 표현 가능

- 타입 변환 및 매핑 : 기존 타입을 기반으로 새로운 타입 생성

컴파일러 내부 동작에 대한 내용들은 [Typescript Github](https://raw.githubusercontent.com/microsoft/TypeScript/refs/heads/main/src/compiler/checker.ts)를 참고하여 작성되었다. 코드의 양도 많고, 어렵지만 직접 코드를 보는 것이 가장 좋을 것 같다. 찾아보실 분은 `src/compiler/checker.ts`를 탐구해보면 된다.

너무 어려우면 그냥 넘어가고, 요약만 살펴봐도 좋다.


---

### 조건부 타입 분석 및 초기화

컴파일러는 우선 조건부 타입을 분석하여 검사 타입(T), 확장 타입 패턴(extends 뒤의 타입), 그리고 true/false 결과 타입을 식별한다. 

이 과정에서 infer 키워드가 포함된 타입 변수들을 찾아 타입 변수 환경(type variable environment)에 등록한다.

```ts
function processConditionalType(node: ConditionalTypeNode): Type {
  const checkType = getTypeFromTypeNode(node.checkType);
  const extendsType = getTypeFromTypeNode(node.extendsType);
  const trueType = getTypeFromTypeNode(node.trueType);
  const falseType = getTypeFromTypeNode(node.falseType);
  
  const inferTypeVariables = findInferTypeVariables(node.extendsType);
  const typeVarEnvironment = createTypeVarEnvironment(inferTypeVariables);
  
  return resolveConditionalType(
    checkType, 
    extendsType, 
    trueType, 
    falseType, 
    typeVarEnvironment
  );
}
```

checkType은 조건부 타입의 검사 타입, extendsType은 확장 타입 패턴, trueType은 true 결과 타입, falseType은 false 결과 타입을 나타낸다.

`inferTypeVariables`는 extendsType에서 infer 키워드가 포함된 타입 변수들을 찾고, `typeVarEnvironment`는 타입 변수 환경을 생성한다.

`resolveConditionalType`은 조건부 타입을 해석하는 함수로, 타입 체커를 통해 패턴 매칭 알고리즘을 실행한다.

---

### 타입 패턴 매칭 및 추론 수행

이어 컴파일러는 검사 타입(T)이 확장 타입 패턴과 일치하는지 확인한다. 이 과정에서 infer 키워드가 위치한 부분에 대응하는 실제 타입을 캡처하여 타입 변수 환경에 저장한다.

```ts
function resolveConditionalType(
  checkType: Type,
  extendsType: Type,
  trueType: Type,
  falseType: Type,
  typeVarEnv: TypeVarEnvironment
): Type {
  if (isUnionType(checkType)) {
    return distributeOverUnion(
      checkType,
      type => resolveConditionalType(type, extendsType, trueType, falseType, typeVarEnv.clone())
    );
  }
  
  const isMatch = matchTypeWithPattern(checkType, extendsType, typeVarEnv);
  
  const constraintsValid = validateTypeConstraints(typeVarEnv);
  
  if (isMatch && constraintsValid) {
    return substituteInferredTypes(trueType, typeVarEnv);
  } else {
    return falseType;
  }
}
```

위 코드로 패턴 매칭 및 타입 추론 프로세스를 살펴보자.

`isUnionType` 을 활용해 검사 타입이 유니온 타입인지 확인하고, `distributeOverUnion`을 활용해 유니온 타입을 분산 처리하여 각 타입에 대해 조건부 타입을 재평가하고, 리턴한다.

`matchTypeWithPattern`은 검사 타입이 확장 타입 패턴과 일치하는지 확인하고, `validateTypeConstraints`은 타입 제약 조건을 검사한다.

`isMatch`와 `constraintsValid`이 true라면 `substituteInferredTypes`은 추론된 타입 변수를 적용하여 결과 타입을 결정하고, 그렇지 않다면 `falseType`을 리턴해 대체 타입을 변환한다.

---

### 통합된 타입 추론 프로세스

실제 매칭과 추론 과정에서 컴파일러는 타입 구조를 재귀적으로 분석하며, 다양한 타입 형태(객체, 배열, 함수 등)에 대한 패턴 매칭을 수행한다.

```ts
function matchTypeWithPattern(
  source: Type,
  pattern: Type,
  typeVarEnv: TypeVarEnvironment
): boolean {
  if (source === pattern) {
    return true;
  }
  
  if (isInferTypeVar(pattern)) {
    const inferVar = getInferTypeVar(pattern);
    const constraints = getTypeConstraints(inferVar);
    
    if (!constraints || isTypeAssignableTo(source, constraints)) {
      typeVarEnv.addInference(inferVar, source);
      return true;
    }
    return false;
  }
  
  if (isObjectType(pattern) && isObjectType(source)) {
    return matchObjectTypes(source, pattern, typeVarEnv);
  }
  
  if (isArrayType(pattern)) {
    return matchArrayTypes(source, pattern, typeVarEnv);
  }
  
  if (isFunctionType(pattern)) {
    return matchFunctionTypes(source, pattern, typeVarEnv);
  }
  
  // 기타 타입 형태에 대한 매칭
  // ...
  
  return false;
}
```

이 과정에서 직접 매칭을 검사하고, 패턴이 infer 타입 변수인 경우 타입을 캡처한다.

그리고 구조적 타입에 대한 재귀적 매칭을 수행하고 이어 기타 타입 형태에 대한 매칭을 차례대로 진행한다. 마지막으로 앞의 매칭들을 충족하지 못하면 매칭 실패인 `false`를 리턴한다.

---

## 너무 어렵다. 각 단계를 실제 예시로 흐름을 살펴보자.

```ts
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

function greet(name: string): string {
  return `Hello, ${name}!`;
}

type GreetReturn = ReturnType<typeof greet>;
```

`ReturnType<typeof greet>` 평가를 시작한다.

여기서 조건부 타입 분석을 통해 검사 타입은 `typeof greet` 이 되고, 패턴은 `(...args: any[]) => infer R` 이 되는데 infer R 은 아직 추론되지 않음을 의미한다.

곧 이어 패턴 매칭 수행을 통해 `typeof greet`는 함수 타입이므로 패턴과 구조적 매칭 시도하고 함수 타입 매칭 중 반환 타입 위치에서 infer R을 만나 실제 반환 타입 string을 R에 캡처한다.

이로 인해 true 분기 결과 반환으로 `ReturnType<typeof greet>` 평가 결과는 string으로 결정된다. 만약 매칭이 실패해서 false 분기로 이어지면 never로 결정된다.

--- 



---

## 여러 상황에서 Infer 을 다뤄보자

infer는 앞서 살펴본 컴파일러 내부 동작처럼 다양한 분기로 처리된다.

이 모든 분기 상황을 하나하나 다루기에는 너무 복잡하므로, 아래에서는 대표적인 상황별 예시 코드를 통해 infer의 활용법을 살펴보려 한다.

---

### 함수 반환 타입 추출

```ts
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;

function fetchData(): Promise<string> { 
  return Promise.resolve("data");
}

type FetchResult = ReturnType<typeof fetchData>; // Promise<string>
``` 

이 예시에서 ReturnType 유틸리티 타입은 함수 타입의 반환 타입을 추출한다.

T가 함수 타입인 경우, 패턴 `(...args: any[]) => infer R`에 매칭되고, 매칭된 infer R은 함수의 반환 타입 위치에서 실제 타입을 추론하여 캡처한다.

결과적으로 R(추론된 반환 타입)이 반환된다.

---

### 함수 매개변수 타입 추출

```ts
type FirstParameter<T> = T extends (first: infer U, ...args: any[]) => any ? U : never;

function handleEvent(id: number, event: Event): void {
  // 구현부
}

type IdType = FirstParameter<typeof handleEvent>; // number
```

이 예시에서 FirstParameter 유틸리티 타입은 함수의 첫 번째 매개변수 타입을 추출한다.

T가 함수 타입인 경우, 패턴 `first: infer U, ...args: any[]) => any`에 매칭되고, 매칭된 infer U는 첫 번째 매개변수 타입 위치에서 실제 타입을 추론하여 캡처한다.

결과적으로 U(추론된 첫 번째 매개변수 타입)이 반환된다.

---

### 조건부 타입 내 여러 infer을 사용

```ts
type Unpacked<T> = 
  T extends (infer U)[] ? U :
  T extends (...args: any[]) => infer U ? U :
  T extends Promise<infer U> ? U :
  T;

type T1 = Unpacked<string[]>;          // string
type T2 = Unpacked<() => number>;       // number
type T3 = Unpacked<Promise<boolean>>;   // boolean
type T4 = Unpacked<string>;             // string
```

이 예시에서 Unpacked 유틸리티 타입은 다양한 형태의 래퍼 타입에서 내부 타입을 추출한다.

- T가 배열 타입인 경우, 패턴 `infer U[]`에 매칭되어 배열 요소 타입 U를 추출한다.
- T가 함수 타입인 경우, 패턴 `(...args: any[]) => infer U`에 매칭되어 반환 타입 U를 추출한다.
- T가 Promise 타입인 경우, 패턴 `Promise<infer U>`에 매칭되어 Promise 결과 타입 U를 추출한다.
- 위 패턴에 매칭되지 않는 경우, 원본 타입 T를 그대로 반환한다.

---

### 객체 속성 타입 추출

```ts
type PropertyType<T, K extends keyof T> = T extends { [P in K]: infer U } ? U : never;

interface User {
  id: number;
  name: string;
  settings: { theme: 'light' | 'dark' };
}

type ThemeType = PropertyType<User['settings'], 'theme'>; // 'light' | 'dark'

```

T가 K 키를 가진 객체 타입인 경우, 해당 속성의 타입 U를 추론한다. 여기서 중첩된 객체 속성도 접근 연산자(.)를 통해 추출할 수 있다.

---

### 튜틀 요소 타입 추출

```ts
type FirstElement<T extends any[]> = T extends [infer U, ...any[]] ? U : never;
type LastElement<T extends any[]> = T extends [...any[], infer U] ? U : never;

type Tuple = [string, number, boolean];
type First = FirstElement<Tuple>; // string
type Last = LastElement<Tuple>;   // boolean


```

이 예시에서는 튜플의 첫 번째와 마지막 요소 타입을 추출하게 된다.

- FirstElement는 패턴 `[infer U, ...any[]]`를 사용하여 첫 번째 요소 타입을 추출한다.
- LastElement는 패턴 `[...any[], infer U]`를 사용하여 마지막 요소 타입을 추출한다.

---

### 유니온 타입 처리

```ts
type ExtractNumberFromUnion<T> = T extends infer U
  ? U extends number ? U : never
  : never;

type Union = string | number | boolean;
type Numbers = ExtractNumberFromUnion<Union>; // number
```

분산적 조건부 타입의 특성을 활용하여 유니온 타입의 각 멤버에 대해 개별적으로 적용된다.

- 첫 번째 조건부 타입`(T extends infer U)`은 항상 참이지만, 유니온 타입의 각 멤버를 개별적으로 U에 바인딩한다.
- 두 번째 조건부 타입`(U extends number)`은 U가 number인 경우에만 해당 타입을 유지한다.

---

## 마무리

TypeScript의 infer 키워드는 처음 접했을 때 다소 난해하게 느껴질 수 있지만, 복잡한 타입 시스템을 다룰 때 강력한 도구가 된다고 생각한다. 특히 Type Challenge와 같은 타입 구현을 할 때 Infer 에 대한 개념을 확실하게 알고 있어야한다.

infer는 단순히 타입을 추론하는 것을 넘어, 타입 레벨 프로그래밍의 핵심 구성 요소로서 다음과 같은 이점을 제공한다.

- 코드 재사용성 향상: 복잡한 타입 구조에서 필요한 부분만 추출하여 재사용
- 타입 안전성 강화: 런타임 에러 대신 컴파일 타임에 타입 관련 문제를 포착
- 표현력 증가: 복잡한 타입 관계를 더 명확하고 간결하게 표현

일상적인 개발에서는 ReturnType, Parameters 같은 내장 유틸리티 타입을 통해 간접적으로 infer의 혜택을 누리게 되지만, 더 복잡한 타입 문제에 직면했을 때 직접 infer를 활용하는 능력이 필요할 것 같다.

타입 챌린지를 계속 풀어나가며 infer와 TypeScript의 타입 시스템에 더 깊이 익숙해지다 보면, 이전에는 불가능하다고 생각했던 타입 레벨의 문제들도 해결할 수 있을 것 같다.

지치지말고 계속해서 풀어보자.


```toc

```