---
emoji: 🤯
title: 'Zustand、お前は何者で、なぜProviderLessなんだ？'
seoTitle: 'なぜZustandにはProviderがないのか — useSyncExternalStoreに基づく動作原理の分析'
date: '2024-08-18'
categories: 프론트엔드 React
description: "ZustandがProviderなしで状態管理を実現する仕組みを、ソースコード分析を通じて掘り下げる。React Context APIとの違いと、モジュールスコープに基づく設計を見ていこう。"
keywords: "Zustandの仕組み, ZustandにProviderがない理由, React状態管理ライブラリ, Zustandソースコード分析, useSyncExternalStore, React Context API"
locale: ja
translationOf: '240818'
sourceHash: 7e4c03efdbf0b5dead93870b853fa5c987ebfd96bb765663ebb98da138417e85
---

今回の記事では、ZustandがどのようにProviderなしで状態管理を実現しているのかを取り上げる。

筆者はZustandを使いながら、Providerなしで状態を管理することをずっと当たり前に感じていた。ところが、ふと疑問が浮かんだ。Reactエコシステムの大半のライブラリでは、Providerでアプリをラップすることが、ほとんど儀式のように定着している。TanStack React Queryは`QueryClientProvider`でラップしなければ`useQuery`を使えず、tossのoverlay-kitも`OverlayProvider`なしでは`overlay.open()`を呼び出せない。ReactのContext APIも、必ずProviderでコンポーネントツリーをラップする必要がある。それなのに、Zustandはいったいどんな魔法を使って、この手順を不要にしているのだろうか？

気になってZustandのソースコードを直接読み解いてみると、思った以上に興味深い構造が隠れていた。その過程で分かったことを整理してみたい。

<hr>

## Reactでは状態がどのように流れるのか

一般的なReactアプリケーションでは、状態は下図のように動作する。

![3.png](3.png)

コンポーネント内部の状態は、Reactが提供する状態管理フック（`useState`、`useReducer`）を使って管理する。そして、子コンポーネントへの状態の受け渡しはpropsを通じて行われる。ここまでは単純な話だ。

問題は、離れたコンポーネント間で状態を共有しなければならないときに起きる。このときReactが提供する公式の解決策がContext APIだが、これは必ずProviderコンポーネントで配下のツリーをラップしなければならない。

<hr>

### なぜContext APIにはProviderが必要なのか？

この問いに答えるには、Reactの内部動作を少し見る必要がある。

ReactはコンポーネントツリーをFiberという内部データ構造で管理している。各Fiberノードは親子関係で接続されており、Contextの値が変わると、ReactはこのFiberツリーを上から下へ走査し、そのContextを購読しているコンポーネントを探して再レンダリングをトリガーする。

要点はこれだ。**Contextの値の伝播はFiberツリーの構造に依存する。** Providerがツリーのどの位置にあるかによって値が伝わる範囲が決まり、`useContext`を呼び出したコンポーネントは、自身の上位Fiberツリーをさかのぼって最も近いProviderを探す。Providerがなければ？ `createContext`に渡したデフォルト値が使われるだけだ。

つまり、Context APIはReactのレンダリングシステムと密接に結合している。状態の保存、伝播、購読はすべてReactのコンポーネントツリー内部で行われる。

では、Zustandはこの構造をどのように回避しているのだろうか？

<hr>

## ZustandはReactの外側に存在する

![4.png](4.png)

ZustandはFluxパターンに基づいて動作する。クロージャ内部の`state`がStore、ユーザー定義関数がAction、`set`関数がDispatcher、ReactコンポーネントがViewの役割を担う。ここに決定的な違いがある。 

**ZustandのストアはReactコンポーネントツリーの外側、JavaScriptモジュールのスコープ内に存在する。**

コンポーネントツリーの外側という表現は、React内部の状態管理とは異なり、Zustandの状態がReactのFiberツリーとは無関係に独立して存在することを意味する。どのコンポーネントでも`import`さえすればストアにアクセスでき、Providerでアプリをラップする必要はない。（グローバル変数のようにどこからでもアクセスできる一方、クロージャによって適切に保護されているわけだ。）

