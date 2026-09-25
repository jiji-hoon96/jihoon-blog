---
emoji: 🧱
title: 'ErrorBoundary 배치'
seoTitle: "프론트엔드 ErrorBoundary 배치, 층과 넓이와 QueryErrorResetBoundary"
date: '2025-12-03'
categories: 프론트엔드 React TanStack-Query 에러핸들링
description: '에러가 어디로 가는지 알았다면 받을 자리를 놓을 차례다. ErrorBoundary 를 몇 층으로 나눌지, 실패 하나에 화면을 얼마나 내줄지, 그리고 재시도 버튼이 실제로 재시도하게 만들려면 무엇을 같이 풀어야 하는지를 설치본 소스로 확인한다.'
keywords: "React ErrorBoundary 위치, 중첩 라우트 ErrorBoundary, QueryErrorResetBoundary, 재시도 안 됨, retryOnMount, fallbackRender, useRouteError, revalidate, React.lazy 새로고침, TanStack Query retry 조건, ErrorBoundary 설계"
---

이번 포스팅에서는 **받은 에러를 어디서 받을 것인가**에 대한 이야기를 해보려고 한다. [에러 전이](/251117)에서 같은 에러를 일곱 자리에서 던져 보고 도착지를 셌다. 이 글은 그 도착지마다 받을 자리를 놓는 이야기다.

전이 경로를 알고 나면 다음 질문이 저절로 따라온다. **`ErrorBoundary` 를 몇 개 두고 어디에 둘 것인가.** 하나만 두면 되는지, 화면마다 둬야 하는지, 라이브러리가 주는 것과 직접 만든 것이 겹치는지가 여기서 갈린다.

먼저 결론부터 적으면, `ErrorBoundary` 의 개수는 취향이 아니라 두 가지가 정한다. **무엇이 던지느냐**와 **그것이 죽었을 때 화면에 무엇이 남아야 하느냐**다. 앞의 것은 1편에서 다루었으니 이 글은 뒤의 것으로 시작한다.


## 내줘도 되는 넓이

`ErrorBoundary` 를 어디에 둘지 물으면 보통 어느 컴포넌트를 감쌀지를 생각한다. 그 질문으로는 답이 안 나온다. 감쌀 수 있는 컴포넌트는 언제나 여러 개고 어느 것을 골라도 코드는 돌아가기 때문이다.

바꿔 물어야 한다. **이게 죽으면 화면에 무엇이 남아야 하나.**

이 질문에는 자리마다 답이 다르다. 화면의 뼈대가 되는 데이터가 없으면 그 화면은 성립하지 않는다. 이름도 상태도 없는데 동작 버튼만 덩그러니 두는 것은 의미가 없다. 반대로 곁가지 목록 하나가 실패했다고 화면 전체를 가리면, 사용자는 멀쩡히 볼 수 있었던 나머지를 전부 잃는다. 되돌리기 어려운 동작은 또 다르다. 실패했다는 사실을 누른 그 자리에서 알려야 한다.

**`ErrorBoundary` 가 하는 일은 실패를 잡는 것이 아니라 fallback 이 그려지는 범위를 정하는 것이다.** fallback 은 실패했을 때 원래 화면 대신 그리는 것이다. 감싼 만큼이 사라진다. 그러니 `ErrorBoundary` 의 위치는 잡고 싶은 것이 아니라 **내줘도 되는 넓이**로 정해진다.

그 넓이가 네 단계로 갈린다.

| 층 이름 | 무엇을 받나 | 무엇으로 되돌리나 |
|---|---|---|
| 라우트 | loader 가 던진 것, 아래에서 아무도 안 잡은 것 | `revalidate()` |
| 화면 | 렌더 중에 던져진 것 | `resetErrorBoundary()` |
| 영역 | 그 안에서 던져진 것 | `resetErrorBoundary()` |
| 컴포넌트 안 | `useQuery` 의 실패, mutation 의 실패 | `refetch()`, 토스트 |

