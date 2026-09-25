---
emoji: 🧱
title: 'ErrorBoundary の配置'
seoTitle: 'ErrorBoundary はどこに置くか、層と範囲と QueryErrorResetBoundary'
date: '2025-12-03'
categories: フロントエンド React TanStack-Query エラーハンドリング
description: 'エラーがどこへ行くのか分かったら、次は受け取る場所を置く番だ。ErrorBoundary を何層に分けるか、ひとつの失敗に画面をどれだけ明け渡すか、そして再試行ボタンを本当に再試行させるには何を一緒に解かなければならないかを、インストール済みのソースで確かめる。'
keywords: 'React ErrorBoundary 配置, ネストルート ErrorBoundary, QueryErrorResetBoundary, 再試行が効かない, retryOnMount, fallbackRender, useRouteError, revalidate, React.lazy チャンク読み込み失敗, TanStack Query retry 条件, ErrorBoundary 設計'
locale: ja
translationOf: '251203'
sourceHash: 3494eb97de287571e9a6a2a7003d815dddb21da5a3a048746bef38b8bb6101c4
---

今回の記事では、**受け取ったエラーをどこで受けるのか**について話してみたい。[エラーの伝播](/251117)では同じエラーを七か所から投げて、その到着地を数えた。この記事は、その到着地ごとに受ける場所を置く話だ。

伝播の経路が分かると、次の問いが自然に続く。**`ErrorBoundary` をいくつ置き、どこに置くのか。** ひとつで足りるのか、画面ごとに置くべきか、ライブラリが用意するものと自分で作ったものが重なるのか。その分かれ目がここにある。

先に結論を書くと、`ErrorBoundary` の数は好みではなく、二つのことが決める。**何が投げるか**と、**それが死んだとき画面に何が残らなければならないか**だ。前者は 1 編で扱ったので、この記事は後者から始める。


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

1 編で見たとおりだ。`ErrorBoundary` は `getDerivedStateFromError` と `componentDidCatch` で作られたクラスなので、**React のツリーの中で捕まったもの**だけが来る。loader はレンダーが始まる前にツリーの外で走る関数だ。そこで投げたものは React を経由しないので、いくら包んでも見えない。

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

`ErrorBoundary` に引き上げるとコードが減る。中で `useSuspenseQuery` を呼べば、そのコンポーネントには `isPending` も `isError` もない。待機は外側の `Suspense` が、失敗は外側の `ErrorBoundary` が受ける。コンポーネントはデータがある場合だけを描く。

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


## 再試行が効かない三つの場合

fallback に再試行ボタンを付けた。ユーザーが失敗を戻そうとして押す、あのボタンだ。押してみよう。**効かない。** 同じ画面がそのまま出てくる。

三つの理由で起き、解き方もそれぞれ違う。共通点はひとつだ。**`ErrorBoundary` は自分の状態だけを戻す。** 投げた側が持っている状態は、投げた側で解かなければならない。

### reset が解くクエリのエラー

`resetErrorBoundary()` がやることは、`ErrorBoundary` の内部フラグを戻すことだけだ。children が再マウントされ、クエリが再び購読される。ところがそのクエリはキャッシュに **エラー状態で刺さっている。** だから即座に同じエラーをまた投げ、`ErrorBoundary` はまた fallback を描く。

なぜ再リクエストせずに古いエラーを使うのかもソースにある。`errorBoundaryUtils.js` がこう鍵をかける。

```js
if (options.suspense || throwOnError) {
  if (!errorResetBoundary.isReset()) options.retryOnMount = false;
}
```

外側のガードから読まなければならない。**この鍵は投げるクエリにだけかかる。** `suspense` であるか `throwOnError` を有効にしたクエリが reset の印なしでマウントされると、再試行が切られる。投げない `useQuery` は該当しないので、再マウントすればそのまま再リクエストする。

![上は onReset をつながなかったときの流れで、再試行クリック、EB 解除、再マウント、キャッシュのエラーをまた投げるが続き、最後から最初の枠へ赤い矢印が戻ってきて同じ fallback と書かれている。下は onReset をつないだときで、再試行クリック、onReset と鍵の解除、EB 解除と再マウント、再リクエストが青い矢印で一方向に続く](2.png?w=720)

