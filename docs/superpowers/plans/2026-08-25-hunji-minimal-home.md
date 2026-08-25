# 훈지 Minimal Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the curated blog homepage with the approved `훈지` value essay, five latest posts, minimal navigation/footer, home-based author identity, and transparent typographic favicon.

**Architecture:** Keep the existing locale-first Next.js App Router structure and content sorting pipeline. Make the homepage model a small pure function, keep all visible copy in the locale dictionaries, redirect the retained About route at the route boundary, and point author metadata at each locale home rather than a removed profile page.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Contentlayer, Node test runner

**Spec:** `docs/superpowers/specs/2026-08-25-hunji-minimal-home-design.md`

## Global Constraints

- The visible brand is exactly `훈지`; do not add a symbol, background shape, border, accent color, gradient, shadow, or decorative icon.
- Use Wanted Sans Bold for the wordmark and existing neutral design tokens for all colors.
- Render exactly four value paragraphs followed by the five newest published posts for the active locale.
- Each post row contains only title and publication date; preserve a full-row link target.
- Header utilities remain Posts, Search, Language, and Theme. About is removed.
- Footer contains only GitHub, LinkedIn, and RSS.
- Existing `/{lang}/about` URLs permanently redirect to that locale's home.
- Preserve the user's unrelated `content/260723/index.md` worktree change.
- Do not add dependencies or change post-detail/category-page design.

---

### Task 1: Latest-post homepage model

**Files:**
- Modify: `src/lib/homepage-index.test.mjs`
- Modify: `src/lib/homepage-index.ts`

**Interfaces:**
- Consumes: posts already sorted newest-first by `getSortedPublishedPosts()`.
- Produces: `getHomepagePosts<T>(posts: readonly T[], limit?: number): T[]` and the existing `formatHomepageDate(date: string, locale: string): string`.

- [ ] **Step 1: Replace curated-index tests with failing latest-five tests**

```js
import { formatHomepageDate, getHomepagePosts } from "./homepage-index.ts";

test("returns the five newest posts in the supplied order", () => {
  assert.deepEqual(
    getHomepagePosts(posts).map(post => post.slug),
    ["/latest", "/fiber", "/second", "/third", "/fourth"],
  );
});

test("handles short and empty collections without padding", () => {
  assert.deepEqual(getHomepagePosts(posts.slice(0, 2)), posts.slice(0, 2));
  assert.deepEqual(getHomepagePosts([]), []);
});
```

- [ ] **Step 2: Run the focused test and confirm the red state**

Run: `node --test src/lib/homepage-index.test.mjs`

Expected: FAIL because `getHomepagePosts` is not exported.

- [ ] **Step 3: Replace the featured/stream model with the minimal selector**

```ts
export function getHomepagePosts<T>(
  posts: readonly T[],
  limit = 5,
): T[] {
  return posts.slice(0, limit);
}
```

Keep `formatHomepageDate` unchanged so UTC content dates do not shift by locale.

- [ ] **Step 4: Run the focused test and confirm the green state**

Run: `node --test src/lib/homepage-index.test.mjs`

Expected: all homepage-index tests PASS.

- [ ] **Step 5: Commit the model change**

```bash
git add src/lib/homepage-index.ts src/lib/homepage-index.test.mjs
git commit -m "refactor: select latest posts for minimal home"
```

### Task 2: Localized value essay and minimal homepage

**Files:**
- Modify: `src/i18n/dictionaries.ts`
- Modify: `src/lib/localized-posts.test.mjs`
- Modify: `src/app/[lang]/page.tsx`
- Modify: `src/lib/site-metadata.ts`
- Modify: `src/app/[lang]/layout.tsx`

**Interfaces:**
- Consumes: `getHomepagePosts(sortedPosts)` from Task 1 and `getDictionary(locale)`.
- Produces: `siteMetadata.brand: "훈지"` and `dictionary.home.values: readonly [string, string, string, string]` for every supported locale.

- [ ] **Step 1: Add failing dictionary and brand assertions**

In `src/lib/localized-posts.test.mjs`, change the dictionary coverage assertions to require the new contract:

