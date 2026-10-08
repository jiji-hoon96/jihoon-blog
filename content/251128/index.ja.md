---
emoji: 🔁
title: "再試行ボタンが効かない理由"
seoTitle: "React ErrorBoundary の再試行ボタンが効かないときに確認する3つの原因"
date: '2025-11-28'
updatedAt: '2026-10-08'
categories: フロントエンド React TanStack-Query エラーハンドリング
description: "react-error-boundary の再試行ボタンを押しても同じ fallback がまた出る三つの場合をソースで確かめる。クエリのエラーは QueryErrorResetBoundary、レンダーエラーは queryFn の検査、React.lazy のチャンク失敗は再読み込みで解く。"
keywords: "ErrorBoundary 再試行が効かない, QueryErrorResetBoundary, retryOnMount, resetErrorBoundary, onReset, React.lazy チャンク読み込み失敗, useSuspenseQuery エラー, react-error-boundary"
locale: ja
translationOf: '251128'
sourceHash: fcf6001b4010f388052cef96f91df83091e0a33fd111de033ea9cf622021a566
---

今回の記事では、**`ErrorBoundary` の再試行ボタンがなぜ効かないのか**について話してみたい。

`react-error-boundary` の fallback に再試行ボタンを付けたのに、押しても同じ画面がまた出てくるフロントエンド開発者に向けて、失敗の状態が残る三つの場合と、場合ごとの解き方をまとめた記事である。短く答えると、`ErrorBoundary` は自分の状態しか戻さず、失敗を生んだ状態は投げた側にそのまま残るからだ。

例は TanStack Query と `react-error-boundary` を一緒に使う構成だ。ライブラリの動作はインストール済みのソースを開いて確かめ、引用したコードは `@tanstack/react-query` 5.104.1、`react-error-boundary` 6.1.6、React 19.2.3 のビルドファイルと構造が同じだ（2026-10-08 に照合）。インデントと改行は読みやすさのために変えた箇所がある。


## 再試行が効かない三つの場合

原因は三つあり、解く場所もそれぞれ違う。共通点はひとつだ。**`ErrorBoundary` は自分の状態だけを戻す。** 投げた側が持っている状態は、投げた側で解かなければならない。

### reset が解くクエリのエラー

`resetErrorBoundary()` がやることは、`ErrorBoundary` の内部状態（`didCatch`）を戻すことだけだ。children が再マウントされると、クエリのフックはキャッシュを読み直す。ところがそのクエリはキャッシュに **エラー状態で刺さっている。** だからフックはレンダー中に同じエラーをすぐ投げ、`ErrorBoundary` はまた fallback を描く。

なぜ再リクエストせずに古いエラーを使うのかもソースにある。`errorBoundaryUtils.js` が再マウント時の再リクエストをこう切る。

```js
if (options.suspense || throwOnError) {
  if (!errorResetBoundary.isReset()) options.retryOnMount = false;
}
```

外側のガードから読まなければならない。**この条件は投げるクエリにだけかかる。** `suspense` であるか `throwOnError` を有効にしたクエリが、`isReset()` が偽のままマウントされると、`retryOnMount` が `false` になって再リクエストが切られる。投げない `useQuery` は該当しないので、再マウントすればそのまま再リクエストする。

ただし `retryOnMount` を切ることが効くのは、キャッシュに一度もデータがなかったクエリ、つまり初回ロードで失敗したクエリだけだ。データがあったクエリは失敗すると `isInvalidated` が真になって stale として扱われ、再マウント時に `refetchOnMount` で再リクエストする。この記事が言うクエリのエラーは初回ロードの失敗だ。

だからといって再リクエストが永遠に切られたままではない。fallback が出ているあいだはそのクエリを見るコンポーネントがないので非アクティブなクエリになり、[TanStack Query のデフォルト](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)どおり 5 分たつとキャッシュから消される。そのあとで押すとキャッシュにエラーがないので、最初から再リクエストする。だから `onReset` をつなぎ忘れたコードでも、しばらくして押すと動くように見える。再現がまちまちなら、押したのが `gcTime` の前か後かをまず見る。

![上は onReset をつながなかったときの流れで、再試行クリック、ErrorBoundary 解除、再マウント、キャッシュのエラーをまた投げるが続き、最後から最初の枠へ赤い矢印が戻ってきて同じ fallback と書かれている。下は onReset をつないだときで、再試行クリック、onReset と reset() の呼び出し、ErrorBoundary 解除と再マウント、再リクエストが青い矢印で一方向に続く](1.png?w=720)

**`retryOnMount` が切られるのは `ErrorBoundary` に引き上げたクエリだけであり、だから `ErrorBoundary` とクエリを一緒に解かなければならない。** `isReset()` が読むフラグを立てるのが `QueryErrorResetBoundary` だ。ソースを開くと状態は boolean ひとつだ。

```js
reset: () => {
	isReset = true;
},
```

フラグを立てるだけで誰も下ろさないなら、その後のエラーでも `retryOnMount` が切られず、毎回再リクエストすることになる。下ろすのはクエリのフックだ。再マウントされたフックはレンダー中にフラグを読み、`retryOnMount` を切らない。同じフラグを見る `getHasError` もキャッシュのエラーを投げない。そして画面に載ったあと、effect でフラグを下ろす。同じ `errorBoundaryUtils.js` にある関数だ。

```js
const useClearResetErrorBoundary = (errorResetBoundary) => {
	React.useEffect(() => {
		errorResetBoundary.clearReset();
	}, [errorResetBoundary]);
};
```

だから boolean ひとつで「今回一度だけ再試行する」動作になる。再試行一回を順に書くとこうなる。

