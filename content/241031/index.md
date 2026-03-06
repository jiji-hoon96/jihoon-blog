---
title: "useSyncExternalStore Deep Dive"
date: "2024-10-31"
categories: 프론트엔드 자바스크립트
draft: true
---

useSyncExternalStore는 React 18에서 도입된 Hook으로, 외부 상태 관리 스토어와 React의 동시성 렌더링(Concurrent Rendering)을 안전하게 연동하기 위해 설계되었다.

React 18의 동시성 렌더링 모드에서 외부 스토어의 상태 변경이 일관성을 해치는 문제 발생했는데, 이것을 Tearing 현상이라한다. (간혹 동일한 데이터를 보여주는 UI 컴포넌트들이 서로 다른 값을 표기하는 버그)

<br/>

## Tearing 현상

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

  return <div>Count: {count}</div>;
}

function Counter2() {
  const [count, setCount] = useState(store.getValue());

  useEffect(() => {
    return store.subscribe(() => {
      setCount(store.getValue());
    });
  }, []);

  return <div>Count: {count}</div>;
}
```

Concurrent 모드에서 React는 렌더링을 여러 청크로 나누어 처리한다.

그리고 useEffect를 사용한 구독은 비동기적이며, Concurrent 모드에서 렌더링이 중단될 수 있다.

이렇게되면 서로다른 사용자마다 서로다른 데이터를 보게되는데, 데이터 일관성이 중요한 도메인에서는 치명적인 오류를 야기한다.

이런 문제를 useSyncExternalStore로 해결할 수 있다.

```typescript
function Counter1() {
  const count = useSyncExternalStore(
    store.subscribe, // 구독 함수
    store.getValue, // 값을 가져오는 함수
  );

  return <div>Count: {count}</div>;
}

