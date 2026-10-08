---
emoji: ⏱️
title: "ReactがMessageChannelを使う理由"
seoTitle: "React SchedulerはなぜrequestIdleCallbackではなくMessageChannelを使うのか"
date: "2025-05-15"
categories: フロントエンド React
description: "React SchedulerがrequestIdleCallback、requestAnimationFrame、setTimeoutではなくMessageChannelで作業を予約する理由を整理する。呼び出し頻度、ブラウザー互換性、setTimeoutの4ms遅延をソースコードで確認する。"
keywords: "requestIdleCallback, MessageChannel, React Scheduler, setTimeout 4ms, Reactスケジューラーの仕組み, shouldYieldToHost, requestAnimationFrame, React Fiber"
locale: ja
translationOf: '250515'
sourceHash: bfb181318a2adf0a9dd6422a287895eff5a1b654aab1a204bbdc1eba1ec1808c
---

今回の記事では、**ReactがrequestIdleCallbackではなくMessageChannelで作業を予約する理由**について話してみたい。

Fiberを学ぶなかで「ブラウザーが暇なときに少しずつ働く」という説明を読んだのに、実際のReactのソースコードでは`MessageChannel`に出会って混乱したフロントエンド開発者に向けた記事である。先に答えを書くと、`requestIdleCallback`は呼び出される頻度が低すぎ、ブラウザーごとに動作も異なっていた。そして`setTimeout`はネストすると4msの遅延が付く。そのためReactのSchedulerパッケージは、遅延なしに次のマクロタスクを予約できる`MessageChannel`を使う。


## requestIdleCallbackを捨てた理由

Fiberの概念を説明するときには、`requestIdleCallback`で作業を分けて実行するコードがよく使われる。ブラウザーにやることがないたびに作業単位を一つずつ処理するモデルである。しかし実際のReactはこれを使っていない。理由は三つある。

- **呼び出し頻度が低すぎる**：本当に「アイドル時間（ブラウザーにすることがない時間）」にしか呼ばれないため、負荷の高いページではReactの作業がいつまでも遅延する可能性がある。Dan Abramovも「requestIdleCallback is called too infrequently to be useful for scheduling React work」と述べている。
- **ブラウザー互換性の問題**：Safariは長い間これを実装しておらず、ブラウザーごとに動作も異なっていた。
- **20msの上限**：アイドル時間の期限には上限があり、Reactが求めるレベルの予測可能なタイミング制御ができなかった。

次に`requestAnimationFrame`とフレーム予算の推定を組み合わせる方式も試したが、Reactの作業を垂直同期（モニターが垂直走査を完了する時点に合わせてフレーム出力を同期する技術）の周期に合わせる必要はないとの判断から、これも廃止された。

## MessageChannel

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

なぜ`setTimeout`ではなく`MessageChannel`なのか。HTML仕様により、`setTimeout`は5回以上ネストすると**最低4msの遅延**が強制される。一方、`MessageChannel`はこの制限なしに、イベントループの次のティックで即座にマクロタスクとして実行される。5ms単位で作業を分割するFiberにとって、4msの人為的な遅延は致命的だからだ。

Schedulerの`shouldYieldToHost()`は、作業開始後の経過時間が`frameInterval`（既定値は**5ms**、`SchedulerFeatureFlags.js`で定義）を超えたか確認し、メインスレッドへ制御を返すかどうかを判断する。


## おわりに

まとめると、Reactに必要だったのは、ブラウザーが暇になるまで待つAPIではなく、短く働いてすぐに次の番を予約できるAPIだった。`requestIdleCallback`は呼ばれる頻度が低すぎ、`requestAnimationFrame`はReactの作業が合わせる必要のない垂直同期の周期に縛られ、`setTimeout`は4msの遅延を付けた。その条件を満たしたのが`MessageChannel`である。

このSchedulerが分けて実行する作業単位であるFiberノードがどんな形をしていて、Work Loopがそれをどう巡回するのかは、[React Fiber完全攻略](/250520)で扱う。この記事を読んだ皆さんも、Reactのソースコードで再び`MessageChannel`に出会ったら、なぜそこにそれがあるのかを一度思い出してみてほしい。


## 出典

:::ref
- [repo] [Reactソースコード, Scheduler.js](https://github.com/facebook/react/blob/main/packages/scheduler/src/forks/Scheduler.js)
- [docs] [WHATWG, HTML Standard, Timers](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers)
:::