どうしてこれが可能なのだろうか？ 次のコードを見てみよう。

```typescript
import { create } from 'zustand';

const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
```

このコードで`create`が呼び出されるのは、モジュールがロードされる時点だ。つまり、Reactがレンダリングを始める前に、ストアはすでにメモリ上に存在している。これが**モジュールレベルシングルトン（Module-level Singleton）パターン**だ。

<hr>

### モジュールレベルシングルトンとは？

JavaScriptのESモジュールシステムは、**モジュールを最初の一度だけ評価（evaluate）し、その結果をキャッシュ**する。その後、どこから同じモジュールを`import`しても、新たに実行するのではなく、キャッシュされた同一のオブジェクトを返す。つまり、コンポーネントAで`import { useStore } from './store'`を行っても、コンポーネントBで行っても、両方が**まったく同じストアインスタンス**を参照する。

別途シングルトンクラスを実装したり、グローバル変数（`window.store`）に紐付けたりする必要はない。モジュールシステム自体が、「一度だけ生成され、どこからでも同じインスタンスにアクセスする」というシングルトンの条件を自然に満たしてくれる。Zustandはこの言語レベルの保証をそのまま活用し、別途Providerを用意しなくても、すべてのコンポーネントが1つのストアを共有できるよう設計されている。

ここまで読むと、自然に1つの疑問が浮かぶ。それでは、Zustandの内部は具体的にどうなっているのだろうか？

<hr>

## Zustandの内部構造