**鍵がかかるのは `ErrorBoundary` に引き上げたクエリだけであり、だから二つの状態を一緒に解かなければならない。** その印を立てるのが `QueryErrorResetBoundary` だ。ソースを開くと状態は boolean ひとつだ。

```js
reset: () => {
	isReset = true;
},
```

この `reset` を `ErrorBoundary` の `onReset` につないでやればよい。TanStack Query のドキュメントとソースのコメントが、同じ配線を例として載せている。

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

順序が重要だ。そしてその順序は `react-error-boundary` が保証する。ビルドされたファイルなので名前が一文字に縮んでいるが、構造はそのまま読める。

```js
resetErrorBoundary(...e) {
  const { didCatch: t } = this.state;
  t && (this.props.onReset?.({ args: e, reason: "imperative-api" }), this.setState(d));
}
```

カンマ演算子で結ばれているので、**`onReset` が先に走り `setState` が後**だ。`d` は `didCatch` が `false` の初期状態だ。だからキャッシュの鍵が解けたあとに children が再マウントされる。**一行の差で、再試行が本当の再試行になる。**

名前に `Query` を付けたのも意図だ。`AsyncBoundary` と呼ぶと、どんな非同期にも使えるように読めるが、中に `QueryErrorResetBoundary` が入っているのでそうではない。同じ理由で `pendingFallback` に既定値を置かなかった。既定値があると、呼び出し地点の一行だけを見ても何が敷かれるのか分からない。

### reset が解けないレンダーのエラー

二つめは 1 編で見た場合だ。サーバーが 200 で想定と違うかたちを返し、それを読むレンダーが `TypeError` を投げる。同じ `ErrorBoundary` が受け、`onReset` もつないであるのに、再試行が効かない。

`reset` が解くのは **エラー状態のクエリ**だ。ところがこのクエリは成功した。サーバーが 200 を返し、キャッシュにはその値が正常なデータとして入っている。エラーを出したのは、その値を読んだレンダーだ。だから `reset` には解くものがなく、再マウントされたコンポーネントは `staleTime` の残った同じキャッシュを受け取り、同じ行でまた投げる。

直す場所は **`queryFn`** だ。

```ts
queryFn: async () => {
  const data = await getComments(postId)
  if (!Array.isArray(data.comments)) {
    throw new TypeError('comments 가 배열이 아니다')
  }
  return data.comments
},
```

1 編で、型が終わる場所がランタイム検査を置く場所だと書いた。**その場所がここだ。** その検査を `queryFn` へ引き上げると、同じ失敗が **クエリのエラー**になる。キャッシュにはエラー状態で残り、`reset` がそれを解き、再試行が再リクエストする。

`ErrorBoundary` が受けてくれるからランタイム検査は後回しにしよう、と先送りすると、受けはするが戻せない fallback ができる。

### 再読み込みだけが解く lazy

三つめはチャンク読み込みの失敗だ。今度は `reset` も `queryFn` も関係がない。状態を持っているのが `lazy` 自身だ。

1 編で見たとおり、React の `lazyInitializer` は拒否を `payload` に書き留め、その後は毎回同じものをまた投げる。

```js
throw payload._result;
```

もう一度 `import()` はしない。`lazy()` の呼び出しはモジュールの最上位で一度起き、その `payload` はアプリが生きているあいだそのままだ。`ErrorBoundary` を解いて再マウントしても、同じエラーがまた来る。

だからこの失敗の復旧は、ページをもう一度受け取ることだ。新しいバージョンが配備されたという意味でもあるので、ユーザーにそう伝えるほうがよい。

三つの場合を並べてみると、再試行ボタンひとつが三つの違う仕事をしなければならない。クエリのエラーは `reset` で、レンダーのエラーは `queryFn` であらかじめクエリのエラーに変えて、チャンクの失敗は再読み込みで解く。**`ErrorBoundary` はそのどれも代わりにやってくれない。**


## 再試行を付けない失敗

復旧できる失敗とできない失敗を分けたので、ボタンも分けなければならない。

すべての失敗に同じボタンを見せるのは、ユーザーに **できない行動を案内するようなもの**だ。404 で再試行を押しても同じ 404 が返ってくる。権限がなくて受け取った 403 も同じだ。チャンク読み込みの失敗は、前の節で見た理由でそもそも効かない。

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

1 編でエラーがどこへ行くのかを扱い、この記事ではその場所に何を置くかを決めた。内容をまとめると次のようになる。

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
