---
emoji: 🛡️
title: 'エラーの伝播'
seoTitle: "フロントエンドのエラー伝播経路、ErrorBoundary と throwOnError が受け取るもの"
date: '2025-11-17'
updatedAt: '2026-09-24'
categories: フロントエンド React TanStack-Query エラーハンドリング
description: '同じエラーを七か所から投げてみると、ErrorBoundary に届くのは四つだけだ。コンパイル時、レンダーとライフサイクル、サーバーデータ、ページ遷移、外部ライブラリ、イベントと非同期がそれぞれどこへ伝播するのかを、公式ドキュメントとインストール済みのソースで確認する。'
keywords: "フロントエンド エラーハンドリング, エラー伝播, React ErrorBoundary, ErrorBoundary が捕まえないもの, startTransition エラー, unhandledrejection, window onerror, React 19 onCaughtError, TanStack Query throwOnError, useSuspenseQuery エラー, react-router loader ErrorBoundary, React.lazy チャンク読み込み失敗, fetch は 404 で reject しない"
locale: ja
translationOf: '251117'
sourceHash: 3f6e8fa00d3cc487b5caedfdc24f91ad33196ab0eb9c55899c052ad83bdee38c
---

今回の記事では、**フロントエンドでエラーがどこまで登るのか**について話してみたい。

`ErrorBoundary` を置くこと自体は簡単だ。ルートに一つ置き、画面ごとに `ErrorBoundary` で包み、図を描けば空白はない。難しいのは、その `ErrorBoundary` が**実際に何を受け取るのか**を知ることだ。

タイトルの「伝播」は、**投げられたエラーがどの場所まで登って誰が受け取るのか**という意味だ。投げた場所と受け取る場所がいつも同じとは限らないので、別々に数えることにした。

そこで数えてみることにした。同じ `new Error('boom')` を場所だけ変えて七回投げ、それが `ErrorBoundary` に届くのか、それとも `ErrorBoundary` を素通りしてどこへ行くのかを見た。

下のウィジェットがその実験だ。左で投げる場所を選ぶと、点線の箱の中で実際にそのエラーが投げられる。点線の箱が `ErrorBoundary` で、`ErrorBoundary` が受け取ると中が fallback に変わる。受け取られなかったものは何も起きていないように見えるので、ウィジェットが `window` の `error` と `unhandledrejection` も一緒に聞いて、どこへ行ったのかを下に書く。

:::widget-error-propagation
:::

七つのうち四つだけが `ErrorBoundary` に届く。残りの三つは `ErrorBoundary` の中で投げられたのに、`ErrorBoundary` をそのまま素通りしてグローバルへ出ていく。

この記事では、その分かれ目がなぜ生まれるのかをエラーの種類ごとに確認する。コンパイル時に終わるもの、レンダーとライフサイクルで出るもの、サーバーデータから来るもの、ページ遷移で出るもの、外部ライブラリが投げるもの、イベントと非同期で出るものだ。それぞれがどこへ伝播するのかを調べていく。**受け取る場所を何層に分けるのか、どう戻すのかは扱わない**。伝播経路を知らないまま層から描くと、その層が空の箱になるので順番をこうした。

確認は二通りで行った。ライブラリの挙動は記憶ではなくインストール済みのソースを開いて読み、投げて確かめられるものは上のウィジェットで実際に動かした。


## ErrorBoundary

まず `ErrorBoundary` そのものを正確に置いておこう。`ErrorBoundary` は**クラスコンポーネントのライフサイクルメソッド二つ**だ。別の名前で呼んでいるだけである。

`react-error-boundary` にも実装は二つしかない。

```js
static getDerivedStateFromError(e) { ... }
componentDidCatch(e, t) { ... }
```

React の公式ドキュメントが、二つのメソッドが回る時点を分けている。`getDerivedStateFromError` は**レンダー段階**で回って fallback を描く状態を作り、`componentDidCatch` は**コミット段階**で回ってログのような副作用を担う。どちらにせよ、**React がツリーの中で捕まえて渡してくれたもの**だけを受け取る。

