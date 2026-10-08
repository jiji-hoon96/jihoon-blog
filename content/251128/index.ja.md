---
emoji: 🔁
title: "再試行ボタンが効かない理由"
seoTitle: "ErrorBoundary の再試行が効かないとき、QueryErrorResetBoundary と lazy"
date: '2025-11-28'
updatedAt: '2026-10-08'
categories: フロントエンド React TanStack-Query エラーハンドリング
description: "react-error-boundary の再試行ボタンを押しても同じ fallback がまた出る三つの場合をソースで確かめる。クエリのエラーは QueryErrorResetBoundary、レンダーエラーは queryFn の検査、React.lazy のチャンク失敗は再読み込みで解く。"
keywords: "ErrorBoundary 再試行が効かない, QueryErrorResetBoundary, retryOnMount, resetErrorBoundary, onReset, React.lazy チャンク読み込み失敗, useSuspenseQuery エラー, react-error-boundary"
locale: ja
translationOf: '251128'
sourceHash: 69901addb5820c18cdd362ff593f6e5f6d828a1efe5e78e7059cb26bf22b2e07
---

今回の記事では、**`ErrorBoundary` の再試行ボタンがなぜ効かないのか**について話してみたい。

`react-error-boundary` の fallback に再試行ボタンを付けたのに、押しても同じ画面がまた出てくるフロントエンド開発者に向けて、失敗の状態が残る三つの場合と、場合ごとの解き方をまとめた記事である。短く答えると、`ErrorBoundary` は自分の状態しか戻さず、失敗を生んだ状態は投げた側にそのまま残るからだ。

例は TanStack Query と `react-error-boundary` を一緒に使う構成だ。ライブラリの動作はインストール済みのソースを開いて確かめ、引用したコードは `@tanstack/react-query` 5.104.1、`react-error-boundary` 6.1.6、React 19.2.3 のビルドファイルと一字一句同じだ（2026-10-08 に照合）。


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

だからといって永遠に鍵がかかるわけではない。fallback が出ているあいだはそのクエリを見るコンポーネントがないので非アクティブなクエリになり、[TanStack Query のデフォルト](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)どおり 5 分たつとキャッシュから消される。そのあとで押すとキャッシュにエラーがないので、最初から再リクエストする。だから `onReset` をつなぎ忘れたコードでも、しばらくして押すと動くように見える。再現がまちまちなら、押したのが `gcTime` の前か後かをまず見る。

![上は onReset をつながなかったときの流れで、再試行クリック、EB 解除、再マウント、キャッシュのエラーをまた投げるが続き、最後から最初の枠へ赤い矢印が戻ってきて同じ fallback と書かれている。下は onReset をつないだときで、再試行クリック、onReset と鍵の解除、EB 解除と再マウント、再リクエストが青い矢印で一方向に続く](1.png?w=720)

**鍵がかかるのは `ErrorBoundary` に引き上げたクエリだけであり、だから二つの状態を一緒に解かなければならない。** その印を立てるのが `QueryErrorResetBoundary` だ。ソースを開くと状態は boolean ひとつだ。

```js
reset: () => {
	isReset = true;
},
```

印を立てるだけで誰も下ろさないなら、その後のエラーはすべて鍵なしで再リクエストすることになる。下ろすのはクエリのフックだ。再マウントされたフックはレンダー中に印を読み、`retryOnMount` を切らない。同じ印を見る `getHasError` もキャッシュのエラーを投げない。そして画面に載ったあと、effect で印を下ろす。同じ `errorBoundaryUtils.js` にある関数だ。

```js
const useClearResetErrorBoundary = (errorResetBoundary) => {
	React.useEffect(() => {
		errorResetBoundary.clearReset();
	}, [errorResetBoundary]);
};
```

だから boolean ひとつで「今回一度だけ再試行する」動作になる。

この `reset` を `ErrorBoundary` の `onReset` につないでやればよい。TanStack Query のドキュメントとソースのコメントも、このようにつなぐコードを例として載せている。

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

