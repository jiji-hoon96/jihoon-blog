---
title: '함수 참조 제대로 알자.'
date: '2025-06-17'
categories: 프론트엔드 React
---

React에서 `useCallback`은 성능 최적화를 위해 자주 사용된다. 하지만 `useCallback`의 사용 자체에만 집중하다 보면, 정작 단순한 함수 참조 유지라는 기본 개념을 잊고 작업하게 된다. 그리고 시간이 지난 뒤, **왜 이 함수는 계속 새로 생성되는 거지?** 라는 의문을 갖게 된다.

이번 글에서는 회사에서 `useCallback`을 사용하던 중, **함수 참조에 대한 개념을 간과한 채 디버깅에 시간을 낭비했던 경험을 반성하는 의미로 내용을 정리해보았다.**

![1.png](/content/250617/1.png)

---


## useCallback

React 컴포넌트가 리렌더링될 때, 함수 선언도 함께 다시 실행된다. 이는 매번 **새로운 메모리 참조를 가진 함수 객체가 생성된다는 뜻**이다. 이렇게 생성된 함수가 `useEffect`의 의존성 배열(deps)에 포함되어 있다면, 의도치 않은 재실행이 발생할 수 있다. 또 자식 컴포넌트에 props로 해당 함수를 전달할 경우, 참조가 바뀌면서 memoization이 무효화되어 **불필요한 리렌더링**이 일어날 수 있다.

이때 `useCallback`은 지정한 `deps`가 변경되지 않는 한 함수의 참조를 유지해, **불필요한 연산과 리렌더링을 방지**할 수 있도록 도와준다.

```ts
const memoizedFn = useCallback(fn, deps);
```

---

### 참조(reference)

자바스크립트에서 `함수는 객체다.` 따라서 다음 두 코드는 `완전히 다른 동작`을 한다.

```ts
const handleClick = useCallback(() => {
  console.log('dd');
}, []);

return (
  <>
    <button onClick={handleClick}>1번</button>
    <button onClick={() => handleClick()}>2번</button>
  </>
);
```

위 코드를 보면, `onClick={handleClick}`은 `useCallback`에 의해 **메모이제이션된 함수 참조를 그대로 전달**한다. 

반면, `onClick={() => handleClick()}`은 렌더링될 때마다 **새로운 함수 객체**를 생성한다. 

즉, useCallback으로 만든 함수를 불필요하게 감싸는 순간, 참조 유지의 이점은 사라진다.

- onClick={handleClick}은 불필요한 리렌더링을 방지할 수 있다. (정상)

- onClick={() => handleClick()}은 useCallback의 이점을 완전히 무효화한다. (잘못된 사용)

---


## 자식 컴포넌트에 영향이 있을까?

React는 props가 바뀌었는지를 Object.is()로 비교한다. 따라서 () => handleClick()은 매번 새로운 함수 객체이기 때문에 아래 상황에서는 Child가 매번 리렌더링된다.

```ts
<Child onClick={() => handleClick()} />
```

반면, onClick={handleClick}은 useCallback에 의해 참조가 유지되므로, Child가 리렌더링되지 않는다.

---

### Object.is()

React는 함수형 컴포넌트가 리렌더링될 때 props가 이전과 달라졌는지를 판단하기 위해 Object.is()를 사용한다. 특히 React.memo, useMemo, useCallback 등 메모이제이션 관련 최적화 기법에서 이 비교 방식은 매우 중요한 역할을 한다.

`Object.is(value1, value2)`는 두 값이 **같은 값인지(SameValue 알고리즘)** 를 비교하는 JavaScript 내장 함수로, ===와 매우 유사하지만 몇 가지 미묘한 차이가 있다.

`NaN === NaN` 에서 ===는 false를 반환하지만 Object.is()는 true를 반환한다. 그리고 `+0 === -0` 에서 ===는 true를 반환하지만 Object.is()는 false를 반환한다.

즉, Object.is()는 보다 정밀한 동일성 비교를 수행하고,  NaN, +0, -0 등의 케이스에서도 오동작하지 않도록 설계된 함수다. 그래서 React 에서 `Object.is()`를 사용하여 props가 이전과 달라졌는지를 판단한다.


--- 

## 브라우저/엔진 관점에서의 최적화

모던 자바스크립트 엔진(V8 등)은 함수 객체를 반복적으로 생성하고 해제하는 과정에서 **GC(가비지 컬렉션)** 비용이 증가할 수 있다. 특히 다음과 같은 경우에 성능 저하가 발생할 수 있다

- 컴포넌트 리렌더링 시 **새로운 함수 객체가 매번 생성**되는 경우
- 렌더된 DOM에 **이벤트 핸들러가 대량으로 등록**되는 경우
- 내부적으로 **클로저 환경이 계속해서 새롭게 생성**되어 메모리 누수가 발생할 가능성이 있는 경우

이는 브라우저 엔진이 매 렌더마다 생성된 함수를 개별적인 클로저 컨텍스트와 함께 추적해야 하기 때문이다. GC 타이밍이 UI 업데이트와 맞물릴 경우 프레임 드롭이나 UI 랙으로 이어질 수 있다.

그래서 **useCallback을 통해 함수 참조를 고정하고, 컴포넌트 외부에서 클로저 생성을 피한 구조를 최적화한다**.

---

### 그럼 언제 () => fn()을 써도 괜찮을까?

useCallback이 항상 정답은 아니다. 함수 내부에서 **최신 props나 상태(state)** 를 참조해야 하는 경우, 외부에 고정된 함수를 쓰면 stale closure 문제가 발생할 수 있다.

```ts
<button onClick={() => doSomething(id)}>삭제</button>
```

예를 들어 id가 렌더링 시점에 따라 바뀌는 값이라면, useCallback으로 감싸도 이 id가 stale(오래된 값)일 수 있다.

---

### React 19의 useEvent

React 19 이전에는 ahooks의 useMemoizedFn이 유사한 역할을 수행할 수 있는 방법이 있었다. (적극적으로 사용되지 않았던 것 같다.)

React 19에서는 useEvent 훅이 공식화되었다. 이 훅은 이벤트 핸들러에서 최신 상태나 props를 안정적으로 참조할 수 있도록 돕는다. 내부적으로는 stable reference를 유지하되, 내부 로직에서는 항상 최신 값을 읽도록 구현되어 있다.

---

## 결론

디버깅을 하다 보면, 평소에 잘 알고 있다고 생각했던 훅이나 개념들이 실제로는 완전히 이해되지 않았던 부분이라는 걸 깨닫게 된다.

그래서 문제의 명확한 원인을 빠르게 파악하기 위해서는, 익숙한 개념일수록 다시 한번 정확히 이해하고 있는지 점검해보는 태도가 반드시 필요하다는 것을 다시 한번 느꼈다.

## 참고 자료
- [React 공식 문서: Hooks FAQ - useCallback](https://arc.net/l/quote/bwcierlc)
- [V8 엔진의 함수 생성 및 GC 정책: v8.dev](https://v8.dev/blog/)


```toc

```