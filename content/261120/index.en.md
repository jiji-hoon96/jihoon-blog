---
emoji: 🔎
title: 'Tracing 42 MB with the Network Panel'
seoTitle: 'Chrome DevTools Network: Tracing 42 MB with Initiator'
date: '2026-11-20'
categories: frontend Performance DevTools
description: 'Toss Bank’s homepage downloads 42 MB. Use Network’s Size and Initiator to find the 27 MB PNG fetched to sample one pixel for a card color.'
keywords: 'Chrome DevTools Network panel, Network tab tutorial, Initiator async stack, Disable cache first visit, loading lazy images, Resource Timing transferSize, canvas getImageData CORS, image transfer size optimization'
locale: en
translationOf: '261120'
sourceHash: d042953f2b5f612a21f4d2c9e416a9ddd7b509eafa8de9fa080916dede2a3734
---
In this post, I trace the transferred data for a page all the way through Chrome DevTools’ Network panel.

This post is for frontend developers who have used the Network tab to find a failed API call but aren’t sure where to start when figuring out why a page is so heavy. By following the summary row at the bottom, the Size column, and Initiator in turn, I trace the source of the 42 MB on Toss Bank’s homepage down to a single line of code. Along the way, I also check which requests `loading="lazy"` fails to defer, and how the numbers change when Disable cache is enabled.

I open the Network panel every day when working on page performance at my company, but I always end up looking at the same familiar items. So I decided to apply DevTools panels to a real service, one by one, and inspect them all the way through. For my first target, I chose the Toss Bank homepage (`www.tossbank.com`), which anyone can open without logging in. I can’t know why Toss Bank built it this way, so I won’t judge it. This post covers the numbers the panel shows and how those numbers come about.

## The summary row at the bottom