1. `reset()` が `isReset` フラグを立てる。
2. 再マウントされたクエリのフックがレンダー中にフラグを見て、`retryOnMount` を切らない。
3. フラグが立っていれば、フックはキャッシュのエラーの代わりにリクエスト中の状態を見て再リクエストする（`useSuspenseQuery` はレンダー中にリクエストを送って suspend する）。
4. リクエストが成功して画面に載れば effect の `clearReset()` が、また失敗すればそのリクエストの `catch` がフラグを下ろす。
5. フラグが下りたので、その後のエラーでは再び `retryOnMount` が切られる。

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

`react-error-boundary` の `resetErrorBoundary` はこうなっている。ビルドされたファイルなので名前が一文字に縮んでいるが、構造はそのまま読める。

```js
resetErrorBoundary(...e) {
  const { didCatch: t } = this.state;
  t && (this.props.onReset?.({ args: e, reason: "imperative-api" }), this.setState(d));
}
```

`didCatch` が真のときだけ `onReset` を呼び、状態を初期値 `d`（`didCatch: false`）に戻す。`setState` はハンドラーが終わったあとにレンダーされるので、children が再マウントされるときには `reset()` が立てたフラグがすでに立っている。だから `onReset` に `reset` をつなぐだけでよい。

`QueryErrorResetBoundary` で囲まずに `useQueryErrorResetBoundary()` から `reset` を取り出して `onReset` につないでも再試行は動く。囲む境界がなければ、このフックがモジュール全体のデフォルト値を返すからだ。そのかわり [Suspense ガイド](https://tanstack.com/query/latest/docs/framework/react/guides/suspense)が書くとおりリセットはグローバルにかかり、アプリ全体がひとつの `isReset` フラグを共有する。

### reset が解けないレンダーのエラー

二つめは、サーバーが 200 で想定と違うかたちを返し、それを読むレンダーが `TypeError` を投げる場合だ。同じ `ErrorBoundary` が受け、`onReset` もつないであるのに、再試行が効かない。

`reset` が解くのは **エラー状態のクエリ**だ。ところがこのクエリは成功した。サーバーが 200 を返し、キャッシュにはその値が正常なデータとして入っている。エラーを出したのは、その値を読んだレンダーだ。だから `reset` には解くものがなく、再マウントされたコンポーネントはキャッシュの同じ値をレンダー中に読んで同じ行でまた投げる。画面に載る前に投げるので、クエリを購読する機会もない。`staleTime` を 0 にしても再リクエストしない理由だ。このクエリも `gcTime` が過ぎればキャッシュから消されて再リクエストされるが、サーバーが同じ値を返す限り同じ行でまた投げる。

直す場所は **`queryFn`** だ。

```ts
queryFn: async () => {
  const res = await fetch(`/api/posts/${postId}/comments`)
  const data = await res.json()
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

それなら `lazy` を作り直して `import()` をもう一度呼べばどうか。これまではブラウザが止めていた。モジュールマップが失敗した結果を覚えていて、同じ URL を取り直さなかった。この動作を変える [HTML 仕様の変更](https://github.com/whatwg/html/pull/10327)が 2026-07-15 にマージされた。2026-10-08 に確認したエンジンごとの状況はこうだ。Firefox は [155 に入れて](https://bugzilla.mozilla.org/show_bug.cgi?id=2055211) 2026-09-01 にリリースした。WebKit は 2026-08-19 に [main に入り](https://bugs.webkit.org/show_bug.cgi?id=319492)、そのバグ記録にはこの変更を載せた Safari 安定版のバージョンが書かれていない。Chrome は [chromestatus](https://chromestatus.com/feature/5214647044145152) でまだ Proposed だ。だから Chrome では新しい `import()` も同じ失敗を返す。

これは Vite のように、ブラウザのネイティブ `import()` でチャンクを取得するビルドの話だ。webpack のランタイムはチャンクを script タグで取得し、失敗したチャンクの記録を消すので、新しい `lazy` で呼び直せば再リクエストする。

どちらにしても、すでに作った `lazy` はもう一度試さないので、この失敗の基本的な復旧はページをもう一度受け取ることだ。ブラウザが取り直してくれるようになっても、すべてが解けるわけではない。チャンクの読み込み失敗はネットワークが切れても起きるし、[Vite のドキュメント](https://vite.dev/guide/build#load-error-handling)が説明するように新しいデプロイが古いチャンクを消しても起きる。消えたチャンクはもう一度リクエストしても存在しないので、その場合の復旧はやはり再読み込みだ。原因をひとつに断定できないので、fallback の文言も新しいバージョンが出たと言い切るより再読み込みを勧めるほうがよい。

まとめると、クエリのエラーは `reset` で、レンダーのエラーは `queryFn` であらかじめクエリのエラーに変えて、チャンクの失敗は再読み込みで解く。


## おわりに

再試行ボタンが効かないなら、ボタンや `ErrorBoundary` より先に、**何が投げ、その状態がどこに残っているのか**を確かめてみてほしい。クエリのキャッシュなのか、サーバーが返した値を読んだレンダーなのか、`lazy` なのかによって、解く場所が違う。

`ErrorBoundary` を画面のどこにいくつ置くか、再試行ボタンをそもそも付けない失敗は何かは、[ErrorBoundary の配置](/251203)で扱う。

:::ref
- [docs] [TanStack Query, QueryErrorResetBoundary](https://tanstack.com/query/latest/docs/framework/react/reference/QueryErrorResetBoundary)
- [repo] [bvaughn/react-error-boundary](https://github.com/bvaughn/react-error-boundary)
:::
