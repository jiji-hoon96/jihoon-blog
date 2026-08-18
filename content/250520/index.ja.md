---
emoji: ⚛️
title: 'React Fiber完全攻略'
seoTitle: 'React Fiber完全攻略 — アーキテクチャとConcurrent Renderingの仕組みを徹底分析'
date: '2025-05-20'
categories: 프론트엔드 React
description: "React Fiberアーキテクチャを、Stack ReconcilerからLane優先度、ダブルバッファリング、MessageChannel Scheduler、Concurrent Featuresまで、Reactのソースコードを基に深く分析する。フロントエンド面接の頻出テーマ。"
keywords: "React Fiber, React Fiberアーキテクチャ, Stack Reconciler, Concurrent Mode, React 18 concurrency, useTransition, useDeferredValue, Suspense, Reactレンダリングの仕組み, Reactソースコード解析, Virtual DOM, Reconciliation, Lane優先度, フロントエンド面接"
locale: ja
translationOf: '250520'
sourceHash: da152b27d26e4621cb1e554cd3d68e531f794e86f395ef9ee35e851f1f0aeff8
---

今回は、Reactの心臓部ともいえる**Fiberアーキテクチャ**について話したい。

筆者が初めてReactに触れた頃、**「Fiber」**という言葉は、面接の定番質問くらいにしか認識していなかった。「Reactのレンダリング処理を作業単位に分割して実行する」という一行の定義を覚え、それがすべてだと思っていた。しかし実際にReactのソースコードを読み始めると、Fiberは単なる概念ではなく、Reactレンダリングの**すべて**を司るruntime architectureだと気づいた。

> 初めてReactのソースコードを開いたときの衝撃は、今でも忘れられない。「これは……いったい何なんだ？」と思った。

この記事では、「Fiberとは何ですか？」という質問に「作業単位に分けて処理するものです」と答えるレベルを超えて、Fiberが**なぜ**誕生し、**どのように**設計され、その構造がReactのConcurrent Featuresを**どのように**可能にしているのかまで、深く掘り下げていく。


## なぜFiberは登場したのか？

この問いに答えるには、まずFiber以前の世界、つまりReact 15まで使われていた**Stack Reconciler**がどのような問題を抱えていたのかを理解する必要がある。

Stack Reconcilerは、その名のとおり**再帰（recursive）呼び出しベース**のreconciliation engineだった。component treeを上から下へ再帰的に走査し、一度レンダリングを開始すると、tree全体を最後まで処理しなければ停止できなかった。これは、電話中に相手が話し終わるまで絶対に切れないような状況だ。（相手が3時間にわたる人生相談を始めたのに、途中で切れないと考えてみてほしい。恐ろしい。）

Stack Reconcilerには、具体的に次のような限界があった。

- **レンダリング中に中断できない**：tree全体を一度に処理する必要があるため、複雑なUIではmain threadが数十〜数百ミリ秒にわたって占有された
- **優先度という概念がない**：ユーザーがボタンをクリックしても、background dataが更新されても、すべてのupdateが同じ方法で処理された
- **animationやgestureへの対応が難しい**：60fpsを維持するには1 frameあたり約16ms以内にすべての作業を終える必要があるが、再帰的レンダリングではそれを保証できなかった
- **error発生時にアプリ全体が停止する**：component treeのどこかでerrorが発生すると、アプリ全体が止まる問題があった

こうした限界を克服するため、Reactチームは作業を**分割**し、**優先度を付け**、必要に応じて**中断・再開**できる新しい実行モデルを検討した。その成果が、まさに**React Fiber**である。