I ran the measurements in the 18:00 hour on November 20, 2026, with Chrome 157.0.8103.80 running headless. Each time, I opened it with a fresh profile and a window size of 1600x1000, then counted what it received over 15 seconds without network throttling. After repeating the measurement three times, the values matched to two decimal places in MB. The Toss Bank homepage changes with deployments and feed content, and in the morning that same day, one card was different and the total was 2 MB larger. So I built a demo that reproduces the same structure in [jiji-hoon96/blog-labs](https://github.com/jiji-hoon96/blog-labs/tree/main/image-color-sampling), and I measure it alongside the page later in this post.

After opening the Network panel and refreshing the page, the first place to look is the line at the very bottom. On the Toss Bank homepage, it showed 156 requests, `42,202 kB transferred`, and `55,603 kB resources`. The [Network panel reference](https://developer.chrome.com/docs/devtools/network/reference) explains that this line shows the combined totals for transferred size and uncompressed size. Transferred is the amount that actually passed over the network: response headers and the compressed body. Resources is the uncompressed size, and it includes the full size of responses read from cache that transferred 0 bytes over the network. That is why resources is larger.

When you apply a filter, this line changes to two values: “filtered results / total.” Clicking Img in the type filter shows `57 / 156 requests` and `40,450 kB / 42,202 kB transferred`. Images account for 37% of requests but 96% of transferred data. So I start with images. With the same filter, resources is 50,862 kB, a little over 10 MB more than transferred. PNGs aren’t compressed in transit, so almost all of this difference comes from images read from cache. These numbers will come up again when I cover Disable cache.

![With the Img filter enabled and Size sorted in descending order in the Toss Bank homepage’s Network panel, the top banner was requested by Parser and the card thumbnail below it by Script. 1 is the Img filter, 2 is the Size column header sorted in descending order, 3 is the two Size values on the first row, tossbank-banner-web-Financial-sector.png: 5,590 kB and 5,587 kB. 4 is the Initiator on that same row, (index):5 and Parser. 5 is the Initiator on the second row, bankfeed-gold-decline-cover.png: index-8989962b29fa3f03.js:1 and Script. 6 is the two Size values for logo-bank-mono-white.svg: 1,616 kB and 2,140 kB. 7 is the bottom row’s 40,450 kB / 42,202 kB transferred, and 8 is its 50,862 kB / 55,603 kB resources](1.png?w=720)

## The two values in the Size column

With the filter applied, click the Size column header to sort from largest to smallest. The Size column shows one line by default. Click the gear icon at the far right of the Network panel toolbar, above the filter row, and enable Big request rows to show two lines. According to the reference, the top line is the combined size of the headers and body sent by the server, and the bottom line is the uncompressed size.

The top banner, `tossbank-banner-web-Financial-sector.png`, is nearly the same on both lines: 5,590 kB on top and 5,587 kB below. PNG is already compressed, so the server did not compress the response again, and there was no `content-encoding` in the response headers. The remaining 3.7 kB can’t be explained by the response headers alone. This response arrived over HTTP/2, which splits the body into frames (with a default maximum of 16 KB) and adds a 9-byte header to each frame. Chromium counts those frame headers among the received bytes too ([`spdy_session.cc`](https://github.com/chromium/chromium/blob/main/net/spdy/spdy_session.cc)). Splitting 5.6 MB into 16 KB frames gives roughly 340 frames, so the frame headers alone account for about 3 kB. Add the response headers, and the numbers add up. By contrast, the logo `logo-bank-mono-white.svg` shows a bigger gap: 1,616 kB on top and 2,140 kB below. SVG is text, so it was compressed with gzip during transfer. The logo is 2 MB because it contains two PNGs encoded as base64.

At the top of the sorted list are the top banner and feed card thumbnails. The three large banners have original dimensions of 5120x2800 and are rendered at 1600x1000 on screen. The card thumbnails whose names start with `bankfeed-` are 3200x2160 originally and are rendered at 302x170. Even on a Retina-like display that renders one CSS pixel as two physical pixels (a device pixel ratio of 2), the banners are 5,120 px wide for a required 3,200 px, and the cards are 3,200 px wide for 604 px. I confirmed the original sizes by reading `naturalWidth` on the page.

I also compared the top value in Size with another tool. The transferred data in this post is the sum of the `encodedDataLength` values CDP provides for each request, and it matched the bottom summary row byte for byte. You can read it with JavaScript on the page too. For the largest card thumbnail, `performance.getEntriesByType('resource')` shows `transferSize` is 300 greater than `encodedBodySize`. The [Resource Timing specification](https://w3c.github.io/resource-timing/#dom-performanceresourcetiming-transfersize) stipulates adding a constant 300 to the body size to avoid revealing the actual header size. The fact that this value appeared for an image from another origin is because the request was made with CORS, and the server allowed both `access-control-allow-origin` and `timing-allow-origin` with `*`.

Judging by size alone, this looks like a familiar image optimization story. But when you look at the Initiator column too, you see that the card thumbnails were requested by a script, not the page’s `<img>` elements.

## Initiator and async stacks

The Initiator column shows what made a request. The values listed in the reference are Parser, Redirect, Script, Early Hints, and Other. In Figure 1, the banner’s Initiator is `(index):5` and Parser. The parser requested it when it encountered an `<img>` while reading the HTML. The card thumbnail `bankfeed-gold-decline-cover.png` shows `index-8989962b29fa3f03.js:1` and Script. The request was made while a script was running.

The card shown on screen is an `<img>`, so why does its Initiator say Script? Click the row and open the Initiator tab in the details view to see the call stack that made the request.

![The Initiator tab for the same request shows a call stack divided by three async boundaries: Image, setTimeout, and await in fetch. 1 is the Initiator tab. 2 is the first group, Image, with two T.o, T, and (anonymous) frames, all in index-8989962b29fa3f03.js. 3 is the setTimeout group, with batch, setData, and fetch in the main and _app bundles. 4 is the await in fetch group, with H, onSubscribe, and subscribe](2.png?w=720)

The bold labels `Image`, `setTimeout`, and `await in fetch` are async boundaries. The frames under each boundary are the stack at the moment that async task was scheduled. So reading from bottom to top gives the order in time.

1. A function named `fetch` waits for data with `await`, then resumes (4). This name refers to a function in the bundle, not the browser’s `window.fetch`. The `onSubscribe` and `subscribe` below it are the callers of that function
2. That function changes state with `setData`, goes through `batch`, and schedules a `setTimeout` (3)
3. The timer runs, passes through frames that look like they’re inside React, in `framework-*.js`, and then function `T` sets the image’s `src` (2)

The top boundary, `Image`, is the moment the script sets the image element’s `src`. The browser sends the actual request separately right after that, so Initiator shows the stack from that moment. The name alone can’t tell you whether this is a DOM `<img>` or `new Image()`. You have to look at the code to know.

Clicking `index-8989962b29fa3f03.js:1` in the stack opens that location in the Sources panel. Sources pretty-prints minified files by default, so you can read a bundle that’s all on one line. The bundle hash changes with each deployment, but following the Initiator link takes you to the file from that deployment. I downloaded and read the same file, and found that a callback that looks like a card component’s effect calls `T` with the thumbnail URL. `T` does four things.

1. It creates a `new Image()`, sets `crossOrigin` to `"anonymous"`, and then assigns the original URL of the card thumbnail
2. When the image has loaded, it creates a canvas the same size as the image
3. It draws the image on the canvas
4. It uses `getImageData` to read a pixel 20 px from the right edge and 20 px from the top, then uses that color as the card’s background color

`T` fills the card background with a color from the edge of the thumbnail. To read that one pixel, it downloads the entire original PNG. On the first screen, 24 card thumbnails were downloaded this way, totaling 27.14 MB. That’s two-thirds of the 40.45 MB transferred for images.

Here’s the process in one diagram. The same original file is requested through two paths.

![Two paths request the same original PNG. The card’s img loading lazy requests it with Initiator Parser when it gets close to the screen. Once the feed data arrives, the script’s new Image() requests all 24 images with Initiator Script, draws each original in a same-size canvas, then uses getImageData to read one pixel. For a 3200x2160 original, the canvas is about 27.6 MB. The second request is 0 B with cache enabled and is downloaded again with Disable cache](3.png?w=720)

DevTools’ Initiator is where you can see this distinction. Resource Timing on the page doesn’t distinguish between the two. The thumbnail loaded with `new Image()` also had `initiatorType` set to `"img"`. The specification classifies requests triggered when an img element’s `src` is processed as `img`, and `new Image()` is an img element too.

### A canvas the size of the original and CORS

`T` sets the canvas `width` and `height` to the image’s original dimensions. The [HTML specification](https://html.spec.whatwg.org/multipage/canvas.html#the-canvas-element) says these two attributes determine the size of the canvas bitmap, so a 3200x2160 image creates a bitmap with 6.91 million pixels. At 4 bytes per pixel for RGBA, that’s about 27.6 MB. `drawImage` also has to decode the original PNG, so there’s another decoded bitmap of the same size, and this is repeated for every thumbnail. The canvas is a local variable inside the function, so it stays around briefly until the garbage collector removes it. These figures are calculations. I tried measuring process memory, but the values were spread across renderer and GPU processes and changed on each run, making it impossible to identify the differences between variations.

`crossOrigin="anonymous"` is needed because of `getImageData`. The image comes from `static.toss.im`, which is a different origin from the page. The [HTML specification](https://html.spec.whatwg.org/multipage/canvas.html#security-with-canvas-elements) prevents reading a canvas that has been drawn with an image from another origin without permission, and stipulates that calling `getImageData` in that state throws a `SecurityError`. Setting `crossOrigin` makes the request use CORS, and if the server allows it, the canvas can be read. You can confirm that permission in the response headers on the Headers tab: `access-control-allow-origin: *`.

## Script requests outside lazy loading

The card’s `<img>` has `loading="lazy"`. Even so, all 24 images arrive on the first screen because lazy only delays the request made by that `<img>` itself. The [HTML specification](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#lazy-loading-attributes) defines lazy loading as a state that defers fetching until the conditions are met. If a script separately requests the same URL, that request is unrelated to lazy loading.

Here’s how much earlier they arrived. The 24 lazy-loaded card `<img>` elements are between 760 px and 3,411 px down the document. After 15 seconds, the 12 up to 1,896 px had loaded, and the 12 from 2,275 px downward had not. According to [web.dev’s lazy loading guide](https://web.dev/articles/browser-level-image-lazy-loading), when Chrome estimates the connection is 4G, it fetches lazy images within 1,250 px of the viewport in advance. The window height is 1,000 px; add 1,250 px and you get 2,250 px, which matches the observed boundary. Those 12 images below that point weren’t due to be fetched as `<img>` elements yet, but the script downloaded 17.20 MB ahead of time. The largest thumbnail, 5,376 kB, was also among them at a document position of 2,654 px.

This share is even larger on mobile screens. When I opened the same page with an iPhone user agent and a 390x844 viewport, the transferred data was nearly the same at 42.17 MB. With one card per row, 19 cards totaling 23.88 MB were pushed beyond the boundary of the 844 px window plus 1,250 px.

The top banner also downloads images that aren’t visible for a reason unrelated to lazy loading. On mobile, it downloaded four desktop banners totaling 10.27 MB; on desktop, it downloaded four mobile banners totaling 1.42 MB. Both sets are inside areas with `display: none` and contain `<img>` elements without `loading`. The HTML specification says images are fetched eagerly by default, so hidden `<img>` elements are fetched too.

## Disable cache and duplicate requests

I measured everything up to this point with Disable cache off. The Network panel reference titles the section about this checkbox “Emulate a first-time visitor.” Chrome 157’s Performance panel also says next to this setting that it simulates a network experience similar to a first visit. So people often enable this checkbox when measuring a first visit. I turned it on and measured the Toss Bank homepage again.

![With Disable cache enabled, the same thumbnails are downloaded twice, by Parser and Script, and transferred data increases to 52 MB. 1 is the checked Disable cache box. 2 is bankfeed-ipo-reorganization-cover.png appearing on two rows: the top row has Initiator (index):5 Parser, the bottom row has index-8989962b29fa3f03.js:1 Script, and both are 1,625 kB. 3 is the bottom row’s 50,391 kB / 52,148 kB transferred](4.png?w=720)

Transferred data increased by 9.95 MB, from 42.20 MB to 52.15 MB. Of that, 9.94 MB came from 12 card `<img>` elements that were close enough to the screen to load. The remaining seven requests were small preflight requests, not images. With cache enabled on a first visit, these 12 had transferred 0 bytes. The script had already downloaded the same files, and the `<img>` requests that came later reused them. With Disable cache enabled, the same files are downloaded again. Figure 4 shows this case as rows with the same filename, one with Parser and one with Script. The reason resources was a little over 10 MB larger than transferred in the bottom summary row was also these 12 images.

I couldn’t confirm from this measurement which cache served those files again. One of the 12 was marked as disk cache in the response information, and the other 11 transferred 0 bytes without any cache indication. The response had `cache-control: max-age=86400` and no `Vary` header. CORS requests (`crossOrigin`) and regular `<img>` requests use different credentials modes. [`resource.cc`](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/platform/loader/fetch/resource.cc), which handles Blink’s memory cache, says that it will fetch again if the credentials mode differs from that of the preceding request. It gives as an example the case where a server returns `Access-Control-Allow-Origin: *` and CORS and non-CORS requests are mixed. On the other hand, the HTTP cache feature that partitions by credentials (`kSplitCacheByIncludeCredentials`) is disabled by default in [`net/base/features.cc`](https://github.com/chromium/chromium/blob/main/net/base/features.cc). So I think it was served again by the HTTP cache, but I didn’t confirm that with the measurement.

A first-time visitor is someone with an empty cache, not someone without a cache. Files received for the first time are reused immediately within the same page. Disable cache also prevents that reuse, so if a page requests the same file twice, measuring with this checkbox enabled gives a higher number than a first visit. To measure a first visit on such a page, clear the cache and refresh with the checkbox off. Right-click the request list in the Network panel to find Clear browser cache. I checked with the CDP command that does the same thing: after opening once, I cleared the cache and opened the page again, and it was 42.20 MB, the same as the first opening. Without clearing the cache, opening it again was 0.16 MB.

## Measuring the same structure with a demo

The Toss Bank homepage will change after this post is published. So I rebuilt the same structure using public assets. It downloads 24 3200x2160 PNG cards from another origin and puts an `<img loading="lazy">` on each card. I changed only the method for setting the card background color, using three variations. Here’s the color sampling code.

```js
async function sampleColor(src, x, y) {
  const img = await new Promise((ok) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => ok(i);
    i.onerror = () => ok(null);
    i.src = src;
  });
  if (!img) return null;
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const [r, g, b] = ctx.getImageData(img.width - x, y, 1, 1).data;
  return { r, g, b };
}
```

- **Sample from the original**: Same structure as Toss Bank. Call `sampleColor` with the original card image
- **Sample from a thumbnail**: Call the same function with a 64x43 thumbnail
- **Precomputed color**: Receive the color as JSON and use it

Under the same conditions (1600x1000 window, fresh profile, 3 runs), transferred data for the three variations was 16.80 MB, 8.03 MB, and 7.94 MB. Sampling from the original doubles the total by also downloading the 12 cards far from the screen. Sampling from thumbnails adds only the 98 kB transferred for 24 64x43 thumbnails. With Disable cache enabled, only the variation that samples from the original increased, to 24.73 MB. The precomputed color variation doesn’t request the same file twice, so it stayed at 7.94 MB. The Network panel’s Initiator also matched Toss Bank: 24 color-sampling requests showed Script, and the card `<img>` requests showed Parser.

## From the bottom row to a line of code

Of the 42.20 MB on Toss Bank’s first screen, 40.45 MB was images, and 27.14 MB of that was 24 original PNGs that a script downloaded to sample one pixel for the card background color. Because `loading="lazy"` only deferred requests made by the card `<img>` elements, 12 cards far from the screen, totaling 17.20 MB, were downloaded on the first screen too. Measuring with Disable cache enabled downloads the same files twice, for a total of 52.15 MB.

I didn’t need many features to reach this conclusion. I checked the total transferred data in the bottom summary row, used the type filter to identify what was heavy, sorted Size to inspect the largest items first, used the Initiator column to identify who made each request, and followed the async stack in the Initiator tab down to the code. You can see that an image is large from the Size column alone. You have to follow Initiator to see why it’s being downloaded.

I recommend turning on the Img filter in your own service and sorting by Size, or entering `larger-than:500k` in the filter box to show only large responses, then checking whether the Initiator on the top rows is Parser or Script. If it’s Script, neither `loading="lazy"` nor `srcset` applies to that request. If you need to sample a color from an image, as the demo showed, you can halve the amount downloaded just by precomputing the color and sending it as data, or by sampling from a small thumbnail. And when you measure a first visit, first check whether the page requests the same file twice. If it does, open it in a browser with a cleared cache instead of enabling Disable cache.

This is the first post in a series where I apply DevTools panels to real services, one by one. In the next post, I’ll use Waterfall and the Timing tab in the same Network panel to see where the time goes in a single request.

:::ref
- [docs] [MDN, Allowing cross-origin use of images and canvas](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image)
- [docs] [Chrome DevTools, Inspect network activity](https://developer.chrome.com/docs/devtools/network)
:::