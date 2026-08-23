---
emoji: 🛡️
title: 'エラーハンドリング'
seoTitle: 'フロントエンドのエラーハンドリング — Error Boundary と TanStack Query の throwOnError を組み合わせるためのガイド'
date: '2025-11-17'
categories: フロントエンド React TanStack-Query エラーハンドリング
description: "React Error Boundary、try/catch、TanStack Query の throwOnError がそれぞれどこまでを担い、どう組み合わせるのかを整理する。レンダー段階のエラーと非同期エラーを区別し、react-error-boundary のリセットの仕組みまで解説する。"
keywords: "フロントエンドのエラーハンドリング, React Error Boundary, react-error-boundary, TanStack Query throwOnError, React Query のエラー処理, Error Boundary のリセット, try catch エラー, 非同期エラー処理, React のエラーハンドリング"
locale: ja
translationOf: '251117'
sourceHash: 688aa8b21e8068e6d24e46e383d3dddbb24778dff87c065c19b3489cff0380fa
---

今回は、**フロントエンドでエラーをどう捉えるか**について考えてみたい。

筆者は実務でエラーハンドリングを書くたび、どこか釈然としない感覚を抱くことが多かった。あるエラーは `try/catch` で捉え、別のエラーは `ErrorBoundary` が捉え、さらに別のエラーは TanStack Query の `onError` が捉える。それぞれの守備範囲は微妙に重なったり、ずれたりする。その結果、エラーが漏れる日もあれば、意図しない場所まで伝播する日もあった。

問題は、こうした道具の挙動をまとめて整理する機会がほとんどなかったことだ。「Error Boundary はレンダー段階のエラーだけを捉える」とは知っていても、それが実際に何を意味するのか、`reset` を呼ぶと内部で何が起きるのか、`throwOnError` を有効にしたとき TanStack Query がいつエラーを再送出するのかを正確に説明しろと言われると、答えに詰まってしまう。

この記事では、React の公式ガイド、`react-error-boundary` ライブラリ、TanStack Query v5 の公式ドキュメントをもとに、フロントエンドのエラーハンドリングに使う各ツールが**どこまでを担うのか**、そして**どう組み合わせるのか**を整理する。


## React が捉えられるエラー、捉えられないエラー

最も基本的な問いから始めよう。**React はどのようなエラーを捉えるのか。**

React の公式ドキュメントでは、Error Boundary が捉えられるエラーと、捉えられないエラーを明確に区別している。

**Error Boundary が捉える範囲**

- 子コンポーネントの**レンダー中**に発生したエラー
- **ライフサイクルメソッド**内で発生したエラー
- **コンストラクター**で発生したエラー

**Error Boundary が捉えられない範囲**

- **イベントハンドラー**内のエラー
- `setTimeout`、`requestAnimationFrame`、**Promise などの非同期コード**のエラー
- **サーバーサイドレンダリング（SSR）**中のエラー
- **Error Boundary 自身**で発生したエラー

なぜこの区別が重要なのだろうか。普段扱うエラーの大半は、実は**後者に属する。**ボタンのクリックからミューテーションを実行したところサーバーが 500 を返した、`useEffect` 内のデータ取得が失敗した、フォーム送信中に検証ロジックが例外を送出した、といったケースだ。これらのエラーを React が自動で捉えることはない。開発者が明示的に捕捉して処理する必要がある。

したがって、フロントエンドのエラーハンドリングは二つに分かれる。**レンダー段階のエラーは Error Boundary で**、**それ以外のエラーは try/catch やライブラリのコールバックで**扱う。この二つが交わる地点で、TanStack Query のような非同期状態管理ライブラリが橋渡しの役割を果たす。


## Error Boundary の正体

Error Boundary は、結局のところ二つのライフサイクルメソッドを持つ**クラスコンポーネント**だ。React の公式ドキュメントによると、Error Boundary になるには、次の二つのメソッドのいずれか（通常は両方）を実装する必要がある。

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

