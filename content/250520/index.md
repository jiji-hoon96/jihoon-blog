---
title: 'React Fiber 완전 정복'
date: '2025-05-20'
categories: 프론트엔드 React
---

React를 최근에 접한 개발자라면 대부분 한 번쯤은 "Fiber"라는 용어를 들어봤을 것이다. 실제로 면접에서 자주 등장하는 주제이기 때문에, 작업 단위를 나누어 처리한다는 식의 표면적인 설명은 익숙할 수 있다. 하지만 Fiber가 왜 도입되었는지, 이전에는 React가 어떤 방식으로 동작했는지, 그리고 Fiber가 어떻게 설계되어 있는지는 잘 모르는 경우가 많다.

이 글에서는 단순한 개념 설명을 넘어서, React Fiber의 내부 동작 방식과 구조가 어떻게 구현되어 있는지 시각 자료와 함께 깊이 있게 살펴보려 한다.

---

## 왜 Fiber가 등장헀을까?

React 15까지는 재귀 기반의 `Stack Reconciler`를 사용했는데, 이는 다음과 같은 한계를 가졌다.

- 렌더링 중 중단 불가 (모든 트리를 한 번에 렌더)
- 애니메이션, 제스처, 레이아웃 같은 실시간 작업 대응 어려움
- UI가 복잡해질수록 성능 병목 증가
- 에러 발생 시 전체 앱 중단

