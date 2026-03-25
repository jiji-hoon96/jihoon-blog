---
emoji: 🤯
title: 'Zustand, 너 뭔데 ProviderLess 인 거야?'
date: '2024-08-18'
categories: 프론트엔드 React
---

이번 포스팅에서는 Zustand가 어떻게 Provider 없이 상태관리를 해내는지에 대한 이야기를 해보려고 한다.

필자는 Zustand를 사용하면서 늘 당연하게 Provider 없이 상태를 관리해왔다. 그러다 문득 이런 생각이 들었다. React의 Context API는 반드시 Provider로 컴포넌트 트리를 감싸야 하는데, Zustand는 대체 어떤 마법을 부리기에 그런 과정이 필요 없는 걸까?

![2.jpeg](2.jpeg)

궁금해서 Zustand의 소스 코드를 직접 뜯어보았고, 생각보다 흥미로운 구조가 숨어있었다. 그 과정에서 알게 된 내용을 정리해보려 한다.

## React에서 상태는 어떻게 흘러가는가

일반적인 React 애플리케이션에서 상태는 아래 그림처럼 동작한다.

![3.png](3.png)

컴포넌트 내부 상태는 `useState` 훅을 사용하여 관리한다. 그리고 하위 컴포넌트로의 상태 전달은 props를 통해 이루어진다. 여기까지는 단순한 이야기이다.

문제는 멀리 떨어진 컴포넌트 간에 상태를 공유해야 할 때 발생한다. 이때 React가 제공하는 공식적인 해법이 바로 Context API인데, 이 녀석은 반드시 Provider 컴포넌트로 하위 트리를 감싸야 한다.

### 왜 Context API는 Provider가 필요할까?

이 질문에 답하려면 React의 내부 동작을 조금 들여다봐야 한다.

React는 컴포넌트 트리를 Fiber라는 내부 자료구조로 관리한다. 각 Fiber 노드는 부모-자식 관계로 연결되어 있고, Context의 값이 변경되면 React는 이 Fiber 트리를 위에서 아래로 순회하면서 해당 Context를 구독하는 컴포넌트를 찾아 리렌더링을 트리거한다.

핵심은 이것이다. **Context의 값 전파는 Fiber 트리의 구조에 의존한다.** Provider가 트리의 어느 지점에 위치하느냐에 따라 값이 전달되는 범위가 결정되고, `useContext`를 호출한 컴포넌트는 자신의 상위 Fiber 트리를 거슬러 올라가며 가장 가까운 Provider를 찾는다. Provider가 없으면? `createContext`에 전달한 기본값이 사용될 뿐이다.

즉, Context API는 React의 렌더링 시스템과 긴밀하게 결합되어 있다. 상태의 저장, 전파, 구독 모두가 React의 컴포넌트 트리 내부에서 일어나는 것이다.

그렇다면 Zustand는 이 구조를 어떻게 우회하는 걸까?

## Zustand는 React 바깥에 산다

![4.png](4.png)

Zustand는 Flux 패턴을 기반으로 동작한다. 클로저 내부의 `state`가 Store 역할을, 사용자 정의 함수들이 Action 역할을, `set` 함수가 Dispatcher 역할을, React 컴포넌트가 View 역할을 수행한다.

여기서 결정적인 차이가 있다. **Zustand의 스토어는 React 컴포넌트 트리 외부, JavaScript 모듈의 스코프 내에 존재한다.**

```typescript
import { create } from 'zustand';

const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
```

이 코드에서 `create`가 호출되는 시점은 모듈이 로드될 때이다. 즉, React가 렌더링을 시작하기도 전에 스토어는 이미 메모리에 존재하게 된다. 이것이 바로 **모듈 레벨 싱글톤(Module-level Singleton) 패턴**인 것이다.

> **컴포넌트 트리 외부라는 것의 의미**
>
> React 내부의 상태관리와 달리, Zustand에서 자주 언급되는 "컴포넌트 트리 외부"라는 표현은 상태가 React의 Fiber 트리와 무관하게 독립적으로 존재한다는 뜻이다. 어떤 컴포넌트든 `import`만 하면 스토어에 접근할 수 있고, Provider로 앱을 감쌀 필요가 없다. (마치 전역 변수처럼 어디서든 접근 가능하되, 클로저로 잘 보호되어 있는 셈이다.)

여기까지 읽으면 자연스럽게 떠오르는 질문이 하나 있다. 그래서 Zustand의 내부는 구체적으로 어떻게 생겼을까?

