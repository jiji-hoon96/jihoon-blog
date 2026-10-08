---
emoji: 🧱
title: 'ErrorBoundary の配置'
seoTitle: "ErrorBoundary はどこに置くか、ルートと画面と領域で分ける基準"
date: '2025-12-03'
updatedAt: "2026-10-08"
categories: フロントエンド React TanStack-Query エラーハンドリング
description: "React Router と TanStack Query を使う画面で、ErrorBoundary をいくつ、どこに置くかを決める基準をインストール済みのソースで確かめる。ルート、画面、領域ごとに受けるエラーと戻し方、fallback をひとつにそろえる方法、再試行の条件まで扱う。"
keywords: "React ErrorBoundary 配置, ネストルート ErrorBoundary, ErrorBoundary 設計, fallbackRender, useRouteError, revalidate, useSuspenseQuery エラー処理, TanStack Query retry 条件"
locale: ja
translationOf: '251203'
sourceHash: 3352c5f5606bee4380b6309b6e8eb02fc35be733311492c3d45f8a89dd57fbda
---

今回の記事では、**`ErrorBoundary` をいくつ置き、どこに置くのか**について話してみたい。React Router と TanStack Query で画面を作りながら、失敗をルートの `ErrorBoundary`、`react-error-boundary`、`useQuery` の `isError` のどこで受けるかに悩んでいるフロントエンド開発者に向けた記事である。最後まで読めば、`ErrorBoundary` を置く場所を決める基準と、場所ごとに fallback と再試行の条件を合わせる方法が得られる。

先に結論を書くと、`ErrorBoundary` の数は好みではなく二つのことが決める。**何が投げるのか**と、**それが死んだときに画面に何が残らなければならないのか**だ。この記事は後者から始め、前者は必要な場所で触れる。


## 明け渡してよい範囲

`ErrorBoundary` をどこに置くかと問うと、たいていはどのコンポーネントを包むかを考える。その問いでは答えが出ない。包めるコンポーネントはいつも複数あり、どれを選んでもコードは動くからだ。

問い方を変えなければならない。**これが死んだら画面に何が残らなければならないか。**

この問いには場所ごとに違う答えがある。画面の骨格になるデータがなければ、その画面は成立しない。名前も状態もないのに操作ボタンだけをぽつんと置くのは意味がない。逆に、脇役の一覧ひとつが失敗したからといって画面全体を覆えば、ユーザーは問題なく見られたはずの残りをすべて失う。取り消しにくい操作はまた違う。失敗したという事実を、押したその場で知らせなければならない。

**`ErrorBoundary` がやることは失敗を捕まえることではなく、fallback が描かれる範囲を決めることだ。** fallback とは、失敗したときに元の画面の代わりに描くものだ。包んだ分だけが消える。だから `ErrorBoundary` の位置は、捕まえたいものではなく **明け渡してよい範囲** で決まる。

その範囲が四段階に分かれる。

| 層の名前 | 何を受けるか | 何で戻すか |
|---|---|---|
| ルート | loader が投げたもの、下で誰も捕まえなかったもの | `revalidate()` |
| 画面 | レンダー中に投げられたもの | `resetErrorBoundary()` |
| 領域 | その中で投げられたもの | `resetErrorBoundary()` |
| コンポーネントの中 | `useQuery` の失敗、mutation の失敗 | `refetch()`、トースト |

![ルート ErrorBoundary の中に画面 ErrorBoundary があり、その中に領域 ErrorBoundary とコンポーネントの中が並んで置かれた入れ子の四角形。左から、loader が投げたものはルート ErrorBoundary へ、レンダー中に投げられたものは画面 ErrorBoundary へ、その領域の失敗は領域 ErrorBoundary へ、投げないものはコンポーネントの中へ矢印が入ってくる。コンポーネントの中から上へ向かう矢印には赤いバツ印と、上がらないという表示が付いている](1.png?w=720)

