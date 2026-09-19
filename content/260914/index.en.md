---
emoji: 🔭
title: 'Browser Observability'
seoTitle: 'Browser Performance: Web Vitals and Soft Navigations'
date: '2026-09-14'
updatedAt: '2026-09-19'
categories: observability frontend browser RUM
description: 'Browser signals without an SDK: Performance Timeline, network phases, how LCP, INP and CLS are computed, reportSoftNavs, and what this blog sends to GA4.'
keywords: 'browser performance monitoring, PerformanceObserver, how Web Vitals are calculated, measure INP, CLS session window, Soft Navigations API, web-vitals reportSoftNavs, Timing-Allow-Origin resource timing'
locale: en
translationOf: '260914'
sourceHash: 31357b878e6fcf1696f6857ad01e283de331eed4a4cc90499357879e3b6ba6c9
---

In this post, I want to talk about browser observability.

In the [previous post](/260913), I wrote about attaching Sentry, which I have used at work for years, to this blog and going back over its features. But that setup has one conspicuous gap. I attached Sentry only to the server and never turned on the browser SDK.

The reason was bundle size. That did not mean I intended to stop looking at what happens inside the browser. Even without an SDK, the browser records a great deal about loading and rendering on its own.

So the question of this post is this. **Without an external SDK, what can you see from the loading and rendering signals the browser reports by itself inside the page?** I will go through network phases, the calculation rules of Web Vitals, and the page boundary that blurs in an SPA, and at the end I will write down what this blog actually sends and what it does not. (CPU and memory belong to the next post, and how the collected values connect to CrUX and search belongs to the last one)

## Why I did not turn on the browser SDK

Let me first record the basis for the decision. I changed the Sentry configuration and compared the gzip total of `.next/static/chunks/*.js` on clean builds.

| Configuration | client JS (gzip) | Increase |
|---|---|---|
| No Sentry | 181.6 KB | Baseline |
| **Server only (current)** | **182.3 KB** | **+0.7 KB** |
| Server only + `captureException` call in the error fallback UI | 186.0 KB | +4.4 KB |
| Client + server | 260.4 KB | +78.8 KB |

This table was measured on 2026-08-04 against Next 16.1.4. Server instrumentation was practically free, while browser instrumentation demanded 78.8KB. I also tried turning on `bundleSizeOptimizations.excludeTracing`, but the number did not move, and the only way to remove the cost was not to have the browser initialization file (`src/instrumentation-client.ts`) at all. The third row follows the same logic. Without the browser SDK, `captureException` in the fallback UI does nothing, yet the SDK code still ships in the bundle. So I removed the call itself.

I also measured the current state again. Measuring the same way on 2026-09-16 gave 206.1KB. That is 23.8KB above the baseline, but in the meantime Next moved up to 16.3.4 and the soft navigation reporting covered later in this post was added. The Sentry configuration is still server only, so this increase is not caused by Sentry. I don't know how much each of the two accounts for, because I did not rebuild at each commit.

On this blog, loading performance is the visitor experience, and the one paying about 79KB is not me but the visitor. I judged that browser errors on a personal blog would not pay that cost back. Once you decide that, though, you have to look at the browser side some other way. The starting point is the record the browser is already keeping.

## The record the browser keeps

