---
emoji: 🤿
title: 'useSyncExternalStore Deep Dive'
date: '2024-10-31'
categories: 프론트엔드 자바스크립트
draft: true
---

이번 포스팅에서는 React 18에서 도입된 `useSyncExternalStore` 훅에 대한 이야기를 해보려고 한다.

필자가 이 훅을 처음 접하게 된 건 Redux와 Zustand의 내부 구현을 뜯어보던 중이었다. 평소에 외부 상태 관리 라이브러리를 당연하게 사용하면서도, 이것들이 React의 동시성 렌더링과 어떻게 안전하게 공존하는지에 대해서는 깊이 생각해 본 적이 없었다. 그런데 코드를 따라가다 보니 `useSyncExternalStore`라는 다소 긴 이름의 훅이 핵심적인 역할을 하고 있었고, 파면 팔수록 React 팀의 치밀한 설계가 느껴져서 이 글을 쓰게 되었다.

(이름이 길어서 타이핑할 때마다 오타가 난다. useSyncExternalStore. 한 번에 치면 천재다.)

<br/>

## Tearing이 뭐길래 이렇게 난리인가

본격적으로 `useSyncExternalStore`를 살펴보기 전에, 이 훅이 해결하려는 문제인 **Tearing 현상**부터 이해해야 한다.

Tearing은 직역하면 "찢어짐"이다. UI가 찢어진다니, 무슨 소리일까. 쉽게 비유하자면 이런 상황이다. 영화관에서 같은 영화를 보고 있는데, 왼쪽 절반은 10분 전 장면을 보여주고 오른쪽 절반은 현재 장면을 보여주는 것이다. 같은 스크린인데 서로 다른 시점의 화면이 동시에 보이는 셈이다.

React에서 Tearing은 **동일한 데이터를 구독하는 여러 컴포넌트가 서로 다른 값을 렌더링하는 현상**을 말한다. 금융 서비스에서 잔액을 표시하는 컴포넌트 두 개가 같은 화면에 있는데 하나는 10만원, 하나는 15만원을 보여준다면? 사용자 입장에서는 공포 그 자체일 것이다.

(내 돈 5만원 어디 갔어...)

<br/>

### 그렇다면 Tearing은 왜 발생하는가

React 18 이전에는 렌더링이 항상 동기적으로 수행되었다. 한번 시작하면 끝까지 쭉 진행되었기 때문에 렌더링 도중에 외부 상태가 바뀔 틈이 없었다. 그런데 React 18에서 **Concurrent Rendering(동시성 렌더링)**이 도입되면서 상황이 달라졌다.

Concurrent 모드에서 React는 렌더링 작업을 여러 청크로 나누어 처리한다. 중간에 더 우선순위가 높은 작업이 들어오면 현재 렌더링을 **중단(yield)**하고, 나중에 다시 이어서 처리한다. 바로 이 "중단"이 문제의 핵심이다.

구체적인 시나리오를 살펴보자.

1. 컴포넌트 A가 외부 스토어에서 값 `42`를 읽고 렌더링을 시작한다.
2. React가 렌더링을 중단하고 브라우저에게 제어권을 넘긴다. (사용자 입력 처리 등 더 급한 일이 생겼다.)
3. 이 틈에 외부 스토어의 값이 `42`에서 `100`으로 변경된다.
4. React가 렌더링을 재개하고, 컴포넌트 B가 같은 스토어에서 값을 읽는다. 이때 B는 `100`을 읽는다.
5. 결과적으로 A는 `42`, B는 `100`을 보여주게 된다. **찢어졌다.**

React 내부 상태(`useState`, `useReducer`)는 이런 문제가 발생하지 않는다. React가 상태 업데이트를 큐에 넣고 직접 관리하기 때문에 렌더링 도중 값이 변경되는 일이 구조적으로 불가능하다. 문제는 React **바깥**에 존재하는 상태, 즉 Redux, Zustand, MobX 같은 외부 스토어나 브라우저 API(`window.innerWidth` 등)를 구독할 때 발생한다.

<br/>

### 전통적인 방식의 한계

