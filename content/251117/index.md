---
emoji: 🛡️
title: '에러 핸들링'
date: '2025-11-17'
categories: 프론트엔드 React TanStack-Query 에러핸들링
---

이번 포스팅에서는 **프론트엔드에서 에러를 어떻게 잡아낼 것인가**에 대한 이야기를 해보려고 한다.

필자는 실무를 하면서 에러 핸들링 코드를 짤 때마다 묘한 찜찜함을 느낀 적이 많다. 어떤 에러는 `try/catch`로 잡고, 어떤 에러는 `ErrorBoundary`가 잡고, 또 어떤 에러는 TanStack Query의 `onError`가 잡는다. 그리고 각자의 영역이 미묘하게 겹치거나 어긋난다. 그래서 어떤 날은 에러가 새어나가고, 어떤 날은 원하지 않는 곳까지 에러가 전파되는 것을 보곤한다.

문제는 이런 도구들의 동작 방식을 한 번에 정리해 본 적이 별로 없다는 것이다. "Error Boundary는 렌더 단계의 에러만 잡는다"는 사실은 알지만, 그게 실제로 어떤 의미인지, `reset`을 호출하면 내부적으로 무슨 일이 벌어지는지, `throwOnError`가 켜졌을 때 TanStack Query가 어떤 시점에 에러를 다시 던지는지를 정확히 답하라고 하면 입을 다물게 된다.

이 글에서는 React의 공식 가이드, `react-error-boundary` 라이브러리, TanStack Query v5의 공식 문서를 기반으로, 프론트엔드 에러 핸들링의 각 도구가 **어디까지 책임지는지** 그리고 **어떻게 결합하는지** 를 정리해보려고 한다.


## React가 잡을 수 있는 에러, 잡을 수 없는 에러

가장 기초적인 질문부터 시작하자. **React는 어떤 에러를 잡아주는가?**

React 공식 문서는 Error Boundary가 잡을 수 있는 에러와 그렇지 않은 에러를 명확히 구분한다.

**Error Boundary가 잡는 영역**

- 자식 컴포넌트의 **렌더링(render)** 도중에 발생한 에러
- **생명주기 메서드(lifecycle method)** 안에서 발생한 에러
- **생성자(constructor)** 에서 발생한 에러

**Error Boundary가 잡지 못하는 영역**

- **이벤트 핸들러(event handler)** 내부의 에러
- `setTimeout`, `requestAnimationFrame`, **Promise 등 비동기 코드**의 에러
- **서버 사이드 렌더링(SSR)** 도중의 에러
- **Error Boundary 자기 자신**에서 발생한 에러

이 구분이 왜 중요할까? 우리가 평소에 다루는 에러의 대부분은 사실 **두 번째 카테고리에 속한다.** 버튼을 클릭해서 mutation을 호출했더니 서버가 500을 뱉었다거나, `useEffect` 안에서 fetch가 실패했다거나, 폼을 제출하다가 검증 로직이 throw를 했다거나. 이런 에러들은 React가 알아서 잡아주지 않는다. 우리가 명시적으로 잡아서 처리해야 한다.

그래서 프론트엔드 에러 핸들링은 두 갈래로 나뉜다. **렌더 단계의 에러는 Error Boundary로**, **그 외의 에러는 try/catch나 라이브러리의 콜백으로**. 이 두 갈래가 교차하는 지점에서 TanStack Query 같은 비동기 상태 관리 라이브러리가 다리 역할을 한다.


## Error Boundary의 정체

Error Boundary는 결국 두 개의 라이프사이클 메서드를 가진 **클래스 컴포넌트**이다. React 공식 문서에 따르면, Error Boundary가 되기 위해서는 다음 두 메서드 중 하나(보통은 둘 다)를 구현해야 한다.

```js
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  // 에러 발생 시 state를 업데이트해 다음 렌더에서 fallback UI를 보여준다
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  // 에러가 발생한 직후에 호출. 로깅 같은 사이드이펙트는 여기서 처리한다
  componentDidCatch(error, info) {
    logErrorToMyService(error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
```

`getDerivedStateFromError`는 **순수 함수**여야 한다. 사이드이펙트 없이 새로운 state만 반환하는 역할이다. 반면 `componentDidCatch`는 사이드이펙트를 위한 자리이다. Sentry로 에러를 전송한다거나, 콘솔에 컴포넌트 스택을 찍는 일은 여기서 한다.

여기서 중요한 점이 하나 있다. 이 두 메서드는 **클래스 컴포넌트에만 존재한다.** 함수 컴포넌트로 Error Boundary를 만들 수 있는 공식적인 방법은 아직 없다. React 공식 문서도 이 점을 명시한다. 