이에 React 팀은 작업을 쪼개고 우선순위를 조절할 수 있는 새로운 실행 모델을 고민했고, 그렇게 탄생한 것이 React Fiber다. react-fiber-architecture 은 Andrew Clark이 제안한 개념으로, [문서](https://github.com/acdlite/react-fiber-architecture)를 참고할 수 있다.

~~이 글을 작성하고 얼마 안되어, React 팀에 합류한것으로 보인다. 그 이후 React 는 엄청난 발전을..~~

--- 

### Stack vs Fiber: 코드로 이해하는 차이점

아래는 동일한 컴포넌트를 렌더링할 때, Stack과 Fiber가 어떻게 서로 다른 구조로 렌더링하는지를 코드 수준에서 비교한 것이다.

```jsx
function renderComponent(component) {
  const element = component.render();
  element.props.children.forEach(child => renderComponent(child)); // 재귀 호출
}
```

Stack 방식은 이렇게 렌더링한다. 이 방식은 간단하지만, 렌더링이 깊어지면 브라우저의 메인 스레드를 한 번에 오래 점유하게 되어 UI가 멈춘다. 동작을 살펴보기 위해 아래 동영상을 살펴보자


<video width="640" height="480" controls>
  <source src="/content/250520/stack.mov" type="video/mp4">
</video>

---

Fiber 방식은 작업을 작게 쪼개고 requestIdleCallback으로 나눠 실행하므로, 렌더링 중에도 사용자 이벤트(버튼 클릭 등)를 차단하지 않는다.

```jsx
function performWork(deadline) {
  while (nextUnitOfWork && deadline.timeRemaining() > 5) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
  }
  requestIdleCallback(performWork); // 나눠서 실행
}
```

<video width="640" height="480" controls>
  <source src="/content/250520/fiber.mov" type="video/mp4">
</video>

---

만약 동작을 비교해보고싶으면 **<a href="https://animated-lollipop-2b6cbb.netlify.app/" target="_blank" rel="noopener noreferrer">여기를</a>** 클릭하면 된다. 그러면 직접 Fiber Reconciler 와 Stack Reconciler의 동작을 볼 수 있다.

---

# Fiber

Fiber는 React의 렌더링 자체를 구성하는 런타임 아키텍처다.  다음과 같은 특징을 가진다

- **작업 단위**로 분리
- **우선순위 기반 스케줄링** 가능
- **렌더링 도중 작업 일시 중단/재개** 지원

Fiber는 **current(현재 화면을 구성 중인 트리)** 와 **workInProgress(다음 렌더링을 준비 중인 트리)** 두 트리 구조를 유지한다. 이 두 트리는 alternate 속성으로 서로 연결되어, 작업 완료 시 교체된다.

```ts
currentFiber.alternate === workInProgressFiber;
```

Fiber는 JavaScript 객체이며, 각 React Element는 해당 객체로 변환된다.

그렇다면, Fiber 노드는 내부적으로 어떤 구조를 가지고 있을까?
단순하게 생각해보면 "노드"라는 개념에서 떠올릴 수 있는 기본 속성들 예를 들어 노드의 타입, key, 자식 노드 등을 포함하고 있을 것이라 예상할 수 있다.

이제 실제로 Fiber 노드가 어떻게 구성되어 있는지 살펴보자.

---

## Fiber 구조

React Fiber 노드 구조에 관한 공식 문서를 찾아봤지만, React 팀은 Fiber의 내부 구현에 대한 공식 문서를 제공하지 않고 있다. 대신, **Andrew Clark(React 팀)이 작성한 ([공식 문서](https://github.com/acdlite/react-fiber-architecture))가** 주요 참고 자료로 널리 사용된다. 제공해준 자료를 활용해서 Fiber의 구조를 살펴보자

---

### type, key

`zacharydfreeman/react-fiber`의 `react-fiber.ts` 파일에서는 ReactElement 인터페이스를 통해 type과 key가 어떻게 정의되는지 볼 수 있다.

```ts
export interface ReactElement {
  type: string | Function; // type은 문자열(HTML 태그) 또는 함수(컴포넌트)
  props: {
    [key: string]: any;
    children: ReactElement[];
  };
  key: string | null;      // key는 문자열 또는 null
  ref: any;
  _owner: FiberNode | null;
}

export interface FiberNode {
  element: ReactElement; // FiberNode는 ReactElement를 포함하며, 이를 통해 type과 key에 접근
  parent: FiberNode | null;
  child: FiberNode | null;
  sibling: FiberNode | null;
  // ... 기타 필드
}
```

type 은 React가 이전 렌더링된 Fiber 노드와 새로 생성된 엘리먼트를 비교할 때 가장 먼저 type을 확인하기에 재조정 과정에서 매우 중요하다.

- 만약 이전에도 div였고 이번에도 div이거나, 이전에도 MyComponent였고 이번에도 MyComponent라면 React는 해당 Fiber 노드를 재사용하여 속성(props)만 업데이트하려고 시도
- 만약 이전에는 div였는데 이번에는 span으로 바뀌었거나, MyComponent에서 OtherComponent로 바뀌었다면 React는 기존 Fiber 노드를 버리고 새로운 type에 맞는 새 Fiber 노드를 생성

key는 주로 리스트(배열) 렌더링 시에 사용된다. 리스트의 아이템들이 변경, 추가, 삭제, 또는 재정렬될 때, key는 React가 각 아이템을 효율적으로 식별하고 최소한의 DOM 변경으로 업데이트할 수 있도록 돕는다.

key가 없으면 React는 리스트 아이템의 순서가 변경되었을 때 어떤 아이템이 어떤 아이템으로 이동했는지 정확히 알기 어렵다. 이로 인해 불필요하게 많은 DOM 조작이 발생하거나 컴포넌트의 내부 상태가 의도치 않게 유지/소실될 수 있다.






--- 

### 트리 구조 (child, sibling, return)

```js
function 부모() {
  return [<자식1/>, <자식2/>];
}
```

- child: 컴포넌트의 render 메서드가 반환한 첫 번째 자식 요소를 가리킨다. 위 예제에서는 `<자식1/>`이 해당된다.

- sibling: 동일한 부모를 가진 다음 형제 요소를 의미한다. 위 예제에서 `<자식1/>`의 sibling은 `<자식2/>`이다.

- return: 현재 Fiber 노드의 처리가 끝난 뒤 되돌아갈 부모 Fiber를 가리킨다. 위 예제에서 `<자식1/>`과 `<자식2/>`의 return은 모두 부모이다.

이 세 필드는 함께 단일 연결 리스트(Singly Linked List) 형태의 트리 구조를 형성한다. React는 이 구조를 기반으로 노드를 순회하며 렌더링 작업을 수행한다.

---

### pendingProps, memoizedProps

pendingProps는 해당 Fiber가 실행되기 시작할 시점에 전달된 새로운 props를 의미하며,
memoizedProps는 이전 렌더링에서 처리 완료된 이전 props를 나타낸다.

이 두 값이 동일하다면, React는 이전 렌더링 결과를 그대로 재사용할 수 있어, 불필요한 연산을 방지하고 성능을 최적화할 수 있다.

---

### 작업 우선순위 (pendingWorkPriority)

React Fiber는 각 작업 단위에 숫자 기반의 **우선순위(priority)를** 부여하여, 스케줄러가 어떤 작업을 먼저 처리할지 판단할 수 있도록 한다.
여기서 0(NoWork)을 제외하면, 숫자가 클수록 우선순위는 낮아지는 구조다.

기존의 React에서는 setState가 호출되면 전체 컴포넌트 트리가 즉시 재렌더링되어 브라우저의 메인 스레드를 블로킹하는 문제가 있었다.
하지만 Fiber가 도입된 이후, setState는 해당 Fiber 노드에 우선순위를 부여하는 방식으로 변경되었고, 스케줄러는 이 우선순위를 기반으로 다음에 처리할 작업을 선택하게 되었다.

이 구조 덕분에 React는 애니메이션, 제스처, 레이아웃 등 실시간 상호작용을 방해하지 않고 작업을 나눠 수행할 수 있게 되었고, 이후에는 더욱 정교한 lane 시스템으로 발전하여 작업 분배의 효율성과 유연성이 크게 향상되었다.

---

### Alternate

React Fiber의 alternate 시스템은 더블 버퍼링(Double Buffering) 개념을 구현한 것이다. 이는 비디오 게임에서 화면의 깜빡임을 방지하기 위해 사용하는 기법과 유사하다.

```js
function 위험한방식() {
  currentTree.updateDirectly(); // ❌ 위험!
}
```

만약 현재 트리를 직접 수정한다면, 깜빡이거나 불완전한 상태의 화면이 사용자에게 노출될 수 있다.

React는 이러한 문제를 방지하기 위해 현재 트리는 그대로 유지한 채, 새로운 작업용 트리(work-in-progress)에서 변경 작업을 수행한다. 모든 작업이 완료된 후에야 화면에 한 번에 반영되므로, 사용자 경험이 매끄럽게 유지된다.

이때 사용되는 것이 alternate 구조다.
각 Fiber는 자신과 쌍을 이루는 또 다른 Fiber를 참조하며, `currentFiber.alternate === workInProgressFiber` 와 같이 서로를 가리키는 이중 참조 구조를 가진다.

이 구조 덕분에 React는 기존 alternate Fiber 객체를 재사용하면서 메모리 효율성을 확보할 수 있다.
변경이 발생한 경우에는 해당 필드만 업데이트하여 렌더링하고, 그렇지 않으면 이전 결과를 그대로 활용하는 bailout(스킵) 최적화가 가능해진다.

---

### output

output은 실제 DOM에 적용될 수 있는 구체적인 DOM 노드 정보를 의미한다.

```jsx
// 첫번째 예시
function 아바타() {
  return <img src="profile.jpg" />; 
}
```

첫번째 예시는 React 엘리먼트를 반환하지만, 실제 DOM은 생성되지 않는다.


```jsx
// 두번째 예시
<img src="profile.jpg" />  
<div className="프로필" /> 
```

두번째 예시는 실제 각각 DOM Image 요소와 DOM Div 요소를 생성한다. 이제 더 자세하게 살펴보자.

```jsx
function 프로필() {
  return (
    <div className="프로필">
      <아바타 />
      <정보 />
    </div>
  );
}

function 아바타() {
  return <img src="profile.jpg" alt="프로필" />;
}

function 유저정보() {
  return (
    <div>
      <h2>홍길동</h2>
      <p>개발자</p>
    </div>
  );
}
```

프로필 컴포넌트는 아바타와 유저정보를 렌더링한다. 그리고 아래와 같이 Fiber 트리와 output 을 생성한다.

```
프로필 (출력: 없음, 컴포넌트 함수)
  │
  └─► div.프로필 (출력: <div class="프로필">...</div>)
       │
       ├─► 아바타 (출력: 없음, 컴포넌트 함수)
       │    │
       │    └─► img (출력: <img src="profile.jpg" alt="프로필">)
       │
       └─► 유저정보 (출력: 없음, 컴포넌트 함수)
            │
            └─► div (출력: <div>...</div>)
                 │
                 ├─► h2 (출력: <h2>홍길동</h2>)
                 │
                 └─► p (출력: <p>개발자</p>)
```

이제는 output 수집이 어떻게 되고 정보가 어떻게 전달되는지 살펴보자. 

처음 단계에서는 리프(호스트) 노드에서 output 이 생성된다.

여기서 호스트 컴포넌트에서만 출력이 생성되는데, 호스트 컴포넌트(div,span,img)만 브라우저가 이해할 수 있기 때문이고, 사용자 컴포넌트(프로필,아바타,유저정보)는 추상화된 개념이기때문에 브라우저가 몰라 다른 요소와 조합되거나 다른 요소로 변환된다.

```js
// 호스트 컴포넌트들이 실제 DOM 정보 생성
img_fiber.output = createDOMElement('img', {
  src: 'profile.jpg', 
  alt: '프로필'
});

h2_fiber.output = createDOMElement('h2', {}, '홍길동');
p_fiber.output = createDOMElement('p', {}, '개발자');
```

이제 부모로 부터 output 을 수집한다.

```js
// div 노드가 자식들의 출력을 수집
유저정보_div_fiber.output = createDOMElement('div', {}, [
  h2_fiber.output,  // <h2>홍길동</h2>
  p_fiber.output    // <p>개발자</p>
]);

// 최상위 div가 모든 자식 출력을 수집  
프로필_div_fiber.output = createDOMElement('div', {className: '프로필'}, [
  img_fiber.output,      // <img src="profile.jpg" alt="프로필">
  유저정보_div_fiber.output   // <div><h2>홍길동</h2><p>개발자</p></div>
]);
```

마지막으로 컴포넌트는 자식의 출력을 그대로 전달한다.

```js
// 사용자 정의 컴포넌트는 자식의 출력을 위로 전달
아바타_fiber.output = img_fiber.output;
유저정보_fiber.output = 유저정보_div_fiber.output;
프로필_fiber.output = 프로필_div_fiber.output;
```

---

## Fiber의 작동 흐름 (Render vs Commit)

Fiber는 내부적으로 Render Phase와 Commit Phase라는 두 단계의 과정을 거친다.

이 구조는 React가 UI 업데이트를 보다 유연하고 효율적으로 제어할 수 있도록 해준다. 각 단계는 서로 다른 목적과 특성을 가지며, 내부적으로는 다양한 함수와 스케줄링 로직을 통해 정교하게 작동한다.

- Render Phase에서는 어떤 변화가 필요한지를 계산하며, 이 과정은 비동기적으로 수행될 수 있다.

- Commit Phase에서는 계산된 변경 사항을 실제 DOM에 한 번에 적용하며, 이 단계는 동기적으로 실행된다.

이러한 단계적 처리 방식은 React가 사용자 상호작용, 애니메이션, 네트워크 지연 등 다양한 조건 속에서도 부드럽고 일관된 UI 경험을 제공할 수 있는 기반이 된다.

[![2.png](/content/250520/2.png)](https://storied-centaur-55230f.netlify.app/)

Fiber의 작동흐름을 확인하고 싶으면 위 이미지를 클릭해서 직접 확인해볼 수 있다.

--- 

### Render Phase (비동기 가능)

Render Phase는 UI에 어떤 변경이 필요한지 계산하는 단계로, DOM에는 실제로 아무런 영향을 주지 않는다. 이 단계는 비동기적으로 중단 및 재개가 가능하며, 주로 다음 두 함수 중심으로 동작한다

- **beginWork(fiber)**: 현재 Fiber 노드에서 필요한 계산을 수행한다.

  - 각 Fiber의 타입(Function Component, Class Component, Host Component 등)에 따라 적절한 로직을 실행

  - 자식 Fiber 노드를 생성하고 연결

  - props가 이전과 동일하다면 memoization을 활용해 스킵할 수 있음

- **completeWork(fiber)**: 자식 노드의 작업이 완료되면 부모 방향으로 올라가며 작업을 마무리한다.

  - DOM 생성 작업이나 effect 정보 준비

  - 부모 방향으로 올라가며 누락된 정보를 보완

  - 커밋 단계에서 실행할 작업을 effect list에 누적

이 단계에서는 DOM을 직접 수정하지 않고, 오직 변경 사항을 계산만 수행한다.

---

### Commit Phase (항상 동기)

Commit Phase는 Render Phase에서 계산된 변경 사항을 실제 DOM에 반영하는 단계다. 이 단계는 동기적으로 수행되며, 사용자의 화면에 즉시 영향을 준다.

- DOM 조작: commitMutationEffects() 등을 통해 실제 DOM 업데이트 수행

- 라이프사이클 및 훅 실행: componentDidMount, componentDidUpdate, useEffect 등 실행

- Effect 처리: 각 effect 노드들을 nextEffect를 따라 선형 리스트 형태로 연결하여 순차적으로 처리

이 단계는 중단이 불가능하며, 반드시 한 번에 끝까지 수행된다.



```toc
```