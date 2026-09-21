---
emoji: 🪟
title: 'overlay-kit'
seoTitle: 'overlay-kit、Reactモーダルを宣言的に開くインターフェースとopenAsyncのコア構造'
date: '2026-09-21'
categories: ignore フロントエンド React ライブラリ
description: 'モーダルの開閉をグローバル状態で持っていたコードをawait一行に置き換えて得たものと失ったもの。overlay-kitのイベントとreducer、openAsyncのコアロジックをソースで追い、再オープンの挙動をテストしてドキュメントとのズレまで確認する。'
keywords: 'overlay-kit, Reactモーダル 状態管理, 宣言的インターフェース, openAsync, useOverlay, Promise モーダル, Reactオーバーレイ, nice-modal-react'
locale: ja
translationOf: '260921'
sourceHash: aee64a559fb8a6b52010dd747b1aae985c694053425332601b135523a67ada12
---

今回の記事では、オーバーレイを宣言的に扱うインターフェースについて話してみたい。

筆者は宣言的なコードが好きだ。オーバーレイを表示し、閉じ、その中で非同期処理を行うという一連の振る舞いは、そのオーバーレイ自身が管理するほうがよいと考えている。呼び出す側が `isOpen` を持って切り替える方式は、状態を扱うコードと、その状態が描画されるコンポーネントとを別々の場所に引き離してしまう。

ところが筆者が会社で担当していた画面のモーダルは、まさにその逆だった。開いているかどうかをグローバルストアに持たせ、呼び出し側が開き、呼び出し側が閉じていた。モーダルを閉じるコードも、結果を受け取るコールバックも、呼び出し側が直接書いていた。そのため、これを宣言的な方向へどう移すかを長く考え、結局は自分で作り直した。

