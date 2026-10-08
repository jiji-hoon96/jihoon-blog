---
emoji: 🧮
title: "queryKey比較の仕組み"
seoTitle: "TanStack Query の queryKey 比較の仕組み: hashKey のシリアライズとキー順序"
date: "2025-12-30"
updatedAt: "2026-10-08"
categories: フロントエンド React TanStack-Query queryKey
description: "TanStack Query がレンダリングのたびに新しく作られる queryKey 配列を同じキーと判定する仕組みを整理する。hashKey のシリアライズがキー順、undefined、Map などの値をどう変えるか、フィルターがキーの構造をどう比較するかまで扱う。"
keywords: "queryKey 比較, hashKey, queryHash, TanStack Query キャッシュキー, React Query queryKey 順序, queryKeyHashFn, JSON.stringify キーのソート, QueryCache"
locale: ja
translationOf: '251230'
sourceHash: 24fc2216b382a69ba99c1d4ca8676c6ef3f58966b132171d60acb75e1be1f38c
---

今回は、**TanStack Query が二つの queryKey を同じキーと判定する仕組み**について話してみたい。

レンダリングのたびに新しい配列として作られる queryKey がなぜ毎回キャッシュミスにならないのか、オブジェクトのキー順や `undefined` の値がキャッシュに影響するのかが気になっていた TanStack Query ユーザーに向けた記事で、読み終えればキーを同じと見なす規則と、その規則がキャッシュに与える影響が分かる。結論から言うと、TanStack Query は queryKey を `hashKey` でシリアライズした文字列をキャッシュのキーとして使い、その過程でオブジェクトのキー順は無視され、配列の要素の順序はそのまま残る。

queryKey は、TanStack Query がクエリキャッシュを管理する基準となる配列だ。同じキーは同じデータを意味し、`['user', userId]` の `userId` が変わってキーが変わるとキャッシュミスが起き、改めて fetch する。


## QueryCache の内部