だから `ErrorBoundary` が受け取るものの定義は一つだ。**React が捕まえられる場所で投げられたか**である。

React のドキュメントは受け取らない側も書き残している。次の四つがそれだ。

::::quote
:::translation
イベントハンドラ、サーバーレンダリング、`ErrorBoundary` 自身が投げたもの、非同期コード(たとえば `setTimeout` や `requestAnimationFrame` のコールバック)。例外が一つあり、`useTransition` フックが返す `startTransition` 関数だ。その transition 関数の中で投げたものは Error Boundary が捕まえる。
:::

:::original
Event handlers, Server side rendering, Errors thrown in the error boundary itself (rather than its children), Asynchronous code (e.g. `setTimeout` or `requestAnimationFrame` callbacks); an exception is the usage of the `startTransition` function returned by the `useTransition` Hook. Errors thrown inside the transition function are caught by error boundaries
:::
::::

上のウィジェットの結果がこの文章とぴたりと合う。七か所が二つの到達先に分かれる。

![左に投げた場所が七つ縦に並び、右に到達先が二つある。レンダー中、useEffect の中、startTransition の中、lazy の import 拒否の四つは青い矢印で ErrorBoundary へ行き、onClick ハンドラの中、setTimeout コールバックの中、Promise 拒否の三つは灰色の矢印で window へ行く](1.png?w=720)

`startTransition` が例外である理由は、その中の作業が React のスケジューラを通るからだ。React がその実行を自分の手で包んでいるので、捕まえてツリーへ戻せる。同じ理由で `setTimeout` は捕まえられない。そのコールバックが回る時点では、React はもうその場にいない。

先に知っておくべきことが一つある。**関数コンポーネントでは `ErrorBoundary` を作れない**。

React は投げられたエラーに出会うと、その場所から親の方向へ登りながら受け取る境界を探す。その巡回を担う `throwException` は fiber ごとに付いている `tag` を見るのだが、立ち止まる値はクラスコンポーネントとルートの二つだけだ。関数コンポーネントの `tag` はその二つではないので、探索はそのまま通り過ぎる。**境界になれない理由は API がないからではなく、探索がそもそも覗き込まないからだ**。

![横に四つの箱が並ぶ。左から関数コンポーネントの Child と FnBoundary が tag 0、クラスコンポーネントの ErrorBoundary が tag 1、ルートの HostRoot が tag 3 だ。Child から出発した矢印が FnBoundary を通り過ぎて ErrorBoundary で止まり、HostRoot へ続く線は点線になっている](2.png?w=720)

その `tag` は `React.Component` を継承しているかどうかで決まる。だから `getDerivedStateFromError` を関数に `static` として付けても意味がない。付けて動かしてみたところ、その関数は一度も呼ばれず、エラーは境界を見つけられずルートまで登って React がツリーを画面から取り除いた。

だから `react-error-boundary` を入れることは、ない機能を足す作業ではない。6.1.6 の `ErrorBoundary` も `Component` を継承したクラスで、二つのメソッドをそのまま持っている。ライブラリがやっているのは、そのクラスを一度だけ書いて隠すことだ。


## コンパイル時に終わるもの

種類を数えるついでに、いちばん手前のものから整理しよう。型エラーだ。

これだけはユーザーに届かない。存在しないプロパティを読んだり引数の型が合わなかったりすればビルドが止まり、止まったコードはデプロイされない。だから伝播経路を問う必要がない。**この記事から型エラーが抜けるのは重要ではないからではなく、ランタイムに存在しないからだ**。

問題はその次だ。型検査は**どこまで**保証するのか。

```ts
async function getComments(postId: string): Promise<Comment[]> {
  const res = await fetch(`/api/posts/${postId}/comments`)
  const data = await res.json()
  return data.comments
}
```