![라우트 ErrorBoundary 안에 화면 ErrorBoundary 가 있고 그 안에 영역 ErrorBoundary 와 컴포넌트 안이 나란히 놓인 중첩 사각형. 왼쪽에서 loader 가 던진 것은 라우트 ErrorBoundary 로, 렌더 중에 던져진 것은 화면 ErrorBoundary 로, 그 영역의 실패는 영역 ErrorBoundary 로, 안 던지는 것은 컴포넌트 안으로 화살표가 들어온다. 컴포넌트 안에서 위로 향하는 화살표에는 빨간 가위표와 올라가지 않는다는 표시가 붙어 있다](1.png?w=720)

이름은 넷이지만 종류는 둘이다. **라우트 `ErrorBoundary` 만 라우터의 것이고 나머지 둘은 트리에 두는 `ErrorBoundary` 다.** 화면 `ErrorBoundary` 와 영역 `ErrorBoundary` 는 같은 컴포넌트이고 붙어 있는 자리만 다르다. 맨 아래의 컴포넌트 안은 `ErrorBoundary` 가 아니라 컴포넌트가 직접 그리는 분기다.

아래 절들이 이 표의 각 행을 왜 지울 수 없는지를 본다.


## 지울 수 없는 세 층

`react-error-boundary` 를 설치하고 나면 라우터 쪽은 지워도 될 것처럼 보인다. 이름이 같으니 하는 일도 같아 보인다. 그런데 어느 하나를 지우면 안 되는 이유가 세 가지 있다. 여기서 세는 셋은 위 표의 라우트, 화면, 영역이다. 컴포넌트 안은 `ErrorBoundary` 가 아니라 빠진다.

### ErrorBoundary 밖의 loader

1편에서 본 그대로다. `ErrorBoundary` 는 `getDerivedStateFromError` 와 `componentDidCatch` 로 만들어진 클래스라 **React 트리 안에서 잡힌 것**만 온다. loader 는 렌더가 시작되기 전에 트리 밖에서 도는 함수다. 거기서 던진 것은 React 를 거치지 않으므로 아무리 감싸도 보이지 않는다.

그래서 loader 를 쓰는 라우트가 하나라도 있으면 **라우트 `ErrorBoundary` 를 지울 수 없다.** 지우는 순간 그 실패는 갈 곳이 없어진다.

### revalidate 가 못 푸는 캐시

반대 방향도 막힌다. 라우트 `ErrorBoundary` 의 복구 수단은 `revalidate()` 인데, 이것은 loader 를 다시 돌릴 뿐 쿼리 캐시는 건드리지 않는다.

loader 가 없는 라우트를 생각해 보자. 화면 안에서 `useSuspenseQuery` 가 실패하면 그것도 결국 라우트 `ErrorBoundary` 가 받기는 한다. 라우터가 라우트 트리를 `RenderErrorBoundary` 라는 자기 클래스로 감싸 두었고, 그 클래스도 `getDerivedStateFromError` 를 가지고 있기 때문이다. 그런데 그 `ErrorBoundary` 의 재시도를 눌러 봐야 **다시 돌릴 loader 도 없고 캐시에 박힌 에러도 그대로다.** 받기는 받았는데 되돌릴 수단이 없다.

**받는 것과 되돌리는 것은 다른 일이다.** `ErrorBoundary` 를 배치할 때 이 둘을 같이 보지 않으면, 받기는 하는데 아무도 못 푸는 fallback 이 생긴다.

### 넓이를 좁히는 아래 ErrorBoundary

셋째는 막히는 것이 아니라 너무 많이 잃는 것이다.

라우터는 실패했을 때 `ErrorBoundary` 를 하나 고른다. 고르는 방법이 소스에 있다.