`getDerivedStateFromError` は**純粋関数**でなければならない。副作用を起こさず、新しい状態だけを返す役割だ。一方、`componentDidCatch` は副作用を扱う場所である。Sentry へのエラー送信や、コンソールへのコンポーネントスタック出力はここで行う。

ここで重要な点が一つある。この二つのメソッドは**クラスコンポーネントにしか存在しない。**関数コンポーネントで Error Boundary を作る公式な方法は、今のところない。[React 公式ドキュメント](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)にも明記されている。

::::quote
:::translation
現在、Error Boundary を関数コンポーネントとして記述する方法はありません。
:::

:::original
There is currently no way to write an Error Boundary as a function component.
:::
::::

毎回クラスコンポーネントを自分で書くのは煩雑なので、通常は `react-error-boundary` ライブラリを使うことになる。（React のメンテナーの一人だった Brian Vaughn が開発したライブラリで、事実上の標準として利用されている。）


## react-error-boundary が提供する三つのフォールバック

`react-error-boundary` の `ErrorBoundary` コンポーネントでは、フォールバック UI を指定するプロパティが**三つの形式**で用意されている。それぞれの使い方を簡単に見てみよう。


### フォールバック

最も単純な形式で、静的な JSX をそのまま渡す。

```tsx
<ErrorBoundary fallback={<div>문제가 발생했습니다.</div>}>
  <Page />
</ErrorBoundary>
```

エラーオブジェクトやリセット関数にアクセスする必要がない場合に使う。実務ではエラーメッセージや再試行の操作が必要になることが多く、筆者はこれまで使ったことがない。


### FallbackComponent

フォールバック UI を別のコンポーネントに切り出し、その**参照**を渡す。

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

エラーオブジェクトと `resetErrorBoundary` 関数が props として自動的に注入される。フォールバック UI をほかの場所でも再利用する可能性があるなら、この形式がすっきりしている。


### fallbackRender

フォールバックをインラインで描画したいときに使う。

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

`FallbackComponent` と本質的には同じ役割だが、**別のコンポーネントを作らずインラインで処理**できる。外側のクロージャー（親の状態やハンドラーなど）へアクセスする必要があるときに便利だ。

三つのうち、どれか一つが正解というわけではない。筆者が実務でよく使うのは、**共通の ErrorFallback コンポーネントを一つ用意し、`FallbackComponent` で注入する**パターンだ。デザインシステムとトーンの一貫性を保つためである。ページごとに異なるフォールバックが必要な場合だけ、`fallbackRender` でインラインに記述する。


## リセットは実際に何をするのか

`react-error-boundary` を使っていると、自然と `resetErrorBoundary` という関数に出会う。フォールバックの「もう一度試す」ボタンから呼ばれる、あの関数だ。この関数が実際に何をするのかを見てみよう。

結論から言うと、`resetErrorBoundary` は ErrorBoundary コンポーネントに対して、**自身の状態を初期化し、子要素を再レンダーするよう通知する**だけだ。TanStack Query のキャッシュなど、外部の状態を自動的に変更することはない。

内部で起きることを順に整理すると、次のようになる。

1. `resetErrorBoundary()` が呼ばれる。
2. ErrorBoundary 内部の `hasError` 状態が `false` に戻る。
3. （任意）`onReset` コールバックが実行される。ユーザー定義の副作用はここで起きる。
4. 子要素が再レンダーされる。エラーの原因となった状態やキャッシュなどが残っていれば、**同じエラーが再び送出される。**

最後の 4 番目が重要だ。**リセットは「エラーを忘れてもう一度描画してみる」という意味にすぎず、「エラーを引き起こした原因を直す」という意味ではない。**そのため、リセットするだけでは同じエラーが無限に繰り返される可能性がある。

この問題に対処するため、さらに二つの仕組みが用意されている。


### onReset

リセットが起きる直前に呼ばれるフックの役割を担う。ここで、エラーの原因となった外部状態を整理する。

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

配列に含まれる値が変わると、ErrorBoundary が自動的にリセットされる。URL パラメーター、検索語、選択中のタブなど、「この値が変わったなら再試行する意味がある」と判断できるキーを渡す。

