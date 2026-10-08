---
emoji: ⏱️
title: "ReactがMessageChannelを使う理由"
seoTitle: "React SchedulerはなぜrequestIdleCallbackではなくMessageChannelを使うのか"
date: "2025-05-15"
updatedAt: "2026-10-08"
categories: フロントエンド React
description: "React SchedulerがrequestIdleCallback、requestAnimationFrame、setTimeoutではなくMessageChannelで作業を予約する理由を、ReactのPR記録とsetTimeoutの4ms遅延のChrome実測から整理する。"
keywords: "requestIdleCallback, MessageChannel, React Scheduler, setTimeout 4ms, Reactスケジューラーの仕組み, shouldYieldToHost, requestAnimationFrame, React Fiber"
locale: ja
translationOf: '250515'
sourceHash: b2240aadc9a34dfdbdb5f30061426c525d49af520ebc5bb3ff62b6991bcf445c
---

今回の記事では、**ReactがrequestIdleCallbackではなくMessageChannelで作業を予約する理由**について話してみたい。

Fiberを学ぶなかで「ブラウザーが暇なときに少しずつ働く」という説明を読んだのに、実際のReactのソースコードでは`MessageChannel`に出会って混乱したフロントエンド開発者に向けた記事である。先に答えを書くと、`requestIdleCallback`はReactが望むほど頻繁には呼ばれず、`setTimeout`はネストすると4msを超える遅延が付く。そのためReactのSchedulerパッケージは、ブラウザーでは人為的な遅延なしに次のマクロタスクを予約できる`MessageChannel`を使う。その4msが実際にどれほど大きいかは、筆者がChromeで直接測った数字で確かめる。


## requestIdleCallbackを捨てた理由

Fiberの概念を説明するときには、`requestIdleCallback`で作業を分けて実行するコードがよく使われる。ブラウザーにやることがないたびに作業単位を一つずつ処理するモデルである。Reactも最初は実際にこのAPIを使っており、今の形にたどり着くまでにいくつかのPRを経た。