```js
function findNearestBoundary(matches, routeId) {
  let eligibleMatches = routeId ? matches.slice(0, matches.findIndex((m) => m.route.id === routeId) + 1) : [...matches];
  return eligibleMatches.reverse().find((m) => m.route.hasErrorBoundary === true) || matches[0];
}
```

매치된 라우트를 뒤에서부터 훑어 `ErrorBoundary` 를 가진 첫 라우트를 고르고, 없으면 맨 앞으로 보낸다. 중첩 라우트의 자식에 `ErrorBoundary` 가 없으면 그 자리를 **부모가** 맡고, 부모에도 없으면 루트가 맡는다.

루트가 맡으면 화면이 통째로 사라진다. 실패한 것은 안쪽 영역 하나뿐인데 헤더도 내비게이션도 같이 없어진다. 자식 라우트에 `ErrorBoundary` 를 붙이면 fallback 이 `<Outlet />` 자리에만 그려진다.

**그래서 아래에 `ErrorBoundary` 를 하나 더 두는 것은 겹치는 일이 아니다.** 같은 실패를 두 번 잡는 게 아니라 **어디까지 지울지를 바꾸는 것**이다. 셋을 겹쳐 두는 것처럼 보이는 배치는, 실은 서로 다른 것을 서로 다른 넓이로 받게 두는 것이다.


## 영역 ErrorBoundary 와 컴포넌트 안 사이

층을 넷으로 나누고 나면 마지막 갈림이 남는다. 없어도 화면이 성립하는 영역 하나를 **`ErrorBoundary` 로 올릴지 그 자리에서 받을지**다.

어느 쪽이든 그 영역만 잃고 나머지는 지킨다. 갈리는 것은 잃는 범위가 아니라 **그 자리에 무엇을 대신 그리느냐**다.

`ErrorBoundary` 로 올리면 코드가 줄어든다. 안에서 `useSuspenseQuery` 를 부르면 그 컴포넌트에는 `isPending` 도 `isError` 도 없다. 대기는 바깥 `Suspense` 가, 실패는 바깥 `ErrorBoundary` 가 받는다. 컴포넌트는 데이터가 있는 경우만 그린다.

```tsx
<section>
  <h2>댓글</h2>
  <QueryAsyncBoundary pendingFallback={<p>불러오는 중</p>}>
    <CommentList postId={postId} />
  </QueryAsyncBoundary>
</section>
```

대신 그 영역이 통째로 fallback 으로 바뀐다. 목록처럼 통째로 사라져도 남길 것이 없는 자리라면 손해가 없다.

그 자리에서 받으면 반대다. `useQuery` 를 부르고 네 가지 상태(대기, 실패, 빈 결과, 결과)를 직접 그린다. 분기가 늘어나는 대신 **그 자리에 맞춘 문구와 동작**을 둘 수 있다. 실패한 줄에만 작은 재시도 버튼을 붙이고 싶다면 이쪽이다. `ErrorBoundary` 로 올리면 그 줄의 모양을 fallback 컴포넌트가 정하게 되는데, 그 fallback 은 대개 화면 `ErrorBoundary` 와 공유하는 것이라 한 줄짜리 실패에는 과하다.

기준은 이렇게 정리된다. **영역이 통째로 사라져도 되면 `ErrorBoundary` 가 낫고, 그 자리에 맞춘 문구나 동작이 필요하면 `useQuery` 가 낫다.** `ErrorBoundary` 는 컴포넌트에서 분기를 걷어내 주지만 화면을 정할 자유를 같이 가져간다.

`ErrorBoundary` 로 올리지 않기로 했다면 **네 가지 상태를 전부 핸들링 해줘야 한다.**

```tsx
const { data, isPending, isError, refetch, isRefetching } = useQuery(commentsOptions(postId))

if (isPending) return <p>불러오는 중</p>

if (isError) {
  return (
    <div role="alert">
      <p>댓글을 불러오지 못했어요</p>
      <button onClick={() => refetch()} disabled={isRefetching}>재시도</button>
    </div>
  )
}

if (data.length === 0) return <p>아직 댓글이 없어요</p>
```