When a page opens, the browser creates several kinds of :term[PerformanceEntry]{key="performance-entry"}. The W3C [Performance Timeline](https://www.w3.org/TR/performance-timeline/) is the common frame for reading these entries on a single timeline. Even if the developer does not mark a start and an end like a stopwatch, the browser already knows about events such as document navigation, resource requests, paints, and input.

| What is observed | entry type | Question it can answer |
|---|---|---|
| Document navigation | `navigation` | Where did the time go among DNS, connection, response, and DOM processing? |
| Images, scripts, CSS | `resource` | Which resource was late, and how large was the transfer? |
| Display | `paint`, `largest-contentful-paint` | When did the first screen and the main content become visible? |
| Layout changes | `layout-shift` | When did the screen being viewed move? |
| User input | `event` | How long did it take after input until the next frame was painted? |
| Application phases | `mark`, `measure` | How long did work defined by the service itself take? |

`long-animation-frame`, which looks at frames that held the main thread for a long time, belongs to the same frame, but that is a CPU story, so I cover it in the next post.

The standard interface that receives these records is :term[PerformanceObserver]{key="performance-observer"}.

```ts
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(entry.entryType, entry.startTime, entry.duration)
  }
})

observer.observe({ type: 'resource', buffered: true })
```

The code is short, but a few conditions are hidden in it. According to MDN's [`observe()` documentation](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver/observe), `buffered` must be used together with `type`, and cannot be combined with `entryTypes`, which receives several types at once. Collection scripts usually run well after the page has progressed, so if you register without `buffered`, you will not receive the LCP candidates or resource records created before that.

Also, a type the browser does not support is ignored without an exception, and according to the same document, at most a console warning may be left behind. Unless you check with `PerformanceObserver.supportedEntryTypes`, you cannot tell **there being no entries** apart from **it being a browser that never creates those entries**. An empty stretch on a dashboard may be a difference in browser mix rather than a performance problem.

## What network time is made of

A slow page is often translated into a network problem. But a single `duration` cannot separate the causes. The `navigation` entry (`PerformanceNavigationTiming`) and the `resource` entry (`PerformanceResourceTiming`) split a single request into several timestamps.

| Phase | Calculation | Where to look if it is large |
|---|---|---|
| DNS | `domainLookupEnd - domainLookupStart` | The DNS layer |
| Connection and TLS | `connectEnd - connectStart` | Connection reuse, TLS negotiation |
| Until first byte | `responseStart - requestStart` | Server processing and round-trip latency |
| Body transfer | `responseEnd - responseStart` | Response size and transfer speed |

The W3C [Navigation Timing](https://www.w3.org/TR/navigation-timing-2/) specification has a diagram showing the order in which these timestamps are recorded. If the phase names are unfamiliar, looking at that diagram once is faster than reading the table.

One trap is cross-origin resources. Under the W3C [Resource Timing specification](https://www.w3.org/TR/resource-timing/), for a resource from another origin, detailed timestamps such as DNS, connection, and the start of request and response are hidden as 0 unless the serving server allows them with the `Timing-Allow-Origin` response header. If an external CDN image seemed slow and you opened it up only to find DNS and connection all at 0, it was not fast; you simply did not have permission to see. **In this area, 0 may not mean fast.** Some values inflate instead. Take `responseEnd`, which is not masked, minus the zeroed `responseStart`, and you get not the body transfer time but the time from page start until the response ended. The same specification sets separate conditions for size fields too. `encodedBodySize` and `decodedBodySize` are 0 when the response is cross-origin without passing CORS, and `transferSize` is affected by both `Timing-Allow-Origin` and CORS.

This blog's time to first byte is not negligible either. On 2026-09-16, when I requested two posts and the home page once each with `curl` from one location in Korea, `time_starttransfer` ranged from 0.95 to 2.43 seconds (a value that includes DNS, connection, and TLS time), and the response headers showed a Netlify Durable cache hit and an edge cache miss. With only three samples I will not generalize, but it is on the same scale as the 798ms TTFB in the measurement later in this post. Only with this kind of phase breakdown can you choose, when LCP is late, whether to shrink the image or bring document arrival forward.

## How Web Vitals are calculated

If network phases are the raw material, :term[Web Vitals]{key="web-vitals"} are metrics that put calculation rules on top of them. The Core Web Vitals defined by Google's Web Vitals documentation are three, LCP, INP, and CLS, and the thresholds for good are LCP at 2.5 seconds, INP at 200ms, and CLS at 0.1 or below.

![Good, needs improvement, and poor ranges for the three metrics LCP, INP, and CLS. The boundaries are 2.5 and 4.0 seconds for LCP, 200ms and 500ms for INP, and 0.1 and 0.25 for CLS](1.png?w=720)

(Figure source: the three threshold figures from [web.dev, Web Vitals](https://web.dev/articles/vitals) joined side by side, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/))

None of the three metrics is a timestamp the browser records once. A value only emerges after interpreting multiple entries and the page lifecycle. If you do not know this, then when the values from your own collection code disagree with a library or tool, you cannot judge which one is right.

### LCP keeps changing its candidate

According to the [LCP documentation](https://web.dev/articles/lcp), the browser dispatches a new `largest-contentful-paint` entry every time a larger content element is painted. If text is painted first, a `<p>` becomes the candidate, and if a large image loads later, it switches to `<img>`. And the moment the user taps, scrolls, or presses a key, it stops reporting new entries. So LCP is not the first entry but the last valid candidate reported before input, and deciding that finalization point becomes the job of the collection code.

### INP adds up three phases of an input

web.dev's INP documentation splits a single interaction into three phases. The input delay from when input arrives until the event handler starts, the processing duration during which the handler runs, and the presentation delay until the next frame is shown on screen.

![How a single input is processed on the main thread. A blocking task creates input delay, the pointerup, mouseup, and click handlers make up processing duration, and the time through render and paint until the frame is presented is presentation delay. Below paint, compositing, GPU, and raster work follow](2.png?w=720)

(Figure source: [web.dev, Interaction to Next Paint (INP)](https://web.dev/articles/inp), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), converted to a PNG with a white background)

What to notice in this figure is that a gray blocking task is already running at the moment the user presses. No matter how fast the handler code is, if other work holds the main thread just before the input, INP gets worse. (Finding what that other work is, is the topic of the next post)

A page's INP is close to the slowest of the interactions observed during a single visit. The same document explains that the single largest value is ignored for every 50 interactions. So on a visit with fewer than 50 interactions, the one slowest interaction is the INP.

### CLS counts shifts in groups

The [CLS documentation](https://web.dev/articles/cls) defines CLS not as the sum of all shifts over the page's lifetime but as the score of the largest burst. If the gap between shifts is under 1 second they are grouped into the same session window, and one window lasts at most 5 seconds. Of those windows, the one with the largest total score becomes the CLS. The rule exists so that small shifts in a tab left open for a long time do not accumulate endlessly.

You can implement the rules of the three metrics yourself. But getting the boundary conditions right, down to when a tab is hidden and when a page is restored, is hard. Google's [`web-vitals`](https://github.com/GoogleChrome/web-vitals) library is not a tool that passes entries through as they are, but an implementation that applies these lifecycle rules on top of the standard APIs. This blog uses it too.

But all of these rules assume a unit called "one page". What happens when that unit blurs?

## The blurred page boundary

In a traditional navigation, the browser knows where a document starts. In an SPA's client-side navigation, the URL and the screen change but no new document is created. From the browser's point of view it is one first load stretching on, so the second screen, reached by going from the list into a post, has no LCP of its own.

Until now, RUM tools and frameworks have each defined a "new screen" with their own heuristics. The Chrome team has brought this judgment into the browser with the [Soft Navigations API](https://developer.chrome.com/docs/web-platform/soft-navigations). When user input, a URL change, and a screen paint happen together, the browser creates a `soft-navigation` entry. The feature has been on by default since Chrome 151, and Chrome 151's stable release date is [2026-07-28](https://chromiumdash.appspot.com/fetch_milestone_schedule?mstone=151). `web-vitals` has also reported metrics per soft navigation through the `reportSoftNavs` option since 6.0. According to the README, this reporting works only on Chromium 151 and later, and in other browsers turning on the option does not change how reporting works.

### Values measured with reportSoftNavs on

This blog also goes from the post list into a post through Next.js's `Link`. On 2026-09-14, after upgrading `web-vitals` to 6.2.1 and turning on `reportSoftNavs` (`cc21a0d`), I attached over CDP to a headless Chrome that had opened the production page and looked directly at the requests going out to GA4. These were the values sent in one session.

| Metric | Value | `navigationType` |
|---|---|---|
| TTFB | 798ms | `navigate` |
| FCP | 1680ms | `navigate` |
| LCP | 1680ms | `navigate` |
| FCP | 542ms | `soft-navigation` |
| TTFB | 0ms | `soft-navigation` |

The table has no CLS for the list page because I could not confirm it. That value should have been reported once at the moment of the first soft navigation, even at 0, because the `web-vitals` reporting function sends 0 too if it is the first report. I think the capture most likely ended before GA4's batched send, but I did not verify it.

The transition from the list into a post was captured as a separate experience, as intended. But this table also shows why it does not end with a single option. **The TTFB of a soft navigation is 0.** No document was ever requested from the server, so it is exactly the value the README describes, but if this 0 piles up in the same event as the first load's 798ms, the TTFB average quietly drops without any code changing. So I changed the code to also send the `navigationType` that comes with each metric as a GA4 parameter. Add one unit of observation, and the dimensions needed to tell it apart grow along with it.

Measuring taught me two more things. One is that a soft navigation **requires real user input**. When I called `click()` from a script inside the page, no `soft-navigation` entry was created even though the URL changed and the screen updated, and it was only captured after I sent a coordinate click with CDP's `Input.dispatchMouseEvent`. To verify this feature with test automation, you have to send browser-level input events rather than calling the DOM's `click()`.

The other is that the places on this blog where soft navigations happen are narrower than I thought. The links in the list and the header are `Link`, so they are client-side navigations, but **internal links inside a post body are plain `a` tags generated from Markdown, so they are full page loads**. Even within the same site, some moves are soft navigations and some are not.

### When the first page's metrics get cut off

After measuring, I reread the README and found a sentence I had missed.

> Note that this will change the way the first page loads are measured as the metrics for the initial URL will be finalized once the first soft nav occurs.

With the option on, the first page's metrics are finalized at the moment of the first soft navigation. INP and CLS are metrics normally observed until the user leaves the page, but now the observation of the list page ends the moment the user clicks a post link in the list, and INP and CLS for the new screen start again from 0. The same README says LCP and FCP also count only elements newly painted after the soft navigation. Elements that stay in place across screens, like the header, cannot become candidates for the new screen.

So the distribution of first-load metrics can differ before and after turning on the option. If INP improved at a deployment on the same site, it may not be that the code got better but that the observation window got shorter. Because it behaves this way only on Chromium 151 and later, differences between browsers appear as well.

This one sentence affects interpretation more than the values in the table. I should have known about this difference before measuring.

### A bfcache restore is also a new experience

There is one more path that blurs the page boundary. :term[bfcache]{key="bfcache"} restores a whole page from memory on back and forward navigation. web.dev's [bfcache article](https://web.dev/articles/bfcache) says that in Chrome usage data, 1 in 10 navigations on desktop and 1 in 5 on mobile are back or forward. A restore is not a new load, so in collectors that do not count restores separately, repeat visits that would have been the fastest drop out of the load distribution, and the collected distribution can lean toward slow even though the real experience improved. The same article recommends looking at metrics like TTFB split by navigation type. `web-vitals` 6.2.1, by contrast, does not drop restores. Opening the installed code shows that on a restore it reports TTFB anew as 0, starts FCP, LCP, CLS, and INP over as new metrics, and sets `navigationType` to `back-forward-cache`. So this blog's TTFB mixes in not only the 0 from soft navigations but also the 0 from bfcache restores. Fortunately, the parameter added for soft navigations tells both apart.

## What this blog actually sends

Translated into this blog's code, everything so far is a single `src/components/WebVitalsReporter.tsx`. A client component dynamically loads `web-vitals`, registers LCP, INP, CLS, FCP, and TTFB, and sends them to GA4 as one event called `web_vitals`. The installed version is 6.2.1 according to the lockfile.

| Parameter | Content |
|---|---|
| `event_label` | Metric name (`LCP`, `INP`, etc.) |
| `value` | Metric value rounded to an integer. Only CLS is multiplied by 1000. GA4 accepts non-integer values, so this is not required; it has the same shape as the integer convention in examples from the Universal Analytics era |
| `metric_id` | An id identifying one metric within one page lifetime. When the same metric is reported again, it is grouped by this value |
| `metric_rating` | good, needs-improvement, or poor as judged by the library |
| `metric_navigation_type` | `navigate`, `soft-navigation`, `back-forward-cache`, etc. |
| `page_location` | URL of the screen the value measured (overridden only when `navigationURL` exists) |

The `page_location` row was added on 2026-09-16 (`597ca5b`). As the previous section showed, when a soft navigation happens, the list page's CLS and INP are finalized and reported only after the URL has changed. The `web-vitals` code, too, force-reports the previous screen's CLS and starts a new metric the moment it receives a `soft-navigation` entry. gtag attaches the URL at the time of sending to the event, so without the override, the list page's values get recorded under the post URL. That is also why the README's GA4 example includes `page_location: navigationURL`. This blog originally sent only `navigationType`, so in GA4 data collected before the fix, the list page's CLS and INP may be attached to post URLs.

It is a :term[RUM]{key="rum"} setup layered on the GA4 I was already running, with no separate collection server. If loading the module itself fails, it leaves a single `web_vitals_unavailable` event. That failure happens right after a deployment when old HTML requests a chunk that no longer exists, and since there is no browser Sentry, without this event collection could stop entirely and leave no trace.

What it does not send is just as clear. Because it uses the standard build of `web-vitals` rather than the attribution build, it does not collect which element was the LCP element, how long each of the three INP phases took, or which element pushed the layout. Recalling the INP figure from earlier, this blog knows only the sum of the three phases, not which phase was long. And JS errors that occur only in the browser are not recorded anywhere. That is the price of saving about 79KB.

Whether these values can actually be split out and read in GA4 is covered in the final post. Sending something and being able to read it split out are different problems.

## The boundary to check before the numbers

To sum up, even without turning on a browser SDK, the browser is already recording network phases, paints, layout shifts, and input delay. `PerformanceObserver` is the entrance for reading that record, and Web Vitals are metrics that put calculation rules on top of it, such as candidate updates, the sum of three phases, and session windows.

And these calculation rules assume a unit called a page. Turning on soft navigation gives new screens their own metrics, but in exchange the first page's observation window gets shorter, 0 gets mixed into TTFB. bfcache restores also mix into TTFB as 0 (and depending on the collector, drop out entirely). What I newly understood this time is that a single option changes not only the values but **what counts as one experience**. So before comparing numbers, you first have to see at which boundary those numbers were cut.

That said, this post only went as far as the sum of the three phases. What work was holding the main thread when an input arrived, and how much memory a page left open for a long time uses, require other APIs. I plan to continue that story in the next post, [Browser CPU and Memory](/260915).

:::ref
- [docs] [W3C, Event Timing API](https://www.w3.org/TR/event-timing/)
- [docs] [web.dev, Debug performance in the field](https://web.dev/articles/debug-performance-in-the-field)
- [docs] [WICG, Soft Navigations explainer](https://github.com/WICG/soft-navigations)
:::
