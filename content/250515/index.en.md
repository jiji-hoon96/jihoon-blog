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
sourceHash: f9e36a7b0a0e10bfe8dc30ec353c2703fbf8e586fb8ce86dccf0c23a712b3454
---

In this post, I want to talk about **why React schedules its work with MessageChannel instead of requestIdleCallback**.

This is for frontend developers who studied Fiber, read that React "does a little work whenever the browser is idle," and were then confused to find `MessageChannel` in React's actual source code. To give the answer first: `requestIdleCallback` was not called as often as React needed, and `setTimeout` adds a delay of more than 4 ms once calls are nested. So React's Scheduler package uses `MessageChannel`, which in the browser can schedule the next macrotask without any artificial delay. How large that 4 ms really is, I check with numbers measured in headless Chrome.


## Scheduling approaches React dropped

Explanations of Fiber's concept often use code that splits work up with `requestIdleCallback`. It is a model in which one unit of work is processed each time the browser has nothing else to do. React did actually use this API at first, and it went through several PRs before reaching its current shape.

- **January 2017**: React used the native `requestIdleCallback`, and in browsers without it, a polyfill that imitated it with `requestAnimationFrame` and `postMessage` ([PR #8833](https://github.com/facebook/react/pull/8833)). Browsers lacking the API, such as Safari, were handled by the polyfill from the start. Stable Safari [still does not have this API as of October 2026](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback#browser_compatibility).
- **March and April 2018**: A flag was added to use the polyfill even when the native API existed. Andrew Clark wrote in the PR description that the point was to test whether the polyfill reduced the starvation issues they had been seeing (work never getting a chance to run and being pushed back again and again), adding that it was hard to say for certain because those issues were difficult to reproduce ([PR #12385](https://github.com/facebook/react/pull/12385)). A month later, having determined internally that it worked better than the native implementation, the team removed the flag and made the polyfill permanent ([PR #12648](https://github.com/facebook/react/pull/12648)).
- **November 2018**: The message event that the polyfill had been posting to `window` was moved to a `MessageChannel`. Posting to `window` makes every other message handler on the page run on every frame as well ([PR #14234](https://github.com/facebook/react/pull/14234)).
- **July 2019**: Instead of guessing the next vsync and yielding at the end of the frame, an experimental flag introduced a loop that works for 5 ms inside a message event and then yields ([PR #16214](https://github.com/facebook/react/pull/16214)). This loop does not use `requestAnimationFrame` at all.
- **August and November 2019**: In August came a report that performance tests showed better CPU utilization for the message loop ([PR #16271](https://github.com/facebook/react/pull/16271), not merged), and in November the rAF implementation was deleted ([PR #17252](https://github.com/facebook/react/pull/17252)).

Why the starvation happens can be inferred from how `requestIdleCallback` is defined. The [W3C specification](https://w3c.github.io/requestidlecallback/) leaves the idle period to the browser to decide, and gives the time left over between one frame and the next as one of its examples. Such periods come often during animation, but on a 60 Hz display they are typically shorter than 16 ms. When the main thread is busy with long tasks, even these shrink, and React's work, in my view, gets pushed back accordingly. Dan Abramov also wrote in an August 2018 issue comment that React stopped using this API because "it's not as aggressive as we need" ([facebook/react#11171](https://github.com/facebook/react/issues/11171#issuecomment-417349573)).

The reasons for dropping the later `requestAnimationFrame` approach are in the description of PR #16214. That approach had to guess when the next vsync (the signal tied to the display's refresh cycle) would come. It started by assuming 30 fps, with a frame length of 33.33 ms, and whenever two consecutive frame intervals were both shorter than that, it shrank the frame length to the longer of the two. The deadline for the current frame was the frame's start time plus that length ([SchedulerHostConfig.default.js just before PR #17252](https://github.com/facebook/react/blob/6dc2734b41aef944e457eaa23ae218952fce0a54/packages/scheduler/src/forks/SchedulerHostConfig.default.js#L123-L336)). Because its only rule shrank the frame length, it could detect the refresh rate going up after page load but not going down, as the PR description says.

The message loop yields every 5 ms wherever it is in the vsync cycle. The PR description expected this to keep the main thread responsive even on displays with very high refresh rates ("should keep the main thread responsive"). The same PR also noted the risk that yielding more often could increase contention with other browser tasks, and that it was unclear how much message events are throttled in a background tab. The current Scheduler source comment says that most tasks do not need to be aligned with frame boundaries.

## MessageChannel

What remained as the scheduling mechanism once rAF was removed is **MessageChannel**. Below are [lines 530 to 561 of Scheduler.js](https://github.com/facebook/react/blob/v19.3.0/packages/scheduler/src/forks/Scheduler.js#L530-L561) in React v19.3.0, with the comments trimmed.

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

There are three branches. Today's browsers do not have `setImmediate`, so the second branch, `MessageChannel`, is taken. According to the source comment, the first branch exists for Node.js and old IE, and `MessageChannel` keeps a Node.js process from exiting while `setImmediate` does not ([facebook/react#20756](https://github.com/facebook/react/issues/20756)). So Jest's node environment takes the `setImmediate` path. Since Jest 27, the jsdom environment has had `setImmediate` removed from its globals ([jestjs/jest#11222](https://github.com/jestjs/jest/pull/11222)) and has no `MessageChannel` either, so it takes the `setTimeout` path.

The purpose of scheduling the next turn like this is to hand the main thread back to the browser. While JavaScript holds the main thread, the browser can neither handle input nor paint the screen. Only time-sliced renders such as Transition and Retry yield partway through, though. The Reconciler in React v19.3.0 renders to the end without yielding when the render includes a blocking lane such as Sync, InputContinuous, or Default, includes a lane that waited so long it expired, or was called with `forceSync` ([line 1168 of ReactFiberWorkLoop.js](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberWorkLoop.js#L1168)).

In those renders, the Reconciler asks `shouldYield()` after processing each Fiber ([lines 3073 to 3078 of ReactFiberWorkLoop.js](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberWorkLoop.js#L3073-L3078)). That function is exported by the Scheduler, and the actual decision is made by `shouldYieldToHost()` inside the Scheduler. The criterion is the time elapsed since the current message task started. Once that time reaches `frameInterval`, it yields, and if `requestPaint()` was called after a commit, it yields regardless of time. The initial value of `frameInterval` is the `SchedulerFeatureFlags.js` constant `frameYieldMs`, which is **5 ms** ([line 11](https://github.com/facebook/react/blob/v19.3.0/packages/scheduler/src/SchedulerFeatureFlags.js#L11)). 5 ms is not the size of a work slice but the time threshold for checking whether to yield. If rendering a single component takes 20 ms, those 20 ms are not split. All of this describes the stable build. In experimental builds, `enableAlwaysYieldScheduler` in the same file is turned on, so the Scheduler yields to the browser as soon as it finishes one task, unless the next task has already expired, instead of filling 5 ms, and it ignores the `requestPaint()` signal.

## The 4 ms Delay of setTimeout

Why is it not `setTimeout` but `MessageChannel` that schedules the next slice after yielding? The [timer initialization steps](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timer-initialisation-steps) of the HTML specification raise the delay of a `setTimeout` whose nesting level is greater than 5 to 4 ms if it is shorter than that. Measuring a chain where `setTimeout(fn, 0)` re-arms itself in headless Chrome, the gaps for the 1st through 6th calls were 0 to 0.1 ms, and from the 7th call on, 4 to 5 ms (usually around 5 ms) were added. Messages on a `MessageChannel` have no such minimum delay. A message is simply queued as a task, so the browser can slip in input handling or rendering in between, and that gap is exactly what the Scheduler is after.

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

These are the results of running three variants eight times each on 2026-10-08 in Chrome 154.0.8037.98 (headless) on macOS. Safari and Firefox were not measured. The third row of the table replaces `busy(5); done += 5;` with `busy(200); done += 200;` so the work is not split.

| How the next slice is scheduled | Time to finish | Frames drawn meanwhile |
|---|---|---|
| `MessageChannel` | 201 ms | 12 to 13 |
| `setTimeout(work, 0)` | about 365 to 371 ms | 21 to 22 |
| Not split | 200 ms | 0 |

With `setTimeout`, after the first six calls each slice gained 4 to 5 ms of idle time, so the same work took about 1.8 times as long. The numbers shift with the machine and its load, but the ratio of about 1.8 held across repeated runs. The higher frame count is because the work finished late and the measured window grew longer. It does not mean better responsiveness. Without splitting, the work finishes in 200 ms, but not a single frame is drawn during that time. `MessageChannel` finished the work within the same 200 ms while usually continuing to produce frames at about 60 fps.


## Conclusion

To summarize, what React needed was not an API that waits until the browser is idle, but one that lets it work briefly and immediately schedule its next turn. `requestIdleCallback` was not called as aggressively as React needed; the `requestAnimationFrame` approach had to guess when vsync would come; and `setTimeout` made each slice rest for more than 4 ms once nested. `MessageChannel` is what met those conditions.

How the units of work this Scheduler runs, the Fiber nodes, are structured and how the Work Loop traverses them is covered in [Mastering React Fiber](/250520). The next time you come across `MessageChannel` in React's source code, I hope you will take a moment to recall why it is there.


## References

:::ref
- [repo] [ReactDOMFrameScheduling.js in React 16.0.0](https://github.com/facebook/react/blob/v16.0.0/src/renderers/shared/ReactDOMFrameScheduling.js)
:::
