---
emoji: 🛡️
title: '에러 전이'
seoTitle: "프론트엔드 에러 전이 경로, ErrorBoundary 와 throwOnError 가 받는 것"
date: '2025-11-17'
updatedAt: '2026-09-24'
categories: 프론트엔드 React TanStack-Query 에러핸들링
description: '같은 에러를 일곱 자리에서 던져 보면 넷만 ErrorBoundary 에 닿는다. 렌더와 생명주기, 컴파일 타임, 서버 데이터, 페이지 전환, 외부 라이브러리, 이벤트와 비동기가 각각 어디로 전이되는지를 공식 문서와 설치본 소스로 확인한다.'
keywords: "프론트엔드 에러 핸들링, 에러 전파, React ErrorBoundary, ErrorBoundary 가 못 잡는 것, startTransition 에러, unhandledrejection, window onerror, React 19 onCaughtError, TanStack Query throwOnError, useSuspenseQuery 에러, react-router ErrorBoundary loader, React.lazy 청크 로드 실패, fetch 는 404 에 거부하지 않는다"
---

이번 포스팅에서는 **프론트엔드에서 에러가 어디까지 올라가는가**에 대한 이야기를 해보려고 한다.

`ErrorBoundary` 를 그리는 일은 쉽다. 라우트에 하나 두고, 화면마다 `ErrorBoundary` 로 감싸고, 그림을 그리면 빈 곳이 없다. 어려운 것은 그 `ErrorBoundary` 가 **실제로 무엇을 받는지** 아는 것이다.

제목의 "전이" 는 **던져진 에러가 어느 자리까지 올라가 누가 받는가**를 뜻한다. 던진 자리와 받는 자리가 늘 같지 않아서 따로 세는 것이다.

그래서 세어 보기로 했다. 같은 `new Error('boom')` 을 자리만 바꿔 가며 일곱 번 던지고, 그것이 `ErrorBoundary` 에 닿는지 아니면 `ErrorBoundary` 를 지나쳐 어디로 가는지를 보았다.

아래 위젯이 그 실험이다. 왼쪽에서 던질 자리를 고르면 점선 상자 안에서 실제로 그 에러가 던져진다. 점선 상자가 `ErrorBoundary` 이고, `ErrorBoundary` 가 받으면 안이 fallback 으로 바뀐다. 받지 못한 것은 아무 일도 안 일어난 것처럼 보이므로, 위젯이 `window` 의 `error` 와 `unhandledrejection` 을 같이 듣고 그것이 어디로 갔는지 아래에 적는다.

:::widget-error-propagation
:::

일곱 중 넷만 `ErrorBoundary` 에 닿는다. 나머지 셋은 `ErrorBoundary` 안에서 던져졌는데도 `ErrorBoundary` 를 그대로 지나쳐 전역으로 나간다.

이 글에서는 그 갈림이 왜 생기는지를 에러의 종류별로 확인한다. 컴파일 타임에 끝나는 것, 렌더와 생명주기에서 나는 것, 서버 데이터에서 오는 것, 페이지 전환에서 나는 것, 외부 라이브러리가 던지는 것, 이벤트와 비동기에서 나는 것이다. 각각이 어디로 전이되는지를 알아보는 것이다. **받을 자리를 몇 층으로 나누고 어떻게 되돌릴지는 다루지 않는다.** 전이 경로를 모르고 층부터 그리면 그 층이 빈 상자가 되기 때문에 순서를 이렇게 잡았다.

확인은 두 가지로 했다. 라이브러리 동작은 기억이 아니라 설치본 소스를 열어 읽었고, 던져 보고 확인할 수 있는 것은 위 위젯으로 실제로 돌렸다.


## ErrorBoundary

먼저 `ErrorBoundary` 자체를 정확히 두자. `ErrorBoundary` 는 **클래스 컴포넌트의 생명주기 메서드 두 개**다. 다른 이름으로 부를 뿐이다.