その作業をしながら [overlay-kit](https://github.com/toss/overlay-kit) を見てみた。筆者が目指していたインターフェースと近かった。この記事では overlay-kit の宣言的なインターフェースを見ていき、社内のモーダルシステムをどう設計したかを記録しておく。

## 状態として持っていたモーダル

筆者は[状態管理](/260518)についての記事で、モーダルの開閉フラグを最も単純なローカル状態の例として挙げた。ひとつのコンポーネントの中だけで使い、外部が知る必要も知る権利もない状態だと書いた。その見解は今も変わらない。ただし、モーダルが数十種類になり、互いに重なって表示され、結果値を呼び出し側へ返さなければならなくなった瞬間から、その状態はコンポーネントの中にとどまらない。

筆者が引き継いだコードは、開いているモーダルの一覧をグローバルストアに置いていた。社内コードなので、以下の例は構造だけを残して識別子を変えてある。

```tsx
const [openPopup, closePopup] = useModalStore(
  useShallow((state) => [state.openPopup, state.closePopup]),
);

const handleAddNote = useCallback(() => {
  openPopup(PopupType.ADD_NOTE, {
    itemId,
    onClose: () => closePopup(PopupType.ADD_NOTE),
    onSubmit: (note) => {
      closePopup(PopupType.ADD_NOTE);
      saveNote(note);
    },
  });
}, [closePopup, openPopup, itemId]);
```

このコードで気になった箇所は三つある。

**第一に、開く関数をフックから取り出さなければならない。** `openPopup` と `closePopup` はストアから選び取る値なので、コンポーネントの中でしか手に入らない。そのため、モーダルを開くコードはコンポーネントの外へ出られない。APIレスポンスを横取りする場所やルーターガードのように、フックを使えない場所からモーダルを表示したければ、その関数を引数として渡していくしかない。

**第二に、結果がコールバックで返ってくる。** ノートを保存したのか、ユーザーがそのまま閉じたのかを、`onSubmit` と `onClose` という二つの経路で受け取る。モーダルを開いたあとにやることがあれば、その処理はコールバックの中に入る。モーダルを二つ続けて開く必要があれば、コールバックの中にコールバックができる。

**第三に、閉じる責任が呼び出し側にある。** `closePopup(PopupType.ADD_NOTE)` を呼び出し側が呼ぶ。モーダルが自分自身を閉じるのではなく、モーダルを開いた側がその種類を覚えていて閉じる。だから同じ定数がひとつの関数の中に三回出てくる。

三つに共通するのは、モーダルをひとつ表示するために呼び出し側が三種類のコードを書かなければならない、ということだ。開くコード、結果を受け取るコールバック、そして閉じるコードである。

何を表示するかを決めるところまでが呼び出し側の役目だとすれば、ここではその後の仕事まで呼び出し側が抱え込んでいた。とくに `closePopup(PopupType.ADD_NOTE)` は閉じる対象を文字列定数で名指しする。別のモーダルの定数を書いても同じ列挙型なので型検査を通ってしまい、見当違いのモーダルが閉じる。

## 結果を待つインターフェース

では、この三つのうち何を減らせるだろうか。筆者がたどり着いた答えは、モーダルを開くことを関数呼び出しにし、その関数が終了結果を含む Promise を返すようにすることだった。

```tsx
const result = await openModalAsync('ADD_NOTE', { itemId });
if (result.reason !== 'confirmed') return;

await saveNote(result.value);
```

変わったのは三つだ。開く関数がフックではなくモジュール関数になり、コンポーネントの外でも呼べるようになった。結果がコールバックの引数ではなく戻り値になり、後続の処理が呼び出し関数の流れの中に残った。そして閉じる仕事はモーダルコンポーネント自身が担うようになった。

戻り値の型が `Promise<ModalResult<V>>` になったことで、モーダルの終了がひとつの値にまとまった。

Promise は一度しか終わらない。すでに終わった Promise を再び resolve しても何も起きないので、終了理由をその値ひとつにすべて詰め込む必要がある。そこで `reason` を五つに分けた。ユーザーが確定したのか、明示的にキャンセルしたのか、値なしで閉じたのか、同じ種類の新しいモーダルに置き換えられたのか、全体の後片付けで強制終了されたのかである。真偽値ひとつにすると「キャンセル」と「画面ごと片付けられた」が同じ値になってしまうが、後処理が必要な流れではその二つを区別しなければならなかった。

逆に、終わらせなければ呼び出し側は永遠に待つ。コールバックは呼ばなくても何も起きないが、`await` は戻らないまま残る。そのため、モーダルを画面から取り除く経路が増えるたびに、その経路も Promise を終わらせているかを確認する必要があった。置き換えと強制終了がそれぞれ `reason` をひとつずつ持っているのは、そのためである。

## overlay-kit の呼び出し側

toss の overlay-kit の呼び出し側はこうなっている。

```tsx
const confirmed = await overlay.openAsync<boolean>(({ isOpen, close }) => (
  <ConfirmDialog
    open={isOpen}
    onConfirm={() => close(true)}
    onCancel={() => close(false)}
  />
));
```

筆者が良いインターフェースだと思った点は三つある。

**何が開くのかが呼び出し側にある。** 筆者が作ったほうは `'ADD_NOTE'` という文字列キーを渡す。そのキーがどのコンポーネントなのかは registry ファイルが知っている。文字列キーと、そのモーダルを読み込む `import()` 関数を組にしたオブジェクトがひとつ入っているファイルだ。

```tsx
export const modalImporters = {
  ADD_NOTE: () => import('.../add-note-modal'),
  CONFIRM: () => import('.../confirm-modal'),
  // 모달 종류만큼 이어진다
} as const;
```

overlay-kit は JSX をその場に書く。コードを読む人は、このファイルへ移動しなくても何が出るのかが分かる。

**結果の型が呼び出し側で決まる。** `openAsync<boolean>` の型引数がそのまま `close` の引数型であり、`await` の結果型になる。モーダルごとに結果の型を宣言して表に登録する必要がない。

**閉じることと消すことが分かれている。** コントローラーが受け取る props は `overlayId`、`isOpen`、`close`、`unmount` の四つだ。`close` は `isOpen` を `false` にして、コンポーネントはそのまま残す。実際に取り除くのは `unmount` である。[公式ドキュメントのオーバーレイの開閉についての案内](https://overlay-kit.slash.page/ko/docs/guides/introduction)はこう説明している。

> このような違いが生じるのは、`close` を使うときにオーバーレイが閉じるアニメーションを見せるため、メモリに残し続けているからです。

筆者が作ったほうにはこの区別がない。閉じれば一覧からすぐ外れる。つまり閉じるアニメーションをコンポーネントライブラリ側に任せていたということであり、それが可能な画面だけを扱っていたということでもある。

## overlay.open からレンダーまで

インターフェースが気に入ったら、次に気になるのは中身だ。ひとつのモジュール関数が React ツリーの中にコンポーネントを描くには、その間をつなぐ何かが必要になる。

### イベントと reducer

`overlay.open` は状態を変えない。イベントをひとつ飛ばす。

```ts
// packages/src/event.ts
const open = (controller: OverlayControllerComponent, options?: OpenOverlayOptions) => {
  const overlayId = options?.overlayId ?? randomId();
  const componentKey = randomId();
  const dispatchOpenEvent = createEvent('open');

  dispatchOpenEvent({ controller, overlayId, componentKey });
  return overlayId;
};
```

受け取る側は `OverlayProvider` だ。Provider は `useReducer` を持っていて、イベントを購読して reducer に `ADD` を入れる。ここで注意して見るべきなのは、`isOpen` が `false` で入るという点である。

```tsx
// packages/src/context/provider/index.tsx
const [overlayState, overlayDispatch] = useReducer(overlayReducer, {
  current: null,
  overlayOrderList: [],
  overlayData: {},
});

const open: OverlayEvent['open'] = useCallback(({ controller, overlayId, componentKey }) => {
  overlayDispatch({
    type: 'ADD',
    overlay: { id: overlayId, componentKey, isOpen: false, isMounted: false, controller },
  });
}, []);
```

そしてコントローラーがマウントされた次のフレームに `OPEN` を入れて `isOpen` を `true` にする。

```tsx
// packages/src/context/provider/content-overlay-controller.tsx
useEffect(() => {
  requestAnimationFrame(() => {
    overlayDispatch({ type: 'OPEN', overlayId });
  });
}, [overlayDispatch, overlayId]);
```

ここで筆者の予想と違った部分がある。

**状態が React の外にない。** モジュール関数で開く API なのでストアもモジュールレベルにあるだろうと思っていたが、実際には Provider の中の `useReducer` だった。React の外にあるのはイベントバスだけで、それは状態を持たない。オーバーレイは Provider の `children` の隣に兄弟としてレンダーされる。`createPortal` を使わず、`react-dom` を import もしない。

もうひとつ目に留まることがある。呼び出し側から見れば `overlay.open()` の一行だが、その中はイベントを飛ばし、reducer に `ADD` を入れ、一フレーム待ってから `OPEN` をもう一度入れるという順序の決まった手続きだ。宣言的なインターフェースは命令型のコードをなくしたのではなく、境界の内側へ移したのである。

### 開く側と閉じる側

先ほど見た `requestAnimationFrame` と、その前の節で見た `close` と `unmount` の分離は、一見すると別物に見える。実際には同じ制約の両端をそれぞれ塞ぐ仕掛けだ。

その制約とは、CSS トランジションが**開始状態と終了状態の両方を実際にレンダーしないと動かない**ということである。[MDN の CSS トランジションのドキュメント](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_transitions/Using_CSS_transitions)は、DOM に追加したばかりの要素についてこう警告している。

> This is treated as if the initial state had never occurred and the element was always in its final state.

ここで失敗が二つの形で現れる。開くときは開始状態がないので動かず、閉じるときは終了状態が描かれる前に要素が消えるので動かない。

| | 開く側 | 閉じる側 |
|---|---|---|
| 問題 | 開始状態がない | 終了状態を描く前に消える |
| 解法 | 閉じたまま先にマウントし、次のフレームで開く | 開いたまま残して `isOpen` だけ切り、あとで取り除く |
| 仕掛け | `ADD(isOpen: false)`、rAF、`OPEN` | `CLOSE`、アニメーション、`REMOVE` |
| タイミングを知っている側 | ライブラリ | 利用者 |

閉じる側が利用者の担当になる理由は最後の行にある。開く側は一フレームで足りるという定数をライブラリが知っている。閉じる側は、アニメーションが200ミリ秒なのか400ミリ秒なのかをライブラリは知りようがない。

**だから一方は自動で、もう一方は `unmount` という関数として渡される。**

閉じる側が成り立つ根拠は reducer にある。`CLOSE` は `overlayData` の `isOpen` だけを反転させ、`overlayOrderList` には触れない。Provider はその一覧をたどってレンダーするので、一覧に残っているあいだコンポーネントは生きている。`REMOVE` が一覧から外して初めてアンマウントされる。

**ただし rAF が常に必要なわけではない。** react-transition-group は[既定では初回マウントで enter トランジションを実行しない](https://reactcommunity.org/react-transition-group/transition)。`in` がすでに `true` でも飛ばしてしまい、`appear` を有効にする必要がある。overlay-kit の rAF は `isOpen` をマウント後に `false` から `true` へ変えてくれるので、この場合を覆う。

### Promise で包む20行

`openAsync` は別実装ではなく、`open` を包んだ薄い層だ。

```ts
// packages/src/event.ts
const openAsync = async <T>(controller: OverlayAsyncControllerComponent<T>, options?: OpenOverlayOptions) => {
  return new Promise<T>((_resolve, _reject) => {
    open((overlayProps, ...deprecatedLegacyContext) => {
      const close = (param: T) => {
        _resolve(param);
        overlayProps.close();
      };
      const reject = (reason?: unknown) => {
        _reject(reason);
        overlayProps.close();
      };
      const props: OverlayAsyncControllerProps<T> = { ...overlayProps, close, reject };
      return controller(props, ...deprecatedLegacyContext);
    }, options);
  });
};
```

コントローラーに渡る `close` を差し替えているのがすべてだ。もともとの `close` は引数を取らないが、ここでは引数を取って Promise を resolve したあとに元の `close` を呼ぶ。結果の型が呼び出し側で決まる理由もここにある。`T` が `close` の引数型であり、Promise の型でもある。

ただしこの構造には穴がひとつある。resolve は `close` が呼ばれたときにしか起きない。そのため、オーバーレイを `unmount` だけで取り除くと Promise は永遠に pending のまま残る。[issue #169](https://github.com/toss/overlay-kit/issues/169) に挙がっており、解決が必要だと考えているが、まだ issue はオープンのままだ。

resolve のタイミングが `close` だという点は、別の意味も持つ。閉じるアニメーションが終わった時点ではなく、閉じ始める時点だということだ。確認を取って API を呼ぶ流れなら問題ないが、確認を取って次のモーダルを開く流れでは、前のモーダルが消えていくあいだに次のモーダルが上がってくる。

### 設計が一周した場所

設計の過程をたどるためにコミット履歴を追ってみた。そして、この構造が最初からこうだったわけではないと分かった。1.0 は今と同じイベントと reducer の組み合わせだった。1.2.0 で状態をモジュールレベルの外部ストアへ移して `useSyncExternalStore` で読むように変え、1.8.0 で再び reducer に戻した。

戻した理由は [issue #148](https://github.com/toss/overlay-kit/issues/148) に書かれている。

> `useSyncExternalStore` resolves tearing issues, but it doesn't work well with suspense.

オーバーレイの中でデータを取得して suspend すると、同期的な入力に応答している最中にコンポーネントが suspend したという React の警告が出た。外部ストアへ移した本来の目的はフックなしでもオーバーレイの状態を読めるようにすることだったが、意図したとおりには解決できなかったと当時の PR 本文に書かれている。結局、目的はフックで解決され、保存方式だけが元の場所に戻った。

筆者がこの記録から得たのは結論ではなく基準だ。状態を React の外に置けば呼び出し地点は自由になるが、その代わり React のスケジューリングとずれる余地が生まれる。overlay-kit は呼び出し地点だけを外に置き、状態は中に置いた。

## 同じ id で開き直したとき

reducer を読んでいて引っかかった箇所があった。`ADD` の先頭にこんな分岐がある。

```ts
// packages/src/context/reducer.ts
case 'ADD': {
  if (state.overlayData[action.overlay.id] != null && state.overlayData[action.overlay.id].isOpen === false) {
    const overlay = state.overlayData[action.overlay.id];
    if (overlay == null || overlay.isOpen) {
      return state;
    }
    return {
      ...state,
      current: action.overlay.id,
      overlayData: { ...state.overlayData, [action.overlay.id]: { ...overlay, isOpen: true } },
    };
  }
  // ...
```

`overlayId` を指定して開いたオーバーレイを `close` したあと、同じ id で開き直すとこの分岐に入る。ところが戻り値が**既存の `overlay` オブジェクト**をそのまま使っている。

新しく入ってきた `action.overlay` の `controller` はどこにも使われていない。

読んだだけでは確信が持てなかったので、ライブラリのリポジトリを取得してテストを自分で付けてみた。異なる内容を描くコンポーネントを二つ用意し、同じ id で順に開いた。

```tsx
const ControllerA = ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="b">AAA</div> : null);
const ControllerB = ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="b">BBB</div> : null);

overlay.open(ControllerA, { overlayId: 'id-close' });
overlay.close('id-close');
overlay.open(ControllerB, { overlayId: 'id-close' });
```

結果はこうだった。overlay-kit 1.9.0 時点の main ブランチで vitest を使って実行した。

| 手順 | レンダーされたもの |
|---|---|
| A を開いて `close` のあと B で開き直す | `AAA`。B が捨てられる |
| A を開いて `unmount` のあと B で開き直す | `BBB`。正しく置き換わる |
| カウンターを1増やして `close` のあと開き直す | `1`。コンポーネントの状態が保たれる |

三行目はドキュメントが機能として説明している挙動なので予想どおりだ。問題は一行目である。

**`close` だけして同じ id で開き直すと、変更された内容を含む新しい JSX が無視され、以前の画面がそのまま表示される。**

ここでもうひとつ確認した。同じ reducer の後半にはこんなコメントが付いている。

```ts
/**
 * @description Brings the overlay to the front when reopened after closing without unmounting.
 */
overlayOrderList: [...state.overlayOrderList.filter((item) => item !== action.overlay.id), action.overlay.id],
```

閉じたあとに開き直すと最前面へ持ってくる、という説明だ。ところが手前の分岐が先に `return` するため、この行はその状況では実行されない。オーバーレイを二つ重ねて開き、下に敷かれたほうを `close` してから開き直してみたところ、DOM の順序は変わらずそのままだった。

**コメントが説明する挙動と実際が違う。**

ただし、これが画面上ですぐ問題として見えるかどうかは確認していない。テストは DOM の順序までしか見ておらず、多くのダイアログライブラリは独自の z-index やポータルを使うので、DOM の順序がそのまま視覚的な順序になるわけではない。

筆者が作ったほうは同じ状況をオプションとして公開している。同じ種類のモーダルを開き直すとき、既存のものを保つか新しい props で置き換えるかを呼び出し側が選ぶ。置き換えを選べば既存の Promise は `replaced` で終了する。先ほど結果の型を五つに分けた理由のひとつがこれである。

**ここで二つの設計の違いが現れる。** 筆者の方式はモーダルをデータとして扱う。文字列キーと props がストアにあるので、あとから置き換えたり更新したりできる。overlay-kit はモーダルを関数として扱う。コントローラーがクロージャなので、一度保存されると外からその中身を変える方法がない。

## 呼び出し側に JSX を書く代償

では、呼び出し側に JSX を書く方式は文字列キー方式より常に優れているのだろうか。筆者はそうは思わない。支払う代償が三つある。

**コード分割が既定から外れる。** 呼び出し側が JSX を書くということは、呼び出し側がそのコンポーネントを import するということだ。モーダルが重い編集画面で、そのボタンを押すユーザーが少数なら、その重さが一覧画面のバンドルに入る。

コントローラーの中で `React.lazy` は動作する。先ほどのテストと同じやり方で測ってみたところ、`open` の前にはモジュールが読み込まれず、開いたときに `Suspense` の fallback が先に出てから本体がレンダーされた。

```tsx
const Heavy = React.lazy(() => import('./HeavyModal'));

overlay.open(({ isOpen, close }) => isOpen ? (
  <Suspense fallback={<Spinner />}><Heavy onClose={close} /></Suspense>
) : null);
```

つまり違いは可否ではなく既定値だ。

筆者が作ったほうは registry ファイルの値がすべて `import()` 関数なので、コード分割が構造上強制される。overlay-kit は呼び出し側ごとに手で書く必要がある。

**`unmount` を呼ぶ場所を利用者が決めなければならない。** `close` だけ呼んで終えると、オーバーレイの情報がメモリに残る。公式ドキュメントもこの点を警告しながら、デザインシステムごとにどこへ `unmount` を掛けるべきかを個別に案内している。MUI と Mantine には遷移が終わるコールバックがあるのでそこへ掛ければよいが、そうしたコールバックがないライブラリではアニメーションの長さぶんタイマーを置くよう案内している。案内文書がライブラリごとに分かれていること自体が、この決定のコストである。

**オーバーレイが Provider の位置でレンダーされる。** ポータルを使わないので、React Native でも同じコードが動くという利点がある。逆に `OverlayProvider` の下で提供したコンテキストは、オーバーレイの中からは見えない。ルーターやフォームのコンテキストに依存するモーダルを開くときは、この点を先に確認する必要がある。

## 宣言的という言葉の範囲

ここまで書いてきて、ひとつ引っかかることがある。筆者はこのインターフェースを宣言的と呼んで記事を始めたが、`overlay.openAsync(...)` はどう見ても関数呼び出しだ。

まず定義から置いてみよう。[React 公式ドキュメント](https://react.dev/learn/reacting-to-input-with-state)は二つをこう分けている。

> In React, you don't directly manipulate the UI--meaning you don't enable, disable, show, or hide components directly. Instead, you **declare what you want to show,** and React figures out how to update the UI.

同じドキュメントが挙げる比喩のほうが鮮明だ。命令型は車に乗った人に道をひとつずつ伝えることであり、宣言的なほうはタクシーに乗って目的地だけを告げることである。

**宣言的なインターフェースは命令型の手続きをなくすのではなく、境界の反対側へ移してその境界に名前を付けることだ。** 先ほど見た overlay-kit の内部がまさにそうである。呼び出し側は一行なのに、中ではイベントを飛ばして二回 dispatch する手続きが回る。

では、各プロジェクトがこの言葉をどこに使っているのかを見てみよう。overlay-kit のドキュメントは従来の方式を命令型と呼ぶ。そのとき指しているのは、`useState` で開閉フラグを持ち、イベントハンドラーでその値を反転させるコードだ。逆に宣言的と呼んでいるのは、オーバーレイを状態ではなく振る舞いとして扱う側である。toss 技術ブログの[宣言的なコードについての記事](https://toss.tech/article/frontend-declarative-code)は、この言葉をより広く定義している。宣言的なコードとは抽象度が上がったコードであり、オーバーレイを表示する振る舞いを抽象化したフックがその例だというものだ。

そこで筆者はこの言葉をこう狭めて使うことにした。**呼び出し側が閉じるコードを書かないこと。** いつ閉じるか、閉じるあいだ何が残っているかはオーバーレイ側が決め、呼び出し側は何を表示するかと、結果として何を受け取るかだけを書く。

この基準で見れば、`useState` で `isOpen` を持っているコードと、グローバルストアに開いている一覧を置いて呼び出し側が閉じるコードは同じ側にある。保存場所が違うだけで、閉じる文を呼び出し側が書いている点は同じだからだ。

## おわりに

筆者が会社のコードで直したものは、結局のところ保存場所ではなかった。閉じるコードを誰が書くか、だった。

グローバルストアを使っていた時代にも状態はすでにコンポーネントの外にあったが、開閉の文は依然として呼び出し側にあった。`await` 一行に変えて初めて、その文がモーダルの中へ入った。

overlay-kit は同じ場所にたどり着いたうえで、さらに一歩進んだ。何を表示するかまで呼び出し側に書かせたのだ。筆者はそのインターフェースが読みやすいと思う。そして書きながら、その一歩の代償が何なのかも分かった。

**モーダルを関数として扱うか、データとして扱うかの違いだった。** 呼び出し側に JSX を書くとコントローラーはクロージャになり、クロージャは一度保存されると外から中身を変えられない。同じ id で開き直したときに新しい JSX が無視されるのは、その構造から生まれる。文字列キーで扱えばモーダルはストアに収まった値になり、置き換えも更新もコード分割もできるが、呼び出し側は名前しか知らなくなる。

ライブラリを選ぶとき、インターフェースが気に入るという感覚はかなり信頼できる合図だと思う。ただし、その感覚が正確に何を指しているのかを一度は言葉にしてみるべきだ。言葉にしてみなければ、気に入ったのがインターフェースなのか、そのライブラリを使う人たちの評判なのかを区別できない。この記事を読む読者の方々にも、いま使っているライブラリについて一度その作業をしてみることをお勧めしたい。

:::ref
[docs] [overlay-kit 公式ドキュメント](https://overlay-kit.slash.page/)
[repo] [desko27/react-call](https://github.com/desko27/react-call)
:::