名前は四つだが種類は二つだ。**ルート `ErrorBoundary` だけがルーターのもので、残りの二つはツリーに置く `ErrorBoundary` だ。** 画面 `ErrorBoundary` と領域 `ErrorBoundary` は同じコンポーネントであり、付いている場所だけが違う。いちばん下のコンポーネントの中は `ErrorBoundary` ではなく、コンポーネントが直接描く分岐だ。

以下の節では、この表の各行をなぜ消せないのかを見る。


## 消せない三つの層

`react-error-boundary` をインストールすると、ルーター側は消してもよさそうに見える。名前が同じなのでやることも同じに見える。ところが、どれひとつ消してはいけない理由が三つある。ここで数える三つは上の表のルート、画面、領域だ。コンポーネントの中は `ErrorBoundary` ではないので外れる。

### ErrorBoundary の外にいる loader

`ErrorBoundary` は `getDerivedStateFromError` と `componentDidCatch` で作られたクラスなので、**React のツリーの中で捕まったもの**だけが来る。loader はレンダーが始まる前にツリーの外で走る関数だ。そこで投げたものは React を経由しないので、いくら包んでも見えない。同じエラーをいくつもの場所から投げて到着地を確かめた過程は、[エラーの伝播](/251117)にまとめておいた。

だから loader を使うルートがひとつでもあれば、**ルート `ErrorBoundary` は消せない。** 消した瞬間、その失敗は行き場をなくす。

### revalidate が解けないキャッシュ

逆方向もふさがっている。ルート `ErrorBoundary` の復旧手段は `revalidate()` だが、これは loader をもう一度走らせるだけで、クエリキャッシュには触らない。

loader のないルートを考えてみよう。画面の中で `useSuspenseQuery` が失敗すれば、それも結局ルート `ErrorBoundary` が受けはする。ルーターがルートツリーを `RenderErrorBoundary` という自前のクラスで包んでおり、そのクラスも `getDerivedStateFromError` を持っているからだ。ところが、その `ErrorBoundary` の再試行を押したところで、**もう一度走らせる loader もなく、キャッシュに刺さったエラーもそのままだ。** 受けはしたが、戻す手段がない。

**受けることと戻すことは別の仕事だ。** `ErrorBoundary` を配置するときにこの二つを一緒に見なければ、受けはするが誰も解けない fallback ができる。

### 範囲を狭める下の ErrorBoundary

三つめはふさがるのではなく、失いすぎることだ。

ルーターは失敗したとき `ErrorBoundary` をひとつ選ぶ。その選び方がソースにある。

```js
function findNearestBoundary(matches, routeId) {
  let eligibleMatches = routeId ? matches.slice(0, matches.findIndex((m) => m.route.id === routeId) + 1) : [...matches];
  return eligibleMatches.reverse().find((m) => m.route.hasErrorBoundary === true) || matches[0];
}
```

マッチしたルートを後ろから辿り、`ErrorBoundary` を持つ最初のルートを選び、なければ先頭へ送る。ネストしたルートの子に `ErrorBoundary` がなければその役を **親が** 引き受け、親にもなければルートが引き受ける。

ルートが引き受けると画面がまるごと消える。失敗したのは内側の領域ひとつなのに、ヘッダーもナビゲーションも一緒になくなる。子ルートに `ErrorBoundary` を付ければ、fallback は `<Outlet />` の位置にだけ描かれる。

**だから下に `ErrorBoundary` をもうひとつ置くのは重複ではない。** 同じ失敗を二度捕まえるのではなく、**どこまで消すかを変えること**だ。三つを重ねて置いているように見える配置は、実は異なるものを異なる範囲で受けさせているのだ。


## 領域 ErrorBoundary とコンポーネントの中のあいだ

層を四つに分けたあと、最後の分かれ目が残る。なくても画面が成立する領域ひとつを、**`ErrorBoundary` に引き上げるか、その場で受けるか**だ。

どちらにしてもその領域だけを失い、残りは守られる。分かれるのは失う範囲ではなく、**その場所に何を代わりに描くか**だ。

