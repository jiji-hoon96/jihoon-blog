---
emoji: 🧩
title: "ドメインモデル"
seoTitle: "フロントエンドにおけるドメインモデル設計ガイド — DDD実践記"
date: "2026-04-18"
categories: フロントエンド アーキテクチャ DDD
description: "フロントエンドの視点からドメイン、ドメインモデル、ドメインオブジェクトの概念を整理し、EntityとValue Object、貧血ドメインモデル、ViewModelの分離まで扱う。総合所得税ドメインの例を通じて、Reactでドメインロジックを分離する実践的な方法を解説する。"
keywords: "フロントエンド ドメインモデル, ドメイン駆動設計, DDD フロントエンド, Frontend DDD, ドメインオブジェクト, Entity Value Object, Anemic Domain Model, 貧血ドメインモデル, Clean Architecture フロントエンド, Eric Evans, Martin Fowler, ドメインロジック分離, React 設計パターン, フロントエンドアーキテクチャ, ViewModel 分離, Bounded Context"
locale: ja
translationOf: '260418'
sourceHash: a1d3e0f7ef15a579dbf42aa51384cdd5203c46ecd7905a9859da49208df8e961
---

今回の記事では、**ドメイン（Domain）** について考えてみたい。

筆者は開発を続けるなかで、**「ドメイン（Domain）」** という言葉をかなり頻繁に耳にしてきた。しかし、いざ「ドメインとは正確には何か？」と聞かれると、明快に答えるのは簡単ではない。（正直なところ、開発を始めたばかりの頃は、ドメインとはwwwのことだと思っていた。）

ドメインについて調べると、自然と **ドメインモデル**、**ドメインオブジェクト**、**ドメインオブジェクトモデル** といった概念に行き着く。しかし、それぞれがどう違うのか、また、これらの概念がバックエンドではなく **フロントエンド** でどのような意味を持つのかを整理した記事は、意外と多くない。この文章では、各概念の定義から始め、フロントエンドでドメインロジックをどのように分離し、抽象化するのが適切なのかまで、例を交えて整理してみたい。

最近は税金に関するドメインに関心がある。まもなく5月の総合所得税申告の時期を迎えるので、今回は税金を例に取り上げる。

---


## ドメイン（Domain）

最も基本的な問いから始めよう。**ドメイン**とは何だろうか？

Eric Evansは著書 **Domain-Driven Design: Tackling Complexity in the Heart of Software（2003）** で、ドメインを次のように定義している。

::::quote
:::translation
知識、影響力、または活動の領域。
:::

:::original
"A sphere of knowledge, influence, or activity."
:::
::::

簡単に言えば、**プログラミングによって解決しようとする問題領域**そのものがドメインである。税務申告サービスを作るなら「税務申告」がドメインであり、保険請求プラットフォームを作るなら「保険請求」がドメインとなる。ドメインはコードではない。ソフトウェアより先に存在する、現実世界の問題領域である。

これはフロントエンド開発者にとって、どのような意味を持つのだろうか？私たちが作るUIは、最終的にこのドメインをユーザーへ見せ、操作できるようにする **窓（window）** である。税金を主なドメインとするToss Incomeや3o3のような税金還付サービスを開発するなら、所得区分、必要経費率、所得控除、税額控除、還付額といったドメインの概念をUIで表現することになる。そのため、フロントエンド開発者も自分が扱うドメインを深く理解しなければならない。UIコンポーネントをうまく描画することと同じくらい、**「このサービスが解決する問題は何か」** を知ることが重要だという意味である。

とはいえ、「税金」という一つのドメインだけを見ても、その内部には数多くのサブドメインが存在する。筆者が表面的に把握している総合所得税の計算パイプラインだけでも、次のとおりだ。

![1.png](1.png)

このパイプラインの各段階は、それぞれ固有のルールとデータを持つサブドメインである。「税金」という一つの大きなドメインの中で、所得（Income）、控除（Deduction）、税額（Tax）、申告結果（Filing）という細かなドメインが絡み合っている。これらをコード上でどう分けるかが、まさにドメインモデリングの中心的な問いである。


## ドメインモデル（Domain Model）

では、ドメインモデルとは何だろうか？ドメインと「ドメインモデル」はどう違うのだろう？

Martin FowlerとEric Evansは、ドメインモデルを次のように定義している。

::::quote
:::translation
振る舞いとデータの両方を含む、ドメインのオブジェクトモデル。— Martin Fowler
:::

:::original
An object model of the domain that incorporates both behavior and data.
:::
::::

::::quote
:::translation
ドメインの選択された側面を記述する抽象化の体系であり、そのドメインに関する問題を解決するために使用できるもの。— Eric Evans
:::

:::original
A system of abstractions that describes selected aspects of a domain and can be used to solve problems related to that domain.
:::
::::

重要なのは、**「選択的な抽象化」** だという点である。ドメインモデルは、現実世界のすべてを含むわけではない。映画監督が現実のすべての場面を収めず、物語に必要な場面だけを選ぶように、ドメインモデルも **解決したい問題に必要な側面だけを選び、構造化したもの** である。

ここで大切な点が一つある。ドメインモデルは、必ずしもコードである必要はない。ホワイトボードに描かれた図かもしれないし、チーム内で共有されているメンタルモデル（Mental Model）かもしれない。つまり、ドメインモデルという用語自体は、ソフトウェアとは独立した概念であり得る。