기존에 외부 스토어를 구독하는 전형적인 패턴을 살펴보면 문제가 명확해진다.

```typescript
const store = {
  count: 0,
  listeners: new Set(),
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },
  getValue() {
    return this.count;
  },
  setValue(newValue) {
    this.count = newValue;
    this.listeners.forEach((listener) => listener());
  },
};

function Counter1() {
  const [count, setCount] = useState(store.getValue());

  useEffect(() => {
    return store.subscribe(() => {
      setCount(store.getValue());
    });
  }, []);

  return <div>Counter1: {count}</div>;
}

function Counter2() {
  const [count, setCount] = useState(store.getValue());

  useEffect(() => {
    return store.subscribe(() => {
      setCount(store.getValue());
    });
  }, []);

  return <div>Counter2: {count}</div>;
}
```

이 코드의 문제점은 두 가지다.

첫째, `useEffect`를 통한 구독 설정은 **비동기적**이다. 렌더링이 완료되고 브라우저가 페인트를 마친 후에야 구독이 시작된다. 그 사이에 스토어 값이 변경되면 초기 렌더링과 실제 스토어 값 사이에 불일치가 발생한다.

둘째, Concurrent 모드에서 렌더링이 중단되었다가 재개되는 사이에 스토어 값이 변경되면, 위에서 설명한 Tearing이 발생한다. `useEffect` 기반 구독은 이를 감지하거나 방지할 방법이 없다.

데이터 일관성이 중요한 도메인에서는 치명적인 오류를 야기할 수 있는 것이다.

<br/>

## useSyncExternalStore가 어떻게 해결하는가

`useSyncExternalStore`는 이 문제를 우아하게 해결한다. 핵심 전략은 단순하면서도 효과적이다. **렌더링 도중 외부 스토어 값이 변경되었음을 감지하면, 기존 렌더링을 폐기하고 처음부터 다시 시작하는 것이다.**

```typescript
function Counter1() {
  const count = useSyncExternalStore(
    store.subscribe, // 구독 함수
    store.getValue,  // 현재 스냅샷을 반환하는 함수
  );

  return <div>Counter1: {count}</div>;
}

function Counter2() {
  const count = useSyncExternalStore(store.subscribe, store.getValue);

  return <div>Counter2: {count}</div>;
}
```

코드가 훨씬 간결해졌을 뿐만 아니라, Tearing 문제가 원천적으로 차단된다. React가 렌더링 도중 스토어 값 변경을 감지하면 현재 진행 중인 렌더링을 버리고 새로운 값으로 **동기적으로** 다시 렌더링하기 때문에, 모든 컴포넌트가 항상 동일한 시점의 데이터를 보여주게 된다.

여기서 "Sync"라는 이름이 의미하는 바가 드러난다. 외부 스토어의 업데이트를 React의 렌더링 사이클과 **동기화(Synchronize)**한다는 뜻인 것이다. `startTransition`으로 감싸더라도 외부 스토어 업데이트는 항상 동기적으로 처리된다. 이것은 의도된 트레이드오프다. 시간 분할(time-slicing)의 이점을 일부 포기하더라도 데이터 일관성을 보장하는 것이 더 중요하다는 React 팀의 판단이 담겨 있다.

<br/>

## API를 자세히 살펴보자

```typescript
const snapshot = useSyncExternalStore(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => T,
  getServerSnapshot?: () => T
);
```

