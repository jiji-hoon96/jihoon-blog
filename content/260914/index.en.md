---
emoji: 🔭
title: 'Browser Observability'
seoTitle: 'Frontend Browser Observability: PerformanceObserver, Web Vitals, RUM'
date: '2026-09-14'
categories: observability frontend browser RUM
description: "A three-stage map of browser observability, from the Performance Timeline and how Web Vitals are computed to the design criteria for RUM. Includes what I measured while adding web-vitals collection to my blog, and why I gave up 79KB of client instrumentation."
keywords: 'frontend observability, browser performance monitoring, PerformanceObserver tutorial, measuring Web Vitals, real user monitoring setup, LCP INP CLS explained, web-vitals GA4, Soft Navigations API'
locale: en
translationOf: '260914'
sourceHash: 8b1ddfa951db604b5f16fc4dc56013d11f88263aacd5ddff5102a8a3f2fc7be5
---

In this post, I want to talk about browser observability.

While adding code to this blog that collects the performance visitors actually experience, I learned that my browser-side knowledge, which I had believed to be familiar ground, was shallower than I thought. I have long opened the Performance panel in DevTools and run Lighthouse. But continuously collecting what real users went through changes the question. You have to know when the browser produces which values, what those values include, and why, under some conditions, they are not produced at all.

This knowledge does not live in one document. It is scattered across several specifications, such as `Performance Timeline`, `Navigation Timing`, `Resource Timing`, `Paint Timing`, and `Event Timing`, and Web Vitals layers its own computation rules on top. Once SPA screen transitions, page state restoration through :term[bfcache]{key="bfcache"}, background tabs, and iframes enter the picture, different tools report different numbers for the same page. (When a value differed from my expectation, the place I got stuck longest was telling whether the site was slow or the measurement rules were responsible)

So this article widens the scope of observation in three stages: the events the browser left behind, the experience the user perceived, and the distribution across the real user population. In between, I also lay out the values this blog actually collects, and, in the opposite direction, a decision not to expand observation. The depth of browser observability is not determined by how many APIs you use. Only when you distinguish raw material, metrics, and distributions, and along the way record the users who were left out and the conditions that distort values, do observed numbers become information you can use for judgment.

## Signals the browser leaves behind

When a web page opens, the browser internally creates several kinds of :term[PerformanceEntry]{key="performance-entry"}. The W3C's [Performance Timeline](https://www.w3.org/TR/performance-timeline/) is the common foundation that lets these items be handled on a single timeline.

The important point is that developers do not have to mark start and end themselves like a stopwatch. The browser already knows about events such as document navigation, resource requests, paints, and user input. The starting point of frontend observability is reading this internal record.

| What is observed | Representative entry | Question it can answer |
|---|---|---|
| Document navigation | `navigation` | Where the time went among DNS, connection, TLS, response, and DOM processing |
| Images, scripts, CSS | `resource` | Which resources were late, and what their cache status and transfer sizes were |
| Screen rendering | `paint`, `largest-contentful-paint` | When the first screen and the main content became visible |
| Layout changes | `layout-shift` | When the screen the user sees moved, and because of what |
| User input | `event` | Where the delay came from between input and the browser painting the next frame |
| Long rendering work | `long-animation-frame` | Which scripts and rendering stages consumed time within one frame |
| Application spans | `mark`, `measure` | How long the operations your service defines took |

This table makes clear that browser observability is not simply measuring page load time. Network, main thread, rendering pipeline, and user input can be placed on the same timeline.

But each entry is not a finished conclusion. It is closer to raw material the browser provides.

## Collecting performance entries

The standard interface for receiving this raw material in real time is :term[PerformanceObserver]{key="performance-observer"}.

```ts
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    sendPerformanceEntry(entry)
  }
})

observer.observe({ type: 'resource', buffered: true })
```

The code is short, but several important conditions hide in it.

First, as MDN's [`observe()` documentation](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver/observe) explains, `buffered` must be used together with `type`. It cannot be combined with `entryTypes`, which receives several types at once. If you need the LCP candidates or resource records created before your initial script ran, this difference decides whether you lose data.

Second, entries the browser does not support can be silently ignored. A collector must therefore check `PerformanceObserver.supportedEntryTypes`. If you assume that values visible in the latest Chrome will also arrive in every Safari and Firefox, you will misread the empty stretches of your dashboard as performance problems.