`react-error-boundary` 에는 두 가지 구현체만 존재한다.

```js
static getDerivedStateFromError(e) { ... }
componentDidCatch(e, t) { ... }
```

React 공식 문서가 두 메서드가 도는 시점을 갈라 둔다. `getDerivedStateFromError` 는 **렌더 단계**에서 돌아 fallback 을 그릴 상태를 만들고, `componentDidCatch` 는 **커밋 단계**에서 돌아 로깅 같은 부수 효과를 맡는다. 어느 쪽이든 **React 가 트리 안에서 잡아 넘겨준 것**만 받는다.

그러니 `ErrorBoundary` 가 받는 것의 정의는 하나다. **React 가 잡을 수 있는 자리에서 던져졌는가.**

React 문서는 받지 않는 쪽도 적어 두었다. 아래 네 가지가 그것이다.

::::quote
:::translation
이벤트 핸들러, 서버 렌더링, `ErrorBoundary` 자신이 던진 것, 비동기 코드(예를 들어 `setTimeout` 이나 `requestAnimationFrame` 콜백); 예외가 하나 있는데 `useTransition` 훅이 돌려주는 `startTransition` 함수다. 그 transition 함수 안에서 던진 것은 Error Boundary 가 잡는다.
:::

:::original
Event handlers, Server side rendering, Errors thrown in the error boundary itself (rather than its children), Asynchronous code (e.g. `setTimeout` or `requestAnimationFrame` callbacks); an exception is the usage of the `startTransition` function returned by the `useTransition` Hook. Errors thrown inside the transition function are caught by error boundaries
:::
::::

위 위젯의 결과가 이 문장과 정확히 맞는다. 일곱 자리가 두 도착지로 갈린다.

![왼쪽에 던진 자리 일곱 개가 세로로 놓이고 오른쪽에 도착지 두 개가 있다. 렌더 중, useEffect 안, startTransition 안, lazy 의 import 거부 넷은 파란 화살표로 ErrorBoundary 로 가고, onClick 핸들러 안, setTimeout 콜백 안, Promise 거부 셋은 회색 화살표로 window 로 간다](1.png?w=720)

`startTransition` 이 예외인 이유는 그 안의 작업이 React 의 스케줄러를 거치기 때문이다. React 가 그 실행을 자기 손으로 감싸고 있으므로 잡아서 트리로 되돌릴 수 있다. 같은 이유로 `setTimeout` 은 못 잡는다. 그 콜백이 도는 시점에는 React 가 그 자리에 없다.

우선 하나 알아야할 내용이 있다. **함수 컴포넌트로는 `ErrorBoundary` 를 만들 수 없다.**

React 는 던져진 에러를 만나면 그 자리에서 부모 방향으로 올라가며 받을 경계를 찾는다. 그 순회를 맡은 `throwException` 은 fiber 마다 붙어 있는 `tag` 를 보는데, 멈춰 서는 값은 클래스 컴포넌트와 루트 둘뿐이다. 함수 컴포넌트의 `tag` 는 그 둘이 아니라서 탐색이 그냥 지나친다. **경계가 되지 못하는 이유는 API 가 없어서가 아니라 탐색이 애초에 들여다보지 않기 때문이다.**

![가로로 네 상자가 놓인다. 왼쪽부터 함수 컴포넌트 Child 와 FnBoundary 가 tag 0, 클래스 컴포넌트 ErrorBoundary 가 tag 1, 루트 HostRoot 가 tag 3 이다. Child 에서 출발한 화살표가 FnBoundary 를 지나 ErrorBoundary 에서 멈추고, HostRoot 로 이어지는 선은 점선이다](2.png?w=720)

그 `tag` 는 `React.Component` 를 상속했는지가 정한다. 그래서 `getDerivedStateFromError` 를 함수에 `static` 으로 붙여 봐도 소용이 없다. 붙여서 돌려 보니 그 함수는 한 번도 불리지 않았고, 에러는 경계를 찾지 못해 루트까지 올라가 React 가 트리를 화면에서 걷어냈다.

