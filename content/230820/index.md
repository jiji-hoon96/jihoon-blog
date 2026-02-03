---
title: "What is useState?"
date: "2023-08-20"
categories: 프론트엔드 React
---

함수형 컴포넌트는 **렌더링**이 일어날 때마다 컴포넌트 함수가 다시 호출됩니다. 그래서 함수 내부의 일반변수는 호출이 끝나면 사라지고, 다음 렌더에서 처음부터 다시 만들어집니다. 그렇기에 **렌더 사이에 유지되어야 하는 값**을 일반 변수로 들고 있으면 값이 유지되지 않습니다.

반대로 `useState`는 값이 컴포넌트 함수 안에 저장되는 게 아니라, React가 렌더 사이에 따로 보관하고 있다가, 해당 렌더 시점에 스냅샷처럼 꺼내서 컴포넌트에 제공합니다. 그래서 상태값은 **변수처럼 바로 바뀌는 것**이 아니라, `setState`를 호출하면 다음 렌더를 예약하고, 다음 렌더에서 바뀐 상태 스냅샷을 받게 됩니다.

여기서 중요한 점은, props도 마찬가지로 **그 렌더의 입력값**입니다. 함수형 컴포넌트의 관점에서 props는 읽기 전용 입력이고, 컴포넌트는 props와 state로 UI를 계산해 내는 구조입니다. 상태를 바꾸고 싶다면 props를 건드리는 게 아니라 `setState`를 활용해 다음 렌더의 상태를 바꾸는 방식으로 접근해야 합니다.

```jsx
function Counter() {
  let local = 0;
  const [count, setCount] = useState(0);

  const onClick = () => {
    local += 1;
    setCount(count + 1);
    console.log(local, count);
  };

  return <button onClick={onClick}>{count}</button>;
}
```

여기서 `local` 변수는 렌더 사이에 유지되지 않기 때문에, 클릭할 때마다 `0`으로 초기화됩니다. 하지만 `count`는 `useState`를 통해 렌더 사이에 유지되므로, 클릭할 때마다 증가합니다. 하지만 `count`는 클릭하게되면 `setCount`가 현재 실행 중인 코드의 변수를 바꾸는게 아니라 다음 렌더를 트리거하기 때문에 클릭 즉시 바뀌지 않습니다.

이 글에서 useState에 대해서 공식문서를 기준으로 값들이 어떻게 유지되고, 이어지는지에 대해서 이야기해보려합니다.

## useState 란 무엇인가

`useState`는 **함수형 컴포넌트에 상태(state)를 추가**하기 위한 Hook입니다. React는 상태를 컴포넌트 함수 내부 변수로 두는 게 아니라 **렌더 사이에 별도로 보관**해두고, 각 렌더마다 그 시점의 상태 **스냅샷**을 컴포넌트에 제공합니다. 그래서 상태를 바꾸는 행위는 **현재 변수 값을 즉시 바꾸는 것**이 아니라, **다음 렌더에서 사용할 상태를 예약**하는 방식으로 동작합니다.

`useState`는 길이가 2개인 배열을 반환합니다. `state`는 현재 렌더에서의 상태 값(첫 렌더에서는 `initialState`), `setState`는 상태를 업데이트하고 리렌더를 트리거하는 함수입니다.

```jsx
const [state, setState] = useState(initialState);
```

`initialState`는 `useState`가 처음 렌더링 될 때 반환하는 `state`의 초기값입니다. 초기 렌더 이후에는 무시됩니다. 그리고 `initialState`로 함수를 넘기면 그 함수는 **initializer function**으로 취급되어, React가 **초기화 시점에 호출한 반환값을 초기 상태로 저장**합니다. 이 방식은 초기값 계산이 비싼 경우에 유용합니다.

아래 코드가 어떤 차이점을 보이는지 살펴보겠습니다.

```jsx
useState(createInitialTodos());
useState(createInitialTodos);
```

두 함수 `initialState`의 차이점은 언제 호출되어 초기값이 설정되는지에 있습니다.

