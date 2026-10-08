---
emoji: ⏱️
title: "Why React Uses MessageChannel"
seoTitle: "Why React Uses MessageChannel Instead of requestIdleCallback"
date: "2025-05-15"
updatedAt: "2026-10-08"
categories: frontend React
description: "Why React's Scheduler uses MessageChannel over requestIdleCallback, rAF, or setTimeout, traced through React PRs and Chrome measurements of the 4 ms clamp."
keywords: "requestIdleCallback, MessageChannel, React Scheduler, setTimeout 4ms clamp, how the React scheduler works, shouldYieldToHost, requestAnimationFrame, React Fiber"
locale: en
translationOf: '250515'
sourceHash: 2886d1f79bf522f36c50fa641be933949b9f29244460f6f2da25323d88f63148
---

In this post, I want to talk about **why React schedules its work with MessageChannel instead of requestIdleCallback**.

This is for frontend developers who studied Fiber, read that React "does a little work whenever the browser is idle," and were then confused to find `MessageChannel` in React's actual source code. To give the answer first: `requestIdleCallback` was not called as often as React needed, and `setTimeout` adds a delay of more than 4 ms once calls are nested. So React's Scheduler package uses `MessageChannel`, which in the browser can schedule the next macrotask without any artificial delay. How large that 4 ms really is, I check with numbers I measured myself in Chrome.


## Why React Abandoned requestIdleCallback

Explanations of Fiber's concept often use code that splits work up with `requestIdleCallback`. It is a model in which one unit of work is processed each time the browser has nothing else to do. React did actually use this API at first, and it went through several PRs before reaching its current shape.