그러니 `react-error-boundary` 를 설치하는 것은 없는 기능을 더하는 일이 아니다. 6.1.6 의 `ErrorBoundary` 도 `Component` 를 상속한 클래스이고 두 메서드를 그대로 갖는다. 라이브러리가 하는 일은 그 클래스를 한 번만 쓰고 감춰 주는 것이다.


## 컴파일 타임에 끝나는 것

종류를 세는 김에 가장 앞의 것부터 정리하자. 타입 에러다.

이것만은 사용자에게 닿지 않는다. 없는 속성을 읽거나 인자의 타입이 맞지 않으면 빌드가 막히고, 막힌 코드는 배포되지 않는다. 그래서 전이 경로를 따질 일이 없다. **이 글에서 타입 에러가 빠지는 것은 중요하지 않아서가 아니라 런타임에 존재하지 않기 때문이다.**

문제는 그 다음이다. 타입 검사는 **어디까지** 보장하는가.

```ts
async function getComments(postId: string): Promise<Comment[]> {
  const res = await fetch(`/api/posts/${postId}/comments`)
  const data = await res.json()
  return data.comments
}
```

반환 타입이 `Promise<Comment[]>` 라고 적혀 있으므로 이 함수를 부르는 모든 코드가 배열을 받는다고 믿는다. 그런데 `Response` 의 `json()` 은 TypeScript 5.9.3 의 `lib.dom.d.ts` 에 이렇게 선언돼 있다.

```ts
json(): Promise<any>;
```

`any` 다. 여기서부터 타입 검사가 끊긴다. 서버가 준 값은 컴파일러가 본 적이 없고, 그 뒤에 붙인 타입 인자나 반환 타입 표기는 **검사가 아니라 선언**이다. 그 선언을 런타임에 확인하는 코드는 아무도 넣어 주지 않는다.

그래서 서버가 `200` 으로 `{ commits: null }` 을 주면 `commits.length` 를 읽는 줄이 렌더 중에 `TypeError` 를 던진다. HTTP 는 성공이었고 타입도 통과했는데 화면이 깨진다.

**타입이 끝나는 자리가 런타임 검사를 놓을 자리다.** 그 검사를 어디에 두느냐에 따라 같은 실패가 다른 경로로 간다. 렌더에서 읽다가 터지면 렌더 에러가 되어 `ErrorBoundary` 로 가고, 데이터를 받는 자리에서 먼저 검사해 던지면 그 요청의 실패가 된다. 아래 **렌더와 생명주기** 섹션에서 그 내용을 다룬다.


## 렌더와 생명주기

React 트리 안에서 던진 것은 전이가 단순하다. **가장 가까운 `ErrorBoundary` 가 받는다.**

렌더 중의 예외가 여기에 들어간다. 위의 `commits.length` 가 그렇고, 배열인 줄 알았던 값에 `map` 을 부르는 것도 그렇다. 이 부류는 던지는 것 말고는 할 수 있는 일이 없어서 언제나 `ErrorBoundary` 에 닿는다.

`useEffect` 안에서 던진 것도 잡힌다. effect 는 커밋 뒤에 React 가 직접 실행하므로 그 실행을 감쌀 수 있다. 다만 effect **안에서 부른 비동기 콜백**은 다르다.

```tsx
useEffect(() => {
  throw new Error('boom')          // ErrorBoundary 가 받는다
}, [])

useEffect(() => {
  setTimeout(() => {
    throw new Error('boom')        // ErrorBoundary 를 지나친다
  }, 0)
}, [])
```

두 코드는 같은 `useEffect` 안에 있지만 전이 경로가 다르다. **`ErrorBoundary` 안에 있느냐가 아니라 React 가 그 실행을 붙들고 있느냐가 기준이다.**

