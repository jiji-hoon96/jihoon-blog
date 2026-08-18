# AI Referrals and Authoring Guidance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Measure known AI referral traffic without collecting raw prompts or referrers, and improve authoring guidance for trustworthy people-first articles.

**Architecture:** Isolate referral classification in a pure client-safe utility, keep the reporting component as a thin GA adapter, and add narrow guidance to existing authoring documents without imposing a fixed article template.

**Tech Stack:** React 19, Next.js 16, TypeScript, Google Analytics, Node test runner, Markdown authoring commands

**Spec:** `docs/superpowers/specs/2026-08-18-ai-search-seo-discovery-design.md`

## Global Constraints

- Track only `chatgpt`, `claude`, `perplexity`, `copilot`, and `gemini`.
- Prefer recognized `utm_source`; otherwise inspect the referrer hostname.
- Never send a raw referrer, full query string, prompt, credential, or arbitrary source.
- `landing_path` is the browser-visible pathname.
- Unknown sources and unavailable GA produce no event or user-visible error.
- Authoring guidance is advisory and preserves existing user edits.

---

### Task 1: AI referral classifier

**Files:**
- Create: `src/lib/ai-referral.ts`
- Create: `src/lib/ai-referral.test.mjs`

**Interfaces:**
- Produces: `type AiReferralSource = 'chatgpt' | 'claude' | 'perplexity' | 'copilot' | 'gemini'`
- Produces: `classifyAiReferral(input: { utmSource?: string | null; referrer?: string | null }): AiReferralSource | undefined`

- [ ] **Step 1: Write failing table-driven tests**

```js
const cases = [
  [{ utmSource: 'chatgpt.com' }, 'chatgpt'],
  [{ utmSource: 'Claude' }, 'claude'],
  [{ referrer: 'https://www.perplexity.ai/search/example' }, 'perplexity'],
  [{ referrer: 'https://copilot.microsoft.com/' }, 'copilot'],
  [{ referrer: 'https://gemini.google.com/app' }, 'gemini'],
]

for (const [input, expected] of cases) {
  assert.equal(classifyAiReferral(input), expected)
}

assert.equal(
  classifyAiReferral({ utmSource: 'newsletter', referrer: 'https://google.com/' }),
  undefined,
)
assert.equal(classifyAiReferral({ referrer: 'not a URL' }), undefined)
assert.equal(
  classifyAiReferral({
    utmSource: 'claude',
    referrer: 'https://www.perplexity.ai/',
  }),
  'claude',
)
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test src/lib/ai-referral.test.mjs`

Expected: FAIL because the classifier module does not exist.

- [ ] **Step 3: Implement minimal normalized classification**

Lowercase and trim `utmSource`, map only known aliases, then parse `referrer` with `new URL` inside `try/catch`. Match exact hostnames or subdomains for `chatgpt.com`, `claude.ai`, `perplexity.ai`, `copilot.microsoft.com`, and `gemini.google.com`. Return `undefined` for unknown or malformed input.

- [ ] **Step 4: Verify GREEN**

Run: `node --test src/lib/ai-referral.test.mjs`

Expected: all classifier cases PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/lib/ai-referral.ts src/lib/ai-referral.test.mjs
git commit -m "feat: classify privacy-safe AI referrals"
```

### Task 2: Google Analytics referral reporter

**Files:**
- Create: `src/components/AiReferralReporter.tsx`
- Modify: `src/app/[lang]/layout.tsx`

**Interfaces:**
- Consumes: `classifyAiReferral` from Task 1.
- Emits: `gtag('event', 'ai_referral', { ai_source, landing_path })`.

- [ ] **Step 1: Implement the thin client adapter**

```tsx
'use client'

import { useEffect } from 'react'
import { classifyAiReferral } from '@/lib/ai-referral'

