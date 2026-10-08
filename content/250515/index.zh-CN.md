---
emoji: ⏱️
title: "React 为什么使用 MessageChannel"
seoTitle: "React Scheduler 为什么用 MessageChannel 而不是 requestIdleCallback"
date: "2025-05-15"
updatedAt: "2026-10-08"
categories: 前端 React
description: "结合 React 的 PR 记录与在 Chrome 中实测的 setTimeout 4ms 延迟，梳理 React Scheduler 为何不用 requestIdleCallback、requestAnimationFrame、setTimeout，而用 MessageChannel 调度工作。"
keywords: "requestIdleCallback, MessageChannel, React Scheduler, setTimeout 4ms, React 调度器原理, shouldYieldToHost, requestAnimationFrame, React Fiber"
locale: zh-CN
translationOf: '250515'
sourceHash: b2240aadc9a34dfdbdb5f30061426c525d49af520ebc5bb3ff62b6991bcf445c
---

这篇文章想聊一聊 **React 为什么用 MessageChannel 而不是 requestIdleCallback 来调度工作**。

本文写给这样的前端开发者：学习 Fiber 时读到"浏览器空闲时一点一点地干活"的说法，结果在 React 源码里却遇到了 `MessageChannel`，因此感到困惑。先说答案：`requestIdleCallback` 被调用的频率达不到 React 的需要，而 `setTimeout` 一旦嵌套就会附加超过 4ms 的延迟。因此 React 的 Scheduler 包使用 `MessageChannel`，在浏览器中它可以不带任何人为延迟地调度下一个宏任务。这 4ms 实际上有多大，我会用自己在 Chrome 中实测的数字来确认。


## 放弃 requestIdleCallback 的原因

讲解 Fiber 概念时，常见的代码是用 `requestIdleCallback` 把工作拆开执行。这是一种每当浏览器无事可做时就处理一个工作单元的模型。React 起初确实用过这个 API，经过几个 PR 才演变成现在的样子。