[ZustandのGitHubリポジトリ](https://github.com/pmndrs/zustand/tree/main/src)を見ると、コアロジックは驚くほど簡潔だ。大きく2つのファイルが中核を担っており、`vanilla.ts`がストア本体を、`react.ts`がReactとの橋渡しを担当する。

<hr>

### vanilla.ts

[vanilla.ts](https://github.com/pmndrs/zustand/blob/main/src/vanilla.ts)はZustandの心臓部だ。ストアがどのように生成され、状態がどのように管理されるかが、この1ファイルにすべて収められている。より簡単に言えば、クロージャに閉じ込められた状態と、その状態を操作する関数がこのファイルに定義されている。

```typescript
const createStoreImpl: CreateStoreImpl = (createState) => {
  type TState = ReturnType<typeof createState>
  type Listener = (state: TState, prevState: TState) => void
  let state: TState
  const listeners: Set<Listener> = new Set()

  const setState: StoreApi<TState>['setState'] = (partial, replace) => {
    const nextState =
      typeof partial === 'function'
        ? (partial as (state: TState) => TState)(state)
        : partial
    if (!Object.is(nextState, state)) {
      const previousState = state
      state =
        (replace ?? (typeof nextState !== 'object' || nextState === null))
          ? (nextState as TState)
          : Object.assign({}, state, nextState)
      listeners.forEach((listener) => listener(state, previousState))
    }
  }

  const getState: StoreApi<TState>['getState'] = () => state

  const getInitialState: StoreApi<TState>['getInitialState'] = () =>
    initialState

  const subscribe: StoreApi<TState>['subscribe'] = (listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  const api = { setState, getState, getInitialState, subscribe }
  const initialState = (state = createState(setState, getState, api))
  return api as any
}
```

このコードを1行ずつ読み解くと、Zustandの中核メカニズムが見えてくる。

- **クロージャによる状態のカプセル化**

  - `let state: TState`という変数が、`createStoreImpl`関数のローカル変数として宣言されている。この変数は関数の実行終了後も`setState`、`getState`などの内部関数から参照され続けるため、ガベージコレクションされない。これがクロージャの本質だ。

  - 外部から`state`変数へ直接アクセスする方法はない。`getState()`で読み、`setState()`で書くことしかできない。（オブジェクト指向でいうprivateフィールドをクロージャで実装したようなものだ。）

- **`Object.is`を利用した変更検出**

  - `setState`は新しい状態を計算した後、`Object.is(nextState, state)`で既存の状態と比較する。参照が同一なら何も起こらない。これが不要な再レンダリングを防ぐ最初の防衛線だ。

  - ただし、この`Object.is`による比較は**厳密な参照同一性（strict reference equality）**の検査なので、利用側が注意すべき点がある。プリミティブ値（数値や文字列など）を1つだけ取り出して使う場合は問題ない。

    ```typescript
    const count = useStore((state) => state.count);
    ```

    しかし、selectorが**新しいオブジェクトを返す**場合は話が変わる。

    ```typescript
    const { count, name } = useStore((state) => ({
      count: state.count,
      name: state.name,
    }));
    ```

    `{ count, name }`オブジェクトは、値が同じでも呼び出すたびに新しい参照が作られる。`Object.is`は内部のプロパティを比較せず参照だけを比較するため、Zustandから見ると「状態が変わった」と判断され、毎回再レンダリングがトリガーされる。

    この問題を解決するために、Zustandは**`useShallow`**フックを提供している。

    ```typescript
    import { useShallow } from 'zustand/react/shallow';

    const { count, name } = useStore(
      useShallow((state) => ({ count: state.count, name: state.name }))
    );
    ```

    `useShallow`は、返されたオブジェクトの**トップレベルのプロパティを1つずつ比較**し、実際に値が変わった場合にだけ再レンダリングを発生させる。Reduxの`useSelector`がデフォルトでは参照比較を使いながら、`shallowEqual`を第2引数として渡せるのと似た考え方だ。（ただし、`useShallow`は名前どおり「浅い」比較なので、ネストしたオブジェクトの内部までは追跡しないことを覚えておこう。）

- **Pub/Subパターンのリスナーシステム**

  - `const listeners: Set<Listener> = new Set()`という1行が、Zustandの購読システムのすべてだ。状態が変わると、`listeners.forEach`ですべての購読者に通知する。 
  - `subscribe`を呼び出すとリスナーが`Set`に追加され、返された関数を呼び出すと`Set`から削除される。
  - このパターンが重要なのは、**ReactのFiberツリーから完全に独立した通知システム**だからだ。Providerがツリーを走査して購読者を探すのではなく、ストアが購読者の一覧を直接管理する方式なのだ。

- **初期状態の生成**

  - 初期状態を扱う最後の行を見てみよう。

    ```typescript
    const initialState = (state = createState(setState, getState, api))
    ```
    
    1行に多くの処理が凝縮されている。JavaScriptでは、代入演算子（`=`）は**代入された値そのものを返す**式（expression）だ。つまり、括弧内の`state = createState(...)`が先に実行されて`state`へ初期状態が代入され、その戻り値が再び`const initialState`に代入される。結果として、`state`と`initialState`は**同じオブジェクトを参照**する。

    では、なぜ同じ値をわざわざ2つの変数に分けて保持するのだろうか？ 要点は、2つの変数の役割が異なることにある。

    - **`state`** は`let`で宣言された変数だ。`setState`が呼び出されるたびに新しい値へ置き換わる。つまり、**現時点で生きている状態**を表す。
    - **`initialState`** は`const`で宣言された変数だ。ストアが生成された時点の状態が永続的に保持される。その後どのような`setState`が呼び出されても、この値は変わらない。**ストアの最初のスナップショット**というわけだ。

    この`initialState`は`getInitialState()`メソッドを通じて外部へ公開され、`react.ts`で`useSyncExternalStore`の**第3引数（サーバースナップショット）**として渡される。

    ```typescript
    const slice = React.useSyncExternalStore(
      api.subscribe,
      () => selector(api.getState()),       
      () => selector(api.getInitialState()), 
    )
    ```

    サーバーサイドレンダリング（SSR）環境にはブラウザAPIがなく、ユーザーインタラクションもないため、`setState`が呼び出されることはない。そのため、サーバーでは常に`initialState`（= 初期状態）がスナップショットとして使われる。クライアントでhydrationが始まるとき、ReactはサーバーでレンダリングされたHTMLとクライアントの初回レンダリング結果を比較するが、両方が同じ`initialState`を基準にレンダリングしているため、**hydrationの不一致を防ぐ**ことができる。

<hr>

### react.ts

[react.ts](https://github.com/pmndrs/zustand/blob/main/src/react.ts)は、先ほど作成した純粋なJavaScriptストアをReactのレンダリングシステムへ接続する役割を担う。

```typescript
export function useStore<TState, StateSlice>(
  api: ReadonlyStoreApi<TState>,
  selector: (state: TState) => StateSlice = identity as any,
) {
  const slice = React.useSyncExternalStore(
    api.subscribe,
    React.useCallback(() => selector(api.getState()), [api, selector]),
    React.useCallback(() => selector(api.getInitialState()), [api, selector]),
  )
  React.useDebugValue(slice)
  return slice
}
```

ここで中核となるのは`useSyncExternalStore`だ。このフックはReact 18で導入されたもので、**Reactの外部に存在する状態ストアをReactのレンダリングサイクルへ安全に統合**するために設計されている。

`useSyncExternalStore`が受け取る3つの引数を見ると、構造が明確になる。（先ほどvanilla.tsで扱った内容とほぼ同じだ。）

- **`api.subscribe`**：ストアの変更を購読する関数だ。Reactはこの関数を通じて、「状態が変わったら知らせてほしい」と依頼する。
- **`() => selector(api.getState())`**：現在の状態のスナップショットを返す。Reactはレンダリングのたびにこの関数を呼び出し、最新の状態を取得する。
- **`() => selector(api.getInitialState())`**：サーバーサイドレンダリングで使う初期スナップショットだ。hydrationの過程でサーバーとクライアントの状態の不一致を防ぐ。

特に`useSyncExternalStore`は、Reactの並行モード（Concurrent Mode）で起こり得る**tearing問題**を解決する。Tearingとは、同じレンダーパス内で異なるコンポーネントが、**同じデータソースの異なるスナップショット**を表示してしまう現象だ。

具体的なシナリオを見ると理解しやすい。コンポーネントAが`store.value`（= 10）を読み、レンダリングを開始する。このときReactが並行モードでレンダリングを**一時停止（yield）**し、ブラウザへ制御を渡す。その間にWebSocketメッセージが届き、`store.value`が11に変わる。Reactがレンダリングを再開すると、コンポーネントBは`store.value`（= 11）を読む。結果として、同じフレームでAは10、Bは11を表示する**引き裂かれた（teared）UI**が生まれる。React 18より前はレンダリングが常に同期的だったため、この問題は発生しなかった。

`useSyncExternalStore`はレンダリング開始時点のスナップショット（`getSnapshot`）を記録し、レンダリング中に外部ストアが変更されてスナップショットが異なると、それを検出して**レンダリングを最初からやり直す**。これにより、すべてのコンポーネントが同じスナップショットを基にレンダリングされることを保証する。

そして、`createImpl`関数がこれらすべてを1つにまとめる。

```typescript
const createImpl = <T>(createState: StateCreator<T, [], []>) => {
  const api = createStore(createState)
  const useBoundStore: any = (selector?: any) => useStore(api, selector)
  Object.assign(useBoundStore, api)
  return useBoundStore
}
```

`createStore`でvanillaストアを生成し、`useBoundStore`というカスタムフックでラップした後、`Object.assign`でストアAPIのメソッド（`setState`、`getState`、`subscribe`など）をフック関数そのものに取り付ける。その結果、返される`useBoundStore`は**Reactフックであると同時にストアAPIでもある**という二重の性格を持つ。（関数なのにメソッドもある、いかにもJavaScriptらしいパターンだ。）

<hr>

## ほかの状態管理ライブラリはどうだろうか？

ここまで理解すれば、自然とほかのライブラリとも比較したくなるだろう。

Jotai、Recoil、MobX、Xstate、Reduxなど、さまざまな状態管理ライブラリが存在するが、筆者が実際に使ったことのあるライブラリを中心に比較してみたい。

> なお、Jotaiとよく比較されていた**Recoil**（Meta）は、2025年1月にリポジトリがアーカイブされ、事実上開発が停止した。React 19への対応も行われていない。アトミックな状態モデルを求めるなら、現時点ではJotaiが唯一の現実的な選択肢だと言える。

<hr>

### Redux

Reduxも内部ではモジュールレベルのストアを使っている。それでは、なぜProviderが必要なのだろうか？

Reduxの`<Provider store={store}>`は、React Contextを通じてストアインスタンスをコンポーネントツリーへ**注入（inject）**する。`useSelector`や`useDispatch`は、内部で`useContext`を呼び出してProviderが提供するストアへアクセスする構造だ。ここで重要なのは、ReduxがContextを**状態の伝播チャネルではなく、依存性注入（Dependency Injection）の手段**として使っていることだ。Contextを通じて渡されるのは状態値そのものではなく、状態を管理する**ストアオブジェクトへの参照**である。実際の状態の購読と更新は、ストア内部のPub/Subで処理される。

この設計がもたらす利点は明確だ。テスト時に別のストアインスタンスをProviderでラップすれば完全に分離でき、1つのアプリ内で`context` propを使って複数の独立したストアツリーを構成することもできる。Mark Erikson（Reduxメンテナー）が強調するように、「Contextは転送メカニズム（transport mechanism）であり、状態管理ツールではない」。

<hr>

### Jotai

JotaiはReduxやZustandとは根本的に異なる**アトミック（atomic）状態モデル**を採用している。1つの大きなストアオブジェクトに状態を集めるのではなく、**各状態の断片を独立したatomに分割**するアプローチだ。（Jotaiの公式ドキュメントでも、「ZustandがReduxに似ているなら、JotaiはRecoilに似ている」と説明されている。）

この構造の重要な違いは、**レンダリングの最適化方法**にある。Zustandは、1つのストアからselectorを通じて必要な部分だけを抽出する**トップダウン（top-down）**のアプローチだ。開発者が`useStore((state) => state.count)`のようにselectorを直接記述する必要があり、参照同一性（referential equality）を維持するため、場合によってはメモ化が必要になる。一方Jotaiは、atom間の**依存関係グラフ（dependency graph）**を自動的に構築し、特定のatomが変わると、そのatomに依存するコンポーネントだけを正確に再レンダリングする**ボトムアップ（bottom-up）**の伝播を行う。スプレッドシートやキャンバスエディターのように、数十の状態が互いに絡み合う場合、この自動依存関係追跡が大きな力を発揮する。

Providerの観点では、Jotaiは興味深い中間地点に位置する。デフォルトではグローバルストアを使ってProviderなしで動作するが、必要なら`<Provider>`でラップして分離されたストアスコープを作成できる。Jotaiの公式ドキュメントの表現を借りれば、Jotaiは**「context first, module second」**で、Zustandは**「module first, context second」**なのだ。

<hr>

### Zustandの選択

Zustandは最も急進的な選択をした。デフォルトではモジュールレベルのシングルトンであり、Providerがまったく存在しない。この選択がもたらすものは、**きわめてシンプルなAPI**だ。`create`でストアを作り、コンポーネントでフックを呼び出せば終わりだ。

ただし、「Providerがまったく存在しない」という表現は、正確には**デフォルト設計**についての話だ。v4以降は、`createStore`（vanillaストア）とReactの`createContext`を組み合わせて、**スコープ付きストア（Scoped Store）**パターンを実装できる。

[TkDodo（React Queryメンテナー）のブログ](https://tkdodo.eu/blog/zustand-and-react-context)では、このパターンが詳しく扱われており、彼が示す中心的な主張は次のとおりだ。グローバルシングルトンストアには3つの制約がある。

- **Propsで初期化できない**：モジュールのロード時にストアが生成されるため、サーバーから取得したデータや親コンポーネントのpropsを初期値として渡す方法がない。
- **テストの分離が難しい**：テストごとにストアを手動でリセットしなければならない。
- **再利用できない**：同じ構造のストアを必要とするコンポーネントをページに2つレンダリングすると、両者が状態を共有してしまう。

この3つをすべて解決するのが、スコープ付きストアパターンだ。中心となるアイデアは、**Contextで状態値を渡すのではなく、ストアインスタンスへの参照を渡す**ことだ。（ReduxのProviderが行っていることとまったく同じ構造である。）

具体的な実装は次のようになる。

```typescript
import { createStore, useStore } from 'zustand';
import { createContext, useContext, useState } from 'react';

// 1. 스토어 팩토리 함수 — props를 받아 스토어를 생성
const createSelectionStore = (initialItems: string[]) =>
  createStore<SelectionState>((set) => ({
    items: initialItems,
    selected: new Set<string>(),
    toggle: (id) =>
      set((state) => {
        const next = new Set(state.selected);
        next.has(id) ? next.delete(id) : next.add(id);
        return { selected: next };
      }),
  }));

// 2. Context 생성
type SelectionStore = ReturnType<typeof createSelectionStore>;
const SelectionContext = createContext<SelectionStore | null>(null);

// 3. Provider — useState로 스토어를 한 번만 생성
const SelectionProvider = ({
  children,
  initialItems,
}: {
  children: React.ReactNode;
  initialItems: string[];
}) => {
  const [store] = useState(() => createSelectionStore(initialItems));
  return (
    <SelectionContext.Provider value={store}>
      {children}
    </SelectionContext.Provider>
  );
};

// 4. 커스텀 훅 — Context에서 스토어를 꺼내 useStore로 구독
const useSelectionStore = <T,>(selector: (state: SelectionState) => T) => {
  const store = useContext(SelectionContext);
  if (!store) throw new Error('SelectionProvider가 필요합니다');
  return useStore(store, selector);
};
```

これで、同じページに独立したマルチセレクトコンポーネントを必要な数だけレンダリングできる。

```tsx
// 각 SelectionProvider가 자신만의 스토어 인스턴스를 가진다
<SelectionProvider initialItems={['A', 'B', 'C']}>
  <MultiSelect />
</SelectionProvider>

<SelectionProvider initialItems={['X', 'Y', 'Z']}>
  <MultiSelect />  {/* 위 컴포넌트와 상태가 완전히 독립 */}
</SelectionProvider>
```

ここで注目すべきなのは、Contextを通じて渡されるものが**状態値ではなくストアオブジェクト**だという点だ。状態値が変わってもContextの`value`（= ストアへの参照）は変わらないため、**Contextの値の変更による不要な再レンダリングは発生しない。** 実際の再レンダリングは、`useStore`内部の`useSyncExternalStore`がselectorに基づいて処理する。Contextの転送役とZustandの購読役が明確に分離されるのだ。

TkDodoは、デザインシステムのマルチセレクトコンポーネントで、このパターンを実際に適用した事例を紹介している。従来の`useState` + Contextで内部状態を管理する構造は、50個を超える項目でパフォーマンス低下を見せたが、Zustandのselectorベースの購読へ移行することで解決したという。

このパターンは、v3で`zustand/context`として提供されていた`createContext`ヘルパーがv4で削除されて以降、**Reactネイティブの`createContext` + Zustandの`createStore`/`useStore`を直接組み合わせる方法**として定着した。v5でもこのAPIはそのまま維持されており、[Zustand公式ドキュメント](https://github.com/pmndrs/zustand/blob/main/docs/previous-versions/zustand-v3-create-context.md)でもv4+の移行ガイドとしてこのパターンが案内されている。

<hr>

## ProviderLessの影

もちろん、Providerがないことは利点ばかりではない。筆者が考える注意すべき点を整理してみよう。

<hr>

### SSRでの状態共有問題

モジュールレベルシングルトンは、サーバー環境では危険になり得る。Node.jsサーバーは複数のリクエストを1つのプロセスで処理するが、モジュールはプロセス内で一度しかロードされない。これは、異なるユーザーのリクエストが**同じストアインスタンスを共有**する可能性があるということだ。

Zustandが`getInitialState`を提供し、`useSyncExternalStore`の第3引数にサーバースナップショットを渡す理由はここにある。ただし、これだけではリクエスト間の状態分離が完全ではない場合があるため、SSR環境では先に述べたスコープ付きストアパターン（`createStore` + React Context）を使い、リクエストごとに新しいストアを生成することが推奨される。

<hr>

### テスト分離の難しさ

Providerベースのライブラリでは、テストごとに異なるProviderでラップすれば、ストアは自然に分離される。一方、Zustandのモジュールレベルシングルトンでは、テスト間で状態が漏れることがある。各テストの`beforeEach`で、ストアを明示的にリセットしなければならない。（筆者もこの問題で一度苦労したことがある。）

```typescript
// 테스트 파일에서의 스토어 리셋 예시
beforeEach(() => {
  useStore.setState(useStore.getInitialState());
});
```

ここでも、スコープ付きストアパターンが解決策になる。Providerでラップする方法なら、各テストで新しいストアを生成して注入できるため、リセットロジックなしで完全な分離が可能だ。

<hr>

### 複数インスタンスの欠如

1つのアプリケーション内で、同じ構造を持つ独立したストアが2つ必要な場合、Providerパターンなら、それぞれを異なるProviderでラップすればよい。しかし、モジュールレベルシングルトンでは、ストア生成関数を別途呼び出し、異なるストアインスタンスを作る必要がある。たとえば、同じページに独立したタブパネルが2つあり、それぞれの選択状態を個別に管理しなければならない場合、グローバルシングルトンでは自然に表現しづらい。

この場合も、`createStore` + Contextパターンが正解だ。各タブパネルコンポーネントが独自のProviderをレンダリングすれば、同じストア構造を持つ完全に独立したインスタンスが生成される。Zustandの公式ドキュメントでも、「再利用可能なコンポーネントにストアが必要な場合」にこのパターンを推奨している。

## まとめ

ここまで見てきた内容をまとめると、ZustandのProviderLess設計は、次の4つのメカニズムの組み合わせによって実現されている。

- **モジュールレベルシングルトン**：ストアがReactコンポーネントツリーの外側、JavaScriptモジュールのスコープ内に生成される。
- **クロージャによる状態のカプセル化**：`vanilla.ts`の`createStoreImpl`で、`state`変数と`listeners` Setがクロージャに閉じ込められ、外部からのアクセスが遮断される。
- **独自のPub/Subシステム**：Fiberツリーの走査ではなく、`Set<Listener>`を直接管理して、状態の変更を購読者へ通知する。
- **`useSyncExternalStore`によるReact統合**：外部ストアの状態変更をReactのレンダリングサイクルへ安全に同期する。

結局、Zustandが投げかける問いはこうだ。「状態は必ずReactの中に存在しなければならないのか？」Zustandの答えは明確だ。状態はReactの外に置き、必要なときに橋を架ければよい。その橋こそが`useSyncExternalStore`だ。

もちろん、このアプローチがあらゆる状況で最善とは限らない。SSR、テストの分離、複数インスタンスといった状況では、Providerベースの設計の方が適している場合がある。唯一の正解はないが、各ライブラリがどのような設計上のトレードオフを選んだのか理解していれば、状況に合ったツールを選べるだろう。

この記事を読んだ方にも、一度は利用しているライブラリのソースコードを直接開いてみることを勧めたい。公式ドキュメントにはない深みを発見できるはずだ。

<hr>

![7.jpeg](7.jpeg)

### それから、新しい知らせ

上記の内容を調べている中で知ったことだが、**Zustand v5.0.0が2024年10月に正式リリース**された。

興味深いのは、v5には新機能がほとんどないことだ。v4.xですでに新機能を追加しながら既存APIをdeprecatedにしてきており、v5は**整理（cleanup）リリース**としての性格が強い。主な変更点は次のとおりだ。（詳細は**[リリースページ](https://github.com/pmndrs/zustand/releases)**と**[移行ガイド](https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5)**を参照してほしい。）

- 最小要件が**React 18、TypeScript 4.5以上**へ引き上げられた。
- **`getServerState`が削除**された。（`useSyncExternalStore`の第3引数で代替）
- **ES5のサポートが終了**した。
- `create`関数での**カスタムequality関数の指定が削除**された。
- iterableオブジェクトをサポートするように、**`shallow`関数が改善**された。

v4からv5へ移行するときは、まずv4の最新バージョンへ更新することが推奨される。v4の最新バージョンではdeprecation警告が表示されるため、それらを先に解消してからv5へ上げれば、無理なく移行できる。

<hr>

### 参考資料

:::ref
- [docs] [React useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)
- [docs] [Jotai Comparison](https://jotai.org/docs/basics/comparison)
- [article] [InterBolt, Concurrent React, External Stores, and Tearing](https://interbolt.org/blog/react-ui-tearing/)
:::
