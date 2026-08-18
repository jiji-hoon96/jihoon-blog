# SEO Freshness and Author Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish accurate article modification dates and one stable author identity across metadata, JSON-LD, the UI, and sitemap.

**Architecture:** Add small pure helpers for post dates and author identity, then connect existing Contentlayer, metadata, page, and sitemap consumers to those helpers. Keep existing routes and structured-data shapes intact.

**Tech Stack:** Next.js 16, TypeScript, Contentlayer, Node test runner, JSON-LD

**Spec:** `docs/superpowers/specs/2026-08-18-ai-search-seo-discovery-design.md`

## Global Constraints

- `updatedAt` is optional, manually authored, and falls back to `date`.
- Do not infer modification time from Git or build time.
- Existing articles are not bulk-edited.
- All locales use `https://hooninedev.com/about#person` as the Person `@id`.
- Preserve unrelated user changes.
- Every behavior change follows RED-GREEN TDD.

---

### Task 1: Normalized post dates

**Files:**
- Create: `src/lib/post-dates.ts`
- Create: `src/lib/post-dates.test.mjs`
- Modify: `contentlayer.config.ts`
- Modify: `src/lib/localized-metadata.ts`
- Modify: `src/lib/localized-metadata.test.mjs`

**Interfaces:**
- Produces: `type PostDateFields = { date: string; updatedAt?: string }`
- Produces: `getPostModifiedDate(post: PostDateFields): string`
- Produces: `getLatestPostModifiedDate(posts: readonly PostDateFields[]): Date | undefined`
- `buildLocalizedPostMetadata` consumes optional `updatedAt`.

- [ ] **Step 1: Write failing date helper tests**

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import { getLatestPostModifiedDate, getPostModifiedDate } from './post-dates.ts'

test('uses an explicit meaningful modification date', () => {
  assert.equal(
    getPostModifiedDate({ date: '2026-08-18', updatedAt: '2026-08-20' }),
    '2026-08-20',
  )
})

test('falls back to publication date and finds the latest modification', () => {
  assert.equal(getPostModifiedDate({ date: '2026-08-18' }), '2026-08-18')
  assert.equal(
    getLatestPostModifiedDate([
      { date: '2026-08-18' },
      { date: '2026-08-17', updatedAt: '2026-08-21' },
    ])?.toISOString(),
    '2026-08-21T00:00:00.000Z',
  )
  assert.equal(getLatestPostModifiedDate([]), undefined)
})
```

- [ ] **Step 2: Run the helper tests and verify RED**

Run: `node --test src/lib/post-dates.test.mjs`

Expected: FAIL because `src/lib/post-dates.ts` does not exist.

- [ ] **Step 3: Write the minimal implementation**

```ts
export type PostDateFields = { date: string; updatedAt?: string }

export function getPostModifiedDate(post: PostDateFields): string {
  return post.updatedAt ?? post.date
}

export function getLatestPostModifiedDate(
  posts: readonly PostDateFields[],
): Date | undefined {
  if (posts.length === 0) return undefined
  return new Date(
    Math.max(...posts.map(post => new Date(getPostModifiedDate(post)).getTime())),
  )
}
```

- [ ] **Step 4: Add Contentlayer and metadata expectations**

Add `updatedAt: { type: 'date', required: false }` beside `date` in `contentlayer.config.ts`. Add `updatedAt?: string` to `MetadataPost`. Extend the English fixture with `updatedAt: '2026-07-05T00:00:00.000Z'` and assert:

```js
assert.equal(metadata.openGraph.publishedTime, '2026-07-03T00:00:00.000Z')
assert.equal(metadata.openGraph.modifiedTime, '2026-07-05T00:00:00.000Z')
```

Use `getPostModifiedDate(post)` for `openGraph.modifiedTime`.

- [ ] **Step 5: Verify GREEN**

Run: `node --test src/lib/post-dates.test.mjs src/lib/localized-metadata.test.mjs`

Expected: all tests PASS.

- [ ] **Step 6: Commit Task 1**

```bash
git add contentlayer.config.ts src/lib/post-dates.ts src/lib/post-dates.test.mjs src/lib/localized-metadata.ts src/lib/localized-metadata.test.mjs
git commit -m "feat: model meaningful article modification dates"
```

### Task 2: Content date validation

**Files:**
- Create: `scripts/validate-content-dates.mjs`
- Create: `scripts/validate-content-dates.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `validateMarkdownDates(markdown: string): string[]`
- Produces: `validateContentDates(rootDirectory?: string): Promise<Array<{ file: string; message: string }>>`

- [ ] **Step 1: Write failing validation tests**

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import { validateMarkdownDates } from './validate-content-dates.mjs'

test('rejects updatedAt before date', () => {
  assert.deepEqual(
    validateMarkdownDates('---\ndate: 2026-08-18\nupdatedAt: 2026-08-17\n---\n'),
    ['updatedAt must be on or after date'],
  )
})