```js
assert.equal(dictionary.home.values.length, 4)
assert.ok(dictionary.home.values.every(value => value.length > 0))
assert.ok(dictionary.home.recentPosts)
assert.ok(dictionary.home.viewAll)
```

Add to the homepage test file:

```js
import { siteMetadata } from "./site-metadata.ts";

test("uses the approved typographic brand", () => {
  assert.equal(siteMetadata.brand, "훈지");
});
```

- [ ] **Step 2: Run focused tests and confirm the red state**

Run: `node --test src/lib/homepage-index.test.mjs src/lib/localized-posts.test.mjs`

Expected: FAIL because `home.values` and `siteMetadata.brand` do not exist.

- [ ] **Step 3: Add the typed brand and four translated paragraphs**

Add `brand: '훈지'` to `siteMetadata`. Extend `Dictionary.home` with:

```ts
values: readonly [string, string, string, string]
```

Use the four exact Korean paragraphs from the spec for `ko`. Add faithful English, Japanese, Spanish, Brazilian Portuguese, and Simplified Chinese translations, preserving `훈지` untranslated and preserving the meaning of perspective reversal, user-first engineering, observable failure/context, and writing as discovery.

- [ ] **Step 4: Replace the homepage modules with the essay and five rows**

In `src/app/[lang]/page.tsx`:

```tsx
const latestPosts = getHomepagePosts(
  getSortedPublishedPosts(getPostsForLocale(allPosts, lang)),
);
```

Render one unlabeled essay section. Render `dictionary.home.values[0]` as the larger bold paragraph and the remaining three values as regular body paragraphs. Render one recent-post section with five full-width `Link` rows containing only `post.title` and `formatHomepageDate(post.date, lang)`, then the localized `dictionary.home.viewAll` link. Remove featured post keys, translation fallback curation, categories, descriptions, reading time, and the homepage Search trigger.

Update homepage `WebSite.author` so `alternateName` is `siteMetadata.brand`, `@id` comes from the home-based author identity in Task 4, and `url` is the active locale home. Update the layout default title to ``${siteMetadata.brand} · Frontend Engineering`` and theme colors to the current canvas tokens (`#ffffff` light, `#111315` dark).

- [ ] **Step 5: Run focused tests, type-aware lint, and inspect the diff**

Run: `node --test src/lib/homepage-index.test.mjs src/lib/localized-posts.test.mjs`

Expected: PASS.

Run: `npx eslint src/app/'[lang]'/page.tsx src/app/'[lang]'/layout.tsx src/i18n/dictionaries.ts src/lib/site-metadata.ts src/lib/homepage-index.ts`

Expected: no errors.

- [ ] **Step 6: Commit the homepage change**

```bash
git add src/app/'[lang]'/page.tsx src/app/'[lang]'/layout.tsx src/i18n/dictionaries.ts src/lib/site-metadata.ts src/lib/localized-posts.test.mjs
git commit -m "feat: introduce hunji minimal homepage"
```

### Task 3: Minimal global chrome

**Files:**
- Modify: `src/components/Header.tsx`
- Modify: `src/components/Footer.tsx`

**Interfaces:**
- Consumes: `siteMetadata.brand`, locale-specific public paths, and existing Search/Language/Theme controls.
- Produces: a one-line brand header and external-links-only footer shared by all locale pages.

- [ ] **Step 1: Add a source-level regression test for chrome content**

Create assertions in `src/lib/homepage-index.test.mjs` that read the two component sources and verify the stable requirements:

```js
assert.match(headerSource, /siteMetadata\.brand/)
assert.doesNotMatch(headerSource, /navigation\.about/)
assert.doesNotMatch(headerSource, /Frontend Engineer/)
assert.doesNotMatch(footerSource, /new Date\(\)/)
assert.doesNotMatch(footerSource, /mailto:/)
```

- [ ] **Step 2: Run the focused test and confirm the red state**

Run: `node --test src/lib/homepage-index.test.mjs`

Expected: FAIL against the current header/footer source.

- [ ] **Step 3: Simplify Header and Footer**

Header requirements:

```tsx
<Link href={homePath} aria-label={`${siteMetadata.brand} home`}>
  <span className="text-lg font-bold tracking-[-0.03em] text-ink">
    {siteMetadata.brand}
  </span>
</Link>
```

Keep only the Posts nav link plus `SearchModal`, `LanguageSelector`, and theme button on desktop and mobile. Keep `aria-expanded`, menu label, and existing theme/search/language behaviors. Remove the role subtitle and About link. Keep a single-row closed header on mobile.

Footer requirements: remove copyright and Email, preserve only GitHub, LinkedIn, and locale RSS links, and retain visible keyboard focus/hover behavior.

- [ ] **Step 4: Run focused test and lint**

Run: `node --test src/lib/homepage-index.test.mjs`

Expected: PASS.

Run: `npx eslint src/components/Header.tsx src/components/Footer.tsx`

Expected: no errors.

- [ ] **Step 5: Commit the chrome change**

```bash
git add src/components/Header.tsx src/components/Footer.tsx src/lib/homepage-index.test.mjs
git commit -m "feat: simplify hunji navigation and footer"
```

### Task 4: Retire About as an independent page

**Files:**
- Modify: `src/lib/author-identity.test.mjs`
- Modify: `src/lib/author-identity.ts`
- Modify: `src/lib/localized-posts.test.mjs`
- Modify: `src/i18n/locales.ts`
- Modify: `src/app/[lang]/about/page.tsx`
- Modify: `src/app/[lang]/[slug]/page.tsx`
- Modify: `src/app/sitemap.ts`
- Modify: `src/lib/llms-text.test.mjs`
- Modify: `src/lib/llms-text.ts`
- Modify: `src/i18n/dictionaries.ts`

**Interfaces:**
- Consumes: `toPublicPath(locale, '/')` and `siteMetadata.siteUrl`.
- Produces: `getAuthorEntityId(siteUrl) === normalizedSiteUrl + '/#person'`; permanent locale-home redirects for old About URLs; no public index entries for About.

- [ ] **Step 1: Change tests to the home-based identity contract**

Update `author-identity.test.mjs` expectations:

```js
assert.equal(getAuthorEntityId('https://example.com'), 'https://example.com/#person')
assert.equal(getAuthorEntityId('https://example.com/'), 'https://example.com/#person')
```

Update the locale switch test so `/pt-BR/about` is no longer treated as a shared navigable page and falls back to `/es/posts`. Update llms-text tests so the generated index has no `/about` URL or `## About` section and lists RSS/Sitemap before Posts.

- [ ] **Step 2: Run focused tests and confirm the red state**

Run: `node --test src/lib/author-identity.test.mjs src/lib/localized-posts.test.mjs src/lib/llms-text.test.mjs`

Expected: FAIL because current identity and machine-readable navigation still point at `/about`.

- [ ] **Step 3: Redirect the route and remove About from public indexes**

Replace `src/app/[lang]/about/page.tsx` with locale validation and:

```ts
permanentRedirect(toPublicPath(lang, "/"));
```

Remove `/about` from `src/app/sitemap.ts` route definitions and `src/i18n/locales.ts` shared paths. Change `getAuthorEntityId` to `/#person`. In article JSON-LD, point author and publisher `url` to the active locale home.

Remove the About block/link from `buildLlmsText`, remove `about` from `LlmsLabels`, and remove the now-unused `llms.about`, `navigation.about`, and `Dictionary.about` fields/translations. Retain the redirect route itself for old inbound links.

- [ ] **Step 4: Run focused tests and lint**

Run: `node --test src/lib/author-identity.test.mjs src/lib/localized-posts.test.mjs src/lib/llms-text.test.mjs`

Expected: PASS.

Run: `npx eslint src/app/'[lang]'/about/page.tsx src/app/'[lang]'/'[slug]'/page.tsx src/app/sitemap.ts src/lib/author-identity.ts src/lib/llms-text.ts src/i18n/locales.ts src/i18n/dictionaries.ts`

Expected: no errors.

- [ ] **Step 5: Commit the About retirement**