`ErrorBoundary` に引き上げるとコードが減る。中で `useSuspenseQuery` を呼べば、そのコンポーネントには `isPending` も `isError` もない。待機は外側の `Suspense` が、失敗は外側の `ErrorBoundary` が受ける。コンポーネントはデータがある場合だけを描く。下の `QueryAsyncBoundary` は、その `Suspense` と `ErrorBoundary` をひとつにまとめたコンポーネントだ。

```tsx
<section>
  <h2>댓글</h2>
  <QueryAsyncBoundary pendingFallback={<p>불러오는 중</p>}>
    <CommentList postId={postId} />
  </QueryAsyncBoundary>
</section>
```

その代わり、その領域がまるごと fallback に変わる。一覧のように、まるごと消えても残すものがない場所なら損はない。

その場で受けると逆になる。`useQuery` を呼び、四つの状態(待機、失敗、空の結果、結果)を自分で描く。分岐が増える代わりに、**その場所に合わせた文言と動作**を置ける。失敗した行にだけ小さな再試行ボタンを付けたいなら、こちらだ。`ErrorBoundary` に引き上げると、その行の見た目は fallback コンポーネントが決めることになるが、その fallback はたいてい画面 `ErrorBoundary` と共有するものなので、一行分の失敗には重すぎる。

基準はこう整理される。**領域がまるごと消えてもよいなら `ErrorBoundary` がよく、その場所に合わせた文言や動作が必要なら `useQuery` がよい。** `ErrorBoundary` はコンポーネントから分岐を取り除いてくれるが、画面を決める自由も一緒に持っていく。

`ErrorBoundary` に引き上げないと決めたなら、**四つの状態をすべて扱わなければならない。**

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

`isError` を落とすと、失敗が静かに空の状態へ流れ込む。失敗したクエリの `data` は `undefined` なのに、`data == null || data.length === 0` のような検査はその `undefined` と空の配列を区別しないからだ。画面にはまだコメントがないと出て、サーバーはその瞬間 500 を返している。

`isError` を先に取り除けば、その下で `data` が配列に絞られ、`== null` の検査が消える。


## 層ごとに違う fallback

層を置いたので、各層が画面に何を描くかを決める。ここでルート `ErrorBoundary` とツリーに置く `ErrorBoundary` がまた分かれるのだが、**選ぶ基準は好みではなく、その層がエラーをどう受け渡されるか**だ。

### 自分で読むルート ErrorBoundary

ルート `ErrorBoundary` は fallback にエラーを渡す必要がない。コンポーネントが `useRouteError()` で直接読み、復旧手段も自分で持ってくる。

```tsx
export function RootErrorBoundary() {
  const error = useRouteError()
  const { revalidate, state } = useRevalidator()

  return <ErrorFallback error={error} onRetry={revalidate} retrying={state === 'loading'} />
}
```

だからルートにはコンポーネントを差し込むだけでよい。子ルートの `ErrorBoundary` も同じかたちで、同じフックを使う。二つを分けるのはコードではなく **付いているルート**だ。どのルートに付いたかが、そのまま fallback の描かれる範囲になる。

### 受け渡す ErrorBoundary

`react-error-boundary` の `ErrorBoundary` は逆だ。エラーも reset 関数も自分が持っているので、fallback 側へ渡さなければならない。だから三つの prop があり、型定義がその三つを互いに排他として縛っている。

**`fallback`** は完成した要素をそのまま受け取る。`fallback={<p role="alert">댓글을 불러오지 못했어요</p>}` のように書く。エラーも reset 関数も渡さない。メッセージが固定で、再試行する方法もないときだけ使える。

**`FallbackComponent`** はコンポーネントを受け取り、`error` と `resetErrorBoundary` を props として渡す。複数の `ErrorBoundary` が同じ fallback を共有するときはきれいだが、props の名前が `resetErrorBoundary` に固定なので、受け取る側がその名前を知っていなければならない。