Third, entries have buffer limits. If observation code starts late, or in applications that request a very large number of resources, older items can be pushed out of the buffer. Just as "there were no errors" differs from "we received no errors", you must distinguish "there is no entry" from "no entry was created".

The observation code itself also runs on the main thread. If you serialize large objects inside the callback and fire network requests immediately, the code measuring the user experience can degrade the user experience. This is why you have to separate collection from transmission, normalize only the properties you need, and design batching and sampling.

## What makes up network time

"The page is slow" is often translated first into a network problem. But looking at `duration` alone makes it hard to tell causes apart.

`PerformanceNavigationTiming` and `PerformanceResourceTiming` contain several boundaries around a request. DNS lookup, TCP connection, TLS negotiation, request send, first byte, and response completion can be examined separately. You can also check whether the browser went through a Service Worker, how much the transferred size differs from the decoded size, and whether a resource blocked rendering.

This breakdown changes the response.

- If `domainLookupEnd - domainLookupStart` is large, look at the DNS layer.
- If `connectEnd - connectStart` is large, look at the connection and TLS.
- If `responseStart - requestStart` is large, suspect server processing and network round trips together.
- If `responseEnd - responseStart` is large, look at response size and transfer speed.
- If `transferSize` is 0, check for cache reuse, but also consider cross-origin exposure restrictions and browser implementation conditions.

However, detailed timings for cross-origin resources are hidden by default. As the W3C's [Resource Timing specification](https://www.w3.org/TR/resource-timing/) explains, some detailed values are exposed only when the serving server allows it with the `Timing-Allow-Origin` response header. Even if a CDN or an external image seems slow, the timings can appear as 0 inside the browser.

So in RUM data, 0 does not always mean fast. It can be a value hidden for permission reasons.

## Interpreting Web Vitals

LCP, INP, and CLS, the metrics included in :term[Web Vitals]{key="web-vitals"}, are not timestamps the browser simply recorded once. They are user-centric metrics built by interpreting several entries and the page lifecycle.

LCP updates each time the candidate for the main visible content changes. INP observes the clicks, taps, and keyboard interactions across the page's lifetime, then picks one value close to the slowest as the representative. When interactions exceed 50, some extreme values are excluded, but on most pages the slowest interaction becomes INP. CLS does not add every shift indefinitely; it selects the largest among session windows grouped by fixed time gaps.

You can compute these yourself, but matching the boundary conditions, down to the moments the page is hidden or restored, is hard. Google's [`web-vitals`](https://github.com/GoogleChrome/web-vitals) library is not a tool that passes browser entries through as they are; it is an implementation that applies this lifecycle handling and per-metric computation rules on top of the standard APIs.

One step deeper, a problem appears: scores alone are not enough. You learned that LCP was 4 seconds, but if you do not know which element and which resource produced that value, you cannot find what to fix. The `web-vitals/attribution` build adds information closer to causes, such as the LCP element, INP's event target and processing phases, and the elements that contributed to CLS.

In other words, observation deepens through three stages.

1. Collect the metrics.
2. Find the distribution of slow users and environments.
3. Attribute the metric to the elements, scripts, and requests that produced it.

The first stage alone produces a report; only when you reach the third stage do you get information you can act on.

## Lab and real users

Lighthouse and DevTools are good for repeatedly measuring the same page under controlled conditions. They are useful for catching regressions before deploying code, or for analyzing a specific profile in depth. But they cannot show which devices and networks real users were on, or how they interacted.

