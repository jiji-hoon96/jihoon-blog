# Multilingual Platform and SEO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve complete locale-specific blog routes and SEO metadata for Korean, English, Japanese, Spanish, Brazilian Portuguese, and Simplified Chinese without changing public Korean URLs.

**Architecture:** All page routes move below `app/[lang]`; `src/proxy.ts` rewrites unprefixed Korean URLs internally to `/ko/...` and redirects visible `/ko/...` URLs back to the legacy form. Locale and post helpers provide the single URL, filtering, and alternate-link contract used by UI, metadata, sitemap, RSS, search, and `llms.txt`.

**Tech Stack:** Next.js 16 App Router, TypeScript, Contentlayer, React 19, Node test runner

**Spec:** `docs/superpowers/specs/2026-08-17-global-multilingual-blog-design.md`

## Global Constraints

- Public Korean URLs remain unprefixed.
- Foreign-language pages use `/en`, `/ja`, `/es`, `/pt-BR`, and `/zh-CN` prefixes.
- `zh-CN` content emits `zh-Hans` for `hreflang`.
- No locale route renders Korean content as a fallback.
- Browser- or IP-language detection never forces a redirect.
- Every indexed page has a self-canonical and reciprocal alternates.

---

### Task 1: Locale and translation-domain primitives

**Files:**
- Create: `src/i18n/locales.ts`
- Create: `src/i18n/dictionaries.ts`
- Create: `src/lib/localized-posts.ts`
- Create: `src/lib/localized-posts.test.mjs`
- Modify: `contentlayer.config.ts`

**Interfaces:**
- Produces: `Locale`, `LOCALES`, `isLocale()`, `toPublicPath()`, `getAlternates()`, `getPostsForLocale()`, `findTranslation()`.
- Produces Contentlayer fields: `locale`, `translationKey`, `sourceHash`, and locale-aware `slug`.

- [ ] **Step 1: Write failing locale and translation-group tests**

Test exact Korean and prefixed paths, `zh-Hans`, exclusion of other locales, and lookup by `translationKey` in `src/lib/localized-posts.test.mjs`.

- [ ] **Step 2: Confirm the tests fail before implementation**

Run: `node --test src/lib/localized-posts.test.mjs`

Expected: FAIL because `locales.ts` and `localized-posts.ts` do not exist.

- [ ] **Step 3: Implement the locale contract**

Use this public type and ordered locale list:

```ts
export const LOCALES = ['ko', 'en', 'ja', 'es', 'pt-BR', 'zh-CN'] as const
export type Locale = (typeof LOCALES)[number]
export const HREF_LANG = {
  ko: 'ko', en: 'en', ja: 'ja', es: 'es', 'pt-BR': 'pt-BR', 'zh-CN': 'zh-Hans',
} satisfies Record<Locale, string>
```

`toPublicPath('ko', '/260703')` returns `/260703`; other locales prepend the locale. `getAlternates()` returns all six language keys and `x-default` pointing to Korean.

- [ ] **Step 4: Add Contentlayer locale fields**

Derive Korean from `index.md` and translations from `index.<locale>.md`. Derive `translationKey` from the containing `YYMMDD` directory. Reject unknown suffixes and require `translationOf` plus `sourceHash` on non-Korean documents.

- [ ] **Step 5: Run the focused tests and Contentlayer build**

Run: `node --test src/lib/localized-posts.test.mjs && npx contentlayer build`

Expected: PASS and generated Post types include locale fields.

- [ ] **Step 6: Commit the locale domain**

```bash
git add src/i18n src/lib/localized-posts.ts src/lib/localized-posts.test.mjs contentlayer.config.ts
git commit -m "feat: add localized post domain"
```

### Task 2: Language-aware routing and shell

**Files:**
- Create: `src/proxy.ts`
- Create: `src/proxy.test.mjs`
- Create: `src/components/SiteShell.tsx`
- Create: `src/components/LanguageSelector.tsx`
- Modify: `src/components/Header.tsx`
- Modify: `src/components/Footer.tsx`
- Move: page routes from `src/app/` to `src/app/[lang]/`
- Modify: `src/app/[lang]/layout.tsx`

**Interfaces:**
- Consumes: `Locale`, `isLocale()`, `toPublicPath()`, locale dictionaries.
- Produces: all page routes with an explicit `lang` param and server-rendered `<html lang>`.

- [ ] **Step 1: Write failing proxy-path tests**

Cover `/`, `/260703`, `/posts`, `/en/260703`, `/pt-BR/posts`, `/ko/260703`, `/api/search`, `/_next/static/a.js`, and `/icon.svg`. Korean public routes must rewrite internally; prefixed foreign routes and assets pass through; visible `/ko` routes redirect to unprefixed URLs.

- [ ] **Step 2: Run the proxy test and verify failure**

Run: `node --test src/proxy.test.mjs`

Expected: FAIL because `src/proxy.ts` is absent.

- [ ] **Step 3: Implement rewrite and redirect decisions as a pure function**

Export `classifyLocaleRequest(pathname)` returning one of:

```ts
type LocaleRequestDecision =
  | { kind: 'next' }
  | { kind: 'rewrite'; pathname: string }
  | { kind: 'redirect'; pathname: string }
```

The exported Next.js `proxy()` applies that decision with `NextResponse` and excludes API and file-like paths.

- [ ] **Step 4: Move routes under `[lang]` and create the locale root layout**

