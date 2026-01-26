---
emoji: 🧑🏻‍🏫
title: '비전공 프론트엔드 2년차 개발자 멘티 일지: 8주차 - 진짜!! 너무 바쁘다~!'
date: '2024-06-25'
categories: 멘토링 자바스크립트
---

<br>

![1.jpeg](1.jpeg)

동아리, 회사, 스터디 등등 많이 바쁘다.. 멘토링 끝나고 블로그에 회고 작성하려는 큰 포부를 가졌지만.. 요즈음 과제가 어려워서? 시간이 빠듯해서 잘 못했다ㅠㅠ

그렇기에 오랜만에 회고를 작성해보고 복습해보자!

<br>

### 타입스크립트는 어떻게 컴파일할까?

우선 타입스크립트는 TSC 컴파일러를 통해 바로 컴파일되는 것이 아닌 자바스크립트 코드로 변환된다. 이 과정에서 고수준 언어인 타입스크립트가 저수준 언어인 자바스크립트로 변환되어 트랜스파일이라고 부르기도 한다. 상세한 과정은 아래와 같다.

- 타입스크립트 소스코드를 타입스크립트 AST로 만들고, 타입 검사기가 AST를 확인하여 타입을 확인한다. (TSC)
- 타입스크립트 AST를 자바스크립트 소스로 변환한다. (TSC)
- 자바스크립트 소스코드를 자바스크립트 AST로 만든다. (런타임)
- AST가 바이트 코드로 변환되고 런타임에 바이트 코드가 평가되어 프로그램이 실행된다. (런타임)

<br>

#### 타입스크립트 컴파일러의 구성 요소와 동작 방식

Scanner => Parser => Binder => Checker => Emitter 단계를 거쳐 타입 검사와 JS 소스 변환을 진행한다.

**스캐너**는 소스코드를 작은 단위로 나누어 의미 있는 토큰으로 변환하는 작업을 수행한다.

그리고 **스캐너**가 소스 파일을 토큰으로 나눠주면, **파서**는 그 토큰을 활용해 AST를 생성한다.

**체커**(checker) 단계에서 타입 검사를 할 수 있도록 **바인더**(Binder)에서 기반을 마련하고, **체커** 단계에서 **파서**가 생성한 AST와 **바인더**가 생성한 심볼을 활용하여 타입 검사를 수행한다.

그리고 **이미터** 단계에서 TS 소스를 자바스크립트(js) 파일과 타입 선언 파일(d.ts)로 생성한다.

<br>

### 타입스크립트의 타입 추론 과정과 원리

타입스크립트에서 타입 추론은 명시적인 타입 선언 없이도 변수나 표현식의 타입을 자동으로 결정하는 기능이다. 그럼 타입 추론이 어떻게 작동하는지 알아보자.

**1. 초기화 기반 추론**: 변수가 초기화될 때, 초기화 값에 따라 변수의 타입이 결정된다. ex) `let x = 3;`에서 `x는 number`로 추론된다.

**2. 최적 공통 타입 (Best Common Type)**: 여러 표현식에서 타입을 추론할 때 각 표현식의 타입을 고려하여 가장 적합한 공통 타입을 선택한다. ex) `let x = [0, 1, null];`에서 x의 타입은 `(number | null)[]`로 추론된다. 배열이나 객체에서 공통의 상위 타입이 명확하지 않은 경우에는 유니언 타입으로 추론될 수 있다.

**3. 문맥상 타이핑 (Contextual Typing)**: 표현식의 위치에 따라 그 타입이 추론되는 경우다. ex) ₩window.onmousedown₩ 함수에서는 마우스 이벤트의 타입을 `MouseEvent`로 추론하고, 이를 통해 `mouseEvent` 객체 내 속성들의 접근을 제어한다.

**4. 함수와 메소드의 반환 타입 추론**: 함수 내에서 반환되는 값의 타입을 기반으로 함수의 반환 타입을 추론하는 방법이다. ex) `function createZoo(): Animal[] { return [new Rhino(), new Elephant(), new Snake()]; }`에서 반환 타입은`Animal[]`로 추론된다.

<br>

### 타입 추론 최대화를 위한 전략

props를 전달하거나, 복잡한 로직 등등에서 타입 추론을 사용하다 보면 예상과 다르게 추론이 되거나, 안되는 경우들이 있다. 이런 경우를 방지하기 위해서 어떻게 코드를 작성하면 타입 추론을 효율적으로 사용할 수 있을지도 알아보자.

#### 명시적 타입 정의

인터페이스나 타입을 사용하여 props나 함수의 반환 타입 등을 명시적으로 정의하는 방법으로 타입스크립트 컴파일러에게 알려주는 것이다.

```typescript
interface UserProps {
  name: string;
  age: number;
}

function greet(user: UserProps) {
  return `Hello, ${user.name}!`;
}
```

#### 제네릭 사용

특히 컴포넌트나 함수가 다양한 타입을 처리해야 할 때, 제네릭을 사용하면 각 상황에 맞는 타입 추론을 할 수 있다. 또한 제네릭을 사용하면 사용 시점에 타입을 결정하기 때문에 유연성이 높고 타입 안전성을 보장할 수 있다.

```typescript
function merge<T, U>(a: T, b: U): T & U {
  return { ...a, ...b };
}

const result = merge({ name: 'John' }, { age: 30 });
// result는 { name: string; age: number; } 타입으로 추론
```

