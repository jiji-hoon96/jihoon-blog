---
emoji: 🧱
title: 'React アプリの layer'
seoTitle: 'Reactアプリのレイヤー分割、hookとdomain objectとStrategy'
date: '2026-10-01'
categories: フロントエンド React アーキテクチャ
description: 'Juntao Qiu の React モジュール化の記事に沿って、決済画面を view、model、data に分ける。サンプルリポジトリを実際に動かして見つけた useMemo の無効化と fetch の繰り返し、そしてこの構造をいつ使うかの判断もまとめた。'
keywords: 'React レイヤー分割, React アーキテクチャ, カスタムフック 分離, domain object, Strategy パターン React, Presentation Domain Data layering, React リファクタリング, React 設計 責務分離'
locale: ja
translationOf: '261001'
sourceHash: a471069dd1f6949b51da4ba268781878b3bb9d94f9bf5e928521cd4799ecef3e
---

今回の記事では、React アプリのコードを画面、業務ルール、データアクセスに分ける方法について話してみたい。component 一つに fetch と計算と render が一緒に入っていて、直すたびに全部を読まなければならない開発者のための記事だ。最後まで読めば、hook、pure component、domain object、Strategy、network client をどんなシグナルを見てどの順番で取り出すのか、そしてその構造をそのまま持ち込むとどこで壊れるのかがわかる。