`QueryErrorResetBoundary` で囲まずに `useQueryErrorResetBoundary()` から `reset` を取り出して `onReset` につないでも再試行は動く。囲む境界がなければ、このフックがモジュール全体のデフォルト値を返すからだ。そのかわり [Suspense ガイド](https://tanstack.com/query/latest/docs/framework/react/guides/suspense)が書くとおりリセットはグローバルにかかり、アプリ全体がひとつの印を共有する。

名前に `Query` を付けたのも意図だ。`AsyncBoundary` と呼ぶと、どんな非同期にも使えるように読めるが、中に `QueryErrorResetBoundary` が入っているのでそうではない。同じ理由で `pendingFallback` に既定値を置かなかった。既定値があると、呼び出し地点の一行だけを見ても何が敷かれるのか分からない。

### reset が解けないレンダーのエラー

二つめは、サーバーが 200 で想定と違うかたちを返し、それを読むレンダーが `TypeError` を投げる場合だ。同じ `ErrorBoundary` が受け、`onReset` もつないであるのに、再試行が効かない。

`reset` が解くのは **エラー状態のクエリ**だ。ところがこのクエリは成功した。サーバーが 200 を返し、キャッシュにはその値が正常なデータとして入っている。エラーを出したのは、その値を読んだレンダーだ。だから `reset` には解くものがなく、再マウントされたコンポーネントはキャッシュの同じ値をレンダー中に読んで同じ行でまた投げる。画面に載る前に投げるので、クエリを購読する機会もない。`staleTime` を 0 にしても再リクエストしない理由だ。

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

`fetch` のレスポンスの `json()` は `Promise<any>` を返すので、その後に付けた型は検査ではなく宣言であり、サーバーが返した値を確かめるランタイム検査は自分で置かなければならない。**その検査を `queryFn` へ引き上げると**、同じ失敗が **クエリのエラー**になる。キャッシュにはエラー状態で残り、`reset` がそれを解き、再試行が再リクエストする。

`ErrorBoundary` が受けてくれるからランタイム検査は後回しにしよう、と先送りすると、受けはするが戻せない fallback ができる。

### 再読み込みだけが解く lazy

三つめはチャンク読み込みの失敗だ。今度は `reset` も `queryFn` も関係がない。状態を持っているのが `lazy` 自身だ。

React の `lazyInitializer` は拒否を `payload` に書き留め、その後は毎回同じものをまた投げる。

```js
throw payload._result;
```

もう一度 `import()` はしない。`lazy()` の呼び出しはモジュールの最上位で一度起き、その `payload` はアプリが生きているあいだそのままだ。`ErrorBoundary` を解いて再マウントしても、同じエラーがまた来る。

それなら `lazy` を作り直して `import()` をもう一度呼べばどうか。これまではブラウザが止めていた。モジュールマップが失敗した結果を覚えていて、同じ URL を取り直さなかった。この動作を変える [HTML 仕様の変更](https://github.com/whatwg/html/pull/10327)が 2026-07-15 にマージされた。2026-10-08 に確認したエンジンごとの状況はこうだ。Firefox は [155 に入れて](https://bugzilla.mozilla.org/show_bug.cgi?id=2055211) 2026-09-01 にリリースした。WebKit は [main に入ったが](https://bugs.webkit.org/show_bug.cgi?id=319492)、Safari の安定版に載ったかは確認できなかった。Chrome は [chromestatus](https://chromestatus.com/feature/5214647044145152) でまだ Proposed だ。だから Chrome では新しい `import()` も同じ失敗を返す。

だからこの失敗の復旧は、ページをもう一度受け取ることだ。ブラウザが取り直してくれるようになっても、すべてが解けるわけではない。チャンクの読み込み失敗はネットワークが切れても起きるし、[Vite のドキュメント](https://vite.dev/guide/build#load-error-handling)が説明するように新しいデプロイが古いチャンクを消しても起きる。消えたチャンクはもう一度リクエストしても存在しないので、その場合の復旧はやはり再読み込みだ。原因をひとつに断定できないので、fallback の文言も新しいバージョンが出たと言い切るより再読み込みを勧めるほうがよい。

まとめると、クエリのエラーは `reset` で、レンダーのエラーは `queryFn` であらかじめクエリのエラーに変えて、チャンクの失敗は再読み込みで解く。


## おわりに

再試行ボタンが効かないなら、ボタンや `ErrorBoundary` より先に、**何が投げ、その状態がどこに残っているのか**を確かめてみてほしい。クエリのキャッシュなのか、サーバーが返した値を読んだレンダーなのか、`lazy` なのかによって、解く場所が違う。

`ErrorBoundary` を画面のどこにいくつ置くか、再試行ボタンをそもそも付けない失敗は何かは、[ErrorBoundary の配置](/251203)で扱う。

:::ref
- [docs] [TanStack Query, QueryErrorResetBoundary](https://tanstack.com/query/latest/docs/framework/react/reference/QueryErrorResetBoundary)
- [repo] [bvaughn/react-error-boundary](https://github.com/bvaughn/react-error-boundary)
:::