```bash
git add src/app/'[lang]'/about/page.tsx src/app/'[lang]'/'[slug]'/page.tsx src/app/sitemap.ts src/lib/author-identity.ts src/lib/author-identity.test.mjs src/lib/llms-text.ts src/lib/llms-text.test.mjs src/lib/localized-posts.test.mjs src/i18n/locales.ts src/i18n/dictionaries.ts
git commit -m "refactor: move author identity to locale home"
```

### Task 5: Transparent `훈지` favicon

**Files:**
- Modify: `src/app/icon.svg`
- Modify: `public/favicon.svg`
- Delete: `src/app/favicon.ico`
- Modify: `src/app/[lang]/rss.xml/route.ts`
- Create: `scripts/brand-assets.test.mjs`

**Interfaces:**
- Consumes: the exact `훈지` wordmark and existing light/dark ink colors.
- Produces: two identical transparent SVG assets with a 32×32 viewBox, no background element, a bold two-glyph silhouette, and dark-mode inversion; RSS references `/icon.svg`.

- [ ] **Step 1: Add the failing asset test**

```js
for (const path of ["src/app/icon.svg", "public/favicon.svg"]) {
  const svg = readFileSync(path, "utf8");
  assert.match(svg, /훈지/);
  assert.match(svg, /prefers-color-scheme:\s*dark/);
  assert.doesNotMatch(svg, /<rect|<circle|<path/);
  assert.match(svg, /Wanted Sans/);
}
assert.equal(existsSync("src/app/favicon.ico"), false);
```

- [ ] **Step 2: Run the focused test and confirm the red state**

Run: `node --test scripts/brand-assets.test.mjs`

Expected: FAIL because current SVGs have a rounded rectangle and the legacy ICO exists.

- [ ] **Step 3: Replace both assets and retire the legacy ICO**

Use this transparent SVG structure in both locations:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <style>
    text { fill: #16181c; }
    @media (prefers-color-scheme: dark) { text { fill: #f5f5f3; } }
  </style>
  <text x="16" y="22" text-anchor="middle" font-family="Wanted Sans, sans-serif" font-size="13" font-weight="700" letter-spacing="-1">훈지</text>
</svg>
```

Delete `src/app/favicon.ico` so Next.js does not advertise the obsolete rounded icon ahead of `icon.svg`. Update RSS feed metadata from `/favicon.ico` to `/icon.svg`.

- [ ] **Step 4: Run the asset test and inspect 16/32px renders**

Run: `node --test scripts/brand-assets.test.mjs`

Expected: PASS.

Render or open the SVG at 16px and 32px and confirm two separated Hangul silhouettes with no background block in both light and dark color schemes.

- [ ] **Step 5: Commit the brand assets**

```bash
git add src/app/icon.svg public/favicon.svg src/app/favicon.ico src/app/'[lang]'/rss.xml/route.ts scripts/brand-assets.test.mjs
git commit -m "feat: replace favicon with transparent hunji wordmark"
```

### Task 6: Full verification and responsive review

**Files:**
- Verify all files modified in Tasks 1–5.

**Interfaces:**
- Consumes: the completed implementation.
- Produces: test, lint, production-build, and visual evidence for release readiness.

- [ ] **Step 1: Run the complete unit suite**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: no errors.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: content validation and Next.js production build PASS for all six locales, including the retained About redirect routes.

- [ ] **Step 4: Perform browser QA**

Run the development server and inspect `/`, `/en`, `/about`, and `/en/about` at 1440px and 390px widths. Confirm:

- `훈지` and all four value paragraphs precede the post list.
- Exactly five rows display title/date only and link to their posts.
- About is absent from desktop/mobile navigation.
- Search, language selector, theme toggle, Posts, and all-posts links work.
- Footer contains exactly GitHub, LinkedIn, and RSS.
- `/about` redirects permanently to `/`; `/en/about` redirects permanently to `/en`.
- No horizontal scroll or text overlap exists at 390px.
- The favicon has no background tile and remains visible in light/dark browser chrome.

- [ ] **Step 5: Review only the intended diff**

Run: `git status --short && git diff --check && git diff --stat`

Expected: no whitespace errors; `content/260723/index.md` remains modified but unchanged by this implementation.