Andrew Clarkが執筆した[react-fiber-architecture](https://github.com/acdlite/react-fiber-architecture)には、この設計の核心となる思想がまとめられており、Fiberを理解するうえで最も重要な参考資料だ。（この文書を書いて間もなくReactチームに加わったようだ。）


## Stack vs Fiber

では、Stack ReconcilerとFiber Reconcilerは、code levelでどのように異なるのだろうか？

### 再帰ベースのStack Reconciler

```jsx
function renderComponent(component) {
  const element = component.render();
  element.props.children.forEach(child => renderComponent(child)); // 재귀 호출
}
```

Stack方式では、子componentに出会うと**即座に再帰呼び出し**へ入る。この方式の問題は、JavaScriptのcall stackに直接依存している点だ。再帰呼び出しが深くなるほどcall stackにframeが積まれ、そのすべてが解消されるまで、browserのmain threadはほかの処理を実行できない。

簡単にいえば、call stackが空になるまでbrowserは**身動きすら取れない**状態になる。

<video width="640" height="480" controls>
  <source src="/content/250520/stack.mov" type="video/mp4">
</video>

上の動画では、Stack Reconcilerがレンダリングしている間、main threadが完全にblockingされる様子を確認できる。


### 反復ベースのFiber Reconciler

Fiberは再帰を**反復（iterative loop）**に置き換えた。call stackの代わりに、独自の**virtual stack**をmemory上に実装したのである。各Fiber nodeが一つの「stack frame」となり、これらのnodeはJavaScript object（heap memory）として存在するため、いつでも中断し、後から続きを再開できる。

```jsx
function performWork(deadline) {
  while (nextUnitOfWork && deadline.timeRemaining() > 5) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
  }
  requestIdleCallback(performWork); // 나눠서 실행
}
```

上のcodeは、Fiber初期の概念モデルを示している。重要なのは、`while` loop内で一度に一つの作業単位（unit of work）だけを処理し、時間が足りなくなればloopを抜けてbrowserに制御を返す点だ。

（初期には`requestIdleCallback`を使う方式だったが、実際のReactはこれを使っていない。その理由は後で詳しく扱う。）

<video width="640" height="480" controls>
  <source src="/content/250520/fiber.mov" type="video/mp4">
</video>

Fiber方式では、レンダリング中でもユーザーイベント（ボタンクリック、入力など）にすぐ反応できる。作業を細かく分割して実行するため、browserが息をつく余地が生まれる。

二つの方式の違いを直接体験したければ、**<a href="https://animated-lollipop-2b6cbb.netlify.app/" target="_blank" rel="noopener noreferrer">こちら</a>**をクリックしてほしい。Stack ReconcilerとFiber Reconcilerの動作の違いを目で確認できる。

これこそ、Andrew Clarkが文書で強調したFiberの主要な目標だ。

- **作業を一時停止し、後から戻ってこられる**
- **異なる種類の作業に優先度を付けられる**
- **以前に完了した作業を再利用できる**
- **不要になった作業を中止できる**


## Fiber Nodeの内部構造

ここまで読むと、一つの疑問が自然に浮かぶ。「では、Fiber nodeの内部はどうなっているのか？」

Reactチームは、Fiberの内部実装に関する公式文書を別途提供していない。しかし、Andrew Clarkのreact-fiber-architecture文書と、実際のReactソースコード（`ReactFiber.js`）からその構造を把握できる。

筆者はFiber nodeを**作業指示書（Work Order）**にたとえたい。工場で製品を組み立てるとき、各作業指示書には「この部品はどの種類か」「どの材料を使うか」「次にどの作業を行うか」「優先度はどれくらいか」が書かれている。Fiber nodeも同じだ。


### ReactElementとFiberNode

Fiberを理解するには、まず**ReactElement**と**FiberNode**を区別しなければならない。この二つはよく混同されるが、まったく別のものだ。

```ts
// ReactElement — React.createElement()가 반환하는 가벼운 객체
export interface ReactElement {
  type: string | Function; // 문자열(HTML 태그) 또는 함수(컴포넌트)
  props: {
    [key: string]: any;
    children: ReactElement[];
  };
  key: string | null;
  ref: any;
  _owner: FiberNode | null;
}
```

ReactElementはUIの**設計図**にすぎない。「このcomponentをこのpropsでレンダリングしてほしい」という依頼書であり、実際のrendering logicやstateは含まれていない。

一方、**FiberNode**は、この設計図を基にReactが内部で生成する**runtimeの作業単位**だ。ReactElementにはない`tag`、`stateNode`、`child/sibling/return`、`memoizedState`、`updateQueue`、`lanes`といったfieldがここに存在する。

ReactがReactElementの`type`を見てFiberNodeを生成するとき、**tag**の値が決まる。

- `type`がfunctionで`prototype.isReactComponent`を持つ場合 → `tag = ClassComponent(1)`
- `type`がfunctionの場合 → `tag = FunctionComponent(0)`
- `type`がstring（`"div"`など）の場合 → `tag = HostComponent(5)`


**tag**はFiberNodeの種類を表す数値定数だ。`ReactWorkTags.js`で定義されており、`FunctionComponent(0)`、`ClassComponent(1)`、`HostRoot(3)`、`HostComponent(5)`、`HostText(6)`など、25種類以上のtagが存在する。Reactはこのtag値を基に、`beginWork`でどの処理ロジックを実行するかを決定する。


**type**はreconciliationで中心的な役割を果たす。Reactが前回のレンダリングのFiberと新しいelementを比較するとき、**最初に確認するもの**がtypeだ。（この値はReactElementからFiberNodeへそのまま渡される。）

- 前回も`div`で今回も`div`なら、ReactはそのFiber nodeを**再利用**し、propsだけを更新する
- 前回は`div`だったものが今回は`span`に変わったなら、Reactは既存のFiberを**破棄**し、新しいFiberを生成する

**key**もReactElementからFiberNodeへ渡される値で、主にlist（配列）のレンダリング時に使われる。keyがないと、list itemの順序が変わったときに、どのitemがどこへ移動したのかをReactが正確に判断できない。その結果、不要なDOM操作が発生したり、componentの内部stateが意図せず維持または失われたりする可能性がある。


### child, sibling, return

React Fiberが再帰ではなく反復を使える秘密が、ここにある。

```js
function 부모() {
  return [<자식1/>, <자식2/>];
}
```

**child**は、componentのrenderが返した**最初の**子elementを指す。上の例では`<자식1/>`だ。**sibling**は、同じ親を持つ**次の兄弟**elementを意味する。`<자식1/>`のsiblingは`<자식2/>`である。**return**は、現在のFiber nodeの処理が終わった後に**戻る親**Fiberを指す。`<자식1/>`と`<자식2/>`のreturnは、どちらも`부모`だ。

この三つのfieldが作る構造は、**単方向linked list形式のtree**だ。一般的なtree構造では子の配列（`children[]`）を持たせるほうが直感的だが、Fiberは意図的にそれを避けた。

なぜだろうか。配列ベースの子構造では、走査のためにindexを管理する必要があり、途中で中断して再開するときには「どこまで処理したか」を別途追跡しなければならない。一方、linked list構造では、現在のnodeへの参照さえ覚えておけば、いつでも続きから走査できる。これがFiberの**中断と再開**を自然に支える構造的基盤である。

Reactはこの構造を基に、深さ優先探索（DFS）の順序でnodeを走査する。`child`に沿って下り（beginWork）、leaf nodeに到達したら`sibling`を確認し、兄弟がなければ`return`に沿って上る（completeWork）方式だ。


### pendingPropsとmemoizedProps

**pendingProps**は、そのFiberが処理を開始する時点で渡された**新しいprops**を意味し、**memoizedProps**は、前回のレンダリングで処理が完了した**以前のprops**を表す。

この二つの値が同じなら、Reactは「このcomponentには変更がない」と判断し、前回のレンダリング結果をそのまま再利用できる。これが**bailout最適化**の中心的な仕組みだ。

同様に、**memoizedState**はそのFiberのhook stateを保存し、**updateQueue**はまだ処理されていないstate update（setState呼び出し）をlinked listとして管理する。


### stateNode

**stateNode**は、Fiber nodeが指す**実際のinstance**を参照する。

- **HostComponent**（div、spanなど）の場合：実際のDOM node
- **ClassComponent**の場合：class instance
- **HostRoot**の場合：FiberRoot object

このfieldは、Fiberの仮想世界とbrowserの実際のDOMをつなぐ橋の役割を果たす。


## ダブルバッファリング：current treeとworkInProgress tree

Fiberを理解するうえで欠かせない重要な概念が、**ダブルバッファリング（Double Buffering）**だ。

この概念を理解するために、game graphicsを思い浮かべてみよう。gameで画面を描くとき、現在の画面にpixelを直接描くと、描画途中のframeがユーザーに見えてしまう**tearing**が発生する。これを防ぐため、game engineは**二つのbuffer**を使う。一方のbufferに次のframeを完全に描き、完成した時点で画面に表示するbufferを一度に切り替えるのだ。

React Fiberもまったく同じ戦略を使う。

```js
currentFiber.alternate === workInProgressFiber;
workInProgressFiber.alternate === currentFiber;
```

**current tree**は、現在画面に反映されているFiber treeである。ユーザーが見ているUIの状態を表し、**workInProgress tree**は次のレンダリングに向けてbackgroundで準備中のFiber treeを表す。

二つのtreeは`alternate` propertyで相互に参照する。すべての変更作業はworkInProgress treeで行われ、作業が完了すると`root.current = finishedWork`という一行でtreeが切り替わる。以前のworkInProgressが新しいcurrentになり、以前のcurrentは次のレンダリングでworkInProgressとして再利用される。

```js
function createWorkInProgress(current, pendingProps) {
  let workInProgress = current.alternate;
  if (workInProgress === null) {
    // 최초 렌더: 새 Fiber를 생성하고 alternate를 연결
    workInProgress = createFiber(current.tag, pendingProps, current.key, current.mode);
    workInProgress.stateNode = current.stateNode; // DOM 노드는 공유!
    workInProgress.alternate = current;
    current.alternate = workInProgress;
  } else {
    // 재렌더: 기존 alternate를 재사용, effect만 초기화
    workInProgress.pendingProps = pendingProps;
    workInProgress.flags = NoFlags;
    workInProgress.subtreeFlags = NoFlags;
    workInProgress.deletions = null;
  }
  // lanes, child, memoizedState 등을 복사
  workInProgress.childLanes = current.childLanes;
  workInProgress.child = current.child;
  // ...
}
```

ここで重要な点を押さえよう。`stateNode`（実際のDOM node）はcurrentとworkInProgressの間で**共有**される。毎回Fiber objectを新しく作るのではなく、既存のalternateを再利用し、変更されたfieldだけを更新する。これにより、レンダリングのたびにgarbage collection（GC）の負荷を増やすことなく、効率よくtreeを構築できる。

propsやstateに変更がなければどうなるだろうか。そのsubtree全体を飛ばす**bailout最適化**が可能になる。gameのダブルバッファリングがframe単位の最適化なら、Fiberのダブルバッファリングは**component単位の最適化**まで可能にする。


## pendingWorkPriority => Lanes

ではFiberは、どのようにして「この作業のほうが重要だ」と判断するのだろうか？

### expirationTimeの限界

初期のFiberは`pendingWorkPriority`という数値ベースの優先度を使い、その後、`expirationTime`という単一の数値へ発展した。期限が近いほど優先度が高いことを意味したが、この方式には根本的な限界があった。

単一の数値では、「このupdateはA groupに属し、あのupdateはB groupに属する」といった**柔軟な分類ができなかった**からだ。たとえばユーザー入力とTransition updateが同時に発生した場合、expirationTimeベースではrange比較でしか分類できず、特定のupdateだけを選択的に処理することに限界があった。

### Lane

この問題を解決するため、Andrew Clarkが[PR #18796](https://github.com/facebook/react/pull/18796)で導入したのが**Lane system**だ。

Laneを理解するために、**高速道路**を思い浮かべてみよう。高速道路には複数のlaneがあり、それぞれ用途が異なる。第1laneは追い越し用（緊急）、第2laneは通常走行用、路肩は非常用だ。各車両（update）は性質に合ったlaneへ割り当てられ、高速道路の管理system（scheduler）が、どのlaneの車両を先に通すかを決定する。

ReactのLaneも同じだ。各updateに**一つのbit（lane）**を割り当て、bit演算でgroupを作成し比較する。

```js
// 각 업데이트는 하나의 lane(단일 비트)을 가진다
const SyncLane =             /*  */ 0b0000000000000000000000000000010;
const InputContinuousLane =  /*  */ 0b0000000000000000000000000001000;
const DefaultLane =          /*  */ 0b0000000000000000000000000100000;
const TransitionLane1 =      /*  */ 0b0000000000000000000000100000000;
const IdleLane =             /*  */ 0b0001000000000000000000000000000;

// 배치(batch)는 여러 비트의 OR 조합이다
const SyncUpdateLanes = SyncLane | InputContinuousLane | DefaultLane;

// 특정 lane이 batch에 포함되는지 확인은 단순 비트 연산
const isIncluded = (lane & lanes) !== 0;
```

合計31個のlaneが31-bit整数に収まるよう設計されている。これはV8 engineの**SMI（Small Integer）**最適化を活用するためだ。31-bit以下の整数はV8でpointer taggingとして処理され、heap allocationなしにstack上で直接演算できる。主要なlaneの優先度は、**bitが低いほど高い**。

この構造により、Reactは一度のbit演算で、どの作業を先に処理するかを判断できるようになった。`getNextLanes()` functionは`pendingLanes`から最も優先度の高いlane groupを選び、suspended laneを飛ばし、dataを受信したpinged laneを優先的に再試行するなど、高度なschedulingを可能にしている。

さらに、**starvation防止**のため、各laneにはexpiration timeが設定される。Sync/InputContinuousは250ms、Transitionは5,000msが経過すると`expiredLanes`へ追加され、同期的に強制処理される。どれだけ優先度が低くても、永遠に無視されることはない。（優先度が低いというだけで永遠に無視されるなら、それは優先度systemではなく差別systemだ。）


## Fiberのoutput

ここまでFiberの構造を見てきたところで、新たな疑問が生まれる。これらのFiber nodeは、どのように**実際のDOM**へ変換されるのだろうか？

outputとは、実際のDOMへ適用できる具体的なDOM node情報を意味する。ここには重要な区別がある。

```jsx
// 사용자 정의 컴포넌트 — output 없음
function 아바타() {
  return <img src="profile.jpg" />;
}

// 호스트 컴포넌트 — output 생성
<img src="profile.jpg" />
<div className="프로필" />
```

実際のDOM nodeを生成するのは、**host component**（div、span、imgなど）だけだ。browserは`<아바타/>`が何なのか理解できない。user-defined componentは抽象化された概念なので、最終的にhost componentへ分解されて初めてbrowserが理解できる。

この過程をもう少し具体的に見てみよう。

```jsx
function 프로필() {
  return (
    <div className="프로필">
      <아바타 />
      <유저정보 />
    </div>
  );
}

function 아바타() {
  return <img src="profile.jpg" alt="프로필" />;
}

function 유저정보() {
  return (
    <div>
      <h2>홍길동</h2>
      <p>개발자</p>
    </div>
  );
}
```

これらのcomponentが作るFiber treeとoutputの関係は、次のとおりだ。

```
프로필 (출력: 없음, 컴포넌트 함수)
  │
  └─► div.프로필 (출력: <div class="프로필">...</div>)
       │
       ├─► 아바타 (출력: 없음, 컴포넌트 함수)
       │    │
       │    └─► img (출력: <img src="profile.jpg" alt="프로필">)
       │
       └─► 유저정보 (출력: 없음, 컴포넌트 함수)
            │
            └─► div (출력: <div>...</div>)
                 │
                 ├─► h2 (출력: <h2>홍길동</h2>)
                 │
                 └─► p (출력: <p>개발자</p>)
```

outputの収集は**下から上へ**進む。まずleaf（host）nodeでDOMが生成される。

```js
// 호스트 컴포넌트들이 실제 DOM 정보 생성
img_fiber.output = createDOMElement('img', {
  src: 'profile.jpg',
  alt: '프로필'
});

h2_fiber.output = createDOMElement('h2', {}, '홍길동');
p_fiber.output = createDOMElement('p', {}, '개발자');
```

次に、親のhost componentが子のoutputを収集する。

```js
// div 노드가 자식들의 출력을 수집
유저정보_div_fiber.output = createDOMElement('div', {}, [
  h2_fiber.output,  // <h2>홍길동</h2>
  p_fiber.output    // <p>개발자</p>
]);

// 최상위 div가 모든 자식 출력을 수집
프로필_div_fiber.output = createDOMElement('div', {className: '프로필'}, [
  img_fiber.output,           // <img src="profile.jpg" alt="프로필">
  유저정보_div_fiber.output   // <div><h2>홍길동</h2><p>개발자</p></div>
]);
```

最後に、user-defined componentは子のoutputをそのまま上へ渡す。

```js
// 사용자 정의 컴포넌트는 자식의 출력을 위로 전달
아바타_fiber.output = img_fiber.output;
유저정보_fiber.output = 유저정보_div_fiber.output;
프로필_fiber.output = 프로필_div_fiber.output;
```


## Fiberのscheduling

Fiberの主要な価値が「作業を分割できること」なら、実際にその「分割」を行う場所はどこだろうか。それが**Work Loop**だ。

### Work Loop：Fiber走査の心臓部

Reactのレンダリングは、`ReactFiberWorkLoop.js`で定義されたWork Loopから始まる。Reactは状況に応じて二種類のWork Loopを使う。

```js
// 동기 렌더링: 중단 없이 모든 Fiber를 처리
function workLoopSync() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}

// 동시성 렌더링: 시간 제한 내에서 작업을 나누어 처리
function workLoopConcurrent(nonIdle) {
  if (workInProgress !== null) {
    const yieldAfter = now() + (nonIdle ? 25 : 5);
    do {
      performUnitOfWork(workInProgress);
    } while (workInProgress !== null && now() < yieldAfter);
  }
}
```

二つのfunctionの違いに注目してほしい。`workLoopSync`は`workInProgress`が`null`になるまで**無条件に**回り続ける。一方、`workLoopConcurrent`には**時間制限**があり、時間を超えるとloopを抜ける。

ここで興味深いのは、yield間隔の違いだ。TransitionやRetryのような**non-idle work（ユーザーが知覚できるupdate）**は**25ms**間隔で制御を譲り、**idle work（ユーザーが何もしていないときに処理してもよい低優先度の作業）**は**5ms**間隔で譲る。non-idle workに25msを与える理由は、意図的にanimationを約30fpsに制限し、transition renderingがほかの作業をstarvationさせるのを防ぐためだ。


### performUnitOfWork

`performUnitOfWork`は、一つのFiber nodeを処理するfunctionだ。Fiber走査の核心が、このfunctionに含まれている。

```js
function performUnitOfWork(unitOfWork) {
  const current = unitOfWork.alternate;
  const next = beginWork(current, unitOfWork, renderLanes);
  unitOfWork.memoizedProps = unitOfWork.pendingProps;

  if (next !== null) {
    workInProgress = next;
  } else {
    completeUnitOfWork(unitOfWork);
  }
}
```

`beginWork`は現在のnodeを処理し、最初の子を返す。そして`pendingProps`を`memoizedProps`として確定し、子があればその子へ、なければ`completeUnitOfWork`を呼び出す。


### beginWork

`beginWork`はFiber nodeを上から下へ走査し、各nodeで必要な計算を行うfunctionだ。`ReactFiberBeginWork.js`で定義され、内部ではFiberの`tag`に応じた巨大な**switch文**で分岐する。

```js
function beginWork(current, workInProgress, renderLanes) {
  // bailout 체크: props와 context가 변경되지 않았다면 스킵
  if (current !== null) {
    const oldProps = current.memoizedProps;
    const newProps = workInProgress.pendingProps;
    if (oldProps === newProps && !hasContextChanged()) {
      return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
    }
  }

  switch (workInProgress.tag) {
    case FunctionComponent:
      return updateFunctionComponent(current, workInProgress, ...);
    case ClassComponent:
      return updateClassComponent(current, workInProgress, ...);
    case HostComponent:
      return updateHostComponent(current, workInProgress, ...);
    case SuspenseComponent:
      return updateSuspenseComponent(current, workInProgress, ...);
    // ... 약 25가지 이상의 케이스
  }
}
```

重要なのは、最上部の**bailout check**だ。propsとcontextが以前と同じなら、`bailoutOnAlreadyFinishedWork`でそのsubtree全体を飛ばす。これはReactのperformance optimizationにおいて最も重要なpathの一つだ。

`beginWork`の返り値は、**最初の子Fiber**である。子があればその子が次の`workInProgress`になり、なければ（`null`）`completeUnitOfWork`へ入る。


### completeWork

`completeWork`はleaf nodeから始まり、親方向へ上りながら作業を完了するfunctionだ。

```js
function completeUnitOfWork(unitOfWork) {
  let completedWork = unitOfWork;
  do {
    // 1. completeWork로 현재 노드의 작업 마무리 (DOM 생성 등)
    completeWork(current, completedWork, renderLanes);

    // 2. 형제가 있으면 형제로 이동 (다시 beginWork 시작)
    const siblingFiber = completedWork.sibling;
    if (siblingFiber !== null) {
      workInProgress = siblingFiber;
      return;
    }

    // 3. 형제가 없으면 부모로 올라감
    completedWork = completedWork.return;
    workInProgress = completedWork;
  } while (completedWork !== null);
}
```

`completeWork`で実行される主な作業は次のとおりだ。

- **HostComponentの場合**：実際のDOM nodeを生成（`createInstance`）し、子DOMをappendする。すでにDOMが存在する場合は、変更されたpropsを収集して`updateQueue`へ保存する。
- **`bubbleProperties()`**：子のflagsを`subtreeFlags`へ集約する。この情報は、Commit Phaseでsubtreeをskipする最適化に使われる。

走査をまとめると、次のようになる。**childに沿って下り（beginWork）-> leafで完了した後siblingへ移動 -> 兄弟がなければreturnに沿って上る（completeWork）**。これがFiberの深さ優先探索の順序である。


### requestIdleCallbackを捨てた理由

先ほどFiberの概念モデルでは`requestIdleCallback`を使うcodeを示したが、実際のReactはこれを使っていない。その理由は明確だ。

- **呼び出し頻度が低すぎる**：本当に「idleな時間（browserにすることがない時間）」にしか呼ばれないため、忙しいpageではReactの作業がいつまでも遅延する可能性がある。Dan Abramovも「requestIdleCallback is called too infrequently to be useful for scheduling React work」と述べている。
- **browser compatibilityの問題**：Safariは長い間これを実装しておらず、browserごとに動作も異なっていた。
- **20msの上限**：idle deadlineには上限があり、Reactが求めるレベルの予測可能なtiming制御ができなかった。

次に`requestAnimationFrame`とframe budget推定を組み合わせる方式も試したが、Reactの作業をvsync（monitorが垂直走査を完了する時点に合わせてframe出力を同期する技術）の周期に合わせる必要はないとの判断から、これも廃止された。

### MessageChannel

最終的にReactは**MessageChannel**を選んだ。

```js
if (typeof MessageChannel !== 'undefined') {
  const channel = new MessageChannel();
  channel.port1.onmessage = performWorkUntilDeadline;
  schedulePerformWorkUntilDeadline = () => channel.port2.postMessage(null);
} else {
  schedulePerformWorkUntilDeadline = () => setTimeout(performWorkUntilDeadline, 0);
}
```

なぜ`setTimeout`ではなく`MessageChannel`なのか。HTML specにより、`setTimeout`は5回以上ネストすると**最低4msの遅延**が強制される。一方、`MessageChannel`はこの制限なしに、次のevent loop tickで即座にmacrotaskとして実行される。5ms単位で作業を分割するFiberにとって、4msの人為的な遅延は致命的だからだ。

（5msのうち4msが待ち時間なら、実際に働く時間は1msしかない。これはwork-life balanceではなく、ただのlifeだ。）

ReactのScheduler packageは、内部で**二つのmin-heap（最小heap）**を管理する。

```
timerQueue (대기실)                    taskQueue (실행 대기열)
┌──────────────────┐                  ┌──────────────────┐
│ 아직 시작 시간이     │   startTime      │ 지금 실행 가능한     │
│ 안 된 태스크들       │ ──경과 시──→      │ 태스크들           │
│                  │                  │                  │
│ 정렬: startTime   │                  │ 정렬: expiration  │
│ (빠른 순)          │                  │ Time (임박한 순)   │
└──────────────────┘                  └──────────────────┘
```

**taskQueue**は「今すぐ実行できる」taskのqueueだ。`expirationTime`（= startTime + timeout）が小さいほど、つまり期限が近いほど先に実行される。**timerQueue**は「まだ実行時刻になっていない」taskの待合室だ。現在時刻がstartTimeを超えた瞬間、taskQueueへ移動する。

では、expirationTimeを決めるtimeoutはどのように定まるのだろうか。各updateには、Priority Levelに応じて固有のtimeoutが設定される。

```
우선순위          timeout        만료까지         예시
─────────────────────────────────────────────────────────
Immediate        -1ms          즉시 만료         flushSync
UserBlocking     250ms         0.25초           클릭, 입력
Normal           5,000ms       5초              일반 setState
Low              10,000ms      10초             startTransition
Idle             ~1,073,741,823ms  ~12.4일      오프스크린 렌더링
```

**Immediate**は生成された瞬間に期限切れになる。taskQueueへ入ると同時に最優先で実行されるのだ。（生まれた瞬間に期限切れとは、少し物悲しい運命ではある。）**UserBlocking**の250msは、人が「反応が遅い」と感じる閾値（100〜300ms）に合わせた値だ。クリックして0.25秒以内に反応がなければ、ユーザーは不快に感じる。**Normal**の5秒は余裕があるように見えるが、これは「最悪の場合でも必ず処理する」という保証だ。実際には、先行する作業が終わればすぐに実行される。**Idle**の約12.4日は、事実上無限である。ほかのすべての作業が終わって初めて実行される。（browserを閉じずに12日間使い続けることはほぼないので、無限と考えて差し支えない。）

これらのtimeout値は、同時に**starvation防止**の仕組みでもある。どれほど優先度が低くても、timeoutを過ぎれば期限切れ状態となり、強制的に実行される。高優先度の作業が絶えず入ってきても、低優先度の作業が永遠に無視されることはない。

Schedulerの`shouldYieldToHost()`は、作業開始後の経過時間が`frameInterval`（defaultは**5ms**、`SchedulerFeatureFlags.js`で定義）を超えたか確認し、main threadへ制御を返すかどうかを判断する。


## Render PhaseとCommit Phase

ここまでFiberの構造とschedulingを見てきた。ここで、これらすべてがどのように組み合わさり、実際のUI updateが行われるのか、全体の流れを整理しよう。

Fiberは内部で、**Render Phase**と**Commit Phase**という二つの段階を経る。この分離は、Reactのconcurrency modelを可能にする中心的な設計だ。Fiberの動作フローを直接確認したければ、下の画像をクリックしてほしい。

[![2.png](/content/250520/2.png)](https://storied-centaur-55230f.netlify.app/)



### Render Phase

Render Phaseは、UIに**どのような変更が必要かを計算**する段階だ。この段階では、実際のDOMには何の影響も与えない。そして最も重要な特徴は、**非同期的に中断・再開できる**ことだ。

この段階は、先ほど見た`beginWork`と`completeWork`を中心に動作する。

**beginWork(fiber)**では、各Fiberのtype（FunctionComponent、ClassComponent、HostComponentなど）に応じて適切なlogicを実行する。そして子Fiber nodeを生成し、接続する。propsが以前と同じなら、memoizationを使ってskipできる（bailout）。

**completeWork(fiber)**では、DOM生成処理やeffect情報を準備する。そして`bubbleProperties()`を通じて子のflagsを`subtreeFlags`へ集約し、親方向へ上りながら情報を補完する。

この段階ではDOMを直接変更しないため、いつでも作業を中断し、後から再開しても、不完全なUIがユーザーに表示されることはない。これがConcurrent Modeの基盤である。


### subtreeFlags

Render Phaseでは、各Fiberに必要なside effectが**bit flag**として記録される。`ReactFiberFlags.js`で定義されている主なflagを見てみよう。

- `Placement`：新しいnodeをDOMへ挿入
- `Update`：DOM propertyの更新が必要
- `ChildDeletion`：子nodeの削除が必要
- `Ref`：refの接続・解除が必要
- `Passive`：useEffect callbackの実行が必要
- `Snapshot`：getSnapshotBeforeUpdateを実行
- `Callback`：lifecycle callbackを実行

以前のReact（およそ16まで）では、`firstEffect` -> `nextEffect` -> `lastEffect`でつながるlinked listを使い、side effectを持つFiberだけを集めていた。しかしこの方式には、unmountされたFiberへの参照が残って**memory leak**を起こす問題があり、Suspenseのような新しいpatternを効率的に処理することも難しかった。

React 17からは、このeffect listを削除し、**subtreeFlags方式**へ移行した（[PR #19381](https://github.com/facebook/react/pull/19381)）。`completeWork`の段階で`bubbleProperties()`が子のflagsを親へ集約する。

```js
function bubbleProperties(completedWork) {
  let subtreeFlags = NoFlags;
  let child = completedWork.child;
  while (child !== null) {
    subtreeFlags |= child.subtreeFlags;
    subtreeFlags |= child.flags;
    child = child.sibling;
  }
  completedWork.subtreeFlags |= subtreeFlags;
}
```

この構造の最大の利点は、Commit Phaseで**subtree全体をskip**できることだ。あるFiberが`subtreeFlags & MutationMask === NoFlags`なら、そのsubtreeにはDOM変更が必要なnodeが一つもないため、全体を飛ばせる。以前のlinked list方式では不可能だった最適化である。


### Commit Phase

Commit Phaseは、Render Phaseで計算した変更内容を**実際のDOMへ反映**する段階だ。この段階は**常に同期的**に実行され、一度始まると最後まで中断されない。ユーザーが更新途中のUIを見ることを防ぐためである。

Commit Phaseは内部で、次のような詳細な順序で動作する。

1. **Before Mutation Phase**：`commitBeforeMutationEffects()`
   - DOMが変更される前に、現在のDOM stateを読み取る。`getSnapshotBeforeUpdate` lifecycleはここで実行される。この時点では`current` treeがまだ画面の状態を表しているため、DOMのscroll位置やsizeなどの情報を安全に取得できる。
2. **Mutation Phase**：`commitMutationEffects()`
   - **実際のDOM操作**が行われる段階だ。新しいnodeの挿入、既存nodeの変更、不要なnodeの削除がすべてここで発生する。`componentWillUnmount`もこの時点で実行される。まだ`current`が以前のtreeを指しているため、以前のstateを読めるからだ。
3. **treeの切り替え**：`root.current = finishedWork`
   - ダブルバッファリングの核心だ。workInProgress treeがcurrent treeへ昇格する。この切り替えがMutation後、Layout前に行われる理由は重要だ。`componentWillUnmount`は**以前のtree**を読む必要があるためMutation段階で実行しなければならず、`componentDidMount`/`componentDidUpdate`は**新しいtree**を読む必要があるためLayout段階で実行しなければならない。
4. **Layout Phase**：`commitLayoutEffects()`
   - DOMの変更が完了した後、新しいDOM stateを基にする処理が実行される。
      - `componentDidMount`、`componentDidUpdate`を実行
      - `useLayoutEffect` callbackを実行
      - この時点では`current`がすでに新しいtreeを指しているため、DOMを読むと更新後の値を取得できる
5. **Passive Effects**（非同期）
   - `useEffect`のcleanupとsetupは別途scheduleされ、**非同期的**に実行される。これらはDOM変更に依存しないside effect（data fetching、event subscriptionなど）を処理するため、同期的に実行する必要がない。非同期で処理することで、browserが先に画面を描画できるよう制御を譲る。


## Concurrent FeaturesとFiber

ここまで見てきたFiberのすべての設計（ダブルバッファリング、Laneベースの優先度、中断可能なWork Loop）が、実際にどのようなuser experienceを可能にするのか、React 18以降のConcurrent Featuresを通じて確認してみよう。

### useTransition

`startTransition(() => setState(...))`を呼び出すと、そのupdateには`TransitionLane`が割り当てられる。14個のTransitionLaneがround-robin（順番に一つずつ割り当てる方式）で割り当てられ、衝突を防ぐ。

TransitionLaneはSyncLaneやDefaultLaneより優先度が低いため、ユーザー入力のような緊急updateが入ると、transition renderingを**中断**して緊急updateを先に処理できる。その間、画面には`current` tree（以前の状態）が維持され、transitionはworkInProgress treeでbackground処理される。

ここでダブルバッファリングの価値が光る。中断されたtransition renderingはworkInProgress treeにしか影響せず、ユーザーが見る画面（current tree）はまったく損なわれない。

`isPending` flagは、このtransitionがまだ完了していないことを示し、loading indicatorを表示するなどの処理を可能にする。


### useDeferredValue

`useDeferredValue(value)`は、初回レンダリングでは渡された`value`をそのまま返す。それ以降のレンダリングで現在のrenderが緊急の場合、以前のmemoized valueを返し、TransitionLaneで新しいrenderをscheduleする。遅延されたレンダリングは、Transitionと同じく中断できる。

概念的には`startTransition`と似ているが、updateをdispatchする側ではなく、**値を受け取る側**で適用する点が異なる。検索入力欄のtextはすぐ反映しつつ、検索結果listのレンダリングを遅らせるのが代表的なuse caseだ。


### Suspense

componentが`<Suspense>`内でPromiseをthrowすると、`throwException`がそれをcatchし、そのFiberを`Incomplete`としてmarkする。そして`return` chainを上りながら最も近いSuspense boundaryを探し、そのboundaryがfallback UIを表示するよう切り替える。Promiseがresolveすると、`markRootPinged`で該当laneをpingし、Reactがsuspended subtreeを再びレンダリングする。

Concurrent Modeでは、suspended componentの**sibling nodeを続けてレンダリング**できるため、一つのdata requestがtree全体のレンダリングをblockingしない。これが可能なのは、Fiberのlinked list構造によりsiblingへ自由に移動できるからだ。


### Streaming SSRとSelective Hydration

React 18の`renderToPipeableStream`はSuspense boundaryを活用する。

- **server**：Suspense boundaryがsuspendすると、fallback HTMLを先に送信し、dataの準備ができたら後から`<script>` tagで実際のcontentをstreamingする
- **client（Selective Hydration）**：各Suspense boundaryを**独立して**hydrateできる。ユーザーがまだhydrateされていない領域をクリックすると、`SelectiveHydrationLane`を通じてそのboundaryのhydrationを**優先的に**処理してからeventをdispatchする

これらすべてが可能なのは、各Suspense boundaryが独立してschedule可能なFiber nodeだからだ。結局のところ、Fiberアーキテクチャの「作業を分割し、優先度を付け、中断・再開できる」という中心的な設計が、こうした機能の土台となっている。


## おわりに

この記事の内容を一文でまとめると、**React Fiberは、再帰を反復へ変え、call stackをheapへ移すことで、レンダリングを中断・再開できるようにしたアーキテクチャ**である。

そのために、linked listベースのtree構造、ダブルバッファリング、Laneベースの優先度system、MessageChannelベースのschedulerなど、数多くの精巧な設計が組み合わされている。そしてこれらすべては、最終的に**ユーザーが感じるUIの応答性を最大化すること**という目標へ向かっている。

もちろん、Fiberの内部実装はReactのversionが上がるたびに変化を続けており、この記事で扱った内容も、ある時点のsnapshotにすぎない。しかし、「作業を分割し、優先度を付け、中断し、再開できる」というFiberの中心的な思想は、今後も変わらないと考えている。

この記事を通じて、React Fiberが単なる面接用keywordではなく、Reactのすべての機能を支えるruntime architectureだということが伝われば幸いだ。唯一の正解はないが、読者の皆さんにもソースコードを直接読み、それぞれの理解を築いていってほしい。


## 出典

:::ref
- [repo] [Reactソースコード, ReactFiberWorkLoop.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberWorkLoop.js)
- [repo] [Reactソースコード, ReactFiberBeginWork.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberBeginWork.js)
- [repo] [Reactソースコード, ReactFiberCompleteWork.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberCompleteWork.js)
- [repo] [Reactソースコード, ReactFiberLane.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberLane.js)
- [repo] [Reactソースコード, ReactFiber.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiber.js)
- [repo] [Reactソースコード, Scheduler.js](https://github.com/facebook/react/blob/main/packages/scheduler/src/forks/Scheduler.js)
- [repo] [Issue #7942, Fiber Principles](https://github.com/facebook/react/issues/7942)
- [docs] [React 18 WG, New Suspense SSR Architecture](https://github.com/reactwg/react-18/discussions/37)
- [docs] [React 18 WG, Concurrent Scheduling](https://github.com/reactwg/react-18/discussions/27)
- [docs] [React v18.0 Blog Post](https://react.dev/blog/2022/03/29/react-v18)
:::