```tsx
function CommentsFallback({ error, resetErrorBoundary }: FallbackProps) {
  return <ErrorFallback error={error} onRetry={resetErrorBoundary} />
}

<ErrorBoundary onReset={reset} FallbackComponent={CommentsFallback}>
  <CommentList postId={postId} />
</ErrorBoundary>
```

コードの `reset` は、TanStack Query の `QueryErrorResetBoundary` が渡す関数だ。エラー状態で残ったクエリを解いて再試行が再リクエストするようにするもので、なぜ必要なのかは下の再試行の節で扱う。

`ErrorFallback` は `onRetry` を受け取るので名前が合わない。そのため、名前を移すためだけのコンポーネントがもうひとつ要る。

**`fallbackRender`** は関数を受け取り、その場でレンダーする。

```tsx
<ErrorBoundary
  onReset={reset}
  fallbackRender={({ error, resetErrorBoundary }) => (
    <ErrorFallback error={error} onRetry={resetErrorBoundary} />
  )}
>
```

筆者はこれを選んだ。理由は **その場で名前を差し替えられるから**だ。上で `resetErrorBoundary` が `onRetry` に変わった。おかげで `ErrorFallback` は `error` と `onRetry` だけを知るコンポーネントになり、復旧手段が `revalidate` であるルート `ErrorBoundary` と、`resetErrorBoundary` である `ErrorBoundary` が **同じ fallback を使う。**

**二つの層の画面が食い違わないことが、この選択の値打ちだ。** 層を四つに分けると、ユーザーが見る失敗画面も四つになりかねないが、名前を一度差し替えるだけでひとつになる。


## 再試行を付けない失敗

fallback に再試行ボタンを付けても、すべての失敗が解けるわけではない。`ErrorBoundary` は自分の状態しか戻さないからだ。クエリのエラーは `QueryErrorResetBoundary` の `reset` を `onReset` につないで初めて再リクエストされ、サーバーが 200 で返した想定外の値を読んで起きたレンダーエラーは `queryFn` で先に検査してクエリのエラーに変えて初めて解け、`React.lazy` のチャンク読み込みの失敗は再読み込みでしか解けない。三つの場合をソースで確かめた過程は、[再試行ボタンが効かない理由](/251128)に別途まとめておいた。このように復旧できる失敗とできない失敗が分かれるので、ボタンも分けなければならない。

すべての失敗に同じボタンを見せるのは、ユーザーに **できない行動を案内するようなもの**だ。404 で再試行を押しても同じ 404 が返ってくる。権限がなくて受け取った 403 も同じだ。チャンク読み込みの失敗は、上で見たとおりそもそも効かない。

共有する fallback の中で一度だけ分けておけばよい。

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

`isRouteErrorResponse` がここに一緒にある理由がある。ルート `ErrorBoundary` とツリーに置く `ErrorBoundary` が fallback を共有するので、この関数が **二種類のエラーをどちらも受ける。** ルーターが投げた `Response` からステータスコードを読む方法と、自分で作った HTTP エラーから読む方法が違うので、両方を見る。

巨大な分岐を最初から作る必要はない。**もう一度押して結果が変わる失敗と、そうでない失敗**だけ分けておけばよい。


## ErrorBoundary が失敗を見る時刻

`ErrorBoundary` をすべて置いたが、まだひとつ残っている。**`ErrorBoundary` はいつ見るのか。**

層は上から下へ決めたが、実行の順序は逆だ。再試行がすべて尽きたあとで、ようやく `ErrorBoundary` が何かを見る。だから再試行の条件は **`ErrorBoundary` 設計の一部**だ。

既定値が場所ごとに違う。どちらも同じ `createRetryer` を使うが、渡す値が違う。クエリは何も渡さないので `retryer.js` の既定を受け取る。

```js
const retry = config.retry ?? (isServer() ? 0 : 3);
```

mutation は `mutation.js` で直接 0 を入れる。

```js
retry: this.options.retry ?? 0,
```

**mutation が 0 だというのは、リクエストが一度エラーで終われば、その操作がすぐ失敗するという意味だ。** 取り消しにくい操作に再試行がないのは安全な既定値だが、その操作が冪等なら、もう一度送るほうがユーザーにはよい。