```tsx
<ErrorBoundary
  FallbackComponent={ErrorFallback}
  resetKeys={[userId]}
>
  <UserProfile userId={userId} />
</ErrorBoundary>
```

`userId` が変わると自動的にリセットされ、子要素が再レンダーされる。ユーザーが別のプロフィールへ移動すれば、以前のエラーは自然に消える。


## イベントハンドラーと非同期エラーはどう捉えるのか

前述のとおり、Error Boundary はイベントハンドラーや非同期コードのエラーを捉えられない。しかし、扱うエラーの大半はそこで発生する。では、どうすればよいのだろうか。

`react-error-boundary` は、この問題に対処するための **`useErrorBoundary` フック**を提供している。このフックは `showBoundary` という関数を返す。この関数を呼ぶと、最も近い ErrorBoundary へ強制的にエラーを送ることができる。

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

重要なのは、**開発者が明示的に引き上げる必要がある**という点だ。React が自動で行うわけではない。非同期エラーを ErrorBoundary の領域へ移したいなら、`try/catch` で捉えて `showBoundary` に渡さなければならない。

このパターンを理解すれば、「ErrorBoundary が捉えるエラーと捉えられないエラーがあるのはなぜか」という疑問は明快に解ける。答えは単純だ。**「レンダー段階まで引き上げたかどうか」**である。


## TanStack Query はエラーをどう扱うのか

ここまで整理すると、自然に次の疑問が浮かぶ。日々使っている `useQuery` は非同期リクエストを扱うが、そこで発生したエラーはどのように処理されるのだろうか。

TanStack Query は、デフォルトでは**エラーを `error` フィールドとして公開する。**

```tsx
const { data, error, isError } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
});

if (isError) {
  return <div>에러: {error.message}</div>;
}
```

これが最も単純な形式だ。エラーが発生してもコンポーネントは通常どおりレンダーされ、単に `error` フィールドへ値が入るだけである。ErrorBoundary は関与しない。

ここで重要な事実を確認しておこう。**TanStack Query のデフォルトの挙動は「エラーを送出しない」ことだ。**クエリ関数が例外を送出しても Promise を reject しても、そのエラーは `error` フィールドに格納されるだけで、React のレンダーフローを中断しない。そのため、特別な設定をしない限り ErrorBoundary が動作することはない。

もう一つ、TanStack Query は**デフォルトでエラー時に自動で 3 回再試行する。**

デフォルトの `retryDelay` は指数バックオフ方式で、最大 30 秒まで延びる。つまり、最初に失敗してもユーザーへすぐエラーが表示されるわけではない。1 秒、2 秒、4 秒の間隔で再試行し、それでも失敗すると、ようやく `error` フィールドへ値が入る。（開発中に「なぜエラーが表示されるまで時間がかかるのだろう」と疑問に思ったことがあるなら、十中八九これが原因だ。）


### throwOnError で ErrorBoundary と接続する

では、TanStack Query のエラーを ErrorBoundary へ流すにはどうすればよいのか。答えは **`throwOnError`** オプションだ。（v4 までは `useErrorBoundary` という名前だったが、v5 で `throwOnError` に変更された。）

```tsx
const { data } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  throwOnError: true,
});
```

このオプションを有効にすると、TanStack Query はエラーを**次のレンダーサイクルで再送出する。**すると、その例外送出はレンダー段階のエラーとなり、ErrorBoundary が捉えられるようになる。

`throwOnError` には関数も渡せる。あるエラーは ErrorBoundary へ送り、別のエラーはコンポーネント自身で処理する、といった分岐が可能だ。

```tsx
useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  // 5xx 서버 에러만 ErrorBoundary로 보낸다
  throwOnError: (error) => error.response?.status >= 500,
});
```

このパターンが実用的なのは、**4xx のようなクライアントエラー（入力検証の失敗や権限不足など）**はその場でメッセージを表示するのが自然であり、**5xx のようなサーバーエラー**はページ全体を覆って「しばらくしてからもう一度お試しください」と表示するのが適切だからだ。


### useSuspenseQuery