`isError` 를 빠뜨리면 실패가 조용히 빈 상태로 흘러든다. 실패한 쿼리의 `data` 는 `undefined` 인데, `data == null || data.length === 0` 같은 검사는 그 `undefined` 와 빈 배열을 구분하지 않기 때문이다. 화면에는 아직 댓글이 없다고 뜨고 서버는 그 순간 500 을 주고 있다.

`isError` 를 먼저 거르면 그 아래에서 `data` 가 배열로 좁혀지고 `== null` 검사가 사라진다.


## 층마다 다른 fallback

층을 놓았으니 각 층이 화면에 무엇을 그릴지 정한다. 여기서 라우트 `ErrorBoundary` 와 트리에 두는 `ErrorBoundary` 가 또 갈리는데, **고르는 기준은 취향이 아니라 그 층이 에러를 어떻게 전달받느냐**다.

### 스스로 읽는 라우트 ErrorBoundary

라우트 `ErrorBoundary` 는 fallback 에 에러를 넘겨줄 필요가 없다. 컴포넌트가 `useRouteError()` 로 직접 읽고 복구 수단도 스스로 가져온다.

```tsx
export function RootErrorBoundary() {
  const error = useRouteError()
  const { revalidate, state } = useRevalidator()

  return <ErrorFallback error={error} onRetry={revalidate} retrying={state === 'loading'} />
}
```

그래서 라우트에는 컴포넌트만 꽂으면 된다. 자식 라우트의 `ErrorBoundary` 도 같은 모양이고 같은 훅을 쓴다. 둘을 가르는 것은 코드가 아니라 **붙어 있는 라우트**다. 어느 라우트에 붙었느냐가 곧 fallback 이 그려지는 넓이다.

### 넘겨받는 ErrorBoundary

`react-error-boundary` 의 `ErrorBoundary` 는 반대다. 에러도 reset 함수도 자기가 들고 있으므로 fallback 쪽에 내려줘야 한다. 그래서 세 가지 prop 이 있고 타입 정의가 셋을 서로 배타로 묶어 둔다.

**`fallback`** 은 완성된 엘리먼트를 그대로 받는다. `fallback={<p role="alert">댓글을 불러오지 못했어요</p>}` 처럼 쓴다. 에러도 reset 함수도 안 준다. 메시지가 고정이고 재시도할 방법도 없을 때만 쓸 만하다.

**`FallbackComponent`** 는 컴포넌트를 받아 `error` 와 `resetErrorBoundary` 를 props 로 넘긴다. 여러 `ErrorBoundary` 가 같은 fallback 을 공유할 때 깔끔한데, props 이름이 `resetErrorBoundary` 로 고정이라 받는 쪽이 그 이름을 알아야 한다.

```tsx
function CommentsFallback({ error, resetErrorBoundary }: FallbackProps) {
  return <ErrorFallback error={error} onRetry={resetErrorBoundary} />
}

<ErrorBoundary onReset={reset} FallbackComponent={CommentsFallback}>
  <CommentList postId={postId} />
</ErrorBoundary>
```

`ErrorFallback` 은 `onRetry` 를 받으므로 이름이 안 맞는다. 그래서 이름을 옮기는 컴포넌트가 하나 더 든다.

**`fallbackRender`** 는 함수를 받아 그 자리에서 렌더한다.

```tsx
<ErrorBoundary
  onReset={reset}
  fallbackRender={({ error, resetErrorBoundary }) => (
    <ErrorFallback error={error} onRetry={resetErrorBoundary} />
  )}
>
```