첫 번째 코드는 매 렌더마다 `createInitialTodos()`가 호출되어 초기값이 설정됩니다. 하지만 두 번째 코드는 초기화 시점에만 `createInitialTodos`를 호출하여 초기값을 만듭니다. (Lazy Initialization)

:::details
Lazy Initialization

Lazy Initialization 은 **useState의 초기값으로 값 대신 함수를 전달하여, 초기 로직이 첫 렌더링 시에만 실행되도록 하는 최적화 기법입니다.**

`useState(heavyCalculation())`은 렌더링 될 때마다 heavyCalculation이 호출되어 낭비됩니다. 그래서 `useState(() => heavyCalculation())`로 최초 마운트 시에만 함수가 실행되고, 이후 리렌더링 때는 실행되지 않고 무시됩니다.
:::

`setState`는 **현재 실행 중인 코드의 state 변수를 즉시 바꾸지 않습니다.** 따라서 `setState` 직후에 `state`를 읽으면 이전 렌더의 값이 그대로 나올 수 있습니다.

또한 `nextState`로 함수를 넘기면 React는 그 함수를 Queue에 쌓아두고, 다음 렌더에서 쌓인 업데이터들을 순서대로 적용해 최종 상태를 계산합니다.

그렇게되면 setState가 여러번 호출되어도 실제로는 한 번만 렌더링되는데, 이것을 성능 향상을 위해 여러 개의 상태 업데이트(setState)를 하나의 그룹으로 묶어서 한 번만 렌더링하는 React의 처리 방식인 **배칭(batch)** 이라고 합니다.

