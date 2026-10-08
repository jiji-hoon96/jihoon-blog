---
emoji: 🔑
title: "queryKey"
seoTitle: "TanStack Query queryKey 完全攻略: queryOptions まで"
date: "2026-01-04"
updatedAt: "2026-10-08"
categories: フロントエンド React TanStack-Query queryKey
description: "TanStack Query の queryKey の管理方法が、インライン配列、定数オブジェクト、クエリキーファクトリーを経て v5 の queryOptions までどう進化したかを整理する。記述規則、DataTag による型推論、無効化のパターンを実務の観点で扱う。"
keywords: "queryKey, クエリキーファクトリー, TanStack Query queryKey, queryKey 記述規則, queryOptions, setQueryData, TkDodo クエリキー, query-key-factory, React Query v5, クエリの無効化"
locale: ja
translationOf: '260104'
sourceHash: b801dce44f70d60f81790117fc82d189a0e094de05808ebffdb5c5e93fd7fb07
---

今回は、**TanStack Query の queryKey**について掘り下げてみたい。

TanStack Query を使いながら、queryKey をインライン配列のままにするか、定数オブジェクトやクエリキーファクトリーにまとめるか、v5 の `queryOptions` に移すかで悩んでいるフロントエンド開発者に向けた記事だ。最後まで読めば、それぞれの管理方法がどんな問題を解くために登場したのかがわかり、今のコードベースにどの段階が合うのかを判断する基準が得られる。

筆者は実務で TanStack Query を使う中で、**queryKey の管理方法を何度も作り直してきた**。最初はコンポーネント内に `['user', userId]` のような配列を直接書いていたが、無効化のたびに同じキーを複数箇所へ記述するうちにタイプミスが増え、`QUERY_KEYS` のような定数オブジェクトへ移行した。その後、TkDodo の記事を読んでクエリキーファクトリーパターンを採用し、しばらくして `@lukemorales/query-key-factory` ライブラリを導入した。そして v5 の登場を機に、今度は `queryOptions` を使う形へと再び作り直した。


## queryKey がなかった時代

本題に入る前に、一つ確認しておこう。今では `TanStack Query` や `SWR` といったライブラリを当たり前のように使っているが、これらがなかった時代には非同期データをどのように扱っていたのだろうか。

最も一般的だったのは、`useState`、`useEffect`、`fetch`、`axios` などを組み合わせる方法だろう。

```tsx
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/users/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ...
}
```

このコードの問題は明白だ。同じ `userId` を参照するコンポーネントがページ内に二つあるだけで、**同一のリクエストが二度送られる。** キャッシュがないからだ。また、ユーザーが別のページへ移動して戻ってくると、再び最初からフェッチする。データを取得したのが1秒前なのか1時間前なのかを判別できないため、「キャッシュ済みの値を表示しながらバックグラウンドで更新する」といった動作を再現するのも難しい。（独自のキャッシュシステムを導入すれば実現できるが、その管理はかなり厄介だと思う。）

この問題を解決するために登場したのが、Redux と redux-thunk（または redux-saga）の組み合わせだった。データ取得ロジックをサンクに切り出し、結果をストアへ保存しておけば、別のコンポーネントでも同じデータを再利用できた。しかし、その都度アクションタイプを定義し、リデューサーを書き、ローディング・成功・失敗の状態を自分で管理しなければならなかった。データを一つ取得するためだけに、膨大な定型コードが必要だった。（筆者はこの時期に実務を始め、「データを一つ取得するだけなのに、なぜ複数のファイルを作らなければならないのか」と疑問に思っていた。）

この流れの本質は、結局のところ**「このリクエストが何のリクエストかを識別できて初めて、同じリクエストを繰り返さずに済む」**ということだ。そして、その「何のリクエストか」を示す識別子こそが queryKey の正体である。

SWR と React Query（現在の TanStack Query）は、この問題に真正面から取り組んだ。「非同期リクエストには識別子が必要であり、識別子が同じならキャッシュを共有する」。この単純な原則一つで、先ほどの定型コードがすべて不要になった。


## queryKey の本質

では、queryKey とは正確には何だろうか。TanStack Query の公式ドキュメントでは、次のように定義されている。

::::quote
:::translation
TanStack Query は、その中核において、クエリキーに基づいてクエリのキャッシュを管理する。クエリキーの最上位は配列でなければならない……クエリキーがシリアライズ可能で、かつ**クエリのデータに対して一意である限り**、使用できる。
:::