필자는 이것을 골랐다. 이유는 **그 자리에서 이름을 갈아 끼울 수 있기 때문**이다. 위에서 `resetErrorBoundary` 가 `onRetry` 로 바뀌었다. 그 덕분에 `ErrorFallback` 은 `error` 와 `onRetry` 만 아는 컴포넌트가 되고, 복구 수단이 `revalidate` 인 라우트 `ErrorBoundary` 와 `resetErrorBoundary` 인 `ErrorBoundary` 가 **같은 fallback 을 쓴다.**

**두 층의 화면이 어긋나지 않는 것이 이 선택의 값이다.** 층을 넷으로 나누면 사용자가 보는 실패 화면도 넷이 될 위험이 있는데, 이름을 한 번 갈아 끼우는 것으로 하나가 된다.


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

![위쪽은 onReset 을 잇지 않았을 때의 흐름으로 재시도 클릭, EB 해제, 재마운트, 캐시의 에러를 다시 던짐이 이어지고 마지막에서 첫 칸으로 빨간 화살표가 되돌아와 같은 fallback 이라고 적혀 있다. 아래쪽은 onReset 을 이었을 때로 재시도 클릭, onReset 과 잠금 해제, EB 해제와 재마운트, 다시 요청이 파란 화살표로 한 방향으로 이어진다](2.png?w=720)

**잠기는 것은 `ErrorBoundary` 로 올린 쿼리뿐이고, 그래서 두 상태를 같이 풀어야 한다.** 그 표시를 세우는 것이 `QueryErrorResetBoundary` 다. 소스를 열면 상태가 boolean 하나다.

```js
reset: () => {
	isReset = true;
},
```

이 `reset` 을 `ErrorBoundary` 의 `onReset` 에 이어 주면 된다. TanStack Query 의 문서와 소스 주석이 같은 배선을 예제로 싣고 있다.

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

둘째는 1편에서 본 경우다. 서버가 200 으로 예상과 다른 모양을 주고 그것을 읽는 렌더가 `TypeError` 를 던진다. 같은 `ErrorBoundary` 가 받았고 `onReset` 도 이어져 있는데 재시도가 안 듣는다.

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

1편에서 타입이 끝나는 자리가 런타임 검사를 놓을 자리라고 했다. **그 자리가 여기다.** 그 검사를 `queryFn` 으로 올리면 같은 실패가 **쿼리의 에러**가 된다. 캐시에는 에러 상태로 남고, `reset` 이 그것을 풀고, 재시도가 다시 요청한다.

`ErrorBoundary` 가 받아 주니 런타임 검사는 나중에 하자고 미루면, 받기는 하는데 되돌릴 수 없는 fallback 이 생긴다.

### 새로 고침만 푸는 lazy

셋째는 청크 로드 실패다. 이번에는 `reset` 도 `queryFn` 도 관계가 없다. 상태를 들고 있는 것이 `lazy` 자체다.

1편에서 본 대로 React 의 `lazyInitializer` 는 거부를 `payload` 에 적어 두고 그 뒤로는 매번 같은 것을 다시 던진다.

```js
throw payload._result;
```

다시 `import()` 하지 않는다. `lazy()` 호출은 모듈 최상위에서 한 번 일어났고 그 `payload` 는 앱이 사는 동안 그대로다. `ErrorBoundary` 를 풀어 재마운트해도 같은 에러가 다시 온다.

그래서 이 실패의 복구는 페이지를 다시 받는 것이다. 새 버전이 배포됐다는 뜻이기도 하니 사용자에게 그렇게 말해 주는 편이 낫다.

세 경우를 놓고 보면 재시도 버튼 하나가 세 가지 다른 일을 해야 한다. 쿼리의 에러는 `reset` 으로, 렌더 에러는 `queryFn` 에서 미리 쿼리의 에러로 바꿔서, 청크 실패는 새로 고침으로 푼다. **`ErrorBoundary` 는 그중 어느 것도 대신 해 주지 않는다.**


## 재시도를 붙이지 않을 실패