- **January 2017**: React used the native `requestIdleCallback`, and in browsers without it, a polyfill that imitated it with `requestAnimationFrame` and `postMessage` ([PR #8833](https://github.com/facebook/react/pull/8833)). Browsers lacking the API, such as Safari, were handled by the polyfill from the start. Stable Safari [still does not have this API as of October 2026](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback#browser_compatibility).
- **March and April 2018**: A flag was added to use the polyfill even when the native API existed. Andrew Clark gave the starvation issues they had been seeing (work never getting a chance to run and being pushed back again and again) as the reason in the PR description ([PR #12385](https://github.com/facebook/react/pull/12385)). A month later the flag was removed and the polyfill became permanent ([PR #12648](https://github.com/facebook/react/pull/12648)).
- **July 2019**: Instead of guessing the next vsync and yielding at the end of the frame, an experimental flag introduced a loop that works for 5 ms inside a message event and then yields ([PR #16214](https://github.com/facebook/react/pull/16214)). This loop does not use `requestAnimationFrame` at all.
- **November 2019**: After a report that performance tests showed better CPU utilization for the message loop ([PR #16271](https://github.com/facebook/react/pull/16271)), the rAF implementation was deleted ([PR #17252](https://github.com/facebook/react/pull/17252)).

The starvation comes from how `requestIdleCallback` is defined. The [W3C specification](https://w3c.github.io/requestidlecallback/) says the callback is invoked during the idle period left after the browser finishes its frame work. On a busy page those periods come rarely, and React's work gets pushed back accordingly. Dan Abramov also wrote in an August 2018 issue comment that React stopped using this API because "it's not as aggressive as we need" ([facebook/react#11171](https://github.com/facebook/react/issues/11171#issuecomment-417349573)).

The reasons for dropping the later `requestAnimationFrame` approach are in the description of PR #16214. That approach had to guess when the next vsync (the signal tied to the display's refresh cycle) would come, and it could detect the refresh rate going up after page load but not going down. The message loop yields every 5 ms wherever it is in the vsync cycle, so it can keep the main thread responsive even on high refresh rate displays. The current Scheduler source comment also says that most tasks do not need to be aligned with frame boundaries.

## MessageChannel

React ultimately chose **MessageChannel**. Below are [lines 530 to 562 of Scheduler.js](https://github.com/facebook/react/blob/v19.3.0/packages/scheduler/src/forks/Scheduler.js#L530-L562) in React v19.3.0, with the comments trimmed.

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

There are three branches. Today's browsers do not have `setImmediate`, so the second branch, `MessageChannel`, is taken. The first branch exists for Node.js and jsdom. According to the source comment, `MessageChannel` keeps a Node.js process from exiting while `setImmediate` does not ([facebook/react#20756](https://github.com/facebook/react/issues/20756)). So if you trace the Scheduler in Jest, you end up not on the `MessageChannel` path but on the `setImmediate` path.

The purpose of scheduling the next turn like this is to hand the main thread back to the browser. While JavaScript holds the main thread, the browser can neither handle input nor paint the screen. So the Reconciler asks `shouldYield()` after processing each Fiber ([lines 3073 to 3078 of ReactFiberWorkLoop.js](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberWorkLoop.js#L3073-L3078)). The Scheduler's `shouldYieldToHost()`, which provides the answer, checks whether the time since the current message task started has exceeded `frameInterval`. That value is initialized from the `SchedulerFeatureFlags.js` constant `frameYieldMs`, which is **5 ms** ([line 11](https://github.com/facebook/react/blob/v19.3.0/packages/scheduler/src/SchedulerFeatureFlags.js#L11)). 5 ms is not the size of a work slice but the time threshold for checking whether to yield. If rendering a single component takes 20 ms, those 20 ms are not split.

## The 4 ms Delay of setTimeout

Why is it not `setTimeout` but `MessageChannel` that schedules the next slice after yielding? The [timer initialization steps](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timer-initialisation-steps) of the HTML specification raise the delay of a `setTimeout` whose nesting level is greater than 5 to 4 ms if it is shorter than that. When I measured a chain where `setTimeout(fn, 0)` re-arms itself in Chrome, the gaps for the 1st through 6th calls were 0 to 0.1 ms, and from the 7th call on, 4.4 to 4.6 ms were added. Messages on a `MessageChannel` have no such minimum delay. A message is simply queued as a task, so the browser can slip in input handling or rendering in between, and that gap is exactly what the Scheduler is after.

4 ms looks small, but it is a different story in a loop that yields every 5 ms. I split 200 ms of work into forty 5 ms slices and scheduled the next slice with `MessageChannel` and with `setTimeout(work, 0)`. Paste it into the DevTools console and it runs as is.

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

These are the results of running three variants three times each on 2026-10-08 in Chrome 154.0.8037.98 (headless) on macOS. The third row of the table replaces `busy(5); done += 5;` with `busy(200); done += 200;` so the work is not split.

| How the next slice is scheduled | Time to finish | Frames drawn meanwhile |
|---|---|---|
| `MessageChannel` | 200 ms | 12 to 13 |
| `setTimeout(work, 0)` | 353 to 354 ms | 21 |
| Not split | 200 ms | 0 |

With `setTimeout`, after the first six calls each slice gained roughly 4.5 ms of idle time, so the same work took about 1.8 times as long. The higher frame count is because the work finished late and the measured window grew longer. It does not mean better responsiveness. Without splitting, the work finishes in 200 ms, but not a single frame is drawn during that time. `MessageChannel` finished the work within the same 200 ms while continuing to produce frames at about 60 fps. I did not measure Safari or Firefox.


## Conclusion

To summarize, what React needed was not an API that waits until the browser is idle, but one that lets it work briefly and immediately schedule its next turn. `requestIdleCallback` was called only in idle periods, so React's work got pushed back; the `requestAnimationFrame` approach had to guess when vsync would come; and `setTimeout` made each slice rest for more than 4 ms once nested. `MessageChannel` is what met those conditions.

How the units of work this Scheduler runs, the Fiber nodes, are structured and how the Work Loop traverses them is covered in [Mastering React Fiber](/250520). The next time you come across `MessageChannel` in React's source code, I hope you will take a moment to recall why it is there.


## Sources

:::ref
- [repo] [ReactDOMFrameScheduling.js just before React 16.0](https://github.com/facebook/react/blob/3019210df2b486416ed94d7b9becffaf254e81c4/src/renderers/shared/ReactDOMFrameScheduling.js)
:::