`useSuspenseQuery` を使っている場合、`throwOnError` を意識する必要はない。Suspense モードでは、**常にエラーを送出するのがデフォルトの挙動**である。

つまり、`useSuspenseQuery` を使うことは、**ローディングは Suspense が、エラーは ErrorBoundary が**処理するということだ。コンポーネント内で `if (isError)` や `if (isLoading)` といった分岐を書く必要がなくなり、代わりに外側を二つの境界で囲む必要がある。


## QueryErrorResetBoundary

ここまで読むと、さらに一つ疑問が浮かぶ。ユーザーがフォールバックの「もう一度試す」ボタンを押すと、どうなるのだろうか。

先ほど見たように、`resetErrorBoundary` が初期化するのは ErrorBoundary の `hasError` 状態だけだ。しかし、TanStack Query のキャッシュには、依然として**エラー状態のまま固まったクエリ**が残っている。子要素が再レンダーされると、TanStack Query はキャッシュを見て「このクエリはすでにエラーだ」と判断し、すぐに同じエラーを再送出する。（恐ろしい無限ループだ。）

この問題を解決するため、TanStack Query は **`useQueryErrorResetBoundary`** フックと **`QueryErrorResetBoundary`** コンポーネントを提供している。長い名前だが、役割は単純だ。**「この領域内にあるクエリのエラー状態をリセットせよ」**と指示する。

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

ここで起きることを時系列で整理しよう。

1. ユーザーが「もう一度試す」ボタンをクリック → `resetErrorBoundary()` が呼ばれる
2. ErrorBoundary が `onReset` コールバックを実行 → `reset()` が呼ばれる（TanStack Query のエラー状態を初期化）
3. ErrorBoundary が自身の状態を初期化し、子要素を再レンダー
4. 子要素内の `useQuery` が動作 → エラー状態が消えているため、再びデータ取得を試みる

重要なのは、`onReset` に `reset` を接続した部分だ。この一行によって、ErrorBoundary と TanStack Query の状態が同期される。


### コンポーネントとして使う場合

フックではなく、コンポーネントでも同じことができる。どちらか一方を使えばよい。

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

フック版との最大の違いは、**レンダープロップパターン**で `reset` 関数を子へ渡すことだ。`QueryErrorResetBoundary` は子要素として関数を受け取り、その引数として `{ reset }` を渡し、関数の戻り値をレンダーする。そのため、内側ですぐ `onReset={reset}` と接続できる。

フック版では、最も近い `QueryErrorResetBoundary` がなければ**グローバルキャッシュのエラーをリセットする。**コンポーネント版では、リセットのスコープを自身の子領域に限定する。範囲を狭く制御したいなら、コンポーネント版のほうが安全だ。

ここで一つ確認しておこう。**リセットはキャッシュを削除しない。**データを丸ごと消すのではなく、「エラーとマークされたクエリのエラー状態を解除する」ことに近い。実際にデータを無効化したい場合は、`queryClient.invalidateQueries()` を別途呼ぶ必要がある。


## ミューテーションのエラー

ここまで説明したパターンは、ほぼすべて `useQuery` を前提としていた。しかし、**`useMutation` では事情が少し異なる。**

最大の違いは、ミューテーションは通常、**ユーザーの明示的な操作（クリックや送信）**によって開始されることだ。そのため、エラーもその操作に近い場所で処理するのが自然である。ページ全体をフォールバックで覆うより、トーストやフォーム脇のエラーテキストで「決済に失敗しました。カード情報をもう一度確認してください」のように表示するほうが適切だ。