:::original
At its core, TanStack Query manages query caching for you based on query keys. Query keys have to be an Array at the top level... As long as the query key is serializable, and **unique to the query's data**, you can use it.
:::
::::

要点は二つある。**シリアライズ可能であること、そしてそのデータに対して一意であること。** 同じキーは同じデータを意味し、異なるデータには異なるキーが必要だ。この単純な規則が、キャッシュシステム全体の動作を決める。

さらに、もう一つ重要な点がある。**queryKey は依存配列としての役割も担う。** React の `useEffect` で依存配列が変わると副作用が再実行されるのと同じように、queryKey が変わると TanStack Query は自動的に新しいデータをフェッチする。

```tsx
const { data } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
});
```

`userId` が `'A'` の場合と `'B'` の場合では、queryKey が異なる。異なればキャッシュミスとなり、キャッシュミスならフェッチする。これは自動で行われる。この単純さのおかげで、「userId が変わったので再度フェッチする」というロジックを自分で書く必要がない。

では、レンダリングのたびに新しく作られる配列を、TanStack Query はどうやって同じキーだと見分けるのだろうか。配列の参照を比較するのではなく、queryKey を `hashKey` でシリアライズした文字列（`queryHash`）をキャッシュのキーとして使う。この関数はプレーンオブジェクトのキーを並べ替えながら `JSON.stringify` でシリアライズするので、オブジェクト内のキー順はハッシュに影響せず、配列の要素の順序は影響する。値が `undefined` のプロパティはシリアライズの過程で消えるため、`{ a: 1, b: undefined }` と `{ a: 1 }` は同じキーになる。この動作を実装コードとともに追った内容は [queryKey比較の仕組み](/251230) に別途まとめておいた。


## queryKey の記述規則

queryKey がキャッシュの識別子であり依存配列でもあることを理解すれば、記述規則も自然に見えてくる。公式ドキュメントが推奨する規則を整理すると、次のようになる。

### queryKey は必ず配列にする

文字列を渡しても動作はする（内部で配列へ変換される）。ただし、一貫性を保つため、最初から配列で記述する方がよい。

```tsx
// 비권장
useQuery({ queryKey: 'todos', queryFn });

// 권장
useQuery({ queryKey: ['todos'], queryFn });
```

### queryFn が依存するすべての変数を queryKey に含める

```tsx
// 잘못된 예: userId가 쿼리키에 없다
useQuery({
  queryKey: ['user'],
  queryFn: () => fetchUser(userId),
});

// 올바른 예
useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
});
```

`useEffect` の依存配列と同じ考え方だ。関数内で使う変数はすべてキー（＝依存関係）に含めなければならない。この規則を破ると、対象ユーザーが変わったにもかかわらず以前のユーザーのデータがそのまま表示されるような、追跡しにくい不具合が生じる。

### 最も汎用的なものから最も具体的なものの順に配置する

```tsx
// 좋다
['todos', 'list', { filter: 'done' }]
['todos', 'detail', todoId]

// 안 좋다 (순서가 뒤집혀 있음)
[{ filter: 'done' }, 'list', 'todos']
```

この順序が重要なのは、**無効化**に関係するからだ。TanStack Query の `invalidateQueries` は、既定では**接頭辞一致**で動作する。

```tsx
// 모든 todos 관련 쿼리 무효화
queryClient.invalidateQueries({ queryKey: ['todos'] });
// → ['todos', 'list', ...], ['todos', 'detail', ...] 모두 매치된다

// list 쿼리만 무효화
queryClient.invalidateQueries({ queryKey: ['todos', 'list'] });
// → ['todos', 'list', ...]만 매치된다
```

キーをツリー構造として設計しておけば、「このドメインのすべてのデータを再取得する」から「この一つの項目だけを再取得する」まで、一行で表現できる。（初めて見たときは大したことではないように思えるが、一度設計を誤り、無効化の範囲が意図どおりに動かない経験をすると、その価値を痛感する。）


## queryKey 管理の変遷

ここまでは queryKey の動作原理と使い方を見てきた。ここからは、**queryKey の管理方法がどのように変化してきたのか**という問いに移ろう。

筆者が実務でたどってきた段階を、時系列で整理する。


### インライン配列

最も単純な形式だ。コンポーネント内で固定文字列とプロパティの値を組み合わせる。

