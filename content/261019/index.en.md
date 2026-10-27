---
emoji: 🔤
title: 'Korean Web Font Subsets and next/font'
seoTitle: 'Korean Web Font Subsets, next/font and font-display Measured'
date: '2026-10-19'
categories: frontend Performance
description: 'A four-font Korean page shipped as TTF, woff2, subsets, Google and next/font. Subsets cut 17 MB to 0.6 MB; Google direct and preload moved ~0.1 s.'
keywords: 'Korean web font optimization, unicode-range, woff2, font subsetting, variable fonts, next/font, font-display, self-hosting Google Fonts, cache partitioning, Noto Sans KR, Pretendard'
locale: en
translationOf: '261019'
sourceHash: 1b0a9fd911ad78782c3081ebe2d0de561cc81a54fa27edf510ef1e8bcd5f29a2
---

In this post, I want to talk about ways to make Korean web fonts lighter to deliver.

This is for frontend developers who run Korean pages that split fonts across body text, headings, code and quotes. I measure how much each of the common ways to shrink web fonts actually helps, and lay out which one to tackle first.

Korean fonts contain so many characters that a single weight runs from hundreds of kB into the MB range. There are several ways to download less of it, download it sooner, and keep the screen from shifting while it downloads. You can switch the file format to woff2, split the font into subsets, load it straight from Google's servers, use `next/font` to fetch fonts early (preload) and match the fallback font, or use `font-display` to decide what the screen shows when a font arrives late.