- **2017年1月**：ネイティブの`requestIdleCallback`を使い、ないブラウザーでは`requestAnimationFrame`と`postMessage`で模倣したpolyfillを使うようにした（[PR #8833](https://github.com/facebook/react/pull/8833)）。SafariのようにこのAPIがないブラウザーは、最初からpolyfillが担っていた。Safariの正式版には[2026年10月現在もこのAPIがない](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback#browser_compatibility)。
- **2018年3月と4月**：ネイティブAPIがあってもpolyfillを使うフラグを入れた。Andrew ClarkはPR本文で、それまで悩まされてきたstarvation（作業が実行の機会を得られず後回しにされ続ける現象）の問題を理由に挙げた（[PR #12385](https://github.com/facebook/react/pull/12385)）。1か月後にフラグを削除し、polyfillに確定した（[PR #12648](https://github.com/facebook/react/pull/12648)）。
- **2019年7月**：次のvsyncを推測してフレームの終わりに譲る方式の代わりに、messageイベントの中で5ms働いて譲るループを実験フラグとして入れた（[PR #16214](https://github.com/facebook/react/pull/16214)）。このループは`requestAnimationFrame`をまったく使わない。
- **2019年11月**：性能テストでmessageループのほうがCPU利用効率が良かったという報告（[PR #16271](https://github.com/facebook/react/pull/16271)）を経て、rAF実装を削除した（[PR #17252](https://github.com/facebook/react/pull/17252)）。

筆者は、このstarvationは`requestIdleCallback`の定義から生じると見ている。[W3C仕様](https://w3c.github.io/requestidlecallback/)は、このコールバックをブラウザーがフレームの作業を終えて残ったアイドル期間（idle period）に呼ぶと定めている。ページが忙しければその期間はまれにしか来ず、Reactの作業はその分後回しになる。Dan Abramovも2018年8月のissueコメントで、ReactがこのAPIを使うのをやめた理由を「it's not as aggressive as we need」と書いている（[facebook/react#11171](https://github.com/facebook/react/issues/11171#issuecomment-417349573)）。

その後の`requestAnimationFrame`方式を捨てた理由はPR #16214の本文にある。この方式は次のvsync（ディスプレイが画面を更新する周期に合わせた信号）のタイミングを推測しなければならなかった。最初は30fpsを仮定してフレーム長を33.33msとし、連続する二つのフレーム間隔がどちらもそれより短ければ、二つのうち長いほうにフレーム長を縮めた。今回のフレームの締め切りは、フレームが始まった時刻にこの長さを足した値だった（[PR #17252直前のSchedulerHostConfig.default.js](https://github.com/facebook/react/blob/6dc2734b41aef944e457eaa23ae218952fce0a54/packages/scheduler/src/forks/SchedulerHostConfig.default.js#L305-L336)）。フレーム長を縮める規則しかなかったので、PR本文のとおり、ページを開いた後にリフレッシュレートが上がることは検知できても、下がることは検知できなかった。

messageループはvsync周期のどこにいても5msごとに譲る。PR本文は、こうすればリフレッシュレートが非常に高い画面でもメインスレッドの応答性を保てるだろうと期待していた（「should keep the main thread responsive」）。現在のSchedulerのソースコメントも、ほとんどの作業はフレーム境界に合わせる必要がないと書いている。

## MessageChannel

最終的にReactは**MessageChannel**を選んだ。以下はReact v19.3.0の[Scheduler.js 530〜562行](https://github.com/facebook/react/blob/v19.3.0/packages/scheduler/src/forks/Scheduler.js#L530-L562)で、コメントは削った。

```js
let schedulePerformWorkUntilDeadline;
if (typeof localSetImmediate === 'function') {
  // Node.js and old IE.
  schedulePerformWorkUntilDeadline = () => {
    localSetImmediate(performWorkUntilDeadline);
  };
} else if (typeof MessageChannel !== 'undefined') {
  // DOM and Worker environments.
  // We prefer MessageChannel because of the 4ms setTimeout clamping.
  const channel = new MessageChannel();
  const port = channel.port2;
  channel.port1.onmessage = performWorkUntilDeadline;
  schedulePerformWorkUntilDeadline = () => {
    port.postMessage(null);
  };
} else {
  // We should only fallback here in non-browser environments.
  schedulePerformWorkUntilDeadline = () => {
    localSetTimeout(performWorkUntilDeadline, 0);
  };
}
```

分岐は三つある。今のブラウザーには`setImmediate`がないので、二つ目の分岐の`MessageChannel`が選ばれる。ソースコメントによれば、一つ目の分岐はNode.jsと古いIEのためのものだ。同じコメントは、`MessageChannel`はNode.jsプロセスが終了しないよう引き止めるが、`setImmediate`はそうしないと書いている（[facebook/react#20756](https://github.com/facebook/react/issues/20756)）。そのためJestのnode環境でSchedulerを追うと、`MessageChannel`ではなく`setImmediate`の経路を通る。jsdom環境は違う。Jest 27から`jest-environment-jsdom`はグローバルから`setImmediate`を外したので（[jestjs/jest#11222](https://github.com/jestjs/jest/pull/11222)）、一つ目の分岐には入らない。

Schedulerがこうして次の番を予約する目的は、メインスレッドをブラウザーに返すことである。JavaScriptがメインスレッドを握っている間、ブラウザーは入力を処理することも画面を描くこともできない。ただし、すべてのレンダーが途中で譲るわけではない。React v19.3.0のReconcilerは、レンダーを始めるときに今回のレンダーのlaneを見て、時間を分割するかを決める（[ReactFiberWorkLoop.js 1168行](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberWorkLoop.js#L1168)）。Sync、InputContinuous、Defaultのlaneが含まれていれば、譲らずに最後までレンダーする（[ReactFiberLane.js 684行](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberLane.js#L684)）。時間を分割して途中で譲るのは、TransitionやRetryのようなレンダーだ。

こうしたレンダーでは、ReconcilerはFiberを一つ処理するたびに`shouldYield()`を尋ねる（[ReactFiberWorkLoop.js 3073〜3078行](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberWorkLoop.js#L3073-L3078)）。この関数はSchedulerが公開しているもので、実際の判断はScheduler内の`shouldYieldToHost()`が行う。基準は、今回のメッセージタスクが始まってからの経過時間だ。その時間が`frameInterval`を超えると譲る。`frameInterval`の初期値は`SchedulerFeatureFlags.js`で定義された`frameYieldMs`、つまり**5ms**である（[11行](https://github.com/facebook/react/blob/v19.3.0/packages/scheduler/src/SchedulerFeatureFlags.js#L11)）。5msは作業の断片の大きさではなく、譲るかどうかを確認する時間の基準である。コンポーネント一つのレンダリングに20msかかれば、その20msは分割されない。

## setTimeoutの4ms遅延

譲った後に次の断片を予約するのに、なぜ`setTimeout`ではなく`MessageChannel`を使うのか。HTML仕様の[タイマー初期化手順](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timer-initialisation-steps)は、ネストの深さが5を超えた`setTimeout`の遅延が4msより短ければ4msに引き上げる。筆者がChromeで`setTimeout(fn, 0)`が自分自身を再登録するチェーンを測ると、1〜6回目の呼び出しの間隔は0〜0.1msで、7回目から4.4〜4.6msが付いた。`MessageChannel`のメッセージにはこうした最小遅延がない。メッセージはタスクキューに入るだけなので、その間にブラウザーが入力処理やレンダリングを挟み込むことができ、Schedulerはまさにその隙間を狙っている。

4msは小さく見えるが、5msごとに譲るループでは話が違う。200ms分の作業を5msの断片40個に分け、次の断片を`MessageChannel`と`setTimeout(work, 0)`でそれぞれ予約してみた。開発者ツールのコンソールに貼り付ければそのまま動く。

```js
function busy(ms) { const s = performance.now(); while (performance.now() - s < ms) {} }
const ch = new MessageChannel();
let done = 0, frames = 0;
const raf = () => { frames++; if (done < 200) requestAnimationFrame(raf); };
const start = performance.now();
const work = () => {
  busy(5); done += 5;
  if (done < 200) schedule();
  else console.log(Math.round(performance.now() - start), 'ms,', frames, 'frames');
};
ch.port1.onmessage = work;
const schedule = () => ch.port2.postMessage(null); // setTimeout(work, 0) 로 바꿔 비교
requestAnimationFrame(raf);
schedule();
```

2026-10-08にmacOSのChrome 154.0.8037.98（headless）で、三つのパターンをそれぞれ3回ずつ実行した結果である。表の3行目は`busy(5); done += 5;`を`busy(200); done += 200;`に替えて、作業を分割しなかったものだ。

| 次の断片の予約 | 終わるまで | その間に描いたフレーム |
|---|---|---|
| `MessageChannel` | 200ms | 12〜13 |
| `setTimeout(work, 0)` | 353〜354ms | 21 |
| 分割しない | 200ms | 0 |

`setTimeout`のほうは、最初の6回の後から断片ごとに4.5ms前後の空き時間が付き、同じ作業に約1.8倍の時間がかかった。フレーム数が多いのは作業が遅く終わって測定区間が長くなったためで、応答性が良いという意味ではない。分割しなければ作業は200msで終わるが、その間フレームは一つも描かれない。`MessageChannel`は同じ200msのうちに作業を終えながら、約60fpsでフレームを出し続けた。


## おわりに

まとめると、Reactに必要だったのは、ブラウザーが暇になるまで待つAPIではなく、短く働いてすぐに次の番を予約できるAPIだった。`requestIdleCallback`はアイドル期間にしか呼ばれずReactの作業が後回しになり、`requestAnimationFrame`方式はvsyncのタイミングを推測しなければならず、`setTimeout`はネストすると断片ごとに4ms以上休ませた。その条件を満たしたのが`MessageChannel`である。

このSchedulerが分けて実行する作業単位であるFiberノードがどんな形をしていて、Work Loopがそれをどう巡回するのかは、[React Fiber完全攻略](/250520)で扱う。この記事を読んだ皆さんも、Reactのソースコードで再び`MessageChannel`に出会ったら、なぜそこにそれがあるのかを一度思い出してみてほしい。


## 出典

:::ref
- [repo] [React 16.0直前のReactDOMFrameScheduling.js](https://github.com/facebook/react/blob/3019210df2b486416ed94d7b9becffaf254e81c4/src/renderers/shared/ReactDOMFrameScheduling.js)
:::