:term[RUM]{key="rum"}(Real User Monitoring) collects values in real visitors' browsers. Google's [Web Vitals documentation](https://web.dev/articles/vitals) recommends evaluating Core Web Vitals at the 75th percentile of page visits and looking at mobile and desktop separately. A single average can erase the population of slow users.

INP in particular can only be computed when there is real input. Lighthouse, which has no users, uses TBT as a proxy metric instead of INP. The two are related, but they are not the same value.

Chrome UX Report (CrUX) is also RUM, but its character differs from a service's internal RUM. The [CrUX API](https://developer.chrome.com/docs/crux/api) provides aggregated field data from Chrome users at the page or origin level. It is good for comparing against industry baselines, but it cannot show a specific release, user flow, or application state alongside.

Conversely, your own RUM lets you attach whatever context you want, but you carry the responsibility for sample bias and implementation mistakes yourself. If ad blockers block collection requests, or you exclude users who did not consent, or a particular browser does not support an API, the observed users diverge from the whole user population.

My blog is a small example of that choice. On this blog, a single client component called `WebVitalsReporter` dynamically loads `web-vitals`, measures LCP, INP, CLS, FCP, and TTFB, and sends them to GA4 as a single event named `web_vitals`. Metric names are distinguished with `event_label`, and `metric.id` is included so that values updated within the same page lifetime are not counted twice. Because the value of a GA4 event is an integer, CLS is multiplied by 1000 and rounded. It is a setup layered on the GA4 I was already running, with no separate collection server, so the screens fall short of a dedicated RUM product, but it was enough to see distributions by page and device. Of course, it inherits all of the biases above as well. If an ad blocker blocks the GA request, that visitor drops out of my distribution.

Neither of the two is the correct answer; they answer different questions.

- Did this change get slower, before deploying: lab data
- Where are real users' slow spots: your own RUM
- Where does this origin stand on the public web: CrUX

If you choose your own RUM, the next question is what to count as one page experience. Only once that boundary is set can the collected values and context be designed consistently.

## The blurred page boundary

In traditional navigation, the browser knows where a document starts and ends. In an SPA's client-side navigation, the URL and the screen change but no new document is created. From the browser's point of view, it easily remains one long page lifetime.

To solve this problem, each RUM tool and framework has used its own heuristics. But every implementation defined a "new screen" differently, which made comparison hard. Through the [Soft Navigations API](https://developer.chrome.com/docs/web-platform/soft-navigations), the Chrome team has been pushing toward the browser recognizing a soft navigation directly, by tying together user input, URL change, and screen updates.

This API ships by default starting with Chrome 151, released in August 2026. The `web-vitals` library also began supporting metric reporting per soft navigation with the `reportSoftNavs` option in 6.0. However, it still works only in Chromium-based browsers, and Firefox and Safari have no corresponding implementation, so it cannot immediately replace existing route instrumentation. My blog also moves between posts with Next.js client-side navigation, and while the collection code was based on 5.x, those transitions were not captured as separate page experiences. While writing this article I upgraded to 6.2.1 and turned on `reportSoftNavs`. It did not end with one option, though. If values from soft navigations and values from the initial document load mix into the same slot in GA4, you cannot tell what the distribution means, so I had to change the code to send the `navigationType` that arrives with each metric as an event parameter. Add one more observation and the dimensions needed to distinguish it grow along with it. The more important fact this case shows is that measuring SPA performance is not simply a library configuration problem but a question of **who defines the boundary of a page**.

Once the page boundary is set, you can also decide the unit at which to store route, metric id, and session context. Now let's carry that question over to the RUM data model.

## The RUM data model

The code that sends values with `navigator.sendBeacon()` is not long. What is hard is controlling cost and :term[cardinality]{key="cardinality"} without losing the questions you will want to answer later.

At minimum, you end up considering the following context together.

| Context | Why it is needed |
|---|---|
| Page and route | Tell slow screens apart |
| Release and commit | Find the deployment that introduced a regression |
| Navigation type | Distinguish new navigations, reloads, and bfcache restores |
| Device and connection | See how distributions differ by environment |
| Metric id | Avoid counting values updated within the same page lifetime twice |
| Session and trace id | Connect behavior, errors, and server requests |
| Visibility state | Filter out values distorted in background tabs |

If you indiscriminately attach full DOM selectors, full URLs, and user IDs on top of this, analysis looks easier but cost and privacy risk grow. Dynamic URLs explode cardinality, and selectors and network bodies can carry personal information.

More observability data is not automatically better. **It is better not to collect attributes that do not connect to a decision you will make later.**

## Options for collection and storage

You do not need to build browser observability from scratch.

- `web-vitals` provides Core Web Vitals computation and attribution.
- [Boomerang](https://github.com/akamai/boomerang) is a long-standing open source RUM collector that offers many performance plugins and beacon transport options.
- [Grafana Faro Web SDK](https://grafana.com/docs/grafana-cloud/monitor-applications/frontend-observability/) collects performance, errors, logs, and traces in the browser and connects them to backend observability.
- OpenTelemetry JavaScript can produce browser traces, but the [official documentation](https://opentelemetry.io/docs/languages/js/) still marks browser client instrumentation as experimental.

When choosing a tool, look at the scope you will own before the number of features. The choice differs depending on whether you will only use the SDK, also operate the collection endpoint and storage, or take responsibility all the way to privacy deletion and retention policies.

With SaaS, the operational burden shrinks; running an open source stack yourself gives you finer control over the data path and cost model. Neither comes for free.

## The decision to give up 79KB

Since cost came up, let me record one decision I actually made on this blog. This blog's error instrumentation (Sentry) is server-only. The fact that I could not see errors that occur only in the browser kept bothering me, so I turned client instrumentation on and compared the gzip total of client JS on a clean build.

| Configuration | client JS (gzip) | Delta |
|---|---|---|
| Without Sentry | 181.6 KB | baseline |
| **Server-only (current)** | **182.3 KB** | **+0.7 KB** |
| Server-only + calling `captureException` in the error fallback UI | 186.0 KB | +4.4 KB |
| Client + server | 260.4 KB | +78.8 KB |

Server instrumentation was effectively free, while browser instrumentation demanded 78.8KB. I also tried the bundle optimization options, but the number did not move, and the only way to reduce the client cost was to not have a browser init file at all. The third row costs 4.4KB for the same structural reason. Without the browser SDK, `captureException` in the error fallback UI is a no-op that does nothing, yet the SDK code still ships in the bundle. So I removed the call itself.

This measurement has flaws too. It sums the entire static output, which differs from what one visitor actually downloads, and the fact that turning on the optimization options did not shave a single byte may be a sign that those options were not taking effect. So the precise statement is not "browser observability costs 79KB" but "in my setup, I could not get it below that".

Still, the decision was clear. On this blog, loading performance is the user experience and the precondition for search visibility, and the party paying the 78.8KB is not me but the visitor. If an observation is paid for by users, you have to ask what that observation gives back to them, and my answer for client error instrumentation on a personal blog was "not enough". Earlier I said that the code measuring the user experience can degrade the user experience; extend that principle to the level of adopting a tool and you arrive here. **Making observation denser is not always the right choice.**

## The entry barrier of questions

When connecting the APIs and tools above to actual questions, AI is useful at three points.

First, it narrows the path from symptom to specification. Symptoms like "LCP arrives twice", "every timing for a cross-origin resource is 0", or "values do not update after an SPA transition" can be connected to the relevant APIs and conditions.

Second, it helps translate the results of different tools onto the same timeline. When the timestamps and identifiers pointed to by a DevTools trace, a RUM event, a Sentry span, and server logs differ, it can quickly produce candidates to compare.

Third, it can explore distributions and anomalous ranges in the collected data. Instead of simple averages, it suggests differences by browser, route, release, and device, and lowers the cost of writing the next query.

But this process produces candidates; it does not stand in for evidence. Users who were not collected are not in the data, and a badly defined metric yields wrong conclusions no matter how elaborately you analyze it. Whether personal data may be sent, and whether users should bear the cost of observation code, cannot be decided from technical documentation alone.

AI is less a new sensor that observes the browser better, and more a tool that lowers the cost of reading the manuals of existing sensors and forming questions.

## Observation starts from a question

To sum up, the browser already records network, rendering, input, and layout changes in detail. `PerformanceObserver` is the starting point for reading that record, Web Vitals are metrics that interpret it into the language of user experience, and RUM is the system that continuously collects their distribution in real user environments.

The three stages look alike but answer different questions. Entries tell you what happened in the browser, Web Vitals compress what the user perceived, and RUM shows for whom and how often that experience repeats.

The threshold for reading multiple specifications and combining tools has come down, but being able to collect easily and being able to interpret correctly are different problems. Only when you can explain which users are missing and under which conditions values are distorted does observability data finally become information you can use for judgment. I hope the readers of this article also take a moment to reconsider whose experience, summarized by which rules, the performance numbers in front of them represent.

In the next article, [System Observability](/260915), I plan to look at how this browser data can be connected to errors, traces, profiles, and server logs. It is the story of following how far a single request that started on the user's screen traveled inside the system.

:::ref
- [docs] [W3C, Event Timing API](https://www.w3.org/TR/event-timing/)
- [docs] [W3C, Long Animation Frames API](https://www.w3.org/TR/long-animation-frames/)
- [docs] [web.dev, Debug Performance in the Field](https://web.dev/articles/debug-performance-in-the-field)
- [docs] [Chrome for Developers, Back Forward Cache](https://developer.chrome.com/docs/web-platform/bfcache)
:::