> [React 18](https://react.dev/blog/2022/03/29/react-v18)부터는 기본적으로 배칭 범위가 더 넓어져서, React 이벤트 핸들러뿐 아니라 setTimeout, Promise 등에서도 자동 배칭이 적용될 수 있습니다

새로 넣은 값이 현재 state와 동일한지 `Object.is`로 비교하고 판단되면, React는 리렌더를 스킵할 수 있습니다.

여기서 중요한 포인트는 **원시값(number,string,boolean)은 값 자체 비교**라는 것 입니다, 하지만 **객체/배열은 값이 아니라 참조(reference)가 같아야 동일한 값**으로 취급됩니다. 객체를 직접 수정(mutation)하면 참조가 유지되기 때문에 바뀐 것처럼 보이는데 리렌더가 안되거나/반대로 상태 불변성이 깨져 디버깅이 어려워지는 문제가 발생합니다.

## 내부 동작

React를 사용하면 가장 쉽게 접하는 Hook 중 하나인 `useState`의 내부 코드를 살펴보면 수많은 자바스크립트 로직이 서로 얽혀져 있는 모습을 볼 수 있습니다. 내부 코드를 통해 `useState`가 상태를 어떻게 관리하고 있는지 살펴봅시다.

`useState`를 이해하기 위해서는 **클로저(Closure)를** 이해해야 합니다.

함수형 컴포넌트는 렌더링될 때마다 다시 호출됩니다. 그럼에도 부구하고 이전 상태값을 기억하는 이유는 무엇일까요? 아래 자바스크립트로 `useState`를 구현한 코드를 살펴보겠습니다.

```jsx
function useState(initialValue) {
  var _val = initialValue; // 1. _val은 지역 변수이지만 클로저에 의해 캡처됨

  function state() {
    // state는 내부 함수이자 클로저
    return _val; // 부모 함수의 _val을 참조
  }

  function setState(newVal) {
    // _val 값을 직접 수정 (이 변수는 외부에서 접근 불가)
    _val = newVal;
  }

  return [state, setState]; // 외부로 함수 노출
}

var [foo, setFoo] = useState(0);
console.log(foo()); // 0
setFoo(1);
console.log(foo()); // 1
```

`useState`는 함수가 호출되고 종료되어도, 반환된 state, setState 함수는 **자신이 생성될 당시의 스코프(Lexical Environment)를 기억**합니다. 따라서 `_val`이라는 변수는 메모리 어딘가에 살아남아 값을 유지하게 됩니다.

### ReactHooks.js

실제 React에서는 수많은 컴포넌트의 수많은 Hook들을 순서대로 관리해야하기에 내부 구조가 많이 복잡합니다. 그래서 [모든 내부 구조](https://github.com/facebook/react/blob/main/packages/react/src/ReactHooks.js)를 살펴보는 것 보다는 필요한 부분만 살펴보도록 하겠습니다.

React는 컴포넌트가 **처음 렌더링될 때(Mount)와 업데이트 될 때(Update) 서로 다른 Dispatcher를 사용**합니다.

아래 코드는 컴포넌트가 처음 마운트될 때 실행되는 `useState`의 진입점입니다

```jsx
useState: function (initialState) {
    currentHookNameInDev = 'useState';
    mountHookTypesDev(); // DevTools를 위한 타입 추적

    // 현재의 Dispatcher를 가져옴
    var prevDispatcher = ReactCurrentDispatcher$1.current;
    ReactCurrentDispatcher$1.current = InvalidNestedHooksDispatcherOnMountInDEV;

    try {
        // 실제 상태 생성 로직인 mountState 호출
        return mountState(initialState);
    } finally {
        ReactCurrentDispatcher$1.current = prevDispatcher;
    }
}
```

여기서 주목할 점은 `useState` 자체가 로직을 다 갖는게 아니라, 상황에 맞는 `Dispatcher(mountState)`를 호출한다는 점입니다. 그럼 Hook 객체를 생성하고 초기화하는 역할을 하는 `mountState` 로직의 중요한 부분만 살펴보겠습니다.

```jsx
function mountState(initialState) {
  // 1. 현재 작업 중인 Hook 객체를 가져옴 (Fiber와 연결됨)
  var hook = mountWorkInProgressHook();

  // 2. 초기값 설정 (함수형 초기화 지원 - Lazy Initialization)
  if (typeof initialState === "function") {
    initialState = initialState();
  }

  // 3. Hook 객체에 상태 저장
  hook.memoizedState = hook.baseState = initialState;

  // 4. 업데이트 대기열(Queue) 생성
  var queue = {
    pending: null,
    interleaved: null,
    lanes: NoLanes,
    dispatch: null,
    lastRenderedReducer: basicStateReducer,
    lastRenderedState: initialState,
  };
  hook.queue = queue;

  // 5. dispatch 함수 생성 (우리가 아는 setState)
  // dispatchSetState에 현재 Fiber와 Queue를 바인딩함
  var dispatch = (queue.dispatch = dispatchSetState.bind(
    null,
    currentlyRenderingFiber$1,
    queue,
  ));

  // 6. [상태값, setState함수] 반환
  return [hook.memoizedState, dispatch];
}
```

React는 컴포넌트 내의 여러 Hook들을 **Linked List(연결 리스트)** 형태로 관리합니다.

`mountWorkInProgressHook()`은 새로운 Hook 객체를 생성하고, 현재 Fiber 노드의 Hook 리스트 끝에 추가합니다. 이것이 바로 **"Hook은 최상위에서, 순서대로 호출되어야 한다"** 이라는 규칙입니다.

우리가 사용하는 실제 state 값은 `hook.memoizedState`에 저장됩니다. 컴포넌트가 다시 렌더링될 때 React는 이 값을 가져옵니다. setState 함수(여기서는 dispatch)는 생성될 때 현재 컴포넌트의 Fiber(currentlyRenderingFiber$1)와 자신의 Queue 정보를 미리 바인딩해둡니다.

덕분에 우리가 setState(3)처럼 값만 넘겨도, React의 내부적으로 **어떤 컴포넌트의 어떤 Hook을 업데이트해야 하는지** 정확히 알 수 있습니다.

## 마치며

단순해 보이는 `const [state,setState] = useState(initialState)` 한 줄 뒤에는 Fiber 아키텍처, 연결 리스트, 그리고 클로저의 개념을 활용하고 있습니다.
이러한 내부 원리를 이해하면, 불필요한 렌더링을 막거나 복잡한 상태 관리 이슈를 디버깅할 때 훨씬 더 명확한 시야를 가질 수 있습니다. 앞으로 작성될 내용에서 지금은 가볍게 넘겼던 개념들을 깊게 다뤄보도록 하겠습니다.