返り値の型が `Promise<Comment[]>` と書いてあるので、この関数を呼ぶすべてのコードが配列を受け取ると信じる。ところが `Response` の `json()` は TypeScript 5.9.3 の `lib.dom.d.ts` にこう宣言されている。

```ts
json(): Promise<any>;
```

`any` だ。ここから型検査が切れる。サーバーが渡した値をコンパイラは見たことがなく、その後ろに付けた型引数や返り値の型表記は**検査ではなく宣言**である。その宣言をランタイムで確かめるコードは誰も入れてくれない。

だからサーバーが `200` で `{ commits: null }` を返すと、`commits.length` を読む行がレンダー中に `TypeError` を投げる。HTTP は成功で型も通ったのに画面が壊れる。

**型が終わる場所がランタイム検査を置く場所だ**。その検査をどこに置くかによって、同じ失敗が違う経路へ行く。レンダーで読んでいて落ちればレンダーエラーになって `ErrorBoundary` へ行き、データを受け取る場所で先に検査して投げればそのリクエストの失敗になる。下の**レンダーとライフサイクル**の節でその内容を扱う。


## レンダーとライフサイクル

React のツリーの中で投げたものは伝播が単純だ。**いちばん近い `ErrorBoundary` が受け取る**。

レンダー中の例外がここに入る。上の `commits.length` がそうで、配列だと思っていた値に `map` を呼ぶのもそうだ。この種類は投げること以外にできることがないので、いつでも `ErrorBoundary` に届く。

`useEffect` の中で投げたものも捕まる。effect はコミットの後に React が直接実行するので、その実行を包める。ただし effect の**中で呼んだ非同期コールバック**は違う。

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

二つのコードは同じ `useEffect` の中にあるが、伝播経路が違う。**`ErrorBoundary` の中にあるかどうかではなく、React がその実行を握っているかどうかが基準だ**。

この種類でもう一つだけ覚えておけばよい。React 19 の開発モードのコンソールは、捕まえたエラーにコンポーネント名を付けてくれる。ウィジェットを動かしたとき、レンダーと effect と transition は `The above error occurred in the <Thrower> component` で、`lazy` だけが `occurred in one of your React components` だった。`lazy` は拒否される時点でまだコンポーネントがないので名前を書けない。スタックだけを見て場所を探すとき、この違いが手がかりになる。


## サーバーデータ

ここからがフロントエンド開発でさばかなければならない厄介な部分だ。理由は、サーバーの失敗が**自動でエラーにならない**からである。

### fetch はサーバーエラーで勝手に reject しない

MDN がこの点をはっきり書いている。

::::quote
:::translation
`fetch()` の promise は、リクエストそのものが失敗したときだけ reject される。たとえば URL の形式が不正だったり、ネットワークエラーが起きたりしたときだ。サーバーがエラーを意味する HTTP ステータスコード(`404` や `504` など)で応答した場合には reject されない。
:::

:::original
A `fetch()` promise only rejects when the request fails, for example, because of a badly-formed request URL or a network error. A `fetch()` promise does not reject if the server responds with HTTP status codes that indicate errors (`404`, `504`, etc.).
:::
::::

つまり `fetch` だけを使うなら、`500` の応答は**成功した Promise** だ。投げられていないので `ErrorBoundary` も知らず、データライブラリも知らない。TanStack Query のドキュメントもこの点を突いている。クエリが失敗したと判定されるには `queryFn` が投げるか拒否された Promise を返さなければならないのに、`axios` は勝手に投げるが `fetch` はそうではない、という話だ。

だからサーバーの失敗をエラーにするのは**自分でやらなければならない仕事**である。

```ts
const response = await fetch('/todos/' + todoId)
if (!response.ok) {
  throw new Error('Network response was not ok')
}
```

この三行がなければ、この節の残りは全部意味がない。投げられなかったものはどこへも伝播しない。