Move the current shared layout body into `SiteShell`. `src/app/[lang]/layout.tsx` validates `lang`, generates static locale params, and renders `<html lang={lang}>`. Move home, posts, category, about, guestbook, playground, post, post OG image, RSS, and `llms.txt` routes below this layout. Keep API, sitemap, robots, icons, and `global-error.tsx` at the root.

- [ ] **Step 5: Localize shared navigation and language selection**

Pass `locale` and translated navigation labels to `Header`, `Footer`, and `SearchModal`. `LanguageSelector` receives `translationKey?: string` and generates crawlable links; write the selected locale to local storage only from the click handler.

- [ ] **Step 6: Build and inspect route generation**

Run: `node --test src/proxy.test.mjs && pnpm build`

Expected: build succeeds; `/260703` and `/en/260703` both generate; no public `/ko/260703` canonical is emitted.

- [ ] **Step 7: Commit routing and shell changes**

```bash
git add src/proxy.ts src/proxy.test.mjs src/app src/components src/i18n
git commit -m "feat: add locale-aware routing and shell"
```

### Task 3: Locale-aware post views, lists, and search

**Files:**
- Modify: `src/app/[lang]/page.tsx`
- Modify: `src/app/[lang]/[slug]/page.tsx`
- Modify: `src/app/[lang]/posts/page.tsx`
- Modify: `src/app/[lang]/posts/[category]/page.tsx`
- Modify: `src/components/SearchModal.tsx`
- Modify: `src/components/PopularPosts.tsx`
- Modify: `src/lib/filter-posts.ts`
- Modify: `src/lib/categories.ts`
- Modify: `src/lib/post-navigation.ts`
- Modify: `src/app/api/search/route.ts`
- Test: `src/lib/localized-posts.test.mjs`

**Interfaces:**
- Consumes: locale post helpers and dictionaries.
- Produces: locale-isolated lists, navigation, categories, popular-post matching, and search JSON.

- [ ] **Step 1: Add failing tests for locale isolation**

Use fixtures with the same `translationKey` in multiple locales and assert sorting, related posts, adjacent posts, and categories never cross locales.

- [ ] **Step 2: Verify the locale-isolation tests fail**

Run: `node --test src/lib/localized-posts.test.mjs`

Expected: FAIL because existing helpers ignore locale.

- [ ] **Step 3: Add locale parameters to filtering and navigation**

Make locale explicit in helper signatures, for example:

```ts
getSortedPublishedPosts(posts, locale)
getAdjacentPosts(posts, translationKey, locale)
getRelatedPosts(posts, translationKey, locale, limit)
getAllCategories(posts, locale)
```

- [ ] **Step 4: Update pages and components**

Format dates with the active locale, use localized labels, build links with `toPublicPath`, and keep pinned/popular matching by `translationKey` rather than localized slug.

- [ ] **Step 5: Make search locale explicit**

`GET /api/search?locale=ja` validates the locale and returns only Japanese posts. Do not attach the query text or response content to error telemetry.

- [ ] **Step 6: Run tests and lint**

Run: `pnpm test && pnpm lint`

Expected: PASS.

- [ ] **Step 7: Commit localized views**

```bash
git add src/app src/components src/lib
git commit -m "feat: localize post discovery flows"
```

### Task 4: Canonical metadata, structured data, sitemap, feeds, and quotations

**Files:**
- Create: `src/lib/localized-metadata.ts`
- Create: `src/lib/localized-metadata.test.mjs`
- Modify: `src/app/[lang]/[slug]/page.tsx`
- Modify: `src/app/[lang]/sitemap.ts` only if route-local metadata is required
- Modify: `src/app/sitemap.ts`
- Modify: `src/app/[lang]/rss.xml/route.ts`
- Modify: `src/app/[lang]/llms.txt/route.ts`
- Modify: `src/lib/remark-bilingual-quote.ts`
- Modify: `src/lib/remark-bilingual-quote.test.mjs`

**Interfaces:**
- Produces: `buildLocalizedMetadata(post, translations)`, sitemap alternates, per-locale feeds, and quote de-duplication.

- [ ] **Step 1: Write failing metadata and quotation tests**

Assert self-canonical, six alternates plus `x-default`, `zh-Hans`, locale OG values, structured-data `inLanguage`, and one rendered quote when page locale equals original locale.

- [ ] **Step 2: Verify focused tests fail**

Run: `node --test src/lib/localized-metadata.test.mjs src/lib/remark-bilingual-quote.test.mjs`

Expected: FAIL on missing localized metadata and duplicate quote behavior.

- [ ] **Step 3: Implement metadata and structured data**

Generate alternates from the translation group, set the current localized page as canonical, and set Korean as `x-default`. Emit localized `BlogPosting`, `BreadcrumbList`, Open Graph locale, description, and keywords.

- [ ] **Step 4: Implement localized discovery files**

Sitemap entries carry reciprocal `alternates.languages`. `/rss.xml` remains Korean through the rewrite; `/{locale}/rss.xml` emits only that locale. Apply the same rule to `llms.txt`.

- [ ] **Step 5: Make bilingual quotation rendering locale-aware**

Pass document locale into the Markdown transformation. Keep the localized text primary and original text muted below; when both languages match, render a single block.

- [ ] **Step 6: Run all platform verification**

Run: `pnpm test && pnpm lint && pnpm build`

Expected: PASS with canonical, alternate, sitemap, RSS, and `lang` output for all six locales.

- [ ] **Step 7: Commit SEO and feed support**

```bash
git add src/app src/lib
git commit -m "feat: add multilingual SEO discovery"
```