## Zustand 소스 코드를 해부해보자

[Zustand의 GitHub 저장소](https://github.com/pmndrs/zustand/tree/main/src)를 들여다보면, 핵심 로직은 놀라울 정도로 간결하다. 크게 두 개의 파일이 핵심인데, `vanilla.ts`가 스토어의 본체를, `react.ts`가 React와의 연결 고리를 담당한다.

### vanilla.ts - 클로저 안에 갇힌 상태

[vanilla.ts](https://github.com/pmndrs/zustand/blob/main/src/vanilla.ts)는 Zustand의 심장부이다. 스토어가 어떻게 생성되고, 상태가 어떻게 관리되는지 이 파일 하나에 모두 담겨있다.

```typescript
const createStoreImpl: CreateStoreImpl = (createState) => {
  type TState = ReturnType<typeof createState>
  type Listener = (state: TState, prevState: TState) => void
  let state: TState
  const listeners: Set<Listener> = new Set()

  const setState: StoreApi<TState>['setState'] = (partial, replace) => {
    const nextState =
      typeof partial === 'function'
        ? (partial as (state: TState) => TState)(state)
        : partial
    if (!Object.is(nextState, state)) {
      const previousState = state
      state =
        (replace ?? (typeof nextState !== 'object' || nextState === null))
          ? (nextState as TState)
          : Object.assign({}, state, nextState)
      listeners.forEach((listener) => listener(state, previousState))
    }
  }

  const getState: StoreApi<TState>['getState'] = () => state

  const getInitialState: StoreApi<TState>['getInitialState'] = () =>
    initialState

  const subscribe: StoreApi<TState>['subscribe'] = (listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  const api = { setState, getState, getInitialState, subscribe }
  const initialState = (state = createState(setState, getState, api))
  return api as any
}
```

이 코드를 한 줄 한 줄 뜯어보면 Zustand의 핵심 메커니즘이 드러난다.

**1. 클로저를 통한 상태 캡슐화**

`let state: TState`라는 변수가 `createStoreImpl` 함수의 지역 변수로 선언되어 있다. 이 변수는 함수 실행이 끝난 후에도 `setState`, `getState` 등의 내부 함수가 참조하고 있기 때문에 가비지 컬렉션되지 않는다. 이것이 클로저의 본질이다.

외부에서는 `state` 변수에 직접 접근할 방법이 없다. 오로지 `getState()`로 읽고, `setState()`로 쓸 수 있을 뿐이다. (객체지향에서 말하는 private 필드를 클로저로 구현한 셈이다.)

**2. `Object.is`를 활용한 변경 감지**

`setState`는 새로운 상태를 계산한 뒤, `Object.is(nextState, state)`로 기존 상태와 비교한다. 참조가 동일하면 아무 일도 일어나지 않는다. 이것이 불필요한 리렌더링을 방지하는 첫 번째 방어선이다.

**3. Pub/Sub 패턴의 리스너 시스템**

`const listeners: Set<Listener> = new Set()`라는 한 줄이 Zustand의 구독 시스템 전체이다. 상태가 변경되면 `listeners.forEach`로 모든 구독자에게 알림을 보낸다. `subscribe`를 호출하면 리스너가 `Set`에 추가되고, 반환된 함수를 호출하면 `Set`에서 제거된다.

이 패턴이 중요한 이유는, **React의 Fiber 트리와 완전히 독립적인 알림 시스템**이기 때문이다. Provider가 트리를 순회하며 구독자를 찾는 방식이 아니라, 스토어가 직접 구독자 목록을 관리하는 방식인 것이다.

**4. 초기 상태의 이중 할당**

마지막 줄이 흥미롭다.

```typescript
const initialState = (state = createState(setState, getState, api))
```

`createState`를 호출하여 사용자가 정의한 초기 상태를 생성하면서, 동시에 `state`와 `initialState` 두 변수에 할당한다. `initialState`는 이후 SSR에서 서버 스냅샷으로 활용된다.

### react.ts - React와의 다리를 놓다

[react.ts](https://github.com/pmndrs/zustand/blob/main/src/react.ts)는 위에서 만든 순수 JavaScript 스토어를 React의 렌더링 시스템에 연결하는 역할을 한다.

```typescript
export function useStore<TState, StateSlice>(
  api: ReadonlyStoreApi<TState>,
  selector: (state: TState) => StateSlice = identity as any,
) {
  const slice = React.useSyncExternalStore(
    api.subscribe,
    React.useCallback(() => selector(api.getState()), [api, selector]),
    React.useCallback(() => selector(api.getInitialState()), [api, selector]),
  )
  React.useDebugValue(slice)
  return slice
}
```

여기서 핵심은 `useSyncExternalStore`이다. 이 훅은 React 18에서 도입된 것으로, **React 외부에 존재하는 상태 저장소를 React의 렌더링 사이클에 안전하게 통합**하기 위해 설계되었다.

`useSyncExternalStore`가 받는 세 가지 인자를 살펴보면 구조가 명확해진다.

- **`api.subscribe`**: 스토어의 변경을 구독하는 함수이다. React는 이 함수를 통해 "상태가 바뀌면 알려달라"고 요청한다.
- **`() => selector(api.getState())`**: 현재 상태의 스냅샷을 반환한다. React는 렌더링할 때마다 이 함수를 호출하여 최신 상태를 가져온다.
- **`() => selector(api.getInitialState())`**: 서버 사이드 렌더링 시 사용할 초기 스냅샷이다. hydration 과정에서 서버와 클라이언트의 상태 불일치를 방지한다.

특히 `useSyncExternalStore`는 React의 동시성 모드(Concurrent Mode)에서 발생할 수 있는 **tearing 문제**를 해결한다. 동시성 렌더링에서는 렌더링이 중단되었다가 재개될 수 있는데, 그 사이에 외부 상태가 변경되면 같은 화면에 서로 다른 상태가 표시될 수 있다. `useSyncExternalStore`는 이런 상황을 감지하고 동기적으로 리렌더링을 강제하여 일관성을 보장하는 것이다.

그리고 `createImpl` 함수가 이 모든 것을 하나로 묶는다.

```typescript
const createImpl = <T>(createState: StateCreator<T, [], []>) => {
  const api = createStore(createState)
  const useBoundStore: any = (selector?: any) => useStore(api, selector)
  Object.assign(useBoundStore, api)
  return useBoundStore
}
```

`createStore`로 vanilla 스토어를 생성하고, `useBoundStore`라는 커스텀 훅으로 감싼 뒤, `Object.assign`으로 스토어 API의 메서드들(`setState`, `getState`, `subscribe` 등)을 훅 함수 자체에 붙여버린다. 그 결과 반환되는 `useBoundStore`는 **React 훅이면서 동시에 스토어 API**라는 이중적인 성격을 가지게 된다. (함수인데 메서드도 있는, 꽤나 JavaScript스러운 패턴이다.)

## 다른 상태관리 라이브러리는 어떨까?

여기까지 이해했다면 자연스럽게 다른 라이브러리들과 비교해보고 싶어질 것이다.

### Redux - Provider가 필수인 이유

Redux도 내부적으로는 모듈 레벨의 스토어를 사용한다. 그런데 왜 Provider가 필요할까?

Redux의 `<Provider store={store}>`는 React Context를 통해 스토어 인스턴스를 컴포넌트 트리에 주입한다. `useSelector`나 `useDispatch`는 내부적으로 `useContext`를 호출하여 Provider가 제공하는 스토어에 접근하는 구조이다. 이는 설계적 선택인데, 테스트 시 서로 다른 스토어 인스턴스를 주입하기 용이하고, 하나의 앱에서 여러 독립적인 스토어 트리를 구성할 수 있다는 장점이 있다.

### Jotai - Provider 선택적 설계

Jotai는 흥미로운 중간 지점에 위치한다. 기본적으로 전역 스토어를 사용하여 Provider 없이 동작하지만, 필요하다면 `<Provider>`로 감싸서 격리된 스토어 스코프를 만들 수 있다. 이는 Zustand의 접근 방식과 Redux의 접근 방식을 모두 수용하는 설계라 할 수 있다.

### Zustand의 선택

Zustand는 가장 급진적인 선택을 했다. 기본적으로 모듈 레벨 싱글톤이며, Provider가 아예 없다. (물론 `createContext`를 사용하는 별도 패턴을 제공하기는 한다.) 이 선택이 가져다주는 것은 **극도로 단순한 API**이다. `create`로 스토어를 만들고, 컴포넌트에서 훅을 호출하면 끝이다.

## ProviderLess의 그림자

물론 Provider가 없다는 것이 장점만 있는 것은 아니다. 필자가 생각하는 주의해야 할 지점들을 정리해보겠다.

### SSR에서의 상태 공유 문제

모듈 레벨 싱글톤은 서버 환경에서 위험할 수 있다. Node.js 서버는 여러 요청을 하나의 프로세스에서 처리하는데, 모듈은 프로세스 내에서 한 번만 로드된다. 이는 서로 다른 사용자의 요청이 **같은 스토어 인스턴스를 공유**할 수 있다는 뜻이다.

Zustand가 `getInitialState`를 제공하고 `useSyncExternalStore`의 세 번째 인자로 서버 스냅샷을 넘기는 이유가 여기에 있다. 하지만 이것만으로는 요청 간 상태 격리가 완벽하지 않을 수 있어, SSR 환경에서는 요청마다 새로운 스토어를 생성하는 패턴을 고려해야 한다.

### 테스트 격리의 어려움

Provider 기반 라이브러리는 테스트마다 다른 Provider로 감싸면 스토어가 자연스럽게 격리된다. 반면 Zustand의 모듈 레벨 싱글톤은 테스트 간에 상태가 누수될 수 있다. 각 테스트의 `beforeEach`에서 스토어를 명시적으로 리셋해야 하는 것이다. (필자도 이 문제로 한 번 고생한 적이 있다.)

### 다중 인스턴스의 부재

하나의 애플리케이션에서 같은 구조의 독립적인 스토어 두 개가 필요한 경우, Provider 패턴이라면 각각 다른 Provider로 감싸면 된다. 하지만 모듈 레벨 싱글톤에서는 스토어 생성 함수를 별도로 호출하여 서로 다른 스토어 인스턴스를 만들어야 한다.

## 결론

![6.jpeg](6.jpeg)

지금까지 살펴본 내용을 정리하면, Zustand의 ProviderLess 설계는 다음 네 가지 메커니즘의 조합으로 가능해진다.

1. **모듈 레벨 싱글톤**: 스토어가 React 컴포넌트 트리 외부, JavaScript 모듈의 스코프 내에 생성된다.
2. **클로저를 통한 상태 캡슐화**: `vanilla.ts`의 `createStoreImpl`에서 `state` 변수와 `listeners` Set이 클로저에 갇혀 외부 접근이 차단된다.
3. **자체 Pub/Sub 시스템**: Fiber 트리 순회 대신 `Set<Listener>`를 직접 관리하여 상태 변경을 구독자에게 알린다.
4. **`useSyncExternalStore`를 통한 React 통합**: 외부 스토어의 상태 변경을 React의 렌더링 사이클에 안전하게 동기화한다.

결국 Zustand가 던지는 질문은 이것이다. "상태가 꼭 React 안에 살아야 하는가?" Zustand의 답은 명확하다. 상태는 React 밖에 두고, 필요할 때 다리만 놓으면 된다는 것이다. 그 다리가 바로 `useSyncExternalStore`이다.

물론 이 접근 방식이 모든 상황에서 최선인 것은 아니다. SSR, 테스트 격리, 다중 인스턴스 같은 상황에서는 Provider 기반의 설계가 더 적합할 수 있다. 정답은 없지만, 각 라이브러리가 어떤 설계적 트레이드오프를 선택했는지 이해하고 있다면 상황에 맞는 도구를 고를 수 있을 것이다.

이 글을 읽는 분들도 한 번쯤 사용하고 있는 라이브러리의 소스 코드를 직접 열어보기를 권한다. 공식 문서에는 없는 깊이를 발견할 수 있을 것이다.

### 아 그리고 새로운 소식

![7.jpeg](7.jpeg)

위 내용을 찾아보다 알게 된 사실인데, **Zustand가 5버전을** 준비하고 있었다.

주요 변경사항은 아래와 같다. (자세한 내용은 **[릴리즈 페이지](https://github.com/pmndrs/zustand/releases)**를 참고하기 바란다.)

- **React 18, TypeScript 4.5 이상**으로 최소 요구사항이 변경되었다.
- **`getServerState`가 삭제**되었다.
- **ES5 지원이 중단** 예정이다.
- 반복 가능한 객체로 **`shallow` 함수가 개선**되고 있다.

### 참고자료

- [Zustand GitHub](https://github.com/pmndrs/zustand/tree/main/src)
- [React useSyncExternalStore 문서](https://react.dev/reference/react/useSyncExternalStore)

```toc

```
