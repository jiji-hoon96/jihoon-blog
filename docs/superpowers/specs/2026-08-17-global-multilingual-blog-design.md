# Global Multilingual Blog Design

**Date:** 2026-08-17

**Status:** Approved

## Goal

Keep the existing Korean blog URLs stable while publishing every post in Korean, English, Japanese, Spanish, Brazilian Portuguese, and Simplified Chinese. Improve international discovery without weakening technical meaning, preserve site performance, and make Sentry useful for detecting server and localized-route failures.

## Supported locales

| Content locale | URL prefix | HTML language | `hreflang` |
| --- | --- | --- | --- |
| Korean | none | `ko` | `ko` |
| English | `/en` | `en` | `en` |
| Japanese | `/ja` | `ja` | `ja` |
| Spanish | `/es` | `es` | `es` |
| Brazilian Portuguese | `/pt-BR` | `pt-BR` | `pt-BR` |
| Simplified Chinese | `/zh-CN` | `zh-CN` | `zh-Hans` |

The Korean URL remains the `x-default` URL. Locale selection must use crawlable links and must not force redirects based on IP, cookies, or `Accept-Language`.

## Content storage

Korean remains the source document and keeps its current filename. Translations live beside it and share images.

```text
content/260703/
├── index.md
├── index.en.md
├── index.ja.md
├── index.es.md
├── index.pt-BR.md
└── index.zh-CN.md
```

Contentlayer derives `locale`, `translationKey`, and public `slug` from the filename and containing directory. Translation frontmatter contains `locale`, `translationOf`, and `sourceHash`. A translated file is stale when `sourceHash` differs from the normalized Korean source hash.

No foreign-language URL may render Korean as a fallback. A missing or stale translation fails content validation before deployment.

## Routing and UI

Korean keeps `/`, `/posts`, `/posts/[category]`, and `/[slug]`. Other locales use `/{locale}`, `/{locale}/posts`, `/{locale}/posts/[category]`, and `/{locale}/[slug]`.

The shared shell receives a locale dictionary for navigation, footer, search, dates, categories, empty states, and error text. The header language selector links to the same translation on article pages and the corresponding localized route elsewhere. A stored preference may affect the next explicit navigation but never changes the requested URL automatically.

Search, popular posts, post navigation, categories, RSS, `llms.txt`, and Open Graph images must stay within the current locale.

## SEO

Each localized page has:

- a self-referencing canonical URL;
- reciprocal alternates for all six translations plus `x-default`;
- localized title, description, keywords, visible navigation, and Open Graph locale;
- a matching `lang` value on the document root;
- an entry in the localized sitemap alternates;
- structured article data whose `inLanguage` matches the content.

The site must not create locale variants with only translated chrome. Each indexed locale page contains a complete translation. Existing Korean canonical URLs are never redirected or replaced.

## Translation workflow

The pipeline protects frontmatter invariants, fenced and inline code, URLs, image paths, custom directives, component syntax, and original quotations before translating prose. A context-aware LLM creates the draft. A version-controlled glossary controls technical terminology. A second independent review checks omissions, over-translation, altered claims, and unnatural phrasing. DeepL is an optional disagreement detector when `DEEPL_API_KEY` is available, not a deployment requirement.

Automated validation compares heading structure, links, code, images, directives, translation metadata, and source hashes. Translation output is never published solely because an API call succeeded.

## Technical terminology policy

English technical terminology is not translated mechanically. Preserve the English form when it is an identifier, product or library name, common industry term, useful search term, or clearer than the Korean calque.

- First occurrence when explanation helps: `wall-clock time(실제 경과 시간)`
- Later occurrences: `wall-clock time`
- Preserve: `OpenTelemetry`, `React Server Components`, API names, code symbols
- Normalize the field name to `Computer Science`; never emit `computer siense`
- Translate an explanation, not the spelling, when translating the term would make it less precise

The same semantic decision applies across all six locales through a repository glossary.

## Bilingual quotations

The page locale is the primary, larger quotation. The source-language quotation remains below in smaller, muted text. When page locale and source language are identical, render one quotation instead of duplicate text. Translation must not alter the original quotation block.

## Writing guidance

The writing and refinement guides incorporate these principles adapted from Sean Goedecke's “Blog about things you don't understand yet”:

- state the question and initial hypothesis before drafting;
- make a clear claim that can be tested or challenged;
- explain the original problem before the technical solution;
- record evidence that changed the author's mind;
- separate sourced fact, inference, and opinion;
- rewrite the introduction after reaching the conclusion;
- verify that the conclusion is tighter than the original introduction;
- reconsider publication when writing produced no new learning;
- disclose relevant limits when writing outside established expertise;
- correct errors during review without hedging the central claim into meaninglessness.

These principles supplement the existing preference for first-party measurements and current-state verification.

## Sentry and performance

Sentry improves operational reliability, not search ranking directly. The project keeps server and edge initialization, `onRequestError`, release/source-map upload, and explicit capture for handled GA failures. Localized routes add low-cardinality `locale`, `routeKind`, and operation tags at explicit failure boundaries.

Sitemap, RSS, search, metadata, and translation-validation failures must be observable. Event payloads must not include article bodies, search query text, credentials, or default PII.

Browser Sentry remains disabled unless measurement demonstrates that its diagnostic value outweighs the previously measured client bundle increase. Core Web Vitals remain in the lightweight GA reporter. Sentry traces remain sampled and production-only.

## Verification gates

- Unit tests cover locale parsing, URL generation, alternates, translation grouping, source-hash staleness, localized filtering, and Sentry tag helpers.
- Content validation checks all 18 posts have five current translations.
- Rendering tests inspect `lang`, canonical, `hreflang`, language selector targets, and non-duplicated quotations.
- Sitemap, RSS, search, and `llms.txt` are checked per locale.
- `pnpm test`, `pnpm lint`, and `pnpm build` pass.
- The final build compares client JS against the pre-change baseline and must not introduce the browser Sentry SDK.

## Research basis

- GitHub Octoverse 2025 reports a globally distributed developer population, with Brazil and Japan among the largest communities: <https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/>
- W3Techs content-language data supports English, Spanish, Japanese, and Portuguese as meaningful web audiences: <https://w3techs.com/technologies/overview/content_language>
- Google recommends separate URLs, reciprocal language annotations, and explicit language links: <https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites>
- Next.js supports locale route segments, dynamic root language, localized metadata alternates, and sitemap alternates: <https://nextjs.org/docs/app/guides/internationalization>
- Sean Goedecke's essay motivates writing as research and using changed conclusions as a quality signal: <https://www.seangoedecke.com/blog-about-things-you-dont-understand-yet/>
