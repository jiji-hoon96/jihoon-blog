---
emoji: 🧮
title: 'Browser CPU and Memory'
seoTitle: 'Browser Main Thread and Memory: Long Tasks, LoAF, Profiling'
date: '2026-09-15'
updatedAt: '2026-09-19'
categories: observability frontend browser
description: 'What long tasks, TBT, LoAF, JS Self-Profiling, memory APIs, and crash reports show, checked with Lighthouse runs and response headers on this blog.'
keywords: 'browser main thread, long task 50ms, Long Animation Frames API, Total Blocking Time, JS Self-Profiling API, Sentry browser profiling, measureUserAgentSpecificMemory, browser memory leak'
locale: en
translationOf: '260915'
sourceHash: 0e13d01735f46e59f3fcf71c9705c6272c4d26f2acf754efcb3e6dd9472f337e
---

In this post, I want to talk about how to observe the browser's main thread and memory.

In [the previous post](/260914), I followed the network, rendering, and Web Vitals to look at the values the browser leaves behind about loading and interaction. But when you dig down to find why those metrics got worse, you usually land in one of two places. Either the main thread was busy with something else and could not handle input and rendering in time, or memory piled up until the page slowed down or eventually died.

These two areas are harder to observe than Web Vitals. Most of the APIs are Chromium-only, some only turn on when you change a response header, and some signals structurally cannot reach JavaScript at all. In the Sentry feature table of [the first post in this series](/260913), I deferred the decision on browser profiling to this post, and I work through its conditions here as well.

What I checked myself were two Lighthouse runs, the production response headers, and the installed `web-vitals` build files. To give the conclusion up front: this blog sees only the outline of its main thread through lab measurement, and it has no means of seeing memory or crashes.

## What a busy main thread means

The browser's main thread handles JavaScript execution, style calculation, layout, and user input in a single line. While one task runs, nothing else can cut in, so if the user presses a button in the meantime, the input event waits until that task finishes.

