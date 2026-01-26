---
emoji: 🧐
title: 'React useState 완벽 가이드 모든 것을 한눈에 이해해보자'
date: '2023-08-20'
categories: 프론트엔드 React
---

## 함수형 컴포넌트의 상태 관리

[pjqnl16lm7 - CodeSandbox](https://codesandbox.io/s/pjqnl16lm7?file=/src/ProfilePageFunction.js)

클래스형 컴포넌트는 render() 메서드를 통해 상태 변경을 감지

- Props 는 react 에서 불변 / this 는 변경가능, 조작가능

함수형 컴포넌트는 렌더링이 발생하면 함수 자체가 다시 호출

- render 될 때의 값을 유지
  ⇒ 상태를 관리하려면 함수가 다시 호출되었을 때 이전 상태를 기억해야 함
  ⇒ useState 는 클로저를 통해 이 문제를 해결
  > 클로저 : 내부 함수에서 상위 함수 스코프의 변수에 접근할수 있는 것을 의미

## 왜 hooks 를 사용해야 될까?

- UI 의 상태 관련 동작 및 부수 작용을 캡슐화하는 가장 간단한 방법
- 고차 컴포넌트(HOC)의 복잡성을 피할 수 있음
  ```jsx
  widthLogined(withHover(withStyles(ImageBox))); // Bad Wrapper
  ```
- props 로 전달되는 속성들이 명확하지 않고 중복됨
- 컴포넌트 구조의 복잡성을 유발
- 계층의 변화없이 상태 관련 로직을 재사용할 수 있음

## useState 란 무엇인가

**React 공식 문서**

[](https://github.com/facebook/react/blob/main/packages/react/src/ReactHooks.js)

```jsx
useState : function (intitialState){
    currentHookNameInDev = 'useState'; // 변수를 받아와서 초기 상태값을 설정
    mountHookTypesDev(); // 현재 사용중인 hook의 이름을 추적 및 타입 저장
    var prevDispatcher = ReactCurrentDispatcher$1.current; // Dispatcher 을 가리킴, 디버깅에 사용됨
    ReactCurrentDispatcher$1.current = InvalidNestedHooksDispatcherOnMountInDEV;

    try{
        return mountState(initialState); // useState 함수는 실제로 상태를 return 받아 설정됨
    }finally{
        ReactCurrentDispatcher$1.current = prevDispatcher;
    }
}

function mountHookTypesDev(){
    {
        var hookName = currentHookNameInDev;
        if(hookTypesDev === null){ // hook의 값과 타입을 저장
            hookTypesDev = [hookName];

        }else{
            hookTypesDev.push(hookName)
        }
    }
}

function mountState(initialState){
    var hook = mountWorkInProgressHook(); // mountWorkInProgressHook 함수는 현재 hook 을 가져옴
    if(typeof initialState === "function"){
        initialState = initialState(); // initialState 가 함수이면 초기값 상태로 값을 가져옴
    }

    hook.memoizedState = hook.baseState = initialState;
    var queue = { // queue 객체는 상태 업데이트 큐와 관련된 정보를 가짐
        pending : null,
        interleaved: null,
        lanes : NoLanes,
        dispatch: null,
        lastRenderedReducer : basicStateReducer,
        lastRenderedState : initialState
    };

    hook.queue = queue;
    var dispatch = queue.dispatch = dispatchSetState.bind(null, currentlyRenderingFiber$1, queue); // dispatch함수는 상태를 업데이트 하는 함수
    return [hook.memoizedState, dispatch] // 최종적으로 반환되는 값
}
```

- React 내부에서 상태를 관리하는 방식을 추상화한 함수
- 이 함수는 내부적으로 React의 상태 관리 로직을 사용하여 상태를 관리하며, 컴포넌트가 렌더링될 때마다 상태가 올바르게 업데이트되고 관리
- TypeScript를 사용하여 타입 선언이 추가된 형태로 작성

**자바스크립트로 구현한 간단한 상태 관리 함수**

```jsx
function useState(initialValue) {
  var _val = initialValue; // _val은 useState에 의해 만들어진 지역 변수
  function state() {
    // state는 내부 함수이자 클로저
    return _val; // state()는 부모 함수에 정의된 _val을 참조
  }
  function setState(newVal) {
    // setState는 내부 함수이자 클로저
    _val = newVal; // _val를 노출하지 않고 _val를 변경
  }
  return [state, setState]; // 외부에서 사용하기 위해 함수들을 노출
}

var [foo, setFoo] = useState(0); // 배열 구조분해 사용
console.log(foo()); // 0 출력 - 위에서 넘긴 initialValue
setFoo(1); // useState의 스코프 내부에 있는 _val를 변경합니다.
console.log(foo()); // 1 출력 - 동일한 호출하지만 새로운 initialValue
```

## useState 활용 & 응용법

```jsx
const [<상태 값 저장 변수>, <상태 값 갱신 함수>] = useState(initialState);

const [count, setCount] = useState(0) // 일반적인 사용 예시
```

### useState

- 함수형 컴포넌트에서 상태(state)를 관리하기 위해 사용
- useState 는 hook 이여서 최상위 수준에서만 호출 가능
- Strict 모드에서는 초기화 함수를 두번 호출(dev 전용, production 에 영향 x)
- initialState 는 초기 상태값, 렌더링 이후 무시
- useState 함수는 배열을 리턴
- 첫 번째 원소는 상태 값을 저장할 변수
- 두번 째 원소는 해당 상태 값을 갱신할 때 사용할 수 있는 함수
- 그리고 useState() 함수에 인자로 해당 상태의 초기 값을 넘길 수 있음
- state
  - 새값과 이전값을 비교해서 동일하면 렌더링을 건너뜀 ⇒ react 최적화
- set 함수

  - return 이 없음
  - 다음 렌더링에 대한 상태 변수만 업데이트
  - 이미 실행중인 코드의 현재 상태는 변경되지 않음

    ```jsx
    import React from 'react';
    import { useState } from 'react';

    export function App(props) {
      const [data, setData] = useState('지훈이');
      function handleClick() {
        setData('아님');
        console.log('set 다음 : ', data);
      }

      return (
        <div className='App'>
          <button onClick={handleClick}>이름바꾸기</button>
        </div>
      );
    }
    ```

### useState 의 중첩된 객체

```jsx
import { useState } from 'react';

export default function Form() {
  const [person, setPerson] = useState({
    name: 'Niki de Saint Phalle',
    artwork: {
      title: 'Blue Nana',
      city: 'Hamburg',
      image: 'https://i.imgur.com/Sd1AgUOm.jpg',
    },
  });

  function handleNameChange(e) {
    setPerson({
      ...person,
      name: e.target.value,
    });
  }

  function handleTitleChange(e) {
    setPerson({
      ...person,
      artwork: {
        ...person.artwork,
        title: e.target.value,
      },
    });
  }
  return (
    <>
      <label>
        Name:
        <input value={person.name} onChange={handleNameChange} />
      </label>
      <label>
        Title:
        <input value={person.artwork.title} onChange={handleTitleChange} />
      </label>
      <p>
        <i>{person.artwork.title}</i>
        {' by '}
        {person.name}
        <br />
        (located in {person.artwork.city})
      </p>
      <img src={person.artwork.image} alt={person.artwork.title} />
    </>
  );
}
```

### useState 의 initializer function

```jsx
import { useState } from 'react';

function createInitialTodos() {
  const initialTodos = [];
  for (let i = 0; i < 50; i++) {
    initialTodos.push({
      id: i,
      text: 'Item ' + (i + 1),
    });
  }
  return initialTodos;
}

export default function TodoList() {
  // const [todos, setTodos] = useState(createInitialTodos());
  // const [todos, setTodos] = useState(createInitialTodos);
  // const [todos, setTodos] = useState(()=> createInitialTodos());
  const [text, setText] = useState('');

  return (
    <>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <button
        onClick={() => {
          setText('');
          setTodos([
            {
              id: todos.length,
              text: text,
            },
            ...todos,
          ]);
        }}
      >
        Add
      </button>
      <ul>
        {todos.map((item) => (
          <li key={item.id}>{item.text}</li>
        ))}
      </ul>
    </>
  );
}
```

initialState 에 함수를 호출하게 되면 반환된 배열이 초기값으로 사용됨 ⇒ 랜더링마다 새로운 배열 계산 방지

initialState 에 인자를 전달하게 되면 랜더링 될때마다 함수가 호출됨 ⇒ 랜더링마다 새로운 초기 값이 계산됨

initialState 콜백함수를 사용하면 초기값이 설정됨 ⇒ 렌더링마다 재실행 방지

### 하나의 handle 에서 두번의 setState 를 사용

```jsx
export default function UseState1() {
  const [count, setCount] = useState(() => initialData());

  function initialData(): number {
    return 0;
  }

  const dualCal = () => {
    console.log(count);
    setCount(count * 2);
    console.log(count);
    setCount(count + 1);
  };
  return (
    <Container>
      <P>count : {count}</P>
      <Button onClick={() => setCount(count + 1)}>Count+</Button>
      <code>setCount(count+1)</code>
      <br />
      <Button onClick={dualCal}>Count *2 +1 </Button>
      <code>
        setCount(count * 2) <br />
        setCount(count + 1)
      </code>
    </Container>
  );
}
```

```jsx
export default function UseState1() {
  const [count, setCount] = useState(() => initialData());

  function initialData(): number {
    return 0;
  }

  const dualCal = () => {
    setCount((pre) => {
      // setState에 Callback 함수를 사용하면 첫번째 인자로 이전 state 값을 전달받는다.
      console.log(pre);
      return pre * 2;
    });
    setCount((pre) => {
      console.log(pre);
      return pre + 1;
    });
  };
  return (
    <Container>
      <P>count : {count}</P>
      <Button onClick={() => setCount(count + 1)}>Count+</Button>
      <code>setCount(count+1)</code>
      <br />
      <Button onClick={dualCal}>Count *2 +1 </Button>
      <code>
        setCount((pre) =&gt; pre * 2) <br />
        setCount((pre) =&gt; pre + 1)
      </code>
    </Container>
  );
}
```

```toc

```
