# AI Crawlers and Localized llms.txt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Document an explicit allow policy for AI crawlers and make root and localized `llms.txt` endpoints accurate and usable.

**Architecture:** Keep Next metadata routes and localized app routes. Put policy data and text generation in pure helpers so behavior can be tested without loading Next or Contentlayer route modules.

**Tech Stack:** Next.js 16, TypeScript, Node test runner, Contentlayer

**Spec:** `docs/superpowers/specs/2026-08-18-ai-search-seo-discovery-design.md`

## Global Constraints

- Search, user-fetch, and model-training crawlers are all allowed.
- Crawler access does not waive or replace CC BY-NC licensing.
- `llms.txt` is an experimental guide, not a claimed ranking factor.
- `/llms.txt` is the public Korean path; foreign locale paths stay prefixed.
- `draft` and `ignore` posts remain excluded.
- Preserve the RSS matcher and unrelated proxy behavior.

---

### Task 1: Explicit crawler policy

**Files:**
- Create: `src/lib/crawler-policy.ts`
- Create: `src/lib/crawler-policy.test.mjs`
- Modify: `src/app/robots.ts`

**Interfaces:**
- Produces: `getCrawlerRules(): Array<{ userAgent: string | string[]; allow: string }>`

- [ ] **Step 1: Write the failing policy test**

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import { getCrawlerRules } from './crawler-policy.ts'

test('allows search, user-fetch, training, and fallback crawlers', () => {
  assert.deepEqual(getCrawlerRules(), [
    { userAgent: 'Googlebot', allow: '/' },
    { userAgent: ['OAI-SearchBot', 'ChatGPT-User', 'GPTBot'], allow: '/' },
    { userAgent: ['Claude-SearchBot', 'Claude-User', 'ClaudeBot'], allow: '/' },
    { userAgent: ['PerplexityBot', 'Perplexity-User'], allow: '/' },
    { userAgent: '*', allow: '/' },
  ])
})
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test src/lib/crawler-policy.test.mjs`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement and connect robots**

Return a fresh array with the exact groups above. In `src/app/robots.ts`, set `rules: getCrawlerRules()` and retain the existing sitemap URL.

- [ ] **Step 4: Verify GREEN**

Run: `node --test src/lib/crawler-policy.test.mjs`

Run: `npx eslint src/lib/crawler-policy.ts src/app/robots.ts`

Expected: test and lint PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/lib/crawler-policy.ts src/lib/crawler-policy.test.mjs src/app/robots.ts
git commit -m "feat: document AI crawler access policy"
```

### Task 2: Root llms.txt routing

**Files:**
- Modify: `src/proxy.test.mjs`
- Modify: `src/lib/locale-request.ts`
- Modify: `src/proxy.ts`

**Interfaces:**
- Consumes: existing `classifyLocaleRequest(pathname)`.

- [ ] **Step 1: Add the failing route test**

```js
assert.deepEqual(classifyLocaleRequest('/llms.txt'), {
  kind: 'rewrite',
  pathname: '/ko/llms.txt',
})
```

Add it beside the existing `/rss.xml` assertion.

- [ ] **Step 2: Run and verify RED**

Run: `node --test src/proxy.test.mjs`

Expected: FAIL with actual `{ kind: 'next' }` for `/llms.txt`.

- [ ] **Step 3: Implement the route exception**

Treat `'/rss.xml'` and `'/llms.txt'` as Korean public file routes before the generic file-like bypass. Add `'/llms.txt'` to the proxy matcher array beside `'/rss.xml'`.

- [ ] **Step 4: Verify GREEN**

Run: `node --test src/proxy.test.mjs`