이 부류에서 한 가지만 더 기억하면 된다. React 19 의 개발 모드 콘솔은 잡힌 에러에 컴포넌트 이름을 붙여 준다. 위젯을 돌렸을 때 렌더와 effect 와 transition 은 `The above error occurred in the <Thrower> component` 였고 `lazy` 만 `occurred in one of your React components` 였다. `lazy` 는 거부되는 시점에 아직 컴포넌트가 없어서 이름을 못 적는다. 스택만 보고 자리를 찾을 때 이 차이가 단서가 된다.


## 서버 데이터

여기서부터가 프론트엔드 개발하면서 핸들링해야하는 까다로운 부분이다. 이유는 서버 실패가 **자동으로 에러가 되지 않기** 때문이다.

### fetch 는 서버 오류를 알아서 거부하지 않는다

MDN 이 이 점을 분명히 적어 두었다.

::::quote
:::translation
`fetch()` 프로미스는 요청 자체가 실패했을 때만 거부된다. 예를 들어 URL 형식이 잘못됐거나 네트워크 오류가 났을 때다. 서버가 오류를 뜻하는 HTTP 상태 코드(`404`, `504` 등)로 응답한 경우에는 거부되지 않는다.
:::

:::original
A `fetch()` promise only rejects when the request fails, for example, because of a badly-formed request URL or a network error. A `fetch()` promise does not reject if the server responds with HTTP status codes that indicate errors (`404`, `504`, etc.).
:::
::::

그러니까 `fetch` 만 쓰면 `500` 응답은 **성공한 Promise** 다. 던져지지 않았으니 `ErrorBoundary` 도 모르고 데이터 라이브러리도 모른다. TanStack Query 문서도 이 점을 짚는다. 쿼리가 실패했다고 판정되려면 `queryFn` 이 던지거나 거부된 Promise 를 돌려줘야 하는데, `axios` 는 알아서 던지지만 `fetch` 는 그렇지 않다는 것이다.

그래서 서버 실패를 에러로 만드는 것은 **직접 해야 하는 일**이다.

```ts
const response = await fetch('/todos/' + todoId)
if (!response.ok) {
  throw new Error('Network response was not ok')
}
```

이 세 줄이 없으면 이 절의 나머지는 전부 의미가 없다. 던져지지 않은 것은 어디로도 전이되지 않는다.

### 실패 하나가 갈리는 다섯 갈래

실패가 실패가 되고 나면 그 다음 갈림이 시작된다. 같은 `500` 한 번이 **어떻게 불렀느냐**에 따라 다섯 군데로 흩어진다. 옵션을 건드리지 않은 기본값 기준이다.

**`useQuery` 는 에러를 던지지 않는다.** `useQuery.js` 를 열어 보면 `throwOnError` 라는 문자열이 아예 없다. 던질지 말지는 `query-core` 의 `shouldThrowError` 가 정한다.

```js
function shouldThrowError(throwOnError, params) {
	if (typeof throwOnError === "function") return throwOnError(...params);
	return !!throwOnError;
}
```

값이 없으면 `!!undefined` 이므로 `false` 다. 그래서 실패는 `query.error` 에만 들어가고 컴포넌트는 정상적으로 렌더된다. 바깥의 `ErrorBoundary` 는 끝까지 자기 차례가 온 줄 모른다.

**`useSuspenseQuery` 는 던지는데 항상은 아니다.** 이 훅은 옵션을 펼친 뒤 `throwOnError` 를 덮어쓴다.

```js
return useBaseQuery({
  ...options,
  enabled: true,
  suspense: true,
  throwOnError: defaultThrowOnError,
  placeholderData: void 0
}, QueryObserver, queryClient);
```

덮어쓰기가 `...options` 뒤에 오므로 **사용자가 넘긴 `throwOnError` 는 무시된다.** 그리고 그 자리에 들어가는 기본 판정이 `suspense.js` 에 한 줄로 있다.

```js
const defaultThrowOnError = (_error, query) => query.state.data === void 0;
```