export default function AiReferralReporter() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const aiSource = classifyAiReferral({
      utmSource: params.get('utm_source'),
      referrer: document.referrer,
    })
    if (!aiSource) return

    let sent = false
    const report = () => {
      const gtag = (window as unknown as {
        gtag?: (...args: unknown[]) => void
      }).gtag
      if (sent || typeof gtag !== 'function') return
      sent = true
      gtag('event', 'ai_referral', {
        ai_source: aiSource,
        landing_path: window.location.pathname,
      })
    }

    report()
    window.addEventListener('load', report, { once: true })
    return () => window.removeEventListener('load', report)
  }, [])

  return null
}
```

Mount it once in the localized root layout near `WebVitalsReporter`. The immediate attempt covers an already-ready GA script; the one-time `load` retry covers the opposite execution order without sending duplicates. Do not pass locale, query parameters, or referrer text to GA.

- [ ] **Step 2: Verify component integration**

Run: `node --test src/lib/ai-referral.test.mjs`

Run: `npx eslint src/lib/ai-referral.ts src/components/AiReferralReporter.tsx 'src/app/[lang]/layout.tsx'`

Run: `npm run build`

Expected: tests, changed-file lint, and production build PASS.

- [ ] **Step 3: Commit Task 2**

```bash
git add src/components/AiReferralReporter.tsx 'src/app/[lang]/layout.tsx'
git commit -m "feat: measure AI referral landings"
```

### Task 3: Flexible authoring guidance

**Files:**
- Modify: `.claude/commands/write-post.md`
- Modify: `.claude/commands/refine-post.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: optional `updatedAt` contract from the freshness plan.

- [ ] **Step 1: Inspect user modifications before editing**

Run `git diff -- .claude/commands/write-post.md .claude/commands/refine-post.md CLAUDE.md`. Identify frontmatter and quality-review sections in current working-tree versions. Do not restore, reformat, or overwrite unrelated edits.

- [ ] **Step 2: Add the narrow guidance**

Add `updatedAt` as optional metadata used only after meaningful content changes. Add a quality checklist covering firsthand evidence, decision rationale, reproducible conditions, primary sources, and human verification of AI-assisted material. State that TL;DR, FAQ, comparison tables, and fixed headings are optional and appear only when they improve the article.

- [ ] **Step 3: Review the resulting diff**

Run: `git diff --check -- .claude/commands/write-post.md .claude/commands/refine-post.md CLAUDE.md`

Run: `git diff -- .claude/commands/write-post.md .claude/commands/refine-post.md CLAUDE.md`

Expected: no whitespace errors; every added line maps to approved guidance; previous user edits remain.

- [ ] **Step 4: Preserve the shared dirty documentation files**

Do not stage or commit these three paths: they already contain user changes that cannot be attributed to this task. Leave the narrow additions in the working tree, report them explicitly, and let the user decide how to combine and commit the full files.

### Task 4: Final system verification

**Files:**
- Verify all files changed by the three implementation plans.

**Interfaces:**
- Consumes all prior tasks; produces no runtime API.

- [ ] **Step 1: Run complete automated checks**

Run: `npm test`

Run: `npm run content:dates`

Run: `npm run content:terms`

Run `npm run content:translations` only if current user translation work is complete. If it reports pre-existing draft drift, record exact affected posts without modifying them.

- [ ] **Step 2: Run changed-file lint**

Invoke ESLint with the explicit union of changed `.ts`, `.tsx`, and `.mjs` files. Expected: exit 0. Run full `npm run lint` separately and report existing unrelated failures without expanding scope.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: Next compilation, type checking, page generation, and route generation complete. Record pre-existing Contentlayer warnings separately.

- [ ] **Step 4: Run HTTP smoke checks**

Start the built app and verify:

- `/rss.xml`: 200 and `application/xml`;
- `/llms.txt`: 200, Korean plain text, and a root `/rss.xml` link;
- `/en/llms.txt`: 200, English plain text, and an `/en/rss.xml` link;
- one Korean and one English article: 200 and the shared `https://hooninedev.com/about#person` JSON-LD ID.

Stop the local server after checks.

- [ ] **Step 5: Review final diff and status**

Run: `git diff --check`

Run: `git status --short`

Confirm unrelated user files remain untouched and list intentional commits and pre-existing verification failures.
