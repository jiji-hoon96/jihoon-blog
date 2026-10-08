---
emoji: ⏱️
title: "Why React Uses MessageChannel"
seoTitle: "Why React Uses MessageChannel Instead of requestIdleCallback"
date: "2025-05-15"
categories: frontend React
description: "Why React's Scheduler chose MessageChannel over requestIdleCallback, requestAnimationFrame, and setTimeout: call frequency, browser support, 4 ms delays."
keywords: "requestIdleCallback, MessageChannel, React Scheduler, setTimeout 4ms clamp, how the React scheduler works, shouldYieldToHost, requestAnimationFrame, React Fiber"
locale: en
translationOf: '250515'
sourceHash: bfaa67abcb8f66de08aab49d2098ef5c87175fada85358ac546691c7c36a2619
---

In this post, I want to talk about **why React schedules its work with MessageChannel instead of requestIdleCallback**.

This is for frontend developers who studied Fiber, read that React "does a little work whenever the browser is idle," and were then confused to find `MessageChannel` in React's actual source code. To give the answer first: `requestIdleCallback` is called too infrequently and behaved differently across browsers, and `setTimeout` adds a 4 ms delay once calls are nested. So React's Scheduler package uses `MessageChannel`, which can schedule the next macrotask without that delay.


## Why React Abandoned requestIdleCallback

Explanations of Fiber's concept often use code that splits work up with `requestIdleCallback`. It is a model in which one unit of work is processed each time the browser has nothing else to do. But React does not actually use it. There are three reasons.

- **It is called too infrequently**: It runs only during truly "idle time" when the browser has nothing else to do, so React work could be delayed indefinitely on a busy page. Dan Abramov has also said, "requestIdleCallback is called too infrequently to be useful for scheduling React work."
- **Browser compatibility issues**: Safari did not implement it for a long time, and behavior varied between browsers.
- **A 20 ms cap**: The idle deadline has an upper bound, preventing the predictable degree of timing control React needs.

React next tried `requestAnimationFrame` plus frame-budget estimation, but abandoned that approach as well after deciding that React's work did not need to align with the vsync cycle (the technology that synchronizes frame output to the point at which a monitor completes its vertical refresh).

## MessageChannel

React ultimately chose **MessageChannel**.

```js
if (typeof MessageChannel !== 'undefined') {
  const channel = new MessageChannel();
  channel.port1.onmessage = performWorkUntilDeadline;
  schedulePerformWorkUntilDeadline = () => channel.port2.postMessage(null);
} else {
  schedulePerformWorkUntilDeadline = () => setTimeout(performWorkUntilDeadline, 0);
}
```

The Scheduler's `shouldYieldToHost()` checks whether the time elapsed since work began exceeds `frameInterval` (by default **5 ms**, defined in `SchedulerFeatureFlags.js`) and decides whether to return control to the main thread.

Why not `setTimeout`, but `MessageChannel`? Under the HTML specification, `setTimeout` is forced to wait at least **4 ms** after five or more nested calls. `MessageChannel`, on the other hand, runs immediately as a macrotask on the next event-loop tick without that restriction. For Fiber, which divides work into 5 ms slices, an artificial 4 ms delay would be devastating.


## Conclusion

To summarize, what React needed was not an API that waits until the browser is idle, but one that lets it work briefly and immediately schedule its next turn. `requestIdleCallback` was called too rarely, `requestAnimationFrame` was tied to a vsync cycle that React's work did not need to follow, and `setTimeout` added a 4 ms delay. `MessageChannel` is what met those conditions.

How the units of work this Scheduler runs, the Fiber nodes, are structured and how the Work Loop traverses them is covered in [Mastering React Fiber](/250520). The next time you come across `MessageChannel` in React's source code, I hope you will take a moment to recall why it is there.


## Sources

:::ref
- [repo] [React source code, Scheduler.js](https://github.com/facebook/react/blob/main/packages/scheduler/src/forks/Scheduler.js)
- [docs] [WHATWG, HTML Standard, Timers](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers)
:::