**보여줄 캐시가 있으면 던지지 않는다.** 실무에서 이 분기가 갈리는 자리는 배경 재요청이다. 처음 들어온 사용자는 캐시가 비어 있으니 실패가 `ErrorBoundary` 로 가고 fallback 을 본다. 이미 화면에 있던 사용자가 다른 탭에 갔다 돌아와 재요청이 돌고 그게 실패하면, 캐시에 옛 데이터가 있으므로 던지지 않는다. 화면은 낡은 값을 그대로 보여주고 스스로 바뀌지 않는다.

화면이 안 깨지는 것은 대체로 좋은 동작이다. **화면이 알려주지 않는다는 것이 같이 딸려 온다**는 사실을 알고 고르는 것과 모르고 당하는 것은 다르다.

**mutation 이 돌려주는 두 함수는 둘 다 `ErrorBoundary` 로 안 간다.** 이유가 서로 다르다. `useMutation.js` 를 열면 한쪽은 거부를 직접 삼킨다.

```js
observer.mutate(args[0], args[1]).catch(noop);
```

이것이 `mutate` 다. 같은 파일에서 `mutateAsync` 는 `result.mutate` 를 그대로 내보내는데, 그 `result.mutate` 는 `mutationObserver.js` 가 `mutate: this.mutate` 로 실어 보낸 것이라 결국 위 줄이 감싼 것과 같은 함수다. **한쪽만 `.catch(noop)` 을 거친다.** 그 거부는 `await` 한 자리에서 터지는 것이지 렌더 중에 던져지는 것이 아니므로 이쪽도 `ErrorBoundary` 와는 무관하다.

**그렇다고 mutation 이 `ErrorBoundary` 와 영영 무관한 것은 아니다.** 훅 본문에 스위치가 하나 더 있다.

```js
if (result.error && shouldThrowError(observer.options.throwOnError, [result.error])) throw result.error;
```

`throwOnError` 를 주면 이 줄이 **렌더 중에** 던지고, 그때는 `ErrorBoundary` 로 간다. 돌려받은 두 함수가 `ErrorBoundary` 에 안 닿는 것과 훅이 안 던지는 것은 다른 이야기다.

![왼쪽의 서버 500 한 번에서 화살표 다섯 개가 뻗어 useQuery, useSuspenseQuery, throwOnError 켠 훅, mutate, mutateAsync 로 가고, 각각이 다시 query.error, ErrorBoundary, ErrorBoundary, mutation.error, 호출부의 catch 로 간다. 가운데 ErrorBoundary 둘만 점선으로 묶여 ErrorBoundary 가 받는 둘로 표시되어 있다](3.png?w=720)

정리하면 같은 `500` 의 도착지는 다섯이다. `query.error` 필드, `mutation.error` 필드, 호출부의 `catch`, 그리고 `ErrorBoundary` 로 가는 두 경우다. `ErrorBoundary` 로 가는 둘은 `useSuspenseQuery` 가 캐시 없이 실패했을 때와 `throwOnError` 를 켰을 때다. **실패의 종류가 아니라 호출 방식이 종착지를 정한다.**


## 페이지 전환

화면을 옮길 때 나는 실패는 둘로 갈린다. 갈리는 기준은 **React 트리 안이냐 밖이냐**다.

### loader 는 트리 밖에서 돈다

라우터의 `loader` 는 렌더가 시작되기 전에 실행되는 함수다. React 컴포넌트가 아니므로 `getDerivedStateFromError` 도 `componentDidCatch` 도 닿지 않는다. `react-error-boundary` 로 아무리 감싸도 그 `ErrorBoundary` 는 loader 의 실패를 볼 수 없다.

대신 라우터가 자기 `ErrorBoundary` 체계를 따로 갖는다. React Router 문서가 이렇게 적는다.

::::quote
:::translation
route module 은 코드에서 난 에러를 자동으로 잡아 가장 가까운 `ErrorBoundary` 를 그린다.
:::

:::original
route modules will automatically catch errors in your code and render the closest `ErrorBoundary`.
:::
::::