両方に同じ条件を明示するほうがよい。

```ts
const MAX_RETRY = 2

export function retryOnServerError(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRY) return false
  return !isHttpError(error) || error.status >= 500
}
```

`failureCount` は 0 から始まり、**最初の失敗のときに 0 で問い合わせる。** だから `MAX_RETRY` が 2 なら、合計三回送って止まる。再試行の回数であって、試行の回数ではない。

**4xx を外したのが要点だ。** リクエスト自体が誤っているので、何度送っても同じ答えが返ってくる。ところが外す理由は無駄だけではない。既定の遅延が指数的に伸びる。

```js
function defaultRetryDelay(failureCount) {
	return Math.min(1e3 * 2 ** failureCount, 3e4);
}
```

最初の再試行が 1 秒、その次が 2 秒なので、二回再試行するだけで 3 秒が過ぎる。4xx を除かなければ、**直せない失敗を 3 秒のあいだ隠すようなもの**だ。

レンダーのエラーとチャンクの失敗には、この時間がない。リクエストを送らないので再試行そのものがなく、投げた瞬間に `ErrorBoundary` が見る。**同じ fallback がある失敗では 3 秒後に、ある失敗では即座に出る理由がこれだ。**

再試行を有効にする前に確かめる前提がひとつある。そのリクエストは **冪等か。** 同じリクエストを二度送っても結果が同じでなければならない。サーバーがそれを保証しないなら、再試行はバグを作る機能だ。


## おわりに

この記事では、失敗を受ける場所ごとに何を置くかを決めた。内容をまとめると次のようになる。

- `ErrorBoundary` の位置は、明け渡してよい範囲で決まる。何を包むかではなく、これが死んだら何が残らなければならないかで問う。
- 三つの層の `ErrorBoundary` は、どれひとつ消せない。loader が投げたものはツリーの `ErrorBoundary` が受けられず、`revalidate` はクエリキャッシュを解けず、下にもうひとつ置くのは範囲を狭める仕事だ。
- 領域をまるごと捨ててよいなら `ErrorBoundary`、その場所の文言が必要なら `useQuery` だ。後者を選ぶなら、四つの状態をすべて扱わなければならない。
- `fallbackRender` で名前を差し替えれば、層が違っても fallback がひとつになる。
- 再試行は、投げた側の状態を解いてはじめて効く。クエリは `reset`、レンダーのエラーは `queryFn` へ引き上げて、チャンクは再読み込みだ。
- `ErrorBoundary` が失敗を見る時刻は、再試行の条件が決める。4xx を除かなければ、直せない失敗を数秒隠すことになる。

`ErrorBoundary` ひとつとトーストで十分ではないかと問うこともできる。画面が二つか三つの製品ならもっともな話で、実際 **層の数は製品が決める。** 画面が一枚なら明け渡すものも一枚だけなので、範囲の差が見えない。画面の中に独立した領域が増えるほど、その差は大きくなる。

ただし数とは無関係に残るものがある。ツリーに `ErrorBoundary` をいくつ置いても `loader` が投げたものはそこへは行かず、再試行は投げた側の状態を解かないかぎり効かない。**減らせるのは層であって、これらの事実ではない。**

:::ref
- [docs] [TanStack Query, QueryErrorResetBoundary](https://tanstack.com/query/latest/docs/framework/react/reference/QueryErrorResetBoundary)
- [docs] [TanStack Query, Suspense](https://tanstack.com/query/latest/docs/framework/react/guides/suspense)
- [docs] [React Router, Error Boundaries](https://reactrouter.com/how-to/error-boundary)
- [repo] [bvaughn/react-error-boundary](https://github.com/bvaughn/react-error-boundary)
- [article] [TkDodo, React Query Error Handling](https://tkdodo.eu/blog/react-query-error-handling)
- [article] [TkDodo, Mastering Mutations in React Query](https://tkdodo.eu/blog/mastering-mutations-in-react-query)
:::