ここには、フロントエンド開発者が特に混同しやすい点がある。APIレスポンスの構造を見て、「これがドメインモデルだ」と考えることだ。しかし、それは **データモデル（Data Model）** であって、ドメインモデルではない。

データモデルとドメインモデルを区別すると、次のようになる。

| 区分      | ドメインモデル                                    | データモデル                              |
| --------- | ------------------------------------------------- | ----------------------------------------- |
| 目的      | ビジネス上の概念とルールを表現する                | 保存・転送の構造を定義する                |
| 言語      | ビジネス用語（課税標準、税額控除、還付額）        | 技術用語（string、number、array）         |
| 構成要素  | データ + 振る舞い（ルール）                       | データ構造のみ                            |
| 例        | 「課税標準1,400万ウォン以下の区分は税率6%」       | `{ taxableBase: number, taxRate: number }` |

データモデルは「どのような形でデータがやり取りされるか」を定義し、**ドメインモデルは「このデータがビジネス上何を意味し、どのようなルールに従うか」を定義する。** この二つを区別できなければ、コンポーネントがAPIレスポンスの構造へ直接依存し、バックエンドのスキーマが変わるたびにフロントエンド全体が揺さぶられることになる。


## ドメインオブジェクト（Domain Object）

ドメインモデルが概念の体系であるなら、**ドメインオブジェクト**は、その概念をコードとして実装した実体である。