Expected: all proxy tests PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/proxy.test.mjs src/lib/locale-request.ts src/proxy.ts
git commit -m "fix: route the Korean llms guide"
```

### Task 3: Localized llms.txt text builder

**Files:**
- Create: `src/lib/llms-text.ts`
- Create: `src/lib/llms-text.test.mjs`
- Modify: `src/i18n/dictionaries.ts`
- Modify: `src/lib/localized-posts.test.mjs`

**Interfaces:**
- Produces: `type LlmsPost = { slug: string; title: string; seoTitle?: string; description?: string; excerpt: string }`
- Produces: `buildLlmsText(input: { locale: Locale; siteUrl: string; siteTitle: string; siteDescription: string; authorName: string; authorNickname: string; stack: readonly string[]; labels: LlmsLabels; posts: readonly LlmsPost[] }): string`
- Adds dictionary section `llms` with `intro`, `about`, `rss`, `sitemap`, and `posts`.

- [ ] **Step 1: Write the failing builder tests**

Create Korean and English fixtures. Assert:

```js
assert.match(koreanText, /^# Test Blog$/m)
assert.match(koreanText, /> 한국어 설명/)
assert.match(
  koreanText,
  /\[RSS Feed\]\(https:\/\/example.com\/rss.xml\): RSS 구독/,
)
assert.match(
  koreanText,
  /\[SEO 제목\]\(https:\/\/example.com\/260818\): 글 설명/,
)
assert.doesNotMatch(koreanText, /English site description/)
assert.match(englishText, /https:\/\/example.com\/en\/about/)
assert.match(englishText, /https:\/\/example.com\/en\/rss.xml/)
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test src/lib/llms-text.test.mjs`

Expected: FAIL because the builder module does not exist.

- [ ] **Step 3: Implement the pure builder**

Use `toPublicPath(locale, path)` for localized links. Normalize summaries with `.replace(/\s+/g, ' ').trim()`. Use `post.seoTitle || post.title` and `post.description || post.excerpt`.

- [ ] **Step 4: Add localized dictionary labels**

Add a complete `llms` section for all six locales. Extend dictionary coverage:

```js
assert.ok(dictionary.llms.intro)
assert.ok(dictionary.llms.about)
assert.ok(dictionary.llms.rss)
assert.ok(dictionary.llms.sitemap)
assert.ok(dictionary.llms.posts)
```

- [ ] **Step 5: Verify GREEN**

Run: `node --test src/lib/llms-text.test.mjs src/lib/localized-posts.test.mjs`

Expected: all tests PASS.

- [ ] **Step 6: Commit Task 3**

```bash
git add src/lib/llms-text.ts src/lib/llms-text.test.mjs src/i18n/dictionaries.ts src/lib/localized-posts.test.mjs
git commit -m "feat: build localized llms guides"
```

### Task 4: Route integration and HTTP verification

**Files:**
- Modify: `src/app/[lang]/llms.txt/route.ts`

**Interfaces:**
- Consumes: `buildLlmsText` from Task 3.
- Consumes: existing locale post filtering and public-post sorting.

- [ ] **Step 1: Replace inline mixed-language generation**

Keep locale validation, `getSortedPublishedPosts(getPostsForLocale(...))`, content type, and cache headers. Pass the localized dictionary and filtered posts to `buildLlmsText`; remove hard-coded Korean descriptions from the route.

- [ ] **Step 2: Run unit and lint verification**

Run: `node --test src/proxy.test.mjs src/lib/crawler-policy.test.mjs src/lib/llms-text.test.mjs src/lib/localized-posts.test.mjs`

Run: `npx eslint src/lib/crawler-policy.ts src/lib/llms-text.ts src/app/robots.ts src/proxy.ts src/lib/locale-request.ts 'src/app/[lang]/llms.txt/route.ts' src/i18n/dictionaries.ts`

Expected: all tests and changed-file lint PASS.

- [ ] **Step 3: Build and inspect real responses**

Run: `npm run build`

Run the built server, then request `/llms.txt` and `/en/llms.txt`. Assert both return 200 and `text/plain; charset=utf-8`; Korean output contains `/rss.xml`; English output contains `/en/rss.xml` without Korean descriptive copy.

- [ ] **Step 4: Commit Task 4**

```bash
git add 'src/app/[lang]/llms.txt/route.ts'
git commit -m "feat: serve localized llms guides"
```