출처: [React GitHub - useSyncExternalStoreShim.js](https://github.com/facebook/react/blob/main/packages/use-sync-external-store/src/useSyncExternalStoreShim.js)

세 개의 파라미터를 하나씩 뜯어보겠다.

<br/>

### subscribe

스토어의 변경을 구독하는 함수다. 콜백 함수 `onStoreChange`를 인자로 받아서, 스토어가 변경될 때마다 이 콜백을 호출하도록 설정한다. 그리고 **구독 해제 함수를 반환**해야 한다.

여기서 중요한 점이 하나 있다. `subscribe` 함수의 참조가 렌더링마다 바뀌면 React가 매번 재구독을 시도하기 때문에 성능 문제가 발생할 수 있다. 컴포넌트 외부에 정의하거나, `useCallback`으로 감싸서 안정적인 참조를 유지해야 한다.

```typescript
// 좋은 예: 컴포넌트 외부에 정의
const subscribe = (callback) => {
  store.addEventListener('change', callback);
  return () => store.removeEventListener('change', callback);
};

// 나쁜 예: 렌더링마다 새로운 함수 생성
function Component() {
  const value = useSyncExternalStore(
    (callback) => { // 매 렌더링마다 새 참조 → 무한 재구독
      store.addEventListener('change', callback);
      return () => store.removeEventListener('change', callback);
    },
    store.getSnapshot,
  );
}
```

(무한 재구독은 무한 루프의 친척뻘 되는 녀석이다. 만나면 반갑지 않다.)

<br/>

### getSnapshot

스토어의 현재 상태를 반환하는 함수다. 단순해 보이지만 몇 가지 중요한 규칙이 있다.

**첫째, 스토어가 변경되지 않았다면 동일한 값을 반환해야 한다.** React는 내부적으로 `Object.is`를 사용해 이전 스냅샷과 현재 스냅샷을 비교한다. 스토어가 바뀌지 않았는데 매번 새로운 객체를 반환하면 불필요한 리렌더링이 발생한다.

```typescript
// 나쁜 예: 매번 새 객체 생성 → 무한 리렌더링
const getSnapshot = () => ({ count: store.count }); // 매번 새 참조!

// 좋은 예: 불변 데이터 반환
const getSnapshot = () => store.getState(); // 변경 시에만 새 참조
```

**둘째, 반환값은 불변(immutable)이어야 한다.** `getSnapshot`에서 매번 동일한 mutable 객체의 참조를 반환하면 React는 변경을 감지할 수 없다. 실제 데이터가 바뀌었더라도 참조가 같으면 리렌더링이 발생하지 않는다. 이것이 Redux나 Zustand가 상태를 업데이트할 때 항상 새로운 객체를 생성하는 이유이기도 하다.

<br/>

### getServerSnapshot (optional)

SSR(Server-Side Rendering) 환경에서 사용될 초기 스냅샷을 반환하는 함수다. 이 파라미터가 왜 필요한지 이해하려면 하이드레이션(Hydration) 과정을 떠올려야 한다.

서버에서 HTML을 렌더링할 때는 브라우저 API나 외부 스토어에 접근할 수 없는 경우가 많다. 예를 들어 `window.navigator.onLine`을 구독하는 커스텀 훅이 있다고 하자.

```typescript
function useOnlineStatus() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,        // 클라이언트에서 사용
    () => true,                      // 서버에서 사용 (항상 online 가정)
  );
}
```

`getServerSnapshot`을 제공하지 않으면 서버 렌더링 시 에러가 발생한다. React는 서버 환경에서 `getServerSnapshot`이 없으면 명시적으로 에러를 던지도록 설계되어 있다. 이는 개발자가 하이드레이션 불일치(hydration mismatch)를 의식적으로 처리하도록 강제하는 것이다.

다만, React 18 이전 버전을 위한 shim 구현체(`use-sync-external-store/shim`)에서는 `getServerSnapshot`을 사용하지 않는다. pre-18 버전에서는 하이드레이션 여부를 확인할 방법이 없기 때문이다.

<br/>

## 소스 코드를 해부해보자

여기서부터가 진짜 재미있는 부분이다. React 팀이 `useSyncExternalStore`를 어떻게 구현했는지, 소스 코드를 직접 들여다보겠다.

출처: [useSyncExternalStoreShimClient.js](https://github.com/facebook/react/blob/main/packages/use-sync-external-store/src/useSyncExternalStoreShimClient.js)

```typescript
function useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
  const value = getSnapshot();
  const [{ inst }, forceUpdate] = useState({
    inst: { value, getSnapshot },
  });

  useLayoutEffect(() => {
    inst.value = value;
    inst.getSnapshot = getSnapshot;

    if (checkIfSnapshotChanged(inst)) {
      forceUpdate({ inst });
    }
  }, [subscribe, value, getSnapshot]);

  useEffect(() => {
    if (checkIfSnapshotChanged(inst)) {
      forceUpdate({ inst });
    }

    const handleStoreChange = () => {
      if (checkIfSnapshotChanged(inst)) {
        forceUpdate({ inst });
      }
    };

    return subscribe(handleStoreChange);
  }, [subscribe]);

  return value;
}
```

코드가 짧다고 얕보면 안 된다. 이 안에는 React 팀의 깊은 고민이 담겨 있다.

<br/>

### 1단계: 초기 설정

```typescript
const value = getSnapshot(); // 현재 스냅샷을 가져온다

const [{ inst }, forceUpdate] = useState({
  inst: {
    value,        // 현재 스냅샷 값
    getSnapshot,  // 스냅샷을 가져오는 함수
  },
});
```

여기서 눈여겨볼 부분은 `inst` 객체의 역할이다. 이것은 렌더링 간에 지속적으로 참조해야 하는 값들을 저장하는 일종의 **인스턴스 변수**다. `useRef`와 비슷한 역할이지만, `useState` 안에 넣은 이유가 있다. `forceUpdate`를 통해 새로운 `{ inst }` 객체를 전달하면 React의 동등성 검사(`Object.is`)를 통과하지 못해 리렌더링이 트리거되기 때문이다.

(리렌더링을 강제하려고 `useState`를 이렇게 쓰다니, 해킹 같으면서도 우아하다.)

<br/>

### 2단계: useLayoutEffect에서의 동기화 — 핵심 중의 핵심

```typescript
useLayoutEffect(() => {
  inst.value = value;
  inst.getSnapshot = getSnapshot;

  if (checkIfSnapshotChanged(inst)) {
    forceUpdate({ inst });
  }
}, [subscribe, value, getSnapshot]);
```

이 부분이 Tearing 방지의 핵심 메커니즘이다. 그런데 왜 `useEffect`가 아니라 `useLayoutEffect`를 사용했을까?

**`useLayoutEffect`는 DOM 업데이트 직후, 브라우저가 화면을 그리기 전에 동기적으로 실행된다.** 반면 `useEffect`는 브라우저가 화면을 그린 후 비동기적으로 실행된다. 이 차이가 결정적이다.

만약 여기서 `useEffect`를 사용했다면 이런 시나리오가 가능하다.

1. 컴포넌트가 스냅샷 `42`로 렌더링된다.
2. 브라우저가 `42`를 화면에 그린다.
3. 그 사이에 스토어 값이 `100`으로 변경된다.
4. `useEffect`가 실행되어 변경을 감지하고 리렌더링을 트리거한다.
5. 사용자는 `42` → `100`으로 **깜빡이는 화면**을 보게 된다.

`useLayoutEffect`를 사용하면 3단계에서 즉시 변경을 감지하고, **브라우저가 화면을 그리기 전에** 리렌더링을 트리거한다. 사용자는 깜빡임 없이 항상 최신 값을 보게 되는 것이다.

이것은 React 소스 코드를 볼 때 자주 발견되는 패턴이다. 시각적 일관성이 중요한 곳에서는 반드시 `useLayoutEffect`를 사용해 **페인트 전에 동기적으로 처리**하는 것이다.

<br/>

### 3단계: useEffect에서의 구독 설정

```typescript
useEffect(() => {
  if (checkIfSnapshotChanged(inst)) {
    forceUpdate({ inst });
  }

  const handleStoreChange = () => {
    if (checkIfSnapshotChanged(inst)) {
      forceUpdate({ inst });
    }
  };

  return subscribe(handleStoreChange);
}, [subscribe]);
```

여기서 자연스럽게 떠오르는 질문이 하나 있다. "구독도 `useLayoutEffect`에서 하면 되지 않나?"

구독을 `useEffect`에서 하는 데는 이유가 있다. `useLayoutEffect`에서 구독을 설정하면 **서버 사이드 렌더링 시 경고가 발생**한다. `useLayoutEffect`는 서버에서 실행되지 않기 때문이다. 또한 구독 설정 자체는 DOM과 관련이 없으므로 `useEffect`에서 처리하는 것이 의미적으로도 올바르다.

그런데 `useEffect` 시작 부분에서 다시 한번 `checkIfSnapshotChanged`를 호출하는 것이 보이는가? 이것은 `useLayoutEffect` 실행 이후, `useEffect` 실행 사이의 간극에 스토어가 변경될 수 있기 때문이다. 이 미세한 틈까지 메워주는 것이다.

(빈틈을 용서하지 않는 React 팀의 꼼꼼함에 감탄한다.)

그리고 `handleStoreChange`는 스토어가 변경될 때마다 호출되는 콜백이다. 변경이 감지되면 `forceUpdate`로 리렌더링을 트리거하고, `subscribe`의 반환값인 구독 해제 함수가 클린업으로 자동 실행된다.

<br/>

### 4단계: 스냅샷 변경 확인 로직

```typescript
function checkIfSnapshotChanged(inst) {
  const latestGetSnapshot = inst.getSnapshot;
  const prevValue = inst.value;

  try {
    const nextValue = latestGetSnapshot();
    return !Object.is(prevValue, nextValue);
  } catch (error) {
    return true; // 에러 발생 시 변경된 것으로 간주
  }
}
```

`Object.is`를 사용해 이전 값과 현재 값을 정확하게 비교한다. `===` 대신 `Object.is`를 쓴 이유는 `NaN === NaN`이 `false`를 반환하는 등 엣지 케이스를 올바르게 처리하기 위함이다.

`try-catch`로 감싼 것도 중요하다. `getSnapshot` 실행 중 에러가 발생하면 "변경된 것으로 간주"하여 리렌더링을 트리거한다. 방어적 프로그래밍의 좋은 예시인 것이다.

<br/>

## useSyncExternalStoreWithSelector는 무엇인가

여기까지 읽으면 자연스럽게 떠오르는 질문이 있다. "스토어 전체가 아니라 특정 부분만 구독하고 싶으면 어떻게 하나?"

`useSyncExternalStore`는 `getSnapshot`이 반환하는 전체 값을 기준으로 변경을 감지한다. 스토어의 일부분만 필요한 컴포넌트가 있다면, 관련 없는 상태 변경에도 불필요하게 리렌더링될 수 있다. 이 문제를 해결하는 것이 `useSyncExternalStoreWithSelector`다.

출처: [useSyncExternalStoreWithSelector.js](https://github.com/facebook/react/blob/main/packages/use-sync-external-store/src/useSyncExternalStoreWithSelector.js)

```typescript
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector';

function UserName() {
  const userName = useSyncExternalStoreWithSelector(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
    (state) => state.user.name,      // selector: 필요한 부분만 추출
    (a, b) => a === b,                // equalityFn: 커스텀 비교 함수 (optional)
  );

  return <div>{userName}</div>;
}
```

이 훅은 다섯 개의 파라미터를 받는다. 처음 세 개는 `useSyncExternalStore`와 동일하고, 네 번째가 **selector**, 다섯 번째가 **equalityFn**이다.

내부적으로는 클로저 기반의 메모이제이션을 사용한다. 이전 스냅샷과 현재 스냅샷이 참조적으로 동일하면 selector를 다시 실행하지 않고 이전 선택 결과를 재사용한다. 스냅샷이 바뀌었더라도 selector의 결과를 `equalityFn`으로 비교하여, 실제로 관심 있는 값이 변경되지 않았다면 리렌더링을 건너뛴다.

이것이 바로 Redux와 Zustand가 채택한 전략이다.

<br/>

### Redux는 어떻게 사용하고 있는가

React-Redux v8에서는 `useSelector`의 내부 구현을 `useSyncExternalStore` 기반으로 전면 교체했다. [릴리스 노트](https://github.com/reduxjs/react-redux/releases/tag/v8.0.0)에서 확인할 수 있다.

```typescript
// React-Redux의 useSelector 내부 (간략화)
function useSelector(selector, equalityFn = refEquality) {
  return useSyncExternalStoreWithSelector(
    store.subscribe,
    store.getState,
    store.getState, // SSR 시에도 동일한 스토어 사용
    selector,
    equalityFn,
  );
}
```

Zustand 역시 내부적으로 `useSyncExternalStoreWithSelector`를 사용한다. 외부 상태 관리 라이브러리들이 Concurrent Mode에서 안전하게 동작할 수 있는 것은 모두 이 훅 덕분인 것이다.

<br/>

## useMutableSource에서 useSyncExternalStore로

사실 React 팀이 처음부터 `useSyncExternalStore`를 설계한 것은 아니다. 이전에 `useMutableSource`라는 API가 있었다. 이 역사를 알면 `useSyncExternalStore`의 설계 철학을 더 깊이 이해할 수 있다.

출처: [React 18 WG Discussion #86](https://github.com/reactwg/react-18/discussions/86)

`useMutableSource`는 외부 상태를 동시성 렌더링과 통합하려는 첫 번째 시도였지만, 세 가지 치명적인 문제가 있었다.

**첫째, selector 메모이제이션 부담.** `useMutableSource`를 사용하는 라이브러리는 사용자에게 selector 메모이제이션을 강제해야 했다. inline selector가 변경될 때마다 재구독이 발생했기 때문이다.

**둘째, 예측 불가능한 폴백(fallback).** `startTransition` 내부에서도 예상치 못한 시점에 기존 UI가 로딩 상태로 교체되는 현상이 발생했다. 부분적으로 동시성을 지원하려다 보니 deoptimization이 일관되지 않게 발생한 것이다.

**셋째, 복잡한 API 표면.** `createMutableSource`와 `source` 인자가 필요해서 라이브러리 메인테이너들의 채택 부담이 컸다.

React 팀은 결국 "동시성 최적화를 일부 포기하더라도 예측 가능성과 단순성을 택하자"는 결론에 도달했다. 그래서 외부 스토어 업데이트는 **항상 동기적으로** 처리하는 `useSyncExternalStore`가 탄생한 것이다.

<br/>

## 성능 고려사항과 흔한 실수

`useSyncExternalStore`를 실제로 사용할 때 주의해야 할 점들을 정리해보겠다.

<br/>

### getSnapshot에서 매번 새 객체를 생성하지 말 것

가장 흔한 실수다. `getSnapshot`이 호출될 때마다 새로운 객체를 반환하면 `Object.is` 비교가 항상 `false`를 반환하여 무한 리렌더링에 빠진다.

```typescript
// 이러면 안 된다
const snapshot = useSyncExternalStore(subscribe, () => {
  return { count: store.count }; // 매번 새 객체!
});

// 이렇게 해야 한다
const snapshot = useSyncExternalStore(subscribe, () => store.getState());
// store.getState()는 상태가 변경될 때만 새 참조를 반환
```

<br/>

### subscribe 함수의 참조 안정성을 유지할 것

앞서 언급했듯이 `subscribe` 참조가 바뀌면 재구독이 발생한다. 이는 `useEffect`의 의존성 배열에 `subscribe`가 포함되어 있기 때문이다.

```typescript
// 컴포넌트 외부에서 정의하거나
const subscribe = (callback) => store.subscribe(callback);

// useCallback으로 안정적인 참조 유지
const subscribe = useCallback((callback) => {
  return store.subscribe(callback);
}, []);
```

<br/>

### 필요하다면 selector를 활용할 것

스토어 전체가 아니라 일부만 필요하다면 `useSyncExternalStoreWithSelector`를 사용하여 불필요한 리렌더링을 방지하는 것이 좋다. 특히 객체 형태의 상태를 다룰 때, 얕은 비교(shallow equality)를 `equalityFn`으로 전달하면 효과적이다.

```typescript
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector';
import { shallowEqual } from 'some-utility';

function UserProfile() {
  const profile = useSyncExternalStoreWithSelector(
    store.subscribe,
    store.getSnapshot,
    null,
    (state) => ({ name: state.name, avatar: state.avatar }),
    shallowEqual, // 얕은 비교로 불필요한 리렌더링 방지
  );

  return <div>{profile.name}</div>;
}
```

<br/>

### 동기적 특성을 인지할 것

`useSyncExternalStore`는 외부 스토어 업데이트를 동기적으로 처리하기 때문에, `startTransition`으로 감싸도 시간 분할의 이점을 받지 못한다. 이것은 버그가 아니라 의도된 동작이다. 하지만 외부 스토어의 업데이트가 매우 빈번한 경우(예: 마우스 위치 추적), 성능 문제가 발생할 수 있으므로 throttle이나 debounce를 고려해야 한다.

<br/>

## React 18 이전 버전은 어떻게 하나

React 18 이전 버전(16.8+)을 사용하고 있다면 shim 패키지를 사용할 수 있다.

```typescript
// React 18 미만에서 사용
import { useSyncExternalStore } from 'use-sync-external-store/shim';

// selector 버전
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
```

shim은 React 18 이상에서는 네이티브 구현체를 사용하고, 이전 버전에서는 `useState` + `useLayoutEffect` + `useEffect` 조합으로 동일한 동작을 폴리필한다. 다만, 앞서 살펴보았듯이 shim에서는 `getServerSnapshot`을 사용하지 않는다. pre-18 버전에서는 하이드레이션 여부를 확인할 방법이 없기 때문이다.

<br/>

## 마치며

`useSyncExternalStore`는 겉보기에 단순한 API이지만, 그 안에는 React의 동시성 렌더링 모델과 외부 세계를 안전하게 연결하기 위한 깊은 고민이 담겨 있다.

정리하면 이렇다. React 18의 Concurrent Mode는 렌더링 중단과 재개를 가능하게 했지만, 이로 인해 외부 스토어와의 데이터 일관성 문제(Tearing)가 발생했다. `useSyncExternalStore`는 렌더링 도중 외부 값 변경을 감지하면 동기적으로 다시 렌더링함으로써 이 문제를 해결한다. 내부적으로는 `useLayoutEffect`로 페인트 전 동기화를 보장하고, `useEffect`로 구독을 관리하는 이중 구조를 사용한다.

필자가 가장 인상 깊었던 것은 React 팀의 트레이드오프 결정이다. `useMutableSource`에서 `useSyncExternalStore`로 전환하면서, 동시성 최적화를 일부 포기하더라도 **예측 가능성과 데이터 일관성**을 선택한 것이다. 때로는 더 느리더라도 확실한 것이 낫다는 엔지니어링 철학이 느껴진다.

이 글을 읽는 독자분들도 외부 상태 관리 라이브러리의 내부를 한번쯤 들여다보시기를 권한다. `useSyncExternalStore`를 이해하고 나면, Redux, Zustand, Jotai 같은 라이브러리들이 어떻게 Concurrent Mode와 공존하는지가 한눈에 보이기 시작할 것이다. 정답은 없지만, 그 과정에서 React의 설계 철학을 이해하는 것만으로도 충분히 가치 있는 경험이 될 것이다.

<br/>

## 출처

- [React v18 - useSyncExternalStore](https://react.dev/blog/2022/03/29/react-v18#usesyncexternalstore)
- [useSyncExternalStore 공식 문서](https://ko.react.dev/reference/react/useSyncExternalStore)
- [useMutableSource → useSyncExternalStore 논의](https://github.com/reactwg/react-18/discussions/86)
- [What is tearing? - React 18 WG](https://github.com/reactwg/react-18/discussions/70)
- [useSyncExternalStoreShimClient.js 소스 코드](https://github.com/facebook/react/blob/main/packages/use-sync-external-store/src/useSyncExternalStoreShimClient.js)
- [useSyncExternalStoreWithSelector.js 소스 코드](https://github.com/facebook/react/blob/main/packages/use-sync-external-store/src/useSyncExternalStoreWithSelector.js)
- [React-Redux v8 릴리스 노트](https://github.com/reduxjs/react-redux/releases/tag/v8.0.0)

```toc

```