So how much difference do these methods actually make? Let's build one page that uses four fonts, deploy it separately for each method, and measure how much font data it downloads, how many seconds it takes to get all of it, and how much the layout shifts. We'll also look at which methods five Korean services use. The demo and measurement scripts are in [jiji-hoon96/blog-labs](https://github.com/jiji-hoon96/blog-labs/tree/main/web-fonts), and you can open the deployed pages yourself at [hooninedev-web-fonts.netlify.app](https://hooninedev-web-fonts.netlify.app/full-d-google/).

## A Page That Uses Four Fonts

The test page is the body of this blog's [overlay-kit post](/260921), copied as is, code blocks and quotes included. I chose a real post instead of a short sample because the transfer size of a Korean font moves with the variety of characters used on the page. The fonts are split four ways, as is common on tech blogs.

![Fonts by part of the test page. Headings h1 and h2 are Noto Serif KR 700, the first paragraph is Inter 300 and Noto Sans KR 300, body text is Inter 400 and Noto Sans KR 400 with bold at 700, h3 subheadings are Inter 500 and Noto Sans KR 500, quotes are Inter italic 400 with synthesized slanting for Korean, and code is JetBrains Mono 400 with Korean comments in Noto Sans KR](1.png?w=720)

The body text is `font-family: 'Inter', 'Noto Sans KR'`. Latin letters and digits are drawn by Inter and Korean by Noto Sans KR, in four weights: 300, 400, 500 and 700. Headings use a single serif (Myeongjo-style) font, Noto Serif KR 700, and code uses a single monospace font, JetBrains Mono 400. Quotes are drawn in Inter's italic. Noto Sans KR has no italic, so the browser synthesizes slanted glyphs for the Korean inside quotes.

That makes four families, and eleven fonts once you count weights and styles: five for Inter (300, 400, 500, 700, italic 400), four for Noto Sans KR, and one each for the other two.

## How the Browser Fetches Fonts

A web font isn't downloaded the moment the CSS is read. An `@font-face` rule only declares the font name, the weight, the file URL, and the range of characters the file holds (`unicode-range`); the browser requests the file only when it needs that font while drawing text. The [CSS Fonts Level 4 spec](https://www.w3.org/TR/css-fonts-4/#font-face-loading) describes this lazy loading as intended design. The [unicode-range section](https://www.w3.org/TR/css-fonts-4/#unicode-range-desc) of the same spec states that the font must not be downloaded or used for characters outside the range.

So if you split one font into files by character range and give each file a `unicode-range`, the browser downloads only the files that contain characters used on the page. A file cut down to part of the character set is called a subset, and in this post I call each of those split files a slice. Below is the rule for one slice used in this experiment. It holds frequent Hangul such as `U+ac00` (가), `U+c774` (이) and `U+d558` (하), along with the space and some Latin letters.

```css
@font-face {
  font-family: 'Noto Sans KR';
  font-style: normal;
  font-weight: 300 700;
  font-display: swap;
  src: url(nskr-119.woff2) format('woff2');
  unicode-range: U+20-22, U+27-2a, U+2c-38, U+3a-3b, U+3f, U+41-47, U+4a-4c, U+4f-5d, U+61-7b, U+7d, U+a1, U+ab, U+ae, U+b7, U+bb, U+bf, U+2013-2014, U+201c-201d, U+2122, U+ac00, U+ace0, U+ae30, U+b2e4, U+b85c, U+b9ac, U+c0ac, U+c2a4, U+c2dc, U+c774, U+c778, U+c9c0, U+d558;
}
```

![How subsetting works. One font is cut into several slices, each with a unicode-range, and the page downloads only the few slices that contain characters it uses](2.png?w=720)

For Korean fonts this difference is bound to be large. Hangul syllables alone number 11,172, and Noto Sans KR, which also includes Hanja (Chinese characters), holds 23,174 characters. Without subsets, drawing a single post means downloading all of them.

## The Five Pages Compared

Of the methods above, I start with format and subsetting. I made five versions of the same page, changing only how the fonts are delivered, and included one that uses the slices Google has already split. The body text and the `font-family` declarations are identical across all five; only the single `fonts.css` file and the font files it points to change.

The starting point is the Google Fonts CSS API. The [Google Fonts docs](https://developers.google.com/fonts/docs/technical_considerations) say the API returns a stylesheet tailored to the requesting browser. When a client it doesn't recognize as a browser, such as curl, makes the request, you get one TTF URL per weight; when a recent Chrome makes it, you get a woff2 response with an `@font-face` for each slice. If you pull just the TTF URLs out of the first response and hardcode them in your CSS, every browser that visits gets TTF.

- **A. TTF**: I downloaded the TTF files the API gives curl and hosted them as is. This is the same shape as hardcoding the TTF URLs.
- **B. woff2**: A's TTFs, only converted to woff2. No subsets.
- **C. Static slices**: A's TTFs cut into woff2 slices along the character ranges Google uses for each family. Each weight is cut separately.
- **D. Google response**: The CSS and font files the same API gives a recent Chrome, downloaded and hosted as is. Each slice is a variable font that holds several weights.
- **D-range**: Same as D, but instead of listing the weights in the API request like `wght@300;400;500;700`, I requested them as a range like `wght@300..700`.

A, B and C start from the same TTFs. From A to B only the format changes, and from B to C only subsetting, so you can see how much each one cut. For converting and cutting I used fontTools, a Python library for working with font files. One caveat: Google's ranges don't cover every character a font holds. For Noto Sans KR they cover only 17,655 of 23,174 characters, and most of what's left out is rarely used Hanja. So C holds fewer characters than B, but every character used on this page falls within the ranges for all four families, so the amount downloaded isn't affected.

All five versions went onto a single Netlify site, so they're served from the same host over HTTP/2. D is also served from that site, not from Google's servers, so differences in where files come from don't mix into the results. The difference when loading directly from Google's servers is measured separately later. Every file got `Cache-Control: public, max-age=31536000, immutable` so that the CDN (cache servers that keep copies of files close to users) serves files without checking back with the origin server.

## Font Transfer by Variant

First, the font transfer of the five versions side by side.

| Variant | Font files | Font transfer | CSS transfer |
|---|---|---|---|
| A. TTF | 11 | 17,200 kB | 0.4 kB |
| B. woff2 | 11 | 12,045 kB | 0.4 kB |
| C. Static slices | 58 | 679 kB | 107 kB |
| D. Google response | 28 | 579 kB | 107 kB |
| D-range | 28 | 579 kB | 43 kB |

From A to C, font transfer dropped 96%. Let's go through each variant's Network panel to see where these numbers come from in DevTools.

### A, with Hardcoded TTF

![DevTools Network panel for variant A. 1 is the Font filter, 2 is Disable cache, 3 is the names of the eleven TTF files from serif-normal-700.ttf to nskr-normal-500.ttf, 4 is the Size column, where serif is 4,949 kB, the four nskr files are 2,811 kB to 2,909 kB each, and inter and mono are between about 50 kB and 150 kB. 5 is the Content-Encoding column, br for all of them. 6 is 17,206 kB / 17,243 kB transferred in the bottom bar, and 7 is 40,490 kB / 40,571 kB resources](3.png?w=720)

Before reading the panel, set up three things. Turn on the Font filter (1) so only font requests remain, and turn on Disable cache (2) so every reload downloads everything again, like a first-time visitor. The Content-Encoding column isn't shown by default, so right-click a column header and enable Content-Encoding under Response headers.

The names (3) end in `.ttf`, one file per weight and style, eleven in total. The sizes (4) show each Korean font file at 2.8 MB to 2.9 MB. However few characters the page has, each of these files contains all 23,174.

The largest file isn't the body font but the heading font. Noto Serif KR 700 alone is 4,949 kB, and 14 MB uncompressed. The only Korean this page draws with it is 50 distinct characters in nine headings (one h1 and eight h2s).

The bottom bar shows each number as a pair. In "17,206 kB / 17,243 kB transferred" (6), the first value adds up only the requests matching the filter and the second is the whole page. transferred is the amount that crossed the network, and resources (7) is the size after decompression. They differ by more than 2x because Content-Encoding (5) is `br`, meaning Brotli (a compression format made by Google). TTF has no compression of its own, so Netlify compressed it with Brotli before sending. What users wait for is transferred, so every number in this post is transferred.

### B, Format Only

If you follow the common advice and convert TTF to woff2, how much smaller does it get? B is that case.

![The same panel for variant B. 1 is eleven files whose names end in woff2, 2 is the Size column, where serif is 3,215 kB and the four nskr files are about 2,000 kB each. 3 is the empty Content-Encoding column, 4 is 12,045 kB / 12,082 kB transferred in the bottom bar, and 5 is 12,037 kB / 12,118 kB resources](4.png?w=720)

17,200 kB became 12,045 kB, a 30% drop. This time Content-Encoding (3) is empty, and transferred (4) and resources (5) are nearly the same. woff2 is already compressed inside the file, so Netlify didn't compress it again.

This 30% isn't measured against uncompressed files. A also arrived Brotli-compressed, so the remaining difference comes from the compression method and level. According to the [W3C WOFF2 spec](https://www.w3.org/TR/WOFF2/), woff2 first transforms the glyph data into a form that compresses well, then compresses it with Brotli. But the Brotli Netlify applied to the TTFs used a low level. Brotli lets you choose a level from 0 to 11; higher levels give smaller files but take longer to compress. Netlify sent the same Noto Sans KR 400 TTF at 2,866 kB, almost exactly what level 4 produces. Precompressing at the highest level, 11, gives 2,475 kB, and woff2 is 2,053 kB. How much converting to woff2 saves depends on how the server compresses the TTF. Google's gstatic sends the same file with gzip at 3,023 kB.

Pick the wrong baseline and this number gets inflated. Compare B with A's resources of 40,490 kB and it looks like a 70% cut, but users never downloaded that size. Conversely, if your own server sends TTF uncompressed, users really do download 40 MB. Which case you're in shows up right away in the Content-Encoding column.

Even so, B downloads 12 MB to draw one post. Each file contains every character, so changing the format doesn't change how many characters you download.

### C, Split into Subsets

C cuts the same TTFs along the character ranges Google uses: 124 ranges for Noto Sans KR and Noto Serif KR, 7 for Inter, and 6 for JetBrains Mono. The Google Fonts team explained how the Korean ranges are split in its 2018 [post announcing Japanese support](https://developers.googleblog.com/en/google-fonts-launches-japanese-support/). The 2,000 most frequently used characters are split into 20 slices by frequency, and the rest into 100 slices in Unicode code point order. Google's CSS doesn't number the Korean slices, so I numbered them from 0 in the order they appear in the CSS. Slices 0 through 99 are the ones split by code point (the CSS lists the slices with the highest code points first), and 100 through 119 are the frequency slices. Four slices for Latin, Latin Extended, Cyrillic and Vietnamese come at the end, for 124 in total. C's file names follow these numbers too.

C's CSS has one rule per slice per weight, 661 in total: 496 for Noto Sans KR (124 ranges times four weights), 124 for Noto Serif KR, 35 for Inter (7 ranges times five fonts), and 6 for JetBrains Mono.

![The same panel for variant C, sorted by name. 1 is five inter slices, one each for italic 400 and for 300, 400, 500 and 700. The unmarked row below it is one mono slice. 2 is five nskr-normal-300 slices, 3 is nineteen nskr-normal-400 slices, 4 is nine nskr-normal-500 slices, 5 is thirteen nskr-normal-700 slices, and 6 is six serif-normal-700 slices. 7 is 679 kB / 823 kB transferred in the bottom bar](5.png?w=720)

Of the 661 rules, only 58 files were downloaded, totaling 679 kB (7), or 4% of A. The file names include the weight, so sorting by name shows at a glance how many slices each weight downloaded.

The body weight 400 has the most, 19 slices (3); the first paragraph's 300 has 5 (2), the subheadings' 500 has 9 (4), and bold 700 has 13 (5). Most are slices in the 100s, which hold frequently used characters. Some slices have outlying numbers, like slice 56 for 400. The only character on this page in slice 56's range is "눴" in "나눴다" (split), and that single character pulled in a whole slice.

The heading font, 4,949 kB in A, became 6 slices (6) and 113 kB, because only the slices containing the 50 heading characters were downloaded. Inter downloaded one Latin slice per weight and style (1), five in all.

Not a single Latin slice of Noto Sans KR was downloaded, because Inter, listed first, drew every space, digit and Latin letter. In the Chrome used for this measurement, the order in `font-family` changed even which files were downloaded.

Here is how much woff2 conversion and subsetting each cut.

| Step | Transfer | Reduction |
|---|---|---|
| A. TTF (Brotli) | 17,200,139 B | Baseline |
| B. woff2, no subsets | 12,045,102 B | Converting to woff2 cut 5,155,037 B |
| C. woff2, subsets | 678,925 B | Subsetting cut a further 11,366,177 B |

69% of the reduction came from subsetting. This share counts woff2 conversion first and subsetting second, so it's the count most favorable to woff2. If you subset first, there's less for woff2 to compress in the first place, so subsetting's share grows even larger.

### D, Using Google's Response

D is what Google actually serves to a recent Chrome. The ranges are the same as C, but there are half as many files.

![The same panel for variant D, sorted by name. 1 is two files, inter-italic-latin and inter-latin. The unmarked row below it is one mono-latin. 2 is nineteen files from nskr-101 to nskr-119 plus nskr-56, and 3 is six files from serif-114 to serif-latin. 4 is 579 kB / 723 kB transferred in the bottom bar](6.png?w=720)

The difference is in Noto Sans KR. C downloaded separate slices for each weight, 46 in all, while D downloaded 19 (2). That's because D's slices are variable fonts. A variable font treats weight as a value on an axis called `wght`.

![The deployed D file nskr-119.woff2 loaded into Wakamai Fondue. 1 is the summary saying it's a variable font with one axis, 2 is the file name nskr-119.woff2, size 16 KB, format WOFF2, and 3 is the wght axis under Variable axes, with a minimum of 100 and a maximum of 900](7.png?w=720)

Load the deployed `nskr-119.woff2` into [Wakamai Fondue](https://wakamaifondue.com/), a font inspection tool, and it shows up as a variable font (1), with the `wght` axis covering 100 to 900 (3). 300, 400, 500 and 700 all fall in between, so this single 16 KB file (2) draws all four weights. To check without installing anything, open Google's CSS. If four `@font-face` rules with different weights point to the same file URL, it's a variable file. The 19 slices D downloaded have exactly the same numbers as the 19 slices C downloaded for weight 400. In other words, every character drawn in the other weights was in the same slices as the characters drawn in 400.

In exchange, each D slice is bigger than C's. For the same slice 119, C's 400 transfers 9.0 kB and D's 16.7 kB, about 1.9x. A variable font carries extra data to draw the weight axis, and my fontTools pipeline differs from Google's production process too. So for Noto Sans KR alone, the file count dropped sharply from 46 to 19, but the bytes dropped only 16%, from 441 kB to 370 kB. Since a slice is about 1.9x larger, each slice has to serve close to two weights on average before the variable slices download less.

Inter went from five files to two (1). The four weights of the normal style merged into one variable file, and the italic, which was only 400 to begin with, stays at one. This italic file is static, not variable, because when you request a single weight, Google serves a static file containing only that weight.

For the same reason, the heading font (3) is nearly identical in C and D: 6 slices and 113 kB in both. This page requested Noto Serif KR only at 700. For fonts that have a variable version, like the four families in this post, you only get the variable file once you request two or more weights, and the axis isn't trimmed to the requested range; you get the font's full range (200 to 900 for Noto Serif KR). JetBrains Mono is also requested only at 400, so it's a static file.

### D-range, Weights Requested as a Range

D and D-range download the same 28 font files. I compared all 268 files the two CSS files point to, including slices that aren't downloaded, and they were identical down to the byte. Only the CSS differs.

![Top is D, bottom is D-range, the same panel with the CSS filter on. 1 is D's fonts.css at 107 kB, 2 is 429 kB uncompressed. 3 is D-range's fonts.css at 43.1 kB, 4 is 173 kB uncompressed](8.png?w=720)

Request the weights as a list like `wght@300;400;500;700`, and Google writes one rule per weight, all pointing to the same file: 124 times four weights, 496 rules for Noto Sans KR alone. Request a range like `wght@300..700`, and you get just one rule per slice with `font-weight: 300 700`, like the code shown earlier. So the uncompressed CSS dropped from 429 kB to 173 kB (2, 4), and the transfer from 107 kB to 43 kB (1, 3).

That transfer, however, is the result of Netlify's compression. Netlify only got it down to about a quarter of the uncompressed size, while precompressing the same D CSS with Brotli gives 41 kB even at the lowest level, 0. At the highest level, 11, D is 14.9 kB and D-range 14.3 kB. At level 11 the gap shrinks to 0.6 kB, because rules that repeat the same strings compress well. What a range request reliably reduces is less the transfer than the amount of CSS the browser has to read.

## Font Arrival Time on Fast 4G

With bytes this different, how different is the time? I measured the same deployments again under DevTools' Fast 4G condition. According to the [DevTools source](https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/core/sdk/NetworkManager.ts), this preset's base values are 60 ms latency and 9 Mbps, and in practice it applies multipliers for 165 ms latency and 8.1 Mbps download. I used these applied values for the measurements too. Time runs from the document request until the last font response finishes, and I use the median of 9 runs per variant, each in a fresh browser with the cache disabled. This condition only simulates per-request latency and bandwidth, so it doesn't include real mobile network loss or phone CPU.

![Time the last font arrived on Fast 4G. Each variant has dots for 9 runs and a median bar. A clusters between 17.9 s and 18.8 s with a median of 18.5 s, B between 12.8 s and 13.7 s at 13.2 s. C ranges from 1.6 s to 2.7 s at 2.4 s, D from 1.5 s to 2.5 s at 2.1 s, and D-range from 1.5 s to 3.0 s at 2.2 s](9.png?w=720)

A took 18.5 s and B 13.2 s. These are close to bytes divided by bandwidth: 17.2 MB at 8.1 Mbps takes 17 s, and 12.0 MB takes 12 s. All 9 runs fell within one second, and across three separate measurements on the same day, the two variants' medians agreed within 0.3 s.

C, D and D-range, which have subsets, came in at around 2 s. Under a bandwidth-bound condition, time tracks bytes directly, so the 11 s cut by subsetting outweighs the 5 s cut by the format.

The order among C, D and D-range, on the other hand, couldn't be settled by this measurement. Even within a single variant, runs swung from 1.5 s to 3.0 s, and that spread was larger than the differences between variants. Most of the swing came from Netlify's CDN.

On October 27 I opened the same D eight more times under the same condition and captured the Network tab on each run. This time I added the response header `cache-status` as a column. Here are two of those runs side by side.

![Network panel from two Fast 4G loads of D. Top is a run where the fonts came from the CDN cache: 1 is "Netlify Edge"; hit in the Cache-Status column, and 2 is the Waterfall, where each bar has a short green part and a long blue part. 3 is DOMContentLoaded 373 ms, Load 1.42 s in the bottom bar. Bottom is a run that went all the way to the origin server: 4 is "Netlify Edge"; fwd=miss; fwd-status=200; stored, and 5 is the Waterfall, where most of each bar is green. 6 is DOMContentLoaded 889 ms, Load 2.21 s](10.png?w=720)

The top (1) is a run where every font came from the CDN cache, so it shows `hit`. The bottom (4) shows `fwd=miss`, a run where the CDN didn't have the files and went to the origin server and back. In this run the HTML and CSS also went to the origin. In the Waterfall bars (2, 5), green is the time spent waiting for the server's first response and blue is the time spent receiving the content. In the cached run green is short and blue is long, because the 28 fonts share the bandwidth. In the origin run most of each bar is green. Each Waterfall is scaled to its own total time, so bar lengths can't be compared top to bottom. Compare the times in the bottom bar (3, 6). Because the HTML came late from the origin, DOMContentLoaded slipped from 373 ms to 889 ms, and the font requests started that much later. On this page the last font finishes at the same moment as Load, so the difference remains as Load 1.42 s versus 2.21 s. 6 of the 8 runs were served entirely from cache and finished in 1.39 s to 1.44 s; the 2 that went to the origin took 2.21 s and 4.00 s. Without changing a single font, cache state alone made a bigger difference than the differences between variants.

On October 26 I measured again after raising the number of CDN warm-up loads to 6. Judging by the response header `cache-status`, in runs where the fonts weren't in the CDN cache and went to the origin server, the first byte of the last font usually took 370 ms to 750 ms to arrive, and once 1.3 s. Runs served from cache had a median of about 210 ms. The slowest runs (2.3 s to 3.3 s) were all runs where the fonts, the HTML or the CSS went to the origin. Even keeping only runs where every font came from cache, each variant still swung by 0.2 s to 0.8 s, and C had only 3 such runs out of 9. So I describe the difference between C and D only in bytes and file counts, not in time.

This measurement couldn't settle when the first paint happens (FCP) either. The medians were A 1.0 s, B 1.0 s, C 1.4 s, D 1.1 s and D-range 1.3 s, but in another measurement the same day C was 1.0 s, and D-range, with the smallest CSS, was slower than D. The differences between variants are smaller than the differences between runs. This page sets `font-display: swap`, so it draws text in another font before the web fonts arrive. So even A's users start reading within 1 s, and over the next 17 s the text switches to each font as it arrives.

## The Costs Subsets Leave Behind

Subsetting being the answer doesn't mean it comes free. There are five costs.

First, the CSS gets bigger. A's `fonts.css` transfers 0.4 kB, while C and D transfer 107 kB, because each of the 661 rules carries its own character range. Uncompressed, C is 434 kB and D 429 kB. The browser doesn't render until CSS loaded through `<link>` has fully arrived, so this CSS has to arrive before the font files. If you self-host, it's worth precompressing this CSS at a high level. As shown earlier, the size Netlify sent and the size precompressed at the highest level differ sevenfold for this CSS.

Second, the number of requests grows. B's 11 files became 58 in C. On HTTP/2 and later, many requests can go out at once over a single connection, so each extra request costs little, but not nothing. I didn't measure at what request count that cost outweighs the byte savings.

Third, data overlaps across slices. Each slice repeats the font's common data, so the more slices you download, the more this duplication piles up. Cutting the 17,655 Noto Sans KR characters covered by Google's ranges into a single 400-weight file gives 1,302,420 B, but splitting the same characters into 124 slices and adding them all up gives 1,823,312 B, about 40% more. A page that downloads nearly every slice ends up downloading more than a single file would. This page downloaded at most 19 of 124 slices per weight, so it's far from that case.

Fourth, you deploy many more files. The C folder in this demo holds 661 slices. The browser downloads 58, but every one of them has to be on the server. What the browser downloads and what you upload to the server need to be counted separately.

Fifth, characters outside the ranges are drawn in a fallback font. Google's ranges cover only 17,655 of Noto Sans KR's 23,174 characters, so if any of the other 5,519 appear, they're drawn in a font that isn't the web font. Most are rarely used Hanja, so this page wasn't affected, but services where Hanja shows up in names of people or places should check.

And on screens where characters arrive later, like input fields or chat, a new character makes the browser download its slice at that moment. Every post uses different characters, so moving on to the next post may download new slices too. The transfer measured on the first screen isn't the whole story. I didn't measure how much more a second page downloads.

## Ways to Apply Subsets

If you use Google Fonts, you can simply link the CSS API as is. Next.js's `next/font/google` also fetches this response at build time and self-hosts it as is. The difference between these two paths is measured separately later.

For self-hosting, packages like Fontsource (a project that packages open-source fonts as npm packages) ship subsets as well. The CSS of `@fontsource/noto-sans-kr` 5.3.1, the latest as of 2026-10-22, has the C shape, split into the same 124 ranges as Google, and this structure dates from 5.2.8. In 5.2.7, the default CSS had no Korean rules, and Korean lived separately in a single file with no range. If you need variable slices, `@fontsource-variable/noto-sans-kr` has the D-range shape, with the same ranges declared with a single `font-weight: 100 900`. It's safer to open the CSS of the version you use and check its `unicode-range`.

For fonts that aren't on Google, you cut them yourself. That's case C. Take Google's list of ranges, cut each range with fontTools' subset module (the same engine as `pyftsubset`), save the results as woff2, and generate a rule with a `unicode-range` for each slice. The build scripts in `scripts/` of the demo repo do this.

When checking your own service, don't rely on file names. The figures in this post use renamed files for readability, but real Google responses and `next/font` output have hashed names, so you can't see weights or slice numbers. Instead, turn on the Font filter and look at the file count and sizes. If there's one MB-scale file per weight, there are no subsets. If there are dozens of slices and their count grows with the number of weights, they're static slices; if you open the `fonts.css` response under the CSS filter and `font-weight` is written as a range like `100 900`, they're variable slices.

## The Cost of Loading from Google's Servers

Subsetting reduced how much gets downloaded. The remaining methods barely reduce it. Instead, they decide when the fonts are downloaded and what the screen looks like while they download. The first of these is where the fonts are loaded from.

The D so far downloaded Google's response and served it from the same site. Real services often link Google's CSS URL directly. The browser then fetches the CSS from `fonts.googleapis.com` and the fonts from `fonts.gstatic.com`, which means two more places to connect to. To see this cost, I made two more pages that send the same request as D directly to Google. One only links the CSS, and the other follows the embed code fonts.google.com provides and adds `preconnect`, which opens connections ahead of time, for both hosts.

I measured on October 26 under the same Fast 4G condition, and the values are medians of runs where every font came from cache. That was 7 of 9 runs for D and all 9 for the others. The measurement date and the number of warm-up loads differ from the earlier figure, so D's value differs too (2.1 s versus 1.74 s). Compare only within this table.

Keeping only cached runs favors serving from the same site. On low-traffic sites the CDN cache is often empty, so, as with C earlier, many runs go to the origin server. That cost falls on self-hosting.

| Page | Font transfer | Last font arrival |
|---|---|---|
| D, served from the same site | 579 kB | 1.74 s |
| Direct connection to Google | 576 kB | 1.73 s |
| Direct connection to Google, with preconnect | 576 kB | 1.76 s |

The three are within 0.03 s of each other, less than the variation from opening the same page repeatedly (0.2 s to 0.8 s). The connection cost was clearly there. The first connection to `fonts.googleapis.com` (including TLS, which sets up the encrypted connection) took about 80 ms to 190 ms per run, and this time comes before the CSS is fetched. But the connection time to `fonts.gstatic.com` showed up as 0 in the font requests. Google's CSS response includes a `Link: <https://fonts.gstatic.com>; rel=preconnect; crossorigin` header, so the browser opens the connection to the font server ahead of time while it fetches the CSS. This also seems to be why the gstatic line among the `preconnect` hints in the HTML made no difference. The googleapis line made no difference either, but I didn't break down why, or why the googleapis connection time didn't show up in the last font arrival time.

![Connection order when serving from the same site versus connecting directly to Google. From the same site, the HTML, the CSS and 28 fonts are fetched in turn over a single site connection. Connecting directly to Google, after the HTML a new connection to googleapis fetches the CSS; while the CSS is being fetched, the Link header opens the gstatic connection ahead of time, and then the 28 fonts are fetched](11.png?w=720)

That said, this table understates the cost of adding places to connect to. DevTools' Fast 4G adds latency per request, so connection setup (DNS, TCP, TLS) gets no added latency. In this measurement, connecting to Netlify with Fast 4G on usually took around 147 ms (of which TLS was around 74 ms), which is simply what my own line (in Seoul) gives. The [Lighthouse throttling docs](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md) also say request-level latency is less accurate than packet-level. One connection takes several round trips, so on networks with longer round-trip times, each extra place to connect to costs more. I didn't measure how much.

Connecting directly to Google used to be thought to have one advantage. Since many sites use the same Google font URLs, a font already downloaded on another site could be reused from the browser cache. Chrome blocked this sharing starting with version 86. According to [Chrome's article on cache partitioning](https://developer.chrome.com/blog/http-cache-partitioning), the cache key includes the top-level site and the frame's site along with the resource URL. That means different sites keep separate caches even for the same URL.

Sure enough, fonts at the same URL were downloaded from scratch once the site changed. With a single Chrome profile, I opened the page that connects directly to Google twice on the deployed site, then twice on my local server (a different site). Reopening on the same site served all 28 fonts from cache, but after switching sites, the same 28 fonts at the same URLs, 576 kB, were downloaded again. Running the same sequence in Chrome with cache partitioning disabled (`--disable-features=SplitCacheByNetworkIsolationKey`) served all 28 from cache even after switching sites. In today's Chrome there is no cache that lets sites share fonts. HTTP Archive's [2024 Web Almanac fonts chapter](https://almanac.httparchive.org/en/2024/fonts) also says cache partitioning eliminated the benefit of shared font CDNs, and that the share of sites serving fonts only from their own site grew from 22% in 2022 to 28% in 2024 on desktop.

## next/font Preload and Fallback Fonts

Next.js's `next/font` makes this choice for you at build time. When you build, it downloads Google's CSS and fonts and serves them from your own site, preloads the fonts you designate, and adjusts the size of the fallback font used before the web font arrives to match it. The loader in 16.3.4 fetches the CSS with Chrome 104's User-Agent, downloads every slice file in it, and only rewrites the URLs, so `unicode-range` stays as is. When I sent a request with the same User-Agent on 2026-10-21, I got the same rules and the same files as D.

I built a Next.js 16.3.4 page with the same body and the same four families, exported it as static files and put it on the same site. Noto Sans KR lists four weights, and all four families use `subsets: ['latin']`. The only values allowed in `subsets` for Noto Sans KR are cyrillic, latin, latin-ext and vietnamese, so there's no way to choose Korean. Korean isn't dropped, though. `subsets` only decides which slices get preloaded, and every Korean slice's `@font-face` stays in the CSS. The output contains 268 font files.

It downloaded 631 kB, 52 kB more than D. It downloaded Noto Sans KR's latin slice (26 kB), which this page doesn't use, and Inter's italic came as a variable file, 26 kB larger than D's static file. Under the same conditions as the table above, the last font arrived at 1.81 s (median of 7 runs). That's 0.07 s off D in the table (1.74 s), smaller than the variation across repeated loads. What `next/font` adds on top is preload and fallback font adjustment.

Preload doesn't apply to the Korean slices. The HTML contains 5 preloads, all of them latin slices, because in `next/font`, `subsets` can't select Korean slices. You could write preloads directly into the HTML for slices every post downloads, like the 20 frequency slices, but I didn't measure that this time. On top of that, one of these 5, Noto Sans KR's latin slice (25,804 B), was a file this page didn't need. Build with preload turned off, and this file isn't even requested, because, as shown earlier, Inter draws the Latin characters first. The build with preload off got its last font at 1.87 s, 0.13 s off D.

Fallback font adjustment applies only to Latin characters. `next/font` generates a rule like `Noto Sans KR Fallback` for each font and matches the fallback font's size to the web font with `size-adjust` and `ascent-override`. But it's built on `local("Arial")` (Times New Roman for Noto Serif KR). Arial has no Korean, so Korean falls through to the next fallback font, which has no adjustment. Looking at which fonts actually drew a body paragraph right after first paint, Latin was already Inter, and Korean whose slices hadn't arrived yet was Apple SD Gothic Neo, the default Korean font on macOS. You can also see this under Rendered Fonts at the bottom of the Computed tab in the DevTools Elements panel; for the measurement I used `CSS.getPlatformFontsForNode` from the Chrome DevTools Protocol, which returns the same information.

## Why Choose next/font

So far, `next/font` hasn't made the Korean page faster. Google already handles subsetting, and preload and fallback adjustment don't apply to Korean. There are other reasons it's widely used anyway.

`next/font` first appeared in October 2022 in [Next.js 13](https://nextjs.org/blog/next-13), under the name `@next/font`. The announcement presents it as removing external network requests for privacy and performance, downloading fonts at build time to self-host them, and eliminating layout shift with `size-adjust`. It specifically highlights that the browser sends no requests to Google at all.

On the privacy side, there was a German ruling earlier that same year. The [Munich Regional Court ruling](https://www.gesetze-bayern.de/Content/Document/Y-300-Z-GRURRS-B-2022-N-612) of January 20, 2022 (case no. 3 O 17493/20) held that a website loading Google Fonts and passing visitors' IP addresses to Google without consent was unlawful, and awarded 100 euros in damages. The court pointed to the fact that Google Fonts can be used without connecting to Google's servers. With self-hosting, there's nowhere for this problem to arise.

The remaining reasons tie into what we saw earlier. The shared cache you used to get by connecting directly to Google is gone in Chrome. The cost of adding places to connect to came out small in this measurement, but only because Fast 4G doesn't add latency to connection time. And doing by hand the work of downloading Google's response, rewriting the URLs, setting up preload and matching fallback fonts takes several scripts, as in this post's demo. `next/font` reduces that to a single function call.

## What the Screen Shows When Fonts Are Late

`font-display` decides what to draw before a font arrives. If you don't set it, the default is `auto`, and according to [web.dev's font best practices article](https://web.dev/articles/font-best-practices), Chromium-based browsers and Firefox then wait for the font and draw no text for up to 3 seconds. Google's CSS, too, unless you add `display=swap` to the URL, gives rules with no `font-display`. Every page so far sets `swap`: draw with a fallback font first, then swap when the web font arrives. If glyph widths and line heights differ at the swap, paragraphs shift, and the accumulated measure of that shifting is CLS (Cumulative Layout Shift).

The `swap` pages in the D family had a median CLS of 0.018 to 0.020, reaching up to 0.024 in individual runs. That's well below the 0.1 that [web.dev's CLS article](https://web.dev/articles/cls) sets as the threshold for "good". The shifting happened not once but in several steps. Slices arrived at different times, so right after first paint, some characters in a paragraph were sometimes in Noto Sans KR while the rest were in Apple SD Gothic Neo.

The builds with `next/font`'s fallback adjustment off and on also had the same CLS, 0.017 and 0.018. The Latin characters the adjustment applies to had nothing to do with the shifting. Only the build with preload off came in at about half, 0.009; it looks like the large shifts went from two to one, but I didn't confirm the cause.

I also measured a page that keeps D's files and only switches to `font-display: optional`. CLS was 0.0002 or below in all 9 runs. In exchange, on the first visit the text stayed in fallback fonts to the end, even after the fonts finished downloading: Apple SD Gothic Neo for Korean and the system font for Latin, and three separate first visits gave the same result. Under the [font-display section of the CSS Fonts 4 spec](https://www.w3.org/TR/css-fonts-4/#font-display-desc), with `optional` a font that isn't ready quickly enough for first paint isn't used on that page. The Chrome in this measurement downloaded the fonts all the way, so a first-time visitor downloads the fonts without ever seeing them. Fonts left in the cache may be used on the next visit. In the 2024 Web Almanac's desktop data, about 44% of sites use `swap`, and under 1% use `optional`.

This CLS was measured with macOS fallback fonts. On Windows the fallback font is Malgun Gothic, so the values may differ. You can also adjust yourself the Korean fallback font that `next/font` can't: take `local("Apple SD Gothic Neo")` or `local("Malgun Gothic")` as the base of an `@font-face`, set `size-adjust` and `ascent-override` on it, and use it as the fallback. I didn't measure this time. For the size of the shifts real users experience and the elements that shift the most, collecting data with the attribution build of the `web-vitals` library is more accurate than lab measurement.

## Fonts on Korean Services

What do real services do? On October 26, 2026, I opened the home pages of several Korean services in headless Chrome as a first visit and measured the font transfer with no network throttling. I measured each one twice, and the two runs differed by no more than a few hundred bytes.

| Service | Font | Subsets | Font files | Font transfer |
|---|---|---|---|---|
| Musinsa | Pretendard, four weights | None | 4 | 3,279 kB |
| Toss | Toss Product Sans, four weights | None | 5 | 2,049 kB |
| Kakao corporate site | Two Kakao typefaces, two weights each | None | 4 | 1,395 kB |
| Kurly | Pretendard variable font | 92 slices | 19 | 501 kB |
| Daangn (Karrot) | Pretendard variable font | 92 slices | 10 | 262 kB |

![Bar chart of first-visit font transfer on Korean service home pages. Musinsa 3,279 kB, Toss 2,049 kB and the Kakao corporate site 1,395 kB, which have no subsets, are gray, and Kurly 501 kB and Daangn 262 kB, which use subsets, are blue](12.png?w=720)

The services without subsets are in the same state as this post's B: woff2, but each file holds every character for one weight. Musinsa's Pretendard is over 800 kB per weight. Of Toss's five files, four are per-weight Toss Product Sans files and the remaining one is a different 10 kB font. Kurly and Daangn, by contrast, use CSS that splits the Pretendard variable font into 92 slices, and download only the slices containing characters used on the page. Divided by Fast 4G's 8.1 Mbps, 3,279 kB is about 3.2 s and 262 kB about 0.3 s. These are calculated, not measured, but they're more than ten times larger than the time differences from a direct Google connection or preload measured in this post.

These are first-visit values for a single home page, so they vary by page and by time. With one file per weight, once the files are downloaded they're served from cache on later visits, so for services with many returning visitors the difference shrinks.

Some services aren't in the table. Naver draws body text in system fonts and downloaded a single NanumSquare Neo file (389 kB) for only some elements. Baemin (Baedal Minjok) declares Pretendard but didn't download it on the home page, downloading only one file of its own typeface (140 kB).

## Subsets Come First

A font without subsets downloads every character in each file, no matter how many characters the page uses. On this four-font page, that came to 17.2 MB as TTF and 12.0 MB as woff2, and on Fast 4G the last font took 18.5 s and 13.2 s to arrive. With subsets, the amount downloaded follows the characters used on the page. The same page came down to 0.6 MB and around 2 s.

Subsetting matters especially for Korean pages because of file size. Converting to woff2 cuts about a third, but this page's Korean fonts still weighed 2 MB to 3.2 MB per weight. A single serif font added to draw a few headings was larger than the body font.

The choices made after subsetting couldn't be told apart in time by this measurement. Static and variable slices couldn't be ranked, and the differences made by connecting directly to Google versus serving from your own site, by preload, and by fallback adjustment were all smaller than the variation across repeated loads of the same page. That said, Fast 4G adds no latency to connection setup, so the cost of the extra places to connect to in a direct Google connection may have come out small in this measurement. So these choices are better made on other grounds. Privacy and cache partitioning favor self-hosting, and `next/font` is the tool that takes that work off your hands. For `font-display`, decide whether to accept small shifts with `swap` or to show fallback fonts on the first visit with `optional`.

There are also methods I didn't compare this time. Using fewer weights and families cuts the download without subsets by as many files as you drop. This blog, too, uses only two weights, 400 and 700. You could also ship four weights in a single variable font file without subsets. I measured neither this time.

Some questions also remain open: the cost each extra place to connect to adds on networks with long round-trip times, CLS when text is drawn in Malgun Gothic on Windows, why CLS halved with preload off, how much new slice data is downloaded when moving on to the next post, and the cause of the variation that remains even among cached runs. I believe none of these is large enough to overturn the difference subsetting made. But that's an inference, not a measurement.

Some large Korean services still ship files of hundreds of kB per weight without subsets. I encourage you to open your own service's Network panel, turn on the Font filter, and check whether files like these are there. If they are, look at subsets before `next/font` or preload.

:::ref
- [docs] [MDN, unicode-range](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/unicode-range)
- [repo] [Fontsource](https://github.com/fontsource/fontsource)
- [docs] [fontTools, pyftsubset](https://fonttools.readthedocs.io/en/latest/subset/index.html)
:::