The threshold that cuts this wait is 50ms. The W3C [Long Tasks API specification](https://w3c.github.io/longtasks/) defines a task that occupies the main thread for more than 50ms as a long task (its introduction says "50ms or more", so the wording of the boundary differs slightly), and it also gives the reasoning. To respond to input within 100ms, the task running at the moment of input has to finish within 50ms, and the task that handles that input also has to finish within 50ms.

### TBT adds up the excess of long tasks

If you only count them, a 60ms task and a 600ms task look the same, so lab tools use Total Blocking Time (TBT). According to web.dev's TBT article, the blocking time of a single long task is the portion beyond 50ms, and TBT is the sum of the blocking times of long tasks after FCP. By default, Lighthouse only counts up to TTI (Time to Interactive).

![A figure showing five tasks on a main thread timeline, where the three that exceed 50ms have excess portions of 200, 40, and 105ms](1.png?w=720)

(Figure source: [web.dev, Total Blocking Time (TBT)](https://web.dev/articles/tbt), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), SVG converted to PNG on a white background)

The yellow part is the first 50ms of each task, and the red part is the blocking time. In the same article's example, the tasks run for 560ms in total, but TBT is 345ms. Tasks shorter than 50ms contribute nothing to TBT, no matter how often they occur.

### TBT cannot stand in for INP

TBT is a lab metric, and the responsiveness metric in Core Web Vitals is INP. web.dev's [INP article](https://web.dev/articles/inp) draws the line: in lab tools that only look at loading without interaction, TBT can be a reasonable proxy, but it is not a replacement.

That is because TBT does not know when the user pressed what. Even if the main thread is heavily blocked, INP can be low if the user presses after the scripts are done. A long task can raise INP along several paths. If the handler itself is long, processing duration grows; if the rendering after it is long, presentation delay grows. Of those, the path most directly tied to TBT is lengthening the input delay from the previous post by however much time remains in the task that was running at the moment of the press. So a low TBT only tells you "the main thread was not heavily blocked during loading." To know what actual input was blocked by, you have to look at tasks and frames in the field.

## Long Tasks and Long Animation Frames

There are two browser APIs for watching the main thread in the field: the Long Tasks API (`PerformanceLongTaskTiming`), available since Chrome 58, and the Long Animation Frames API (`PerformanceLongAnimationFrameTiming`, LoAF for short), shipped in Chrome 123. Both are subscribed to through :term[PerformanceObserver]{key="performance-observer"}.

### LoAF is an alternative, not a replacement

The Chrome team's LoAF article (source of the figure below) introduces LoAF as an "update" and an "alternative" to the Long Tasks API, and its FAQ answers that "at this time, there are no plans to deprecate the Long Tasks API." In MDN's compatibility data, `PerformanceLongTaskTiming` carries no deprecated mark either, both APIs are experimental, and Firefox and Safari support neither.

The reason a new API was needed is attribution. According to the same article, Long Tasks API attribution "at best only tells you the container", meaning whether it was the top-level document or some iframe, and it does not tell you which script spent the time.

LoAF reports as an entry not an individual task but **a frame whose rendering update was delayed by more than 50ms**. Even when several short tasks and rendering add up past the threshold, it gets caught.

### blockingDuration and script attribution

The LoAF field that connects directly to INP is `blockingDuration`. It adds up the portions of tasks within the frame that exceed 50ms, but for the longest task it includes the final rendering time. In the article's example, when a 20ms render follows 55ms and 65ms tasks, `duration` is about 140ms and `blockingDuration` is (55 - 50) + (65 + 20 - 50) = 40ms. It takes the idea behind TBT and moves it from the loading window to the frames of the entire page.

![A figure showing several long frames on a page timeline, with the frame that overlaps the interaction chosen as INP highlighted by a dotted line](2.png?w=720)

(Figure source: [Chrome for Developers, Long Animation Frames API](https://developer.chrome.com/docs/web-platform/long-animation-frames), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), resized)

A page produces many long frames, but the one that explains the INP value is the frame overlapping the INP interaction. That frame's `scripts` array holds, for each script that ran for more than 5ms, the invocation point, source URL, and execution time. The "who" that the Long Tasks API lacked appears here.

However, script attribution only applies to the main thread and same-origin iframes. Cross-origin iframes, workers, and extension code have no name even when they make a frame long. Work inside the utteranc.es comment iframe on this blog's post pages is not attributed even by LoAF.

### This blog does not collect LoAF

There is also a way to use LoAF without subscribing to it directly. `web-vitals` added "Add INP breakdown timings and LoAF attribution" in its [v4.0.0 (2024-05-13) changelog](https://github.com/GoogleChrome/web-vitals/blob/main/CHANGELOG.md), and later added the longest script (`longestScript`) and totals for script, layout, and paint time. But this only comes from the attribution build (`web-vitals/attribution`).

As covered in the previous post, this blog's `src/components/WebVitalsReporter.tsx` uses the standard build via `import('web-vitals')`. **It collects the INP value, but not which script that INP was blocked by.** In the installed `web-vitals@6.2.1`, the string `long-animation-frame` appears 0 times in `dist/web-vitals.js` and once in `dist/web-vitals.attribution.js`. The standard build does not register a LoAF observer at all. (This fact becomes important again in the memory section)

According to the [README](https://github.com/GoogleChrome/web-vitals#attribution-build), the attribution build is about 1.5K larger in brotli, but what made me hesitate was the destination more than the size. I have not checked whether this blog's traffic would produce a meaningful per-script distribution in GA4, so I decided to look at the lab first before expanding collection.

## Long tasks caught on this blog

So I ran a single post page in the lab. Lighthouse 12.8.2 (`npx lighthouse@12`), local Chrome headless, the default mobile form factor, simulated throttling (RTT 150ms, 1638.4kbps, 4x CPU slowdown), targeting `https://hooninedev.com/260914`, run twice 25 minutes apart on 2026-09-16.

| Item | Run 1 (08:46:15Z) | Run 2 (09:11:01Z) |
|---|---|---|
| Performance score | 0.92 | 0.93 |
| FCP, LCP | 2501ms | 2415ms |
| TBT | 40ms | 47ms |
| TTI | 5489ms | 5375ms |
| Total main thread work | 916ms | 1035ms |
| Of which Style & Layout | 343ms | 344ms |
| Of which Script Evaluation | 254ms | 292ms |

In both runs, the LCP element was not an image but the first paragraph (`div#post-content > p`), so FCP and LCP were identical, and the largest item on the main thread was Style & Layout rather than script.

![A timeline chart showing four long tasks in the same order across both Lighthouse runs: the document, a Next chunk, and two gtag tasks](3.png?w=720)

Both runs had four long tasks, in the same order: the document task (104ms, 122ms), one Next.js chunk (68ms, 69ms), and two tasks from `googletagmanager.com/gtag/js` (66ms and 56ms in run 1, 69ms and 59ms in run 2). The timings are on a timeline Lighthouse computed by assuming a 4x CPU slowdown, so they should not be read as absolute times on a real device.

TBT matches the excess of the three tasks after FCP exactly. Run 1 is (68 - 50) + (66 - 50) + (56 - 50) = 40ms, and run 2 is (69 - 50) + (69 - 50) + (59 - 50) = 47ms. A low TBT does not mean "there are no long tasks" but "the excess after FCP is small."

Next is where gtag sits. The root layout (`src/app/[lang]/layout.tsx`) loads gtag with `next/script` using `strategy="afterInteractive"`. So the two gtag tasks run back to back a little over 2.8 seconds after LCP, and the point where the last one ends is recorded as TTI. Rather than loading metrics, this is a spot that can overlap with **the input delay of an input pressed right after the page appears**. Still, this is inference on a lab timeline, and this blog does not collect what real users pressed at that moment.

And this is an n=2 lab measurement. Reproducing the same shape is only weak evidence that this structure is not a coincidence, and it cannot stand in for the distribution of real users' devices and networks.

Then how can we find out which function spent the time inside that 66ms gtag task?

## Sampling profilers

A profiler gives the answer at the function level. The JS Self-Profiling API aims to do the work of the DevTools Performance panel inside real users' browsers.

### JS Self-Profiling API

The WICG [JS Self-Profiling specification](https://wicg.github.io/js-self-profiling/) defines an API that lets web apps control the browser's sampling profiler. Its example is `new Profiler({ sampleInterval: 10, maxBufferSize: 10000 })`, which means capturing the call stack every 10ms and collecting up to 10,000 samples. Because it uses :term[sampling]{key="sampling"} instead of instrumenting every call, its overhead is small, but it can miss calls shorter than the interval. The specification removes stack frames of cross-origin scripts not permitted by CORS from the results. The internals of a script from another origin, like gtag, may stay invisible even with this API.

The specification is a WICG Community Group Draft, not on the standards track, and according to MDN's compatibility data `Profiler` works only in Chromium-based browsers from Chrome 94. And as [MDN](https://developer.mozilla.org/en-US/docs/Web/API/JS_Self-Profiling_API) notes, the document must be served with a Document Policy that includes `js-profiling`. That means the HTML response needs a `Document-Policy: js-profiling` header.

### Turning on the header has a cost too

During research I hit a point where documents disagreed. A change merged into the specification repository in January 2026 made `js-profiling` **deprecated** and defined `js-profiling-mode` (`eager`, `lazy`) in its place. Implementations should support `js-profiling` for backward compatibility (SHOULD) but may remove it (MAY).

According to the specification, `eager` (equivalent to the old `js-profiling`) prepares the profiling infrastructure during load, so it can affect FCP and LCP even if the profiler is never used. `lazy` defers that preparation until the first `Profiler` is created, but if that initialization happens while an interaction is being handled, it can affect INP. The specification is admitting that **a header turned on in order to measure can impose a cost on the very metrics being measured**. Sentry's documentation, on the other hand, still only mentions `Document-Policy: js-profiling` as of 2026-09-16. On ChromeStatus the `js-profiling-mode` entry is Proposed with no shipping milestone, but I have not directly checked whether Chrome implements it, so I cannot say which header you should use right now.

### Conditions for Sentry browser profiling

Sentry's [JavaScript profiling documentation](https://docs.sentry.io/platforms/javascript/profiling/) states the conditions clearly. Browser profiling is in beta, it uses the JS Self-Profiling API and therefore works only in Chromium-based browsers such as Chrome and Edge, and the server must send `Document-Policy: js-profiling`. It explicitly says that you cannot use it on hosting where you cannot change headers. The SDK requires `@sentry/browser` 10.27.0 or later and uses `browserProfilingIntegration()` with the session-level rate `profileSessionSampleRate`. The FAQ answers that it is normal for profiles to come only from Chrome users. The collected profiles should not be read as representative of all users.

Billing is in [UI Profile Hours](https://docs.sentry.io/pricing/quotas/manage-ui-profile-hours/), and in terms of bundle size, based on the gzip limits in the `sentry-javascript` repository's `.size-limit.js` (develop branch, checked 2026-09-16), adding Profiling to the 56 KB Tracing combination gives 59 KB.

### On this blog it is off in two layers

First, there is no browser SDK. This blog's Sentry is server-only, and there is no `src/instrumentation-client.ts`. That decision came from a 2026-08-04 measurement showing the client SDK adds 78.8 KB gzip to client JS (covered in the previous post).

Second, there is no header. The response I checked with `curl -sI https://hooninedev.com/260914` at 2026-09-16T09:10:42Z has no `document-policy`. The headers this repository attaches to HTML are the four in the `next.config.ts` `headers()` function: `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`, and those four show up in the response as well. (I had already measured in this repository that `public/_headers` applies only to static assets and does not reach HTML)

So turning on browser profiling for this blog is not a matter of one option. It means reversing the 78.8KB decision, attaching a header to every HTML response, and measuring anew the cost that header imposes on FCP, LCP, and INP. There is no evidence yet that the two gtag tasks seen earlier are a problem worth that cost.

## What measuring memory means

If CPU is about "what is blocking right now," memory is about "what accumulates over time," so you have to watch how it changes within a session. Yet the path for bringing this value in from the field is narrower than for CPU.

### performance.memory is non-standard

`performance.memory` is a "non-standard and legacy" property on [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory), and its compatibility data marks it deprecated and Chromium-only. Even what exactly "the heap" means has not been standardized.

### measureUserAgentSpecificMemory requires isolation

The alternative is `performance.measureUserAgentSpecificMemory()`. web.dev's [article on measuring page memory](https://web.dev/articles/monitor-total-page-memory-usage) says the measurement happens during garbage collection, so results arrive late, and recommends calling it at random intervals averaging 5 minutes. It is supported only in Chromium-based browsers from Chrome 89.

The decisive condition lies elsewhere. [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Performance/measureUserAgentSpecificMemory) states that the document must be a secure context and also **cross-origin isolated**. That means it has to be isolated with the `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers so that `window.crossOriginIsolated` is `true`.

The earlier `curl` response has neither header, so this API cannot be called on this blog. I also expect turning it on to cost more than the profiling header. With COEP enabled, cross-origin resources the page loads have to comply with that policy, and this blog loads the gtag script and the utteranc.es iframe. I have not turned it on to check whether these two actually break.

When the field is blocked, what remains is local reproduction with the DevTools Memory panel. It is the approach of using heap snapshots to find detached DOM trees, which the Chrome team's [memory problems documentation](https://developer.chrome.com/docs/devtools/memory-problems) lists as a common cause of leaks, but I have not done this on this blog.

### A leak created by observability code

The case I found most interesting in the memory story came from an observability library. The first line of the `web-vitals` v6.2.2 (2026-09-14) changelog is "Cap pending LoAFs to avoid memory leak".

According to the description in [issue #795](https://github.com/GoogleChrome/web-vitals/issues/795), the attribution build's `onINP` collects LoAF entries in `pendingLoAFs` to find LoAFs that overlap INP. The cleanup criterion, the timestamp of "the most recently processed event," only moves forward when there is user input, so on pages watched for a long time without input, such as video playback, LoAFs just kept piling up. [The fix, PR #796](https://github.com/GoogleChrome/web-vitals/pull/796), applied the cap `MAX_PENDING_FRAMES` (10), already used for the event group list, to the LoAF list as well, so that unless a frame overlaps an INP candidate, only the most recent 10 are kept.

This blog is on 6.2.1. Does it carry this leak? It does not. The only source file the PR changed is `src/attribution/onINP.ts` (the rest are test files), and as seen earlier, this blog's standard build has no LoAF observer. **The same decision not to collect LoAF attribution had also been closing off the path to this leak.** That does not lead to the conclusion "so don't collect it." The point is that the cost of observability code sometimes only surfaces in a changelog, and that switching to the attribution build presupposes 6.2.2 or later.

## When the browser dies

If memory runs all the way out, the page dies. The signal left at that point is the Reporting API's crash report.

### The shape of a crash report

The WICG [Crash Reporting specification](https://wicg.github.io/crash-reporting/) defines the report type `"crash"`, and states of itself that it is neither a W3C standard nor on the standards track. The body's `reason` includes `oom`, meaning the page ran out of memory, and `unresponsive`, meaning it was terminated for not responding. Delivery goes to the endpoint named in the `Reporting-Endpoints` header under `crash-reporting` if there is one, otherwise to `default`, and if neither exists, nothing is sent.

### JavaScript cannot receive it

The key property of this signal is in one sentence of the specification.

> Crash reports are not observable to JavaScript, as the page which would receive them is, by definition, not able to.

The page that would need to receive the report has already died from that very crash, so by definition there is no way for JavaScript to observe it. The browser simply POSTs to a server endpoint from outside the page.

What this means for browser SDKs can be seen in code. In `sentry-javascript`, the [`reportingObserverIntegration` source](https://github.com/getsentry/sentry-javascript/blob/develop/packages/browser/src/integrations/reportingobserver.ts) includes `'crash'`, `'deprecation'`, and `'intervention'` in its default subscribed types and even has a `report.type === 'crash'` branch. But this integration uses a `ReportingObserver` inside the page, so if the specification holds, there is no path by which that branch runs on a real OOM crash. That said, this is my inference drawn from the specification, and I have not caused a crash to verify it.

On the server side, could Sentry be the destination of `Reporting-Endpoints`? [getsentry/sentry#38940](https://github.com/getsentry/sentry/issues/38940), which requested this feature, was opened on 2022-09-15 and was still open when I checked on 2026-09-16. What is available today goes only as far as running your own endpoint and relaying to Sentry.

### Crashes on this blog are not recorded

The earlier `curl` response has no `reporting-endpoints` header either. Under the specification's delivery rules, if there is no endpoint, the report is not sent. Even if someone's tab died from running out of memory while reading this blog, that fact is left nowhere. Regardless of whether Sentry supports it, it is because I never declared a place to receive it.

Since these are pages for reading long static posts, I have no plans to change this right away. Still, I want to note that "there are no crashes" and "there is no means to see crashes" look like the same empty screen on a dashboard.

## Observation that opens only under conditions

Observing the browser's CPU and memory mostly **opens up only when conditions are met**. Long tasks and LoAF come only from Chromium, and LoAF's script attribution cannot see cross-origin iframes. Sampling profilers require a `Document-Policy` header, whose name is changing in the specification, and the header itself can impose a cost on metrics. The memory measurement API requires cross-origin isolation, and crash reports require a server endpoint outside JavaScript.

This blog has turned on none of those conditions. That state is not neglect but the accumulated result of the 78.8KB decision, the standard build, and the choice not to add headers, and among those, the standard build also ended up avoiding the web-vitals LoAF leak. The fact that expanding observability also means shipping code that has a cost onto the page is especially clear in this area.

Every number in this post came from the lab or from my own local checks. What field data collected from real users means once it leaves the browser, in CrUX, Search Console, and search, is something I plan to continue in [the next post](/260916).

:::ref
- [docs] [MDN, PerformanceLongAnimationFrameTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongAnimationFrameTiming)
- [docs] [web.dev, Optimize Interaction to Next Paint](https://web.dev/articles/optimize-inp)
:::
