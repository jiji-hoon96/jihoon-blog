# Sentry Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve production observability for localized server routes and handled failures without adding the browser Sentry SDK or leaking content.

**Architecture:** Keep the existing Node/Edge initialization and explicit GA captures. Add a small server-only capture helper that enforces low-cardinality tags and sanitized context, then apply it only at route and metadata/feed failure boundaries where Next.js automatic capture cannot see handled errors.

**Tech Stack:** `@sentry/nextjs` 10.x, Next.js 16, TypeScript, Node test runner

**Spec:** `docs/superpowers/specs/2026-08-17-global-multilingual-blog-design.md`

## Global Constraints

- Do not create `src/instrumentation-client.ts`.
- Do not send article bodies, search text, credentials, or default PII.
- Use low-cardinality tags only: locale, route kind, operation.
- Preserve production-only enablement and sampled tracing.

---

### Task 1: Sanitized server capture helper

**Files:**
- Create: `src/lib/sentry-server.ts`
- Create: `src/lib/sentry-server.test.mjs`

**Interfaces:**
- Produces: `captureServerException(error, context)` where context is `{ locale?: Locale; routeKind: RouteKind; operation: string }`.

- [ ] **Step 1: Write failing tests with an injected capture function**

Assert only `locale`, `routeKind`, and `operation` become tags; arbitrary request/body/query values cannot be accepted by the type or emitted at runtime.

- [ ] **Step 2: Verify test failure**

Run: `node --test src/lib/sentry-server.test.mjs`

Expected: FAIL because the helper is absent.

- [ ] **Step 3: Implement the helper**

```ts
export type RouteKind = 'analytics' | 'search' | 'metadata' | 'sitemap' | 'rss' | 'llms'
export function captureServerException(
  error: unknown,
  context: { locale?: Locale; routeKind: RouteKind; operation: string },
): string
```

Call `Sentry.captureException(error, { tags: context })`; do not accept `extra`, request objects, or article data.

- [ ] **Step 4: Run tests and commit**

Run: `node --test src/lib/sentry-server.test.mjs`

Expected: PASS.

```bash
git add src/lib/sentry-server.ts src/lib/sentry-server.test.mjs
git commit -m "feat: add sanitized server error capture"
```

### Task 2: Apply capture to handled localized failures

**Files:**
- Modify: `src/lib/google-analytics.ts`
- Modify: `src/app/api/analytics/route.ts`
- Modify: `src/app/api/search/route.ts`
- Modify: `src/app/sitemap.ts`
- Modify: `src/app/[lang]/rss.xml/route.ts`
- Modify: `src/app/[lang]/llms.txt/route.ts`
- Modify: `src/lib/localized-metadata.ts`

**Interfaces:**
- Consumes: `captureServerException()`.
- Produces: observable handled failures with stable grouping tags.

- [ ] **Step 1: Replace direct captures with the helper**

Map existing GA query tags to `routeKind: 'analytics'` and operation values `stats`, `popular`, `page`, and `pages`.

- [ ] **Step 2: Capture only caught failures that return fallback output**

Add helper calls in catch blocks for search, sitemap, RSS, `llms.txt`, and localized metadata generation. Let uncaught failures continue to `onRequestError` to avoid duplicate events.

- [ ] **Step 3: Verify no sensitive payload is attached**

Run: `rg -n "captureException|captureServerException" src`

Expected: direct application captures are limited to `sentry-server.ts`; call sites pass only locale, route kind, and operation.

- [ ] **Step 4: Run tests and build**

Run: `pnpm test && pnpm build`

Expected: PASS.

- [ ] **Step 5: Commit route instrumentation**

```bash
git add src
git commit -m "feat: observe localized server failures"
```

### Task 3: Release, source-map, and bundle verification

**Files:**
- Modify: `next.config.ts`
- Modify: `src/sentry.server.config.ts`
- Modify: `src/sentry.edge.config.ts`
- Modify: `CLAUDE.md`

**Interfaces:**
- Produces: consistent environment/release configuration and documented deployment checks.

- [ ] **Step 1: Centralize shared production Sentry options**

Create a shared plain options function or constant that keeps `sendDefaultPii: false`, production-only enablement, and `tracesSampleRate: 0.1`. Use `SENTRY_RELEASE` and deployment environment when present without generating high-cardinality values.

- [ ] **Step 2: Preserve source-map failure visibility**

Keep uploads disabled without `SENTRY_AUTH_TOKEN`, logs visible when upload is attempted, and deletion of server/static maps only after upload configuration is active.

- [ ] **Step 3: Measure client output**

Run: `pnpm build`

Expected: PASS and no `instrumentation-client` entry. Compare client JS output with the repository's documented server-only baseline; investigate any Sentry browser chunk before continuing.

- [ ] **Step 4: Update operational documentation and commit**

Document required environment variables, release/source-map verification, locale tags, and the reason browser Sentry stays disabled.

```bash
git add next.config.ts src/sentry.server.config.ts src/sentry.edge.config.ts CLAUDE.md
git commit -m "chore: harden Sentry production configuration"
```