- **2017 年 1 月**：使用原生 `requestIdleCallback`，在没有它的浏览器中则使用以 `requestAnimationFrame` 和 `postMessage` 模拟的 polyfill（[PR #8833](https://github.com/facebook/react/pull/8833)）。像 Safari 这样没有该 API 的浏览器，从一开始就由 polyfill 负责。Safari 正式版[截至 2026 年 10 月仍然没有这个 API](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback#browser_compatibility)。
- **2018 年 3 月和 4 月**：加入了一个即使存在原生 API 也使用 polyfill 的标志。Andrew Clark 在 PR 描述中把一直以来遇到的 starvation（工作得不到执行机会、被一再推迟的现象）问题列为理由（[PR #12385](https://github.com/facebook/react/pull/12385)）。一个月后删除了该标志，确定改用 polyfill（[PR #12648](https://github.com/facebook/react/pull/12648)）。
- **2019 年 7 月**：不再猜测下一次 vsync 并在帧末让出，而是以实验标志的形式加入了一个在 message 事件中工作 5ms 后让出的循环（[PR #16214](https://github.com/facebook/react/pull/16214)）。这个循环完全不使用 `requestAnimationFrame`。
- **2019 年 11 月**：在性能测试显示 message 循环的 CPU 利用率更好的报告（[PR #16271](https://github.com/facebook/react/pull/16271)）之后，删除了 rAF 实现（[PR #17252](https://github.com/facebook/react/pull/17252)）。

笔者认为，这种 starvation 源于 `requestIdleCallback` 的定义。[W3C 规范](https://w3c.github.io/requestidlecallback/)规定，这个回调在浏览器完成帧工作后剩下的空闲期（idle period）中调用。页面繁忙时这样的空闲期很少出现，React 的工作也就相应被推迟。Dan Abramov 也在 2018 年 8 月的一条 issue 评论中写道，React 不再使用这个 API 的原因是"it's not as aggressive as we need"（[facebook/react#11171](https://github.com/facebook/react/issues/11171#issuecomment-417349573)）。

之后放弃 `requestAnimationFrame` 方式的原因写在 PR #16214 的描述里。这种方式必须猜测下一次 vsync（与显示器刷新周期对应的信号）的时机。它一开始假定 30fps，把帧长设为 33.33ms；如果连续两个帧间隔都比它短，就把帧长缩短为两者中较长的那个。本帧的截止时间是帧开始的时刻加上这个长度（[PR #17252 之前的 SchedulerHostConfig.default.js](https://github.com/facebook/react/blob/6dc2734b41aef944e457eaa23ae218952fce0a54/packages/scheduler/src/forks/SchedulerHostConfig.default.js#L305-L336)）。由于只有缩短帧长的规则，正如 PR 描述所说，页面打开后刷新率上升可以检测到，下降却检测不到。

message 循环无论处在 vsync 周期的哪个位置都每 5ms 让出一次。PR 描述预期这样即使在刷新率非常高的屏幕上，主线程也能保持响应（"should keep the main thread responsive"）。现在 Scheduler 源码中的注释也写着，大多数任务不需要与帧边界对齐。

## MessageChannel

React 最终选择了 **MessageChannel**。下面是 React v19.3.0 中 [Scheduler.js 第 530 至 562 行](https://github.com/facebook/react/blob/v19.3.0/packages/scheduler/src/forks/Scheduler.js#L530-L562)，注释有所删减。

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

这里有三个分支。如今的浏览器没有 `setImmediate`，所以会走第二个分支的 `MessageChannel`。按照源码注释，第一个分支是为 Node.js 和旧版 IE 准备的。同一段注释写道，`MessageChannel` 会让 Node.js 进程无法退出，而 `setImmediate` 不会（[facebook/react#20756](https://github.com/facebook/react/issues/20756)）。所以在 Jest 的 node 环境中跟踪 Scheduler 时，走的不是 `MessageChannel` 而是 `setImmediate` 路径。jsdom 环境则不同。从 Jest 27 起，`jest-environment-jsdom` 从全局中移除了 `setImmediate`（[jestjs/jest#11222](https://github.com/jestjs/jest/pull/11222)），所以不会进入第一个分支。

Scheduler 这样调度下一轮的目的，是把主线程交还给浏览器。JavaScript 占着主线程时，浏览器既不能处理输入，也不能绘制画面。不过，并不是所有渲染都会中途让出。React v19.3.0 的 Reconciler 在开始渲染时，会根据本次渲染的 lane 决定是否进行时间切片（[ReactFiberWorkLoop.js 第 1168 行](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberWorkLoop.js#L1168)）。只要包含 Sync、InputContinuous、Default lane，就不让出、一直渲染到底（[ReactFiberLane.js 第 684 行](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberLane.js#L684)）。进行时间切片、中途让出的是 Transition 和 Retry 这类渲染。

在这类渲染中，Reconciler 每处理一个 Fiber 就询问一次 `shouldYield()`（[ReactFiberWorkLoop.js 第 3073 至 3078 行](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberWorkLoop.js#L3073-L3078)）。这个函数由 Scheduler 导出，实际的判断由 Scheduler 内部的 `shouldYieldToHost()` 完成。判断的依据是本次消息任务开始后经过的时间。这段时间一旦超过 `frameInterval`，就会让出。`frameInterval` 的初始值是 `SchedulerFeatureFlags.js` 中定义的 `frameYieldMs`，也就是 **5ms**（[第 11 行](https://github.com/facebook/react/blob/v19.3.0/packages/scheduler/src/SchedulerFeatureFlags.js#L11)）。5ms 不是工作切片的大小，而是检查是否让出的时间标准。如果渲染一个组件需要 20ms，这 20ms 不会被拆开。

## setTimeout 的 4ms 延迟

让出之后调度下一个切片时，为什么不用 `setTimeout` 而用 `MessageChannel`？HTML 规范的[计时器初始化步骤](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timer-initialisation-steps)规定，嵌套深度超过 5 的 `setTimeout` 如果延迟小于 4ms，就提高到 4ms。我在 Chrome 中测量了 `setTimeout(fn, 0)` 反复重新注册自身的调用链，第 1 到第 6 次调用的间隔为 0 至 0.1ms，从第 7 次开始附加了 4.4 至 4.6ms。`MessageChannel` 的消息没有这样的最小延迟。消息只是进入任务队列，浏览器可以在其间插入输入处理或渲染，而 Scheduler 瞄准的正是这个空隙。

4ms 看起来很小，但在每 5ms 让出一次的循环里情况就不同了。我把 200ms 的工作拆成 40 个 5ms 切片，分别用 `MessageChannel` 和 `setTimeout(work, 0)` 调度下一个切片。粘贴到开发者工具控制台即可直接运行。

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

以下是 2026-10-08 在 macOS 的 Chrome 154.0.8037.98（headless）中，三种写法各运行三次的结果。表格第三行把 `busy(5); done += 5;` 换成了 `busy(200); done += 200;`，即不拆分工作。

| 下一个切片的调度方式 | 完成所需时间 | 期间绘制的帧数 |
|---|---|---|
| `MessageChannel` | 200ms | 12 至 13 |
| `setTimeout(work, 0)` | 353 至 354ms | 21 |
| 不拆分 | 200ms | 0 |

`setTimeout` 这边在前六次调用之后，每个切片都多出 4.5ms 左右的空闲时间，同样的工作花了约 1.8 倍的时间。帧数更多是因为工作结束得晚、测量区间变长了，并不代表响应性更好。不拆分时工作在 200ms 内完成，但期间一帧也没有绘制。`MessageChannel` 在同样的 200ms 内完成工作，同时以约 60fps 持续输出帧。


## 结语

总结来说，React 需要的不是等到浏览器空闲的 API，而是能短暂工作后立即调度下一轮的 API。`requestIdleCallback` 只在空闲期被调用，导致 React 的工作被推迟；`requestAnimationFrame` 方式必须猜测 vsync 的时机；`setTimeout` 一旦嵌套，就让每个切片都停顿 4ms 以上。满足这些条件的正是 `MessageChannel`。

这个 Scheduler 分开执行的工作单元，也就是 Fiber 节点长什么样、Work Loop 如何遍历它们，会在[彻底掌握 React Fiber](/250520)中讨论。希望各位读者下次在 React 源码中再遇到 `MessageChannel` 时，能想起它为什么会出现在那里。


## 来源

:::ref
- [repo] [React 16.0 之前的 ReactDOMFrameScheduling.js](https://github.com/facebook/react/blob/3019210df2b486416ed94d7b9becffaf254e81c4/src/renderers/shared/ReactDOMFrameScheduling.js)
:::