### 一つの失敗が分かれる五つの道

失敗が失敗になった後で、次の分かれ目が始まる。同じ `500` 一回が**どう呼んだか**によって五か所へ散る。オプションを触っていないデフォルトが基準だ。

**`useQuery` はエラーを投げない**。`useQuery.js` を開いてみると `throwOnError` という文字列がそもそもない。投げるかどうかは `query-core` の `shouldThrowError` が決める。

```js
function shouldThrowError(throwOnError, params) {
	if (typeof throwOnError === "function") return throwOnError(...params);
	return !!throwOnError;
}
```

値がなければ `!!undefined` なので `false` だ。だから失敗は `query.error` にだけ入り、コンポーネントは正常にレンダーされる。外側の `ErrorBoundary` は最後まで自分の番が来たことを知らない。

**`useSuspenseQuery` は投げるが、いつもではない**。このフックはオプションを展開した後で `throwOnError` を上書きする。

```js
return useBaseQuery({
  ...options,
  enabled: true,
  suspense: true,
  throwOnError: defaultThrowOnError,
  placeholderData: void 0
}, QueryObserver, queryClient);
```

上書きが `...options` の後に来るので、**利用者が渡した `throwOnError` は無視される**。そしてその場所に入るデフォルトの判定が `suspense.js` に一行である。

```js
const defaultThrowOnError = (_error, query) => query.state.data === void 0;
```

**見せられるキャッシュがあれば投げない**。実務でこの分岐が分かれる場所はバックグラウンドの再リクエストだ。初めて入ってきた利用者はキャッシュが空なので、失敗が `ErrorBoundary` へ行って fallback を見る。すでに画面にいた利用者が別のタブへ行って戻り、再リクエストが回ってそれが失敗すると、キャッシュに古いデータがあるので投げない。画面は古い値をそのまま見せ、自分では変わらない。

画面が壊れないのはおおむね良い挙動だ。**画面が知らせてくれないことが一緒に付いてくる**という事実を知って選ぶのと、知らずに食らうのとは違う。

**mutation が返す二つの関数は、どちらも `ErrorBoundary` へ行かない**。理由はそれぞれ違う。`useMutation.js` を開くと、片方は拒否を直接飲み込んでいる。

```js
observer.mutate(args[0], args[1]).catch(noop);
```

これが `mutate` だ。同じファイルで `mutateAsync` は `result.mutate` をそのまま出しているが、その `result.mutate` は `mutationObserver.js` が `mutate: this.mutate` で載せたものなので、結局は上の行が包んだのと同じ関数である。**片方だけが `.catch(noop)` を通る**。その拒否は `await` した場所で落ちるのであってレンダー中に投げられるのではないので、こちらも `ErrorBoundary` とは無関係だ。

**とはいえ mutation が `ErrorBoundary` と永久に無関係なわけではない**。フックの本体にスイッチがもう一つある。

```js
if (result.error && shouldThrowError(observer.options.throwOnError, [result.error])) throw result.error;
```

`throwOnError` を渡すとこの行が**レンダー中に**投げ、そのときは `ErrorBoundary` へ行く。返ってきた二つの関数が `ErrorBoundary` に届かないことと、フックが投げないことは別の話だ。

![左のサーバー 500 一回から矢印が五本伸びて useQuery、useSuspenseQuery、throwOnError を入れたフック、mutate、mutateAsync へ行き、それぞれがさらに query.error、ErrorBoundary、ErrorBoundary、mutation.error、呼び出し側の catch へ行く。真ん中の ErrorBoundary 二つだけが点線で結ばれ、ErrorBoundary が受け取る二つとして示されている](3.png?w=720)

まとめると、同じ `500` の到達先は五つだ。`query.error` フィールド、`mutation.error` フィールド、呼び出し側の `catch`、そして `ErrorBoundary` へ行く二つの場合である。`ErrorBoundary` へ行く二つは、`useSuspenseQuery` がキャッシュなしで失敗したときと `throwOnError` を入れたときだ。**失敗の種類ではなく呼び方が終着点を決める**。