```tsx
function UserProfile({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });
  // ...
}

function PostList({ filter }: { filter: PostFilter }) {
  const { data } = useQuery({
    queryKey: ['posts', filter],
    queryFn: () => fetchPosts(filter),
  });
  // ...
}
```

使い始めの段階では、これでも十分だ。

問題は、コードベースが大きくなるにつれて現れる。ユーザー情報を更新するミューテーションで無効化を行いたくても、「ユーザー関連のクエリキーは何だったか」を毎回検索しなければならない。ある箇所では `['user', userId]`、別の箇所では `['users', userId]`（複数形）と書かれることも起きる。両者はまったく別のキャッシュスロットなので、無効化は片方にしか適用されない。


### 定数オブジェクト

タイプミスを防ぐため、クエリキーを定数として一か所にまとめる。

```tsx
// queryKeys.ts
export const QUERY_KEYS = {
  USER: 'user',
  POSTS: 'posts',
  COMMENTS: 'comments',
} as const;

// 사용처
useQuery({
  queryKey: [QUERY_KEYS.USER, userId],
  queryFn: () => fetchUser(userId),
});
```

タイプミスはなくなる。しかし、キーを組み立てる責任は依然として利用側に残る。`[QUERY_KEYS.USER, userId]` という組み合わせを、ある人は `[QUERY_KEYS.USER, userId, 'detail']` と書き、別の人は `['user', 'detail', userId]` と書く。どれが正しいか、別途規約として覚えなければならない段階が訪れる。


### クエリキーファクトリー

