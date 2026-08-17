# Content Translation Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create and validate five complete, natural translations for each of the 18 Korean source posts.

**Architecture:** A deterministic manifest and validator protect Markdown structure and source freshness. Translation is performed per post with the repository glossary and a second review pass; all 90 translated documents must pass structural and semantic gates before localized routes are considered releasable.

**Tech Stack:** Markdown, Node.js, YAML glossary, optional DeepL API, Contentlayer

**Spec:** `docs/superpowers/specs/2026-08-17-global-multilingual-blog-design.md`

## Global Constraints

- Target locales are `en`, `ja`, `es`, `pt-BR`, and `zh-CN` for every Korean post.
- Preserve code, URLs, image paths, directives, and original quotations exactly.
- Every translation stores `translationOf` and the current normalized Korean `sourceHash`.
- Missing or stale translations fail validation.
- DeepL is optional; absence of `DEEPL_API_KEY` must not block validation or deployment.

---

### Task 1: Translation manifest and structural validator

**Files:**
- Create: `scripts/lib/translation-structure.mjs`
- Create: `scripts/validate-translations.mjs`
- Create: `scripts/validate-translations.test.mjs`
- Create: `content/translations.json`
- Modify: `package.json`

**Interfaces:**
- Produces: `normalizedSourceHash(markdown)`, `extractProtectedStructure(markdown)`, and `pnpm content:translations`.

- [ ] **Step 1: Write failing structure tests**

Assert normalization ignores `sourceHash` itself, and extraction compares fenced code, inline code, links, image paths, heading levels, directives, and original quotation blocks.

- [ ] **Step 2: Verify failure**

Run: `node --test scripts/validate-translations.test.mjs`

Expected: FAIL because translation structure utilities do not exist.

- [ ] **Step 3: Implement hash and structure extraction**

Use `node:crypto` SHA-256 over normalized Korean Markdown. Emit actionable errors containing post key, locale, and the first mismatched structure class.

- [ ] **Step 4: Generate the 18-post manifest**

Record each source path, required translation paths, current source hash, and validation state. Do not store prose or credentials in the manifest.

- [ ] **Step 5: Add package validation command**

Run: `pnpm content:translations`

Expected: FAIL listing the 90 missing translations before rollout.

- [ ] **Step 6: Commit validator and manifest**

```bash
git add scripts content/translations.json package.json
git commit -m "feat: validate localized content completeness"
```

### Task 2: Translation production protocol

**Files:**
- Create: `docs/translation-review.md`
- Create: `scripts/compare-deepl.mjs`

**Interfaces:**
- Consumes: Korean Markdown, locale, glossary, and protected structure.
- Produces: a reviewed localized Markdown file and optional sentence disagreements.

- [ ] **Step 1: Document the exact two-pass review rubric**

The first pass translates meaning and tone; the second pass compares every heading and paragraph for omission, altered certainty, reversed causality, over-translation, and locale-natural phrasing. SEO title and description are localized for search intent rather than copied mechanically.

- [ ] **Step 2: Implement optional DeepL comparison**

The script exits successfully with a clear “skipped” message when `DEEPL_API_KEY` is absent. When present, it sends prose segments only, applies glossary terms, and writes disagreements to stdout without modifying Markdown.

- [ ] **Step 3: Verify skip behavior and secret hygiene**

Run: `env -u DEEPL_API_KEY node scripts/compare-deepl.mjs --help`

Expected: exit 0; no key or article body written to disk.

- [ ] **Step 4: Commit review protocol**

```bash
git add docs/translation-review.md scripts/compare-deepl.mjs
git commit -m "docs: define translation review protocol"
```

### Task 3: Translate and review all posts

**Files:**
- Create: `content/*/index.en.md`
- Create: `content/*/index.ja.md`
- Create: `content/*/index.es.md`
- Create: `content/*/index.pt-BR.md`
- Create: `content/*/index.zh-CN.md`
- Modify: `content/translations.json`

**Interfaces:**
- Consumes: translation protocol, glossary, and current Korean sources.
- Produces: 90 complete translation documents.

- [ ] **Step 1: Translate one post across all five locales**

Use the complete Korean article as context, preserve protected syntax, localize frontmatter, set `translationOf` to the directory key, and set `sourceHash` to the validator output.

- [ ] **Step 2: Run structural validation for that post**

Run for the first post: `pnpm content:translations -- --post 240706`

Expected: PASS for all five locale files of that post.

- [ ] **Step 3: Perform the independent semantic review**

Compare source and translation paragraph by paragraph using `docs/translation-review.md`. Correct every omission, change of certainty, mistranslated technical term, and unnatural localized phrase before marking the manifest entry reviewed.

- [ ] **Step 4: Process the remaining manifest entries with the same production gate**

Process and validate these keys in order: `240818`, `241201`, `250520`, `251117`, `260104`, `260201`, `260302`, `260328`, `260418`, `260518`, `260529`, `260610`, `260611`, `260617`, `260622`, `260703`, and `260723`. For each key, create exactly the `en`, `ja`, `es`, `pt-BR`, and `zh-CN` files, run `pnpm content:translations -- --post KEY`, then complete the paragraph-level semantic review before moving to the next key.

- [ ] **Step 5: Run full content validation**

Run: `pnpm content:terms && pnpm content:translations && npx contentlayer build`

Expected: PASS with zero missing, stale, or structurally divergent translations.

- [ ] **Step 6: Commit translations in reviewable batches**

Commit one or a small chronological group of posts at a time, staging only their five translated files and manifest state.

### Task 4: Full release verification

**Files:**
- Modify only if verification exposes defects: localized content or validation implementation

**Interfaces:**
- Produces: release-ready multilingual content and evidence of completeness.

- [ ] **Step 1: Run complete test suite**

Run: `pnpm test && pnpm lint && pnpm build`

Expected: PASS.

- [ ] **Step 2: Inspect representative pages in every locale**

Check one short and one long post for typography, code, images, language selector, quote rendering, canonical, and `hreflang`. Check Simplified Chinese and Brazilian Portuguese locale codes explicitly.

- [ ] **Step 3: Inspect discovery outputs**

Verify sitemap alternate sets, six RSS endpoints, six `llms.txt` outputs, and locale-isolated search results.

- [ ] **Step 4: Record the final completeness count**

Run: `find content -name 'index.*.md' | wc -l`

Expected: `90` translated files, in addition to 18 Korean `index.md` source files.