복구가 되는 실패와 안 되는 실패를 갈랐으니 버튼도 갈라야 한다.

모든 실패에 같은 버튼을 보여주면 사용자에게 **할 수 없는 행동을 안내하는 셈**이 된다. 404 에서 재시도를 눌러 봐야 같은 404 가 온다. 권한이 없어서 받은 403 도 같다. 청크 로드 실패는 앞 절에서 본 이유로 아예 안 듣는다.

공유하는 fallback 안에서 한 번만 갈라 두면 된다.

```tsx
function describe(error: unknown) {
  if (isChunkLoadError(error)) {
    return { title: '새 버전이 배포됐어요', description: '새로 고침하면 이어서 볼 수 있어요.', action: 'reload' }
  }

  const status = isHttpError(error) ? error.status : isRouteErrorResponse(error) ? error.status : undefined

  if (status === 404) {
    return { title: '찾을 수 없어요', description: '주소가 바뀌었거나 삭제된 항목이에요.', action: null }
  }
  if (status !== undefined && status >= 400 && status < 500) {
    return { title: '요청을 처리할 수 없어요', description: '입력한 내용을 다시 확인해 주세요.', action: null }
  }
  return { title: '불러오지 못했어요', description: '잠시 후 다시 시도해 주세요.', action: 'retry' }
}
```

`isRouteErrorResponse` 가 여기 같이 있는 이유가 있다. 라우트 `ErrorBoundary` 와 트리에 두는 `ErrorBoundary` 가 fallback 을 공유하므로 이 함수가 **두 종류의 에러를 다 받는다.** 라우터가 던진 `Response` 에서 상태 코드를 읽는 방법과 직접 만든 HTTP 에러에서 읽는 방법이 다르기 때문에 둘 다 본다.

거대한 분기를 처음부터 만들 필요는 없다. **다시 눌러서 결과가 달라질 실패와 그렇지 않은 실패**만 갈라 두면 된다.


## ErrorBoundary 가 실패를 보는 시각

`ErrorBoundary` 를 다 놓았는데 아직 하나가 남았다. **`ErrorBoundary` 는 언제 보는가.**

층은 위에서 아래로 정했지만 실행 순서는 반대다. 재시도가 전부 소진된 뒤에야 `ErrorBoundary` 가 무언가를 본다. 그래서 재시도 조건은 **`ErrorBoundary` 설계의 일부**다.

기본값이 자리마다 다르다. 둘 다 같은 `createRetryer` 를 쓰는데 넘기는 값이 다르다. 쿼리는 아무것도 넘기지 않아 `retryer.js` 의 기본을 받는다.

```js
const retry = config.retry ?? (isServer() ? 0 : 3);
```

mutation 은 `mutation.js` 에서 직접 0 을 넣는다.

```js
retry: this.options.retry ?? 0,
```

**mutation 이 0 이라는 것은 요청이 한 번 오류로 끝나면 그 동작이 바로 실패한다는 뜻이다.** 되돌리기 어려운 동작에 재시도가 없는 것은 안전한 기본값이지만, 그 동작이 멱등하다면 한 번쯤 더 보내는 편이 사용자에게 낫다.

양쪽에 같은 조건을 명시하는 편이 낫다.

```ts
const MAX_RETRY = 2

export function retryOnServerError(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRY) return false
  return !isHttpError(error) || error.status >= 500
}
```

`failureCount` 는 0 에서 시작하고 **첫 실패 때 0 으로 물어본다.** 그래서 `MAX_RETRY` 가 2 면 총 세 번 보내고 멈춘다. 재시도 횟수이지 시도 횟수가 아니다.

**4xx 를 뺀 것이 핵심이다.** 요청 자체가 틀린 것이라 몇 번을 보내도 같은 답이 온다. 그런데 뺄 이유가 낭비만은 아니다. 기본 지연이 지수적으로 늘어난다.

