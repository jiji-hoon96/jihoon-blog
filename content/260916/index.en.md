---
emoji: 🧩
title: 'From Observation to Judgment'
seoTitle: 'Core Web Vitals and SEO: What CrUX and Search Console Show'
date: '2026-09-16'
updatedAt: '2026-09-19'
categories: observability frontend GA4 Search-Console
description: 'How CrUX, PageSpeed Insights, and Search Console filter Web Vitals, what Google says about ranking, and a post whose clicks rose as its rank fell.'
keywords: 'CrUX field data, PageSpeed Insights field data, Search Console Core Web Vitals report, do Core Web Vitals affect ranking, Search Console query vs page clicks, average position dropped clicks increased, crawl rate 5xx 429'
locale: en
translationOf: '260916'
sourceHash: ffb98bcd9319ff4b9e6d07267eeaf96c6cb22ce658817b7a29f36977d6a8de15
---

In this post, I want to talk about the path that performance data measured in the browser takes on its way to search and to judgment.

The first three posts in this series dealt with signals I own directly. [Reopening Sentry](/260913) looked at calls that fail silently on the server, [Browser Observability](/260914) looked at the network and rendering, and [Browser CPU and Memory](/260915) looked at the main thread and memory. In all three, I planted the instrumentation code and read the data from my own storage.

The data in this post is different in kind. Values produced in visitors' browsers are handed to Chrome's statistics pipeline, and the results reappear in PageSpeed Insights and :term[Search Console]{key="search-console"}. Whose experience gets counted, how much has to accumulate before anything is shown, and what units it is grouped into are all decided by Google.

So this post tries to answer a single question. **What do you need to check before using a number that has left the browser to make a judgment?** My answer is to write down each number's sample and aggregation rules first, to add nothing that the official wording does not say, and to re-measure any conclusion you have reached against a different period.

## The web_vitals I collect

The starting point is the :term[RUM]{key="rum"} I collect myself. As covered in the browser observability post, this blog measures LCP, INP, CLS, FCP, and TTFB with `web-vitals` and sends them to GA4 as `web_vitals` events. What matters here is not which parameters get sent but **whose experience ends up in the sample**.

The sample for this collection is **browsers in which gtag.js actually ran**. Events pile up in `dataLayer` first and gtag.js consumes that queue once it loads, so in environments where the script request is blocked, measurements are created but never leave the page. Conversely, a browser that is not Chrome still enters the sample as long as gtag.js runs and the browser supports the metric. And because of `reportSoftNavs: true`, a screen changed by client-side routing is counted as a separate page experience. As we will see, CrUX counts the same visit differently.

To be honest, I did not re-query the `web_vitals` numbers accumulated in GA4 while writing this post. Nor did I confirm the question deferred from the earlier post, namely whether registering `metric_navigation_type` as a GA4 custom dimension actually lets me split the data. I tried to query it with a service account, but the Analytics Admin API was not enabled on that project. **Sending data and being able to read it are different things, and this blog has only confirmed the first.**

## The users CrUX counts