TkDodo の [React Query におけるミューテーションの使いこなし](https://tkdodo.eu/blog/mastering-mutations-in-react-query)では、この違いの本質を一言でまとめている。**クエリは宣言的で、ミューテーションは命令的である。**クエリはコンポーネントがマウントされると自動的に実行され、同じキーを持つほかのコンポーネントも共同で購読し、キャッシュして再利用される。一方、ミューテーションはユーザーがボタンを押して初めて実行され、キャッシュもされず、呼び出したコンポーネントのインスタンスと一対一で結び付く。この本質的な違いが、エラー処理の方法を二つに分ける。

`useQuery` のデフォルトの `retry` は `3` だが、**`useMutation` のデフォルトの `retry` は `0` である。**理由は単純で、ミューテーションは**副作用**を引き起こすからだ。決済リクエストがネットワークのタイムアウトで失敗したとき、ライブラリが自動的にさらに 2 回呼び出せば、ユーザーのカードへ 3 回請求されるかもしれない。

したがって、ミューテーションの再試行は、その処理が**冪等であると開発者が確信できる場合に限り**明示的に有効にするのが原則だ。同じリクエストを 2 回送っても結果が変わらないことが保証される GET 系の安全な取得処理や、サーバーが冪等性キーを受け取って重複を防ぐ場合に限られる。

`useQuery` のエラーは**キャッシュに保持される。**そのため、同じ `queryKey` を購読するほかのコンポーネントにもすぐ伝播し、`QueryErrorResetBoundary` のような仕組みで一括してリセットする必要があった。

ミューテーションは異なる。あるコンポーネントのミューテーションインスタンスで発生したエラーは、**そのインスタンスの状態にだけ残る。**同じ `mutationFn` を使う別のコンポーネントのミューテーションには影響しない。そのため、TanStack Query に `MutationErrorResetBoundary` のようなものは存在しない。**必要がないから**だ。

この違いは実務にも一つ影響する。同じ `useMutation` を呼ぶコンポーネントが二つあっても、一方で発生したエラーはもう一方からは見えない。「このミューテーションのエラーをアプリケーション全体で把握したい」のであれば、コンポーネント単位の `onError` では不十分で、`MutationCache.onError` まで引き上げる必要がある。


### mutate と mutateAsync

`useMutation` は二つの実行関数を返す。この違いによって、エラーハンドリングの方法が分かれる。

mutate の戻り値の型は `void` であり、Promise を返さない。そのため await で結果を待つことはできず、呼び出し結果は `onSuccess/onError` などのコールバックを通じてのみ受け取れる。


```tsx
const mutation = useMutation({
  mutationFn: createPost,
  onError: (error) => {
    toast.error(`등록 실패: ${error.message}`);
  },
});

mutation.mutate(newPost);
```


一方、`mutateAsync` は Promise を返す。エラーは `try/catch` で処理できる。

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

どちらをいつ使えばよいのか。筆者は次の基準で使い分けている。

- **ミューテーションの完了後に後続処理が必要**（成功時のルーティングや結果の利用など）→ `mutateAsync`
- **単に呼び出し、副作用はコールバックへ任せる**（「いいね」の切り替えや、トーストを表示するだけの場合など）→ `mutate` + `onError`

ここで、よくある間違いが一つある。**`mutateAsync` を使いながら `try/catch` を置かないと、未処理の Promise rejection が発生する。**コールバックベースの `mutate` は内部でエラーを吸収するが、`mutateAsync` は呼び出し元へエラーを送出するのがデフォルトの挙動だ。この違いを知らずに混在させると、コンソールが赤い警告で埋め尽くされる。


### onError

もう一つ見落としやすい点がある。`useMutation` の `onError` は**二か所**（フックと mutate）で定義できる。

```tsx
const mutation = useMutation({
  mutationFn: createPost,
  onError: (error) => {
    Sentry.captureException(error);
  },
});
```

フックレベルでは常に実行されるが、mutate レベルでは呼び出し時にのみ実行される。

```tsx
mutation.mutate(newPost, {
  onError: (error) => {
    setFormError(error.message);
  },
});
```

公式ドキュメントに明記された実行順序は、**フックレベル → mutate レベル**である。両方のコールバックが定義されている場合、まずフックレベル、続いて mutate レベルが実行される。


## グローバルなエラーハンドリング

ここまでのパターンは、すべてコンポーネントレベルのものだった。しかし、「すべてのクエリエラーを一か所で記録したい」「401 エラーは必ずログアウトとして処理したい」といった要件もあり得る。このような横断的関心事には、**QueryClient の作成時に `QueryCache`/`MutationCache` へコールバックを設定する方法がある。**

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

重要なのは、`QueryCache.onError` が**クエリごとに一度だけ**呼ばれることだ。同じクエリを複数のコンポーネントが購読していても、コールバックは一度しか実行されないため、トーストが重複するような問題は起きない。

上の例のように、`query.state.data !== undefined` を確認する方法もある。**すでにキャッシュ済みのデータがある状態で再取得に失敗した**のであれば、ユーザーはひとまず画面上でデータを見られている。このとき ErrorBoundary でページを覆うのは過剰だ。更新に失敗したことだけを知らせるのが適切である。反対に、キャッシュデータがない初回ロードで失敗した場合は、ErrorBoundary が捉えてフォールバックを表示するのが妥当だ。

この二つの流れを組み合わせれば、「初回ロードの失敗は ErrorBoundary、バックグラウンドでの再取得の失敗はトースト」という明快な方針を設計できる。


## 共通コンポーネント

ここまで読むと、一つ欲が出てくる。毎回 `QueryErrorResetBoundary`、`ErrorBoundary`、`Suspense` の三重構造で囲むのは面倒なので、**一つのコンポーネントにまとめて再利用**できないだろうか。

自然な発想だ。実際、筆者も以前は次のような `AsyncBoundary` コンポーネントを作って使っていた。

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

ページでは、次の一行だけで済む。

```tsx
<AsyncBoundary>
  <Content />
</AsyncBoundary>
```

きれいに見える。しかし、同僚から次のようなフィードバックを受けた。

> AsyncBoundary という名前は、それほど決まった意味で使われているわけではないので、中に何が入っていても大きな違和感はなさそうです。ただ、**React Query の ResetBoundary まで入っていることは、少し予想しにくいかもしれません。**

> それから、`pendingFallback` と `rejectedFallback` にデフォルト値が入っている点も少し気になります。`<AsyncBoundary>` の一行だけでは中でどのフォールバックが使われるのか分からないので、**それが props のデフォルト値だという事実自体に気付かないと思います。**


### 名前が依存関係を隠す

このコンポーネントの名前は `AsyncBoundary` であり、非同期処理の境界という意味しか伝わらない。しかし、その実装は **TanStack Query に強く結合している。**`QueryErrorResetBoundary` が含まれ、`onReset` に `reset` が接続されている。つまり、このコンポーネントは実際には**「React Query を使う非同期領域のための境界」**なのに、名前からはまったく読み取れない。

なぜこれが問題なのか。**読み手の予測を裏切る**からだ。コードは一行ずつ解釈するものではなく、経験から蓄積されたパターンをもとに**予測しながら**読む。予測が外れたとき、認知負荷は急激に高まる。

`AsyncBoundary` という名前を初めて見た同僚が思い浮かべるのは、「非同期処理に使う汎用的な境界」だろう。SWR を使うときも、fetch を直接使うときも利用できそうに見える。しかし実際には `QueryErrorResetBoundary` が組み込まれており、**TanStack Query を使わないコンテキストでも意味のない結合**が付いてくる。名前と実装の間に亀裂があるのだ。

これは、抽象化の漏れ（leaky abstraction）とは逆向きの問題と捉えられる。一般的な漏れは「抽象化の背後に隠すべき詳細が表へ漏れ出すこと」だが、ここでは**表に出すべき依存関係が名前の背後へ隠れすぎている。**こちらのほうが悪質かもしれない。（知らずに使ってしまうからだ。）


### 名前に依存関係を表す

最も単純な処方は、名前を変えることだ。`AsyncBoundary` ではなく、**`QueryAsyncBoundary`** のように依存関係を名前へ明示する。Toss が開発した [Suspensive](https://suspensive.org/) ライブラリを見ると、依存関係が明示されている。`@suspensive/react` には汎用的な `ErrorBoundary` と `Suspense` だけがあり、TanStack Query と組み合わせたコンポーネントは、別パッケージ `@suspensive/react-query` の `QueryAsyncBoundary` として分離されている。

この一語の違いが読み手へ伝える情報は大きい。`Query` という接頭辞が付いた瞬間、**「これは TanStack Query 環境専用なのだ」**とすぐに分かる。誤ったコンテキストで使うミスを未然に防げる。


### 合成可能な単位へ分解する

もう少し根本的な方法は、**まとめないこと**だ。

ErrorBoundary と Suspense は本質的に**異なる関心事**であり、一つのコンポーネントにまとめると、合成の柔軟性が失われかねない。あるページでは ErrorBoundary だけが必要かもしれず、別のページでは Suspense だけが必要かもしれない。また、二つの Suspense を一つの ErrorBoundary 内に置きたいページもあるだろう。`AsyncBoundary` としてまとめてしまうと、こうした変形が不自然になる。分離しておけば自由に合成できる。

このパターンはコードが一行長くなるものの、**各境界が何を担うのかをコードからそのまま読み取れる**という利点がある。また、`useSuspenseQuery` を使う場合、一度に処理したい単位とエラーを捉えたい単位は異なることが多いため、分離されているほうが自然だ。

筆者の結論はこうだ。**繰り返される合成パターンが本当に同一ならまとめ、変形が必要なら分離する。**そして、まとめる場合も名前で依存関係を明らかにする。この二つの原則を守るだけでも、「AsyncBoundary の中に何があるのか分からない」というレビューを受けることは減るだろう。


### デフォルト Props

名前の問題を直すだけでは不十分だ。先ほどのコードをもう一度見てみよう。

```tsx
pendingFallback = <Spinner />,
rejectedFallback = ErrorFallback,
```

`<QueryAsyncBoundary>...</QueryAsyncBoundary>` と一行書くだけで動作するのは、内部で `Spinner` と `ErrorFallback` が自動的に設定されるからだ。**これは名前から予測できる情報ではない。**

これは、先ほど批判した「名前が依存関係を隠す」という問題の別バージョンだ。`Query` という接頭辞で依存関係を表すよう名前を直しても、`Spinner` と `ErrorFallback` という UI の依存関係はデフォルト prop の背後に隠れたままである。**隠れる場所が一段内側へ移ったにすぎない。**

解決策は単純だ。**二つのフォールバックを必須 prop とし、呼び出し元で毎回注入する。**

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

コードは二行長くなる。それでもこのコストを受け入れる理由は明確だ。**書き手の負担を増やす代わりに、すべての読み手が追跡に費やすコストを減らせる。**呼び出し元を見れば、どのフォールバックが表示されるのかがその場で分かる。「このコンポーネントのデフォルト値は何だっただろう」と別のファイルを開いて確認する必要がない。コードは書かれる回数より読まれる回数のほうがはるかに多い、というおなじみの命題は、ここでもそのまま当てはまる。


## ErrorFallback

もう一つ確認したい点がある。通常、`ErrorFallback` は次のような単一のコンポーネントとして用意する。

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

`role="alert"` と `aria-live="assertive"` まで配慮された、整った実装だ。しかし、一つ問いかけてみよう。**「401、404、500、ネットワーク切断のいずれであっても、同じ画面を表示してよいのだろうか。」**

ほとんどの場合、答えは**否**だ。エラーの種類によって、ユーザーが取るべき行動が異なるからである。

| エラーの種類 | ユーザーの行動 | 「もう一度試す」に意味があるか |
| --- | --- | --- |
| ネットワーク切断 | 接続を確認して再試行 | O |
| 5xx サーバーエラー | しばらくしてから再試行 | O |
| 401 認証エラー | ログイン画面へ移動 | X |
| 403 権限不足 | 別の画面へ移動 | X |
| 404 リソースなし | 一覧へ戻る | △ |
| 422 検証エラー | 入力値を修正 | X |

すべてのケースで「もう一度試す」ボタンを表示するのは、**「そのエラーを解決できる行動」をユーザーへ誤って案内する**ことになる。401 エラーで「もう一度試す」を押しても、同じ 401 が再び表示されるだけだ。ユーザーが本当に行うべきなのはログインである。

したがって、エラーのフォールバックは**エラーの種類に応じて描き分けるべき**だ。最初から巨大な `if/else` で処理する必要はなく、小さなコンポーネントを用意して分岐すればよい。

各フォールバックコンポーネントは、そのエラーに適したメッセージと操作だけを提示する。ユーザーが実際に取れる行動だけを画面に残すのだ。


### shouldCatch

さらに一歩進めると、**「捉えるエラー」と「上位へ流すエラー」をコンポーネントレベルで区別する**パターンもある。Suspensive の `ErrorBoundary` は `shouldCatch` prop を提供している。

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

内側の ErrorBoundary はネットワークエラーだけを捉え、5xx エラーは捉えない。捉えられなかったエラーは React のデフォルトの挙動に従って**上位の ErrorBoundary へ伝播する。**そこで外側の ErrorBoundary が 5xx を捉える仕組みだ。同じエラー処理を if/else で書くより、**境界そのものに意味を持たせられる**点が魅力的である。

`react-error-boundary` にはこの prop がないが、フォールバック内で分岐すれば同じ効果を実現できる。重要なのはパターンそのものであって、ライブラリではない。


## まとめ

まとめると、フロントエンドのエラーハンドリングは**一つの道具だけでは完結しない。**レンダー段階のエラーは Error Boundary、イベントハンドラーのエラーは `try/catch` や `showBoundary`、非同期データ取得のエラーは TanStack Query の `throwOnError` と `useQueryErrorResetBoundary`、ミューテーションのエラーは `mutateAsync` や `onError`、横断的関心事は `QueryCache`/`MutationCache` がそれぞれ担う。さらに、**共通コンポーネントの名前と合成単位**、**エラー型そのもののドメインモデリング**まで含めて設計して初めて、一貫したエラー方針が完成する。

各ツールが何を担うのかを理解すれば、ようやく**「このエラーはここで捉え、別のエラーはあちらへ流す」**という判断を明確に下せる。そして、その判断の積み重ねが、最終的にユーザー体験の安定性をつくる。真っ白な画面を見せないこと、同じトーストを 5 回表示しないこと、一時的なネットワークエラーでページ全体を停止させないこと、401 エラーでは「もう一度試す」ではなくログイン画面を表示すること。こうした細部が積み重なって、「よくできたサービス」という印象を生む。

もちろん、すべてのプロジェクトで、すべてのパターンが必要なわけではない。単純な管理ツールなら ErrorBoundary 一つとトーストだけで十分かもしれない。一度のミスがそのまま金銭に関わる決済のようなドメインなら、ミューテーションの一つひとつにきめ細かなエラー処理を設ける必要があるだろう。正解はドメインが決める。

この記事を読んだ方も、自分のプロジェクトで「今、自分たちのサービスは、どのエラーを、どこで、どんな名前のコンポーネントによって捉えているのか」を一度点検してみてほしい。正しく捉えられていると思っていても、実は漏れていたり、誤ったフォールバックに到達していたりするエラーは、意外に多いかもしれない。（筆者も毎回そうだった。）


## 参考資料

:::ref
- [ドキュメント] [React、Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [ドキュメント] [TanStack Query、Suspense](https://tanstack.com/query/latest/docs/framework/react/guides/suspense)
- [ドキュメント] [TanStack Query、QueryErrorResetBoundary](https://tanstack.com/query/latest/docs/framework/react/reference/QueryErrorResetBoundary)
- [ドキュメント] [TanStack Query、重要なデフォルト設定](https://tanstack.com/query/v5/docs/framework/react/guides/important-defaults)
- [記事] [TkDodo、React Query のエラーハンドリング](https://tkdodo.eu/blog/react-query-error-handling)
- [記事] [TkDodo、意図的に React Query の API を壊す](https://tkdodo.eu/blog/breaking-react-querys-api-on-purpose)
- [リポジトリ] [toss/suspensive、@suspensive/react-query](https://github.com/toss/suspensive)
- [ドキュメント] [React Router、Error Boundaries](https://reactrouter.com/how-to/error-boundary)
:::
