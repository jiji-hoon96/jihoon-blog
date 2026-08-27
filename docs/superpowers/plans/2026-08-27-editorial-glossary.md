# Editorial Glossary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add repeatable heading and multi-reader review rules, plus an explicitly-authored multilingual glossary that opens as a desktop tooltip or touch bottom sheet and is first applied to the three Korean observability drafts.

**Architecture:** A `textDirective` remark plugin turns `:term[label]{key="stable-key"}` into progressively enhanced inline markup. A validated central JSON glossary is narrowed to the current locale on the server, while one client controller upgrades known terms and owns a single tooltip or bottom sheet. Editorial guidance and translation structure checks keep headings readable and glossary keys stable across languages.

**Tech Stack:** Node.js 24, TypeScript, React 19, Next.js 16 App Router, Contentlayer, remark-directive, unist-util-visit, Node test runner, CSS/Tailwind theme tokens

**Spec:** `docs/superpowers/specs/2026-08-26-editorial-glossary-design.md`

## Global Constraints

- Keep Node.js at `>=24.0.0 <25.0.0`; add no runtime or test dependency.
- Use explicit `:term[label]{key="stable-key"}` authoring; never auto-detect prose terms.
- Glossary keys are lowercase kebab-case and stay identical in every translation.
- Glossary names and definitions are plain text only; never render them with `dangerouslySetInnerHTML`.
- Fine-pointer hover and keyboard focus open a tooltip; touch opens a bottom sheet.
- Support click pinning, outside click, `Escape`, modal focus management, focus return, and reduced motion.
- Unknown keys or missing locale definitions remain ordinary text at runtime and fail content validation.
- Do not replace `content/260703/index.md` or change translation manifests during this plan.
- Do not modify the existing user changes in `.codegraph/.gitignore` or `content/260723/index.md`.
- Preserve the existing semicolon-free style in TypeScript library files and the existing component formatting in touched TSX files; let the repository linter decide final formatting.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `content/glossary.json` | Stable multilingual glossary data, with plain-text `name` and `definition` fields |
| `src/lib/glossary.ts` | Glossary types, schema validation, assertion, and locale narrowing |
| `scripts/validate-glossary.mjs` | Markdown term extraction and repository validation for production or draft scope |
| `src/lib/remark-term.ts` | `textDirective` to progressive inline markup conversion |
| `src/lib/glossary-ui.ts` | Pure presentation choice, open-state reducer, and collision-aware tooltip positioning |
| `src/components/GlossaryTerms.tsx` | DOM enhancement, input events, shared tooltip, bottom sheet, focus and scroll lifecycle |
| `scripts/lib/translation-structure.mjs` | Protected glossary-key extraction for translation parity |
| `src/i18n/dictionaries.ts` | Localized close labels for the bottom sheet |
| `src/styles/prose.css` | Inline term, tooltip, backdrop, and bottom-sheet presentation |
| `contentlayer.config.ts` | Remark plugin registration |
| `src/app/[lang]/[slug]/page.tsx` | Locale glossary selection, content root, and controller mounting |
| Authoring and review guides | Heading rules, reader perspectives, directive usage, and translation checks |
| Three observability drafts | Shorter headings, orientation sentences, and selected glossary references |

---

### Task 1: Lock the editorial and translation contract

**Files:**
- Modify: `CLAUDE.md`
- Modify: `.claude/commands/write-post.md`
- Modify: `.claude/commands/refine-post.md`
- Modify: `docs/translation-review.md`
- Modify: `scripts/lib/translation-structure.mjs`
- Modify: `scripts/validate-translations.test.mjs`

**Interfaces:**
- Consumes: Existing `extractProtectedStructure(markdown: string)` result object.
- Produces: `extractProtectedStructure(markdown).termKeys: string[]`, ordered by source appearance; authoring and review rules used by later draft work.

- [ ] **Step 1: Write a failing translation-structure test**

Add this test to `scripts/validate-translations.test.mjs`, importing `extractProtectedStructure` from `./lib/translation-structure.mjs` if the file does not already import it:

```js
test('protects glossary keys while allowing translated labels', () => {
  const source = ':term[실제 사용자 모니터링]{key="rum"}'
  const translation = ':term[Real User Monitoring]{key="rum"}'

  assert.deepEqual(
    extractProtectedStructure(source).termKeys,
    extractProtectedStructure(translation).termKeys,
  )
  assert.deepEqual(extractProtectedStructure(source).termKeys, ['rum'])
})

test('detects reordered or changed glossary keys', () => {
  const source = [
    ':term[RUM]{key="rum"}',
    ':term[Web Vitals]{key="web-vitals"}',
  ].join('\n')
  const translation = [
    ':term[Web Vitals]{key="web-vitals"}',
    ':term[RUM]{key="real-user-monitoring"}',
  ].join('\n')

  assert.notDeepEqual(
    extractProtectedStructure(source).termKeys,
    extractProtectedStructure(translation).termKeys,
  )
})
```

- [ ] **Step 2: Run the focused test and confirm the new assertion fails**

Run:

```bash
node --test scripts/validate-translations.test.mjs
```

Expected: FAIL because `termKeys` is `undefined`.

- [ ] **Step 3: Protect term keys in the translation structure**

Add this property to the object returned by `extractProtectedStructure()` in `scripts/lib/translation-structure.mjs`. Use `prose`, not `normalized`, so examples inside fenced code do not count:

```js
termKeys: [
  ...prose.matchAll(
    /:term\[[^\]\n]+\]\{key=(['"])([a-z0-9]+(?:-[a-z0-9]+)*)\1\}/gu,
  ),
].map(match => match[2]),
```

- [ ] **Step 4: Add the approved heading rules to the project and writing guides**

Add a concise mandatory rule to `CLAUDE.md`, and replace the current broad “소제목은 독자의 궁금증을 자극” guidance in `.claude/commands/write-post.md` with this contract:

```md
### 목차와 소제목

- H2와 H3는 본문을 찾기 위한 탐색 표지다. 절의 핵심 개념, 질문 또는 주장을 짧은 명사구나 짧은 문장으로 쓴다.
- 제목만 순서대로 읽어도 문제 제기, 설명, 판단의 흐름이 드러나야 한다.
- 하나의 제목에 여러 주제를 쉼표나 접속사로 묶지 않는다.
- 추상적인 비유보다 본문에서 실제로 설명하는 단어를 우선한다.
- 길이를 기계적으로 제한하지 않되 모바일 목차에서 한눈에 읽히는 수준을 우선한다.
- 제목과 첫 문단은 같은 문장을 반복하지 않고 서로 보완한다.
- 초안이 끝나면 H2와 H3만 따로 읽어 절 구분, 논리 순서, 본문 범위와의 일치를 검토한다.
```

Before drafting, require a private editorial note containing one sentence for the article thesis and one sentence per section for the reader takeaway. State explicitly that these notes are not inserted into published Markdown automatically.

- [ ] **Step 5: Add the four-reader review pass**

Add the following section to `.claude/commands/refine-post.md`, preserving existing factual, freshness, SEO, and voice checks:

```md
### 네 가지 독자 관점

1. 입문자: 사전 지식, 첫 용어 설명, 지시어, 생략된 주어, 문장당 새 개념 수를 확인한다.
2. 실무자: 계측 지점, 선택 기준, 제약, 실패 사례와 운영 비용을 확인한다.
3. 전문가: 전제, 근거, 적용 범위, 예외, 반례와 대안을 확인한다.
4. 회의적 독자: 사실, 추론, 의견이 구분되는지와 가장 강한 반론에 답하는지 확인한다.

각 지적은 대상 문단, 예상되는 오해, 수정 방향을 함께 적는다. “어렵다”, “더 명확하게”처럼 수정 위치와 이유가 없는 평가는 사용하지 않는다.
```

Add checklist items that extract headings alone and verify the article thesis against every section takeaway.

- [ ] **Step 6: Document glossary authoring and translation rules**

Add this syntax and policy to `.claude/commands/write-post.md`:

```md
:term[RUM]{key="rum"}
```

Document these exact rules:

- Mark only a term required to understand the section.
- Prefer the first meaningful occurrence per section.
- Use a stable lowercase kebab-case key from `content/glossary.json`.
- Keep the article’s core explanation in prose; a tooltip cannot contain the only copy of an argument.
- Run `pnpm content:glossary` for production posts and `pnpm content:glossary -- --drafts` for the observability drafts.

Add to `docs/translation-review.md` that translators localize the visible label but preserve `key` exactly, add the target-locale glossary definition before publication, and run the glossary validator before `content:translations`.

- [ ] **Step 7: Run translation and terminology tests**

Run:

```bash
node --test scripts/validate-translations.test.mjs scripts/validate-terminology.test.mjs
```

Expected: all tests pass.

- [ ] **Step 8: Commit the editorial contract**

```bash
git add CLAUDE.md .claude/commands/write-post.md .claude/commands/refine-post.md docs/translation-review.md scripts/lib/translation-structure.mjs scripts/validate-translations.test.mjs
git commit -m "docs: add reader and glossary review rules"
```

---

### Task 2: Add the central glossary model and validator

**Files:**
- Create: `content/glossary.json`
- Create: `src/lib/glossary.ts`
- Create: `src/lib/glossary.test.mjs`
- Create: `scripts/validate-glossary.mjs`
- Create: `scripts/validate-glossary.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `GlossaryEntry`, `GlossarySource`, `GlossaryLocale` types.
- Produces: `validateGlossarySource(value: unknown): string[]`.
- Produces: `assertGlossarySource(value: unknown): asserts value is GlossarySource`.
- Produces: `getGlossaryForLocale(source: GlossarySource, locale: Locale): GlossaryLocale`.
- Produces: `extractTermReferences(markdown: string): Array<{ key: string; label: string; line: number }>`.
- Produces: `validateMarkdownTerms(options): string[]` and `validateRepository(options): Promise<string[]>`.

- [ ] **Step 1: Write failing glossary-model tests**

Create `src/lib/glossary.test.mjs`:

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  assertGlossarySource,
  getGlossaryForLocale,
  validateGlossarySource,
} from './glossary.ts'

const valid = {
  rum: {
    ko: { name: 'RUM', definition: '실제 사용자 환경에서 경험 데이터를 수집하는 방식' },
    en: { name: 'RUM', definition: 'Collection of experience data from real user environments' },
  },
}

test('validates and narrows a glossary by locale', () => {
  assert.deepEqual(validateGlossarySource(valid), [])
  assertGlossarySource(valid)
  assert.deepEqual(getGlossaryForLocale(valid, 'ko'), { rum: valid.rum.ko })
})

test('rejects invalid keys, empty text, and unknown locales', () => {
  const errors = validateGlossarySource({
    'RUM Value': { ko: { name: 'RUM', definition: '' } },
    trace: { fr: { name: 'Trace', definition: 'Chemin' } },
  })

  assert.ok(errors.some(error => error.includes('RUM Value')))
  assert.ok(errors.some(error => error.includes('definition')))
  assert.ok(errors.some(error => error.includes('fr')))
})
```

- [ ] **Step 2: Run the glossary-model test and confirm it fails**

Run:

```bash
node --test src/lib/glossary.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/lib/glossary.ts`.

- [ ] **Step 3: Implement the glossary types and validation**

Create `src/lib/glossary.ts` with these public types and functions:

```ts
import { isLocale, type Locale } from '../i18n/locales.ts'

export type GlossaryEntry = {
  name: string
  definition: string
}

export type GlossarySource = Record<
  string,
  Partial<Record<Locale, GlossaryEntry>>
>

export type GlossaryLocale = Record<string, GlossaryEntry>

const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function validateGlossarySource(value: unknown): string[] {
  if (!isRecord(value)) return ['glossary: expected an object']

  const errors: string[] = []
  for (const [key, locales] of Object.entries(value)) {
    if (!KEY_PATTERN.test(key)) errors.push(`${key}: invalid glossary key`)
    if (!isRecord(locales)) {
      errors.push(`${key}: expected a locale object`)
      continue
    }
    if (Object.keys(locales).length === 0) {
      errors.push(`${key}: expected at least one locale`)
    }

    for (const [locale, entry] of Object.entries(locales)) {
      if (!isLocale(locale)) {
        errors.push(`${key}.${locale}: unsupported locale`)
        continue
      }
      if (!isRecord(entry)) {
        errors.push(`${key}.${locale}: expected an entry object`)
        continue
      }

      for (const field of Object.keys(entry)) {
        if (field !== 'name' && field !== 'definition') {
          errors.push(`${key}.${locale}.${field}: unsupported field`)
        }
      }
      for (const field of ['name', 'definition'] as const) {
        if (typeof entry[field] !== 'string' || !entry[field].trim()) {
          errors.push(`${key}.${locale}.${field}: expected a non-empty string`)
        }
      }
    }
  }
  return errors
}

export function assertGlossarySource(
  value: unknown,
): asserts value is GlossarySource {
  const errors = validateGlossarySource(value)
  if (errors.length > 0) throw new Error(`Invalid glossary:\n${errors.join('\n')}`)
}

export function getGlossaryForLocale(
  source: GlossarySource,
  locale: Locale,
): GlossaryLocale {
  return Object.fromEntries(
    Object.entries(source).flatMap(([key, entries]) => {
      const entry = entries[locale]
      return entry ? [[key, entry]] : []
    }),
  )
}
```

Implement `validateGlossarySource()` without coercion. Require an object at the root, a valid key, a supported locale from `LOCALES`, and non-empty trimmed `name` and `definition` strings. Reject arrays and extra fields inside an entry.

- [ ] **Step 4: Add the first Korean glossary entries**

Create `content/glossary.json` with these 18 keys and definitions. Keep the ordering below so browser, system, and product terms stay grouped:

```json
{
  "performance-entry": { "ko": { "name": "PerformanceEntry", "definition": "브라우저가 탐색, 리소스, 렌더링, 사용자 입력 같은 성능 사건을 공통 시간축에 기록한 항목" } },
  "performance-observer": { "ko": { "name": "PerformanceObserver", "definition": "브라우저가 생성하는 성능 항목을 실행 중에 구독해 전달받는 표준 인터페이스" } },
  "web-vitals": { "ko": { "name": "Web Vitals", "definition": "로딩, 상호작용, 시각적 안정성을 사용자 경험 관점에서 요약한 웹 성능 지표" } },
  "rum": { "ko": { "name": "RUM", "definition": "실제 사용자의 브라우저 환경에서 성능과 경험 데이터를 지속적으로 수집하는 방식" } },
  "bfcache": { "ko": { "name": "bfcache", "definition": "뒤로 가기와 앞으로 가기 때 페이지 상태를 메모리에 보존해 빠르게 복원하는 브라우저 캐시" } },
  "cardinality": { "ko": { "name": "Cardinality", "definition": "한 필드에 존재하는 서로 다른 값의 개수로, 값이 지나치게 다양하면 저장과 조회 비용이 커진다" } },
  "issue-grouping": { "ko": { "name": "Issue grouping", "definition": "유사한 오류 이벤트를 스택과 예외 정보 같은 기준으로 하나의 문제 묶음으로 합치는 과정" } },
  "breadcrumb": { "ko": { "name": "Breadcrumb", "definition": "오류가 발생하기 전의 사용자 행동, 요청, 로그와 상태 변화를 시간 순서로 남긴 짧은 기록" } },
  "distributed-trace": { "ko": { "name": "Distributed trace", "definition": "하나의 요청이 브라우저와 여러 서비스를 지나는 경로와 소요 시간을 연결한 기록" } },
  "span": { "ko": { "name": "Span", "definition": "트레이스 안에서 하나의 작업 구간과 시작 시각, 소요 시간, 속성, 상태를 표현하는 단위" } },
  "session-replay": { "ko": { "name": "Session Replay", "definition": "DOM 변화와 입력, 탐색, 네트워크 기록을 모아 사용자가 겪은 화면 상태를 재구성하는 기능" } },
  "sampling": { "ko": { "name": "Sampling", "definition": "전체 관측 데이터 중 저장하거나 분석할 일부를 규칙에 따라 선택하는 과정" } },
  "ga4-event": { "ko": { "name": "GA4 event", "definition": "GA4에서 조회, 클릭, 구매 같은 사용자 상호작용을 이름과 매개변수로 표현하는 기본 단위" } },
  "raw-event": { "ko": { "name": "Raw event", "definition": "보고서 집계나 요약이 적용되기 전의 개별 이벤트와 매개변수 기록" } },
  "search-console": { "ko": { "name": "Search Console", "definition": "Google 검색 결과에서 사이트가 노출되고 클릭된 검색어와 페이지 성과를 집계해 보여주는 도구" } },
  "consent-mode": { "ko": { "name": "Consent Mode", "definition": "사용자의 동의 상태에 따라 Google 태그의 저장과 전송 동작을 조정하는 방식" } },
  "modeled-data": { "ko": { "name": "Modeled data", "definition": "직접 관측되지 않은 구간을 동의된 신호와 통계 모델을 이용해 추정한 데이터" } },
  "feedback-loop": { "ko": { "name": "Feedback loop", "definition": "변경, 관측, 해석, 다음 판단을 반복하며 제품을 개선하는 순환 과정" } }
}
```

- [ ] **Step 5: Write failing Markdown-validator tests**

Create `scripts/validate-glossary.test.mjs`:

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  extractTermReferences,
  validateMarkdownTerms,
} from './validate-glossary.mjs'

const glossary = {
  rum: { ko: { name: 'RUM', definition: '실제 사용자 관측' } },
}

test('extracts valid terms with one-based line numbers and ignores code fences', () => {
  const markdown = [
    ':term[RUM]{key="rum"}',
    '```md',
    ':term[예시]{key="missing"}',
    '```',
  ].join('\n')

  assert.deepEqual(extractTermReferences(markdown), [
    { key: 'rum', label: 'RUM', line: 1 },
  ])
})

test('reports malformed directives, unknown keys, and missing locale entries', () => {
  assert.deepEqual(
    validateMarkdownTerms({
      markdown: [
        ':term[]{key="rum"}',
        ':term[Trace]{key="trace"}',
        ':term[RUM]{key="rum"}',
      ].join('\n'),
      locale: 'en',
      glossary,
      file: 'content/260703/index.en.md',
    }),
    [
      'content/260703/index.en.md:1: term label must not be empty',
      'content/260703/index.en.md:2: unknown glossary key "trace"',
      'content/260703/index.en.md:3: glossary key "rum" has no "en" entry',
    ],
  )
})
```

- [ ] **Step 6: Run the validator test and confirm it fails**

Run:

```bash
node --test scripts/validate-glossary.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/validate-glossary.mjs`.

- [ ] **Step 7: Implement repository validation**

Create `scripts/validate-glossary.mjs` with these exports:

```js
export function extractTermReferences(markdown) {
  return scanTermCandidates(markdown).references
}