The field data Google looks at on the search side comes not from my GA4 but from the Chrome User Experience Report (CrUX). Reading the [CrUX methodology documentation](https://developer.chrome.com/docs/crux/methodology), the sample narrows through three layers of conditions.

The first is the user condition. Only users who have usage statistics reporting turned on, sync their browsing history, and have not set a sync passphrase are included. The platforms are desktop Chrome and Android Chrome; **Chrome on iOS, Android WebView, and other Chromium browsers such as Edge are excluded.** What percentage of all users meet these conditions is not disclosed.

The second is the page condition. A page must be publicly discoverable by the same standard as a search engine. A page that does not return 200 after redirects, or that carries `noindex`, is not eligible. It also has to exceed a minimum number of visitors; that number is not disclosed, and the same value applies to pages and origins.

The third is the aggregation method. Query strings and fragments are stripped and merged into the same page. And the documentation states explicitly that JavaScript route transitions in an SPA, even if they look like new pages to the user, **are attributed to the experience of the single page that was initially loaded**. That is the exact opposite of my RUM counting soft navigations separately. [The Chrome team's soft navigation documentation](https://developer.chrome.com/docs/web-platform/soft-navigations) also notes that how soft navigations will be reported to CrUX has not been decided yet.

Holding these conditions up against my blog produces concrete results. On September 11, 2026, I switched 126 category pages that contain only one post to `noindex, follow`. These pages are no longer eligible for page-level CrUX. Do they still remain at the origin level, then? The documentation's answer splits within a single page. The Origin section says that if an origin is discoverable, the experiences of all its pages are combined at the origin level regardless of whether individual pages are discoverable, while the opening of the Eligibility section in the same document says that experiences failing the Page conditions are not included in origin-level data either. I could not find a way to confirm which is the actual behavior. **So I record that I do not know whether visits to the category pages switched to noindex remain in the origin value.**

That much is the set of rules I confirmed from the documentation. The catch is that **I do not know whether hooninedev.com clears the minimum visitor threshold.** Since the threshold is not public, the only option is to query it directly, and that attempt got blocked in the next section.

## The two numbers in PageSpeed Insights

PageSpeed Insights shows two different kinds of numbers on one screen. According to the [official explanation](https://developers.google.com/speed/docs/insights/v5/about), lab data is a single load simulated by Lighthouse, and field data is the previous 28 days of CrUX. Lab is the result of one fixed device and network condition, while field is a record of real users across varied environments, so the documentation also notes that a good lab score does not guarantee a good real-world experience.

The field side has a fallback rule. If there is not enough page-level data, it falls back to the origin level, and if the origin also lacks enough data, no field data can be shown at all.

I tried to fetch this blog's field data through the PSI API. When I requested `/260914` for mobile at 2026-09-16T08:45:51Z, I got HTTP 429, and when I requested the home page (`/`) once more at 2026-09-16T09:11:17Z, it was the same 429. Both response bodies read `Quota exceeded for quota metric 'Queries' and limit 'Queries per day'`. It appears I hit the shared quota because I called it without an API key. **So this post contains no CrUX field values for this blog.** The CrUX API requires an API key, and my environment only has a service account for Search Console, so I did not call it.

Measuring `/260914` with a local Lighthouse run at the same time worked without any issue. **Lab values can be produced at any time, but field values exist only once visitor counts and eligibility conditions are met.** Numbers piling up in my RUM do not mean CrUX has a value.

## URL groups in Search Console

The last stage is Search Console's Core Web Vitals report. The [report's help page](https://support.google.com/webmasters/answer/9205520) states that the data comes from CrUX, and stacks several more layers of rules on top of it.

- Similar pages are bundled into a **URL group**, and the group's status follows its worst metric.
- A group appears in the report only when **both** LCP and CLS meet the data threshold. If a group lacks data, it is shown rolled up into the higher-level origin group, and if the origin group also lacks data, it is dropped.
- **Only indexed URLs** appear, and they are a sample rather than a full list.
- "No data available" means the property is new or there is not enough CrUX data for that device type.

Chaining the four stages shows the order in which the sample shrinks. RUM counts visits where gtag.js ran; CrUX keeps only eligible Chrome users and pages that are discoverable and popular enough; PSI shows that at the page or origin level; and Search Console groups indexed URLs and keeps only those above the threshold. Because each stage filters with different rules, **the same page's LCP showing different values in four places is not an error but normal.**

My collection script (`scripts/fetch-gsc.js`) only pulls Search Analytics. So I did not check in this post what state this blog's Core Web Vitals report is in right now. Since there is a fallback in the form of the origin group, I cannot conclude "No data available" just because traffic is small. I will not know until I open the report.

## Where the ranking statements stop

If field data is filtered like this, the next question is how much that data is used in search ranking. This topic is where exaggeration attaches most easily, so I quote the original text of Google Search Central's [page experience documentation](https://developers.google.com/search/docs/appearance/page-experience) as is. The document is in FAQ form, and it first answers the question of whether a single page experience signal is used in ranking like this.

> There is no single signal. Our core ranking systems look at a variety of signals that align with overall page experience.

In other words, there is no single signal like a page experience score. The very next question is which aspects of page experience are used in ranking, and the answer is this.

> Core Web Vitals are used by our ranking systems. We recommend site owners achieve good Core Web Vitals for success with Search and to ensure a great user experience generally. Keep in mind that getting good results in reports like Search Console's Core Web Vitals report or third-party tools doesn't guarantee that your pages will rank at the top of Google Search results; there's more to great page experience than Core Web Vitals scores alone.

What the original confirms is that Core Web Vitals are used by the ranking systems, and it immediately draws a line saying good report results do not guarantee top placement. The same answer goes on to say that chasing a perfect score purely for SEO may not be a good use of time, and states that page experience aspects other than Core Web Vitals do not directly raise rankings.

What I consider more important is **what this document does not say**. Nowhere does it say how much weight there is, whether the effect kicks in the moment a threshold is crossed, or how much ranking moves when a page goes from needs improvement to good. So the sentence "we improved Core Web Vitals and our ranking went up" cannot be backed by the official documentation, and even less so on this blog. As the earlier section showed, this blog could not confirm its field values at all.

## Server responses as seen by crawling

The place where the official documentation clearly connects performance and search is, if anything, crawling. Even so, this is about crawl rate and indexing, not ranking.

Google's [crawl budget guide](https://developers.google.com/search/docs/crawling-indexing/large-site-managing-crawl-budget) narrows its audience first. It is for sites with 1 million or more unique pages that change about once a week, 10,000 or more that change daily, or many URLs that Search Console classifies as "Discovered – currently not indexed". The original text states directly that sites without many rapidly changing pages, or whose pages are crawled on the day they are published, do not need to read the guide. As of September 16, 2026, this blog, with 186 URLs in its sitemap, is not in the audience.

Still, the guide's crawl capacity rule is worth knowing. When response times are stable or improve, the limit goes up; when they slow down or the site sends 5xx or 429, it goes down. The [HTTP status code documentation](https://developers.google.com/search/docs/crawling-indexing/http-network-errors) spells out the consequences more concretely. 5xx and 429 temporarily slow the crawler down. URLs that are already indexed are kept, but if it continues they eventually drop out of the index. 4xx other than 429 have no effect on crawl rate. The paths need to be separated precisely here. Prolonged 5xx is a path to **dropping out of the index**; I could not find an official statement that it is a signal that lowers rankings.

The biggest server incident on this blog was JIHOON-BLOG-2, where a GA Data API call hung for over 65 seconds. The response was 200. Today the only caller of `src/lib/google-analytics.ts` is the `/api/analytics` route, but August was different. In JIHOON-BLOG-8, where GA calls stalled again at that time, the last event's transaction was the home page (`GET /`), and of the 10 events still retrievable, 2 are `GET /` and 8 have an empty transaction. GA calls stalled on requests for the home page too, a page that is open to crawling. Whether that affected crawling, I do not know, because I did not open the Crawl Stats report while writing this post. **I do not connect what I have not confirmed.**

## The click gap between page and query

Now let me turn around and look at the search data Search Console returns. This is the data I actually pull as CSV every week and use to revise titles and descriptions.

![In two 28-day periods collected through the Search Console API, the page-dimension click total is 47 while the query-dimension click totals are only 8 and 9](1.png?w=720)

Summing the CSV I pulled on September 11, 2026, by dimension, the numbers do not match. In the last 28 days (August 12 to September 8), the page-dimension click total is 47, while the query-dimension click total is 8. The previous 28 days (July 15 to August 11) show 47 and 9. The gap is the same width in both periods, so it is structural, not a one-off coincidence.

The first suspect was a row limit. The [Search Analytics API documentation](https://developers.google.com/webmaster-tools/v1/searchanalytics/query) says it does not guarantee all rows and returns the top rows. But my script requests with `rowLimit: 1000`, and the query rows that came back numbered 128 and 66. **The limit was never reached, so truncation is not the cause.**

Two explanations remain, and both are in the [Search Console help](https://support.google.com/webmasters/answer/17010575). One is anonymization. Very rarely searched queries are excluded from the query table for privacy and are included only in the overall totals. The other is the [unit of aggregation](https://support.google.com/webmasters/answer/7576553). The query dimension counts by property. As the example in the [explanation of property aggregation](https://support.google.com/webmasters/answer/17011364) shows, if a user clicks two links to the same site one after another, that is 1 click. The page dimension counts by URL, so the same behavior becomes 2 clicks.

So these two totals were never numbers built by the same rules in the first place. Let me write down one temptation. In the last 28 days, six queries registered clicks, and five of them were Biome comparison queries such as "eslint vs biome" and "biome vs prettier". Those five queries add up to 6 clicks, and the page clicks for the Korean URL of the Biome post also happen to be 6. It looks like a perfect fit, but **you cannot link two numbers with different aggregation rules just because they are equal.** Query data should be read not as a breakdown of traffic but as a sample that offers a glimpse of search intent.

## Ranking fell, yet clicks rose

There is a case where I actually made a decision with this search data. [Can Biome Replace ESLint and Prettier?](/241201) is a post I wrote in December 2024, and it got noticeably few clicks relative to its impressions. So on June 11, 2026, I added a `seoTitle` starting with "Biome vs ESLint vs Prettier" to match the shape of real search queries.

In the 28-day comparison collected after the title change, this post's numbers moved like this. Impressions fell 11%, from 230 to 204, and average position slipped from 8.9 to 11.6. Judging by those two metrics alone, the post got worse. But clicks rose from 2 to 13, and CTR went from 0.87% to 6.37%.

These four numbers are the values I queried at the time. `.gsc-data/` is overwritten on every collection, so that CSV is no longer in the repo and I did not record the exact collection date. What can be confirmed is only that these numbers already appear in the draft snapshot dated August 16 included in an August 18 commit.

![In Search Console's 28-day comparison for the Biome post, impressions and average position got worse while clicks and click-through rate rose sharply](2.png?w=720)

It is only honest to let some air out first. These numbers do not prove the effect of the title change. Average position in the page dimension is the average of the page's topmost position recorded for each impression, so simply losing impressions that appeared high up but that nobody clicked makes the position worse and CTR go up. Query mix and seasonality also differ from period to period. The absolute increase in clicks is 11 over 28 days. As a multiple it is large; in absolute terms it is small.

Still, something remains. If you treat ranking as the outcome, this is a post that needs fixing; if you treat actual traffic as the outcome, it is a post that got better. **Which metric you choose as the outcome changes the conclusion drawn from the same data.** Had I looked only at the ranking drop, I would have torn apart again a post that had just started to improve.

### The numbers re-queried in September

While writing this post, I checked the current state of the same post again. In the CSV collected on September 11, 2026, the Korean URL `/241201` looks like this.

| Period | Impressions | Clicks | CTR | Average position |
|---|---|---|---|---|
| Previous 28 days (July 15 to August 11) | 211 | 11 | 5.21% | 14.5 |
| Last 28 days (August 12 to September 8) | 185 | 6 | 3.24% | 20.8 |

Putting the earlier two values (8.9, 11.6) and this CSV's two values (14.5, 20.8) in collection order, average position slid all summer. Clicks went 13, then 11, then 6. The recent period of the earlier comparison and the previous period of the September collection may overlap, so reading 13 to 11 as a decline is hard, but the 6 in the recent period is clearly a number that came down. The story "ranking fell, yet clicks rose" was sharpest in the first comparison, and the next period shook it.

Even so, the conclusion of the previous section does not flip. 6 clicks and a 3.24% CTR are still higher than the previous period of the first comparison (2 clicks, 0.87%). But one lesson was added. Not only the choice of metric but **the choice of comparison period also changes the conclusion.** If you complete a story with a single 28-day comparison, the next 28 days will break it.

And the recent period newly includes the five translations of this post committed on August 17. The English version `/en/241201` got 84 impressions and 0 clicks, and the Chinese version got 12 impressions and 1 click. I do not yet know whether the translations split impressions with the Korean URL, or why average position keeps slipping. Until I confirm it, I leave it unresolved.

## Changes stacked in one window

Not attaching causation to the Biome post is not just caution. This blog has conditions under which causation genuinely cannot be separated.

On September 11, 2026 alone, six search-related changes went in, including the hreflang restoration, rewrites of 48 titles, OG image fixes, and noindex on 126 category pages, and through the 16th more followed: another hreflang fix, the introduction of IndexNow, rewrites of truncated titles and descriptions, and a new post. The rewrite of this post falls into the same window.

I left a baseline document on September 11. In the last 28 days as of then, English post pages had 892 impressions and 0 clicks, and I decided to see in early October whether this number moves. But even if English clicks rise in October, I cannot pick a single cause. It could be the hreflang fix, the title rewrites of September 11, or the truncation fix of September 16. On top of that, the baseline data already contains one counterexample. zh-CN, which had only one truncated title, got 7 clicks, the most among the non-Korean locales, which makes it hard to see title truncation as the cause. **So in the October comparison, I decided to read only the direction and not claim individual contributions.**

## Write down each number's sample and rules first

If the first three posts showed silent failures on the server, the time visitors waited, and where that waiting came from, the data in this post is what that experience became after leaving the browser and being filtered through someone else's rules. So the conclusion is a bit more defensive too. Field data shrinks at every stage through RUM, CrUX, PSI, and Search Console, each with different rules, and on a site as small as this blog it may not survive to the end. Google's ranking statement stops at saying Core Web Vitals are used, and the crawling documentation stops at saying slow responses and 5xx affect crawling and indexing. Search Console's page and query totals are numbers counted by different rules, so they do not add up. **Write down first who was counted by what rules for each number, and stop where the official wording stops.** Turning observation into judgment was mostly those two things.

In October, I too plan to compare the baseline with the new CSV and read only the direction. If you have followed this series and next find yourself making a decision based on a single number on a dashboard, I recommend first writing down, in one line, who that number counted and by what rules. Then query that conclusion again a month later over a different period.

:::ref
- [docs] [web.dev, Why lab and field data can be different](https://web.dev/articles/lab-and-field-data-differences)
- [docs] [Google Search Central, Understanding Core Web Vitals and Google search results](https://developers.google.com/search/docs/appearance/core-web-vitals)
:::
