# AI Search and SEO Discovery Design

## Goal

Improve the blog's accuracy, discoverability, and measurable referral traffic for both people and AI-assisted search without adding speculative ranking hacks or restructuring the existing publishing architecture.

## Scope

This design covers:

- accurate publication and modification dates;
- consistent author identity across locales and structured data;
- an explicit allow policy for search, user-fetch, and model-training crawlers;
- a working, localized `llms.txt` route;
- privacy-conscious AI referral measurement in Google Analytics;
- advisory authoring guidance for people-first, source-backed articles.

IndexNow is intentionally deferred. The blog publishes infrequently and already exposes sitemap and RSS discovery. IndexNow should be reconsidered only if measurable indexing delays justify verification keys, external submissions, and retry handling.

## Design Principles

1. Preserve the current Next.js, Contentlayer, and localized-route architecture.
2. Prefer accurate source data over generated freshness signals.
3. Keep AI search discovery separate from unsupported ranking claims about `llms.txt`.
4. Allow public content to be used by search, user-fetch, and model-training crawlers.
5. Send only low-risk, normalized AI referral data to analytics.
6. Keep authoring guidance flexible; do not force identical article structures.
7. Preserve unrelated and uncommitted user changes.

## 1. Content Dates and Freshness

### Frontmatter contract

Add an optional Contentlayer field:

```yaml
date: 2026-08-18
updatedAt: 2026-08-20
```

The normalized date contract is:

```text
publishedAt = date
modifiedAt = updatedAt ?? date
```

`updatedAt` is set manually only after a meaningful human-edited content change. It is not derived from Git timestamps because incidental file operations, translation work, or formatting changes would create false freshness signals. Existing articles do not require migration.

### Consumers

The normalized modification date feeds:

- Open Graph `modifiedTime`;
- `BlogPosting.dateModified`;
- sitemap `lastModified`;
- the visible article header when `updatedAt` is present.

RSS keeps the existing publication date because the current RSS 2.0 item contract does not have a reliable first-class modification-date field.

### Sitemap rules

- Article `lastModified` is `updatedAt ?? date`.
- Pinned articles no longer receive the current build time.
- A category uses the latest modification date among its public articles.
- The home page and post index use the latest modification date among all public articles.
- Static routes unrelated to article changes, such as About and Guestbook, omit `lastModified` rather than publishing a false value.
- Existing canonical, locale alternate, priority, and change-frequency behavior remains unchanged unless it conflicts with accurate dates.

### Validation

- Contentlayer validates the date field format.
- Content validation rejects an `updatedAt` earlier than `date`.
- A shared pure helper normalizes and compares publication and modification dates and is covered by unit tests.

## 2. Author Entity Identity

Use one stable author entity identifier across every locale and structured-data graph:

```text
https://hooninedev.com/about#person
```

Every `WebSite`, `BlogPosting`, and `ProfilePage` author or `mainEntity` reference uses that `@id`. Localized About URLs remain in `ProfilePage.url` and `Person.url`, so the visible page and locale alternates remain localized while the underlying person identity stays unified.

Existing author properties such as name, alternate name, profile image, skills, GitHub, LinkedIn, employment, and license relationships remain intact.

## 3. Crawler Policy

The blog owner allows public content to support search results, user-requested retrieval, and model training. `robots.txt` therefore explicitly allows:

- Googlebot;
- OAI-SearchBot, ChatGPT-User, and GPTBot;
- Claude-SearchBot, Claude-User, and ClaudeBot;
- PerplexityBot and Perplexity-User;
- all other crawlers through the wildcard group.

The sitemap URL remains present. These explicit groups document policy; they do not claim to improve rankings beyond ensuring allowed access. CDN and WAF configuration is outside repository scope.

Crawler access does not waive the site's CC BY-NC license or grant rights beyond that license; it only expresses the technical crawling policy.

## 4. `llms.txt`

`llms.txt` remains an experimental machine-readable site guide, not a Google ranking mechanism.

### Routing

- `/llms.txt` internally rewrites to `/ko/llms.txt`.
- Existing localized paths such as `/en/llms.txt` remain direct.
- Unsupported locales return 404.

### Output

- Site description and link descriptions use the requested locale.
- The output links to the localized home, About, RSS, and the global sitemap.
- Only public posts for the requested locale are included.
- Posts are ordered newest first and include the SEO title when present plus the best available description.
- Existing plain-text content type and cache policy remain.

The implementation reuses the existing public-post filter and locale path helpers rather than introducing a separate content registry.

## 5. AI Referral Analytics

Add a client-side reporter that emits one normalized GA event when a known AI source sends a visitor.

```text
event: ai_referral
parameters:
  ai_source: chatgpt | claude | perplexity | copilot | gemini
  landing_path: localized public pathname visible in the browser
```

Classification order:

1. recognized `utm_source` value;
2. recognized `document.referrer` hostname;
3. no event for unknown sources.

The reporter never sends the raw referrer, full query string, search prompt, credentials, or arbitrary source values. If GA or required browser APIs are unavailable, it silently skips reporting. Classification is a pure function with unit tests; the client component only reads browser inputs and sends the normalized result.

## 6. Authoring Guidance

Update the existing writing and refinement guidance without enforcing a rigid template. Authors should check whether an article:

- includes firsthand experience or a distinct technical judgment;
- provides code, measurements, or reproducible conditions for important claims;
- links to official or primary sources for external facts where available;
- updates `updatedAt` after meaningful content changes;
- uses summaries, comparison tables, or FAQ sections only when they help readers;
- has had AI-assisted material checked by the author for accuracy and relevance.

Existing user edits in `.claude/commands/write-post.md`, `.claude/commands/refine-post.md`, and `CLAUDE.md` must be preserved. Changes to these files are narrow additions in their relevant metadata and quality-check sections.

## 7. Error Handling and Observability

- Invalid Contentlayer dates fail content generation.
- `updatedAt < date` fails content validation with the affected document path.
- Unknown AI referral sources produce no event.
- Missing GA produces no user-visible failure.
- Unsupported `llms.txt` locales continue to return 404.
- Existing Sentry boundaries remain unchanged unless a handled `llms.txt` generation failure already passes through the shared server capture boundary.

No raw article bodies, search terms, query strings, or personal data are added to analytics or error telemetry.

## 8. Testing and Verification

Implementation proceeds in independent RED-GREEN cycles:

1. normalized content dates and sitemap freshness;
2. stable author ID and robots output;
3. root and localized `llms.txt` routing and output;
4. AI referral classification;
5. content validation and authoring guidance integration.

Completion verification includes:

- focused regression tests for each behavior;
- the complete unit-test suite;
- content terminology and translation validation where affected;
- ESLint on every changed source file;
- a production build;
- local HTTP checks for `/rss.xml`, `/llms.txt`, localized `llms.txt`, and representative localized article pages.

The repository's pre-existing full-lint failures are not part of this scope. They must be reported accurately, while changed files must introduce no new lint errors.

## 9. Non-goals

- IndexNow integration;
- changing the CC BY-NC license;
- blocking model-training crawlers;
- bulk-editing existing article bodies or frontmatter;
- forcing TL;DR, FAQ, comparison tables, or fixed headings;
- introducing a centralized SEO document model;
- statically generating every discovery artifact in a separate build pipeline;
- changing CDN, WAF, Search Console, or GA property administration outside the repository.