export function validateMarkdownTerms({ markdown, locale, glossary, file }) {
  const { references, errors } = scanTermCandidates(markdown)
  const messages = errors.map(({ line, message }) => `${file}:${line}: ${message}`)
  for (const { key, line } of references) {
    if (!glossary[key]) {
      messages.push(`${file}:${line}: unknown glossary key "${key}"`)
    } else if (!glossary[key][locale]) {
      messages.push(`${file}:${line}: glossary key "${key}" has no "${locale}" entry`)
    }
  }
  return messages
}

export async function validateRepository({
  rootDirectory = process.cwd(),
  includeDrafts = false,
} = {}) {
  const glossary = JSON.parse(
    await readFile(path.join(rootDirectory, 'content/glossary.json'), 'utf8'),
  )
  const files = await productionMarkdownPaths(rootDirectory)
  if (includeDrafts) files.push(...OBSERVABILITY_DRAFTS.map(file => path.join(rootDirectory, file)))

  const errors = []
  for (const absolutePath of files) {
    const markdown = await readFile(absolutePath, 'utf8')
    const file = path.relative(rootDirectory, absolutePath)
    errors.push(...validateMarkdownTerms({
      markdown,
      locale: localeFromPath(file),
      glossary,
      file,
    }))
  }
  return errors
}
```

Define `scanTermCandidates(markdown)` as a private line scanner that toggles an `inFence` flag on matching backtick or tilde fence lines. On non-fenced lines, match every `:term[...]` candidate, require exactly one `key="..."` or `key='...'` attribute, and return valid references plus `{ line, message }` parse errors. Define `OBSERVABILITY_DRAFTS` as the three exact paths under `docs/research/observability-series`. Use `readFile`, `readdir`, `path`, and `pathToFileURL` from Node. Determine locale as follows:

- `index.md` and `docs/research/observability-series/*.md` are `ko`.
- `index.<locale>.md` uses the suffix and must match a supported locale.

Candidate parsing must reject an empty label, a missing `key`, extra attributes, and a key outside `/^[a-z0-9]+(?:-[a-z0-9]+)*$/u`. The CLI reads `--drafts`, prints `Glossary validation passed.` on success, prints each error on its own line on failure, and sets `process.exitCode = 1`.

- [ ] **Step 8: Add package scripts and the production build gate**

Modify `package.json`:

```json
"content:glossary": "node scripts/validate-glossary.mjs",
"build": "node scripts/validate-content-dates.mjs && node scripts/validate-translations.mjs && node scripts/validate-glossary.mjs && node scripts/copy-content-images.js && (npx contentlayer build || true) && next build"
```

Keep the existing scripts unchanged apart from inserting `content:glossary` and the glossary validation command.

- [ ] **Step 9: Run model, validator, and repository checks**

Run:

```bash
node --test src/lib/glossary.test.mjs scripts/validate-glossary.test.mjs
pnpm content:glossary
```

Expected: all tests pass and the current production content reports `Glossary validation passed.` because it has no term references yet.

- [ ] **Step 10: Commit glossary data and validation**

```bash
git add content/glossary.json src/lib/glossary.ts src/lib/glossary.test.mjs scripts/validate-glossary.mjs scripts/validate-glossary.test.mjs package.json
git commit -m "feat: validate multilingual glossary terms"
```

---

### Task 3: Transform term directives into progressive markup

**Files:**
- Create: `src/lib/remark-term.ts`
- Create: `src/lib/remark-term.test.mjs`
- Modify: `contentlayer.config.ts`

**Interfaces:**
- Consumes: `textDirective` nodes produced by `remark-directive`.
- Produces: `<span class="glossary-term-source" data-glossary-key="rum">RUM</span>` in Contentlayer HTML.
- Produces: `remarkTerm(): (tree, file?) => void`.

- [ ] **Step 1: Write failing remark-plugin tests**

Create `src/lib/remark-term.test.mjs`:

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import { remarkTerm } from './remark-term.ts'

function term({ label = 'RUM', key = 'rum', attributes = {} } = {}) {
  return {
    type: 'textDirective',
    name: 'term',
    attributes: { key, ...attributes },
    children: label ? [{ type: 'text', value: label }] : [],
  }
}

test('turns a term directive into progressive inline markup', () => {
  const tree = { type: 'root', children: [{ type: 'paragraph', children: [term()] }] }
  remarkTerm()(tree, { path: '/content/260703/index.md' })

  const node = tree.children[0].children[0]
  assert.deepEqual(node.data, {
    hName: 'span',
    hProperties: {
      className: ['glossary-term-source'],
      'data-glossary-key': 'rum',
    },
  })
  assert.deepEqual(node.children, [{ type: 'text', value: 'RUM' }])
})

test('rejects missing labels, invalid keys, and extra attributes', () => {
  for (const node of [
    term({ label: '' }),
    term({ key: 'RUM Value' }),
    term({ attributes: { title: 'not allowed' } }),
  ]) {
    const tree = { type: 'root', children: [{ type: 'paragraph', children: [node] }] }
    assert.throws(() => remarkTerm()(tree, { path: '/content/test/index.md' }), /Invalid term directive/u)
  }
})
```

- [ ] **Step 2: Run the plugin test and confirm it fails**

Run:

```bash
node --test src/lib/remark-term.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/lib/remark-term.ts`.

- [ ] **Step 3: Implement `remarkTerm`**

Create `src/lib/remark-term.ts` using `visit` and `toString`:

```ts
import { toString } from 'mdast-util-to-string'
import { visit } from 'unist-util-visit'

const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

export function remarkTerm() {
  return (tree: any, file?: { path?: string }) => {
    visit(tree, 'textDirective', (node: any) => {
      if (node.name !== 'term') return

      const label = toString(node).trim()
      const attributes = node.attributes ?? {}
      const key = attributes.key
      const validAttributes = Object.keys(attributes).length === 1

      if (!label || !validAttributes || typeof key !== 'string' || !KEY_PATTERN.test(key)) {
        throw new Error(`${file?.path ?? 'unknown file'}: Invalid term directive`)
      }

      node.children = [{ type: 'text', value: label }]
      node.data = {
        hName: 'span',
        hProperties: {
          className: ['glossary-term-source'],
          'data-glossary-key': key,
        },
      }
    })
  }
}
```

- [ ] **Step 4: Register the plugin after `remarkDirective`**

In `contentlayer.config.ts`, import `remarkTerm` and place it immediately after `remarkDirective` in `remarkPlugins`. Keep the remaining plugin order unchanged:

```ts
import { remarkTerm } from './src/lib/remark-term'

remarkPlugins: [
  [remarkGfm, { singleTilde: false }],
  remarkDirective,
  remarkTerm,
  remarkDetails,
  remarkRef,
  remarkWidget,
  remarkBilingualQuote,
],
```

- [ ] **Step 5: Run the focused test and TypeScript check**

Run:

```bash
node --test src/lib/remark-term.test.mjs
pnpm exec tsc --noEmit
```

Expected: both commands pass.

- [ ] **Step 6: Commit the Markdown transformation**

```bash
git add src/lib/remark-term.ts src/lib/remark-term.test.mjs contentlayer.config.ts
git commit -m "feat: transform glossary term directives"
```

---

### Task 4: Build and test the input and positioning state model

**Files:**
- Create: `src/lib/glossary-ui.ts`
- Create: `src/lib/glossary-ui.test.mjs`

**Interfaces:**
- Produces: `GlossaryPresentation = 'tooltip' | 'sheet'`.
- Produces: `chooseGlossaryPresentation(input): GlossaryPresentation`.
- Produces: `GlossaryUiState`, `GlossaryUiAction`, and `glossaryUiReducer(state, action)`.
- Produces: `placeGlossaryTooltip(anchor, tooltip, viewport, gap?): TooltipPlacement`.

- [ ] **Step 1: Write failing presentation and reducer tests**

Create `src/lib/glossary-ui.test.mjs`:

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  chooseGlossaryPresentation,
  glossaryUiReducer,
  placeGlossaryTooltip,
} from './glossary-ui.ts'

test('uses a tooltip for keyboard and fine pointers, and a sheet for touch', () => {
  assert.equal(chooseGlossaryPresentation({ input: 'keyboard', hoverCapable: false }), 'tooltip')
  assert.equal(chooseGlossaryPresentation({ input: 'mouse', hoverCapable: true }), 'tooltip')
  assert.equal(chooseGlossaryPresentation({ input: 'touch', hoverCapable: false }), 'sheet')
  assert.equal(chooseGlossaryPresentation({ input: 'pen', hoverCapable: false }), 'sheet')
})

test('opens, pins, switches targets, and closes one shared explanation', () => {
  const closed = { status: 'closed' }
  const opened = glossaryUiReducer(closed, {
    type: 'open', key: 'rum', presentation: 'tooltip', pinned: false,
  })
  const pinned = glossaryUiReducer(opened, { type: 'toggle-pin', key: 'rum' })
  const switched = glossaryUiReducer(pinned, {
    type: 'open', key: 'span', presentation: 'tooltip', pinned: false,
  })

  assert.deepEqual(pinned, {
    status: 'open', key: 'rum', presentation: 'tooltip', pinned: true,
  })
  assert.deepEqual(switched, {
    status: 'open', key: 'span', presentation: 'tooltip', pinned: false,
  })
  assert.deepEqual(glossaryUiReducer(switched, { type: 'close' }), closed)
})
```

- [ ] **Step 2: Write failing collision tests**

Append:

```js
test('places above when possible and flips below near the top edge', () => {
  assert.deepEqual(
    placeGlossaryTooltip(
      { top: 200, left: 300, width: 80, height: 24 },
      { width: 240, height: 100 },
      { width: 800, height: 600 },
      8,
    ),
    { top: 92, left: 220, side: 'top' },
  )

  assert.deepEqual(
    placeGlossaryTooltip(
      { top: 20, left: 4, width: 40, height: 24 },
      { width: 240, height: 100 },
      { width: 320, height: 600 },
      8,
    ),
    { top: 52, left: 8, side: 'bottom' },
  )
})
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run:

```bash
node --test src/lib/glossary-ui.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/lib/glossary-ui.ts`.

- [ ] **Step 4: Implement the pure UI model**

Create these exact public shapes in `src/lib/glossary-ui.ts`:

```ts
export type GlossaryPresentation = 'tooltip' | 'sheet'
export type GlossaryInput = 'keyboard' | 'mouse' | 'touch' | 'pen'

export type GlossaryUiState =
  | { status: 'closed' }
  | {
      status: 'open'
      key: string
      presentation: GlossaryPresentation
      pinned: boolean
    }

export type GlossaryUiAction =
  | { type: 'open'; key: string; presentation: GlossaryPresentation; pinned: boolean }
  | { type: 'toggle-pin'; key: string }
  | { type: 'close' }

export function chooseGlossaryPresentation({
  input,
  hoverCapable,
}: {
  input: GlossaryInput
  hoverCapable: boolean
}): GlossaryPresentation {
  if (input === 'keyboard' || input === 'mouse') return 'tooltip'
  return input === 'pen' && hoverCapable ? 'tooltip' : 'sheet'
}
```

Implement the reducer so `toggle-pin` closes a pinned matching key, pins an unpinned matching key, and ignores a nonmatching key. Define numeric `Rect`, `Size`, `Viewport`, and `TooltipPlacement` types. `placeGlossaryTooltip()` must prefer top, flip below when the top would cross an 8px viewport inset, horizontally center on the anchor, and clamp left to `[8, viewport.width - tooltip.width - 8]`.

- [ ] **Step 5: Run the UI model tests**

Run:

```bash
node --test src/lib/glossary-ui.test.mjs
```

Expected: all tests pass.

- [ ] **Step 6: Commit the pure interaction model**

```bash
git add src/lib/glossary-ui.ts src/lib/glossary-ui.test.mjs
git commit -m "feat: model glossary interactions"
```

---

### Task 5: Wire the accessible tooltip and bottom sheet into posts

**Files:**
- Create: `src/components/GlossaryTerms.tsx`
- Modify: `src/i18n/dictionaries.ts`
- Modify: `src/app/[lang]/[slug]/page.tsx:1-21,59-72,223-238`
- Modify: `src/styles/prose.css`

**Interfaces:**
- Consumes: `GlossaryLocale` from `src/lib/glossary.ts`.
- Consumes: presentation, reducer, and positioning helpers from `src/lib/glossary-ui.ts`.
- Produces: `GlossaryTerms({ rootId, entries, closeLabel })` client component.
- Produces: `dictionary.post.closeGlossary: string` for all six locales.

- [ ] **Step 1: Add page wiring first and confirm TypeScript catches the missing component**

In `src/app/[lang]/[slug]/page.tsx`, add the intended imports and usage before creating the component:

```tsx
import glossarySource from '../../../../content/glossary.json'
import GlossaryTerms from '@/components/GlossaryTerms'
import {
  assertGlossarySource,
  getGlossaryForLocale,
} from '@/lib/glossary'

assertGlossarySource(glossarySource)
```

Inside `PostPage`, after loading `dictionary`, add:

```tsx
const glossary = getGlossaryForLocale(glossarySource, lang)
```

Change the content wrapper and mount the controller immediately after it:

```tsx
<div
  id="post-content"
  className="prose dark:prose-invert max-w-none mb-16"
  dangerouslySetInnerHTML={{ __html: post.body.html }}
/>
<GlossaryTerms
  rootId="post-content"
  entries={glossary}
  closeLabel={dictionary.post.closeGlossary}
/>
```

Run:

```bash
pnpm exec tsc --noEmit
```

Expected: FAIL because `GlossaryTerms` and `closeGlossary` do not exist.

- [ ] **Step 2: Add localized close labels**

Extend the `Dictionary` type and every `post` object in `src/i18n/dictionaries.ts` with:

```ts
closeGlossary: string
```

Use these exact values:

| Locale | Value |
| --- | --- |
| `ko` | `용어 설명 닫기` |
| `en` | `Close term explanation` |
| `ja` | `用語の説明を閉じる` |
| `es` | `Cerrar explicación del término` |
| `pt-BR` | `Fechar explicação do termo` |
| `zh-CN` | `关闭术语说明` |

- [ ] **Step 3: Implement progressive DOM enhancement**

Create `src/components/GlossaryTerms.tsx` as a client component with this public prop contract and a default `GlossaryTerms` export:

```tsx
'use client'

import type { GlossaryLocale } from '@/lib/glossary'

export type GlossaryTermsProps = {
  rootId: string
  entries: GlossaryLocale
  closeLabel: string
}
```

Use `useReducer(glossaryUiReducer, { status: 'closed' })`, an active button ref, tooltip and sheet refs, a close-button ref, the last `GlossaryInput` ref, and tooltip position state. Keep all DOM lifecycle helpers private to the component file; do not export component internals.

The mount effect must perform these operations in order:

1. Find `document.getElementById(rootId)` and all `.glossary-term-source[data-glossary-key]` descendants.
2. Leave a source span unchanged and remove its glossary styling class when `entries[key]` is missing.
3. Replace known spans with native `<button type="button" class="glossary-term">` nodes while copying text and `data-glossary-key`.
4. Add event listeners to the root, not to every button.
5. Store replacement pairs and restore the original spans during cleanup so Fast Refresh does not duplicate buttons.

Track the most recent input as follows:

- Root `pointerdown` records `event.pointerType` as `mouse`, `touch`, or `pen`.
- Window `keydown` records `keyboard` when the key is `Tab`, `Enter`, `Space`, or an arrow key.
- `focusin` caused by keyboard opens a tooltip.
- `pointerover` from a mouse opens an unpinned tooltip.
- `click` after touch or non-hover pen opens the sheet; mouse click toggles tooltip pinning.
- `pointerout` and `focusout` close only an unpinned tooltip after confirming the related target is outside both trigger and tooltip.
- Document pointerdown outside the active trigger and overlay closes either presentation.
- Window `keydown` with `Escape` closes either presentation.

Update only the active button with `aria-expanded="true"`, `aria-controls`, `aria-describedby` for the tooltip, and `aria-haspopup="dialog"` for the sheet. Reset attributes on close and target switch.

- [ ] **Step 4: Render one tooltip and one modal sheet path**

For the tooltip path:

- Measure the active button and tooltip after render.
- Call `placeGlossaryTooltip()` and apply `position: fixed`, pixel `top` and `left`, and `data-side`.
- Render `role="tooltip"` with the glossary `name` and `definition`.

For the sheet path, render this semantic structure:

```tsx
const close = () => dispatch({ type: 'close' })
const entry = activeEntry

<>
  <button
    type="button"
    className="glossary-sheet-backdrop"
    aria-label={closeLabel}
    onClick={close}
  />
  <section
    id={overlayId}
    ref={sheetRef}
    className="glossary-sheet"
    role="dialog"
    aria-modal="true"
    aria-labelledby={`${overlayId}-title`}
  >
    <div className="glossary-sheet-handle" aria-hidden="true" />
    <button ref={closeButtonRef} type="button" onClick={close} aria-label={closeLabel}>
      <span aria-hidden="true">×</span>
    </button>
    <h2 id={`${overlayId}-title`}>{entry.name}</h2>
    <p>{entry.definition}</p>
  </section>
</>
```

On sheet open, save `document.body.style.overflow`, set it to `hidden`, focus the close button, and keep `Tab` cycling within the sheet. On close or unmount, restore the previous overflow and return focus to the trigger. Honor `prefers-reduced-motion` in CSS rather than JavaScript.

- [ ] **Step 5: Add theme-aware prose and overlay styles**

Append a dedicated glossary section to `src/styles/prose.css`. Use existing tokens rather than hardcoded light/dark colors:

```css
.prose .glossary-term-source,
.prose .glossary-term {
  color: inherit;
  font: inherit;
  text-decoration-line: underline;
  text-decoration-style: dotted;
  text-decoration-color: var(--qa-accent);
  text-underline-offset: 0.22em;
}

.prose button.glossary-term {
  appearance: none;
  display: inline;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: help;
}

.prose button.glossary-term[aria-expanded='true'] {
  border-radius: 0.2rem;
  background: color-mix(in srgb, var(--qa-accent) 14%, transparent);
}

.glossary-tooltip {
  position: fixed;
  z-index: 60;
  width: min(18rem, calc(100vw - 1rem));
  padding: 0.75rem 0.875rem;
  border: 1px solid var(--qa-mineral);
  border-radius: 0.625rem;
  background: var(--qa-surface);
  color: var(--qa-ink);
  box-shadow: 0 0.75rem 2rem rgb(0 0 0 / 0.16);
}
```

Add `.glossary-sheet-backdrop`, `.glossary-sheet`, `.glossary-sheet-handle`, heading, paragraph, and close-button styles. The sheet is fixed at the bottom, `z-index: 70`, full width up to a centered `32rem`, respects `env(safe-area-inset-bottom)`, and never exceeds `min(70vh, 32rem)`. Add overflow-y auto for long definitions. Under `@media (prefers-reduced-motion: reduce)`, remove overlay transitions.

- [ ] **Step 6: Run type, unit, and lint checks**

Run:

```bash
pnpm exec tsc --noEmit
node --test src/lib/glossary-ui.test.mjs src/lib/glossary.test.mjs src/lib/remark-term.test.mjs
pnpm exec eslint src/components/GlossaryTerms.tsx src/lib/glossary.ts src/lib/glossary-ui.ts 'src/app/[lang]/[slug]/page.tsx' src/i18n/dictionaries.ts
```

Expected: all commands pass.

- [ ] **Step 7: Commit post integration**

```bash
git add src/components/GlossaryTerms.tsx src/i18n/dictionaries.ts 'src/app/[lang]/[slug]/page.tsx' src/styles/prose.css
git commit -m "feat: explain terms across pointer modes"
```

---

### Task 6: Apply the editorial rules and glossary to the observability drafts

**Files:**
- Modify: `docs/research/observability-series/260703.md`
- Modify: `docs/research/observability-series/260704.md`
- Modify: `docs/research/observability-series/260705.md`

**Interfaces:**
- Consumes: The 18 glossary keys from `content/glossary.json`.
- Produces: Three Korean drafts whose H2 sequence is scannable and whose selected first-use terms pass `content:glossary -- --drafts`.

- [ ] **Step 1: Run draft glossary validation before markup and record the baseline**

Run:

```bash
pnpm content:glossary -- --drafts
```

Expected: PASS because no directives exist yet. This proves later failures come from new markup rather than pre-existing content.

- [ ] **Step 2: Add one orientation sentence to each introduction**

Insert these sentences after the opening problem statement, adapting only the surrounding transition so paragraphs remain natural:

`260703.md`:

```md
이 글은 브라우저가 남긴 사건, 사용자가 체감한 경험, 실제 사용자 집단의 분포라는 세 단계로 관측 범위를 넓혀간다.
```

`260704.md`:

```md
이 글은 한 에러 이벤트에서 시작해 breadcrumb, trace, metric, profile 순서로 범위를 넓히며 각 신호가 이전 신호로는 답하지 못한 질문을 어떻게 보완하는지 살펴본다.
```

`260705.md`:

```md
이 글의 핵심은 데이터를 사용자 단위로 억지로 합치는 것이 아니라, 같은 제품 가설을 서로 다른 관측 단위로 확인하는 데 있다.
```

- [ ] **Step 3: Replace the 260703 H2 sequence**

Use these exact headings, keeping all body paragraphs under their corresponding section:

```md
## 브라우저가 남기는 신호
## 성능 entry 수집
## 네트워크 시간의 구성
## Web Vitals의 해석
## 실험실과 실제 사용자
## RUM 데이터 모델
## 흐려진 페이지 경계
## 수집과 저장의 선택지
## 질문의 진입 장벽
## 관측은 질문에서 시작된다
```

- [ ] **Step 4: Replace the 260704 H2 sequence**

```md
## 에러 한 건의 맥락
## 그룹과 원인의 차이
## 실패의 시간축
## 지연이 생긴 경로
## span에 담을 경계
## 분포와 사례
## 실행 비용의 위치
## 세션의 재구성
## 부재로 드러나는 실패
## 성공 응답 속 실패
## 샘플링의 지식 한계
## AI 이후의 계측 설계
## 신호를 하나의 사건으로
```

- [ ] **Step 5: Replace the 260705 H2 sequence**

```md
## 세 데이터 층
## GA4 이벤트 모델
## 수집과 반영의 차이
## 원시 이벤트가 여는 질문
## 검색이 보여주는 의도
## 가설로 시작하는 연결
## 상관관계의 한계
## 분포와 비율
## 동의와 데이터 품질
## 데이터 사이의 번역
## 제품 역량으로서의 피드백 루프
## 실패와 성공의 정의
## 관측을 판단으로 바꾸기
```

- [ ] **Step 6: Mark the first essential terms in 260703**

Use each key once, outside headings and fenced code:

```md
:term[PerformanceEntry]{key="performance-entry"}
:term[PerformanceObserver]{key="performance-observer"}
:term[Web Vitals]{key="web-vitals"}
:term[RUM]{key="rum"}
:term[bfcache]{key="bfcache"}
:term[cardinality]{key="cardinality"}
```

Replace the corresponding first meaningful plain-text occurrence. Preserve surrounding backticks only for other code identifiers; the term directive itself owns the visible label.

- [ ] **Step 7: Mark the first essential terms in 260704**

```md
:term[issue]{key="issue-grouping"}
:term[breadcrumb]{key="breadcrumb"}
:term[trace]{key="distributed-trace"}
:term[span]{key="span"}
:term[Session Replay]{key="session-replay"}
:term[sampling]{key="sampling"}
```

Place `issue` in the first paragraph that explains Sentry grouping, not in its H2. Place the remaining directives at the first prose occurrence that introduces the concept.

- [ ] **Step 8: Mark the first essential terms in 260705**

```md
:term[GA4 event]{key="ga4-event"}
:term[raw event]{key="raw-event"}
:term[Search Console]{key="search-console"}
:term[Consent Mode]{key="consent-mode"}
:term[modeled data]{key="modeled-data"}
:term[feedback loop]{key="feedback-loop"}
```

Place each at the first explanatory prose occurrence and never inside headings, tables, frontmatter, or reference blocks.

- [ ] **Step 9: Perform the four-reader audit with concrete acceptance checks**

For each draft, inspect every section and make only revisions needed to satisfy these checks:

- Beginner: the new orientation sentence predicts the section order; every marked term still has enough surrounding prose to be understood with the explanation closed.
- Practitioner: each tool section answers what the signal supports, what it cannot show, and one operational cost or failure mode.
- Expert: time-sensitive product support claims retain their date and primary source; product-specific behavior is not presented as an OpenTelemetry or browser-wide guarantee.
- Skeptical reader: facts, inferences, and author conclusions remain distinguishable; correlation is not described as causation; unobserved users remain an explicit limitation.

When a paragraph fails, rewrite that paragraph in place. Do not add public “입문자”, “전문가”, or review-note headings.

- [ ] **Step 10: Verify headings, directives, terminology, and unchanged production translations**

Run:

```bash
pnpm content:glossary -- --drafts
pnpm content:terms
pnpm content:translations -- --post 260703
```

Expected: all commands pass. The translation check proves production `content/260703/index.md` and its source hash were not changed.

Print the heading-only outline for manual review:

```bash
rg -n '^#{2,3} ' docs/research/observability-series/260703.md docs/research/observability-series/260704.md docs/research/observability-series/260705.md
```

Expected: the three sequences exactly match Steps 3 through 5.

- [ ] **Step 11: Commit the reviewed Korean drafts**

```bash
git add docs/research/observability-series/260703.md docs/research/observability-series/260704.md docs/research/observability-series/260705.md
git commit -m "docs: refine observability series for mixed readers"
```

---

### Task 7: Run full verification and preview the adaptive interaction

**Files:**
- Verify only; do not modify production Markdown or translation manifests.

**Interfaces:**
- Consumes: All deliverables from Tasks 1 through 6.
- Produces: Fresh automated evidence and a local preview of all three Korean drafts.

- [ ] **Step 1: Run the complete automated test suite**

Run:

```bash
pnpm test
```

Expected: every Node test passes with zero failures.

- [ ] **Step 2: Run all content validators**

Run:

```bash
pnpm content:dates
pnpm content:terms
pnpm content:glossary
pnpm content:glossary -- --drafts
pnpm content:translations
```

Expected: all validators exit zero.

- [ ] **Step 3: Run type, lint, and production build checks**

Run:

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

Expected: all commands exit zero. If full lint reports a pre-existing error outside the touched files, record the exact file and also run the targeted lint command from Task 5 to prove the changed code is clean; do not edit unrelated files.

- [ ] **Step 4: Create an isolated preview without overwriting production content**

Run these commands one at a time:

```bash
GLOSSARY_PREVIEW_DIR="$(mktemp -d /tmp/jihoon-blog-glossary.XXXXXX)"
rsync -a --exclude .git --exclude node_modules --exclude .next --exclude .contentlayer --exclude .superpowers ./ "$GLOSSARY_PREVIEW_DIR/"
ln -s "$PWD/node_modules" "$GLOSSARY_PREVIEW_DIR/node_modules"
mkdir -p "$GLOSSARY_PREVIEW_DIR/content/260704" "$GLOSSARY_PREVIEW_DIR/content/260705"
cp docs/research/observability-series/260703.md "$GLOSSARY_PREVIEW_DIR/content/260703/index.md"
cp docs/research/observability-series/260704.md "$GLOSSARY_PREVIEW_DIR/content/260704/index.md"
cp docs/research/observability-series/260705.md "$GLOSSARY_PREVIEW_DIR/content/260705/index.md"
pnpm exec next dev --webpack -p 3101
```

Run the final command with `workdir` set to `$GLOSSARY_PREVIEW_DIR`. Keep the preview directory path in the execution notes so the server can be stopped without a broad process kill.

- [ ] **Step 5: Verify desktop, keyboard, touch, and fallback behavior**

Check `/260703`, `/260704`, and `/260705` in the local preview:

- Desktop hover opens one anchored tooltip and moving between terms switches the content.
- Keyboard `Tab` reaches each term; focus opens the tooltip; `Enter` pins it; `Escape` closes it.
- Mouse click pins and unpins; outside click closes.
- Touch emulation opens the bottom sheet; focus moves to close; `Tab` stays inside; backdrop and close button work; focus returns to the term.
- Body scrolling is locked only while the sheet is open.
- Tooltip stays within the viewport near left, right, and top edges.
- Light and dark themes retain readable contrast and visible focus.
- With JavaScript disabled, every term remains readable inline as ordinary text.
- The table of contents shows the short headings unchanged by term markup.

- [ ] **Step 6: Confirm the final diff respects scope**

Run:

```bash
git status --short
git diff --stat 853f0ed..HEAD
git diff --name-only 853f0ed..HEAD
```

Expected: no change to `content/260703/index.md`, `content/translations.json`, `.codegraph/.gitignore`, or `content/260723/index.md`. `.superpowers/` may remain untracked from the approved design mockup and must not be committed.

- [ ] **Step 7: Commit only if verification required an in-scope correction**

If Steps 1 through 6 required a correction to files already listed in this plan, rerun the failing command and commit only those correction files:

```bash
git add CLAUDE.md .claude/commands/write-post.md .claude/commands/refine-post.md docs/translation-review.md scripts/lib/translation-structure.mjs scripts/validate-translations.test.mjs
git add content/glossary.json src/lib/glossary.ts src/lib/glossary.test.mjs scripts/validate-glossary.mjs scripts/validate-glossary.test.mjs package.json
git add src/lib/remark-term.ts src/lib/remark-term.test.mjs contentlayer.config.ts src/lib/glossary-ui.ts src/lib/glossary-ui.test.mjs
git add src/components/GlossaryTerms.tsx src/i18n/dictionaries.ts 'src/app/[lang]/[slug]/page.tsx' src/styles/prose.css
git add docs/research/observability-series/260703.md docs/research/observability-series/260704.md docs/research/observability-series/260705.md
git diff --cached --check
git commit -m "fix: complete glossary verification"
```

If no correction was needed, do not create an empty verification commit.