function Counter2() {
  const count = useSyncExternalStore(store.subscribe, store.getValue);

  return <div>Count: {count}</div>;
}
```

useSyncExternalStore을 사용하면 상태 업데이트가 동기적으로 처리된다.

React가 렌더링 도중 스토어 값이 변경되면 즉시 감지하고 모든 컴포넌트가 동일한 시점의 데이터를 보여준다.

이렇게 useSyncExternalStore을 이용해 외부 상태를 구독할 때 useEffect를 사용하는 방식의 한계와 상태 업데이트 동기화 문제를 해결함.

<br/>

> 👋 잠깐! Redux 팀에서 Tearing 문제를 다루었다.
>
> [React-Redux v8에서 useSelector 내부코드를 useSyncExternalStore로 업데이트 진행](https://github.com/reduxjs/react-redux/releases/tag/v8.0.0)
>
> 더 최적화를 진행하기 위해 useSyncExternalStoreWithSelector을 사용

 <br/>

<br/>

## 동작코드 살펴보기

```typescript
const snapshot = useSyncExternalStore(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => T,
  getServerSnapshot?: () => T
);
```

출처) [React-useSyncExternalStore Github](https://github.com/facebook/react/blob/main/packages/use-sync-external-store/src/useSyncExternalStoreShim.js#L17)

<br/>

### subscribe

- 스토어 구독을 설정하는 함수로 스토어 변경 시 호출될 콜백을 받는다.

- 구독 해제 함수를 반환해야한다.

- 렌더링 간에 안정적인 참조를 유지해야 한다.

<br/>

### getSnapshot

- 스토어의 현재 상태를 반환하는 함수다. 스토어가 변경되지 않았다면 동일한 값을 반환해야 한다.

- 반환값은 불변(immutable)이어야 한다.

- getSnapShot 함수에서 매번 똑같은 참조를 반환하게 되면 React는 변경을 감지할 수 없기에 실제 객체 변화에도 리렌더링이 발생하지 않는다. 그렇기에 Immer 라이브러리, 깊은 복사 등으로 불변성을 보장하며 다른 참조를 반환해야한다. (Redux, Mobx 에서 중점으로 다룸)

<br/>

### getServerSnapshot (optional)

- SSR 시 사용될 초기 상태를 반환하는 함수

- 서버와 클라이언트 간 일관된 상태 유지에 사용

<br/>

## useSynExternalStore 분석해보자

```typescript
function useSyncExternalStore(subscribe, getSnapshot) {
  const value = getSnapshot();
  const [{ inst }, forceUpdate] = useState({ inst: { value, getSnapshot } });

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

자세하게 알아보기 전에 간단한 동작 순서를 살펴보면

초기 렌더링 단계에서 getSnapshot으로 초기 값 획득 → inst 객체 생성 및 상태 초기화 → useLayoutEffect에서 동기화 확인 → useEffect에서 구독 설정을 진행한다.

업데이트가 발생하게 되면 외부 스토어 변경 → handleStoreChange 호출 → 스냅샷 확인 → 필요시 리렌더링을 하게된다.

업데이트가 완료되면 클린업을 하기 위해 useEffect 클린업 함수 실행하고 구독해제를 진행한다.

<br/>

### 초기에 useSyncExternalStore 설정

```typescript
function useSyncExternalStore(subscribe, getSnapshot) {
  const value = getSnapshot(); // 현재 스냅샵을 가져옴

  // 컴포넌트의 상태로 인스턴스 객체를 관리
  // useState의 초기값으로 inst 객체를 생성
  const [{ inst }, forceUpdate] = useState({
    inst: {
      value, // 현재 스냅샷 값
      getSnapshot, // 스냅샷을 가져오는 함수
    },
  });
}
```

렌더링 간에 지속적으로 참조해야하는 값들을 저장하기 위해서 inst 객체를 useState로 관리한다.

forceUpdate를 통해 컴포넌트의 리렌더링을 트리거할 수 있다.

<br/>

### Layout Effect에서의 동기화(Tearing 방지를 위한 핵심 메커니즘)

```typescript
useLayoutEffect(() => {
  // inst 객체 업데이트
  inst.value = value;
  inst.getSnapshot = getSnapshot;

  // 스냅샷 변경 확인 및 리렌더링
  if (checkIfSnapshotChanged(inst)) {
    forceUpdate({ inst });
  }
}, [subscribe, value, getSnapshot]);
```

DOM 업데이트 전에 동기적으로 실행되어야 하기 때문에 useLayoutEffect를 사용한다.

checkIfSnapshotChanged 함수를 이용해 렌더링 과정에서 스냅샷이 변경되었는지 즉시 확인한다.

<br/>

### Effect에서 구독 설정

```typescript
useEffect(() => {
  // 초기 스냅샷 변경 확인
  if (checkIfSnapshotChanged(inst)) {
    forceUpdate({ inst });
  }

  // 스토어 변경 핸들러
  const handleStoreChange = () => {
    if (checkIfSnapshotChanged(inst)) {
      forceUpdate({ inst });
    }
  };

  // 구독 설정 및 정리 함수 반환
  return subscribe(handleStoreChange);
}, [subscribe]);
```

스토어 변경 시 스냅샷 변경 확인 후 필요한 경우만 리렌더링하고 컴포넌트 언마운트 시 자동으로 구독 정리한다.

<br/>

### 스냅샷 변경 확인 로직

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

Object.is를 활용해서 정확한 값 비교를 한다.

이 과정에서 에러 처리도 포함되어있고 불변성을 전제로 코드가 작성되어있다.

<br/>

## 주요 특징

앞서 이야기한 데로 useSyncExternalStore 를 사용하는 장점은 동기적 업데이트, 성능 최적화, 안정성이다.

### 동기적 업데이트

- 외부 스토어의 변경사항은 항상 동기적으로 처리해 React 상태 업데이트와의 일관성 보장

- **startTransition**(React 18에서 도입된 새로운 API로, UI 업데이트의 우선순위를 구분하는 기능)으로 래핑되어도 동기적 처리를 유지한다.
  - 비동기적으로 처리할 수 있지만, useSyncExternalStore에서는 동기적으로 처리되어 startTransition 영향을 받지 않는다.

<br/>

### 성능 최적화

- 불필요한 리렌더링 방지
  - 값이 변경되지 않았다면 이전 스냅샷을 재사용한다.
  - 새로운 값일 때만 새 객체가 생성된다.

- 스토어 업데이트의 배치 처리 지원

- 선택적인 메모이제이션 지원

  ```typescript
  function OptimizedComponent() {
    const selectedData = useSyncExternalStoreWithSelector(
      store.subscribe,
      store.getSnapshot,
      store.getServerSnapshot,
      (state) => state.specificValue,
      (a, b) => a === b, // 비교를 위한 함수
    );

    // 메모이제이션된 값만 사용
    const memoizedResult = useMemo(() => expensiveComputation(selectedData), [selectedData]);

    return <div>{memoizedResult}</div>;
  }
  ```

<br/>

### 안전성

- Concurrent Mode 에서 데이터 일관성 보장

- 아래처럼 cleanup() 함수를 이용해 정리 함수를 만들어 메모리 누수를 방지할 수 있다.

  ```typescript
  const useStore = () => {
    // 구독 해제가 자동으로 처리됨
    return useSyncExternalStore(
      useCallback((notify) => {
        const unsubscribe = store.subscribe(notify);
        // 컴포넌트 언마운트 시 자동 호출
        return () => {
          unsubscribe();
          cleanup(); // 추가적인 정리 작업
        };
      }, []),
      store.getSnapshot,
    );
  };
  ```

- 컴포넌트 언마운트 시 자동 정리

<br/>

## React 18 이전 버전을 사용하면?

- [use-sync-external-store/shim 패키지 제공](https://www.npmjs.com/package/use-sync-external-store)

- React 16.8(Hooks 도입) 이후 버전 지원

- 자동으로 적절한 구현체 선택

  ```typescript
  import { useSyncExternalStore } from "use-sync-external-store/shim";
  ```

<br/>

## 출처

- [React-v18-useSyncExternalStore](https://react.dev/blog/2022/03/29/react-v18#usesyncexternalstore)
- [useSyncExternalStore](https://ko.react.dev/reference/react/useSyncExternalStore)
- [useMutableSource → useSyncExternalStore ](https://github.com/reactwg/react-18/discussions/86)
- [useSyncExternalStore- Github 코드](https://github.com/facebook/react/blob/main/packages/use-sync-external-store/src/useSyncExternalStoreShim.js)
- [useSyncExternalStoreShimClient.js의 핵심 로직](https://github.com/facebook/react/blob/main/packages/use-sync-external-store/src/useSyncExternalStoreShimClient.js)

```toc

```