## ページ遷移

画面を移るときに出る失敗は二つに分かれる。分かれる基準は**React のツリーの中か外か**だ。

### loader はツリーの外で回る

ルーターの `loader` はレンダーが始まる前に実行される関数だ。React コンポーネントではないので `getDerivedStateFromError` も `componentDidCatch` も届かない。`react-error-boundary` でいくら包んでも、その `ErrorBoundary` は loader の失敗を見られない。

代わりにルーターが自分の `ErrorBoundary` の体系を別に持っている。React Router のドキュメントはこう書いている。

::::quote
:::translation
route module はコードで起きたエラーを自動的に捕まえ、いちばん近い `ErrorBoundary` を描く。
:::

:::original
route modules will automatically catch errors in your code and render the closest `ErrorBoundary`.
:::
::::

いちばん近いものを選ぶ方法はソースにある。`findNearestBoundary` がこう選ぶ。

```js
function findNearestBoundary(matches, routeId) {
  let eligibleMatches = routeId ? matches.slice(0, matches.findIndex((m) => m.route.id === routeId) + 1) : [...matches];
  return eligibleMatches.reverse().find((m) => m.route.hasErrorBoundary === true) || matches[0];
}
```

マッチしたルートを後ろから辿って `ErrorBoundary` を持つ最初のルートを選び、なければ先頭のルートへ送る。**だから下のルートに `ErrorBoundary` をもう一つ置くのは重複する作業ではなく、fallback が描かれる範囲を狭める作業だ**。

読む側も違う。ルートの `ErrorBoundary` はエラーを props で受け取らず `useRouteError()` で直接取り出す。ステータスコードが載ったものかどうかは `isRouteErrorResponse(error)` で分ける。この二つは React の `ErrorBoundary` にはない道具だ。

### lazy の拒否はツリーの中だ

同じページ遷移でも、コードを遅れて受け取る側は逆だ。`lazy(() => import('./Tab'))` の `import()` が拒否されると、React がそれを受けて**いちばん近い `ErrorBoundary`** へ投げる。ウィジェットの四番目のボタンがこの経路だ。

デプロイが出ると古いチャンクファイルは消えるが、デプロイ前に開いておいた画面は依然として古いアドレスを持っている。その状態でそのコードを要求すると `import()` が拒否され、Chrome は `TypeError: Failed to fetch dynamically imported module` を投げる。

ここにもう一つ付く。**`lazy` は拒否を覚える**。React の `lazyInitializer` が結果を `payload` に書いておくのだが、拒否されると状態を変えて理由を保存する。

```js
payload._status = 2;
payload._result = error;
```

その後はこのコンポーネントをレンダーするたびに最後の分岐が回る。

```js
throw payload._result;
```

もう一度 `import()` はしない。`lazy()` の呼び出しはモジュールの最上位で一度だけ起きており、その `payload` はアプリが生きている間そのままだ。**`ErrorBoundary` を戻して再マウントしても同じエラーがまた来る**。この失敗の復旧がページを受け取り直すことだけである理由がここにある。

同じページ遷移なのに、loader の失敗はルーターが受け取り `lazy` の失敗は React が受け取る。**`ErrorBoundary` をどこに置くか決める前にこの二つを分けておかないと、どちらか一方は行き場がなくなる**。


## ErrorBoundary の外のグローバルハンドラ

`ErrorBoundary` が捕まえられなかった三つはどこへ行ったのか。**ブラウザのグローバルハンドラ**である。

イベントハンドラと `setTimeout` のコールバックで投げたものは、結局 `window` の `error` イベントへ行く。Promise の拒否は別のイベントへ行く。MDN の定義はこうだ。