```js
function defaultRetryDelay(failureCount) {
	return Math.min(1e3 * 2 ** failureCount, 3e4);
}
```

첫 재시도가 1초, 그 다음이 2초이므로 두 번만 재시도해도 3초가 지나간다. 4xx 를 거르지 않으면 **고칠 수 없는 실패를 3초 동안 숨기는 셈**이다.

렌더 에러와 청크 실패에는 이 시간이 없다. 요청을 보내지 않으니 재시도 자체가 없고 던진 순간 `ErrorBoundary` 가 본다. **같은 fallback 이 어떤 실패에는 3초 뒤에, 어떤 실패에는 즉시 뜨는 이유가 이것이다.**

재시도를 켜기 전에 확인할 전제가 하나 있다. 그 요청이 **멱등한가.** 같은 요청을 두 번 보내도 결과가 같아야 한다. 서버가 그것을 보장하지 않으면 재시도는 버그를 만드는 기능이다.


## 마무리

1편에서 에러가 어디로 가는지를 다루어보았고, 이 글에서 그 자리에 무엇을 놓을지를 정해보았다. 내용을 정리해보면 아래와 같다.

- `ErrorBoundary` 의 위치는 내줘도 되는 넓이로 정해진다. 무엇을 감쌀지가 아니라 이게 죽으면 무엇이 남아야 하는지로 묻는다.
- 세 층의 `ErrorBoundary` 는 어느 하나도 지울 수 없다. loader 가 던진 것은 트리의 `ErrorBoundary` 가 못 받고, `revalidate` 는 쿼리 캐시를 못 풀고, 아래에 하나 더 두는 것은 넓이를 좁히는 일이다.
- 영역을 통째로 버려도 되면 `ErrorBoundary`, 그 자리의 문구가 필요하면 `useQuery` 다. 후자를 고르면 네 가지 상태를 전부 다뤄야 한다.
- `fallbackRender` 로 이름을 갈아 끼우면 층이 달라도 fallback 이 하나가 된다.
- 재시도는 던진 쪽의 상태를 풀어야 듣는다. 쿼리는 `reset`, 렌더 에러는 `queryFn` 으로 올려서, 청크는 새로 고침이다.
- `ErrorBoundary` 가 실패를 보는 시각은 재시도 조건이 정한다. 4xx 를 거르지 않으면 고칠 수 없는 실패를 몇 초 숨긴다.

`ErrorBoundary` 하나와 토스트면 충분하지 않냐고 물을 수 있다. 화면이 두세 개인 제품이라면 그럴듯한 말이고, 사실 **층의 개수는 제품이 정한다.** 화면이 한 장이면 내줄 것도 한 장뿐이라 넓이의 차이가 안 보인다. 화면 안에 독립적인 영역이 늘어날수록 그 차이가 커진다.

다만 개수와 무관하게 남는 것이 있다. 트리에 `ErrorBoundary` 를 몇 개 두든 `loader` 가 던진 것은 거기로 가지 않고, 재시도는 던진 쪽의 상태를 풀지 않으면 듣지 않는다. **줄일 수 있는 것은 층이지 이 사실들이 아니다.**

:::ref
- [docs] [TanStack Query, QueryErrorResetBoundary](https://tanstack.com/query/latest/docs/framework/react/reference/QueryErrorResetBoundary)
- [docs] [TanStack Query, Suspense](https://tanstack.com/query/latest/docs/framework/react/guides/suspense)
- [docs] [React Router, Error Boundaries](https://reactrouter.com/how-to/error-boundary)
- [repo] [bvaughn/react-error-boundary](https://github.com/bvaughn/react-error-boundary)
- [article] [TkDodo, React Query Error Handling](https://tkdodo.eu/blog/react-query-error-handling)
- [article] [TkDodo, Mastering Mutations in React Query](https://tkdodo.eu/blog/mastering-mutations-in-react-query)
:::