가장 가까운 것을 고르는 방법은 소스에 있다. `findNearestBoundary` 가 이렇게 고른다.

```js
function findNearestBoundary(matches, routeId) {
  let eligibleMatches = routeId ? matches.slice(0, matches.findIndex((m) => m.route.id === routeId) + 1) : [...matches];
  return eligibleMatches.reverse().find((m) => m.route.hasErrorBoundary === true) || matches[0];
}
```

매치된 라우트를 뒤에서부터 훑어 `ErrorBoundary` 를 가진 첫 라우트를 고르고, 없으면 맨 앞의 라우트로 보낸다. **그래서 아래쪽 라우트에 `ErrorBoundary` 를 하나 더 두는 것은 겹치는 일이 아니라 fallback 이 그려지는 범위를 좁히는 일이다.**

읽는 쪽도 다르다. 라우트 `ErrorBoundary` 는 에러를 props 로 받지 않고 `useRouteError()` 로 직접 꺼낸다. 상태 코드가 실린 것인지는 `isRouteErrorResponse(error)` 로 가른다. 이 둘은 React 의 `ErrorBoundary` 에는 없는 도구다.

### lazy 의 거부는 트리 안이다

같은 페이지 전환이라도 코드를 늦게 받는 쪽은 반대다. `lazy(() => import('./Tab'))` 의 `import()` 가 거부되면 React 가 그것을 받아 **가장 가까운 `ErrorBoundary`** 로 던진다. 위젯의 네 번째 버튼이 이 경로다.

배포가 나가면 옛 청크 파일이 사라지는데 배포 전에 열어 둔 화면은 여전히 옛 주소를 들고 있다. 그 상태로 그 코드를 요구하면 `import()` 가 거부되고 Chrome 은 `TypeError: Failed to fetch dynamically imported module` 을 던진다.

여기서 한 가지가 더 붙는다. **`lazy` 는 거부를 기억한다.** React 의 `lazyInitializer` 가 결과를 `payload` 에 적어 두는데, 거부되면 상태를 바꾸고 이유를 저장한다.

```js
payload._status = 2;
payload._result = error;
```

그 뒤로 이 컴포넌트를 렌더할 때마다 마지막 분기가 돈다.

```js
throw payload._result;
```

다시 `import()` 하지 않는다. `lazy()` 호출은 모듈 최상위에서 한 번 일어났고 그 `payload` 는 앱이 사는 동안 그대로다. **`ErrorBoundary` 를 풀어 재마운트해도 같은 에러가 다시 온다.** 이 실패의 복구가 페이지를 다시 받는 것뿐인 이유가 여기 있다.

같은 페이지 전환인데 loader 의 실패는 라우터가 받고 `lazy` 의 실패는 React 가 받는다. **`ErrorBoundary` 를 어디에 둘지 정하기 전에 이 둘을 갈라 두지 않으면 둘 중 하나는 갈 곳이 없다.**


## ErrorBoundary 밖의 전역 핸들러

`ErrorBoundary` 가 못 잡은 셋은 어디로 갔는가. 바로 **브라우저의 전역 핸들러**다.

이벤트 핸들러와 `setTimeout` 콜백에서 던진 것은 결국 `window` 의 `error` 이벤트로 간다. Promise 거부는 다른 이벤트로 간다. MDN 의 정의는 이렇다.

::::quote
:::translation
`unhandledrejection` 이벤트는 거부 핸들러가 없는 자바스크립트 Promise 가 거부될 때 스크립트의 전역 스코프로 보내진다. 보통은 `window` 이고 `Worker` 일 수도 있다.
:::

:::original
The `unhandledrejection` event is sent to the global scope of a script when a JavaScript Promise that has no rejection handler is rejected; typically, this is the `window`, but may also be a `Worker`.
:::
::::

이 둘이 브라우저가 마지막으로 받는 자리다. 에러 모니터링 도구가 브라우저 에러를 잡는 자리도 대부분 여기다.