Code with Jasonを運営する[Jason Swettの記事](https://www.codewithjason.com/difference-domains-domain-models-object-models-domain-objects/)では、ドメインオブジェクトを次のように定義している。

::::quote
:::translation
私のオブジェクトモデルにあるオブジェクトのうち、ドメインモデルにも一つの概念として存在するものを、ドメインオブジェクトと呼ぶ。
:::

:::original
Any object in my object model that also exist as a concept in my domain model I would call a domain object.
:::
::::

つまり、ドメインモデルに「総合所得」という概念があり、コード上に`Income`という型があるなら、この`Income`がドメインオブジェクトである。ただし、コード上のすべてのオブジェクトがドメインオブジェクトなのではない。`HttpClient`、`LocalStorageAdapter`、`useDebounce`などは技術的な道具であり、ドメインの概念ではない。


### EntityとValue Object

Evansは、ドメインオブジェクトを **Entity**、**Value Object**、**Service** の三つに分類している。（Martin Fowlerはこの分類を「Evans Classification」と呼ぶ。）Serviceは、「特定のオブジェクトへ自然に帰属しないドメインの操作」を表す別の概念だが、この記事の中心はデータをどのように識別するかという問題なので、EntityとValue Objectの二つに焦点を当てる。

**Entity（エンティティ）** は、時間やさまざまな表現を超えて維持される、一意のアイデンティティを持つオブジェクトである。税務申告書（TaxFiling）、納税者（Taxpayer）、所得記録（IncomeRecord）のように一意なIDで識別され、属性が変わっても同じIDなら同じEntityである。申告書の控除項目が修正されても、申告書IDが変わらない限り、それは同じ申告書であり続ける。

**Value Object（値オブジェクト）** は、属性の組み合わせだけで意味を持つオブジェクトであり、すべての属性値が同じなら同一とみなす。金額（Money）、税率（TaxRate）、税率区分（TaxBracket）のように、値そのものに意味があるオブジェクトだ。「税率6%」は、どこで使われても「税率6%」でしかない。

この区別は、フロントエンドでなぜ重要なのだろうか？次のコード例で見てみよう。

```typescript
interface TaxFiling {
  id: string;
  taxpayerName: string;
  taxYear: number;
  status: FilingStatus;
}

const isSameFiling = (a: TaxFiling, b: TaxFiling) => a.id === b.id;

interface Money {
  amount: number;
  currency: "KRW" | "USD";
}

const isSameMoney = (a: Money, b: Money) =>
  a.amount === b.amount && a.currency === b.currency;
```

TaxFilingはidをアイデンティティの基準とするため、Entityである。（idフィールドを持つこと自体がEntityの定義なのではなく、「そのidによって同一かどうかを判断する」点が重要である。）Moneyはidを持たず、amountとcurrencyの組み合わせだけで識別され、すべての属性が同じなら同じ値とみなされる。

EntityはIDによる比較、Value Objectは属性による比較。この区別が明確であれば、状態管理で「このデータが同じものか別のものか」を判断するロジックが自然に整理される。リスト内の項目を更新するとき、EntityならIDで探して置き換え、Value Objectならイミュータブルな置き換え（immutable replace）を行う、といった具合だ。


## ドメインオブジェクトモデル（Domain Object Model）

「ドメインモデル」と「ドメインオブジェクト」は分かった。では、**ドメインオブジェクトモデル**とは何だろうか？

調べてみると、意外にも合意された定義はない。多くの文献では、「ドメインモデル」「ドメインオブジェクトモデル」「概念モデル（conceptual model）」「分析オブジェクトモデル（analysis object model）」を **実質的に同義語** とみなしている。オブジェクト指向分析の段階で描かれる概念モデルを指す、複数の呼び方だという立場である。

一方で、もう少し分離された層として捉える見方もある。**ドメインモデルが実際のコードへ変換される地点がオブジェクトモデルである**、という説明が代表的だ。

この二つ目の観点では、**オブジェクトモデル**とは、システム内の **すべてのコードオブジェクトの構造** である。そこには`HttpClient`や`useDebounce`のような技術的な道具も含まれる。その中で、**ドメインの概念を表すオブジェクトの部分集合と、それらの関係**が **ドメインオブジェクトモデル** である。「Object Model」をシステムの静的構造（クラス、属性、操作、関係）と定義してきた、オブジェクト指向モデリングの伝統にもつながっている。

筆者は、こちらの観点のほうがフロントエンド開発者にとって実用的だと考えている。実際に書くコードには、ドメインオブジェクトと技術的なオブジェクトが常に混在しているからだ。

結局、**ドメイン → ドメインモデル → ドメインオブジェクトモデル → ドメインオブジェクト** は、抽象から具体へと下りていく階層である。ドメインが最も広く、ドメインオブジェクトが最も具体的だ。したがって、フロントエンドのコードを書くときに実質的に考えるべき領域は、**ドメインオブジェクトモデル（ドメインの概念を表す型と、その間の関係）をどのように構造化するか** ということになる。


## フロントエンドのドメインロジックはどこに置くべきか？

概念の定義はここまでにして、ここからは実践について考えよう。フロントエンドのドメインロジックは、**どこに**置くべきなのだろうか？

ソフトウェア設計に深い関心を持つ[Khalil Stemmler](https://khalilstemmler.com/about/)は、当初「ビジネスロジックはフロントエンドに属さない」と主張していたが、後に「バックエンドでアーキテクチャ上行っているほぼすべてのことを、フロントエンドでも実践できるし、実践すべきだ」と立場を改めた。

筆者もこの立場に同意する。もちろん、フロントエンドがビジネスロジックの **信頼できる唯一の情報源（Single Source of Truth）** になってはならない。それはバックエンドの役割である。しかし、フロントエンドにも **フロントエンド独自のドメインロジック** が確かに存在する。

「ユーザーが入力した情報に応じて、予想還付額をリアルタイムに表示しなければならない」ケースを考えてみよう。この計算ロジックがバックエンドにしかなければ、ユーザーが所得金額を一文字直すたびにAPIを呼び出す必要がある。ネットワークの往復時間だけUIが止まり、入力の速いユーザーなら不要なリクエストが爆発的に増えてしまう。debounceを適用しても、数百ミリ秒の遅延は「リアルタイムプレビュー」という体験を損なうのに十分である。**結局、即時フィードバックが必要な計算はフロントエンド自身が実行せざるを得ず、フロントエンドでしか実行できないロジックが存在することになる。**


### ドメインロジックがコンポーネントに混在している場合

総合所得税のプレビュー画面を例にしよう。ユーザーが所得情報を入力すると、予想税額をリアルタイムに表示する機能である。次は、ドメインロジックとUIロジックが入り交じった、よく見かけるコードだ。

```tsx
function TaxPreviewPage() {
  const [총수입, set총수입] = useState(0);
  const [경비율, set경비율] = useState(0.641); 
  const [인적공제대상인원, set인적공제대상인원] = useState(1); 

  const 종합소득금액 = 총수입 - 총수입 * 경비율;

  const 소득공제합계 = 인적공제대상인원 * 1_500_000;
  const 과세표준 = Math.max(0, 종합소득금액 - 소득공제합계);

  let calculatedTax = 0;
  if (과세표준 <= 14_000_000) {
    calculatedTax = 과세표준 * 0.06;
  } else if (과세표준 <= 50_000_000) {
    calculatedTax = 과세표준 * 0.15 - 1_260_000;
  } else if (과세표준 <= 88_000_000) {
    calculatedTax = 과세표준 * 0.24 - 5_760_000;
  } else if (과세표준 <= 150_000_000) {
    calculatedTax = 과세표준 * 0.35 - 15_440_000;
  } else {
    calculatedTax = 과세표준 * 0.38 - 19_940_000;
  }

  const 기납부세액 = 총수입 * 0.033;
  const refundOrPayment = 기납부세액 - calculatedTax;

  return <div>...</div>;
}
```

このコードの問題が見えるだろうか？「人的控除は1人当たり150万ウォン」「8段階の累進税率」「3.3%の源泉徴収」という **税法で定められたビジネスルール** が、Reactコンポーネント内へ直接埋め込まれている。税法は毎年改正されるため、このようなルールがコンポーネントに散らばっていれば、改正時に修正箇所を探し回ることになる。開発者だけでなく、QAチームが管理するE2Eシナリオがあるなら、テストコストも無視できないだろう。

やがて、これがビューロジックなのかビジネスロジックなのか区別しづらくなり、大量の条件分岐とカスタムフックが複雑に絡み合ってしまう。


### ドメインロジックを分離してみよう

Alex BespoyasovのClean Architectureのアプローチから、中心的な原則を借りよう。ドメインロジックを、**フレームワークに依存しない純粋関数**として分離するのである。

::::quote
:::translation
ドメインは、あるアプリケーションを別のアプリケーションと区別する中核である。ReactからAngularへ移行しても変わらないもの、と考えることができる。
:::

:::original
The domain is the core that distinguishes one application from another. You can think of the domain as something that won't change if we move from React to Angular.
:::
::::

先ほどの税額計算の例をリファクタリングしてみよう。

まず、ドメインの型とルールを定義し、関連する情報をまとめる。

```typescript
export interface Income {
  grossAmount: number;
  expenseRate: number;
}

export interface Deductions {
  personalCount: number;
  pensionPaid: number;
  additionalDeductions: number;
}

const PERSONAL_DEDUCTION_PER_PERSON = 1_500_000;
const WITHHOLDING_RATE = 0.033;
const TAX_BRACKETS = [
  { limit: 14_000_000, rate: 0.06, progressiveDeduction: 0 },
  /** ...구간들... **/
] as const;
```

次に、ドメインロジックを純粋関数として分離する。

先ほどの所得計算、控除、課税標準、税額、還付額などの計算ロジックを`computeFullTax`関数へ分離する。各段階は、さらに小さな純粋関数へ分割する。結果の型を`ReturnType<typeof computeFullTax>`で推論させれば、別途インターフェースを宣言する必要はない。

その後、コンポーネントはドメインロジックを「使う」だけにする。

```tsx
import { computeFullTax } from "../domain/tax";

function TaxPreviewPage() {
  const [income, setIncome] = useState<Income>({
    grossAmount: 0,
    expenseRate: 0.641,
  });
  const [deductions, setDeductions] = useState<Deductions>({
    personalCount: 1,
    pensionPaid: 0,
    additionalDeductions: 0,
  });

  const result = computeFullTax(income, deductions);

  return (
    <div>
      <IncomeForm value={income} onChange={setIncome} />
      <DeductionForm value={deductions} onChange={setDeductions} />
      <TaxResultSummary result={result} />
    </div>
  );
}
```

何が変わったのだろうか？

- **8段階の累進税率表**（`TAX_BRACKETS`）が一か所にまとまり、税法改正時は`domain/tax.ts`だけを修正すればよい
- **計算パイプライン**が`computeFullTax`という一つの関数へ集約され、全体の流れをひと目で把握できる。（例を単純にするため一つにまとめたが、実際のプロジェクトでは所得計算・控除計算・税額算出など、目的別にさらに細分化するのが適切である。）
- **コンポーネントは「どう見せるか」だけに集中**する。税率が変わってもコンポーネントを修正する必要はない
- Reactから別のフレームワークへ移行しても、`domain/tax.ts`は **変わらない**

ドメインロジックを分離すると、テストは驚くほど単純になる。税金ドメインでは、**計算の正確さがそのままユーザーのお金に直結する**ため、この点は特に重要である。

税金に関する計算ロジックを持つ純粋関数には、React Testing Libraryも、`render`も、`screen.getByText`も必要ない。入力を与えて出力を確認するだけでよい。「1,400万ウォン以下は税率6%」「課税標準が0ウォンなら税額も0ウォン」「フリーランサーの所得3,000万ウォンに対する還付額」といったケースを、一行の`it`で表現できる。ドメイン単体テストはコンポーネントを分離する基準を自然に示し、テストコードはドキュメントとしての役割まで果たす。


## 貧血ドメインモデル（Anemic Domain Model）

前節では、**計算ロジック**を分離した。しかし、ドメインロジックには計算以外にも、**状態遷移ルール**と **権限の判定** がある。「この申告書は今編集できるか？」「提出できるか？」「請求方式を切り替えられるか？」といった問いがそれに当たる。このようなルールを分離する際、陥りやすい罠が一つある。Martin Fowlerが名付けた **貧血ドメインモデル（Anemic Domain Model）** である。

貧血ドメインモデルとは、**型はドメインの言葉で適切に定義されているのに、その上で動作するルールがドメインの外へ散らばっている**状態を指す。税務申告（Filing）ドメインを例にしよう。型はすっきりしている。

```typescript
// types/filing.ts
export interface TaxFiling {
  id: string;
  status: "draft" | "submitted" | "reviewing" | "completed" | "amended";
  taxYear: number;
  filingType: "regular" | "late" | "amendment";
  determinedTax: number;
}
```

ところが、この型に関する判定・遷移ルールは、別の場所に埋め込まれている。

```typescript
// utils/filingHelpers.ts
export function canAmendFiling(filing: TaxFiling) {
  return filing.status === "completed" && filing.filingType !== "amendment";
}

// components/FilingDetail.tsx
function FilingDetail({ filing }: { filing: TaxFiling }) {
  // 같은 도메인 규칙을 컴포넌트 안에 다시 작성한다
  const canEdit = filing.status === "draft" || filing.status === "reviewing";
  // ...
}

// hooks/useSubmitFiling.ts
export function handleSubmitFiling(filing: TaxFiling) {
  if (filing.status !== "draft") return;
  // ...
}
```

同じドメインルールが、utils、コンポーネント、フックの三か所に、それぞれ異なる形で存在している。この状態で「請求可能条件を変更します」という要件が入れば、修正すべき場所を探し回ることになる。そして一か所でも見落とせば、サイトのどこかで誤った判定が行われる。Fowlerはこのようなコードを、**「オブジェクト指向の皮をかぶった手続き的コードと変わらない」** と批判した。

解決策は、前節で計算ロジックに適用したものと同じである。**ルールを型の隣に置く。**

```typescript
export interface TaxFiling {
  id: string;
  status: FilingStatus;
  taxYear: number;
  filingType: FilingType;
  determinedTax: number;
}

export type FilingStatus =
  | "draft"
  | "submitted"
  | "reviewing"
  | "completed"
  | "amended";

export type FilingType = "regular" | "late" | "amendment";

// 도메인 규칙은 도메인 옆에 둔다
export function canEdit(filing: TaxFiling): boolean {
  return filing.status === "draft";
}

export function canSubmit(filing: TaxFiling): boolean {
  return filing.status === "draft" && filing.determinedTax >= 0;
}

export function canAmend(filing: TaxFiling): boolean {
  return filing.status === "completed" && filing.filingType !== "amendment";
}
```

これで、申告に関するルールは`domain/filing.ts`の一か所で管理される。どのコンポーネントでも`canAmend(filing)`を呼び出せばよく、ルールが変わればこのファイルだけを修正すればよい。重要なのは、**型と、その上で働くルールを一つのまとまりとして捉えることだ。** 型だけをドメインフォルダに置き、ルールをutilsへ切り出す部分的な分離は、見た目がすっきりしていても、依然として貧血状態である。


## APIレスポンスとドメインモデルの間の変換層

実務では、もう一つ考慮すべきことがある。バックエンドのAPIレスポンス構造とフロントエンドのドメインモデルが、常に一致するとは限らない点だ。国の機関と連携する税金サービスなら、なおさらである。韓国国税庁のHometaxから連携されるデータは略語やコード値にあふれており、フロントエンドのドメインモデルと同じ形で返ってくる可能性は低い。

そこで必要になるのが **変換層（Mapper）** である。APIレスポンスの型をそのままコンポーネントまで流すのではなく、一度ドメインの型へ整えてから使う。純粋関数が一つあれば十分だ。

```typescript
import type { Income } from "../domain/tax";

interface HometaxIncomeResponse {
  총수입금액: number;
  경비율: number;
  소득유형코드: string;
  // ... 나머지 약어 필드들
}

export function toIncome(response: HometaxIncomeResponse): Income {
  return {
    총수입_금액: response.총수입금액,
    경비_비율: response.경비율,
  };
}
```

こうすれば、APIレスポンスの`총수입금액`、`경비율`のような略語やコード値による分類を、フロントエンドのドメインに合わせて **一か所で** 変換できる。所得区分コードのようにenumへ展開する必要がある値には、mapper内に小さなlookup tableを置けばよい。Hometax APIのフィールド名が変わっても、mapper一つを修正するだけで済む。


## ユーティリティ関数とドメインロジック

ドメインロジックを分離していると、必ずぶつかる問いがある。**「これはユーティリティ関数ではないのか？」**

たとえば、次の二つの関数を見てみよう。

```typescript
function formatCurrency(amount: number): string {
  return `${amount.toLocaleString()}원`;
}

function calculateTax(taxableBase: number): number {
  const bracket = TAX_BRACKETS.find((bracket) => taxableBase <= bracket.limit);
  return Math.floor(taxableBase * bracket.rate - bracket.progressiveDeduction);
}
```

`formatCurrency`は、数値を文字列へ変換する純粋な **プレゼンテーション（Presentation）ロジック** である。「ウォン」という単位を付け、3桁ごとにカンマを入れることはビジネスルールではなく、ユーザーにどう見せるかに関するものだ。一方、`calculateTax`には「8段階の累進税率を適用する」という、**税法に基づくビジネスルール** が含まれている。これはUIがなくても同じように適用されるべき、ドメインのルールである。

筆者が実務で用いる判断基準は、次のとおりだ。

> **このロジックがなくなったとき、ビジネスが壊れるのか、それとも画面だけが壊れるのか？**

ビジネスが壊れるならドメインロジックであり、画面だけが壊れるならプレゼンテーションロジックである。この問い一つで、ほとんどの境界を区別できる。

| 判断基準                     | ドメインロジック                      | ユーティリティ／プレゼンテーションロジック |
| ---------------------------- | ------------------------------------- | ------------------------------------------- |
| ないと何が壊れるか？         | 税額計算を誤る                        | 画面（UI）の表示がおかしくなる              |
| フレームワークが変わると？   | そのまま維持される                    | 変わる可能性がある                          |
| 企画書に明記されているか？   | 「課税標準 × 税率 - 累進控除」        | 「金額はカンマ区切り」                      |
| バックエンドにも同じロジックがあるか？ | ある、またはあるべき          | ない（フロントエンドだけの関心事）          |

しかし、現実はそれほど明快ではない。最も厄介なのは、**ドメインロジックのように見えて、実際にはプレゼンテーションロジックである場合**だ。

次のコードを見てみよう。FilingStatusというドメインの概念を引数として扱うため、ドメインロジックに分類している。しかし、本当にこれはドメインロジックなのだろうか？

```typescript
// domain/filing.ts
function getStatusBadgeColor(status: FilingStatus): string {
  const colors: Record<FilingStatus, string> = {
    draft: "gray",
    submitted: "blue",
    reviewing: "yellow",
    completed: "green",
    amended: "purple",
  };
  return colors[status];
}

function getStatusDisplayText(status: FilingStatus): string {
  const labels: Record<FilingStatus, string> = {
    draft: "작성 중",
    submitted: "제출 완료",
    reviewing: "검토 중",
    completed: "신고 완료",
    amended: "경정청구",
  };
  return labels[status];
}
```

`getStatusBadgeColor`と`getStatusDisplayText`は、`FilingStatus`というドメインの概念を使ってはいるが、行っているのは **画面上の表現** である。バッジの色が変わっても、ビジネスには何の影響もない。このような関数を`domain/filing.ts`へ入れると、ドメインモジュールが次第に肥大化し、本当のドメインロジックとプレゼンテーションロジックが混在することになる。


### ドメインモデルとViewModelの分離

この問題を解決する実用的な方法がある。**同じドメインフォルダ内で、ViewModelを別ファイルに分離する**ことだ。`.ui.ts`ではなく`.viewModel.ts`という名前を使えば、MVVMパターンのViewModelという概念へ自然につながる。「ドメインデータを画面に合わせて変換する層」という役割が、名前からすぐに伝わるためだ。

```
domains/
└── filing/
    ├── filing.ts              # 순수 도메인 모델 + 도메인 로직
    ├── filing.viewModel.ts    # ViewModel (표현 변환 계층)
    ├── filing.test.ts         # 도메인 로직 테스트
    └── filingMapper.ts        # API ↔ 도메인 변환
```

先ほど見た`getStatusBadgeColor`、`getStatusDisplayText`を、そのまま`filing.viewModel.ts`へ移す。さらに、`getFilingTypeLabel(type: FilingType): string`のように、申告の種類を韓国語のラベルへ展開する変換もここへ集める。`filing.ts`はビジネスルールだけ、`filing.viewModel.ts`は画面上の表現だけを担う。

重要なのは **依存関係の向き** である。`filing.viewModel.ts`は`filing.ts`をimportするが、`filing.ts`は`filing.viewModel.ts`を決してimportしない。ドメインはプレゼンテーションを知らず、プレゼンテーションがドメインを知る構造だ。これはRobert C. Martinが述べた依存性のルール（Dependency Rule）の縮図といえる。

筆者は、一緒に変更されるファイルは同じディレクトリに置くべきだと考え、同じフォルダへ配置した。`FilingStatus`型に新しい値（たとえば`'rejected'`）が加われば、`filing.ts`と`filing.viewModel.ts`の両方を修正しなければならない。同じフォルダにあれば、修正範囲をひと目で把握できる。


## 境界と凝集

ドメインロジックを分離することと同じくらい重要なのが、**どこに境界を引くか** である。筆者が実務でよく直面する境界判断の問題を、いくつか整理してみよう。

フロントエンドで扱うデータは、おおむね四つの出所に分けられる。

- **サーバーデータ**：APIレスポンスとして受け取ったもの
- **派生データ**：サーバーデータから計算されたもの
- **UI状態**：画面制御のためのもの、ユーザーの操作
- **ユーザー入力**：フォームへの入力途中のもの

この四つを一つの型に混ぜると、ドメインモデルが汚染される。

```typescript
// 안티패턴: 모든 것이 섞인 타입
interface TaxFiling {
  // 서버 데이터 (도메인)
  id: string;
  status: FilingStatus;
  determinedTax: number;

  // 파생 데이터 (도메인)
  refundAmount: number;
  canAmend: boolean;

  // UI 상태 (표현)
  isExpanded: boolean;
  activeStep: number;

  // 임시 상태
  editingDeductions: Deduction[];
}
```

この型には、ドメインの概念、UI状態、一時データが一つのかごに入っている。`activeStep`が変わるたびに、申告ドメインが更新されることになる。（フォームのステップが変わることは、ビジネスイベントではない。）

改善するには、境界に従って型を分離する。**ドメインモデル**には`id`、`status`、`determinedTax`のようなビジネスの概念だけを、**UI状態**（`FilingFormViewState`）には`isExpanded`、`activeStep`のような画面制御だけを、**フォーム状態**（`DeductionEditForm`）には入力途中の一時データだけを含める。

こうすれば、それぞれの型が **一つの変更理由** だけを持つ。ドメインの型は税法が変わるときだけ、UI状態は画面設計が変わるときだけ、フォーム状態は入力UXが変わるときだけ修正される。


### 一緒に変わるものは一緒に置こう

Eric EvansのDDDには、**Aggregate（集約）** という概念がある。「関連するオブジェクトのまとまりを一つの単位として扱うこと」である。フロントエンドでこの概念をそのまま適用する必要はないが、**一緒に変わるデータとルールは一緒に置く。** という中心的な原則は参考にできる。

税金サービスを例にすると、`Income`（所得）と`ExpenseRate`（必要経費率）は常に一緒に変わる。所得区分が変われば適用される必要経費率も変わり、総合所得金額の計算にも影響する。したがって、これらは一つのファイル`domain/tax.ts`へまとめる。

一方、`TaxFiling`（申告書）は税額計算とは別に変わり得る。申告書の状態遷移ルールが変わっても、税率の計算ロジックには影響しない。そのため、`domain/filing.ts`へ分離するのが適切である。

```
이렇게 묻자: "A가 변할 때 B도 반드시 변해야 하는가?"
  → Yes: 같은 모듈에 둔다 (Income + ExpenseRate + TaxBracket)
  → No: 분리한다 (Tax 계산 ↔ Filing 상태관리)
```


## Classと関数型

ここまで読むと、一つの根本的な疑問が浮かぶかもしれない。これまでの例はすべて`interface`と純粋関数の組み合わせだったが、Classでドメインを表現すれば、凝集がより自然になるのではないだろうか？

そのとおりである。Classベースでドメインを表現すると、データと振る舞いが一つのオブジェクトにまとまるため、凝集がコード構造にそのまま現れる。

```typescript
class TaxFilingModel {
  constructor(
    public readonly id: string,
    public readonly status: FilingStatus,
    public readonly taxYear: number,
    public readonly filingType: FilingType,
    public readonly determinedTax: number,
  ) {}

  canEdit(): boolean {
    return this.status === "draft";
  }

  canAmend(): boolean {
    return this.status === "completed" && this.filingType !== "amendment";
  }

  canSubmit(): boolean {
    return this.status === "draft" && this.determinedTax >= 0;
  }
}

const filing = new TaxFilingModel(
  "F-001",
  "completed",
  2025,
  "regular",
  547200,
);

filing.canAmend();
```

Classベースで書けば、振る舞いがデータへ帰属する。そして、利用側で主語が明確になる。`filing.canAmend()`は、まるで自然言語を読むように直感的だ。主語（filing）と動詞（canAmend）がはっきり結び付いている。`jihoon.eat('감자탕')`と書けば、「ジフンがカムジャタンを食べる」とすぐに読み取れるのと同じだ。

一方、関数型スタイルでは次のようになる。

```typescript
canAmend(filing);
eat("jihoon", "감자탕");
```

関数型では、データが外部に存在する。上の二つのコードは、`filing`というデータを引数として受け取り、何らかの動作を実行する。`eat`関数は、`jihoon`と`감자탕`というデータを引数として受け取って実行する。

結果として、主語と動詞の結び付きが弱くなる。`canAmend`という関数が`TaxFiling`に関係することは、ファイルを開くか型シグネチャを確認しなければ分からない。さらに、同じファイルに`canAmend(filing)`、`canEdit(filing)`、`calculateTax(taxableBase)`のような関数が混在すれば、どの関数がどのドメインに属するのかをひと目で把握しにくくなることがある。


### では、Classを使うべきか？

正直に言えば、答えは **「状況による」**。しかし、筆者の経験上、React + TypeScript環境でClassが万能ではない現実的な理由がある。

**1. Reactの状態管理との摩擦**

Reactの状態管理は、基本的に **Plain Object** と最も自然に組み合わせられる。`useState`や`useReducer`は技術的にはどんな値でも保持でき、Redux DevTools自体がClassインスタンスのプロトタイプを取り除くわけでもない。ただし、Redux/Zustandの永続化ミドルウェアが状態をJSONとして保存・復元すると、Classインスタンスは`JSON.stringify` → `JSON.parse`のサイクルでメソッドとプロトタイプを失い、plain objectになる。一方、React Server ComponentからClient Componentへpropsを渡す境界は、対応するシリアライズ可能な（serializable）値だけを受け付けるため、任意のClassインスタンスはそもそも渡せない。

次のコードを見てみよう。

```typescript
const [filing, setFiling] = useState(
  new TaxFilingModel("F-001", "draft", 2025, "regular", 0),
);
```

Reactの状態を更新するだけなら、`filing`が`TaxFilingModel`のインスタンスでなくなることはない。ただし、Redux/Zustandの永続化でJSONとして保存・復元されると、値がメソッドのないplain objectになる可能性があり、何気なく呼び出した`filing.canAmend()`がランタイムエラーを起こし得る。React Server ComponentからClient Componentへ渡す場合は、Classインスタンスが対応するシリアライズ形式ではないため、受け渡しの時点で失敗する。

**2. イミュータビリティを保証する難しさ**

Reactは、状態の変更を **参照同一性（referential equality）** に基づいて検出する。Classインスタンスのメソッドが`this.items.push(...)`のように内部を変更しても参照は同じままなので、Reactは再レンダリングをトリガーしない。そのため、結局は`addDeduction(item)`が`return new DeductionList([...this.items, item])`のように毎回新しいインスタンスを返すよう実装しなければならない。そうなると、Classの利点である「カプセル化された状態変更」の意味が薄れ、関数型の更新とさほど変わらないコードになる。


### 関数型で凝集を確保する方法

では、関数型スタイルで`eat('jihoon', '감자탕')`のような、凝集の弱さに関する問題をどう改善できるだろうか？筆者が効果的だと感じた三つの方法を紹介する。

**1. モジュールの名前空間で凝集させる**

最も直感的な方法である。ファイル（モジュール）自体をドメイン単位にし、import時に名前空間を利用する。先ほど定義した`domain/filing.ts`をそのまま使えばよい。

```typescript
import * as FilingModel from "../domain/filing";

FilingModel.canEdit(filing);
FilingModel.canAmend(filing);
FilingModel.canSubmit(filing);
```

`FilingModel.canAmend(filing)`は`filing.canAmend()`ほどではないが、少なくともこの関数がFilingドメインに属することがコードからすぐに分かる。関数が複数のドメインにまたがって混在するリスクもなくなる。

**2. 最初の引数をドメインの主体に統一する**

関数型で凝集を表す、もう一つの規約がある。**最初の引数を常に「振る舞いの主体」にする。** `canAmend(filing)`、`calculateTotalIncome(income)`のようにシグネチャを統一すると、`canAmend(filing)`は「filingについてcanAmendかどうかを問う」と読める。Unixのパイプラインという考え方（`data |> transform`）にも通じる。実際、Goのメソッドレシーバーはまさにこのパターンであり、Rustの`impl`ブロックで`self`を最初の引数として受け取るのも同じ発想である。

**3. ドメインオブジェクトの生成関数（Factory）で振る舞いをまとめる**

Classの凝集性が欲しいときに使えるパターンである。ファクトリ関数がドメインオブジェクトとその振る舞いをまとめて返す。

```typescript
export function createFilingModel(data: TaxFiling) {
  return {
    ...data,
    canEdit: () => data.status === "draft",
    canSubmit: () => data.status === "draft" && data.determinedTax >= 0,
    canAmend: () =>
      data.status === "completed" && data.filingType !== "amendment",
  } as const;
}

const filing = createFilingModel(rawFiling);
filing.canAmend();
filing.canEdit();
```

このパターンなら、Classの表現力（`filing.canAmend()`）と、オブジェクトリテラルで振る舞いを構成する関数型の実用性を同時に得られる。ただし、返されるオブジェクトは関数プロパティを持つため、それ自体はJSONシリアライズ可能なデータではない。毎回関数オブジェクトを新しく作るコストもあるが、フロントエンドで扱うデータ量なら、パフォーマンス上の問題になることはほとんどない。


## どこまで分離するべきか？

Clean Architectureを読むと、3〜4層に分けてPort/Adapterを定義する理想的な構造が示されている。しかし、実際にすべてのプロジェクトへこの構造を適用するのは、過剰設計（over-engineering）になり得る。

筆者が考える実用的な基準は、次のとおりだ。

- **ドメインの型をAPIレスポンスの型から分離**する。`interface`でも`type`でも、フロントエンドで使用するドメインの概念を別ファイルに定義する。
- **ビジネスルールを含むロジックは、コンポーネントの外へ出す。** `domain/`フォルダでなくてもよい。重要なのは、Reactに依存しない純粋関数にすることである。
- **APIレスポンス → ドメインモデルへの変換を一か所で行う。** Mapper関数でもZodスキーマでも、その一か所だけを修正すれば変更が波及しない構造にする。

プロジェクトが複雑になったら、次のような対応も検討できる。

- **Bounded Context単位でフォルダを分ける。** [Tossフロントエンドチャプター](https://frontend-fundamentals.com/)でも、「一緒に変更されるファイルを同じディレクトリに配置する」という原則を強調している。ドメイン単位でフォルダを分ければ、importパスがドメインの境界を自然に表す。
- **Use Case層を導入する。** ドメインロジックの組み合わせが複雑になったら、「所得情報の取得 → 必要経費率の適用 → 控除項目の計算 → 税額の算出 → 還付額の確定」というシナリオを一つの関数にまとめるApplication層が必要になる。

```
src/
├── domains/
│   ├── tax/
│   │   ├── tax.ts                  # 세액 계산 도메인 (세율, 공제, 계산 파이프라인)
│   │   ├── tax.viewModel.ts        # 세액 표현 (금액 포맷, 구간 라벨)
│   │   ├── tax.test.ts             # 세액 계산 테스트
│   │   └── incomeMapper.ts         # 홈택스 API ↔ 도메인 변환
│   ├── filing/
│   │   ├── filing.ts               # 신고 상태 도메인 (상태 전이, 권한)
│   │   ├── filing.viewModel.ts     # 신고 표현 (상태 배지, 라벨)
│   │   ├── filing.test.ts
│   │   └── filingMapper.ts
│   └── deduction/
│       ├── deduction.ts            # 공제 항목 도메인 (자격 조건, 한도)
│       └── deduction.viewModel.ts
├── hooks/                           # React 의존 로직
├── components/                      # UI 컴포넌트
└── api/                             # API 호출
```

「税金」という一つのドメインの中でも、**税額計算（tax）**、**申告管理（filing）**、**控除項目（deduction）** は、それぞれ独立したサブドメインに分けられる。税率が変わっても申告状態の遷移ロジックには影響せず、控除項目が追加されても申告書の提出フローはそのままである。これがBounded Contextの実践的な適用である。


## まとめ

まとめると、**ドメイン**は私たちが解決しようとする問題領域であり、**ドメインモデル**はその問題を選択的に抽象化した概念体系、**ドメインオブジェクトモデル**はその概念体系をコードとして実装したもの、そして **ドメインオブジェクト**はその実装内の個々のオブジェクトである。

そして、これらの概念をフロントエンドで実践するとは、単にフォルダを分けることではなく、**何層もの境界を意識的に判断すること**である。「これはビジネスルールか、プレゼンテーションロジックか？」「このデータはドメインの状態か、UIの状態か？」「この関数は十分に凝集しているか？」。こうした問いを習慣的に投げかけるだけでも、コードの構造は自然と改善される。

もちろん、すべてのプロジェクトでClean Architectureの層をすべてそろえる必要はない。単純なCRUDアプリを4層に分け、すべてのドメインにFactoryパターンを適用するのは、本末転倒である。Classの優れた凝集性と関数型の実用的な柔軟性のどちらを選ぶかは、プロジェクトの複雑さとチームのコンテキストによって決まる。

唯一の正解はない。しかし少なくとも、**「ドメインが何かを知らずにコードを書くこと」** と **「ドメインを認識し、境界を判断し、意識的に分離すること」** の間には明確な違いがある。この記事を読んだ方にも、自分のプロジェクトで「ここでのドメインは何だろう。そして、このコードはどこに置くべきだろう？」と一度問いかけてみてほしい。


### 参考資料

:::ref
- [article] [Eric Evans, Domain-Driven Design (Book)](https://www.amazon.com/Domain-Driven-Design-Tackling-Complexity-Software/dp/0321125215)
- [article] [Robert C. Martin, Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [article] [Khalil Stemmler, Does DDD Belong on the Frontend?](https://khalilstemmler.com/articles/typescript-domain-driven-design/ddd-frontend/)
- [article] [Alex Bespoyasov, Clean Architecture on Frontend](https://bespoyasov.me/blog/clean-architecture-on-frontend/)
- [article] [토스, E2E 자동화 여정](https://toss.tech/article/income-qa-e2e-automation)
:::