TkDodo の [React Query の内部](https://tkdodo.eu/blog/inside-react-query)によれば、`QueryCache` は結局のところ、**メモリ上に保持される一つのデータ構造**にすぎない。v5 の[公式実装](https://github.com/TanStack/query/blob/%40tanstack%2Fquery-core%405.104.1/packages/query-core/src/queryCache.ts)で使われているデータ構造は、プレーンオブジェクトではなく `Map<string, Query>` だ。フィールドの型は `QueryStore` で、コンストラクターで `new Map<string, Query>()` を代入する。保存と検索は `queryHash` をキーにして行う。キーは queryKey をシリアライズした形式（`queryHash`）、値は `Query` クラスのインスタンスである。この記事のコードと実行結果は `@tanstack/query-core` 5.104.1 を基準にしている。

古いバージョンで使われていたプレーンオブジェクトと違い、`Map` はプロトタイプから継承したキーとぶつかることがない。

`useQuery` が呼ばれるたびに起こることは単純だ。**queryKey をハッシュ値へ変換し、そのハッシュ値を使って Map を検索する。** 存在すればキャッシュ済みの `Query` インスタンスを取得し、なければ新しく作成して `set` する。

ここで自然に次の疑問が生まれる。**なぜわざわざ queryKey を文字列へシリアライズするのか。** `Map<QueryKey, Query>` のように配列自体をキーとして使えばよいのではないか。

その答えは、JavaScript の等価性モデルにある。ネイティブの `Map` はキーを**参照等価性**で比較する。内容が同じでも、メモリ上で別のオブジェクトなら異なるキーとして扱われる。

```js
const m = new Map();
m.set(['user', 1], 'alice');
m.get(['user', 1]); // undefined. 새로 만든 배열은 다른 참조다
```

ところが、React コンポーネントで `useQuery({ queryKey: ['user', userId] })` と記述すると、**レンダリングのたびに新しい配列インスタンスが作られる。** 最初のレンダリングと二度目のレンダリングで使われる queryKey 配列は、内容が同じでもメモリ上では別のオブジェクトだ。もしキャッシュが参照等価性に依存していたら、同じデータを参照するコンポーネントがレンダリングのたびにキャッシュミスを起こしていただろう。

参照等価性によって生じる問題の解決策は単純だ。**参照等価性を構造的等価性へ変換すること**である。queryKey の内容だけから決定論的な文字列を作り、その文字列を Map のキーとして使う。そうすれば、「内容が同じなら同じキー」という期待どおりの意味論を取り戻せる。`JSON.stringify` は、その変換を行う最も単純な手段にすぎない。

## hashKey のキーの並べ替え

ハッシュ値を作る関数は `hashKey` だ。[`packages/query-core/src/utils.ts`](https://github.com/TanStack/query/blob/%40tanstack%2Fquery-core%405.104.1/packages/query-core/src/utils.ts#L284-L295) に定義された公式実装は、次のようになっている。

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

`JSON.stringify` に[置換関数のコールバック](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#the_replacer_parameter)を挟み、**プレーンオブジェクトのキーを辞書順に並べ替えて**からシリアライズする。正確には `sort()` の既定の比較である UTF-16 コード単位順なので、大文字のキーが小文字のキーより前に来る。

この並べ替えが本質的なのは、文字列へのシリアライズには、さらに厳しい条件が伴うためだ。**意味が同じ入力は、常に同じ文字列へ変換されなければならない。** しかし、通常の `JSON.stringify` はキーの順序をそのまま維持する。`{ a: 1, b: 2 }` と `{ b: 2, a: 1 }` は意味上は同じオブジェクトなのに、異なる文字列へシリアライズされ、最終的に別々のキャッシュスロットとなる。その結果、同じデータを二度リクエストする事態が再び起きてしまう。

これを一貫して防ぐ手法が、**正準形**だ。意味上同じ入力が、常に一意な一つの表現に対応するよう強制する。`hashKey` の置換関数がプレーンオブジェクトのキーを並べ替える理由は、これだ。どの順序で入力されても出力が同じになるようにして、意味が同じオブジェクトが常に同じ文字列になるようにする。逆方向は保証されないという点は後で扱う。

配列を並べ替えないのも、同じ原理の裏返しだ。配列は順序そのものに意味があるデータ構造なので、並べ替えると情報が失われる。オブジェクトのキー順は偶然だが、配列の要素順は意図である。`hashKey` は両者を区別して扱う。メンテナーの TkDodo が [Effective React Query Keys](https://tkdodo.eu/blog/effective-react-query-keys) で、queryKey を最も汎用的なものから最も具体的なものの順に構成するよう勧めているのも、配列の順序が意味を持つからだ。彼が挙げる理由は無効化である。先頭部分が同じキーを `['todos']` 一つでまとめて無効化できる。この比較を担うのはハッシュではなく、後で見る prefix マッチングだ。

キーの並べ替えが適用されるのは、**プレーンオブジェクト**だけだ。同じファイル内の `isPlainObject` は、`Object.prototype.toString` の結果が `[object Object]` かどうかと、プロトタイプが `Object.prototype`（または `null`）かどうかを検査し、**純粋なオブジェクトリテラル**と**クラスのインスタンス**を区別する。そのため、`{ foo: 1 }` のようなリテラルは並べ替えられる一方、`class User { ... }` で作成したインスタンスは並べ替えられず、そのまま処理される。クラスのインスタンスをそのまま queryKey に入れると、キーが並べ替えられないのでフィールドを代入した順にシリアライズされ、値が同じでも異なるハッシュになることがある。

使う側から見ると、結果は二つある。

**1. オブジェクトのキー順は問わない。**

```tsx
useQuery({ queryKey: ['todos', { status: 'done', page: 1 }], queryFn });
useQuery({ queryKey: ['todos', { page: 1, status: 'done' }], queryFn });
// 두 쿼리는 같은 캐시 슬롯을 공유한다
```

キーの並べ替えがなければ、オブジェクトリテラルを使うたびにキーの順序を覚えておかなければならなかっただろう。

**2. 配列の要素順は重要である。**

```tsx
useQuery({ queryKey: ['todos', status, page], queryFn });
useQuery({ queryKey: ['todos', page, status], queryFn });
// 두 쿼리는 다른 캐시이다
```


## シリアライズが変える値

また、`undefined` 値はシリアライズの過程で消えることも覚えておくとよい。`{ a: 1, b: undefined }` と `{ a: 1 }` は同じハッシュ値になる。（筆者はこのことを知らず、「undefined を明示的に入れたのだから別のキャッシュだ」と考えてしまったことがある。）

配列の中では挙動が異なる。配列要素の `undefined` は消えずに `null` になる。そのため `['user', undefined]` と `['user', null]` は同じキーで、`['user']` とは別のキーだ。`['user', userId]` の `userId` がまだ `undefined` の場合がこれに当たる。`enabled: false` で fetch を止めておいても、キャッシュには `["user",null]` のスロットが作られる。`useQuery` が内部で使う `QueryObserver` を同じオプションで作って確認した。

`undefined` だけではない。`hashKey` は `JSON.stringify` の上に成り立っているので、JSON が表現できない値はほとんどがエラーなしで別の値に変わる。以下のコードを 2026-10-08 に `@tanstack/query-core` 5.104.1、Node v24.16.0 で実行した。コメントが実際の出力だ。

```js
import { hashKey, QueryClient } from '@tanstack/query-core'

console.log(hashKey(['user', undefined])) // ["user",null]
console.log(hashKey(['user', null])) // ["user",null]
console.log(hashKey(['user'])) // ["user"]
console.log(hashKey(['f', { cb: () => 1 }])) // ["f",{}]
console.log(hashKey(['m', new Map([['a', 1]])])) // ["m",{}]
console.log(hashKey(['d', new Date('2025-12-30T00:00:00Z')])) // ["d","2025-12-30T00:00:00.000Z"]

const queryClient = new QueryClient()
queryClient.setQueryData(['m', new Map([['a', 1]])], 'mapA')
console.log(queryClient.getQueryData(['m', new Map([['b', 2]])])) // mapA
```

同じ方法でほかの値も実行すると、次のようにまとまる。

| キーに入れた値 | シリアライズ結果 | 同じキーとして扱われるもの |
|---|---|---|
| 配列要素の `undefined`、`NaN`、`Infinity`、関数 | `null` | その位置に `null` を入れたキー |
| オブジェクトのプロパティの `undefined`、関数 | プロパティが消える | そのプロパティがないキー |
| `Map`、`Set` | `{}` | 中身に関係なくすべての `Map`、`Set`、空オブジェクト |
| `Date` | ISO 文字列 | 同じ ISO 文字列 |
| `BigInt` | `TypeError` を投げる | なし |
| 循環参照 | 循環がプレーンオブジェクトだけでつながれば `RangeError`、配列かクラスのインスタンスを経由すれば `TypeError` を投げる | なし |

最も危険なのは `Map` と `Set` だ。上のコードでは、`new Map([['a', 1]])` をキーにして入れたデータが `new Map([['b', 2]])` で取り出せた。エラーがないので、画面に別のデータを描いていることに気づく手がかりもない。

エラーとして表に出るのは `BigInt` と循環参照の二つだけだ。循環参照は、何が循環しているかによってエラーが分かれる。循環がプレーンオブジェクトだけでつながっていれば `RangeError: Maximum call stack size exceeded` で終わり、`arr.push(arr)` のように配列かクラスのインスタンスを一つでも経由すれば `TypeError: Converting circular structure to JSON` で終わる。置換関数がプレーンオブジェクトごとに新しいオブジェクトを作って返すため、`JSON.stringify` の循環検出は同じオブジェクトに再び出会えない。一方、配列とクラスのインスタンスは置換関数がそのまま返すので循環検出に引っかかる。逆に `Date` は `toJSON` で ISO 文字列になるので、キャッシュの検索では同じ時刻なら同じキーになり、比較的安全だ。

筆者は一度、`Date` をそのまま入れておいて「同じ時点なのに、なぜキャッシュが更新されるのか」と長いあいだ悩んだことがある。同じ時刻を指す `Date` は、インスタンスが違っても同じ ISO 文字列になるので同じハッシュを作る。毎回違うキーが出ていたなら、同じ時点に見えても時刻そのものが違っていたということだ。レンダリング中に `new Date()` を作ると、レンダリングごとにミリ秒単位で異なる時刻が入り、そのたびに新しいキーになる。

そのため、queryKey には文字列、数値、真偽値、`null` と、それらからなる配列とプレーンオブジェクトだけを入れるのが安全だ。


## queryKeyHashFn

この制約には逃げ道がある。TanStack Query は `queryKeyHashFn` というオプションで、**ハッシュ関数自体を差し替えられる**ようにしている。内部では `hashQueryKeyByOptions(queryKey, options)` が、オプションに `queryKeyHashFn` があればそれを、なければ既定の `hashKey` を呼ぶように分岐している。

差し替えるとは、`hashKey` を丸ごと置き換えるという意味だ。先に見たキーの並べ替えも一緒に消えるので、並べ替えが必要なら自分で実装しなければならない。このオプションが役に立つのは、`BigInt` のように既定のシリアライズが例外を投げる値だ。以下のコードも同じ環境で実行した。

```js
import { QueryClient } from '@tanstack/query-core'

const bigintSafeHash = (queryKey) =>
  JSON.stringify(queryKey, (_, v) => (typeof v === 'bigint' ? v.toString() : v))

const queryClient = new QueryClient({
  defaultOptions: { queries: { queryKeyHashFn: bigintSafeHash } },
})

queryClient.setQueryData(['order', 9007199254740993n], 'ok')
console.log(queryClient.getQueryData(['order', 9007199254740993n])) // ok
console.log(queryClient.getQueryData(['order', '9007199254740993'])) // ok

queryClient.setQueryData(['todos', { status: 'done', page: 1 }], 'A')
console.log(queryClient.getQueryData(['todos', { page: 1, status: 'done' }])) // undefined
```

二つ目の出力は、`BigInt` と同じ数を持つ文字列が同じキーになるという意味だ。最後の出力はキーの並べ替えが消えた結果で、キーの順序だけが違うオブジェクトをもう同じキーとは見なさない。

登録する場所も結果を変える。上のように `QueryClient` の `defaultOptions` や `setQueryDefaults` で登録すると、`setQueryData` と `getQueryData` もその関数を使う。二つの API がハッシュする前に `defaultQueryOptions` で既定のオプションをマージするためだ。一方、`useQuery` の呼び出しにだけ書くと命令型 API は既定の `hashKey` を使い、同じキーがキャッシュの中で二つのスロットに分かれる。v3.2.0 のベータ版の頃にはグローバルの既定値も `setQueryData` に適用されなかったが、[Issue #1343](https://github.com/TanStack/query/issues/1343) の報告者が v3.2.0-beta.30 で直ったことを確認した。

そのため実務では、逃げ道を使うよりも **queryKey を作る時点でシリアライズ可能な形に変換して入れるほう**がはるかに安全だ。ハッシュ関数を自分で書くと、キーの並べ替えと登録場所の両方を気にかけなければならないからだ。


## フィルターのキー比較

二つのキーを同じと判定する方法はもう一つある。ここまで述べた「同じキー」とはハッシュ文字列が同じという意味で、ハッシュが使われるのはキャッシュの検索と `exact: true` のフィルターだ。`invalidateQueries` や `findAll` のようなフィルターは既定で `partialMatchKey` によって判定し、この関数はハッシュ文字列ではなく、元の queryKey の構造を再帰的に比較する。配列は先頭から照合し、オブジェクトはフィルター側に書かれたキーだけを見る。以下のコードも同じ環境で実行した。

```js
import { partialMatchKey } from '@tanstack/query-core'

const queryKey = ['todos', { status: 'done', page: 1 }]
console.log(partialMatchKey(queryKey, ['todos'])) // true
console.log(partialMatchKey(queryKey, ['todos', { status: 'done' }])) // true
console.log(partialMatchKey(queryKey, [{ status: 'done' }])) // false
console.log(partialMatchKey(queryKey, ['todos', { status: 'todo' }])) // false
```

ハッシュを通らないので、`queryKeyHashFn` を差し替えてもこのマッチングは変わらない。先の例のように並べ替えのないハッシュ関数を登録した `QueryClient` では、キーの順序だけが違うオブジェクトを `exact: true` では見つけられないが、prefix マッチングでは見つけられる。

そのため、ハッシュで同じキーがフィルターでも同じになるという保証はない。`['user', undefined]` で作ったクエリは `['user', null]` フィルターの prefix マッチングに引っかからず、`NaN` を含むキーは自分自身ともマッチしない。逆に `Date` や `Map` をフィルターに入れると、列挙するプロパティがないため、同じ位置にあるどの `Date` やオブジェクトともマッチする。


## まとめ

まとめると、TanStack Query は queryKey 配列の参照を比較しない。`hashKey` がプレーンオブジェクトのキーを並べ替えながら `JSON.stringify` で作った文字列（`queryHash`）を `Map` のキーとして使う。そのため、オブジェクトのキー順はキャッシュに影響せず、配列の要素の順序は影響し、値が `undefined` のプロパティはハッシュでは存在しないのと同じになる。JSON が表現できない値はほとんどがエラーなしで別の値に変わり、異なるキーが静かに同じキーになる。`queryKeyHashFn` でハッシュ関数を替えることはできるが、キーの並べ替えも一緒に捨てることになるので、キーを作る時点でシリアライズ可能な値に変換して入れるほうが安全だ。無効化のようなフィルターは既定でハッシュを通さず、queryKey の構造を先頭から照合するので、ハッシュで同じキーがフィルターでも同じだと期待しないほうがよい。結局、キャッシュの検索は `hashKey` でキーの中身を比べ、フィルターはキーの先頭部分を比べるので、queryKey にはシリアライズしても意味が変わらない単純な値だけを入れれば、二つの比較がどちらも期待どおりに動く。

この判定基準が queryKey をどう書き、どう管理するかにつながる話、つまりインライン配列からクエリキーファクトリーを経て `queryOptions` に至った流れは [queryKey](/260104) で扱う。

読者の皆さんも、次に queryKey にオブジェクトや `Map` を入れるとき、その値がどんな文字列にシリアライズされるのかを一度思い浮かべてみてほしい。


## 参考資料

:::ref
- [ドキュメント] [TanStack Query：クエリキー](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
- [ドキュメント] [TanStack Query：QueryClient](https://tanstack.com/query/latest/docs/framework/react/reference/classes/QueryClient)
:::