> No direct equivalent exists for Error Boundaries in function components. For function components, use [`react-error-boundary`](https://github.com/bvaughn/react-error-boundary) package.

매번 클래스 컴포넌트를 직접 작성하는 것은 번거로우니, 보통은 `react-error-boundary` 라이브러리를 사용하게 된다. (React 메인테이너 중 한 명이었던 Brian Vaughn이 직접 만든 라이브러리이고, 사실상 표준처럼 쓰인다.)


## react-error-boundary의 3가지 fallback

`react-error-boundary`의 `ErrorBoundary` 컴포넌트는 fallback UI를 지정하는 prop을 **세 가지 방식**으로 제공한다. 사용하는 방법에 대해 가볍게 살펴보자.


### fallback

가장 단순한 형태이다. 그냥 정적인 JSX를 넘긴다.

```tsx
<ErrorBoundary fallback={<div>문제가 발생했습니다.</div>}>
  <Page />
</ErrorBoundary>
```

에러 객체나 reset 함수에 접근할 필요가 없는 경우에 쓴다. 보통은 에러 메시지나 재시도를 위한 행위가 필요하기 때문에 아직까지 실무에서 사용해본적이 없다. 


### FallbackComponent

fallback UI를 별도의 컴포넌트로 분리하고, 그 **참조**를 넘긴다.

```tsx
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert">
      <p>오류가 발생했습니다.</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>다시 시도</button>
    </div>
  );
}

<ErrorBoundary FallbackComponent={ErrorFallback}>
  <Page />
</ErrorBoundary>
```

에러 객체와 `resetErrorBoundary` 함수가 props로 자동 주입된다. fallback UI를 다른 곳에서도 재사용할 가능성이 있다면 이 방식이 깔끔하다.


### fallbackRender

인라인으로 fallback을 그리고 싶을 때 쓴다.

```tsx
<ErrorBoundary
  fallbackRender={({ error, resetErrorBoundary }) => (
    <div role="alert">
      <p>오류가 발생했습니다: {error.message}</p>
      <button onClick={resetErrorBoundary}>다시 시도</button>
    </div>
  )}
>
  <Page />
</ErrorBoundary>
```

`FallbackComponent`와 본질적으로 같은 일을 하지만, **별도 컴포넌트를 만들지 않고 인라인으로 처리**할 수 있다. 외부 클로저(부모의 state, 핸들러 등)에 접근해야 할 때 유용하다.

세 가지 중 정답은 없지만, 필자가 실무에서 자주 쓰는 패턴은 **공통 ErrorFallback 컴포넌트를 하나 만들어두고 `FallbackComponent`로 주입**하는 방식이다. 디자인 시스템과 톤이 일관되어야 하기 때문이다. 페이지마다 다른 fallback이 필요한 경우에만 `fallbackRender`로 인라인 작성한다.


## reset은 실제로 무엇을 하는가?

`react-error-boundary`를 쓰다 보면 자연스럽게 만나는 함수가 `resetErrorBoundary`이다. fallback에서 "다시 시도" 버튼을 누르면 호출되는 그 함수 말이다. 이 함수가 실제로 무엇을 하는지 알아보자.

결론부터 말하면, `resetErrorBoundary`는 **자기 자신의 상태를 초기화하고 children을 다시 렌더링하라**고 ErrorBoundary 컴포넌트에 신호를 보낼 뿐이다. TanStack Query의 캐시와 같은 외부의 어떤 상태도 자동으로 건드리지 않는다.

내부적으로 일어나는 일을 단계별로 풀면 다음과 같다.

1. `resetErrorBoundary()`가 호출된다.
2. ErrorBoundary 내부의 `hasError` 상태가 `false`로 돌아간다.
3. (선택) `onReset` 콜백이 실행된다. 사용자 정의 사이드이펙트가 여기서 일어난다.
4. children이 다시 렌더링된다. 만약 에러를 발생시킨 원인(상태, 캐시 등)이 그대로 남아 있다면, **다시 같은 에러가 던져진다.**

마지막 4번이 핵심이다. **reset은 "에러를 잊어버리고 다시 그려보자"는 의미일 뿐, "에러를 일으킨 원인을 고친다"는 의미가 아니다.** 그래서 reset만 해서는 같은 에러가 무한히 반복될 수 있다.

이 문제를 해결하기 위해 두 가지 도구가 더 있다.


### onReset

reset이 일어나기 직전에 호출되는 훅 역할을 한다. 여기서 에러의 원인이 된 외부 상태를 정리한다.

```tsx
<ErrorBoundary
  FallbackComponent={ErrorFallback}
  onReset={() => {
    queryClient.invalidateQueries({ queryKey: ['user'] });
  }}
>
  <Page />
</ErrorBoundary>
```


### resetKeys

배열에 담긴 값들이 바뀌면 ErrorBoundary가 자동으로 reset된다. URL 파라미터, 검색어, 선택된 탭 같이 "이 값이 바뀌었다면 다시 시도해도 의미 있다"라고 판단할 수 있는 키를 넘긴다.

```tsx
<ErrorBoundary
  FallbackComponent={ErrorFallback}
  resetKeys={[userId]}
>
  <UserProfile userId={userId} />
</ErrorBoundary>
```

`userId`가 바뀌면 자동으로 reset이 일어나고 children이 다시 렌더링된다. 사용자가 다른 프로필로 이동하면 이전 에러는 자연스럽게 사라진다.


## 이벤트 핸들러와 비동기 에러는 어떻게 잡을까?

앞서 Error Boundary는 이벤트 핸들러와 비동기 코드의 에러를 잡지 못한다고 했다. 그런데 우리가 다루는 에러의 대부분이 거기서 발생한다. 그럼 어떻게 해야 할까?

`react-error-boundary`는 이 문제를 위해 **`useErrorBoundary` 훅**을 제공한다. 이 훅은 `showBoundary`라는 함수를 반환하는데, 이걸 호출하면 가장 가까운 ErrorBoundary로 에러를 강제로 던질 수 있다.

```tsx
import { useErrorBoundary } from 'react-error-boundary';

function MyComponent() {
  const { showBoundary } = useErrorBoundary();

  const handleClick = async () => {
    try {
      await someAsyncOperation();
    } catch (error) {
      showBoundary(error);
    }
  };

  return <button onClick={handleClick}>실행</button>;
}
```

핵심은 **개발자가 명시적으로 끌어올려야 한다**는 점이다. React가 알아서 해주지 않는다. 비동기 에러를 ErrorBoundary 영역으로 옮기고 싶다면 `try/catch`로 잡아서 `showBoundary`로 넘겨야 한다.

이 패턴을 알고 있으면 "왜 어떤 에러는 ErrorBoundary가 잡고 어떤 에러는 못 잡는가"라는 의문이 깔끔히 해결된다. 답은 단순하다. **"렌더 단계까지 끌어올렸는가, 아닌가"** 이다.


## TanStack Query는 에러를 어떻게 다루는가?

여기까지 정리하고 나면 자연스럽게 떠오르는 질문이 있다. 우리가 매일 쓰는 `useQuery`는 비동기 요청을 다루는데, 그 안에서 발생한 에러는 어떻게 처리되는 걸까?

TanStack Query는 기본적으로 **에러를 `error` 필드로 노출**한다.

```tsx
const { data, error, isError } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
});

if (isError) {
  return <div>에러: {error.message}</div>;
}
```

이게 가장 단순한 형태이다. 에러가 발생해도 컴포넌트는 정상적으로 렌더링되며, 단지 `error` 필드에 값이 들어있을 뿐이다. ErrorBoundary는 끼어들지 않는다.

여기서 중요한 사실 하나를 짚고 넘어가자. **TanStack Query의 기본 동작은 "에러를 던지지 않는다"이다.** queryFn에서 throw를 하든 reject를 하든, 그 에러는 `error` 필드로 들어갈 뿐 React의 렌더 흐름을 깨지 않는다. 그래서 별다른 설정 없이는 ErrorBoundary가 절대로 동작하지 않는다.

그리고 또 하나, TanStack Query는 **기본적으로 에러를 자동으로 3번 재시도**한다.

기본 `retryDelay`는 지수 백오프(exponential backoff) 방식이며, 최대 30초까지 늘어난다. 즉 처음 실패해도 사용자에게 즉시 에러가 보이지 않는다. 1초, 2초, 4초 간격으로 재시도하다가, 그래도 실패하면 그제서야 `error` 필드가 채워진다. (개발 중에 "왜 에러가 늦게 나오지?"라고 의아했던 경험이 있다면 십중팔구 이것 때문이다.)


### throwOnError로 ErrorBoundary와 연결하기

그럼 TanStack Query의 에러를 ErrorBoundary로 흘려보내려면 어떻게 해야 할까? 답은 **`throwOnError`** 옵션이다. (v4까지는 `useErrorBoundary`라는 이름이었는데, v5에서 `throwOnError`로 바뀌었다.)

```tsx
const { data } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  throwOnError: true,
});
```

이 옵션이 켜지면 TanStack Query가 에러를 **다음 렌더 사이클에서 다시 throw**한다. 그러면 그 throw가 렌더 단계의 에러가 되고, ErrorBoundary가 비로소 잡을 수 있게 된다.

`throwOnError`는 함수 형태로도 받을 수 있다. 어떤 에러는 ErrorBoundary로 보내고, 어떤 에러는 컴포넌트가 직접 처리하게 분기할 수 있다.

```tsx
useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  // 5xx 서버 에러만 ErrorBoundary로 보낸다
  throwOnError: (error) => error.response?.status >= 500,
});
```

이 패턴이 실용적인 이유는, **4xx 같은 클라이언트 에러(예: 입력 검증 실패, 권한 없음)** 는 보통 그 자리에서 메시지를 보여주는 게 자연스럽고, **5xx 같은 서버 에러**는 페이지 전체를 가리고 "잠시 후 다시 시도해주세요"를 보여주는 게 적절하기 때문이다.


### useSuspenseQuery

만약 `useSuspenseQuery`를 쓰고 있다면 `throwOnError`를 신경 쓸 필요가 없다. Suspense 모드에서는 **에러가 항상 던져지는 것이 기본 동작**이다. 

즉, `useSuspenseQuery`를 쓴다는 것은 곧 **로딩은 Suspense가, 에러는 ErrorBoundary가** 처리한다는 뜻이다. 컴포넌트 내부에서 `if (isError)`나 `if (isLoading)` 같은 분기문을 쓸 필요가 없어지고, 대신 외부에서 두 경계로 감싸야 한다.


## QueryErrorResetBoundary

자, 여기까지 읽으면 또 하나의 질문이 떠오른다. 사용자가 fallback에서 "다시 시도" 버튼을 누르면 어떻게 될까?

앞서 봤듯이 `resetErrorBoundary`는 그저 ErrorBoundary의 `hasError` 상태만 초기화한다. 그런데 TanStack Query의 캐시에는 여전히 **에러 상태로 굳어버린 쿼리**가 남아있다. children이 다시 렌더링되면, TanStack Query는 캐시를 보고 "아, 이 쿼리 이미 에러야"라고 판단해서 즉시 같은 에러를 다시 던진다. (지옥의 무한 루프이다.)

이 문제를 해결하려고 TanStack Query는 **`useQueryErrorResetBoundary`** 훅과 **`QueryErrorResetBoundary`** 컴포넌트를 제공한다. 이름이 길지만 하는 일은 단순하다. **"이 영역 안의 쿼리들의 에러 상태를 리셋해라"** 는 명령을 내리는 것이다.

```tsx
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

function App() {
  const { reset } = useQueryErrorResetBoundary();

  return (
    <ErrorBoundary
      onReset={reset}
      fallbackRender={({ resetErrorBoundary }) => (
        <div>
          <p>에러가 발생했습니다.</p>
          <button onClick={resetErrorBoundary}>다시 시도</button>
        </div>
      )}
    >
      <Page />
    </ErrorBoundary>
  );
}
```

여기서 일어나는 일을 시간순으로 풀어보자.

1. 사용자가 "다시 시도" 버튼 클릭 → `resetErrorBoundary()` 호출
2. ErrorBoundary가 `onReset` 콜백을 실행 → `reset()` 호출 (TanStack Query의 에러 상태 초기화)
3. ErrorBoundary가 자기 상태를 초기화하고 children 다시 렌더링
4. children 안의 `useQuery`가 동작 → 에러 상태가 사라졌으니 다시 fetch 시도

핵심은 `onReset`에 `reset`을 연결한 부분이다. 이 한 줄 덕분에 ErrorBoundary와 TanStack Query가 서로의 상태를 동기화한다.


### 컴포넌트 형태로 쓰는 경우

훅 대신 컴포넌트로도 같은 일을 할 수 있다. 둘 중 하나만 쓰면 된다.

```tsx
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

function App() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <div role="alert">
              <p>에러가 발생했습니다: {error.message}</p>
              <button onClick={resetErrorBoundary}>다시 시도</button>
            </div>
          )}
        >
          <Page />
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
```

훅 버전과의 가장 큰 차이는 **render prop 패턴**으로 `reset` 함수를 자식에게 내려준다는 점이다. `QueryErrorResetBoundary`는 자신의 children으로 함수를 받아 `{ reset }`을 인자로 넘기고, 그 함수의 반환값을 렌더링한다. 그래서 그 안에서 곧바로 `onReset={reset}`으로 연결할 수 있다.

훅 버전은 가장 가까운 `QueryErrorResetBoundary`가 없으면 **전역 캐시의 에러를 리셋**한다. 컴포넌트 버전은 자신의 자식 영역으로만 reset 범위를 제한한다. 영역을 좁게 통제하고 싶다면 컴포넌트 버전이 안전하다.

여기서 한 가지 짚고 넘어가자. **reset은 캐시를 지우지 않는다.** 데이터를 통째로 날리는 게 아니라, "에러로 표시된 쿼리들의 에러 상태를 풀어준다"에 가깝다. 데이터를 진짜로 무효화하고 싶다면 `queryClient.invalidateQueries()`를 별도로 호출해야 한다.


## Mutation의 에러

지금까지 이야기한 패턴들은 거의 다 `useQuery` 기준이었다. 그런데 **`useMutation`은 사정이 좀 다르다.**

가장 큰 차이는, mutation은 보통 **사용자의 명시적인 액션(클릭, 제출)** 으로 시작된다는 점이다. 그래서 에러도 그 액션에 가까운 곳에서 처리하는 게 자연스럽다. 페이지 전체를 fallback으로 가리는 것보다는, 토스트 메시지나 폼 옆의 에러 텍스트로 "결제 실패: 카드 정보를 다시 확인해주세요" 같이 보여주는 게 맞다.

TkDodo의 [Mastering Mutations in React Query](https://tkdodo.eu/blog/mastering-mutations-in-react-query)에서는 이 차이의 본질을 한 줄로 정리한다. **Query는 선언적(declarative)이고, Mutation은 명령적(imperative)이다.** Query는 컴포넌트가 마운트되면 알아서 실행되고, 같은 키를 다른 컴포넌트도 함께 구독하며, 캐시되어 재사용된다. 반면 mutation은 사용자가 버튼을 눌러야 비로소 실행되고, 캐시되지도 않으며, 호출한 컴포넌트 인스턴스와 일대일로 묶인다. 이 본질적 차이가 에러 처리 방식을 둘로 가른다.

`useQuery`의 기본 `retry`는 `3`이지만, **`useMutation`의 기본 `retry`는 `0`이다.** 이유는 단순하다. mutation은 **부수효과(side effect)** 를 일으키기 때문이다. 결제 요청이 네트워크 타임아웃으로 실패했을 때, 라이브러리가 알아서 두 번 더 호출해버리면 사용자의 카드가 세 번 긁힐지도 모른다.

그래서 mutation의 재시도는 개발자가 **그 작업이 멱등(idempotent)하다고 확신할 수 있는 경우에만** 명시적으로 켜는 것이 원칙이다. 같은 요청을 두 번 보내도 결과가 같음이 보장되는 GET 류의 안전한 조회나, 서버에서 멱등성 키(idempotency key)를 받아 중복을 막아주는 경우에 한해 그렇다.

`useQuery`의 에러는 **캐시에 박힌다**. 그래서 같은 `queryKey`를 구독하는 다른 컴포넌트에도 즉시 전파되고, `QueryErrorResetBoundary` 같은 장치로 일괄 리셋해줘야 했다.

mutation은 다르다. 한 컴포넌트의 mutation 인스턴스에서 실패한 에러는 **그 인스턴스의 상태로만 남는다.** 같은 `mutationFn`을 쓰는 다른 컴포넌트의 mutation에는 어떤 영향도 주지 않는다. 그래서 TanStack Query에는 `MutationErrorResetBoundary` 같은 게 없다. **있을 필요가 없어서**다.

이 차이가 실무에 미치는 영향이 하나 있다. 같은 `useMutation`을 호출하는 컴포넌트가 두 개 있을 때, 한쪽에서 발생한 에러는 다른 쪽에서 보이지 않는다. 만약 "이 mutation의 에러를 앱 전역에서 알고 싶다"면 컴포넌트 단위 `onError`로는 부족하고, `MutationCache.onError`로 끌어올려야 한다.


### mutate vs mutateAsync

`useMutation`은 두 가지 실행 함수를 반환한다. 이 둘의 차이가 에러 핸들링 방식을 가른다.

mutate 의 반환 타입은 `void`다. Promise를 반환하지 않는다. 그렇기에 await으로 결과를 기다릴 수 없고, 호출 결과는 `onSuccess/onError` 같은 콜백을 통해서만 받을 수 있다.


```tsx
const mutation = useMutation({
  mutationFn: createPost,
  onError: (error) => {
    toast.error(`등록 실패: ${error.message}`);
  },
});

mutation.mutate(newPost);
```


그에 반해 `mutateAsync` 는 Promise를 반환한다. `try/catch`로 에러를 처리할 수 있다.

```tsx
const mutation = useMutation({ mutationFn: createPost });

const handleSubmit = async () => {
  try {
    const result = await mutation.mutateAsync(newPost);
    router.push(`/posts/${result.id}`);
  } catch (error) {
    // 여기서 처리
  }
};
```

언제 어떤 걸 써야 할까? 필자는 다음 기준으로 구분한다.

- **mutation이 끝난 뒤 후속 동작이 필요하다**(예: 성공 시 라우팅, 결과값 사용) → `mutateAsync`
- **단순히 호출만 하고 사이드이펙트는 콜백에 맡긴다**(예: 좋아요 토글, 토스트만 띄우면 됨) → `mutate` + `onError`

여기서 한 가지 흔한 실수가 있다. **`mutateAsync`를 쓰면서 `try/catch`를 안 두면 unhandled promise rejection이 발생한다.** 콜백 기반인 `mutate`는 알아서 에러를 흡수하지만, `mutateAsync`는 호출자에게 에러를 던지는 게 기본 동작이다. 이 차이를 모르고 섞어 쓰면 콘솔이 빨간 경고로 가득 찬다.


### onError

또 하나 자주 놓치는 디테일이 있다. `useMutation`의 `onError`는 **두 군데**(hook, mutate)에 정의할 수 있다.

```tsx
const mutation = useMutation({
  mutationFn: createPost,
  onError: (error) => {
    Sentry.captureException(error);
  },
});
```

hook level에서는 항상 실행되지만, mutate level 에서는 호출시점에만 실행된다.

```tsx
mutation.mutate(newPost, {
  onError: (error) => {
    setFormError(error.message);
  },
});
```

공식 문서가 명시하는 실행 순서는 이렇다. **hook level → mutate level.** 두 콜백이 모두 정의되어 있으면 hook level이 먼저, 그 다음 mutate level이 실행된다.


## 전역 에러 핸들링

지금까지의 패턴은 모두 컴포넌트 레벨이었다. 그런데 "모든 쿼리 에러를 한 곳에서 로깅하고 싶다"거나, "401 에러는 무조건 로그아웃 처리하고 싶다" 같은 요구사항이 있을 수 있다. 이런 횡단 관심사는 **QueryClient를 만들 때 `QueryCache`/`MutationCache`에 콜백을 다는 방법이 있다**

```tsx
import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.state.data !== undefined) {
        toast.error(`데이터 갱신 실패: ${error.message}`);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (error.status === 401) {
        redirectToLogin();
      }
    },
  }),
});
```

`QueryCache.onError`는 **각 쿼리에 대해 한 번만** 호출된다는 점이 핵심이다. 같은 쿼리를 여러 컴포넌트가 구독하고 있어도 콜백은 한 번만 실행되기 때문에, 토스트 중복 같은 문제가 일어나지 않는다.

위 예시처럼 `query.state.data !== undefined`를 검사하는 방법도 있다. **이미 캐시된 데이터가 있는 상태에서의 refetch 실패**라면, 사용자는 어쨌든 화면에서 데이터를 보고 있다. 이때 ErrorBoundary로 페이지를 가리는 건 과잉이다. 사용자에게 실패 여부만 알려주는 게 적절하다. 반대로 캐시된 데이터가 없는 첫 로드에서 실패한 경우라면, ErrorBoundary가 잡아서 fallback을 보여주는 게 맞다.

이 두 흐름을 결합하면 "초기 로드 실패는 ErrorBoundary, 백그라운드 refetch 실패는 토스트"라는 깔끔한 정책을 설계할 수 있다.


## 공통 컴포넌트

여기까지 읽으면 한 가지 욕심이 생긴다. 매번 `QueryErrorResetBoundary`, `ErrorBoundary`, `Suspense`를 세 겹으로 감싸는 게 번거로우니, **하나의 컴포넌트로 묶어서 재사용**하면 어떨까?

자연스러운 발상이다. 실제로 필자도 예전에 다음과 같은 `AsyncBoundary` 컴포넌트를 만들어서 쓴 적이 있다.

```tsx
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { Suspense, type ComponentType, type ReactNode } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { ErrorFallback } from './ErrorFallback';
import { Spinner } from './Spinner';

interface Props {
  children: ReactNode;
  pendingFallback?: ReactNode;
  rejectedFallback?: ComponentType<FallbackProps>;
}

export function AsyncBoundary({
  children,
  pendingFallback = <Spinner />,
  rejectedFallback = ErrorFallback,
}: Props) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} FallbackComponent={rejectedFallback}>
          <Suspense fallback={pendingFallback}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
```

페이지에서는 이렇게 한 줄로 끝낼 수 있다.

```tsx
<AsyncBoundary>
  <Content />
</AsyncBoundary>
```

깔끔해 보인다. 그런데 동료에게 다음과 같은 피드백을 받았다.

> AsyncBoundary라는 이름이 그렇게까지 대명사처럼 쓰이는 것이 아니라서 안에 뭐가 있든 크게 어색하진 않을 것 같은데, **React Query의 ResetBoundary도 있다는 건 조금 예상하기 어려울 것 같긴 하네요.**

> 그리고 `pendingFallback`이랑 `rejectedFallback`에 기본값이 들어있는 것도 좀 걸려요. `<AsyncBoundary>` 한 줄만 봐서는 안에 어떤 fallback이 깔리는지 알 수가 없으니까, **이게 props 기본값이라는 사실 자체를 인지하지 못할 것 같아요.**


### 이름이 의존성을 숨긴다

이 컴포넌트의 이름은 `AsyncBoundary`이다. 비동기 경계라는 의미만 풍긴다. 그런데 내부 구현은 **TanStack Query에 강하게 결합**되어 있다. `QueryErrorResetBoundary`가 들어있고, `onReset`에 `reset`이 연결되어 있다. 즉 이 컴포넌트는 사실 **"React Query를 쓰는 비동기 영역을 위한 경계"** 인데, 이름은 그것을 전혀 드러내지 않는다.

이게 왜 문제일까? **읽는 사람의 예측을 어긋나게** 만들기 때문이다. 코드는 한 줄씩 해석하는 게 아니라 경험에서 쌓인 패턴으로 **예측**하며 읽는다. 예측이 어긋날 때 인지 부하가 급격히 올라간다.

`AsyncBoundary`라는 이름을 처음 본 동료가 머릿속에 그리는 그림은 "그냥 비동기 처리에 쓰는 일반적인 경계"이다. SWR을 쓸 때도, fetch를 직접 쓸 때도 가져다 쓸 수 있을 것 같다. 그런데 실제로는 `QueryErrorResetBoundary`가 박혀 있어서 **TanStack Query를 안 쓰는 컨텍스트에서는 의미 없는 결합**이 따라온다. 이름과 구현 사이에 균열이 있는 것이다.

이런 상황을 추상화 누수(leaky abstraction)의 반대 방향이라고 볼 수 있다. 일반적인 누수는 "추상화 뒤에 숨겼어야 할 디테일이 새어나오는 것"이지만, 여기서는 **있어야 할 의존성이 이름 뒤에 너무 잘 숨어버렸다.** 더 나쁜 종류일지도 모른다. (모르고 갖다 쓰니까.)


### 이름에 의존성을 드러낸다

가장 단순한 처방은 이름을 바꾸는 것이다. `AsyncBoundary` 대신 **`QueryAsyncBoundary`** 같이 의존성을 이름에 명시한다. 토스가 직접 만든 [Suspensive](https://suspensive.org/) 라이브러리를 살펴보니 의존성을 명시했다. `@suspensive/react`에는 일반적인 `ErrorBoundary`와 `Suspense`만 있고, TanStack Query와 결합한 컴포넌트는 별도 패키지인 `@suspensive/react-query`의 `QueryAsyncBoundary`로 분리되어 있다.

이 한 글자 차이가 코드를 읽는 사람에게 주는 정보량은 크다. `Query`라는 접두어가 있는 순간, **"아, 이건 TanStack Query 환경 전용이구나"** 가 즉시 전달된다. 잘못된 컨텍스트에 갖다 쓰는 실수를 사전에 차단한다.


### 합성 가능한 단위로 분해한다

조금 더 근본적인 접근은 **묶지 않는 것**이다.

ErrorBoundary와 Suspense는 본질적으로 **다른 관심사**이며, 묶어서 하나의 컴포넌트로 만들어버리면 합성의 유연성을 잃을 수 있다. 어떤 페이지는 ErrorBoundary만 필요할 수 있고, 어떤 페이지는 Suspense만 필요할 수 있고, 어떤 페이지는 두 개의 Suspense를 한 ErrorBoundary 안에 넣고 싶을 수도 있다. `AsyncBoundary`로 묶어버리면 이런 변형이 어색해진다. 하지만 분리해두면 자유롭게 합성할 수 있다.

이 패턴은 코드가 한 줄 더 길어지지만, **각 경계가 무엇을 책임지는지 코드에서 그대로 읽힌다**는 장점이 있다. 그리고 `useSuspenseQuery`를 쓸 때 보통 한 번에 처리하고 싶은 단위와 에러를 잡고 싶은 단위가 다르기 때문에, 분리되어 있을 때 더 자연스럽다.

필자가 내린 결론은 이렇다. **반복되는 합성 패턴이 정말 똑같다면 묶고, 변형이 필요하다면 분리한다.** 그리고 묶더라도 이름에서 의존성이 드러나도록 한다. 이 두 가지 원칙만 지켜도 "AsyncBoundary 안에 뭐가 있는지 모르겠다"는 리뷰 피드백을 받을 일은 줄어든다.


### Default Props

이름의 문제만 잡는 것으로는 부족하다. 위 코드를 다시 보자.

```tsx
pendingFallback = <Spinner />,
rejectedFallback = ErrorFallback,
```

`<QueryAsyncBoundary>...</QueryAsyncBoundary>`라고 한 줄만 써도 동작하는 이유는 안에 `Spinner`와 `ErrorFallback`이 자동으로 깔리기 때문이다. **이름을 보고 예상할 수 있는 정보가 아니다.**

이건 앞서 비판한 "이름이 의존성을 숨긴다"의 또 다른 버전이다. 이름은 `Query` 접두어로 의존성을 드러내도록 고쳤지만, `Spinner`와 `ErrorFallback`이라는 UI 의존성은 default prop 뒤에 그대로 숨어 있다. **숨김의 위치가 한 단계 안쪽으로 옮겨갔을 뿐**이다.

해결은 단순하다. **두 fallback을 required prop으로 두고 호출 지점에서 매번 주입한다.**

```tsx
interface Props {
  children: ReactNode;
  pendingFallback: ReactNode;                    
  rejectedFallback: ComponentType<FallbackProps>;
}
```

```tsx
<QueryAsyncBoundary
  pendingFallback={<Spinner />}
  rejectedFallback={ErrorFallback}
>
  <Content />
</QueryAsyncBoundary>
```

코드가 두 줄 길어진다. 그 비용을 받아들이는 이유는 분명하다. **작성하는 사람의 비용을 늘리는 대신, 읽는 모든 사람의 추적 비용을 줄이는 방법이다.** 호출 지점에서 어떤 fallback이 뜨는지가 그 자리에서 바로 보인다. "이 컴포넌트의 기본값이 뭐였더라?"를 다른 파일을 열어 확인할 필요가 없다. 코드는 작성보다 읽히는 횟수가 훨씬 많다는 익숙한 명제가 여기서도 그대로 작동한다.


## ErrorFallback

또 하나 짚어볼 부분이 있다. 보통 `ErrorFallback`은 다음과 같이 단일 컴포넌트로 만들어둔다.

```tsx
const DEFAULT_ERROR_MESSAGE = '문제가 발생했어요. 잠시 후 다시 시도해주세요';

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const message = getErrorMessage(error, DEFAULT_ERROR_MESSAGE);

  return (
    <Flex direction="column" alignItems="center" role="alert" aria-live="assertive">
      <Text>{message}</Text>
      <Spacing size={16} />
      <Button onClick={resetErrorBoundary}>다시 시도</Button>
    </Flex>
  );
}
```

`role="alert"`과 `aria-live="assertive"`까지 챙겨둔 깔끔한 구현이다. 그런데 한 가지 질문을 던져보자. **"401이든 404든 500이든 네트워크 끊김이든, 같은 화면을 보여줘도 괜찮은가?"**

답은 대부분의 경우 **아니다**이다. 사용자가 취해야 할 행동이 에러 종류마다 다르기 때문이다.

| 에러 종류 | 사용자 행동 | "다시 시도"가 의미 있는가? |
| --- | --- | --- |
| 네트워크 단절 | 연결 확인 후 재시도 | O |
| 5xx 서버 에러 | 잠시 후 재시도 | O |
| 401 인증 실패 | 로그인 화면으로 이동 | X |
| 403 권한 없음 | 다른 화면으로 이동 | X |
| 404 리소스 없음 | 목록으로 돌아가기 | △ |
| 422 검증 실패 | 입력값 수정 | X |

"다시 시도" 버튼을 모든 케이스에 보여주는 건, **사용자에게 "그 에러를 해결할 수 있는 행동"** 을 잘못 안내하는 셈이다. 401 에러에서 "다시 시도"를 눌러봐야 같은 401이 또 뜬다. 사용자가 진짜로 해야 할 행동은 로그인이다.

그래서 에러 fallback은 **에러의 종류에 따라 다르게 그려져야** 한다. 처음부터 거대한 `if/else`로 처리할 필요는 없고, 작은 단위 컴포넌트들을 만들어두고 분기하면 된다.

각 fallback 컴포넌트는 그 에러에 적합한 메시지와 행동만 노출한다. 사용자가 실제로 취할 수 있는 행동만 화면에 남는다.


### shouldCatch

여기서 한 발 더 나아가면, **"잡을 에러"와 "흘려보낼 에러"를 컴포넌트 레벨에서 구분**하는 패턴도 있다. Suspensive의 `ErrorBoundary`는 `shouldCatch` prop을 제공한다.

```tsx
<ErrorBoundary
  shouldCatch={(error) => isHttpError(error) && error.status >= 500}
  fallback={ServerErrorFallback}
>
  <ErrorBoundary shouldCatch={NetworkError} fallback={NetworkErrorFallback}>
    <Page />
  </ErrorBoundary>
</ErrorBoundary>
```

안쪽 ErrorBoundary는 네트워크 에러만 잡고, 5xx 에러는 안 잡는다. 안 잡힌 에러는 React의 기본 동작에 따라 **상위 ErrorBoundary로 올라간다.** 그래서 바깥쪽 ErrorBoundary에서 5xx를 잡게 되는 식이다. 같은 에러 처리를 if/else로 짜는 것보다 **경계 자체에 의미를 부여**할 수 있다는 점이 매력이다.

`react-error-boundary` 에는 이 prop이 없지만, 같은 효과를 fallback 안에서 분기하는 방식으로 구현할 수 있다. 패턴 자체가 중요하지 라이브러리가 중요한 게 아니다.


## 마무리

정리하면, 프론트엔드 에러 핸들링은 **하나의 도구로 끝나지 않는다**. 렌더 단계의 에러는 Error Boundary가, 이벤트 핸들러의 에러는 `try/catch`나 `showBoundary`가, 비동기 데이터 페칭의 에러는 TanStack Query의 `throwOnError`와 `useQueryErrorResetBoundary`가, mutation의 에러는 `mutateAsync`나 `onError`가, 횡단 관심사는 `QueryCache`/`MutationCache`가 책임진다. 그리고 그 위에 **공통 컴포넌트의 이름과 합성 단위**, **에러 타입 자체의 도메인 모델링**까지 함께 설계해야 비로소 일관된 에러 정책이 완성된다.

이 도구들이 각자 무엇을 책임지는지 알게 되면, 비로소 **"이 에러는 여기서 잡고, 저 에러는 저기로 흘려보낸다"** 는 결정을 명확하게 할 수 있다. 그리고 그 결정의 누적이 결국 사용자 경험의 안정성을 만든다. 흰 화면을 보지 않게 하는 일, 같은 토스트가 다섯 번 뜨지 않게 하는 일, 일시적인 네트워크 오류로 페이지 전체가 죽지 않게 하는 일, 401 에러에 "다시 시도" 대신 로그인 화면을 보여주는 일. 이런 디테일이 모여 "잘 만든 서비스"라는 인상을 만든다.

물론 모든 프로젝트에 모든 패턴이 다 필요한 건 아니다. 단순한 어드민 도구라면 ErrorBoundary 하나에 토스트 정도로 충분할 수 있고, 결제처럼 실수 한 번이 곧 돈인 도메인이라면 mutation 하나하나에 세밀한 에러 처리를 붙여야 할 것이다. 정답은 도메인이 결정한다.

이 글을 읽는 독자 분들도 자신의 프로젝트에서 "지금 우리 서비스는 어떤 에러를, 어디서, 어떤 이름의 컴포넌트로 잡고 있는가?"를 한 번쯤 점검해보시길 바란다. 잘 잡히고 있다고 믿었지만, 사실은 새어나가고 있거나 잘못된 fallback에 도달하고 있던 에러가 의외로 많을 수 있다. (필자도 매번 그랬다.)


## 참고 자료

- Component (Error Boundaries)](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [react-error-boundary GitHub](https://github.com/bvaughn/react-error-boundary)
- TanStack Query 공식 문서 [Suspense](https://tanstack.com/query/latest/docs/framework/react/guides/suspense), [Mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations), [QueryErrorResetBoundary](https://tanstack.com/query/latest/docs/framework/react/reference/QueryErrorResetBoundary), [useQueryErrorResetBoundary](https://tanstack.com/query/v5/docs/framework/react/reference/useQueryErrorResetBoundary), [Important Defaults](https://tanstack.com/query/v5/docs/framework/react/guides/important-defaults)
- TkDodo [React Query Error Handling](https://tkdodo.eu/blog/react-query-error-handling), [Breaking React Query's API on Purpose](https://tkdodo.eu/blog/breaking-react-querys-api-on-purpose)
- Toss [Suspensive](https://suspensive.org/), [@suspensive/react-query (QueryAsyncBoundary)](https://github.com/toss/suspensive)
- React Router [Error Boundaries (status-aware fallback)](https://reactrouter.com/how-to/error-boundary)