このパターンは、TkDodo の[効果的な React Query のキー](https://tkdodo.eu/blog/effective-react-query-keys)という記事で具体化された。ドメインごとにキーを生成するオブジェクトを定義し、階層構造を関数で表現する。

```tsx
// features/todos/queries.ts
const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (filters: string) => [...todoKeys.lists(), { filters }] as const,
  details: () => [...todoKeys.all, 'detail'] as const,
  detail: (id: number) => [...todoKeys.details(), id] as const,
};

// 사용
useQuery({ queryKey: todoKeys.detail(1), queryFn: ... });
useQuery({ queryKey: todoKeys.list('done'), queryFn: ... });

// 무효화
queryClient.invalidateQueries({ queryKey: todoKeys.all });        // 전체
queryClient.invalidateQueries({ queryKey: todoKeys.lists() });    // 모든 리스트
queryClient.invalidateQueries({ queryKey: todoKeys.detail(1) });  // 특정 항목
```

このパターンが強力なのは、**階層構造がコード上に明示されるから**だ。`todoKeys.all` は todos に関するすべてのクエリ、`todoKeys.lists()` はすべてのリスト形式のクエリ、`todoKeys.detail(1)` は特定の項目を指す。無効化の範囲を一行のコードで正確に表現できる。

もう一つの利点は、**コロケーション**だ。TkDodo は、キーをグローバルなファイルへまとめることを推奨していない。代わりに、機能ディレクトリ内へ `queries.ts` を置き、その中にキーとフックをまとめる。

```
src/
└── features/
    └── todos/
        ├── index.tsx
        └── queries.ts   # 키와 훅을 모두 여기에
```

こうすることで、「todos を変更するなら todos フォルダだけ見ればよい」という単純なメンタルモデルができる。ともに変化するものを同じ場所に置く、という原則を忠実に実践した形だ。


### @lukemorales/query-key-factory

3番目のパターンを毎回手作業で書いていると、定型コードが増えていく。また、複数ドメインのキーを統合して管理したい場合、標準化されたインターフェースが欲しくなる。[@lukemorales/query-key-factory](https://github.com/lukemorales/query-key-factory) は、このパターンをライブラリとして実装したものだ。

```tsx
import { createQueryKeys, mergeQueryKeys } from '@lukemorales/query-key-factory';

const users = createQueryKeys('users', {
  detail: (userId: string) => ({
    queryKey: [userId],
    queryFn: () => api.getUser(userId),
  }),
  list: (filters: UserFilters) => ({
    queryKey: [{ filters }],
    queryFn: () => api.getUsers(filters),
  }),
});

const todos = createQueryKeys('todos', {
  detail: (id: number) => ({
    queryKey: [id],
    queryFn: () => api.getTodo(id),
  }),
});

export const queries = mergeQueryKeys(users, todos);

// 사용
useQuery(queries.users.detail('abc'));
useQuery(queries.todos.detail(1));

// 무효화
queryClient.invalidateQueries(queries.users._def);            // 모든 user 쿼리
queryClient.invalidateQueries(queries.users.detail('abc'));   // 특정 항목
```

`createQueryKeys` は接頭辞を自動的に付け、`mergeQueryKeys` を使えば複数のドメインを統合できる。また、`_def` という所定のプロパティからドメイン全体のキーへアクセスできる。手書きのファクトリーで毎回 `as const` を付け、型を自分で絞り込んでいた作業が不要になる。

このライブラリは、しばらくの間、事実上の標準として使われていた。（筆者も長い間愛用していた。）しかし、queryOptions の登場によって状況が変わった。


### queryOptions（v5 公式）

TanStack Query v5 における最も重要な変更の一つが、`queryOptions` API の導入だ。v4 から v5 への移行で、すべてのフックの引数が単一のオブジェクトに統一された。この変更の真の目的は、そのオブジェクトを**再利用可能な単位**として切り出せるようにすることだった。

```tsx
import { queryOptions } from '@tanstack/react-query';

export const userDetailOptions = (userId: string) =>
  queryOptions({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    staleTime: 5 * 60 * 1000,
  });

// 어디서나 사용 가능
useQuery(userDetailOptions('abc'));
useSuspenseQuery(userDetailOptions('abc'));
queryClient.prefetchQuery(userDetailOptions('abc'));
queryClient.setQueryData(userDetailOptions('abc').queryKey, newUser);
```

一見すると、「何が違うのか。単にオブジェクトを関数で包んだだけではないか」と思うかもしれない。TkDodo も[クエリオプション API](https://tkdodo.eu/blog/the-query-options-api)という記事で、その点を認めている。実行時には、本当に受け取ったオブジェクトをそのまま返すだけだ。

本当に重要な働きは、**型システムの中で**生じる。続けて見ていこう。


## queryOptions の DataTag

`queryOptions` が単なる補助関数ではない理由は、**返された queryKey にデータ型の情報を埋め込むから**だ。この仕組みは、TanStack Query の内部で `DataTag` と呼ばれている。

概略的な実装は、次のとおりだ。

```typescript
declare const dataTagSymbol: unique symbol;
declare const dataTagErrorSymbol: unique symbol;

export type DataTag<TType, TValue, TError = unknown> = TType & {
  [dataTagSymbol]: TValue;
  [dataTagErrorSymbol]: TError;
};
```

`unique symbol` を使った**ブランド型**だ。実行時には何の影響もない印にすぎないが、TypeScript から見ると、「この配列は単なる配列ではなく、`TValue` 型のデータに紐づいた配列である」という情報を持っている。

ここで、あえて `unique symbol` を使うのには理由がある。Zenn の [DataTag の背後にある unique symbol を解き明かす](https://zenn.dev/tsuboi/articles/tanstack-query-options-unique-symbol?locale=en)という記事では、この仕組みを「型情報専用の駐車スペース」にたとえている。通常の文字列キーなら、別のライブラリやユーザーコードのキーと衝突する可能性がある。しかし、**各 `unique symbol` 宣言はそれ自体が一意な型を作るため**、ほかのどの宣言とも同じ型にはならない。絶対に衝突しない識別子になるわけだ。

この一つの仕組みが生む違いは大きい。

```tsx
const data = queryClient.getQueryData(['user', 'abc']); // unknown
const data = queryClient.getQueryData(userDetailOptions('abc').queryKey); // User | undefined
```

`getQueryData` や `setQueryData` は queryKey 一つしか受け取らない。しかし、その queryKey にデータ型がすでに刻み込まれているため、返り値の型が自動的に推論される。ジェネリック型を明示的に渡す必要がなく、誤った型の値を `setQueryData` に渡そうとすれば、コンパイラが即座に検出する。

もちろん、制約もある。`getQueriesData` のように複数のクエリを一度に取得するメソッドでは、結果が異種のタプルからなる配列になるため、型推論は適用されない。また、`unique symbol` を使用するため、`.d.ts` の生成時にモノレポ環境で TS4023 エラーが発生することがある。この場合は、`dataTagSymbol` を明示的に import することで回避できる。

ここまでの仕組みを整理すると、一つの事実が明確になる。**queryOptions の型推論は、queryKey と queryFn が同じ場所で一緒に宣言されていることに全面的に依存する。** queryFn の返り値の型を queryKey に刻み込むには、両者が同じ場所で宣言されていなければならないからだ。

この点は、クエリキーファクトリーの設計方針に重要な示唆を与える。以前の世代のパターンは、queryKey の管理を独立した抽象化単位として切り離すことを重視していた。ところが、v5 の推奨は正反対だ。**queryKey と queryFn を一つの単位として再びまとめること**である。TkDodo はこれについて、「queryKey と queryFn を分離したのは誤りだった」とまで述べている。結局、キーは関数が使う依存関係の集合であり、両者は切り離せない関係にあるからだ。


## 実務で使う queryOptions の合成パターン

`queryOptions` の真価は、ドメイン別のファクトリーと組み合わせたときに発揮される。v5 の公式ドキュメントが推奨する形は、次のとおりだ。

```tsx
import { queryOptions } from '@tanstack/react-query';

export const todoQueries = {
  all: () => ['todos'] as const,
  lists: () => [...todoQueries.all(), 'list'] as const,
  list: (filters: TodoFilters) =>
    queryOptions({
      queryKey: [...todoQueries.lists(), filters],
      queryFn: () => fetchTodos(filters),
      staleTime: 30 * 1000,
    }),
  details: () => [...todoQueries.all(), 'detail'] as const,
  detail: (id: number) =>
    queryOptions({
      queryKey: [...todoQueries.details(), id],
      queryFn: () => fetchTodo(id),
      staleTime: 5 * 60 * 1000,
    }),
};
```

このパターンが優れている理由を、一つずつ見ていこう。

### 階層構造と型推論を同時に得られる

`todoQueries.all()` や `todoQueries.lists()` は単に配列を返すが、`todoQueries.detail(1)` は `queryOptions` によって作られた、データタグ付きのオブジェクトを返す。無効化には配列を、クエリの呼び出しにはオプションオブジェクトを使えばよい。

```tsx
useQuery(todoQueries.detail(1));                                // 옵션 객체
queryClient.invalidateQueries({ queryKey: todoQueries.all() }); // 배열
```

### コンポーネントでオプションを部分的に上書きできる

`queryOptions` の結果は最終的にはオブジェクトなので、呼び出す時点で一部のオプションを合成できる。

```tsx
const { data: title } = useQuery({
  ...todoQueries.detail(1),
  select: (todo) => todo.title,  // 컴포넌트별로 다른 select 적용
});
```

このパターンが特に強力なのは、`select` の返り値の型が自動的に推論され、`data` の型が `string` に絞り込まれる点だ。コンポーネント側では必要な部分だけを選んで使いながら、ドメインの定義は一か所に保てる。

### `useQuery` をラップするカスタムフックが次第に不要になる

v4 の頃は、ドメインごとにカスタムフックを作るのが一般的なパターンだった。

この方法の問題は、**プリフェッチが必要になった瞬間、同じ定義をもう一度書かなければならないこと**だった。`useTodoDetail` はフックなのでコンポーネントの外では呼べない。そのため、ルーターのローダーやイベントハンドラーでは、再び `queryClient.prefetchQuery({ queryKey: [...], queryFn: ... })` と書く必要があった。

`queryOptions` を使えば、この重複はなくなる。

同じ一つの定義が、どこでも機能する。そのため TkDodo は、「v5 ではフックを作るより queryOptions を定義する」ことを推奨している。フックは必要なときだけ薄くラップするための道具となり、ドメインの定義はフックがなくても自立して存在できる。


## ミューテーションの無効化

queryKey の階層構造が真価を発揮するのは、ミューテーション後の無効化だ。TanStack Query の[クエリの無効化](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation)に関するドキュメントによると、`invalidateQueries` は既定で**接頭辞一致**を行う。

```tsx
// 모든 todos 관련 쿼리 (list, detail, lists 모두)
queryClient.invalidateQueries({ queryKey: todoQueries.all() });

// 모든 list만 (detail은 건드리지 않음)
queryClient.invalidateQueries({ queryKey: todoQueries.lists() });

// 정확히 이 키만 (자식 키 매치 안 함)
queryClient.invalidateQueries({
  queryKey: todoQueries.detail(1).queryKey,
  exact: true,
});

// 더 복잡한 조건은 predicate으로
queryClient.invalidateQueries({
  predicate: (query) =>
    query.queryKey[0] === 'todos' &&
    (query.queryKey[2] as any)?.version >= 10,
});
```

キーが階層的に設計されていれば、**無効化の範囲とコードの意味が一致する。** 「todos をすべて更新する」は `all()`、「リストだけ更新する」は `lists()`、「この項目だけ更新する」は `detail(id)` で表現できる。

もしキーが `['todoList']`、`['todoDetail', 1]` のように平面的に散らばっていたら、「todos ドメイン全体」を無効化するために二つの呼び出しを別々に記述するか、専用の接頭辞定数を作って管理しなければならなかっただろう。（そして新しいドメインキーを追加するたびに、その定数への追加を忘れると、無効化から漏れる不具合が発生する。）


## queryFn 内で queryKey を取り出して使う

最後に、もう一つ触れておきたいパターンがある。`queryFn` は実際には `QueryFunctionContext` というオブジェクトを引数として受け取り、その中には呼び出し時の queryKey がそのまま含まれている。

```tsx
queryOptions({
  queryKey: ['user', userId, { include: 'profile' }] as const,
  queryFn: ({ queryKey }) => {
    const [, id, options] = queryKey;
    return fetchUser(id, options);
  },
});
```

このパターンはなぜ役立つのだろうか。TkDodo の[クエリ関数コンテキストを活用する](https://tkdodo.eu/blog/leveraging-the-query-function-context)によれば、**queryKey と queryFn の依存関係を強制的に同期できるから**だ。

```tsx
const sortBy = 'name';

queryOptions({
  queryKey: ['users'],
  queryFn: () => fetchUsers({ sortBy }),
});
```

このコードは、queryFn が外部変数に依存している危険なコードだ。しかも、`sortBy` が変わってもキャッシュは更新されない。依存関係をキーに含めていないからだ。しかし、`queryFn` が外部のクロージャから変数を取り込む限り、このようなミスはいつでも起こり得る。

解決策は単純だ。`queryFn` が外部変数に依存しないようにする。**すべての依存関係を queryKey から取り出して使えば**、queryKey に含まれていない変数は、そもそも関数内で使えなくなる。

```tsx
queryOptions({
  queryKey: ['users', { sortBy }] as const,
  queryFn: ({ queryKey: [, { sortBy }] }) => fetchUsers({ sortBy }),
});
```

このように書けば、新しい依存関係が増えたとき、queryKey に含めずに関数内で使うことはできない。コンパイラが「そのキーは存在しない」と検出してくれる。キーと関数の同期を規約ではなく、**型システムに委ねる**わけだ。


## どこまで分離するべきか

ここまで読むと、一つ疑問が浮かぶかもしれない。「では、すべてのクエリを `queryOptions` に切り出すべきなのか」

筆者の答えは、いつもどおり**「状況による」**だ。

覚えておきたいのは、**抽象化が常によいとは限らないこと**だ。一度しか使わないクエリをわざわざドメインファクトリーへ切り出すと、コードを読む人が二つのファイルを行き来するだけになる。queryKey 管理パターンの進化は、「常により精巧な道具を使うべきだ」という意味ではない。**「必要になったとき、はしごを一段ずつ上る選択肢がある」**と捉えるのがよい。


## まとめ

まとめると、queryKey は、**TanStack Query が非同期データを識別してキャッシュするための最も基本的な単位**だ。その小さな配列には、キャッシュスロットの識別子、依存配列、無効化の範囲、そして v5 ではデータ型の情報までが凝縮されている。一点にこれほど多くの責務が集まっているからこそ、どのように記述し、どのように管理するかが、コードベース全体の認知負荷に直結する。

各段階は、その時点で誰かが直面した現実の問題に対する答えだった。だから、単に「今は v5 だから、常に `queryOptions` だけを使えばよい」のではなく、**「自分のコードベースは今、どの段階の問題に直面しているのか」**を先に見極めるのが正しい順序だ。インライン配列で十分なプロジェクトへドメインファクトリーを導入することは、それ自体が過剰設計になり得る。

読者の皆さんも、自分のプロジェクトで一度確認してみてほしい。queryKey がコード全体にどのように散らばっているか、無効化がどのように行われているか、そしてその構造が現在のチーム規模とドメインの複雑さに合っているかを。


:::ref
- [ドキュメント] [TanStack Query：クエリキー](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
- [ドキュメント] [TanStack Query：クエリオプション](https://tanstack.com/query/v5/docs/framework/react/guides/query-options)
- [ドキュメント] [TanStack Query：TypeScript](https://tanstack.com/query/v5/docs/framework/react/typescript)
- [記事] [TanStack：TanStack Query v5 の発表](https://tanstack.com/blog/announcing-tanstack-query-v5)
:::
