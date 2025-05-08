---
emoji: 🫥
title: 'TypeScript infer 과 Tuple'
date: '2025-04-24'
categories: 프론트엔드 TypeScript
---

요즘 Type Challenge 를 통해 TypeScript를 공부하고있는데 빈번하게, infer, tuple 패턴이 자주 나왔다.

| ![1.png](1.png) | ![2.png](2.png) |
|:---:|:---:|

단순하게, infer, tuple 이 어떻게 사용되는지 뿐 아니라, 어떤 목적으로 만들어지고 사용되고 동작하는지 알아보도록 하자.

---

# 특정 타입을 찾는 infer

위 스크린샷을 살펴보며 infer 의 역할을 예상해보자.

infer'라는 단어 자체가 '추론하다'라는 의미를 가지고 있어, 프로그래머가 직접 무언가를 자동으로 알아내거나 추측하는 기능으로 오해할 수 있다. 또한 `let U = 추론된 값`과 같이 변수를 선언하는 키워드로 오해할 수도 
있다. 

그러나 실제로 infer는 변수 선언 키워드가 아니라, 조건부 타입 내에서만 사용되는 특수 키워드로, TypeScript 컴파일러가 타입을 자동으로 추론하도록 지시하는 역할을 한다. infer U는 '이 위치에서 타입 U를 추론하라'는 의미로, 프로그래머가 직접 값을 추론하는 것이 아니라 컴파일러에게 타입 추론을 위임하는 구문이다."

---

## 기본 개념

infer 키워드는 TypeScript의 조건부 타입(conditional types) 내에서만 사용할 수 있으며, 타입 매칭 과정에서 특정 위치의 타입을 타입 변수로 캡처하는 역할을 한다. 이는 복잡한 타입에서 특정 부분을 추출하여 재사용할 수 있게 해주는 강력한 타입 추론 메커니즘입니다.

```ts
type 결과타입<T> = T extends 패턴<infer U> ? U : 대체타입
```

위 구문에서 infer U는 패턴 매칭 과정에서 U라는 타입 변수를 선언하고, 그 위치에 해당하는 실제 타입을 캡처하겠다는 의미다.

---

## TypeScript 컴파일러 내부에서의 infer 처리 과정

TypeScript 컴파일러 내부에서 infer 키워드는 아래와 같은 상세한 프로세스로 처리된다.

이 내용들은 [Typescript Github](https://raw.githubusercontent.com/microsoft/TypeScript/refs/heads/main/src/compiler/checker.ts)를 참고하여 작성되었다. 코드가 대량이니 찾아보실 분은 `src/compiler/checker.ts`를 찾아보시면 좋을 것 같다.

---


### 1. 조건부 타입 분석 및 초기화

컴파일러는 조건부 타입을 분석하여 검사 타입(T), 확장 타입 패턴(extends 뒤의 타입), 그리고 true/false 결과 타입을 식별한다. 

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

위 코드를 살펴보자. 

checkType은 조건부 타입의 검사 타입, extendsType은 확장 타입 패턴, trueType은 true 결과 타입, falseType은 false 결과 타입을 나타낸다.

inferTypeVariables는 extendsType에서 infer 키워드가 포함된 타입 변수들을 찾고, typeVarEnvironment는 타입 변수 환경을 생성한다.

resolveConditionalType은 조건부 타입을 해석하는 함수로, 타입 체커를 통해 패턴 매칭 알고리즘을 실행한다.

---

### 2. 타입 패턴 매칭 및 추론 수행

컴파일러는 검사 타입(T)이 확장 타입 패턴과 일치하는지 확인한다. 이 과정에서 infer 키워드가 위치한 부분에 대응하는 실제 타입을 캡처하여 타입 변수 환경에 저장한다.

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

### 3. 통합된 타입 추론 프로세스

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

직접 매칭을 검사하고, 패턴이 infer 타입 변수인 경우 타입을 캡처한다.

그리고 구조적 타입에 대한 재귀적 매칭을 수행하고 이어 기타 타입 형태에 대한 매칭을 차례대로 진행한다. 마지막으로 앞의 매칭들을 충족하지 못하면 매칭 실패인 `false`를 리턴한다.

---

### 너무 어렵다. 각 단계를 실제 예시로 흐름을 살펴보자.

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

이로 인해 true 분기 결과 반환: R = string

그리고 이로 인해 `ReturnType<typeof greet>` 평가 결과 string으로 결정된다. 만약 매칭이 실패해서 false 분기로 이어지면 never로 결정된다.

--- 

## 컴파일 타임에서의 역할

컴파일 타임에 기존 타입 시스템만으로는 어려운 타입 추론을 가능하게 한다. 그리고 타입 분해(함수, 튜플, 객체 등에서 특정 부분으로 추출)와 타입 변환 및 매핑을 가능하게 한다.

컴파일러는 infer 구문을 만나면 타입 체커를 통해 패턴 매칭 알고리즘을 실행하고, 타입 변수에 적절한 값을 바인딩하여 최종 타입을 결정한다. 이 과정은 런타임에는 완전히 제거되며, 오직 타입 검사 과정에서만 의미를 가진다.

---

## 활용해보기


### 함수 반환 타입 추출

```ts
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;

// 사용 예
function fetchData(): Promise<string> { 
  return Promise.resolve("data");
}

type FetchResult = ReturnType<typeof fetchData>; // Promise<string>
```

---

### 함수 매개변수 타입 추출

```ts
type FirstParameter<T> = T extends (first: infer U, ...args: any[]) => any ? U : never;

// 사용 예
function handleEvent(id: number, event: Event): void {
  // 구현부
}

type IdType = FirstParameter<typeof handleEvent>; // number
```

---

### 조건부 타입 내 여러 infer을 사용

```ts
type Unpacked<T> = 
  T extends (infer U)[] ? U :
  T extends (...args: any[]) => infer U ? U :
  T extends Promise<infer U> ? U :
  T;

// 사용 예
type T1 = Unpacked<string[]>;           // string
type T2 = Unpacked<() => number>;       // number
type T3 = Unpacked<Promise<boolean>>;   // boolean
type T4 = Unpacked<string>;             // string
```

```toc

```