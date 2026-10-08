---
emoji: 🔁
title: "재시도 버튼이 안 듣는 이유"
seoTitle: "ErrorBoundary 재시도가 안 될 때, QueryErrorResetBoundary 와 lazy"
date: '2025-11-28'
categories: 프론트엔드 React TanStack-Query 에러핸들링
description: "react-error-boundary 의 재시도 버튼을 눌러도 같은 fallback 이 다시 뜨는 세 경우를 설치본 소스로 확인한다. 쿼리 에러는 QueryErrorResetBoundary, 렌더 에러는 queryFn 검사, React.lazy 청크 실패는 새로 고침으로 푼다."
keywords: "ErrorBoundary 재시도 안 됨, QueryErrorResetBoundary, retryOnMount, resetErrorBoundary, onReset, React.lazy 청크 로드 실패, useSuspenseQuery 에러, react-error-boundary"
---

이번 포스팅에서는 **`ErrorBoundary` 의 재시도 버튼이 왜 안 듣는지**에 대한 이야기를 해보려고 한다.

`react-error-boundary` 의 fallback 에 재시도 버튼을 달았는데 눌러도 같은 화면이 다시 나오는 프론트엔드 개발자를 위한 글이다. 짧게 답하면 `ErrorBoundary` 는 자기 상태만 되돌리고 실패를 만든 상태는 던진 쪽에 그대로 남기 때문이다. 끝까지 읽으면 그 상태가 남는 세 경우와 경우마다 푸는 방법을 알 수 있다.

예시는 TanStack Query 와 `react-error-boundary` 를 함께 쓰는 구성이고, 라이브러리의 동작은 설치본 소스를 열어 확인했다.


## 재시도가 듣지 않는 세 경우

fallback 에 재시도 버튼을 달았다. 사용자가 실패를 되돌리려고 누르는 그 버튼이다. 눌러 보자. **안 듣는다.** 같은 화면이 그대로 다시 나온다.

세 가지 이유로 생기고 푸는 방법도 저마다 다르다. 공통점은 하나다. **`ErrorBoundary` 는 자기 상태만 되돌린다.** 던진 쪽이 들고 있는 상태는 던진 쪽에서 풀어야 한다.

### reset 이 푸는 쿼리 에러

`resetErrorBoundary()` 가 하는 일은 `ErrorBoundary` 의 내부 플래그를 되돌리는 것뿐이다. children 이 다시 마운트되고 쿼리가 다시 구독된다. 그런데 그 쿼리는 캐시에 **에러 상태로 박혀 있다.** 그래서 즉시 같은 에러를 다시 던지고 `ErrorBoundary` 는 다시 fallback 을 그린다.

왜 재요청하지 않고 옛 에러를 쓰는지도 소스에 있다. `errorBoundaryUtils.js` 가 이렇게 잠근다.

```js
if (options.suspense || throwOnError) {
  if (!errorResetBoundary.isReset()) options.retryOnMount = false;
}
```

바깥의 가드부터 읽어야 한다. **이 잠금은 던지는 쿼리에만 걸린다.** `suspense` 이거나 `throwOnError` 를 켠 쿼리가 reset 표시 없이 마운트되면 재시도가 꺼진다. 던지지 않는 `useQuery` 는 해당이 없어 재마운트하면 그냥 다시 요청한다.

![위쪽은 onReset 을 잇지 않았을 때의 흐름으로 재시도 클릭, EB 해제, 재마운트, 캐시의 에러를 다시 던짐이 이어지고 마지막에서 첫 칸으로 빨간 화살표가 되돌아와 같은 fallback 이라고 적혀 있다. 아래쪽은 onReset 을 이었을 때로 재시도 클릭, onReset 과 잠금 해제, EB 해제와 재마운트, 다시 요청이 파란 화살표로 한 방향으로 이어진다](1.png?w=720)

**잠기는 것은 `ErrorBoundary` 로 올린 쿼리뿐이고, 그래서 두 상태를 같이 풀어야 한다.** 그 표시를 세우는 것이 `QueryErrorResetBoundary` 다. 소스를 열면 상태가 boolean 하나다.

```js
reset: () => {
	isReset = true;
},
```

이 `reset` 을 `ErrorBoundary` 의 `onReset` 에 이어 주면 된다. TanStack Query 의 문서와 소스 주석도 이렇게 잇는 코드를 예제로 싣고 있다.

```tsx
export function QueryAsyncBoundary({ children, pendingFallback }: Props) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <ErrorFallback error={error} onRetry={resetErrorBoundary} />
          )}
        >
          <Suspense fallback={pendingFallback}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}
```

순서가 중요하다. 그리고 그 순서는 `react-error-boundary` 가 보장한다. 빌드된 파일이라 이름이 한 글자로 줄어 있지만 구조는 그대로 읽힌다.