React 19 는 트리 쪽에도 받는 자리를 하나 더 뒀다. `createRoot` 의 옵션이다. 공식 문서가 셋을 이렇게 가른다.

| 옵션 | 언제 부르나 |
|---|---|
| `onCaughtError` | React 가 Error Boundary 안에서 에러를 잡았을 때 |
| `onUncaughtError` | 에러가 던져졌는데 Error Boundary 가 잡지 못했을 때 |
| `onRecoverableError` | React 가 스스로 복구했을 때 |

받는 것과 고치는 것은 다르다. **전역 핸들러가 잡았다고 화면이 복구되지는 않는다.** `onClick` 안에서 던진 에러를 `window` 가 받아 모니터링 도구로 보내도, 그 순간 사용자의 화면에서는 버튼이 그냥 안 눌린 것처럼 보인다. 보고와 복구는 다른 일이다.


## 마무리

프론트엔드 에러 처리를 도구 목록으로 외우면 자꾸 구멍이 남는다. `ErrorBoundary`, `throwOnError`, `useRouteError`, `lazy`, `unhandledrejection` 을 다 알고도 그렇다. 도구를 몰라서가 아니라 **무엇이 어디로 가는지를 안 세어 봐서**다.

이 글에서 다룬것을 정리하면 아래와 같다.

- `ErrorBoundary` 는 React 가 잡아 넘겨준 것만 받는다. 이벤트 핸들러와 비동기 콜백은 그 자리에 없다.
- 타입 검사는 응답에서 끝난다. `json()` 이 `any` 를 돌려주는 지점부터는 선언이지 검사가 아니다.
- 서버 실패는 저절로 에러가 되지 않는다. `fetch` 는 `500` 에 거부하지 않으므로 던지는 일을 직접 해야 한다.
- 던져진 뒤에는 호출 방식이 종착지를 정한다. 같은 실패가 필드로도, 호출부로도, `ErrorBoundary` 로도 간다.
- 페이지 전환은 둘로 갈린다. loader 는 트리 밖이라 라우터가 받고 `lazy` 는 트리 안이라 React 가 받는다.
- `ErrorBoundary` 밖에는 전역 핸들러가 있다. 잡히기는 하지만 화면이 복구되지는 않는다.

그래서 `ErrorBoundary` 를 그리기 전에 할 일은 감쌀 컴포넌트를 고르는 것이 아니다. **이 화면에서 실패할 수 있는 자리를 적고, 각각이 위 여섯 중 어디에 해당하는지 표시하는 것**이다. 표시되지 않은 자리가 곧 구멍이다.

지금 여러분의 화면에서 실패할 수 있는 자리가 몇 개이고, 그중 몇 개가 `ErrorBoundary` 에 닿으며, 닿지 않는 것들은 어디로 가고 있는지 알아보면 좋겠다.

[다음 글](/251203)에서는 도착지마다 무엇으로 받을지를 다룬다. 층을 몇 개로 나눌지, 실패에 대한 화면 범위를 어떻게 처리할지, 그리고 fallback 의 다시 시도 버튼이 실제로 다시 시도하게 만들려면 무엇을 같이 풀어야 하는지다.


:::ref
- [docs] [React, Component 의 Error Boundary](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [docs] [React, createRoot 의 에러 콜백](https://react.dev/reference/react-dom/client/createRoot)
- [docs] [React, lazy](https://react.dev/reference/react/lazy)
- [docs] [React Router, Error Boundaries](https://reactrouter.com/how-to/error-boundary)
- [docs] [TanStack Query, Query Functions](https://tanstack.com/query/latest/docs/framework/react/guides/query-functions)
- [docs] [MDN, unhandledrejection](https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event)
- [docs] [MDN, fetch](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch)
- [docs] [axios, Error handling](https://axios.rest/pages/advanced/error-handling)
- [repo] [bvaughn/react-error-boundary](https://github.com/bvaughn/react-error-boundary)
:::