::::quote
:::translation
`unhandledrejection` イベントは、拒否ハンドラを持たない JavaScript の Promise が拒否されたときにスクリプトのグローバルスコープへ送られる。通常は `window` だが `Worker` のこともある。
:::

:::original
The `unhandledrejection` event is sent to the global scope of a script when a JavaScript Promise that has no rejection handler is rejected; typically, this is the `window`, but may also be a `Worker`.
:::
::::

この二つがブラウザの最後の受け取り口だ。エラーモニタリングのツールがブラウザのエラーを捕まえる場所も、ほとんどがここである。

React 19 はツリー側にも受け取る場所を一つ増やした。`createRoot` のオプションだ。公式ドキュメントが三つをこう分けている。

| オプション | いつ呼ぶか |
|---|---|
| `onCaughtError` | React が Error Boundary の中でエラーを捕まえたとき |
| `onUncaughtError` | エラーが投げられたのに Error Boundary が捕まえられなかったとき |
| `onRecoverableError` | React が自力で復旧したとき |

受け取ることと直すことは違う。**グローバルハンドラが捕まえたからといって画面が復旧するわけではない**。`onClick` の中で投げたエラーを `window` が受け取ってモニタリングツールへ送っても、その瞬間の利用者の画面ではボタンがただ押されなかったように見える。報告と復旧は別の仕事だ。


## おわりに

フロントエンドのエラー処理を道具の一覧として覚えると、穴が残り続ける。`ErrorBoundary`、`throwOnError`、`useRouteError`、`lazy`、`unhandledrejection` を全部知っていてもそうだ。道具を知らないからではなく、**何がどこへ行くのかを数えていないから**である。

この記事で扱った内容をまとめると次のようになる。

- `ErrorBoundary` は React が捕まえて渡したものだけを受け取る。イベントハンドラと非同期コールバックはその場にいない。
- 型検査は応答で終わる。`json()` が `any` を返す地点からは検査ではなく宣言だ。
- サーバーの失敗はひとりでにエラーにならない。`fetch` は `500` で reject しないので、投げる作業は自分でやる。
- 投げられた後は呼び方が終着点を決める。同じ失敗がフィールドへも、呼び出し側へも、`ErrorBoundary` へも行く。
- ページ遷移は二つに分かれる。loader はツリーの外なのでルーターが受け取り、`lazy` はツリーの中なので React が受け取る。
- `ErrorBoundary` の外にはグローバルハンドラがある。捕まりはするが画面は復旧しない。

だから `ErrorBoundary` を描く前にやることは、包むコンポーネントを選ぶことではない。**この画面で失敗しうる場所を書き出し、それぞれが上の六つのどれに当たるのかを印すこと**である。印のない場所がそのまま穴だ。

いま読者の画面で失敗しうる場所がいくつあり、そのうちいくつが `ErrorBoundary` に届き、届かないものはどこへ行っているのかを調べてみてほしい。

[次の記事](/251203)では、到達先ごとに何で受け取るのかを扱う。層をいくつに分けるのか、一つの失敗に画面の範囲をどう扱うのか、そして fallback の再試行ボタンが実際に再試行するようにするには何を一緒に解かなければならないのかだ。


:::ref
- [docs] [React, Component の Error Boundary](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [docs] [React, createRoot のエラーコールバック](https://react.dev/reference/react-dom/client/createRoot)
- [docs] [React, lazy](https://react.dev/reference/react/lazy)
- [docs] [React Router, Error Boundaries](https://reactrouter.com/how-to/error-boundary)
- [docs] [TanStack Query, Query Functions](https://tanstack.com/query/latest/docs/framework/react/guides/query-functions)
- [docs] [MDN, unhandledrejection](https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event)
- [docs] [MDN, fetch](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch)
- [docs] [axios, Error handling](https://axios.rest/pages/advanced/error-handling)
- [repo] [bvaughn/react-error-boundary](https://github.com/bvaughn/react-error-boundary)
:::