```js
resetErrorBoundary(...e) {
  const { didCatch: t } = this.state;
  t && (this.props.onReset?.({ args: e, reason: "imperative-api" }), this.setState(d));
}
```

쉼표 연산자로 묶여 있어 **`onReset` 이 먼저 돌고 `setState` 가 뒤**다. `d` 는 `didCatch` 가 `false` 인 초기 상태다. 그러니 캐시의 잠금이 풀린 뒤에 children 이 다시 마운트된다. **한 줄 차이로 재시도가 진짜 재시도가 된다.**

이름에 `Query` 를 붙인 것도 의도다. `AsyncBoundary` 라고 부르면 어떤 비동기에나 쓸 수 있을 것처럼 읽히는데, 안에 `QueryErrorResetBoundary` 가 들어 있어서 그렇지 않다. 같은 이유로 `pendingFallback` 에 기본값을 두지 않았다. 기본값이 있으면 호출 지점 한 줄만 봐서는 무엇이 깔리는지 알 수 없다.

### reset 이 풀 수 없는 렌더 에러

둘째는 서버가 200 으로 예상과 다른 모양을 주고 그것을 읽는 렌더가 `TypeError` 를 던지는 경우다. 같은 `ErrorBoundary` 가 받았고 `onReset` 도 이어져 있는데 재시도가 안 듣는다.

`reset` 이 푸는 것은 **에러 상태인 쿼리**다. 그런데 이 쿼리는 성공했다. 서버가 200 을 줬고 캐시에는 그 값이 정상 데이터로 들어 있다. 에러를 낸 것은 그 값을 읽은 렌더다. 그래서 `reset` 은 풀 것이 없고, 재마운트된 컴포넌트는 `staleTime` 이 남은 같은 캐시를 받아 같은 줄에서 다시 던진다.

고치는 자리는 **`queryFn`** 이다.

```ts
queryFn: async () => {
  const data = await getComments(postId)
  if (!Array.isArray(data.comments)) {
    throw new TypeError('comments 가 배열이 아니다')
  }
  return data.comments
},
```

`fetch` 응답의 `json()` 은 `Promise<any>` 를 돌려주므로 그 뒤에 붙인 타입은 검사가 아니라 선언이고, 서버가 준 값을 확인하는 런타임 검사는 직접 놓아야 한다. **그 자리가 여기다.** 그 검사를 `queryFn` 으로 올리면 같은 실패가 **쿼리의 에러**가 된다. 캐시에는 에러 상태로 남고, `reset` 이 그것을 풀고, 재시도가 다시 요청한다.

`ErrorBoundary` 가 받아 주니 런타임 검사는 나중에 하자고 미루면, 받기는 하는데 되돌릴 수 없는 fallback 이 생긴다.

### 새로 고침만 푸는 lazy

셋째는 청크 로드 실패다. 이번에는 `reset` 도 `queryFn` 도 관계가 없다. 상태를 들고 있는 것이 `lazy` 자체다.

React 의 `lazyInitializer` 는 거부를 `payload` 에 적어 두고 그 뒤로는 매번 같은 것을 다시 던진다.

```js
throw payload._result;
```

다시 `import()` 하지 않는다. `lazy()` 호출은 모듈 최상위에서 한 번 일어났고 그 `payload` 는 앱이 사는 동안 그대로다. `ErrorBoundary` 를 풀어 재마운트해도 같은 에러가 다시 온다.

그래서 이 실패의 복구는 페이지를 다시 받는 것이다. 새 버전이 배포됐다는 뜻이기도 하니 사용자에게 그렇게 말해 주는 편이 낫다.

세 경우를 놓고 보면 재시도 버튼 하나가 세 가지 다른 일을 해야 한다. 쿼리의 에러는 `reset` 으로, 렌더 에러는 `queryFn` 에서 미리 쿼리의 에러로 바꿔서, 청크 실패는 새로 고침으로 푼다. **`ErrorBoundary` 는 그중 어느 것도 대신 해 주지 않는다.**


## 마무리

재시도 버튼이 안 듣는다면 버튼이나 `ErrorBoundary` 보다 먼저 **무엇이 던졌고 그 상태가 어디에 남아 있는지**를 확인해 보시길 바란다. 쿼리 캐시인지, 서버가 준 값을 읽은 렌더인지, `lazy` 인지에 따라 푸는 자리가 다르다.

`ErrorBoundary` 를 화면의 어디에 몇 개 둘지, 재시도 버튼을 아예 붙이지 않을 실패는 무엇인지는 [ErrorBoundary 배치](/251203)에서 다룬다.

:::ref
- [docs] [TanStack Query, QueryErrorResetBoundary](https://tanstack.com/query/latest/docs/framework/react/reference/QueryErrorResetBoundary)
- [docs] [TanStack Query, Suspense](https://tanstack.com/query/latest/docs/framework/react/guides/suspense)
- [repo] [bvaughn/react-error-boundary](https://github.com/bvaughn/react-error-boundary)
:::