骨組みは、Thoughtworks の Juntao Qiu が 2023 年 2 月に martinfowler.com で連載した [Modularizing React Applications with Established UI Patterns](https://martinfowler.com/articles/modularizing-react-apps.html) だ。原文をそのまま訳さず筆者の言葉で解き直しており、本文の図はすべてこの原文から借りている。その上に、著者の[サンプルリポジトリ](https://github.com/abruzzi/payment-round-up-refactoring)を取得して型チェックとテストを回した結果と、同じ問題を扱った別の資料を付け加えた。

## React は view library

React を初めて学ぶとき最も魅力的な考え方は、UI はデータを DOM に変える純粋関数だというものだ。ある程度は正しい。ところがサーバーにリクエストを送ったりページを遷移したりした瞬間、component はもう純粋ではない。そこにグローバルな state とローカルな state が絡むと、コードはすぐに複雑になる。

著者の答えは視点を変えることだ。「React アプリケーション」という特別な種類のソフトウェアは存在しない。React は UI を描く library であり、計算や業務ルールをどこに置くかは最初から関心の外にある。その上に載っているのはごく普通の JavaScript アプリだ。それなら、デスクトップ GUI の時代から使われてきた設計、特にコードを presentation、domain、data の三つの layer に分ける方法をそのまま使える。

実際のフロントエンドアプリには view 以外にも、router、local storage、いくつかのレベルのキャッシュ、ネットワークリクエスト、外部サービス連携とログイン、セキュリティ、ロギング、パフォーマンス調整がある。これを全部 component と hook に押し込むと、一つのファイルの中で注文状態をリクエストする行の次に文字列の先頭の空白を削る行が来て、その次に別の画面へ遷移する行が来る。読む人は抽象度を何度も切り替えながら前後を行き来しなければならない。

分ける理由は二つにまとめられる。画面は業務ルールより頻繁に変わる。そして二つを切り離しておけば、一度に一つのことだけ考えればよい。二つ目の理由は、Martin Fowler が [PresentationDomainDataLayering](https://martinfowler.com/bliki/PresentationDomainDataLayering.html) でこの区分の最大の利点として挙げたものだ。三つのテーマを比較的別々に考えられるので、注意を向ける範囲が狭まる。

## アプリが育つ五つの段階

著者はリファクタリングに入る前に、アプリが育つにつれて構造がどう変わるかを五枚の図で見せる。重要なのは次の段階へ進むきっかけだ。決まったタイミングではなく、その段階で生じる不便が次の段階を呼び込む。図の色は五枚とも同じ意味だ。黄緑は state を持つ container component、濃い緑は描画だけを担う presentational component、紫は hook、青は domain object、オレンジはネットワークのような infrastructure だ。

最初は component 一つがネットワークリクエスト、state、計算、render をすべて持つ。小さなアプリや使い捨てのプロジェクトならこれで十分で、コードが HTML に近いのでむしろ読みやすい。リストを回して項目を作るコードと外部 component を設定するコードが混ざり、何が起きているのかを読むのに時間がかかり始めたら次の段階へ進む。

![一つの component がネットワークリクエスト、state 管理、domain logic、render をすべて持ち、API を直接呼び出す構造](1.png?w=720)

画面が大きくなると、出力される HTML の形に沿って component を分ける。描画だけの component は切り出されるが、一番上の component にはネットワークリクエスト、レスポンスを画面用の形に変えるコード、サーバーに送るデータを集めるコードがそのまま残る。三つとも UI ではないのに component の中にある。

![描画だけの component は分離されたが、上位の component にネットワークリクエストと domain logic が残っている構造](2.png?w=720)

次に state とその変化を custom hook に切り出す。すると hook の中に、side effect でも state でもない純粋な計算が残る。

![ネットワークリクエストと domain logic は hook に移ったが、hook の中で両者が混ざっている構造](3.png?w=720)

その計算を React と無関係なオブジェクトに切り出すと domain object が生まれる。データ形式の変換、null チェック、代替値がここに来る。オブジェクトが増えると、継承やポリモーフィズムが必要になり始める。

![hook には state だけが残り、domain logic は Domain オブジェクトへ、ネットワークリクエストは Fetcher へ分かれた構造](4.png?w=720)

最後に、UI にも属さず、データがサーバーから来るのか local storage やキャッシュから来るのかも気にしないオブジェクトが見えてきたら、それを別の model layer としてまとめる。

![中央の帯が model layer で、component と hook はその上に、Fetcher や Adaptor のような infrastructure はその下に置かれた構造](5.png?w=720)

図だけでは抽象的だ。この五つの段階を実際のコードで一度たどってみよう。著者が選んだ例は、オンライン注文の決済画面だ。

## 一つの決済画面から出発する

決済手段はサーバーの設定から来て、国ごとに異なる。サーバーが一つでも返せばその末尾に現金払いを付けてデフォルトで選択しておき、一つもなければ何も表示しない。

![注文詳細の下の決済エリアに apple、google、現金払いのラジオボタンがあり、現金払いが選択されている画面](6.png?w=600)

最初のコードはチュートリアルでよく見る形だ。`useEffect` の中で fetch し、レスポンスを画面用の形に変え、現金払いを付け、ラジオボタンのリストを描く。以下は筆者が短くして書き写したものだ。

```tsx
export const Payment = ({ amount }: { amount: number }) => {
  const [paymentMethods, setPaymentMethods] = useState<LocalPaymentMethod[]>([]);

  useEffect(() => {
    fetch(url)
      .then((res) => res.json())
      .then((methods: RemotePaymentMethod[]) => {
        if (methods.length === 0) return setPaymentMethods([]);
        const extended = methods.map((m) => ({ provider: m.name, label: `Pay with ${m.name}` }));
        extended.push({ provider: "cash", label: "Pay in cash" });
        setPaymentMethods(extended);
      });
  }, []);

  return (
    <div>
      {paymentMethods.map((method) => (
        <label key={method.provider}>
          <input type="radio" defaultChecked={method.provider === "cash"} />
          {method.label}
        </label>
      ))}
      <button>${amount}</button>
    </div>
  );
};
```

このサイズなら問題ではない。しかしこの component を直すには、四つのことを一緒に理解する必要がある。ネットワークリクエストをどう始めるか、サーバーのデータを画面が知っている形にどう変えるか、決済手段一つをどう描くか、決済エリア全体をどう描くかだ。コードが大きくなると、読む人はこの四つの間を何度も行き来しなければならない。

## hook と pure component

最初に取り出すのは state と fetch だ。判断のシグナルは単純だ。**render と関係ないコードが component 本体の半分を超えたら** hook に切り出す。`usePaymentMethods` が fetch と変換を受け持ち、component は hook から受け取った配列を描くだけになる。

二つ目はリストを描く JSX だ。**props だけ受け取れば描けるブロックが見えたら** component として切り離す。`PaymentMethods` は決済手段の配列一つだけを受け取る pure component なので、テストも再利用もしやすい。後で選択を知らせる `onSelect` callback が付いても外側の state には触れないので、依然として pure だ。

```tsx
const usePaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState<LocalPaymentMethod[]>([]);
  useEffect(() => { /* 위의 fetch와 변환 */ }, []);
  return { paymentMethods };
};

export const Payment = ({ amount }: { amount: number }) => {
  const { paymentMethods } = usePaymentMethods();
  return (
    <div>
      <PaymentMethods paymentMethods={paymentMethods} />
      <button>${amount}</button>
    </div>
  );
};
```

著者はどちらの作業もリファクタリングカタログの [Extract Function](https://refactoring.com/catalog/extractFunction.html) だと呼ぶ。React では component も関数だからだ。新しい概念を持ち込んだのではなく、関数一つを二つに分けただけだという点が重要だ。

これで終わったように見えるが、まだ二か所残っている。view の中には「現金ならデフォルトで選択」という判定があり、hook の中にはレスポンスを画面用の形に変える無名関数がある。著者は、このように業務ルールが view や hook に漏れ出たものを logic leak と呼ぶ。

## domain object に集めたルール

三つ目のシグナルは、**同じデータに対する判定が view と hook に散らばっているとき**だ。漏れ出た判定と変換を `PaymentMethod` class 一つに集める。このブログの[ドメインモデル](/260418)で扱ったように、ルールをデータのそばに置くということだ。

```ts
class PaymentMethod {
  constructor(private remote: RemotePaymentMethod) {}
  get provider() { return this.remote.name; }
  get label() { return this.provider === "cash" ? "Pay in cash" : `Pay with ${this.provider}`; }
  get isDefaultMethod() { return this.provider === "cash"; }
}

const convertPaymentMethods = (methods: RemotePaymentMethod[]) =>
  methods.length === 0
    ? []
    : [...methods.map((m) => new PaymentMethod(m)), new PaymentMethod({ name: "cash" })];
```

view のラジオボタンは、今度は `defaultChecked={method.isDefaultMethod}` でオブジェクトに問い合わせる。現金払いのデフォルト値も同じ class のインスタンス一つで表現される。サーバーがくれたものとアプリが付け足したものが同じ形になるので、view は両者を区別する必要がない。

![Payment が usePaymentMethods を呼び、hook が PaymentMethod を作り、PaymentMethods は描画だけを担う構造](7.png?w=720)

著者はこの構造の利点として、テストが簡単になることを挙げる。原文はそこで止まっているが、どれだけ簡単になるかはコードで見たほうが早い。以下は筆者が書いたテストだ。React も、レンダラーも、fetch の mock もない。

```ts
test("서버가 준 결제 수단 끝에 현금 결제를 기본값으로 붙인다", () => {
  const methods = convertPaymentMethods([{ name: "apple" }, { name: "google" }]);

  expect(methods.map((m) => m.label)).toEqual(["Pay with apple", "Pay with google", "Pay in cash"]);
  expect(methods.filter((m) => m.isDefaultMethod).map((m) => m.provider)).toEqual(["cash"]);
});

test("서버가 아무것도 주지 않으면 현금 결제도 보여 주지 않는다", () => {
  expect(convertPaymentMethods([])).toEqual([]);
});
```

同じルールを最初のコードで確かめるには、component を render し、fetch を横取りし、ラジオボタンが描かれるまで待たなければならなかった。ルールがオブジェクトとして外に出た瞬間、テストは関数呼び出し一行になる。

もう一つの利点は、新しい要件が来たときに行き先が決まっていることだ。この時点のファイル構成はこうなる。

```text
src
├── components
│   ├── Payment.tsx
│   └── PaymentMethods.tsx
├── hooks
│   └── usePaymentMethods.ts
└── models
    └── PaymentMethod.ts
```

構造が本当に持ちこたえるかは、新しい要件が来てみないとわからない。著者はここで機能をもう一つ加える。

## 寄付機能と state machine としての hook

新しい要件は、注文金額を切り上げてその差額を慈善団体に寄付できるようにすることだ。19.80 ドルの注文なら 0.20 ドルの寄付を尋ね、同意すればボタンに 20 ドルと表示する。

![決済手段の下に 0.2 ドル寄付のチェックボックスが追加された決済画面](8.png?w=600)

著者はわざと、最初は同意の有無の state と計算を決済 component の中に入れる。チェックボックスのマークアップ、文言の分岐、合計の計算が一度に入ってきて、component は再び重くなる。整理する順番は前に見たとおりだ。state と計算は `useRoundUp` hook へ、文言の組み立ては helper 関数へ、チェックボックスのマークアップは `DonationCheckbox` component へ移る。

```ts
export const useRoundUp = (amount: number) => {
  const [agreeToDonate, setAgreeToDonate] = useState(false);

  const { total, tip } = useMemo(() => ({
    total: agreeToDonate ? Math.floor(amount + 1) : amount,
    tip: parseFloat((Math.floor(amount + 1) - amount).toPrecision(10)),
  }), [amount, agreeToDonate]);

  const updateAgreeToDonate = () => setAgreeToDonate((v) => !v);
  return { total, tip, agreeToDonate, updateAgreeToDonate };
};
```

`toPrecision(10)` は、原文が理由を説明していない部分だ。筆者が Node 24 で動かしてみると、`20 - 19.8` は `0.1999999999999993` になった。浮動小数点の誤差を取り除くための仕掛けだ。

著者はこうした hook を「view の背後にある state machine」と捉える。UI からイベントが来ると新しい state を作り、新しい state がまた render を引き起こす。hook は本来、複数の component が logic を共有するために作られたものだが、使う場所が一つでも component を render に集中させてくれるので切り出す価値がある、というのが著者の立場だ。ここに一つ付け加えると、React 公式ドキュメントの [Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks) が指摘するように、custom hook が共有するのは state を扱う logic であって state そのものではない。この state machine は、hook を呼ぶ component ごとに一つずつ別々に生まれる。

整理が終わると、決済 component は hook を二つ呼び、子 component 二つとボタン一つを並べる形になる。機能が一つ増えたのに、決済 component の役割は変わらない。

![Payment の下に useRoundUp と usePaymentMethods の二つの hook、PaymentMethods と DonationCheckbox の二つの子 component が置かれた構造](9.png?w=720)

## 国別ルールと shotgun surgery

次の要件は、国ごとに切り上げ単位を変えることだ。日本は 100 円単位、デンマークは 10 クローネ単位だ。著者は「簡単な修正に見える」と言いながら、国コードを prop で受け取って分岐を入れるやり方をわざと先に見せる。

```tsx
// useRoundUp 안
total: agreeToDonate
  ? countryCode === "JP" ? Math.floor(amount / 100 + 1) * 100 : Math.floor(amount + 1)
  : amount,

// 체크박스 문구 helper 안
const currencySign = countryCode === "JP" ? "¥" : "$";

// 버튼 JSX 안
<button>{countryCode === "JP" ? "¥" : "$"}{total}</button>
```

同じ `countryCode === "JP"` の判定が、hook、helper、ボタンの三か所に一つずつ入った。デンマークを追加すれば三か所すべてを直し直す必要があり、三項演算子で手に負えなくなると国コードから通貨記号を引く表が生まれる。その表も結局あちこちで別々に参照される。一つの変更のために複数のモジュールを同時に直さなければならないこの臭いを、shotgun surgery と呼ぶ。

![国別ルールを表す色の帯が、複数の component や hook、domain object に散らばっている図](10.png?w=720)

この段階が前の三つの段階と違うのは、判断のシグナルがコードではなく**変更要求**から来ることだ。今のコードだけを見れば、三つの分岐は読みにくくない。国を一つ増やすときに何か所直す必要があるかを数えてみて、初めて問題が見える。では、散らばった分岐をどこに集めればよいのか。

## Strategy に集めた国ごとの違い

著者の答えは、国ごとの違いそのものをオブジェクトにすることだ。まず [Extract Class](https://refactoring.com/catalog/extractClass.html) と [Replace Conditional with Polymorphism](https://refactoring.com/catalog/replaceConditionalWithPolymorphism.html) で、interface 一つと国ごとの実装を作る。

```ts
interface PaymentStrategy {
  getRoundUpAmount(amount: number): number;
  getTip(amount: number): number;
}

class PaymentStrategyAU implements PaymentStrategy { /* 1달러 단위 */ }
class PaymentStrategyJP implements PaymentStrategy { /* 100엔 단위 */ }
```

作ってみると、実装ごとに異なるのは通貨記号と切り上げ関数の二つだけで、`getTip` のような残りは同じだ。そこで著者は [Inline Class](https://refactoring.com/catalog/inlineClass.html) で実装を一つの class にまとめ、異なる部分だけをコンストラクタで受け取る。国ごとに subclass を作らずに切り上げアルゴリズムを関数として受け取れるのは、JavaScript では関数が値だからだ。以下はその結果を筆者が短くして書いたものだ。

```ts
class CountryPayment {
  constructor(readonly currencySign: string, private roundUp: (n: number) => number) {}
  getRoundUpAmount(n: number) { return this.roundUp(n); }
  getTip(n: number) { return parseFloat((this.getRoundUpAmount(n) - n).toPrecision(10)); }
}

const japan = new CountryPayment("¥", (n) => Math.floor(n / 100 + 1) * 100);
japan.getRoundUpAmount(3312); // 3400
japan.getTip(3312);           // 88
```

hook と component はもう国を知らない。このオブジェクト一つを受け取って `strategy.getRoundUpAmount(amount)` と `strategy.currencySign` を使うだけだ。国を一つ増やすならオブジェクトを一つ作れば終わりで、直すファイルはない。

![component は PaymentStrategy 一つだけを見ており、国ごとの三つの実装がその背後に集まった構造](11.png?w=720)

interface を経由してからまたまとめ直した過程は、無駄に見えるかもしれない。筆者はこの部分が原文で最も学ぶ価値のあるくだりだと考える。ポリモーフィズムは目的ではなく共通点と相違点を浮かび上がらせる道具であり、違いが関数一つにまで縮んだのが見えたところで class 階層を取り払った。パターンを持ち込むことより、そのパターンをいつ取り払うかのほうが難しい判断だ。

## fetch を hook の外へ

最後に取り出すのは、`usePaymentMethods` の中の fetch と変換だ。hook は React の概念なので view 側に残る。error handling や retry を入れると hook はすぐに膨らみ、別の view library に移れば hook は使えない。一方、普通の関数はどこでも使える。

```ts
const fetchPaymentMethods = async () => {
  const response = await fetch(`${API}/payment-methods?countryCode=AU`);
  return convertPaymentMethods(await response.json());
};

export const usePaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  useEffect(() => {
    fetchPaymentMethods().then(setPaymentMethods);
  }, []);
  return { paymentMethods };
};
```

著者は、この関数が Anti-Corruption Layer あるいは Gateway のように振る舞うと書く。サーバーのレスポンス構造が変わっても、直す場所がこの関数一つで済むという意味だ。ただし二つの名前は同じものではない。Fowler の [Gateway](https://martinfowler.com/articles/gateway-pattern.html) は外部システムへのアクセスを一か所に包むオブジェクトであり、Anti-Corruption Layer は Eric Evans の DDD から来た言葉で、意味体系の異なる外部モデルが自分のモデルを汚染しないよう翻訳する境界だ。この例のサーバーレスポンスは `{ name }` 一つだけで、翻訳すべき意味の違いがほとんどないので、筆者は Gateway のほうが正確な名前だと考える。サーバーが別チーム所有のレガシーで、決済手段の意味そのものが異なる場合に、同じ場所が Anti-Corruption Layer になる。

最終的な構造はこうだ。render は component に、state は hook に、ルールは domain object に、ネットワークリクエストは関数にある。

![Payment と子 component、useRoundUp と usePaymentMethods の hook、PaymentStrategy と PaymentMethod の domain object、Fetcher がそれぞれの枠に置かれた最終構造](12.png?w=720)

著者は、このように分けた結果として五つの利点を挙げる。欠陥のある場所を見つけやすくなる。コードを再利用し組み合わせやすくなる。読みやすくなる。機能を加えても全体が揺らがない。そして domain logic が view を知らないので、view layer だけを差し替えられる。最後の一つについては、著者自身が大半のプロジェクトでは非常にまれなことだと断りを入れている。五つとも測定値はないという点も、あわせて覚えておく価値がある。

ここまでが原文のあらすじだ。ところが、このコードを実際に動かしてみると、記事からは見えなかったものが出てくる。

## サンプルを動かすと見えるもの

筆者は著者のサンプルリポジトリ(コミット 16 件、最終コミット `de186c5`)を取得して、`tsc --noEmit` とテスト 7 件を回した。どちらも通り、原文で定義が抜けていた helper もリポジトリの `src/utils.ts` にあった。ところが構造をのぞいてみると、持ち込む前に知っておくべきことが三つあった。

### render のたびに新しく作られる Strategy

決済 component は Strategy を prop で受け取り、渡されなければデフォルト値を `new` で作る。そして `useRoundUp` はその Strategy を `useMemo` の dependency に入れる。

```tsx
export const Payment = ({
  amount,
  strategy = new PaymentStrategy("$", roundUpToNearestInteger),
}: { amount: number; strategy?: PaymentStrategy }) => {
  const { total, tip } = useRoundUp(amount, strategy); // 안에서 [agreeToDonate, amount, strategy]
  // ...
};
```

JavaScript の default parameter は[呼び出しのたびに評価される](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters)。そして `useMemo` は dependency を `Object.is` で比較する。この二つが重なると、render のたびに新しいインスタンスが生まれ、memo は毎回再計算する。React 18 で同じ構造を四回 render したところ、デフォルト値を使う場合は計算が 4 回、同じインスタンスを渡す場合は 1 回走った。リポジトリの `App.tsx` は `<Payment amount={19.9} />` で Strategy を渡さないので、アプリの実行経路はまさにデフォルト値の側だ。

この例の計算は足し算数回なのでコストはない。問題は構造だ。Strategy を誰がどこで作って渡すのかが記事にもリポジトリにも決まっておらず、テストだけが日本とデンマークのインスタンスを作っている。筆者なら、インスタンスを module レベルの定数に置き、国コードで取り出して渡す。

```ts
const strategies = {
  AU: new CountryPayment("$", (n) => Math.floor(n + 1)),
  JP: new CountryPayment("¥", (n) => Math.floor(n / 100 + 1) * 100),
} as const;

<Payment amount={amount} strategy={strategies[countryCode]} />
```

### リポジトリの fetch には dependency 配列がない

原文のコードの `useEffect` には `[]` があるが、リポジトリの `usePaymentMethods` には最初のコミットから最後のコミットまで dependency 配列がない。配列のない effect は render のたびに再実行される。レスポンスが来ると新しい配列で state を変え、それが render を引き起こし、effect がまた fetch する。`convertPaymentMethods` が毎回新しい配列を返すので止まらない。

fetch をすぐ応答する mock に置き換え、Jest で 300ms の間の呼び出し回数を数えると、四回測って 152、225、231、233 回になった。`[]` を入れれば 1 回だ。リポジトリのテストは画面に文言が出るかどうかしか見ないので、この繰り返しを捕まえられず、すべて通る。原文に沿って打ち込んだ読者にはこの問題はなく、リポジトリをそのまま取得して使う場合にだけ引っかかる。

### 国コードを prop で受け取った瞬間に生じる race

原文のコードの fetch effect にも cleanup がない。React 公式ドキュメントの [Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects) は、effect の中で fetch すると遅れて届いた以前のレスポンスが最新のレスポンスを上書きしうるので、`ignore` フラグで以前のレスポンスを捨てるよう勧めている。原文は mount 時に一度だけ fetch するので、今は問題がない。しかし URL の `countryCode=AU` を prop で受け取った瞬間に dependency が生まれ、race の余地が開く。筆者はこの構造を持ち込むなら、最初からこう書く。

```ts
useEffect(() => {
  let ignore = false;
  fetchPaymentMethods(countryCode).then((methods) => {
    if (!ignore) setPaymentMethods(methods);
  });
  return () => { ignore = true; };
}, [countryCode]);
```

もう一つ付け加えると、原文の切り上げは `Math.floor(amount + 1)` なので、金額がすでに整数ならさらに 1 上がる。20 ドルの注文は 21 ドルになる。原文は 19.80 ドルと 3312 円しか例に挙げていないので、これが意図なのかはわからない。実際のサービスに持ち込むなら、`Math.ceil` と何が違うのかをまず決める必要がある。

## この構造はいつ使うのか

著者自身、分けることは固定のルールではないと言う。小さくまとまった component は一つのファイルに置いたほうが動作を理解しやすく、警戒すべきはファイルが理解できないほど大きくなることだ。Todo アプリやフォーム一つだけのアプリは全部 component に入れても構わず、サンプルはパターンを多く見せるためにわざと複雑にしたと明かしている。ほかの資料も同じ方向の但し書きを付けている。

Fowler は同じ layering の記事で、この区分は比較的小さな単位にだけ使うよう述べている。view、model、data をトップレベルのフォルダにするのは小さなシステムなら構わないが、どれか一つが大きくなりすぎたら、トップレベルをドメイン単位に分け、その中を layer で分けよということだ。前に見た `components/`、`hooks/`、`models/` フォルダを大きなアプリのトップレベル構造としてそのまま持ち込むと、Fowler が避けるよう言った形になる。

Dan Abramov にも似た経緯がある。2015 年に [presentational と container component](https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0) に分けようと提案し、2019 年に冒頭へ、今はそう分けることを勧めないという更新文を付けた。Hooks が同じことを恣意的な区分なしにやってくれるというのが理由で、必要もないのに教条的に強制されるのをあまりにも多く見てきたと付け加えた。原文の hook の抽出は、この更新文が言うやり方に近い。container という名前の component を別に置かず、hook を呼ぶ `Payment` がその役割を兼ねる。

fetch については、React 公式ドキュメントがさらに一歩進む。[You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) は、fetch logic を custom hook に切り出しておけば後でより良い戦略へ移しやすいとしながらも、第一候補としてはフレームワーク組み込みの fetching や TanStack Query のような client cache を勧めている。原文の最終段階のように fetch を普通の関数に切り出しておけば、その関数をそのまま TanStack Query の `queryFn` に渡せて、前の節の race と繰り返し呼び出しは library が引き受ける。筆者は、これが原文が一文でしか触れなかった最も実用的な利点だと見ている。キーと関数を結び付ける方法は [queryKey](/260104) で別に扱った。

まとめると、筆者の判断はこうだ。原文の順番(hook、pure component、domain object、Strategy、network client)はそのまま従う価値がある。段階ごとに、その段階の不便が次の段階の理由になるからだ。ただし最後まで進む必要はなく、今抱えている不便がどの段階のものかを見て、そこで止まればよい。render と無関係なコードが多ければ hook まで、同じ判定が散らばっていれば domain object まで、一つの変更で複数のファイルを直しているなら Strategy までだ。そして Strategy を使うなら、まずインスタンスを作る場所を決め、fetch を effect に置くなら cleanup と dependency から書く。原文が省いたこの二つが、実際に持ち込んだときに真っ先に壊れる場所だった。

正解はないが、この記事を読んでいる読者の皆さんも、自分のコードが今何段階目の不便を抱えているのか一度確かめてみてほしい。

:::ref
- [docs] [Microsoft Azure Architecture Center, Anti-corruption Layer pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer)
- [article] [Juntao Qiu, Headless Component](https://martinfowler.com/articles/headless-component.html)
- [article] [Juntao Qiu, Data Fetching Patterns in Single-Page Applications](https://martinfowler.com/articles/data-fetch-spa.html)
:::
