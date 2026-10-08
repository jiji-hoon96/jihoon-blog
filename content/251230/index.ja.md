---
emoji: 🧮
title: "queryKey比較の仕組み"
seoTitle: "TanStack Query の queryKey 比較の仕組み: hashKey とシリアライズ"
date: "2025-12-30"
categories: フロントエンド React TanStack-Query queryKey
description: "TanStack Query がレンダリングのたびに新しく作られる queryKey 配列を同じキーと判定する仕組みを hashKey の実装で整理する。オブジェクトのキー順は無関係で配列の順序は重要な理由、undefined が消える動作、queryKeyHashFn の限界まで扱う。"
keywords: "queryKey 比較, hashKey, queryHash, TanStack Query キャッシュキー, React Query queryKey 順序, queryKeyHashFn, JSON.stringify キーのソート, QueryCache"
locale: ja
translationOf: '251230'
sourceHash: 7e26877fcdd3f1c85b67751a911900b36ff424cb43b408fb640fb8aa3075e22a
---

今回は、**TanStack Query が二つの queryKey を同じキーと判定する仕組み**について話してみたい。

レンダリングのたびに新しい配列として作られる queryKey がなぜ毎回キャッシュミスにならないのか、オブジェクトのキー順や `undefined` の値がキャッシュに影響するのかが気になっていた TanStack Query ユーザーに向けた記事で、読み終えればキーを同じと見なす規則と、その規則がキャッシュに与える影響が分かる。結論から言うと、TanStack Query は queryKey を `hashKey` でシリアライズした文字列をキャッシュのキーとして使い、その過程でオブジェクトのキー順は無視され、配列の要素の順序はそのまま残る。

queryKey は、TanStack Query がクエリキャッシュを管理する基準となる配列だ。同じキーは同じデータを意味し、`['user', userId]` の `userId` が変わってキーが変わるとキャッシュミスが起き、改めて fetch する。

ここで一つ疑問が生じる。queryKey が「同じキー」であることを、どのように判定しているのだろうか。単純に `===` で比較すればオブジェクトの参照は異なるため、毎回キャッシュミスになるはずだ。


## QueryCache の内部