#### 기본값과 구조 분해 사용

함수의 매개변수나 컴포넌트의 props에 기본값을 제공하면, 타입스크립트는 이 정보를 사용하여 타입을 추론할 수 있다. 구조 분해 할당을 사용할 때도 마찬가지로 타입 정보를 제공하면 도움이 된다.

```typescript
interface Props {
  name?: string;
  age?: number;
}

function setup({ name = 'Unknown', age = 0 }: Props) {
  // 함수 내에서 name과 age의 타입이 string과 number로 추론
}
```

#### 조건부 타입 사용

복잡한 로직에 따라 타입이 결정되어야 하는 경우, 조건부 타입을 사용하여 타입 추론을 개선할 수 있다.

```typescript
type LoadingState<T> = T extends undefined ? 'loading' : T;

function fetchData<T>(data: T): LoadingState<T> {
  return data !== undefined ? data : 'loading';
}
```

#### 타입 단언 사용

타입스크립트의 타입 추론이 기대한 대로 작동하지 않을 수 있는 경우 타입 단언(type assertion)을 사용하여 컴파일러에게 명확한 타입 정보를 제공할 수 있다.

```typescript
const myCanvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
```

<br>

### 타입스크립트 object타입과 덕타이핑

타입스크립트에서 `object` 타입과 덕 타이핑(duck typing)은 객체의 구조에 기반하여 타입 체크를 수행하는 방식으로 사용된다. 어떤 연관성을 가지는지 찾아보자!

#### Object 타입

타입스크립트에서 `object`는 원시 타입(primitive type)이 아닌 값(함수, 배열, 객체 등)을 나타내는 타입이다. `object` 타입은 `Object` 자바스크립트 생성자 함수가 생성하는 인스턴스와 혼동하면 안된다.

```typescript
function logObject(obj: object) {
  console.log(obj);
}

logObject({ name: 'John' }); // 올바른 사용
logObject('Hello, world!'); // 에러: "Hello, world!"는 원시 타입이기 때문에 object 타입과 호환되지 않음
```

#### 덕 타이핑 (Duck Typing)

덕 타이핑은 "만약 어떤 새가 오리처럼 걷고, 오리처럼 소리를 낸다면, 그 새를 오리라고 부를 수 있다"는 개념에서 유래했다.

타입스크립트는 이 개념을 타입 시스템에 적용하여, 객체가 특정 인터페이스에 선언된 모든 속성과 메서드를 갖추고 있으면, 그 객체를 해당 인터페이스의 인스턴스로 간주한다. 이를 통해 타입의 명시적인 선언 없이도 타입 호환성을 판단할 수 있다.

```typescript
interface Duck {
  walk: () => void;
  quack: () => void;
}

function makeItQuack(duck: Duck) {
  duck.quack();
}

const myBird = {
  walk: () => console.log('Walking like a duck'),
  quack: () => console.log('Quacking like a duck'),
  swim: () => console.log('Swimming like a duck'),
};

makeItQuack(myBird); // 정상 작동: myBird가 Duck 인터페이스를 충족
```

위 예시에서 `myBird` 객체는 `Duck` 인터페이스에 명시적으로 구현되지 않았지만, `Duck` 인터페이스가 요구하는 `walk`와 `quack` 메서드를 가지고 있기 때문에 `Duck` 타입의 매개변수로 전달될 수 있다.

#### Object 타입과 덕 타이핑의 연관성

타입스크립트에서 `object` 타입을 사용할 때, 객체의 구체적인 구조를 지정하지 않고, 어떤 형태의 객체라도 받을 수 있다. 하지만 덕 타이핑을 사용하면, 객체가 특정 구조를 충족하는지를 기반으로 타입 호환성을 검사할 수 있다. 따라서 `object` 타입보다 더 세밀한 구조적 타이핑을 제공하려면 인터페이스나 타입 별칭을 사용하여 객체의 구조를 명확하게 정의하는 것이 좋다.

<br>

### 6월 넷째 주 회고

선택과 집중을 명확히 하자!

<br>

#### 이번 주 좋은 것과 나쁜 것

- 일이 많았습니다
  - 회사일
  - 토스 플랫폼 과제
  - 동아리 큰 행사 준비
  - 토스 자기소개서 작성
  - 이력서 수정
- 좋은 자료들을 찾아 react의 DOM 구조에 대해 공부할 수 있었습니다

#### 이번 주 진행했던 학습/개발 내용은??

- 과제를 단계별 계획을 세워 진행했습니다
- 사내에서 사용하는 utility 함수, constant, 자체 hooks 등을 verdaccio와 github에 자체적으로 버전관리 진행중입니다.
- 토스 행사를 위해 자기소개서 작성했습니다
- 이력서 수정했습니다.
- devops와 infra에서 필요한 개념들을 공부했습니다

#### 가장 고민했던 부분은 무엇이었나요?

- 과제를 어떤 단계로 공부해야 할지
- 공용함수 버전관리

#### 아쉬운 부분을 개선하는 데 필요한 것은 무엇인가요?

- 이번주 바쁠거라 생각해서 잠을 줄이고 일정을 소화했는데, 컨디션이 좋지 못합니다.

#### 다음 주는 어떻게 보낼 예정인가요?

- 6/27 커피챗하러 선릉역으로 떠납니다.
- 이력서 최종 수정
- 멘토링 과제

```toc

```
