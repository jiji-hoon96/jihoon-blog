---
emoji: ⏱️
title: "React 为什么使用 MessageChannel"
seoTitle: "React Scheduler 为什么用 MessageChannel 而不是 requestIdleCallback"
date: "2025-05-15"
categories: 前端 React
description: "从调用频率、浏览器兼容性与 setTimeout 的 4ms 延迟三方面，梳理 React Scheduler 为何不用 requestIdleCallback、requestAnimationFrame、setTimeout，而用 MessageChannel 调度工作。"
keywords: "requestIdleCallback, MessageChannel, React Scheduler, setTimeout 4ms, React 调度器原理, shouldYieldToHost, requestAnimationFrame, React Fiber"
locale: zh-CN
translationOf: '250515'
sourceHash: bfaa67abcb8f66de08aab49d2098ef5c87175fada85358ac546691c7c36a2619
---

这篇文章想聊聊 **React 为什么用 MessageChannel 而不是 requestIdleCallback 来调度工作**。

本文写给这样的前端开发者：学习 Fiber 时读到“浏览器空闲时一点点干活”的说法，却在实际的 React 源码里碰到 `MessageChannel`，因而感到困惑。先说答案：`requestIdleCallback` 被调用得太少，各浏览器的行为也不一致；而 `setTimeout` 一旦嵌套就会被加上 4ms 延迟。所以 React 的 Scheduler 包使用可以无延迟地调度下一个 macrotask 的 `MessageChannel`。


## 放弃 requestIdleCallback 的原因

讲解 Fiber 概念时，常会用到借助 `requestIdleCallback` 拆分执行工作的代码。这是一种每当浏览器无事可做时就处理一个工作单元的模型。但实际的 React 并不使用它，原因有三个。

- **调用频率太低**：只会在真正的“空闲时间（浏览器无事可做的时间）”被调用，因此在繁忙页面上，React 工作可能被无限期推迟。Dan Abramov 也曾提到，“requestIdleCallback is called too infrequently to be useful for scheduling React work”。
- **浏览器兼容性问题**：Safari 长期没有实现它，而且不同浏览器的行为并不一致。
- **20ms 上限**：idle deadline 存在上限，React 无法按自身需求对时间进行可预测的控制。

之后，React 又尝试过 `requestAnimationFrame` + 帧预算估算的方式，但由于 React 的工作并不需要与 vsync（让帧输出与显示器完成垂直扫描的时点同步的技术）周期对齐，这种方案最终也被弃用。

## MessageChannel

最终，React 选择了 **MessageChannel**。

```js
if (typeof MessageChannel !== 'undefined') {
  const channel = new MessageChannel();
  channel.port1.onmessage = performWorkUntilDeadline;
  schedulePerformWorkUntilDeadline = () => channel.port2.postMessage(null);
} else {
  schedulePerformWorkUntilDeadline = () => setTimeout(performWorkUntilDeadline, 0);
}
```

Scheduler 的 `shouldYieldToHost()` 会检查工作开始后的经过时间是否超过 `frameInterval`（默认 **5ms**，定义在 `SchedulerFeatureFlags.js` 中），并据此决定是否将控制权交还给主线程。

为什么不使用 `setTimeout`，而要使用 `MessageChannel`？根据 HTML 规范，`setTimeout` 嵌套 5 次以上时，会被强制施加**至少 4ms 的延迟**。而 `MessageChannel` 没有这一限制，可以在下一个事件循环 tick 中立即作为 macrotask 执行。对于以 5ms 为单位拆分工作的 Fiber 来说，人为增加 4ms 延迟是致命的。


## 结语

总而言之，React 需要的不是等到浏览器空闲才动手的 API，而是能短暂工作后立刻预约下一轮的 API。`requestIdleCallback` 被调用得太少，`requestAnimationFrame` 被绑在 React 工作无需对齐的 vsync 周期上，`setTimeout` 又会加上 4ms 延迟。满足这些条件的是 `MessageChannel`。

这个 Scheduler 拆分执行的工作单元，也就是 Fiber 节点长什么样、Work Loop 又如何遍历它们，会在[彻底掌握 React Fiber](/250520)中讨论。希望读到这里的各位，下次在 React 源码里再遇到 `MessageChannel` 时，也能想一想它为什么会出现在那里。


## 来源

:::ref
- [repo] [React 源码，Scheduler.js](https://github.com/facebook/react/blob/main/packages/scheduler/src/forks/Scheduler.js)
- [docs] [WHATWG, HTML Standard, Timers](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers)
:::