test('allows absent or later updatedAt', () => {
  assert.deepEqual(validateMarkdownDates('---\ndate: 2026-08-18\n---\n'), [])
  assert.deepEqual(
    validateMarkdownDates('---\ndate: 2026-08-18\nupdatedAt: 2026-08-20\n---\n'),
    [],
  )
})
```

- [ ] **Step 2: Run validation tests and verify RED**

Run: `node --test scripts/validate-content-dates.test.mjs`

Expected: FAIL because the validator module does not exist.

- [ ] **Step 3: Implement validation and repository traversal**

Parse scalar `date` and `updatedAt` values from leading YAML frontmatter, strip matching quotes, compare `Date` values, and recursively inspect every `content/**/*.md`. The CLI prints `<relative path>: updatedAt must be on or after date` and exits 1 on violations.

```js
export function validateMarkdownDates(markdown) {
  const date = frontmatterValue(markdown, 'date')
  const updatedAt = frontmatterValue(markdown, 'updatedAt')
  if (!date || !updatedAt) return []
  return new Date(updatedAt).getTime() < new Date(date).getTime()
    ? ['updatedAt must be on or after date']
    : []
}
```

- [ ] **Step 4: Wire the validator into scripts**

Add `"content:dates": "node scripts/validate-content-dates.mjs"` and prefix the existing `build` command with `node scripts/validate-content-dates.mjs &&`.

- [ ] **Step 5: Verify GREEN and repository content**

Run: `node --test scripts/validate-content-dates.test.mjs`

Run: `npm run content:dates`

Expected: tests PASS and current content validation exits 0.

- [ ] **Step 6: Commit Task 2**

```bash
git add package.json scripts/validate-content-dates.mjs scripts/validate-content-dates.test.mjs
git commit -m "test: validate article modification dates"
```

### Task 3: Article and sitemap freshness consumers

**Files:**
- Modify: `src/app/[lang]/[slug]/page.tsx`
- Modify: `src/app/sitemap.ts`
- Modify: `src/i18n/dictionaries.ts`
- Modify: `src/lib/localized-posts.test.mjs`

**Interfaces:**
- Consumes: `getPostModifiedDate` and `getLatestPostModifiedDate` from Task 1.

- [ ] **Step 1: Add failing dictionary coverage**

Add `assert.ok(dictionary.post.updated)` to the existing all-locale dictionary test.

Run: `node --test src/lib/localized-posts.test.mjs`

Expected: FAIL because `post.updated` is absent.

- [ ] **Step 2: Update article output**

Add localized `post.updated` labels. Set JSON-LD `dateModified` to `getPostModifiedDate(post)`; keep `datePublished: post.date`. Render a second localized `<time>` only when `post.updatedAt` exists.

- [ ] **Step 3: Update sitemap date rules**

Use `new Date(getPostModifiedDate(post))` for article entries. Keep pinned priority/frequency but remove build-time freshness. Categories use `getLatestPostModifiedDate(categoryPosts)`. Only `/` and `/posts` receive the latest public post modification date; `/about` and `/guestbook` omit `lastModified`.

- [ ] **Step 4: Verify GREEN and integration**

Run: `node --test src/lib/post-dates.test.mjs src/lib/localized-posts.test.mjs`

Run: `npx eslint src/lib/post-dates.ts src/app/sitemap.ts 'src/app/[lang]/[slug]/page.tsx' src/i18n/dictionaries.ts`

Run: `npm run build`

Expected: tests, changed-file lint, and production build PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add src/app/sitemap.ts 'src/app/[lang]/[slug]/page.tsx' src/i18n/dictionaries.ts src/lib/localized-posts.test.mjs
git commit -m "feat: publish accurate article freshness metadata"
```

### Task 4: Stable author identity

**Files:**
- Create: `src/lib/author-identity.ts`
- Create: `src/lib/author-identity.test.mjs`
- Modify: `src/app/[lang]/page.tsx`
- Modify: `src/app/[lang]/about/page.tsx`
- Modify: `src/app/[lang]/[slug]/page.tsx`

**Interfaces:**
- Produces: `getAuthorEntityId(siteUrl: string): string`

- [ ] **Step 1: Write the failing identity test**

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import { getAuthorEntityId } from './author-identity.ts'

test('uses one canonical Person identity across locales', () => {
  assert.equal(
    getAuthorEntityId('https://hooninedev.com/'),
    'https://hooninedev.com/about#person',
  )
})
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test src/lib/author-identity.test.mjs`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement and wire the helper**

```ts
export function getAuthorEntityId(siteUrl: string): string {
  return `${siteUrl.replace(/\/+$/, '')}/about#person`
}
```

Use it for Person `@id` in home `WebSite`, About `ProfilePage.mainEntity`, and article `BlogPosting.author` and `publisher`. Keep localized About URLs in `url`.

- [ ] **Step 4: Verify GREEN and integration**

Run: `node --test src/lib/author-identity.test.mjs`

Run: `npx eslint src/lib/author-identity.ts 'src/app/[lang]/page.tsx' 'src/app/[lang]/about/page.tsx' 'src/app/[lang]/[slug]/page.tsx'`

Run: `npm run build`

Expected: test, lint, and build PASS.

- [ ] **Step 5: Commit Task 4**

```bash
git add src/lib/author-identity.ts src/lib/author-identity.test.mjs 'src/app/[lang]/page.tsx' 'src/app/[lang]/about/page.tsx' 'src/app/[lang]/[slug]/page.tsx'
git commit -m "feat: unify localized author identity"
```