TkDodo の [React Query の内部](https://tkdodo.eu/blog/inside-react-query)によれば、`QueryCache` は結局のところ、**メモリ上に保持される一つのデータ構造**にすぎない。より正確には、v5 の[公式実装](https://github.com/TanStack/query/blob/main/packages/query-core/src/queryCache.ts)で使われているデータ構造は、プレーンオブジェクトではなく `Map<string, Query>` だ。クラス内で `#queries = new Map<string, Query>()` と宣言され、すべての書き込みと読み込みは `#queries.set(query.queryHash, query)` と `#queries.get(queryHash)` を通じて行われる。キーは queryKey をシリアライズした形式（`queryHash`）、値は `Query` クラスのインスタンスである。

古いバージョンではプレーンオブジェクトが使われていた時期もあったが、v5 ではネイティブの `Map` へ移行した。（`Map` はキーの衝突やプロトタイプ汚染のリスクがなく、挿入順を保持し、文字列キーの検索が平均 O(1) であるため、キャッシュのデータ構造としては定石に近い選択だ。）

`useQuery` が呼ばれるたびに起こることは単純だ。**queryKey をハッシュ値へ変換し、そのハッシュ値を使って Map を検索する。** 存在すればキャッシュ済みの `Query` インスタンスを取得し、なければ新しく作成して `set` する。

ここで自然に次の疑問が生まれる。**なぜわざわざ queryKey を文字列へシリアライズするのか。** `Map<QueryKey, Query>` のように配列自体をキーとして使えばよいのではないか。

その答えは、JavaScript の等価性モデルにある。ネイティブの `Map` はキーを**参照等価性**で比較する。内容が同じでも、メモリ上で別のオブジェクトなら異なるキーとして扱われる。

```js
const m = new Map();
m.set(['user', 1], 'alice');
m.get(['user', 1]); // undefined — 새로 만든 배열은 다른 참조다
```

ところが、React コンポーネントで `useQuery({ queryKey: ['user', userId] })` と記述すると、**レンダリングのたびに新しい配列インスタンスが作られる。** 最初のレンダリングと二度目のレンダリングで使われる queryKey 配列は、内容が同じでもメモリ上では別のオブジェクトだ。もしキャッシュが参照等価性に依存していたら、同じデータを参照するコンポーネントがレンダリングのたびにキャッシュミスを起こすという悲惨な事態になっていただろう。

参照等価性によって生じる問題の解決策は単純だ。**参照等価性を構造的等価性へ変換すること**である。queryKey の内容だけから決定論的な文字列を作り、その文字列を Map のキーとして使う。そうすれば、「内容が同じなら同じキー」という期待どおりの意味論を取り戻せる。`JSON.stringify` は、その変換を行う最も単純な手段にすぎない。（TanStack Query が v3 の時代に複数のシリアライズ方式を試した末、安定した `JSON.stringify` の変種へ落ち着いた理由でもある。）

ここで中心となるのが、ハッシュ値を作る関数 `hashKey` だ。[`packages/query-core/src/utils.ts`](https://github.com/TanStack/query/blob/main/packages/query-core/src/utils.ts) に定義された公式実装は、正確には次のようになっている。

```typescript
export function hashKey(queryKey: QueryKey | MutationKey): string {
  return JSON.stringify(queryKey, (_, val) =>
    isPlainObject(val)
      ? Object.keys(val)
          .sort()
          .reduce((result, key) => {
            result[key] = val[key]
            return result
          }, {} as any)
      : val,
  )
}
```

`JSON.stringify` ではあるが、単純に文字列化しているわけではない。[置換関数のコールバック](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#the_replacer_parameter)を挟み、**プレーンオブジェクトのキーをアルファベット順に並べ替えて**からシリアライズしている。

この並べ替えが本質的なのは、文字列へのシリアライズには、さらに厳しい条件が伴うためだ。**意味が同じ入力は、常に同じ文字列へ変換されなければならない。** しかし、通常の `JSON.stringify` はキーの順序をそのまま維持する。`{ a: 1, b: 2 }` と `{ b: 2, a: 1 }` は意味上は同じオブジェクトなのに、異なる文字列へシリアライズされ、最終的に別々のキャッシュスロットとなる。その結果、同じデータを二度リクエストする事態が再び起きてしまう。

これを一貫して防ぐ手法が、**正準形**だ。意味上同じ入力が、常に一意な一つの表現に対応するよう強制する。`hashKey` の置換関数がプレーンオブジェクトのキーを並べ替える理由は、まさにこれだ。どの順序で入力されても出力が同じになるようにし、シリアライズの結果とオブジェクトの意味を一対一で結びつける。言い換えれば、キーの順序だけが異なり中身が同じオブジェクトを一つのまとまりとみなし、そのまとまりを代表する表現としてキーを並べ替えた形を一つ選ぶ操作である。

配列を並べ替えないのも、同じ原理の裏返しだ。配列は順序そのものに意味があるデータ構造なので、並べ替えると情報が失われる。オブジェクトのキー順は偶然だが、配列の要素順は意図である。`hashKey` は両者を明確に区別して扱う。公式ガイドが queryKey を「汎用的なものから具体的なものの順に配置する」よう推奨しているのは、このためだ。配列の順序が意味を担う以上、その意味は作成者が自ら定める必要がある。

ここでもう一つ確認しておくべき点がある。キーの並べ替えが適用されるのは、**プレーンオブジェクト**だけだ。同じファイル内の `isPlainObject` は単に `typeof === 'object'` を見るのではなく、`Object.getPrototypeOf(o) === Object.prototype` まで検査し、**純粋なオブジェクトリテラル**と**クラスのインスタンス**を区別する。そのため、`{ foo: 1 }` のようなリテラルは並べ替えられる一方、`class User { ... }` で作成したインスタンスは並べ替えられず、そのまま処理される。（クラスのインスタンスをそのまま queryKey に含めると、`JSON.stringify` が列挙可能なプロパティだけを出力する挙動と相まって、意図しないハッシュが生成されることがある。）

この仕組みから、二つの重要な結果が導かれる。

**1. オブジェクトのキー順は問わない。**

```tsx
useQuery({ queryKey: ['todos', { status: 'done', page: 1 }], queryFn });
useQuery({ queryKey: ['todos', { page: 1, status: 'done' }], queryFn });
// 두 쿼리는 같은 캐시 슬롯을 공유한다
```

キーを並べ替えてからシリアライズするためだ。この仕組みがなければ、オブジェクトリテラルを使うたびにキーの順序を覚えておかなければならなかっただろう。

**2. 配列の要素順は重要である。**

```tsx
useQuery({ queryKey: ['todos', status, page], queryFn });
useQuery({ queryKey: ['todos', page, status], queryFn });
// 두 쿼리는 다른 캐시이다
```

配列は順序そのものに意味があるデータ構造だからだ。`JSON.stringify` も配列の順序は維持する。

また、`undefined` 値はシリアライズの過程で消えることも覚えておくとよい。`{ a: 1, b: undefined }` と `{ a: 1 }` は同じハッシュ値になる。（筆者はこのことを知らず、「undefined を明示的に入れたのだから別のキャッシュだ」と考えてしまったことがある。）

もう一つ、queryKey に**循環参照や関数**を含めることはできない。`JSON.stringify` では処理できないためだ。`Date` オブジェクトや `Map/Set`、`BigInt` なども同様に、標準の挙動では推奨されない。シリアライズ可能な純粋なデータ構造である必要がある。

興味深いのは、この制約が完全に強制されているわけではない点だ。TanStack Query は `queryKeyHashFn` というオプションを通じて、**ハッシュ関数自体を差し替えられる逃げ道**を用意している。内部では `hashQueryKeyByOptions(queryKey, options)` が、オプションに `queryKeyHashFn` があればそれを呼び、なければ既定の `hashKey` を呼ぶように分岐する。

```tsx
useQuery({
  queryKey: [{ id: userId, fetchedAt: new Date() }],
  queryFn,
  // Date를 ISO 문자열로 바꿔서 해싱
  queryKeyHashFn: (key) =>
    JSON.stringify(key, (_, v) => (v instanceof Date ? v.toISOString() : v)),
});
```

ただし、このオプションはクエリごとに個別に指定する必要があり、`queryClient.setQueryData` のようにオプションを知らないまま呼び出される命令型 API には適用されないという制約がある（[課題 #1343](https://github.com/TanStack/query/issues/1343)）。そのため実務では、回避手段を使うよりも、**queryKey を作る時点でシリアライズ可能な形式へ変換してから渡す方**がはるかに安全だ。（筆者も一度 `Date` をそのまま入れ、「同じ時刻なのに、なぜキャッシュが更新されないのか」と長時間悩んだことがある。結局、答えは「その `Date` は同じ時刻を表していても別のオブジェクトインスタンスなので、毎回異なるハッシュになっていた」だった。）


## まとめ

まとめると、TanStack Query は queryKey 配列の参照を比較しない。`hashKey` がプレーンオブジェクトのキーを並べ替えながら `JSON.stringify` で作った文字列（`queryHash`）を `Map` のキーとして使う。そのため、オブジェクトのキー順はキャッシュに影響せず、配列の要素の順序は影響し、値が `undefined` のプロパティは存在しないのと同じになる。シリアライズできない値は `queryKeyHashFn` で回避できるが、キーを作る時点でシリアライズ可能な値に変換して入れるほうが安全だ。

この判定基準が queryKey をどう書き、どう管理するかにつながる話、つまりインライン配列からクエリキーファクトリーを経て `queryOptions` に至った流れは [queryKey](/260104) で扱う。

読者の皆さんも、次に queryKey にオブジェクトや `Date` を入れるとき、その値がどんな文字列にシリアライズされるのかを一度思い浮かべてみてほしい。


## 参考資料

:::ref
- [ドキュメント] [TanStack Query：クエリキー](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
:::
